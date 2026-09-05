/* hirofarm PWA 서비스 워커 — 네트워크 우선, 실패하면 캐시.
   항상 최신을 먼저 받으므로 배포 후 ?cb= 없이도 새 버전이 뜨고, 오프라인이면 마지막으로 본 화면이 열린다.
   암호문(.enc)·gate-meta 도 같은 규칙. Supabase 등 외부 API 는 건드리지 않는다. */
const CACHE = 'hy-v1'
self.addEventListener('install', (e) => { self.skipWaiting() })
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const isFont = url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.googleapis.com'
  if (url.origin !== location.origin && !isFont) return
  if (isFont) {   // 폰트는 캐시 우선 (내용이 안 바뀜)
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r })))
    return
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE)
    try {
      const r = await fetch(req)
      if (r.ok && (r.type === 'basic' || r.type === 'cors')) c.put(req, r.clone())
      return r
    } catch {
      const hit = await c.match(req)
      if (hit) return hit
      if (req.mode === 'navigate') { const idx = await c.match('/'); if (idx) return idx }
      throw new Error('offline')
    }
  })())
})
