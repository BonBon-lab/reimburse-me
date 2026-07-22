#!/bin/bash
# ReimburseMe launcher (macOS/Linux) — double-click on a Mac.
# Installs/builds on first run, then starts the server.
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Get it from https://nodejs.org first."
  read -r -p "Press Enter to close."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "First run: installing dependencies (a few minutes)..."
  npm install || { read -r -p "npm install failed. Press Enter to close."; exit 1; }
fi

if [ ! -d .next ]; then
  echo "First run: building the app..."
  npm run build || { read -r -p "Build failed. Press Enter to close."; exit 1; }
fi

# LAN IP: macOS first, then Linux fallback
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')

echo
echo "============================================"
echo " ReimburseMe is starting."
echo " On this computer: http://localhost:3000"
[ -n "$IP" ] && echo " On your phone:    http://$IP:3000  (same Wi-Fi)"
echo " Keep this window open. Close it to stop."
echo "============================================"
echo
npm run start
