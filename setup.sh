#!/bin/bash
# Android Emulator on GCE — Setup Script
#
# Deploys a KVM-enabled VM that runs the Android emulator with a WebRTC web UI.
# After ~5 minutes, the emulator is accessible at http://EXTERNAL_IP
#
# Prerequisites:
#   - gcloud CLI installed and authenticated (gcloud auth login)
#   - ADB key at ~/.android/adbkey (generate with: adb keygen ~/.android/adbkey)
#   - A GCP project with Compute Engine API enabled
#
# Usage:
#   ./setup.sh [PROJECT_ID] [ZONE] [MACHINE_TYPE] [ANDROID_API_LEVEL]
#
# Examples:
#   ./setup.sh my-project us-central1-a n2-standard-4 30
#   ./setup.sh my-project us-west1-b n2-standard-4 34

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
PROJECT="${1:-$(gcloud config get-value project 2>/dev/null)}"
ZONE="${2:-us-central1-a}"
MACHINE_TYPE="${3:-n2-standard-4}"
API_LEVEL="${4:-30}"

INSTANCE_NAME="android-emu-${API_LEVEL}"
NETWORK_TAG="android-emulator-host"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLOUD_INIT="${SCRIPT_DIR}/cloud-init.yaml"

# ── Validation ───────────────────────────────────────────────────────────────
if [ -z "$PROJECT" ]; then
  echo "ERROR: No GCP project set."
  echo "       Run: gcloud config set project YOUR_PROJECT_ID"
  echo "       Or:  $0 YOUR_PROJECT_ID"
  exit 1
fi

if [ ! -f "$CLOUD_INIT" ]; then
  echo "ERROR: cloud-init.yaml not found at $CLOUD_INIT"
  exit 1
fi

if [ ! -f ~/.android/adbkey ]; then
  echo "ERROR: ADB key not found. Generate with: adb keygen ~/.android/adbkey"
  exit 1
fi

command -v gcloud >/dev/null 2>&1 || {
  echo "ERROR: gcloud not found. Install from: https://cloud.google.com/sdk/docs/install"
  exit 1
}

echo "═══════════════════════════════════════════════════════════"
echo " Android Emulator on GCE"
echo "═══════════════════════════════════════════════════════════"
echo " Project      : $PROJECT"
echo " Zone         : $ZONE"
echo " Machine type : $MACHINE_TYPE"
echo " Instance     : $INSTANCE_NAME"
echo " Android API  : $API_LEVEL"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── Firewall Rules ───────────────────────────────────────────────────────────
echo "[1/3] Setting up firewall rules..."
if ! gcloud compute firewall-rules describe "allow-${NETWORK_TAG}" \
     --project="$PROJECT" &>/dev/null; then
  gcloud compute firewall-rules create "allow-${NETWORK_TAG}" \
    --project="$PROJECT" \
    --direction=INGRESS \
    --action=ALLOW \
    --rules=tcp:80,tcp:443,tcp:8080,tcp:5555,tcp:3478,udp:3478,udp:49152-65535 \
    --source-ranges=0.0.0.0/0 \
    --target-tags="$NETWORK_TAG" \
    --description="Android emulator: web UI (80/443/8080), ADB (5555), TURN (3478), WebRTC UDP"
  echo "  Firewall rule created: allow-${NETWORK_TAG}"
else
  echo "  Firewall rule already exists: allow-${NETWORK_TAG}"
fi

# ── Delete existing instance if present ──────────────────────────────────────
if gcloud compute instances describe "$INSTANCE_NAME" \
   --zone="$ZONE" --project="$PROJECT" &>/dev/null; then
  echo ""
  echo "  Instance '$INSTANCE_NAME' already exists."
  read -r -p "  Delete and recreate it? [y/N] " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    gcloud compute instances delete "$INSTANCE_NAME" \
      --zone="$ZONE" --project="$PROJECT" --quiet
  else
    echo "  Keeping existing instance."
    EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" \
      --zone="$ZONE" --project="$PROJECT" \
      --format="get(networkInterfaces[0].accessConfigs[0].natIP)")
    echo "  Open: http://${EXTERNAL_IP}"
    exit 0
  fi
fi

# ── Create VM ─────────────────────────────────────────────────────────────────
echo ""
echo "[2/3] Creating VM with nested virtualization (KVM)..."
echo "  Startup takes ~5 minutes (Docker build + emulator boot)..."

gcloud compute instances create "$INSTANCE_NAME" \
  --project="$PROJECT" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-ssd \
  --enable-nested-virtualization \
  --tags="$NETWORK_TAG" \
  --metadata-from-file=user-data="${CLOUD_INIT}" \
  --metadata="adbkey=$(cat ~/.android/adbkey)"

# ── Get IP and show connect instructions ─────────────────────────────────────
echo ""
echo "[3/3] Getting instance IP..."
EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" \
  --zone="$ZONE" --project="$PROJECT" \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

echo ""
echo "═══════════════════════════════════════════════════════════"
echo " VM created successfully!"
echo " External IP : $EXTERNAL_IP"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo " Startup takes ~5 minutes. Monitor progress:"
echo ""
echo "   gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT \\"
echo "     -- 'sudo journalctl -f -u aemu.service'"
echo ""
echo " Once ready, open the web UI:"
echo "   http://${EXTERNAL_IP}"
echo ""
echo " Or connect via ADB:"
echo "   adb connect ${EXTERNAL_IP}:5555"
echo "   adb devices"
echo ""

# Save connection info
cat > "${SCRIPT_DIR}/.last-instance" <<EOF
PROJECT=$PROJECT
ZONE=$ZONE
INSTANCE_NAME=$INSTANCE_NAME
EXTERNAL_IP=$EXTERNAL_IP
EOF
echo " Connection info saved to .last-instance"
