/*
 * Colinha · Alequizão · Desenvolvido por Alequizao <alequizao.dev@gmail.com>
 * https://github.com/alequizao · © 2026 Alequizao. Todos os direitos reservados.
 */
/* Colinha · Alequizão — service worker: app abre offline; API sempre tenta a rede primeiro. */
const V = 'colinha-1.0.6';
const BASE = '/colinha/';
const ARQS = [BASE, BASE + 'app.js?v=1.0.6', BASE + 'app.css?v=1.0.6', BASE + 'icones/icone.svg?v=1.0.6', BASE + 'manifest.webmanifest?v=1.0.6'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(ARQS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('colinha-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(BASE)) return;
  // Páginas: rede primeiro, cai no index guardado sem internet.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(BASE, cp)); return r; }).catch(() => caches.match(BASE)));
    return;
  }
  // API: rede primeiro, guarda a última resposta para usar offline (ex.: na fila da votação).
  if (u.pathname.endsWith('api.php')) {
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; }).catch(() => caches.match(e.request)));
    return;
  }
  // Estáticos, fotos e logos: cache primeiro.
  e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => {
    if (r.ok && /\.(jpg|png|svg|css|js)$/.test(u.pathname)) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); }
    return r;
  })));
});
