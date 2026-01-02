const CACHE_NAME = 'gardirop-ai-v1'
const OFFLINE_URL = '/offline.html'

// Önbellekte tutulacak dosyalar
const CACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// Service Worker kurulumu
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Cache açıldı')
      return cache.addAll(CACHE_ASSETS)
    })
  )
  self.skipWaiting()
})

// Eski cache'leri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eski cache silindi:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch olayları - Offline desteği
self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini cache'le
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı yanıtı cache'e ekle
        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })
        return response
      })
      .catch(() => {
        // Offline ise cache'den sun
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          // HTML sayfası ise offline sayfasını göster
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match(OFFLINE_URL)
          }
        })
      })
  )
})

// Push bildirimleri (gelecekte kullanılabilir)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const options = {
    body: data.body || 'Yeni bildirim!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Gardirop AI', options)
  )
})

// Bildirime tıklanınca
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})