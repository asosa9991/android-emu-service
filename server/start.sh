#!/bin/sh
set -e

echo "[adb-server] Starting ADB server..."
adb start-server

echo "[adb-server] Waiting for emulator ADB on emulator:5555..."
MAX_RETRIES=30
i=0
while [ $i -lt $MAX_RETRIES ]; do
  if adb connect emulator:5555 2>&1 | grep -qE "connected|already connected"; then
    echo "[adb-server] Connected to emulator:5555"
    break
  fi
  echo "[adb-server] Not ready yet, retrying in 5s... ($i/$MAX_RETRIES)"
  sleep 5
  i=$((i + 1))
done

adb devices
echo "[adb-server] Starting Express server..."
exec node server.js
