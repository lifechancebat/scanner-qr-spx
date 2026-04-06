const http = require('http');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============ CẤU HÌNH CAMERA ============
const CAMERA = {
  ip: '192.168.1.180',
  port: '554',
  username: 'admin',
  password: 'L25637C8',
  channel: 1
};
const PORT = 3456;
const VIDEOS_DIR = path.join(__dirname, 'videos');
// ==========================================

if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });

// Lấy IP của PC trên mạng LAN
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168')) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Format time cho RTSP URL: YYYY_MM_DD_HH_MM_SS
function toRtspTime(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-');
  const [h, mi, s] = timeStr.split(':');
  return `${y}_${m}_${d}_${h}_${mi}_${s || '00'}`;
}

// Format cho tên file
function toFilename(dateStr, timeStr) {
  return `${dateStr}_${timeStr.replace(/:/g, '-')}`;
}

// Trang HTML chính
function renderHTML(message = '', videoFile = '') {
  const localIP = getLocalIP();
  const existingVideos = fs.readdirSync(VIDEOS_DIR)
    .filter(f => f.endsWith('.mp4'))
    .sort().reverse()
    .slice(0, 20);

  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const fiveMinAgo = new Date(now - 5 * 60000);
  const agoTime = `${pad(fiveMinAgo.getHours())}:${pad(fiveMinAgo.getMinutes())}`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>📹 Tải Video Camera</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #e2e8f0;
           min-height: 100vh; padding: 20px; }
    .container { max-width: 480px; margin: 0 auto; }
    h1 { font-size: 1.5rem; text-align: center; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #94a3b8; font-size: 0.8rem; margin-bottom: 24px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
    label { display: block; font-size: 0.7rem; font-weight: 700; color: #94a3b8;
            text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    input[type=date], input[type=time] {
      width: 100%; background: #0f172a; border: 1px solid #475569; border-radius: 12px;
      padding: 12px; color: #e2e8f0; font-size: 1rem; font-family: monospace;
      outline: none; }
    input:focus { border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20,184,166,0.2); }
    .row { display: flex; gap: 12px; margin-bottom: 12px; }
    .row > div { flex: 1; }
    button.primary {
      width: 100%; background: linear-gradient(135deg, #0d9488, #14b8a6); color: white;
      border: none; border-radius: 12px; padding: 14px; font-size: 1rem; font-weight: 700;
      cursor: pointer; transition: all 0.2s; margin-top: 8px; }
    button.primary:hover { transform: scale(0.98); filter: brightness(1.1); }
    button.primary:active { transform: scale(0.95); }
    button.primary:disabled { background: #475569; cursor: not-allowed; transform: none; }
    .msg { padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 0.85rem; font-weight: 600; }
    .msg.success { background: #064e3b; color: #6ee7b7; border: 1px solid #065f46; }
    .msg.error { background: #7f1d1d; color: #fca5a5; border: 1px solid #991b1b; }
    .msg.info { background: #1e3a5f; color: #93c5fd; border: 1px solid #1e40af; }
    .video-list { list-style: none; }
    .video-list li { display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; background: #0f172a; border-radius: 10px; margin-bottom: 8px;
      border: 1px solid #334155; font-size: 0.8rem; }
    .video-list a { color: #14b8a6; text-decoration: none; font-weight: 700; padding: 6px 14px;
      background: rgba(20,184,166,0.15); border-radius: 8px; white-space: nowrap; }
    .video-list a:hover { background: rgba(20,184,166,0.3); }
    .camera-info { font-size: 0.75rem; color: #64748b; text-align: center; margin-top: 16px; }
    .spinner { display: none; }
    form.loading .spinner { display: inline-block; animation: spin 1s linear infinite; }
    form.loading button.primary { pointer-events: none; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <h1>📹 Tải Video Camera</h1>
    <p class="subtitle">Camera: ${CAMERA.ip} · Server: ${localIP}:${PORT}</p>

    ${message}

    ${videoFile ? `
    <div class="msg success">
      ✅ Video đã tải xong!
      <a href="/videos/${videoFile}" download style="color:#6ee7b7;text-decoration:underline;margin-left:8px;">
        📥 Tải về
      </a>
    </div>` : ''}

    <form method="POST" action="/download" class="card" onsubmit="this.classList.add('loading');this.querySelector('button').disabled=true;this.querySelector('button').textContent='⏳ Đang tải video từ camera...';">
      <div class="row">
        <div>
          <label>📅 Ngày</label>
          <input type="date" name="date" value="${today}" required>
        </div>
      </div>
      <div class="row">
        <div>
          <label>⏰ Từ lúc</label>
          <input type="time" name="startTime" value="${agoTime}" step="1" required>
        </div>
        <div>
          <label>⏰ Đến lúc</label>
          <input type="time" name="endTime" value="${nowTime}" step="1" required>
        </div>
      </div>
      <button type="submit" class="primary">
        <span class="spinner">⏳</span> 📥 Tải Video MP4
      </button>
    </form>

    ${existingVideos.length > 0 ? `
    <div class="card">
      <label style="margin-bottom:12px">📂 Video đã tải (${existingVideos.length})</label>
      <ul class="video-list">
        ${existingVideos.map(f => {
          const size = (fs.statSync(path.join(VIDEOS_DIR, f)).size / 1024 / 1024).toFixed(1);
          const name = f.replace('.mp4','').replace(/_/g,' ');
          return `<li><span>📹 ${name} <span style="color:#64748b">(${size}MB)</span></span><a href="/videos/${f}" download>Tải</a></li>`;
        }).join('')}
      </ul>
    </div>` : ''}

    <p class="camera-info">
      💡 Mở trên iPhone: <strong>http://${localIP}:${PORT}</strong><br>
      Camera ghi theo đoạn ~10-15p, video mới cần chờ vài phút.
    </p>
  </div>
</body>
</html>`;
}

// Parse form data từ POST request
function parseFormData(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      resolve(Object.fromEntries(params));
    });
  });
}

// Download video bằng ffmpeg
function downloadVideo(date, startTime, endTime) {
  return new Promise((resolve, reject) => {
    const rtspStart = toRtspTime(date, startTime);
    const rtspEnd = toRtspTime(date, endTime);
    const filename = `${toFilename(date, startTime)}_to_${toFilename(date, endTime).split('_').pop()}.mp4`;
    const outputPath = path.join(VIDEOS_DIR, filename);

    const rtspUrl = `rtsp://${CAMERA.username}:${CAMERA.password}@${CAMERA.ip}:${CAMERA.port}/cam/playback?channel=${CAMERA.channel}&starttime=${rtspStart}&endtime=${rtspEnd}`;

    console.log(`\n📹 Đang tải video...`);
    console.log(`   RTSP: ${rtspUrl.replace(CAMERA.password, '***')}`);
    console.log(`   Output: ${filename}`);

    // Tính thời lượng tối đa (giây)
    const [sh, sm, ss] = startTime.split(':').map(Number);
    const [eh, em, es] = endTime.split(':').map(Number);
    const duration = (eh * 3600 + em * 60 + (es||0)) - (sh * 3600 + sm * 60 + (ss||0)) + 10; // +10s buffer

    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-c', 'copy',
      '-t', Math.max(duration, 30).toString(),
      '-movflags', '+faststart',
      outputPath
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', d => { stderr += d.toString(); });

    ffmpeg.on('close', (code) => {
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
        const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
        console.log(`   ✅ Hoàn tất: ${filename} (${sizeMB}MB)`);
        resolve(filename);
      } else {
        console.log(`   ❌ Lỗi: ffmpeg exit code ${code}`);
        reject(new Error('Không tải được video. Kiểm tra thời gian hoặc camera.'));
      }
    });

    ffmpeg.on('error', (err) => reject(err));
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Serve video files
  if (url.pathname.startsWith('/videos/')) {
    const filename = decodeURIComponent(url.pathname.replace('/videos/', ''));
    const filePath = path.join(VIDEOS_DIR, filename);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
    res.writeHead(404);
    res.end('File not found');
    return;
  }

  // Download request
  if (req.method === 'POST' && url.pathname === '/download') {
    const data = await parseFormData(req);
    try {
      const filename = await downloadVideo(data.date, data.startTime, data.endTime);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderHTML('', filename));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderHTML(`<div class="msg error">❌ ${err.message}</div>`));
    }
    return;
  }

  // Main page
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(renderHTML());
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║    📹 VIDEO DOWNLOADER - Camera Dahua      ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║  Camera:  ${CAMERA.ip}:${CAMERA.port}                ║`);
  console.log(`║  Server:  http://${ip}:${PORT}          ║`);
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║  📱 Mở trên iPhone:                        ║`);
  console.log(`║     http://${ip}:${PORT}                   ║`);
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log('Đang chờ yêu cầu tải video...');
});
