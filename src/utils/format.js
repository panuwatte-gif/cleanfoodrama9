// ============================================================
// utils/format.js — display formatting (Thai locale, tabular).
// Pure functions, no DOM, no state.
// ============================================================

// 1234.5 → "1,234.50 ฿"  (currency)
export function thb(n, withSymbol = true) {
  if (n == null || isNaN(n)) return withSymbol ? "– ฿" : "–";
  const s = Number(n).toLocaleString("th-TH", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return withSymbol ? `${s} ฿` : s;
}

// plain number with thousands separator (qty)
export function num(n, digits = 0) {
  if (n == null || isNaN(n)) return "–";
  return Number(n).toLocaleString("th-TH", {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
}

// Date → "18 มิ.ย. 69 14:30"  (Buddhist-era short)
export function dateTH(d, withTime = true) {
  if (!d) return "–";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date)) return "–";
  const opts = { day: "numeric", month: "short", year: "2-digit" };
  if (withTime) Object.assign(opts, { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleString("th-TH", opts);
}

// relative "เมื่อสักครู่ / 5 นาทีที่แล้ว / 2 ชม.ที่แล้ว"
export function ago(d) {
  if (!d) return "–";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const hr = Math.floor(m / 60);
  if (hr < 24) return `${hr} ชม.ที่แล้ว`;
  return `${Math.floor(hr / 24)} วันที่แล้ว`;
}
