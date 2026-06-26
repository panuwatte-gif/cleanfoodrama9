// ============================================================
// forecast/inventoryPlanner.js — วางแผนสต๊อก "ถึงรอบรับของถัดไป"
//   required_until_next_restock =
//      ยอดใช้พยากรณ์ (วันนี้→รอบรับของถัดไป) + สาขาเบิก(ในช่วงนั้น) + ค่าเผื่อ
//   order_needed = max(0, required − คงเหลือ)
//   *** สาขาเบิกของ = scheduled demand แยกต่างหาก ไม่เฉลี่ยรวมใน daily usage
//       (ในยอดใช้ถูกหักออกแล้วที่ usage.js — ที่นี่บวกกลับเป็นความต้องการเบิก)
// ============================================================

import { forecastIngredient } from "./forecastEngine.js";
import { getSettings, getTransfers } from "./regimeConfig.js";
import { todayISO, addDaysISO, dowOf } from "../utils/usage.js";
import { stockOf, unitOf } from "../utils/formulas.js";
import { items } from "../data/store.js";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const isKg = (id) => { const it = (items() || []).find((x) => x.id === id); return !!(it && (it.unit === "kg" || it.unit === "g")); };

// รวมยอดสาขาเบิกของรายการนี้ ในช่วง (พรุ่งนี้ → อีก days วัน)
export function branchTransferUntil(itemId, days) {
  let total = 0;
  const active = getTransfers().filter((t) => t.active !== false && t.item === itemId && Number(t.qty) > 0);
  if (!active.length) return 0;
  for (let k = 1; k <= days; k++) {
    const d = addDaysISO(todayISO(), k); const wd = dowOf(d);
    for (const t of active) if (Number(t.dow) === wd) total += Number(t.qty);
  }
  return r2(total);
}

// วางแผนรายวัตถุดิบ → ตัวเลขครบสำหรับหน้า Inventory Analysis
export function planIngredient(itemId) {
  const fc = forecastIngredient(itemId);
  if (!fc) return null;
  const s = getSettings();
  const onHand = (stockOf(itemId) && stockOf(itemId).qty) || 0;
  const daysUntil = Math.max(1, s.restock_interval_days || 7);
  const kg = isKg(itemId);
  const round = (v) => (kg ? r2(v) : Math.round(v));

  const forecastUsage = fc.predicted * daysUntil;
  const transfer = branchTransferUntil(itemId, daysUntil);
  const safety = forecastUsage * (fc.safetyPct / 100);
  const required = forecastUsage + transfer + safety;
  const orderNeeded = Math.max(0, required - onHand);

  const coverCap = s.display_days_cover_cap || 30;
  const daysCoverRaw = fc.predicted > 0 ? onHand / fc.predicted : null;
  const daysCover = daysCoverRaw == null ? null : (daysCoverRaw > coverCap ? coverCap : Math.floor(daysCoverRaw));
  const over = daysCoverRaw != null && daysCoverRaw > coverCap;

  // พอ / เสี่ยง / ไม่พอ
  let status = "พอ";
  if (onHand < forecastUsage + transfer) status = "ไม่พอ";
  else if (onHand < required) status = "เสี่ยง";

  return {
    itemId, unit: unitOf((items() || []).find((x) => x.id === itemId) || {}),
    fc, onHand: round(onHand), daysUntil,
    forecastUsage: round(forecastUsage), transfer: round(transfer), safety: round(safety),
    required: round(required), orderNeeded: round(orderNeeded),
    daysCover, over, status,
  };
}
