# Android Emulator on GCE

Runs an Android emulator in Google Cloud with a live WebRTC web UI — no local Android SDK required.

Open a browser, see a fully interactive Android device.

![Android API 30 (Android 11) running in a browser via WebRTC]

---

## What's inside

| Component | Role |
|-----------|------|
| **Android Emulator** | Google's official emulator container (`30-google-x64`) with KVM acceleration |
| **Envoy** | gRPC-Web proxy — routes `/android.emulation.control` to the emulator, everything else to nginx |
| **Nginx** | Serves the React web UI |
| **coturn** | TURN relay server so WebRTC video works through GCE's NAT |

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| [gcloud CLI](https://cloud.google.com/sdk/docs/install) | Authenticated (`gcloud auth login`) |
| GCP project | Compute Engine API enabled |
| ADB key | `adb keygen ~/.android/adbkey` — one-time setup |

---

## Deploy

```bash
git clone <this-repo>
cd emu-service

# Generate an ADB key if you don't have one
adb keygen ~/.android/adbkey

# Deploy (uses your currently active gcloud project and zone us-central1-a by default)
./setup.sh

# Or specify everything explicitly
./setup.sh MY_PROJECT us-central1-a n2-standard-4 30
```

```
./setup.sh [PROJECT_ID] [ZONE] [MACHINE_TYPE] [ANDROID_API_LEVEL]
```

The script creates the firewall rules and VM, then prints the external IP.  
VM startup (package install + Docker build + emulator boot) takes **~5 minutes**.

---

## Supported Android versions

| API level | Android version |
|-----------|----------------|
| 30 | Android 11 |
| 31 | Android 12 |
| 32 | Android 12L |
| 33 | Android 13 |
| 34 | Android 14 |

---

## Access

| Interface | URL / command |
|-----------|---------------|
| **Web UI** | `http://EXTERNAL_IP` |
| **ADB** | `adb connect EXTERNAL_IP:5555` |

The web UI has two views (toggle with the toolbar icons):
- **WebRTC** — live video stream, low latency, interactive touch/keyboard input
- **PNG** — screenshot polling fallback, always works

---

## Monitor startup

```bash
gcloud compute ssh android-emu-30 --zone=ZONE --project=PROJECT \
  -- 'sudo journalctl -f -u aemu.service'
```

---

## Architecture

```
Browser
  │
  │  HTTP/gRPC-Web  (port 80 / 443 / 8080)
  ▼
Envoy proxy
  ├── /android.emulation.control/*  ──►  Emulator :8554 (gRPC)
  └── /*                            ──►  Nginx :80 (React UI)

Browser ◄──► coturn :3478 (TURN relay) ◄──► Emulator
              WebRTC video/audio via UDP
```

**Why coturn?** The emulator runs inside a Docker container on a GCE VM. GCE's NAT means the emulator has no routable public IP. coturn acts as a relay so the browser can exchange WebRTC media with it.

---

## Repository layout

```
emu-service/
├── setup.sh              # Creates GCP firewall rules + VM
├── deploy-nginx.sh       # Safe UI redeploy (see Updating the UI below)
├── cloud-init.yaml       # VM bootstrap (runs once on first boot)
├── docker-compose.yml    # All Docker services
├── envoy.yaml            # Envoy proxy routing config
└── nginx/
    ├── Dockerfile        # Builds the React UI image
    ├── patch.js          # Patches two npm packages (see Non-obvious fixes below)
    └── src/
        ├── config.js              # No-auth config (replaces generated file)
        ├── App.js                 # App root + MUI light theme
        └── components/
            ├── login_firebase.js  # Firebase bypass (no-auth auto-login)
            ├── emulator_screen.js # WebRTC + PNG view, drag-and-drop APK install
            └── logcat_view.js     # On-demand logcat (streams only when panel is open)
```

---

## Non-obvious fixes

The upstream [`android-emulator-container-scripts`](https://github.com/google/android-emulator-container-scripts) repo requires several fixes to work on a plain GCE VM. These are all applied automatically by the setup.

### 1. Envoy routes all traffic to gRPC (upstream bug)
The default `envoy.yaml` sends every request to the emulator's gRPC port, breaking the web UI. Fixed by adding a separate `nginx` cluster and routing `/` there.

### 2. WebRTC video is invisible (zero height)
`android-emulator-webrtc`'s `event_handler.js` renders a wrapper `div` with `display: inline-block` and no height. The video element's `height: 100%` resolves to zero. Fixed in `patch.js` by changing the wrapper to `display: block; height: 100%`.

### 3. No ICE servers → WebRTC stuck at "connecting"
The JSEP protocol sends `signal.start` as a GUID string. `new RTCPeerConnection(guid_string)` creates a connection with no ICE servers, so ICE negotiation fails through NAT. Fixed in `patch.js` by injecting STUN + TURN servers into the peer connection config. The TURN host uses `window.location.hostname` so no IP is hardcoded in the image.

### 4. Emulator's TURN config format
The emulator's `-turncfg` flag takes a **shell command** that outputs ICE config JSON — not a URL. We create `/etc/emulator/get-ice-config.sh` (written at boot with the VM's external IP) and pass that path as `TURN=/get-ice-config.sh`.

### 5. Firebase auth required (upstream assumption)
The upstream UI requires Firebase. Replaced `login_firebase.js` with a no-auth component and `src/config.js` with `{ auth: { type: "none" } }`. Fixed a React race condition in `App.js` by calling `auth.setToken()` synchronously before render.

---

## Cost

| Resource | Approximate cost |
|----------|-----------------|
| `n2-standard-4` (4 vCPU, 16 GB) | ~$140/month always-on |
| `n2-standard-4` (8 hrs/day weekdays) | ~$30/month |
| Boot disk (30 GB SSD) | ~$5/month |

**Delete the VM when not in use:**
```bash
gcloud compute instances delete android-emu-30 --zone=ZONE --project=PROJECT
```

Redeploy any time with `./setup.sh` — the VM rebuilds from scratch in ~5 minutes.

---

## Changing the Android version

```bash
./setup.sh MY_PROJECT us-central1-a n2-standard-4 34   # Android 14
```

Each API level creates a separate instance (`android-emu-34`), so multiple versions can run in parallel in different zones.

---

## Updating the UI

**Always use `./deploy-nginx.sh`** — do not restart the nginx container directly.

```bash
# Edit files in nginx/src/, then:
./deploy-nginx.sh
```

The script:
1. Copies changed source files to the instance
2. **Stops envoy first** — cuts off browser access before nginx goes down
3. Rebuilds the nginx Docker image (React build runs inside the container)
4. Swaps the nginx container
5. Brings envoy back up

**Why not just `docker restart emulator_nginx`?**  
When nginx is unavailable even briefly, the browser's WebRTC component retries `requestRtcStream` repeatedly. The emulator cannot handle many concurrent WebRTC sessions and segfaults (exit 139). Stopping envoy first gives browsers a clean TCP disconnect instead of a retry storm that crashes the emulator.

---

## Troubleshooting

**Web UI loads but shows a blank screen**
- Wait 5 minutes — the emulator takes time to boot after the VM starts
- Check: `sudo docker logs emulator_emulator 2>&1 | grep boot_completed`

**WebRTC stuck at "connecting"**
- Verify coturn is running: `sudo systemctl status coturn`
- Check the ICE config uses the **internal** IP (not external — GCP hairpin NAT blocks containers from reaching their own external IP):
  ```bash
  cat /tmp/get-ice-config.sh   # should show turn:10.x.x.x:3478
  ```
- Ensure firewall rule `allow-android-emulator-host` allows UDP 3478 and 49152–65535
- If the emulator crashed (exit 139 / SIGSEGV from a WebRTC retry storm), do a clean restart:
  ```bash
  docker stop emulator_envoy
  docker restart emulator_emulator
  # wait ~2 minutes for Android to boot
  docker start emulator_envoy
  ```

**ADB can't connect**
- Confirm port 5555 is open: `gcloud compute firewall-rules list --project=PROJECT`
- Try: `adb connect EXTERNAL_IP:5555 && adb devices`

**PNG view works but WebRTC doesn't**
- This is a TURN/ICE issue. SSH into the VM and check: `sudo journalctl -u coturn`
