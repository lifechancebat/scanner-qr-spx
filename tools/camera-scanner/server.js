const express = require('express');
const http = require('http');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 8181;

// ── Camera config ───────────────────────────────────────────────
const CAMERA = {
  ip: '192.168.1.180',
  port: 80,
  username: 'admin',
  password: 'L25637C8',
};

// ── Digest auth helpers ─────────────────────────────────────────
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function parseDigestHeader(header) {
  const result = {};
  const re = /(\w+)=(?:"([^"]+)"|([^\s,]+))/g;
  let m;
  while ((m = re.exec(header)) !== null) {
    result[m[1]] = m[2] || m[3];
  }
  return result;
}

function buildDigestAuth(method, uri, challenge) {
  const { realm, nonce, qop, opaque } = challenge;
  const ha1 = md5(`${CAMERA.username}:${realm}:${CAMERA.password}`);
  const ha2 = md5(`${method}:${uri}`);
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');
  const response = qop
    ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`);

  let auth = `Digest username="${CAMERA.username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  if (qop) auth += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
  if (opaque) auth += `, opaque="${opaque}"`;
  return auth;
}

// ── Fetch from Dahua camera with auto Digest auth ───────────────
function cameraFetch(urlPath) {
  return new Promise((resolve, reject) => {
    const doRequest = (extraHeaders = {}) => {
      const options = {
        hostname: CAMERA.ip,
        port: CAMERA.port,
        path: urlPath,
        method: 'GET',
        headers: { ...extraHeaders },
        timeout: 5000,
      };

      const req = http.request(options, (res) => {
        if (res.statusCode === 401) {
          const wwwAuth = res.headers['www-authenticate'] || '';
          res.resume(); // drain
          const challenge = parseDigestHeader(wwwAuth);
          const authHeader = buildDigestAuth('GET', urlPath, challenge);
          doRequest({ Authorization: authHeader });
        } else {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () =>
            resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) })
          );
          res.on('error', reject);
        }
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Camera timeout')); });
      req.end();
    };

    doRequest();
  });
}

// ── Stream from Dahua camera (for large video files) ─────────────
function cameraStream(urlPath, expressRes, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CAMERA.ip,
      port: CAMERA.port,
      path: urlPath,
      method: 'GET',
      headers: { ...extraHeaders },
      timeout: 60000,
    };

    const req = http.request(options, (camRes) => {
      if (camRes.statusCode === 401) {
        camRes.resume();
        const wwwAuth = camRes.headers['www-authenticate'] || '';
        const challenge = parseDigestHeader(wwwAuth);
        const authHeader = buildDigestAuth('GET', urlPath, challenge);
        cameraStream(urlPath, expressRes, { Authorization: authHeader })
          .then(resolve).catch(reject);
      } else if (camRes.statusCode === 200 || camRes.statusCode === 206) {
        expressRes.setHeader('Content-Type', camRes.headers['content-type'] || 'video/x-dv');
        expressRes.setHeader('Access-Control-Allow-Origin', '*');
        if (camRes.headers['content-length']) {
          expressRes.setHeader('Content-Length', camRes.headers['content-length']);
        }
        camRes.pipe(expressRes);
        camRes.on('end', resolve);
        camRes.on('error', reject);
      } else {
        if (!expressRes.headersSent) {
          expressRes.status(camRes.statusCode).json({ error: `Camera returned ${camRes.statusCode}` });
        }
        camRes.resume();
        resolve();
      }
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Camera stream timeout')); });
    req.end();
  });
}

// ── Serve static files ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Proxy: /snapshot → Dahua snapshot ──────────────────────────
app.get('/snapshot', async (req, res) => {
  try {
    const result = await cameraFetch('/cgi-bin/snapshot.cgi?channel=1');
    res.set('Content-Type', result.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'no-cache, no-store');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(result.body);
  } catch (err) {
    console.error('[snapshot]', err.message);
    res.status(503).json({ error: err.message });
  }
});

// ── Download: /download?start=MS&end=MS&code=ORDER ──────────────
app.get('/download', async (req, res) => {
  const { start, end, code } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'Missing start/end' });

  const startDt = new Date(parseInt(start));
  const endDt   = new Date(parseInt(end));
  const fmt = (d) => {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  const camPath = `/cgi-bin/loadfile.cgi?action=startLoad&channel=1&startTime=${encodeURIComponent(fmt(startDt))}&endTime=${encodeURIComponent(fmt(endDt))}&type=0`;
  const safeName = (fmt(startDt)).replace(/[: ]/g, '-');
  const filename = code ? `SPX_${code}_${safeName}.dav` : `SPX_${safeName}.dav`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Access-Control-Allow-Origin', '*');

  console.log(`[download] ${fmt(startDt)} → ${fmt(endDt)} | ${code || 'no-code'}`);
  try {
    await cameraStream(camPath, res);
  } catch (err) {
    console.error('[download]', err.message);
    if (!res.headersSent) res.status(503).json({ error: err.message });
  }
});

// ── Health check ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', camera: CAMERA.ip, time: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log(`║   📦 SPX Camera Scanner Server           ║`);
  console.log(`║   http://localhost:${PORT}               ║`);
  console.log(`║   Camera: ${CAMERA.ip}                ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});
