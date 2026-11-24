/* Service worker de Bitácora: modo sin conexión y notificaciones push. */
const VERSION = "v1";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const SHELL = ["/", "/bandeja", "/tareas", "/reuniones", "/archivos", "/notas", "/proyectos", "/ajustes", "/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { cache: "reload" })))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase y demás: directo a la red
  if (url.pathname.startsWith("/api/")) return;

  // Archivos con hash de Next: caché primero (no cambian nunca).
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(STATIC).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  // Páginas y datos de navegación: red primero, caché si no hay conexión.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreVary: true });
        if (hit) return hit;
        if (req.mode === "navigate") {
          // Rutas con id (/reuniones/abc): devolvemos la sección; la app se arma igual con los datos en caché.
          const section = "/" + (url.pathname.split("/")[1] || "");
          return (await caches.match(section)) || (await caches.match("/")) || Response.error();
        }
        return Response.error();
      }),
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "Bitácora", body: "", url: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
