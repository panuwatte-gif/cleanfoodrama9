// ============================================================
// components/icons.js — Lucide-style line icons (พอร์ตจาก prototype2/ui.jsx PI)
// เก็บเป็น "string ของ inner SVG" → ใช้กับ pi(name, size, w)
// 24px viewBox · currentColor · round cap/join · fill:none
// ============================================================

export const PI_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" />',
  box: '<path d="M21 8.5 12 13 3 8.5l9-4.5 9 4.5Z" /><path d="M3 8.5V16l9 4.5 9-4.5V8.5" /><path d="M12 13v7.5" />',
  trend: '<path d="M3 17l6-6 4 4 7-8" /><path d="M14 7h6v6" />',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="3" /><path d="M16 12h.01" /><path d="M3 10h18" />',
  more: '<circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />',
  plus: '<path d="M12 5v14" /><path d="M5 12h14" />',
  minus: '<path d="M5 12h14" />',
  check: '<path d="M4 12.5 9.5 18 20 6.5" />',
  x: '<path d="M6 6l12 12" /><path d="M18 6 6 18" />',
  chev: '<path d="m9 5 7 7-7 7" />',
  chevd: '<path d="m5 9 7 7 7-7" />',
  chevl: '<path d="m15 5-7 7 7 7" />',
  arrowl: '<path d="M19 12H5" /><path d="m11 18-6-6 6-6" />',
  up: '<path d="M12 19V6" /><path d="m6 12 6-6 6 6" />',
  down: '<path d="M12 5v13" /><path d="m18 12-6 6-6-6" />',
  swap: '<path d="M7 4v13" /><path d="m4 14 3 3 3-3" /><path d="M17 20V7" /><path d="m14 10 3-3 3 3" />',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 19a2 2 0 0 0 4 0" />',
  search: '<circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" />',
  edit: '<path d="M12 20h9" /><path d="M16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1 1-4Z" />',
  trash: '<path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" /><path d="M10 11v6M14 11v6" />',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />',
  alert: '<path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4" /><path d="M12 17.5h.01" />',
  store: '<path d="M4 8 5.5 4h13L20 8" /><path d="M4 8h16v3a3 3 0 0 1-6 0 3 3 0 0 1-5 0 3 3 0 0 1-5 0Z" /><path d="M5 13.5V20h14v-6.5" />',
  truck: '<rect x="2" y="6" width="13" height="11" rx="1.5" /><path d="M15 10h4l3 3v4h-7" /><circle cx="7" cy="18.5" r="1.8" /><circle cx="17.5" cy="18.5" r="1.8" />',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" />',
  shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />',
  leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15Z" /><path d="M5 19c2-5 6-9 11-11" />',
  flame: '<path d="M12 3s5 4.5 5 9.5a5 5 0 0 1-10 0C7 9 9 6.5 12 3Z" /><path d="M12 21a3 3 0 0 0 3-3c0-2-3-4-3-4s-3 2-3 4a3 3 0 0 0 3 3Z" />',
  pan: '<circle cx="11" cy="13" r="7" /><path d="M16.5 8.5 21 4" /><path d="M11 10a3 3 0 0 0-3 3" />',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />',
  rice: '<path d="M4 12h16a8 8 0 0 1-16 0Z" /><path d="M8 8c1-1.5 3-1.5 4 0s3 1.5 4 0" />',
  music: '<circle cx="7" cy="18" r="3" /><circle cx="17" cy="16" r="3" /><path d="M10 18V5l10-2v13" />',
  settings: '<circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.2-1.6l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.7-1.6L13.5 2h-3l-.3 2.9a7 7 0 0 0-2.7 1.6l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .5.1 1.1.2 1.6l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.7 1.6l.3 2.9h3l.3-2.9a7 7 0 0 0 2.7-1.6l2.3 1 2-3.4-2-1.5c.1-.5.2-1 .2-1.6Z" />',
  send: '<path d="m21 3-9.5 9.5" /><path d="M21 3 14 21l-2.5-8.5L3 10 21 3Z" />',
  user: '<circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" />',
  users: '<circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M17.5 14.5A6 6 0 0 1 21 20" />',
  history: '<path d="M3.5 8A9 9 0 1 1 3 12" /><path d="M3 4v4h4" /><path d="M12 8v4l3 2" />',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" />',
  doc: '<path d="M6 2.5h8L19 7.5V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" /><path d="M14 2.5v5h5" /><path d="M9 13h6M9 17h4" />',
  chat: '<path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z" />',
  scale: '<path d="M12 3v18" /><path d="M8 21h8" /><path d="M4 7h16" /><path d="m6 7-2.5 5a3 3 0 0 0 5 0L6 7Z" /><path d="m18 7-2.5 5a3 3 0 0 0 5 0L18 7Z" />',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />',
  print: '<path d="M6 9V3h12v6" /><path d="M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" /><rect x="8" y="14" width="8" height="7" rx="1" />',
  cloud: '<path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17.2 8.6 3.8 3.8 0 0 1 17.5 16" />',
  download: '<path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 19.5h16" />',
  file: '<path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M9.5 13h5M9.5 16.5h3" />',
  db: '<ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5V12c0 1.7 3.6 3 8 3s8-1.3 8-3V5.5" /><path d="M4 12v6.5c0 1.7 3.6 3 8 3s8-1.3 8-3V12" />',
  image: '<rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m5 19 5-5 3 3 4-4 4 4" />',
  cart: '<circle cx="9.5" cy="20" r="1.5" /><circle cx="17.5" cy="20" r="1.5" /><path d="M3 4h2.5L8 15h10.5L21 7H6" />',
  tag: '<path d="M3 11V4a1 1 0 0 1 1-1h7l10 10-8 8L3 11Z" /><path d="M8 8h.01" />',
  chefhat: '<path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.46.32-.84.73-1.04a4 4 0 0 0-2.14-7.59 5 5 0 0 0-9.18 0 4 4 0 0 0-2.14 7.59c.41.2.73.58.73 1.04V20a1 1 0 0 0 1 1Z" /><path d="M6.5 17h11" />',
  scissors: '<circle cx="6" cy="6" r="2.8" /><circle cx="6" cy="18" r="2.8" /><path d="M20 4 8.3 15.7" /><path d="M14.5 14.5 20 20" /><path d="M8.3 8.3 12 12" />',
  play: '<path d="M7.5 4.5v15l13-7.5Z" />',
  pause: '<path d="M8.5 5v14" /><path d="M15.5 5v14" />',
  cow: '<path d="M8 5.2C6.9 4 5.4 3.3 3.9 3.4c.2 1.9 1.3 3.3 2.9 3.9" /><path d="M16 5.2c1.1-1.2 2.6-1.9 4.1-1.8-.2 1.9-1.3 3.3-2.9 3.9" /><path d="M12 4.2a6 6 0 0 1 6 6.3l-.3 3.7a5.7 5.7 0 0 1-11.4 0l-.3-3.7a6 6 0 0 1 6-6.3Z" /><path d="M9.6 15.6h.01M14.4 15.6h.01" /><path d="M9.5 9.2h.01M14.5 9.2h.01" />',
  pig: '<circle cx="12" cy="12.6" r="7.2" /><path d="M6.8 7.2 5.2 4.4l3.4.7" /><path d="M17.2 7.2l1.6-2.8-3.4.7" /><rect x="9" y="11" width="6" height="4.4" rx="2.2" /><path d="M10.8 13.2h.01M13.2 13.2h.01" />',
  duck: '<circle cx="9" cy="7.2" r="3.4" /><path d="M12.3 6.4c1.2-.4 2.6-.1 3.5.8-.9.9-2.2 1.2-3.4.9" /><path d="M6.2 9.8C4.8 11 4 12.6 4 14.3 4 17.6 7.2 20 11.8 20c4.6 0 8.2-2.6 8.2-6l-2.6.6" /><path d="M8 6.6h.01" />',
  chicken: '<path d="M11.2 4.6c-.1-1.1.6-2.1 1.7-2.3.3 1-.2 2.1-1.1 2.6" /><path d="M12 5a6.8 6.8 0 0 1 6.8 6.8c0 4.2-3 7.2-7.2 7.2H4.5l2.3-2.8c-1-1.2-1.6-2.7-1.6-4.4A6.8 6.8 0 0 1 12 5Z" /><path d="M14.2 9.2h.01" /><path d="m18.8 11 2.2.9-2.2 1" />',
  fish: '<path d="M16.5 12c0 3-3 5.5-6.8 5.5S3 12 3 12s2.9-5.5 6.7-5.5S16.5 9 16.5 12Z" /><path d="M16.5 12 21 8.5v7L16.5 12Z" /><path d="M7.5 11h.01" />',
  shrimp: '<path d="M13.5 4a7.5 7.5 0 0 1 0 15H10A5.5 5.5 0 0 1 6.6 9.2" /><path d="M13.5 4H8" /><path d="M13.5 11.5H10" /><path d="M10.5 19 9 21.5M13 19l.6 2.5" /><path d="M16.8 7.5h.01" />',
  egg: '<path d="M12 3C8.5 3 5.5 9 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9 15.5 3 12 3Z" />',
  eggtray: '<rect x="3" y="6.5" width="18" height="12" rx="2" /><path d="M3 12.5h18" /><path d="M9 6.5v12M15 6.5v12" />',
  eggboil: '<path d="M12 3C8.5 3 5.5 9 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9 15.5 3 12 3Z" /><circle cx="12" cy="13.5" r="2.7" />',
  eggsoft: '<path d="M12 3C8.5 3 5.5 9 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9 15.5 3 12 3Z" /><circle cx="12" cy="13.2" r="2.7" /><path d="M12 15.9v2.3" />',
  eggshoyu: '<path d="M4.5 13.5h15a7.5 7.5 0 0 1-15 0Z" /><path d="M8.6 13.5C8.6 10.4 10 7 12 7s3.4 3.4 3.4 6.5" />',
  bottle: '<path d="M10 3h4" /><path d="M10 3v4l-2.5 3A3 3 0 0 0 7 12v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7a3 3 0 0 0-.5-2L14 7V3" /><path d="M7 14h10" />',
  cup2: '<path d="M5.5 7h13l-1.6 13.5H7.1L5.5 7Z" /><path d="M4.5 7h15" /><path d="M12 7l2.2-4.5" />',
  cup: '<path d="M5 9h14l-1.3 11H6.3L5 9Z" /><path d="M7 5.5h10L18 9H6l1-3.5Z" />',
  bag: '<path d="M5.5 8h13l-1 13h-11l-1-13Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />',
  utensil: '<path d="M7 3v6.5" /><path d="M4.8 3v3.6a2.2 2.2 0 0 0 4.4 0V3" /><path d="M7 9.5V21" /><path d="M17 3c1.6 0 2.8 1.9 2.8 4.2S18.6 11.4 17 11.4s-2.8-1.9-2.8-4.2S15.4 3 17 3Z" /><path d="M17 11.4V21" />',
  jar: '<path d="M8 3.5h8" /><rect x="6.5" y="6" width="11" height="15" rx="2.5" /><path d="M6.5 11h11" />',
  heart: '<path d="M12 20.5 4.2 12.7a4.6 4.6 0 0 1 6.5-6.5l1.3 1.3 1.3-1.3a4.6 4.6 0 0 1 6.5 6.5Z" />',
  sun: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" />',
  pin: '<path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" />',
  snow: '<path d="M12 2v20" /><path d="M4.2 7 19.8 17" /><path d="M19.8 7 4.2 17" /><path d="m9.2 4 2.8 1.8L14.8 4" /><path d="m9.2 20 2.8-1.8L14.8 20" /><path d="m3 9.4 2.3 1.2-.4 2.6" /><path d="m21 9.4-2.3 1.2.4 2.6" /><path d="m3 14.6 2.3-1.2-.4-2.6" /><path d="m21 14.6-2.3-1.2.4-2.6" />',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2.6" /><rect x="8" y="6" width="8" height="3.2" rx="1" /><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 13.5v3" />',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />',
  notebook: '<rect x="6.5" y="3" width="13" height="18" rx="2.4" /><path d="M10.5 3v18" /><path d="M13.5 8h3.5M13.5 12h3.5" /><path d="M3.8 6.3h3.6M3.8 10h3.6M3.8 13.7h3.6" />',
  receipt: '<path d="M6 3h12v18l-2.2-1.4L13.6 21 12 19.6 10.4 21 8.2 19.6 6 21V3Z" /><path d="M9 8h6M9 11.5h6M9 15h3.5" />',
  coin: '<circle cx="12" cy="12" r="8.2" /><path d="M12 7.4v9.2" /><path d="M14.4 9.5c0-1-1-1.7-2.4-1.7s-2.4.6-2.4 1.7c0 2.4 4.8 1 4.8 3.4 0 1.1-1.1 1.8-2.4 1.8s-2.4-.7-2.4-1.7" />',
  clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.4" /><path d="M9 4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V4.5Z" /><path d="M8.5 11.5h7M8.5 15h4.5" />',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" />',
  inbox: '<path d="M4 13.5 6.5 5h11L20 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5.5Z" /><path d="M4 13.5h4l1.5 2.5h5L16 13.5h4" />',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l9 4V6L6 10H4a1 1 0 0 0-1 1Z" /><path d="M18 8a4 4 0 0 1 0 8" /><path d="M6 14v3.5A1.5 1.5 0 0 0 7.5 19" />',
  clock: '<circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" />',
  reply: '<path d="M9 7 4 12l5 5" /><path d="M4 12h9a7 7 0 0 1 7 7v1" />',
};

// สร้าง <svg> จากชื่อไอคอน
export function pi(name, size = 22, w = 2) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", w);
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = PI_PATHS[name] || '<circle cx="12" cy="12" r="8" />';
  return svg;
}
