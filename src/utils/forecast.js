// ============================================================
// utils/forecast.js — เครื่องพยากรณ์ยอดขาย (อนุมานจากการนับสต๊อกรายวัน)
//   ทำตามสูตรที่เจ้าของกำหนดเป๊ะ — ไม่มี ML/neural net
//   ต้นทาง: rama9_stock_counts (ledger รายวัน) ผ่าน countsRows()
//
//   [ขั้น 1] ขายไป(t) = คงเหลือ(t−1) + รับเข้า(t) − ของเสีย(t) − คงเหลือ(t)
//            คำนวณได้เฉพาะเมื่อวัน t และวันก่อนหน้า (t−1 ตามปฏิทิน) นับสต๊อกทั้งคู่
//            วันก่อนหน้าไม่ได้นับ (เว้นวัน) → ข้ามวันนั้น (หายไปจากชุดข้อมูล ไม่ใช่ 0)
//   [ขั้น 2] พยากรณ์ = weighted average แยกตามวันในสัปดาห์ · w(k)=λ^k (k=0 ล่าสุด)
//            ย้อนหลัง ≤ 4 เดือน (16 สัปดาห์) · k นับเฉพาะจุดที่มีข้อมูลจริง
//   [ขั้น 2.5] cold-start ตามจำนวนจุดสะอาด n ของวันนั้น: n≤2 ใช้ค่าเฉลี่ยรวม,
//            n=3–4 blend 50/50, n≥5 ใช้ weighted แยกวันเต็ม
//   [ขั้น 3] %error=(จริง−ทาย)/ทาย · MAPE=เฉลี่ย|%error| · ช่วง=ทาย×(1±MAPE)
//   [ขั้น 4] จูน λ อัตโนมัติ (walk-forward): ลอง 0.5..0.9 เลือก MAPE ต่ำสุด
// ============================================================

import { countsRows, items } from "../data/store.js";

const DAY = 86400000;
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const toDate = (iso) => new Date(iso + "T00:00:00");
const isoOf = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const todayISO = () => isoOf(new Date());
export const addDaysISO = (iso, n) => isoOf(new Date(toDate(iso).getTime() + n * DAY));
const prevISO = (iso) => addDaysISO(iso, -1);
const dowOf = (iso) => toDate(iso).getDay();
export const DOW_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
export const DOW_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const LAMBDAS = [0.5, 0.6, 0.7, 0.8, 0.9];
const WINDOW_DAYS = 112;          // 16 สัปดาห์ = 4 เดือน
const COLD_MAPE = 0.4;            // ช่วงกว้างตอนข้อมูลน้อย (ยังประเมิน MAPE ไม่ได้)

// มีข้อมูลการนับให้คำนวณไหม (ไว้ตัดสิน empty state)
export function hasSalesData() {
  return countsRows().some((r) => r.qty != null);
}

// ---- [ขั้น 1] อนุมานยอดขายรายวันต่อรายการ (เฉพาะวันที่คำนวณได้) ----
// คืน [{date, dow, sales, prev, recv, waste, count}] เรียงเก่า→ใหม่
export function inferDailySales(itemId, { windowDays = WINDOW_DAYS, asOf = todayISO() } = {}) {
  const byDate = {};
  for (const r of countsRows()) if (r.item === itemId && r.qty != null) byDate[r.date] = r;
  const cutoff = addDaysISO(asOf, -windowDays);
  const out = [];
  for (const date of Object.keys(byDate).sort()) {
    if (date < cutoff || date > asOf) continue;
    const pr = byDate[prevISO(date)];
    if (!pr || pr.qty == null) continue;          // วันก่อนหน้าไม่ได้นับ → ข้าม
    const cur = byDate[date];
    const recv = Number(cur.recv) || 0;
    const waste = Number(cur.waste) || 0;
    let sales = (Number(pr.qty) || 0) + recv - waste - (Number(cur.qty) || 0);
    if (sales < 0) sales = 0;                      // กันค่าติดลบจากความคลาดเคลื่อนการนับ
    out.push({ date, dow: dowOf(date), sales: r2(sales), prev: r2(pr.qty), recv: r2(recv), waste: r2(waste), count: r2(cur.qty) });
  }
  return out;
}

// weighted average ของชุด (เรียงเก่า→ใหม่) · ตัวล่าสุด k=0
function weighted(seriesAsc, lambda) {
  let num = 0, den = 0;
  const L = seriesAsc.length;
  for (let j = 0; j < L; j++) {
    const k = L - 1 - j;                           // ล่าสุด (ท้าย array) = 0
    const w = Math.pow(lambda, k);
    num += w * seriesAsc[j].sales; den += w;
  }
  return den ? num / den : 0;
}

// walk-forward MAPE ของชุดวันเดียวกัน (เรียงเก่า→ใหม่) ที่ค่า λ หนึ่ง
function backtestMape(pointsAsc, lambda) {
  if (pointsAsc.length < 3) return null;           // จุดน้อยเกินจะ backtest
  const errs = [];
  for (let i = 2; i < pointsAsc.length; i++) {     // ต้องมี ≥2 จุดก่อนหน้า
    const pred = weighted(pointsAsc.slice(0, i), lambda);
    const actual = pointsAsc[i].sales;
    if (pred > 0) errs.push(Math.abs((actual - pred) / pred));
    else if (actual === 0) errs.push(0);           // ทาย 0 จริง 0 → error 0 (กันหารศูนย์)
  }
  return errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : null;
}

// [ขั้น 4] เลือก λ ที่ให้ MAPE ต่ำสุด · ข้อมูลน้อย → 0.8
function tuneLambda(pointsAsc) {
  let best = 0.8, bestMape = Infinity, any = false;
  for (const lam of LAMBDAS) {
    const m = backtestMape(pointsAsc, lam);
    if (m == null) continue;
    any = true;
    if (m < bestMape) { bestMape = m; best = lam; }
  }
  return { lambda: best, mape: any ? bestMape : null };
}

// ---- พยากรณ์ยอดขายของรายการ สำหรับวันที่เป้าหมาย (ISO) ----
// คืน null ถ้าไม่มีข้อมูลเลย · ไม่งั้น { predicted, low, high, mape, n, lambda, overallAvg, method }
export function forecastItem(itemId, targetISO, opts = {}) {
  const pool = inferDailySales(itemId, opts);
  if (!pool.length) return null;
  const overallAvg = pool.reduce((s, x) => s + x.sales, 0) / pool.length;
  const targetDow = dowOf(targetISO);
  const dowPts = pool.filter((x) => x.dow === targetDow);  // เรียงเก่า→ใหม่อยู่แล้ว
  const n = dowPts.length;

  const { lambda, mape: tunedMape } = tuneLambda(dowPts);
  const wDow = n ? weighted(dowPts, lambda) : overallAvg;

  // [ขั้น 2.5] cold-start ผูกกับจำนวนจุดจริง n
  let predicted, method;
  if (n <= 2) { predicted = overallAvg; method = "avg"; }
  else if (n <= 4) { predicted = 0.5 * overallAvg + 0.5 * wDow; method = "blend"; }
  else { predicted = wDow; method = "dow"; }
  predicted = Math.max(0, predicted);

  const mape = tunedMape;                          // จาก backtest วันเดียวกัน
  const band = (mape != null) ? mape : COLD_MAPE;
  return {
    predicted: r2(predicted),
    low: r2(Math.max(0, predicted * (1 - band))),
    high: r2(predicted * (1 + band)),
    mape: mape != null ? r2(mape) : null,
    bandPct: r2(band * 100),
    n, lambda, overallAvg: r2(overallAvg), method,
    points: pool.length,
  };
}

// พยากรณ์ล่วงหน้า N วัน (เริ่มพรุ่งนี้) ของรายการเดียว
export function forecastNext(itemId, days = 7) {
  const base = todayISO();
  const out = [];
  for (let i = 1; i <= days; i++) {
    const date = addDaysISO(base, i);
    out.push({ date, dow: dowOf(date), dowName: DOW_TH[dowOf(date)], fc: forecastItem(itemId, date) });
  }
  return out;
}

// ---- อันดับขายดี/ขายน้อย: รวมยอดขายอนุมานต่อรายการในช่วง N วันล่าสุด ----
// คืน [{id, name, total, days, avg}] เรียงมาก→น้อย (รายการที่มีข้อมูลเท่านั้น)
export function salesRanking({ windowDays = 30, cats = null } = {}) {
  const list = (items() || []).filter((it) => it.isActive !== false && (!cats || cats.includes(it.cat)));
  const out = [];
  for (const it of list) {
    const series = inferDailySales(it.id, { windowDays });
    if (!series.length) continue;                  // ไม่มีข้อมูล = ไม่จัดอันดับ (ไม่เดา)
    const total = series.reduce((s, x) => s + x.sales, 0);
    out.push({ id: it.id, name: it.name, cat: it.cat, total: r2(total), days: series.length, avg: r2(total / series.length) });
  }
  out.sort((a, b) => b.total - a.total);
  return out;
}

// ผลนับ/ขายจริงของวันล่าสุดที่คำนวณได้ (ไว้แทน COUNT_RESULT เดโมในรายงานสต๊อก)
// คืน { date, rows:[{id,name,prev,recv,count,waste,sold}] } หรือ null ถ้าไม่มี
export function latestDayResults({ cats = null } = {}) {
  const list = (items() || []).filter((it) => it.isActive !== false && (!cats || cats.includes(it.cat)));
  let best = null;
  const rows = [];
  for (const it of list) {
    const series = inferDailySales(it.id, { windowDays: WINDOW_DAYS });
    if (!series.length) continue;
    const last = series[series.length - 1];
    if (!best || last.date > best) best = last.date;
  }
  if (!best) return null;
  for (const it of list) {
    const series = inferDailySales(it.id, { windowDays: WINDOW_DAYS });
    const row = series.find((x) => x.date === best);
    if (row) rows.push({ id: it.id, name: it.name, prev: row.prev, recv: row.recv, count: row.count, waste: row.waste, sold: row.sales });
  }
  return rows.length ? { date: best, rows } : null;
}

// back-test ต่อรายการ: เทียบ "ทาย vs จริง" ย้อนหลัง (สำหรับหน้า fchistory)
// คืน [{date, dowName, pred, real, errPct, hit}] เรียงเก่า→ใหม่
export function backtestSeries(itemId, { windowDays = WINDOW_DAYS } = {}) {
  const pool = inferDailySales(itemId, { windowDays });
  const out = [];
  // จัดกลุ่มตาม dow แล้ว walk-forward ภายในกลุ่ม
  for (let i = 0; i < pool.length; i++) {
    const pt = pool[i];
    const priorSameDow = pool.slice(0, i).filter((x) => x.dow === pt.dow);
    if (priorSameDow.length < 2) continue;         // ยังไม่พอจะทาย
    const { lambda } = tuneLambda(priorSameDow);
    const pred = weighted(priorSameDow, lambda);
    const errPct = pred > 0 ? (pt.sales - pred) / pred : (pt.sales === 0 ? 0 : null);
    out.push({
      date: pt.date, dowName: DOW_SHORT[pt.dow],
      pred: r2(pred), real: r2(pt.sales),
      errPct: errPct == null ? null : r2(errPct * 100),
      hit: errPct != null && Math.abs(errPct) <= 0.15,   // ±15% นับว่าตรง
    });
  }
  return out;
}
