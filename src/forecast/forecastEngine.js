// ============================================================
// forecast/forecastEngine.js — พยากรณ์ "ยอดใช้วัตถุดิบ" รายวัน (ทางเดียวของระบบ)
//   อิงยอดใช้จริงจากการนับสต๊อก (utils/usage.js) — ไม่มีเมนู/size/BOM/CSV
//   เลือกสูตรตามโหมด: normal / event_ramp / event_stable / post_event / new_store
//   หลักการ: weighted average ช่วงสั้น เน้นวันใกล้สุด · ยอมรับ noise · ดีบักง่าย
//   (ไม่มี spike-confirmation / outlier-rejection ซับซ้อน)
// ============================================================

import { dailyUsage, todayISO, addDaysISO, dowOf } from "../utils/usage.js";
import { items } from "../data/store.js";
import { getActiveForecastMode, regimeTagForDate, lastEventStart } from "./eventRegimeManager.js";
import { getSettings, seedFactorFor } from "./regimeConfig.js";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const median = (a) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const isKg = (id) => { const it = (items() || []).find((x) => x.id === id); return !!(it && (it.unit === "kg" || it.unit === "g")); };
const itName = (id) => { const it = (items() || []).find((x) => x.id === id); return it ? it.name : ""; };
const domOf = (iso) => Number(iso.slice(8, 10));

// ---- พยากรณ์ยอดใช้/วัน ของวัตถุดิบหนึ่ง ----
// คืน { predicted, safetyPct, recommend, mode, modeLabel, reason, factor, shock, n, learning } | null
export function forecastIngredient(itemId, targetISO = addDaysISO(todayISO(), 1)) {
  const series = dailyUsage(itemId);
  if (!series.length) return null;
  const s = getSettings();
  const base = getActiveForecastMode(todayISO());
  const ev = base.event;
  const dow = dowOf(targetISO);

  // แยกข้อมูลตาม regime (ห้ามเอา normal ก่อน event มาปนกับ event)
  const tagged = series.map((p) => ({ ...p, regime: regimeTagForDate(p.date) }));
  const vals = tagged.map((p) => p.sales);
  const eventVals = tagged.filter((p) => p.regime === "event").map((p) => p.sales);
  const normalVals = tagged.filter((p) => p.regime === "normal").map((p) => p.sales);
  const postVals = tagged.filter((p) => p.regime === "post_event").map((p) => p.sales);

  const a3 = mean(vals.slice(-3)), a7 = mean(vals.slice(-7));
  const sameWk28 = tagged.filter((p) => p.dow === dow && p.date >= addDaysISO(todayISO(), -28)).map((p) => p.sales);
  const normBaseline = mean(normalVals) || a7;
  const seed = seedFactorFor(itName(itemId), ev);

  // ตัดสิน ramp/stable รายวัตถุดิบ
  const rampMin = (ev && ev.ramp_min_days) || 4;
  let mode = base.mode;
  if (mode === "event") mode = eventVals.length >= rampMin ? "event_stable" : "event_ramp";

  let predicted = 0, factor = 1, reason = base.reason;
  if (mode === "new_store") {
    predicted = mean(vals.slice(-3));          // เน้นวันใกล้สุด
    reason = "ร้านใหม่ — ใช้ยอด 1-3 วันล่าสุด";
  } else if (mode === "event_ramp") {
    const evMean = mean(eventVals.slice(-7));
    const f = (evMean > 0 && normBaseline > 0) ? evMean / normBaseline : seed;
    factor = clamp(f, ev ? ev.min_factor || 1 : 1, ev ? ev.max_factor || 4.5 : 4.5);
    predicted = eventVals.length ? (0.60 * evMean + 0.40 * normBaseline * factor) : (normBaseline * seed);
    reason = "Event เริ่มต้น · ข้อมูล event " + eventVals.length + " วัน → ใช้ seed/recent (×" + r2(eventVals.length ? factor : seed) + ")";
  } else if (mode === "event_stable") {
    const e3 = mean(eventVals.slice(-3)), e7 = mean(eventVals.slice(-7));
    const swE = mean(tagged.filter((p) => p.dow === dow && p.regime === "event").map((p) => p.sales));
    predicted = 0.55 * e3 + 0.30 * e7 + 0.15 * (swE || e7);
    reason = "Event คงที่ · เฉลี่ยช่วงสั้นในช่วง event";
  } else if (mode === "post_event") {
    const evStart = lastEventStart();
    const pre = tagged.filter((p) => p.regime === "normal" && (!evStart || p.date < evStart));
    const preBaseline = mean(pre.filter((p) => p.dow === dow).map((p) => p.sales)) || mean(pre.map((p) => p.sales)) || normBaseline;
    const recentPost = mean(postVals.slice(-7));
    const wk = base.endedEvent ? clamp(Math.floor((new Date(todayISO()) - new Date(base.endedEvent.end_date)) / 86400000 / 7) + 1, 1, 5) : 1;
    const wNormal = [0.70, 0.55, 0.40, 0.25, 0.25][Math.min(wk, 5) - 1];
    predicted = wNormal * preBaseline + (1 - wNormal) * (recentPost || preBaseline);
    reason = "หลัง Event สัปดาห์ที่ " + wk + " · ดึงกลับหายอดก่อน event (" + Math.round(wNormal * 100) + "%)" + (wk > 4 ? " · รอยืนยัน baseline ใหม่" : "");
  } else { // normal
    const enough = sameWk28.length >= 2;
    predicted = enough ? (0.50 * a3 + 0.30 * a7 + 0.20 * mean(sameWk28)) : (0.625 * a3 + 0.375 * a7);
    reason = "ปกติ · เฉลี่ยถ่วง 3/7 วัน" + (enough ? " + วันเดียวกัน" : " (วันเดียวกันข้อมูลน้อย ลดน้ำหนัก)");
  }

  // ---- demand_cycle = monthly_reset: ยอดตกปลายเดือน = พักที่ floor ไม่ใช่ event อ่อนแรง ----
  if ((mode === "event_ramp" || mode === "event_stable") && ev && ev.demand_cycle === "monthly_reset") {
    const peakWin = ev.cycle_peak_window_days || 7;
    const floor = median(tagged.filter((p) => p.regime === "event" && domOf(p.date) > peakWin).map((p) => p.sales));
    const peakLevel = mean(tagged.filter((p) => p.regime === "event" && domOf(p.date) <= peakWin).map((p) => p.sales)) || (normBaseline * seed);
    const tDom = domOf(targetISO);
    const dim = new Date(Number(targetISO.slice(0, 4)), Number(targetISO.slice(5, 7)), 0).getDate();
    if (floor > 0) predicted = Math.max(predicted, floor);             // ปลายเดือนไม่ทรุดต่ำกว่า floor
    if (tDom <= peakWin || tDom >= dim - 1) predicted = Math.max(predicted, peakLevel); // ต้นเดือน/ก่อนรีเซ็ต = ดันรับ peak
  }

  predicted = Math.max(0, predicted);

  // ---- shock alert (เตือนเฉย ๆ ไม่ยุ่งกับการคำนวณ) ----
  const todayUse = vals[vals.length - 1] || 0;
  const baseRef = a7 || predicted;
  let shock = null;
  if (baseRef > 0 && todayUse / baseRef > 1.5) shock = { dir: "up", msg: "ยอดวันนี้พุ่ง +" + Math.round((todayUse / baseRef - 1) * 100) + "% — จับตา ของอาจไม่พอถึงรอบเบิก" };
  else if (baseRef > 0 && todayUse / baseRef < 0.5 && vals.length > 3) shock = { dir: "down", msg: "ยอดวันนี้ตก −" + Math.round((1 - todayUse / baseRef) * 100) + "% — อาจ stockout/ปิดบางช่วง" };

  // ---- safety stock (ยังไม่มี backtest → "ค่าเผื่อเริ่มต้น" ไม่ใช่ error range) ----
  let safetyPct = 15;
  if (mode === "event_ramp" || mode === "event_stable") safetyPct = ev ? (ev.safety_stock_percent || 30) : 30;
  else if (mode === "post_event") safetyPct = 25;
  else if (mode === "new_store") safetyPct = 38;

  const kg = isKg(itemId);
  const round = (v) => (kg ? r2(v) : Math.round(v));
  return {
    predicted: round(predicted),
    safetyPct,
    recommend: round(predicted * (1 + safetyPct / 100)),
    mode, reason, factor: r2(factor), shock,
    learning: true,
    n: { total: tagged.length, event: eventVals.length, normal: normalVals.length, sameWk: sameWk28.length },
  };
}
