// Service worker do ÁguaPrajá (sites das lojas instaláveis).
// Mantém o app abrindo mesmo sem internet: mostra uma página simples de "sem conexão".
const CACHE = "aguapraja-v2";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  // Só intercepta navegação de páginas; o resto vai direto para a rede.
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});

// ── Notificações (Web Push): avisos de pedido para cliente e loja, mesmo com o app fechado ──
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { texto: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(d.titulo || "ÁguaPrajá", {
      body: d.texto || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: { link: d.link || "/" },
      tag: d.link || undefined,
      renotify: true,
    }),
  );
});

// Tocar na notificação abre (ou traz para frente) o app na tela certa.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.link) || "/", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if (new URL(j.url).origin === self.location.origin && "focus" in j) {
          j.navigate(alvo);
          return j.focus();
        }
      }
      return self.clients.openWindow(alvo);
    }),
  );
});
