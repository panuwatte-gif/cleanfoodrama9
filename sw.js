// ============================================================
// sw.js — service worker เล็กๆ สำหรับ PWA
//   กลยุทธ์:
//   • ไอคอน/รูป (static immutable) → cache-first (เร็ว ไม่เปลี่ยน)
//   • html/css/js ของแอป (same-origin) → network-first + fallback cache
//       → ออนไลน์ได้โค้ดล่าสุดเสมอ (เจ้าของแก้กับ AI แล้วเห็นผลทันทีหลังรีเฟรช)
//       → ออฟไลน์ค่อยใช้สำเนาที่แคชไว้ (app shell เปิดได้)
//   • cross-origin (Supabase/esm.sh/LIFF) → ปล่อยผ่าน network ตรงๆ ไม่ยุ่ง
//   bump CACHE เมื่อเปลี่ยนกลยุทธ์/ล้างของเก่า
// ============================================================

const CACHE = "cfr9-shell-v6";
const CORE = [
  "./",
  "./index.html",
  "./_ds/colors_and_type.css",
  "./css/cookbook.css",
  "./css/proto.css",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon-180.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isStaticAsset = (url) => /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i.test(url.pathname);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ข้ามข้ามโดเมน

  // static immutable → cache-first
  if (isStaticAsset(url)) {
    e.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => cached))
    );
    return;
  }

  // app shell (html/css/js/json) → network-first + cache fallback
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => {
        if (cached) return cached;
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("", { status: 504, statusText: "offline" });
      }))
  );
});
