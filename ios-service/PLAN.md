# Plan: iOS Simulator on AWS EC2 Mac

## Context

Mirror the Android Emulator GCE setup for iOS, using AWS EC2 Mac instances.
iOS Simulator requires macOS — AWS EC2 Mac is the closest equivalent to GCE for this.
The streaming stack is simpler than Android (no gRPC, no Envoy, no patch.js).

---

## Architecture

```
Browser
  │  HTTP / WebSocket
  ▼
nginx  (serves React UI + proxies WebSocket to simmer)
  │
simmer  (Node.js — streams iOS Simulator H.264 + forwards touch input)
  │
iOS Simulator  (Xcode, macOS on EC2 mac2.metal)

coturn  (TURN relay, same config as Android)
```

---

## Infrastructure: AWS EC2 Mac

| Instance | CPU | RAM | Price |
|----------|-----|-----|-------|
| `mac2.metal` | Apple M2 | 16 GB | ~$7.20/hr |
| `mac2-m2pro.metal` | Apple M2 Pro | 32 GB | ~$10.40/hr |

**Key constraint:** EC2 Mac requires a **Dedicated Host** with a **24-hour minimum
allocation** (Apple licensing). Start/stop the instance freely, but the host is billed
for the full 24-hr window once allocated. Release the host when done to stop billing.

Monthly estimate: ~$460/mo at 8 hrs/day weekdays.

---

## How It Differs from Android

| Android (GCE) | iOS (AWS EC2 Mac) |
|---------------|-------------------|
| GCE Linux VM + Docker | EC2 Mac bare-metal, no Docker |
| `android-emulator-webrtc` (gRPC-Web) | `simmer` (WebSocket + H.264) |
| Envoy gRPC-Web proxy | **Not needed** — nginx handles WebSocket |
| `patch.js` npm fixes | **Not needed** — simmer is self-contained |
| `deploy-nginx.sh` (stop envoy first) | Direct nginx reload (no crash risk) |
| `adb install` for `.apk` | `xcrun simctl install` for `.app` bundles |
| ~$0.50/hr | ~$7.20/hr + 24hr minimum |

---

## Files to Build

```
ios-service/
├── PLAN.md           ← this file (already in repo)
├── setup.sh          # allocates EC2 Dedicated Host + launches mac2.metal instance
├── bootstrap.sh      # runs once on the Mac (installs simmer, Xcode, coturn, nginx)
├── nginx.conf        # WebSocket proxy (replaces Envoy role)
└── ui/
    └── src/
        └── components/
            └── ios_emulator_screen.js  # React component — same shell as
                                        # emulator_screen.js but <video>+WebSocket
                                        # instead of <Emulator> gRPC component
```

---

## `setup.sh` — AWS provisioning

```bash
#!/bin/bash
# 1. Allocate a Dedicated Host (one-time per AZ)
HOST_ID=$(aws ec2 allocate-hosts \
  --instance-type mac2.metal \
  --availability-zone us-east-1a \
  --quantity 1 \
  --auto-placement on \
  --region us-east-1 \
  --query 'HostIds[0]' --output text)
echo "Dedicated Host: $HOST_ID"

# 2. Get latest macOS Sequoia AMI
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=amzn-ec2-macos-15*" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text --region us-east-1)
echo "AMI: $AMI_ID"

# 3. Launch instance on the dedicated host
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type mac2.metal \
  --placement "Tenancy=host,HostId=$HOST_ID" \
  --key-name <your-key-pair> \
  --security-group-ids <sg-id> \
  --region us-east-1 \
  --query 'Instances[0].InstanceId' --output text)
echo "Instance: $INSTANCE_ID"

# 4. Print IP when ready
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region us-east-1
aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
```

---

## `bootstrap.sh` — runs once on the Mac via SSH

```bash
#!/bin/bash
set -e

# Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
eval "$(/opt/homebrew/bin/brew shellenv)"

# Node + simmer
brew install node
npm install -g simmer

# Xcode CLI tools (triggers Apple sign-in flow if full Xcode not installed)
xcode-select --install || true

# iOS runtime + create a Simulator device
xcrun simctl runtime add "iOS 17"
UDID=$(xcrun simctl create "iPhone 15" "iPhone 15" "iOS 17")
xcrun simctl boot "$UDID"

# coturn — same as Android setup
brew install coturn
INTERNAL_IP=$(curl -sf http://169.254.169.254/latest/meta-data/local-ipv4)
EXTERNAL_IP=$(curl -sf http://169.254.169.254/latest/meta-data/public-ipv4)
cat > /opt/homebrew/etc/turnserver.conf <<EOF
listening-port=3478
listening-ip=0.0.0.0
external-ip=${EXTERNAL_IP}/${INTERNAL_IP}
realm=iosservice
lt-cred-mech
user=simulator:simulator123
no-tls
no-dtls
EOF
brew services start coturn

# nginx
brew install nginx
cp nginx.conf /opt/homebrew/etc/nginx/nginx.conf
brew services start nginx

# simmer (start + keep alive via launchd in production)
simmer --port 8080 &
```

---

## `nginx.conf`

No Envoy. nginx proxies WebSocket to simmer and serves the React build.

```nginx
worker_processes 1;
events { worker_connections 1024; }
http {
  server {
    listen 80;

    location /ws {
      proxy_pass         http://localhost:8080;
      proxy_http_version 1.1;
      proxy_set_header   Upgrade $http_upgrade;
      proxy_set_header   Connection "upgrade";
      proxy_read_timeout 3600s;
    }

    location /api/ {
      proxy_pass http://localhost:3001;   # app-install Node.js shim
    }

    location / {
      root      /opt/ios-ui/build;
      try_files $uri /index.html;
    }
  }
}
```

---

## `ios_emulator_screen.js` — React component

Same topbar/status pill/drag-drop shell as `emulator_screen.js`. Key differences:
- `<Emulator>` gRPC component → `<video>` element driven by simmer's WebSocket
- Touch events (mousedown/move/up) forwarded as JSON over the same WebSocket
- Drag-drop accepts `.app` bundles → `POST /api/install` → `xcrun simctl install`

Rough structure:
```js
componentDidMount() {
  this.ws = new WebSocket(`ws://${window.location.hostname}/ws`);
  this.ws.binaryType = "arraybuffer";
  this.ws.onmessage = (e) => {
    // simmer sends H.264 NAL units; feed via MediaSource or use simmer's
    // built-in player URL if it serves an HLS/DASH manifest
  };
}

onMouseDown = (e) => {
  this.ws.send(JSON.stringify({ type: "touch", phase: "begin",
    x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }));
};
```

> Note: exact WebSocket protocol depends on simmer's version. Read simmer source to
> confirm message format before implementing.

---

## AWS Security Group Rules

```
Port 80    TCP   0.0.0.0/0   Web UI
Port 3478  UDP   0.0.0.0/0   TURN relay
Port 22    TCP   <your-ip>   SSH
```

---

## Verification

1. `xcrun simctl list` on the Mac → shows booted simulator
2. `curl http://localhost:8080` → simmer responds
3. Browser → `http://<EXTERNAL_IP>` → iOS Simulator video stream visible
4. Tap in browser → Simulator responds to touch
5. Drag `.app` bundle → app appears in Simulator
6. `ss -ulnp | grep 3478` → coturn listening
