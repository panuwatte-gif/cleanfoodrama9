// ============================================================
// utils/theme.js — ธีมสี (พอร์ตจาก prototype2/app.jsx)
// แปลงสีหลักชุดหนึ่ง → ตัวแปร CSS (--primary, --primary-dark, ฯลฯ)
// ค่าเริ่มต้น = เขียวพาสเทลนุ่ม (#62B98C) เหมือน prototype v2
// เก็บ/อ่าน localStorage เพื่อให้รีเฟรชแล้วธีมยังอยู่
// ============================================================

import { load, save } from "./storage.js";

// ค่าเริ่มต้น = ฟ้าพาสเทล + เขียวพาสเทล (หลากสี) — เลิกใช้ชมพู
export const COLOR_DEFAULTS = {
  primary: "#62A8EC", secondary: "#6FC79A", bg: "#F5F8FD", surface: "#FFFFFF",
  text: "#3A4652", warning: "#F4A64C", pending: "#F4A64C", fab: "#62A8EC",
};

const hx = (c) => { c = c.replace("#", ""); if (c.length === 3) c = c.split("").map((x) => x + x).join(""); return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)); };
const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export const shade = (c, amt) => { const [r, g, b] = hx(c); const t = amt < 0 ? 0 : 255; const k = Math.abs(amt) / 100; return toHex(r + (t - r) * k, g + (t - g) * k, b + (t - b) * k); };
export const tint = (c, amt) => { const [r, g, b] = hx(c); return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt); };

export function themeToVars(th) {
  return {
    "--primary": th.primary, "--primary-dark": shade(th.primary, -12), "--primary-deep": shade(th.primary, -24),
    "--primary-soft": tint(th.primary, 0.78), "--primary-tint": tint(th.primary, 0.9), "--primary-ink": shade(th.primary, -42),
    "--secondary": th.secondary,
    "--bg": th.bg, "--bg-deep": shade(th.bg, -5),
    "--surface": th.surface,
    "--text": th.text,
    "--warning": th.warning, "--warning-ink": shade(th.warning, -28),
    "--pending": th.pending,
    "--fab": th.fab, "--fab-deep": shade(th.fab, -18),
  };
}

const KEY = "theme:v3";   // bumped: palette switched pink → pastel blue+green multicolor (ignore stale v1/v2)
export function loadTheme() { return { ...COLOR_DEFAULTS, ...(load(KEY, {}) || {}) }; }
export function saveTheme(theme) { save(KEY, theme); }

// applyTheme(el, theme) — เซ็ตตัวแปร CSS ลงบน element (shell wrapper)
export function applyTheme(el, theme) {
  const vars = themeToVars(theme);
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
}
