// ============================================================
// forecast/forecastRuns.js — บันทึก "ค่าที่ระบบทำนายไว้ก่อนเห็นจริง"
//   จำเป็นสำหรับ backtest/error ตามสเปคข้อ 7 — เริ่มเก็บตั้งแต่วันนี้
//   เก็บใน localStorage (ออฟไลน์ได้) · ตาราง rama9_forecast_runs เก็บไว้ฝั่ง cloud
//   (ผูก sync ขึ้น cloud = งานรอบถัดไป)
//
//   error จริงต้องมาจาก run ที่บันทึก "ก่อน" เห็น actual เท่านั้น — ห้ามคำนวณย้อนหลังรวด
// ============================================================

import { load, save } from "../utils/storage.js";
import { items } from "../data/store.js";
import { dailyUsage, todayISO, addDaysISO } from "../utils/usage.js";
import { forecastIngredient } from "./forecastEngine.js";

const KEY = "forecast:runs:v1";
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function getRuns() { return load(KEY, []) || []; }

// บันทึก forecast ของ "พรุ่งนี้" ทุกวัตถุดิบ — วันละครั้ง (idempotent)
export function recordTodayRuns() {
  const runs = getRuns();
  const fDate = todayISO();
  const tDate = addDaysISO(fDate, 1);
  // มีของวันนี้แล้ว → ข้าม (กันบันทึกซ้ำ/ทับค่าที่ทายไว้ก่อน)
  if (runs.some((r) => r.forecast_date === fDate)) return 0;
  let added = 0;
  for (const it of (items() || [])) {
    if (it.isActive === false) continue;
    const fc = forecastIngredient(it.id, tDate);
    if (!fc) continue;
    runs.push({
      id: fDate + "|" + tDate + "|" + it.id,
      forecast_date: fDate, target_date: tDate,
      item: it.id, item_type: "ingredient",
      mode: fc.mode, value: fc.predicted,
    });
    added++;
  }
  if (added) save(KEY, runs);
  return added;
}

// backtest: เทียบ run (ที่ target ผ่านแล้ว) กับ actual usage จริง
//   คืน { n, mae, wape, bias } หรือ null ถ้ายังไม่พอ (เริ่มมีผลเมื่อ ≥ ~10 จุด)
export function backtestStats() {
  const runs = getRuns().filter((r) => r.target_date < todayISO());
  if (runs.length < 10) return null;
  const actualCache = {};
  const actualOf = (item, date) => {
    if (!actualCache[item]) { actualCache[item] = {}; for (const p of dailyUsage(item)) actualCache[item][p.date] = p.sales; }
    return actualCache[item][date];
  };
  let sumAbs = 0, sumActual = 0, sumDiff = 0, n = 0;
  for (const r of runs) {
    const a = actualOf(r.item, r.target_date);
    if (a == null) continue;
    sumAbs += Math.abs(a - r.value);
    sumActual += a;
    sumDiff += (r.value - a);
    n++;
  }
  if (n < 10 || sumActual <= 0) return null;
  return { n, mae: r2(sumAbs / n), wape: r2((sumAbs / sumActual) * 100), bias: r2((sumDiff / sumActual) * 100) };
}
