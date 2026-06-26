// ============================================================
// utils/usage.js — ยอดใช้วัตถุดิบรายวัน (ต้นทางเดียวของพยากรณ์ + รายงาน)
//   ที่มา: การนับสต๊อก + รับเข้า + ทิ้ง + (สาขาเบิก) ของพนักงาน — ไม่มี Grab CSV/เมนู/BOM
//
//   สมการยอดใช้จริง (ต่อช่วงระหว่างการนับ 2 ครั้ง A→B):
//     usage(A→B] = นับ(A) + รับเข้า − ทิ้ง − สาขาเบิก − นับ(B)
//   *** วันที่ "ไม่ได้นับ" ระหว่าง A กับ B: เกลี่ยยอดใช้เฉลี่ยทุกวัน (total ÷ จำนวนวัน)
//       ไม่กองไว้วันเดียว (แก้บั๊กเดิมที่ทำยอดวันที่นับปูดผิดปกติ)
//   ถ้ามี ledger ยอดขายตรง (salesDaily.sold) ของวันไหน → ใช้ค่านั้นทับ (วัดตรงแม่นกว่า)
// ============================================================

import { countsRows, salesRows, items } from "../data/store.js";

const DAY = 86400000;
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const toDate = (iso) => new Date(iso + "T00:00:00");
const isoOf = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const todayISO = () => isoOf(new Date());
export const addDaysISO = (iso, n) => isoOf(new Date(toDate(iso).getTime() + n * DAY));
export const daysBetweenISO = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY);
export const dowOf = (iso) => toDate(iso).getDay();
export const DOW_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
export const DOW_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const WINDOW = 120;

// มีข้อมูลให้คำนวณไหม
export function hasUsageData() {
  return salesRows().some((r) => r.sold != null) || countsRows().some((r) => r.qty != null);
}

// ---- ยอดใช้รายวันของวัตถุดิบหนึ่ง (เกลี่ยวันเว้นนับ) ----
// คืน [{date, dow, sales, recv, waste, transfer, count}] เรียงเก่า→ใหม่ · sales = ยอดใช้/วัน
export function dailyUsage(itemId, { windowDays = WINDOW, asOf = todayISO() } = {}) {
  const cutoff = addDaysISO(asOf, -windowDays);
  const moveByDate = {};   // date → {recv, waste, transfer}
  const countByDate = {};  // date → qty (เฉพาะที่นับ qty != null)
  for (const r of countsRows()) {
    if (r.item !== itemId) continue;
    moveByDate[r.date] = { recv: Number(r.recv) || 0, waste: Number(r.waste) || 0, transfer: Number(r.transfer) || 0 };
    if (r.qty != null) countByDate[r.date] = Number(r.qty) || 0;
  }

  const usage = {};        // date → ยอดใช้/วัน
  // (A) เกลี่ยยอดใช้จากผลต่างการนับ 2 ครั้งติดกัน ลงทุกวันในช่วง (เว้นนับก็มีค่า)
  const cdates = Object.keys(countByDate).sort();
  for (let i = 1; i < cdates.length; i++) {
    const A = cdates[i - 1], B = cdates[i];
    const span = daysBetweenISO(A, B);
    if (span <= 0) continue;
    let recv = 0, waste = 0, transfer = 0;
    for (let d = addDaysISO(A, 1); d <= B; d = addDaysISO(d, 1)) {
      const m = moveByDate[d]; if (m) { recv += m.recv; waste += m.waste; transfer += m.transfer; }
    }
    let total = countByDate[A] + recv - waste - transfer - countByDate[B];
    if (total < 0) total = 0;            // นับเพี้ยน/ของเข้าไม่ทันบันทึก → กันติดลบ
    const per = total / span;            // *** เกลี่ยเฉลี่ยทุกวัน ไม่กองวันเดียว
    for (let k = 1; k <= span; k++) { const d = addDaysISO(A, k); if (d >= cutoff && d <= asOf) usage[d] = per; }
  }
  // (B) ยอดขายตรงจาก ledger (ถ้ามี) ทับค่าเกลี่ยของวันนั้น
  for (const r of salesRows()) {
    if (r.item !== itemId || r.sold == null) continue;
    if (r.date < cutoff || r.date > asOf) continue;
    usage[r.date] = Number(r.sold) || 0;
  }

  return Object.keys(usage).sort().map((d) => ({
    date: d, dow: dowOf(d), sales: r2(usage[d]),
    recv: (moveByDate[d] && moveByDate[d].recv) || 0,
    waste: (moveByDate[d] && moveByDate[d].waste) || 0,
    transfer: (moveByDate[d] && moveByDate[d].transfer) || 0,
    count: countByDate[d] != null ? countByDate[d] : null,
  }));
}
// ชื่อเดิมเพื่อความเข้ากันได้ (รายงาน/หน้าสต๊อก) — โครงเดียวกัน
export { dailyUsage as inferDailySales };
export const hasSalesData = hasUsageData;

// ---- อันดับใช้มาก/น้อย (ใช้ในรายงาน top/low) ----
export function salesRanking({ windowDays = 30, cats = null } = {}) {
  const list = (items() || []).filter((it) => it.isActive !== false && (!cats || cats.includes(it.cat)));
  const out = [];
  for (const it of list) {
    const series = dailyUsage(it.id, { windowDays });
    if (!series.length) continue;
    const total = series.reduce((s, x) => s + x.sales, 0);
    out.push({ id: it.id, name: it.name, cat: it.cat, total: r2(total), days: series.length, avg: r2(total / series.length) });
  }
  out.sort((a, b) => b.total - a.total);
  return out;
}

// ---- ผลของวันล่าสุดที่นับได้ (รายงานสต๊อก) — จากผลต่างการนับจริง 2 ครั้งล่าสุด ----
export function latestDayResults({ cats = null } = {}) {
  const list = (items() || []).filter((it) => it.isActive !== false && (!cats || cats.includes(it.cat)));
  let best = null;
  const seriesById = {};
  for (const it of list) {
    const series = dailyUsage(it.id, { windowDays: WINDOW });
    seriesById[it.id] = series;
    if (series.length) { const last = series[series.length - 1].date; if (!best || last > best) best = last; }
  }
  if (!best) return null;
  const rows = [];
  for (const it of list) {
    const row = (seriesById[it.id] || []).find((x) => x.date === best);
    if (row) rows.push({ id: it.id, name: it.name, prev: null, recv: row.recv, count: row.count, waste: row.waste, sold: row.sales });
  }
  return rows.length ? { date: best, rows } : null;
}
