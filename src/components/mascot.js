// ============================================================
// components/mascot.js — มาสคอตต้นกล้าหน้ายิ้ม + ก้อนเมฆ (พอร์ตจาก ui.jsx)
// คืน <svg> element พร้อมใช้
// ============================================================

const NS = "http://www.w3.org/2000/svg";

function svg(viewBox, w, h, inner, style) {
  const el = document.createElementNS(NS, "svg");
  el.setAttribute("viewBox", viewBox);
  el.setAttribute("width", w);
  el.setAttribute("height", h);
  el.setAttribute("fill", "none");
  el.setAttribute("aria-hidden", "true");
  if (style) Object.assign(el.style, style);
  el.innerHTML = inner;
  return el;
}

// มาสคอตต้นกล้าในกระถาง หน้ายิ้ม
export function mascot(s = 44, { mood = "happy", spark = false } = {}) {
  const smile = mood === "happy" ? "M20.4 34.6q3.6 3 7.2 0" : "M21 35h6";
  const sparks = spark
    ? '<path d="M40 8l.8 2.2L43 11l-2.2.8L40 14l-.8-2.2L37 11l2.2-.8Z" fill="#FCD36B"/>'
      + '<path d="M7 7l.5 1.4L9 9l-1.5.5L7 11l-.5-1.5L5 9l1.5-.6Z" fill="#F7A8C4"/>'
    : "";
  const inner = `
    <defs>
      <linearGradient id="kkleaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A8E08A"/><stop offset="1" stop-color="#6BC089"/></linearGradient>
      <radialGradient id="kkpot" cx="0.36" cy="0.26" r="0.9"><stop offset="0" stop-color="#FBEAC8"/><stop offset="1" stop-color="#E7BD86"/></radialGradient>
      <radialGradient id="kkpotrim" cx="0.4" cy="0.3" r="0.9"><stop offset="0" stop-color="#F6DCAE"/><stop offset="1" stop-color="#EBC892"/></radialGradient>
    </defs>
    <path d="M24 19c-1.2-6.4-6.6-9.2-12-7.8.2 5.6 4.8 9.4 12 8.4Z" fill="url(#kkleaf)"/>
    <path d="M24 19c1.2-6.4 6.6-9.2 12-7.8-.2 5.6-4.8 9.4-12 8.4Z" fill="url(#kkleaf)"/>
    <path d="M24 11.5v8.5" stroke="#56A772" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="15.6" cy="13" r="1.5" fill="#fff" opacity=".5"/>
    <circle cx="32.4" cy="13" r="1.2" fill="#fff" opacity=".45"/>
    <path d="M11.5 23.5h25l-2 14.5a5 5 0 0 1-5 4.4H18.5a5 5 0 0 1-5-4.4l-2-14.5Z" fill="url(#kkpot)"/>
    <rect x="9.2" y="20.4" width="29.6" height="5.6" rx="2.8" fill="url(#kkpotrim)"/>
    <ellipse cx="17" cy="31" rx="3" ry="4" fill="#fff" opacity=".18"/>
    <circle cx="19.6" cy="31.4" r="2.15" fill="#5A4636"/>
    <circle cx="28.4" cy="31.4" r="2.15" fill="#5A4636"/>
    <circle cx="20.3" cy="30.6" r=".66" fill="#fff"/>
    <circle cx="29.1" cy="30.6" r=".66" fill="#fff"/>
    <circle cx="14.8" cy="33.8" r="2.3" fill="#F7A8AE" opacity=".85"/>
    <circle cx="33.2" cy="33.8" r="2.3" fill="#F7A8AE" opacity=".85"/>
    <path d="${smile}" stroke="#5A4636" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    ${sparks}`;
  return svg("0 0 48 48", s, s, inner, { flex: "none", overflow: "visible" });
}

// ก้อนเมฆหน้ายิ้ม
export function cloudPal(s = 44) {
  const inner = `
    <path d="M14 34a8 8 0 0 1-1-15.9A9 9 0 0 1 31 16a7 7 0 0 1 2 13.7" stroke="none" fill="#fff"/>
    <path d="M13.5 33.5a7.5 7.5 0 0 1-.8-15A8.6 8.6 0 0 1 30.4 16a6.6 6.6 0 0 1 2 13.4Z" fill="#FBFDFF"/>
    <path d="M31 13c2-1.6 4.3-1.7 6 .2-1.4 1.8-3.6 2.3-5.6 1.3" fill="#9FD37E"/>
    <circle cx="20" cy="26" r="1.7" fill="#5A4636"/>
    <circle cx="28" cy="26" r="1.7" fill="#5A4636"/>
    <circle cx="15.6" cy="28" r="1.8" fill="#F6A6A6" opacity=".8"/>
    <circle cx="32.4" cy="28" r="1.8" fill="#F6A6A6" opacity=".8"/>
    <path d="M21 28.5q3 2.2 6 0" stroke="#5A4636" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;
  return svg("0 0 48 48", s, s, inner, { flex: "none" });
}
