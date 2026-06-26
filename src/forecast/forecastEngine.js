// ============================================================
// forecast/forecastEngine.js — สูตรพยากรณ์แบบ regime-switching
//   ต่อยอดจาก utils/forecast.js (inferDailySales) แต่ "แยกข้อมูลตาม regime"
//   แล้วเลือกสูตรตามโหมด: normal / event_ramp / event_stable / post_event
//   + ตรวจ shock (ยอดพุ่ง/ตก) · clamp recent factor · ค่าเผื่อ (ไม่เรียกว่า error
//   ถ้ายังไม่มี backtest จริง)
//
//   หัวใจ: ห้ามเอา normal ก่อน event มาเฉลี่ยตรงกับ event · ช่วง event ใช้ recent
//   เป็นแกนก่อน จนกว่าจะมี same-weekday ใน event มากพอ (สลับเป็น stable เอง)
// ============================================================

import { inferDailySales, todayISO, addDaysISO, DOW_SHORT } from "../utils/forecast.js";
import { items } from "../data/store.js";
import { getActiveForecastMode, regimeTagForDate, lastEventStart } from "./eventRegimeManager.js";
import { getSettings } from "./regimeConfig.js";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const isKg = (id) => { const it = (items() || []).find((x) => x.id === id); return !!(it && (it.unit === "kg" || it.unit === "g")); };
const dowOf = (iso) => new Date(iso + "T00:00:00").getDay();

// ค่าเฉลี่ยถ่วงเวลา (ล่าสุดหนักกว่า) ของชุด asc
function wavg(arr, lambda = 0.7) {
  if (!arr.length) return 0;
  let num = 0, den = 0;
  for (let j = 0; j < arr.length; j++) { const k = arr.length - 1 - j; const w = Math.pow(lambda, k); num += w * arr[j]; den += w; }
  return den ? num / den : 0;
}
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

// ---- ดึงข้อมูลรายวันของรายการ + ติดป้าย regime แต่ละวัน ----
function taggedPoints(itemId) {
  return inferDailySales(itemId, {}).map((p) => ({ ...p, regime: regimeTagForDate(p.date) }));
}

// event factor: เทียบ "ยอดช่วง event" กับ "ยอดช่วงปกติ" (ทั้งร้าน/รายการนี้)
function eventFactor(points, ev, s) {
  const evVals = points.filter((p) => p.regime === "event").map((p) => p.sales);
  const nmVals = points.filter((p) => p.regime === "normal").map((p) => p.sales);
  if (evVals.length < 2 || nmVals.length < 1 || mean(nmVals) <= 0) return ev ? (ev.seed_factor_default || 2.0) : 1.0;
  const f = mean(evVals) / mean(nmVals);
  const lo = ev ? (ev.min_factor || 1.0) : 1.0;
  const hi = ev ? (ev.max_factor || 3.2) : 3.2;
  return clamp(f, lo, hi);
}

// ---- พยากรณ์ 1 รายการ สำหรับวันเป้าหมาย ----
// คืน { predicted, low, high, mode, reason, factor, learning, shock, n, safetyPct } หรือ null
export function forecastItemRegime(itemId, targetISO = addDaysISO(todayISO(), 1)) {
  const pts = taggedPoints(itemId);
  if (!pts.length) return null;
  const s = getSettings();
  const dow = dowOf(targetISO);
  const { mode, reason, event } = getActiveForecastMode(todayISO(), { pointsForDow: pts, dow });

  const sales = pts.map((p) => p.sales);
  const last3 = sales.slice(-(s.recent_short_days || 3));
  const last7 = sales.slice(-(s.recent_medium_days || 7));
  const sameDowNormal = pts.filter((p) => p.dow === dow && p.regime === "normal").map((p) => p.sales);
  const sameDowEvent = pts.filter((p) => p.dow === dow && p.regime === "event").map((p) => p.sales);
  const eventPts = pts.filter((p) => p.regime === "event").map((p) => p.sales);
  const postPts = pts.filter((p) => p.regime === "post_event").map((p) => p.sales);
  const factor = eventFactor(pts, event, s);

  let predicted = 0;
  if (mode === "event_ramp") {
    const a = mean(eventPts.slice(-7)), b = mean(eventPts.slice(-3)), c = wavg(sameDowNormal) * factor;
    predicted = eventPts.length ? (0.45 * a + 0.30 * b + 0.25 * c) : c; // ยังไม่มีข้อมูล event เลย → ใช้ normal×factor
  } else if (mode === "event_stable") {
    const sd = wavg(sameDowEvent), a = mean(eventPts.slice(-7)), b = mean(eventPts.slice(-3)), c = wavg(sameDowNormal) * factor;
    predicted = 0.45 * sd + 0.30 * a + 0.15 * b + 0.10 * c;
  } else if (mode === "post_event") {
    const evStart = lastEventStart();
    const preNormal = pts.filter((p) => p.regime === "normal" && (!evStart || p.date < evStart));
    const baselinePre = wavg(preNormal.filter((p) => p.dow === dow).map((p) => p.sales)) || mean(preNormal.map((p) => p.sales));
    const recentPost = mean(postPts.slice(-(s.recent_medium_days || 7)));
    // transition 4 สัปดาห์: normal เด่น → post เด่น
    const wk = clamp((() => { const m = getActiveForecastMode(todayISO()); return m.endedEvent ? Math.floor(((new Date(todayISO()) - new Date(m.endedEvent.end_date)) / 86400000) / 7) + 1 : 1; })(), 1, 5);
    const wNormal = [0.70, 0.70, 0.55, 0.40, 0.25][Math.min(wk, 5) - 1];
    predicted = wNormal * baselinePre + (1 - wNormal) * (recentPost || baselinePre);
  } else { // normal
    const enough = sameDowNormal.length >= 3;
    const sd = wavg(sameDowNormal);
    predicted = enough
      ? (0.55 * sd + 0.25 * mean(last7) + 0.20 * mean(last3))
      : (0.30 * sd + 0.40 * mean(last7) + 0.30 * mean(last3)); // ข้อมูลวันเดียวกันน้อย → พึ่ง recent
  }

  // ---- shock detection + clamp recent factor ----
  const baseRecent = mean(last7) || predicted;
  let recentFactor = baseRecent > 0 ? (mean(last3) / baseRecent) : 1;
  let shock = null;
  if (recentFactor > 1.30) shock = { dir: "up", msg: "ยอดจริง 3 วันล่าสุดสูงกว่าค่าฐานมาก — อาจมี shock / โปร / ทราฟฟิกเปลี่ยน" };
  else if (recentFactor < 0.70) shock = { dir: "down", msg: "ยอดจริง 3 วันล่าสุดต่ำกว่าค่าฐานมาก — อาจ stockout / ปิดบางช่วง / ดีมานด์ตก" };
  recentFactor = clamp(recentFactor, s.cap_recent_factor_min || 0.70, s.cap_recent_factor_max || 1.30);
  predicted = Math.max(0, predicted * (0.7 + 0.3 * recentFactor)); // ปรับเบา ๆ ตาม recent (clamp แล้ว)

  // ---- ค่าเผื่อ (ยังไม่มี backtest จริง → เรียก "ค่าเผื่อเริ่มต้น" ไม่ใช่ error) ----
  let safetyPct = s.default_startup_safety_percent || 30;
  if (mode === "normal") safetyPct = 15;
  else if (mode === "event_ramp" || mode === "event_stable") safetyPct = event ? (event.safety_stock_percent || 30) : 30;
  else if (mode === "post_event") safetyPct = 25;
  const sp = safetyPct / 100;

  const kg = isKg(itemId);
  const round = (v) => (kg ? r2(v) : Math.round(v));
  const lo = Math.max(0, predicted * (1 - sp * 0.5));
  const hi = predicted * (1 + sp);
  return {
    predicted: round(predicted),
    low: kg ? r2(lo) : Math.floor(lo),
    high: kg ? r2(hi) : Math.ceil(hi),
    mode, reason, factor: r2(factor),
    safetyPct, shock,
    learning: true,          // ยังไม่มี forecast_runs จริง → ใช้ค่าเผื่อ (ดู backtestEngine ภายหลัง)
    n: { sameDowNormal: sameDowNormal.length, sameDowEvent: sameDowEvent.length, event: eventPts.length, total: pts.length },
  };
}

// พยากรณ์ล่วงหน้า N วัน (เริ่มพรุ่งนี้)
export function forecastNextRegime(itemId, days = 7) {
  const base = todayISO();
  const out = [];
  for (let i = 1; i <= days; i++) {
    const date = addDaysISO(base, i);
    out.push({ date, dow: dowOf(date), dowName: DOW_SHORT[dowOf(date)], fc: forecastItemRegime(itemId, date) });
  }
  return out;
}
