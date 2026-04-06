const CACHE_NAME = 'spx-scanner-v3';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Kích hoạt ngay, không chờ tab cũ đóng
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Xóa tất cả cache cũ
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Skip API calls
  if (
    event.request.url.includes('firestore') || 
    event.request.url.includes('googleapis') || 
    event.request.url.includes('google.com') ||
    event.request.url.includes('vlc://') ||
    event.request.url.includes('rtsp://')
  ) {
    return;
  }

  // Network-First: luôn thử lấy bản mới nhất từ mạng trước
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Lưu bản mới vào cache
        if (response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline → dùng cache
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/index.html');
        });
      })
  );
});
