#!/data/data/com.termux/files/usr/bin/bash
echo "=== SPX Camera Scanner Setup ==="
mkdir -p ~/camera-scanner/public
cp /sdcard/server.js ~/camera-scanner/
cp /sdcard/package.json ~/camera-scanner/
cp /sdcard/index.html ~/camera-scanner/public/
cd ~/camera-scanner
echo "=== Cai dat thu vien (Express)... ==="
npm install
echo ""
echo "=== XONG! Dang khoi dong server... ==="
node server.js
