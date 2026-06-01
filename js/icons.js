/* ============================================================
   icons.js — ชุดไอคอนเส้น (Lucide-style, stroke 2px)
   ตรงตาม ICONOGRAPHY ของ design system
   ใช้: icon('boxes', 22)  →  คืน <svg> string
   ============================================================ */
const P = {
  dashboard: 'M3 3h8v8H3z M13 3h8v5h-8z M13 11h8v10h-8z M3 13h8v8H3z',
  clipboard: 'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z M8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2 M9 12h6 M9 16h4',
  boxes: 'M3 8l9-5 9 5-9 5-9-5z M3 8v8l9 5 9-5V8 M12 13v8',
  camera: 'M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M12 11m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
  wallet: 'M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0H3z M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9H6a3 3 0 0 1-3-2z M17 13h.01',
  calendar: 'M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M4 9h16 M8 3v4 M16 3v4 M9 15l2 2 4-4',
  flask: 'M9 3h6 M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3 M7 15h10',
  calculator: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M8 7h8 M8 12h.01 M12 12h.01 M16 12h.01 M8 16h.01 M12 16h.01 M16 16v.01',
  users: 'M9 11m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M3 21c0-3.3 2.7-5 6-5s6 1.7 6 5 M16 3.5a4 4 0 0 1 0 7.5 M18 21c0-3-1-4.5-3-5',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  // หมวดสต็อก
  utensils: 'M4 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3 M6 12v9 M16 3c-2 0-3 2-3 5s1 4 3 4 M16 3v18',
  cup: 'M5 8h12l-1 11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 8z M17 8h2a2 2 0 0 1 0 6h-2 M8 4v2 M12 4v2',
  droplet: 'M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z',
  beef: 'M12 3c4 0 7 2.5 7 6s-3 5-3 7a3 3 0 0 1-6 0c0-1-1-1.5-2-2a5 5 0 0 1 4-11z M12 9m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
  leaf: 'M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 8-4 13-9 16z M4 20c2-5 5-8 9-9',
  box: 'M3 8l9-5 9 5v8l-9 5-9-5z M3 8l9 5 9-5 M12 13v8',
  // ทั่วไป
  search: 'M11 11m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M21 21l-4.3-4.3',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0',
  plus: 'M12 5v14 M5 12h14',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18 M6 6l12 12',
  edit: 'M11 4h-5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5 M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
  trash: 'M3 6h18 M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6',
  lock: 'M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z M8 11V7a4 4 0 0 1 8 0v4',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  chevronLeft: 'M15 6l-6 6 6 6',
  store: 'M4 4h16l-1 5H5L4 4z M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9 M9 21v-6h6v6',
  trendUp: 'M3 17l6-6 4 4 8-8 M21 7v6h-6',
  trendDown: 'M3 7l6 6 4-4 8 8 M21 17v-6h-6',
  flame: 'M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-1.5.6-2.7 1.5-3.8C9 9.8 10 8 9.5 6 11 6.5 12 4.5 12 3z',
  alert: 'M12 3l9 16H3z M12 10v4 M12 17h.01',
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z M14 8a4 4 0 0 1 0 8 M18 5a8 8 0 0 1 0 14',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.8 6.6 20l1-6.1L3.2 9.5l6.1-.9z',
  clock: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 7v5l3 2',
  download: 'M12 3v12 M7 11l5 5 5-5 M5 21h14',
  pin: 'M12 17v5 M7 4h10l-1 6 3 3H5l3-3z',
  note: 'M5 3h10l4 4v14a0 0 0 0 1 0 0H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M14 3v5h5 M8 13h8 M8 17h5',
  user: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 21c0-4 3.6-6 8-6s8 2 8 6',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
  receipt: 'M5 3v18l2.5-1.5L10 21l2-1.5L14 21l2.5-1.5L19 21V3z M8 8h8 M8 12h8 M8 16h5',
  refresh: 'M21 12a9 9 0 1 1-3-6.7L21 7 M21 3v4h-4',
  scan: 'M4 7V5a1 1 0 0 1 1-1h2 M17 4h2a1 1 0 0 1 1 1v2 M20 17v2a1 1 0 0 1-1 1h-2 M7 20H5a1 1 0 0 1-1-1v-2 M4 12h16',
  book: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z M4 5v14a2 2 0 0 0 2 2h13',
  target: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
  truck: 'M3 6a1 1 0 0 1 1-1h10v9H3z M14 8h4l3 3v3h-7z M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  music: 'M9 18V5l11-2v13 M9 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M20 16m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  scissors: 'M6 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M6 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M8.1 8.1L20 20 M8.1 15.9L20 4',
  play: 'M6 4l14 8-14 8z',
  pause: 'M7 4h3v16H7z M14 4h3v16h-3z',
  languages: 'M5 7h9 M9 4v3c0 4-2 7-5 9 M7 11c0 3 3 5 7 6 M14 19l4-9 4 9 M16.5 15h4',
  send: 'M21 3L3 10.5l7 2.5 2.5 7z M21 3l-11 9',
  book2: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z M4 5v14a2 2 0 0 0 2 2h13 M9 8h6 M9 12h4',
  heart: 'M12 21s-7-4.6-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.4-9.5 9-9.5 9z',
  bolt: 'M13 2L4 14h6l-1 8 9-12h-6z',
  water: 'M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z',
  home: 'M3 11l9-8 9 8 M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10 M9 21v-7h6v7',
  coins: 'M9 8m-6 0a6 3 0 1 0 12 0a6 3 0 1 0-12 0 M3 8v5c0 1.7 2.7 3 6 3s6-1.3 6-3V8 M15 11.5c2.5.2 6 1.2 6 3.5 0 1.7-2.7 3-6 3-1 0-2-.1-3-.4',
};

export function icon(name, size = 22, opts = {}) {
  const d = P[name] || P.box;
  const stroke = opts.stroke || 2;
  const color = opts.color || 'currentColor';
  const paths = d.split(' M').map((seg, i) => `<path d="${i ? 'M' : ''}${seg}"/>`).join('');
  return `<svg class="icn" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

export const hasIcon = (name) => !!P[name];
