# 📦 SPX Camera Scanner — Hướng dẫn cài đặt Termux (Android Tablet)

## Cách hoạt động
```
Camera Dahua → [Tablet chạy Termux] → Chrome mở trang Scanner → Firebase → iPhone
```
Tablet hoạt động như một "cầu nối": lấy ảnh từ camera, phát hiện mã vạch, đẩy lên Firebase. iPhone sẽ nhận dữ liệu real-time và hiển thị lịch sử như bình thường.

---

## Bước 1: Cài Termux
1. Tải **Termux** từ **F-Droid** (KHÔNG dùng Google Play vì bản Play Store cũ):
   - Vào `https://f-droid.org` trên tablet → tìm "Termux" → cài
2. Mở Termux, gõ lần lượt:

```bash
pkg update && pkg upgrade -y
pkg install nodejs -y
```

Kiểm tra: `node --version` → phải thấy `v20.x.x` hoặc mới hơn.

---

## Bước 2: Copy code vào tablet
**Cách A — Copy từ USB/mạng LAN:**
- Copy thư mục `tools/camera-scanner/` vào tablet (qua USB hoặc Google Drive)
- Trong Termux: `cp -r /sdcard/camera-scanner ~/camera-scanner`

**Cách B — Gõ tay (nếu không có USB):**
```bash
mkdir ~/camera-scanner ~/camera-scanner/public
```
Rồi tạo các file theo README này.

---

## Bước 3: Cài dependencies
```bash
cd ~/camera-scanner
npm install
```

---

## Bước 4: Chạy server
```bash
node server.js
```

Bạn sẽ thấy:
```
╔══════════════════════════════════════════╗
║   📦 SPX Camera Scanner Server           ║
║   http://localhost:8181                  ║
║   Camera: 192.168.1.180                  ║
╚══════════════════════════════════════════╝
```

---

## Bước 5: Mở Chrome
Trên cùng tablet, mở **Chrome** và vào:
```
http://localhost:8181
```

Trang scanner sẽ hiện ra — camera feed tự động chạy và quét mã!

---

## Giữ server chạy liên tục (Tùy chọn)

### Cách đơn giản — dùng tmux:
```bash
pkg install tmux -y
tmux new -s scanner
cd ~/camera-scanner && node server.js
# Nhấn Ctrl+B rồi D để tách session, server vẫn chạy ngầm
# Để vào lại: tmux attach -t scanner
```

### Cách tự động khởi động — dùng PM2:
```bash
npm install -g pm2
cd ~/camera-scanner
pm2 start server.js --name "spx-scanner"
pm2 save
```

---

## Lưu ý quan trọng
- **Tắt tiết kiệm pin cho Termux:** Cài đặt → Ứng dụng → Termux → Pin/Battery → Không hạn chế
- **Giữ màn hình tablet sáng** hoặc cắm sạc liên tục
- Tablet và camera phải cùng mạng WiFi
- Chrome Android từ version 83+ mới có BarcodeDetector API

---

## Cấu trúc file
```
camera-scanner/
├── server.js          ← Node.js proxy (xử lý Digest auth của Dahua)
├── package.json
└── public/
    └── index.html     ← Trang scanner chạy trên Chrome
```
