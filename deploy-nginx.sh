#!/bin/bash
# Safe nginx deployment script.
#
# Problem: If nginx is restarted while browsers have active WebRTC sessions,
# the browser WebRTC component retries requestRtcStream repeatedly. The emulator
# cannot handle many concurrent WebRTC sessions and segfaults (exit 139).
#
# Fix: stop envoy first (cuts off all browser access), rebuild/restart nginx,
# then bring envoy back. Browsers get a clean disconnect rather than a retry storm.

set -e

ZONE="us-central1-a"
PROJECT="emuservice"
HOST="android-emulator-host"
REMOTE_DIR="/home/vijayakella/emu-service"

echo "=== Copying source files to instance ==="
gcloud compute scp \
  nginx/src/App.js \
  "${HOST}:${REMOTE_DIR}/nginx/src/" \
  --zone="${ZONE}" --project="${PROJECT}"

gcloud compute scp \
  nginx/src/components/emulator_screen.js \
  nginx/src/components/logcat_view.js \
  "${HOST}:${REMOTE_DIR}/nginx/src/components/" \
  --zone="${ZONE}" --project="${PROJECT}"

echo "=== Stopping envoy (prevents browser WebRTC retry storm) ==="
gcloud compute ssh "${HOST}" --zone="${ZONE}" --project="${PROJECT}" --command="
  docker stop emulator_envoy
"

echo "=== Rebuilding nginx image ==="
gcloud compute ssh "${HOST}" --zone="${ZONE}" --project="${PROJECT}" --command="
  cd ${REMOTE_DIR}
  docker build -t emulator_nginx:latest ./nginx 2>&1
"

echo "=== Swapping nginx container ==="
gcloud compute ssh "${HOST}" --zone="${ZONE}" --project="${PROJECT}" --command="
  docker stop emulator_nginx && docker rm emulator_nginx
  cd ${REMOTE_DIR} && docker compose up -d nginx
"

echo "=== Bringing envoy back up ==="
gcloud compute ssh "${HOST}" --zone="${ZONE}" --project="${PROJECT}" --command="
  cd ${REMOTE_DIR} && docker compose up -d envoy
  docker ps --format 'table {{.Names}}\t{{.Status}}'
"

echo "=== Done. Refresh the browser. ==="
