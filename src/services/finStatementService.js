// ============================================================
// services/finStatementService.js — งบการเงิน (P&L accrual) + cashflow (cash basis)
// สูตรทั้งหมดอยู่ที่นี่ — หน้า finstatement.js แค่แสดงผล (ข้อ E + K1/K2/K7)
// K1: ต้นทุนอาหาร 63บ./ออเดอร์ = เงินจ่ายจริง (รวมของหายแล้ว) → ห้ามหัก "ของหาย" ซ้ำ
//     ของหายแสดงเป็น memo เปรียบเทียบ ไม่ใช่ตัวหักใน P&L
// K2: fix cost ผูก timeline — เดือนไหนใช้ค่าของช่วงนั้น (ปัจจุบันแชร์ 21,000)
// K7: ภาษีขั้นบันไดตามรูปแบบกิจการ (คิดรายปี ไม่ใช่ % ลอยต่อเดือน)
// ============================================================
import { txnDaily, feeMonthly, transfers, adsDaily } from "../data/grabStore.js";
import { grabAssum } from "../data/grabAssumptions.js";
import { sendVsUse } from "./grabReportService.js";

const R = Math.round;

/* ---------- รวมธุรกรรมรายเดือน (จากไฟล์จริงทั้งหมด ม.ค.–ก.ค.) ---------- */
function txnMonthly() {
  const out = {}; const T = txnDaily();
  for (const d in T) { const ym = d.slice(0, 7); const m = out[ym] || (out[ym] = { o: 0, ns: 0, po: 0, days: 0 }); m.o += T[d].o; m.ns += T[d].ns; m.po += T[d].po; m.days++; }
  return out;
}
export function monthList() { return Object.keys(txnMonthly()).sort(); }

/* ---------- K2: fix cost ของเดือนนั้น (timeline) ---------- */
export function fixForMonth(ym) {
  const A = grabAssum();
  // โหมด what-if (อยู่เดี่ยว/กำหนดเอง) → ใช้ค่านั้นทุกเดือน · โหมดปัจจุบัน (แชร์) → ใช้ timeline ตามช่วง
  if (A.fix.mode === "solo") return A.fix.solo;
  if (A.fix.mode === "custom") return A.fix.custom;
  const tl = (A.fix.timeline || []).slice().sort((a, b) => (a.from < b.from ? -1 : 1));
  let v = A.fix.share;
  for (const t of tl) if (t.from <= ym) v = t.amount;
  return v;
}

/* ---------- E1+K1: P&L รายเดือน (จากไฟล์จริง) ---------- */
export function plMonth(ym) {
  const A = grabAssum();
  const tm = txnMonthly()[ym];
  if (!tm || !tm.o) return null;
  const F = feeMonthly()[ym] || {};
  const orders = tm.o, ns = R(tm.ns);
  const perOrderFee = R(tm.ns - tm.po);                       // GP+VAT+คอมมิชชัน (หักในแถวออเดอร์จริง)
  const ads = R(-(F["โฆษณา"] || 0));                            // แถวหมวดโฆษณาจริง
  const adj = R(-Object.keys(F).filter((k) => k !== "โฆษณา").reduce((s, k) => s + F[k], 0));
  const platformIn = R(tm.po + Object.values(F).reduce((s, v) => s + v, 0));
  const food = R(orders * A.cost.foodPerOrder);               // เงินจ่ายจริง (รวมของหายแล้ว — K1)
  const ricePack = R(orders * A.cost.ricePackPerOrder);
  const staffMeal = A.fix.staffMeal;
  const fix = fixForMonth(ym);
  const ebt = R(platformIn - food - ricePack - staffMeal - fix);
  // memo เปรียบเทียบ: ต้นทุนตามยอดขายจริง (ถ้าไม่มีของหาย) — ไม่ใช่ตัวหัก
  const lossPct = sendVsUse().pctT;
  const memoFoodUsed = R(food * (1 - lossPct / 100));
  return { ym, real: true, orders, ns, perOrderFee, ads, adj, platformIn, food, ricePack, staffMeal, fix, ebt, lossPct, memoFoodUsed, memoLoss: food - memoFoodUsed, net: ebt };
}

/* ---------- รวมหลายเดือน (ไตรมาส/ปี) ---------- */
export function plSum(yms) {
  const rows = (yms || []).map(plMonth).filter(Boolean);
  if (!rows.length) return null;
  const sum = { yms: rows.map((r) => r.ym), months: rows.length, real: true, lossPct: rows[0].lossPct };
  for (const k of ["orders", "ns", "perOrderFee", "ads", "adj", "platformIn", "food", "ricePack", "staffMeal", "fix", "ebt", "memoFoodUsed", "memoLoss", "net"]) sum[k] = rows.reduce((s, r) => s + r[k], 0);
  return sum;
}
export function quarterOf(ym) { return ym.slice(0, 4) + "-Q" + Math.ceil(+ym.slice(5) / 3); }
export function monthsOfQuarter(q) { const [y, qq] = q.split("-Q"); const s = (qq - 1) * 3 + 1; return [0, 1, 2].map((i) => y + "-" + String(s + i).padStart(2, "0")); }

/* ---------- K7: ภาษีรายปีตามรูปแบบกิจการ ---------- */
// ขั้นบันไดบุคคลธรรมดา (เงินได้สุทธิ → ภาษี)
const PIT_BRACKETS = [[150000, 0], [300000, .05], [500000, .10], [750000, .15], [1000000, .20], [2000000, .25], [5000000, .30], [Infinity, .35]];
function pitProgressive(taxable) {
  let tax = 0, prev = 0;
  for (const [cap, rate] of PIT_BRACKETS) { if (taxable <= prev) break; tax += (Math.min(taxable, cap) - prev) * rate; prev = cap; }
  return R(Math.max(0, tax));
}
// คืน { form, revenue, lumpExpense, deduction, taxable, tax, note } จากยอดทั้งปี
export function yearTax(yms) {
  const A = grabAssum(); const t = A.tax;
  const pl = plSum(yms); if (!pl) return null;
  if (t.form === "company") {
    // นิติบุคคล SME: กำไร 0-300k = 0% · 300k-3M = 15% · เกิน 3M = 20%
    const p = Math.max(0, pl.ebt); let tax = 0;
    if (p > 300000) tax += (Math.min(p, 3000000) - 300000) * .15;
    if (p > 3000000) tax += (p - 3000000) * .20;
    return { form: "นิติบุคคล (SME)", revenue: pl.ns, taxable: p, tax: R(tax), note: "คิดจากกำไรจริง (0% ถึง 3แสน · 15% ถึง 3ล้าน · 20% เกิน)" };
  }
  // บุคคลธรรมดา / หสม.: เงินได้ 40(8) หักเหมา 60% − ลดหย่อน → ขั้นบันได
  const revenue = pl.ns;
  const lumpExpense = R(revenue * (t.lumpExpensePct / 100));
  const deduction = (t.form === "partnership" ? t.partnerDeduction : t.personalDeduction) + (t.extraDeduction || 0);
  const taxable = Math.max(0, R(revenue - lumpExpense - deduction));
  return {
    form: t.form === "partnership" ? "ห้างหุ้นส่วนสามัญ/คณะบุคคล" : "บุคคลธรรมดา",
    revenue, lumpExpense, deduction, taxable, tax: pitProgressive(taxable),
    note: "เงินได้ 40(8) หักเหมา " + t.lumpExpensePct + "% − ลดหย่อน ฿" + deduction.toLocaleString("th-TH") + " → ขั้นบันได",
  };
}

/* ---------- E2: Cashflow (cash basis) ----------
   เงินรับ = ยอดที่ Grab "จ่ายจริง" (platformIn จากไฟล์ออเดอร์จริง — ครบทุกเดือน)
     ⚠ เดิมใช้ไฟล์ Transfers ซึ่งข้อมูล "ไม่ครบ" (ขาดหลายเดือน) → cashflow ติดลบเพี้ยน
   เงินจ่าย = ค่าอาหารจ่ายจริง (ถ้ามีบันทึก · ไม่มี = ตามยอดขาย) + fix + มื้อพนักงาน
   ยอดคงเหลือปลายเดือน = ยึด "ยอดจริงในบัญชี" (bank.asOf/balance) แล้วกาง running ทั้งเส้น */
function monthCashNet(ym) {
  const A = grabAssum();
  const pl = plMonth(ym);
  const cashIn = pl ? pl.platformIn : 0;
  const foodPaid = (A.foodPaid && A.foodPaid[ym] != null) ? A.foodPaid[ym] : (pl ? pl.food : 0);
  const fix = fixForMonth(ym);
  const staffMeal = A.fix.staffMeal;
  return R(cashIn - foodPaid - fix - staffMeal);
}

// ยอดเงินคงเหลือ "ปลายเดือน" ของทุกเดือน — คำนวณจากกระแสเงินสดสุทธิสะสม
// แล้วเลื่อนทั้งเส้นให้เดือน anchor ตรงกับยอดจริงในบัญชี (bank.balance)
export function bankBalances() {
  const A = grabAssum();
  const yms = monthList();
  let cum = 0; const cumAt = {};
  for (const ym of yms) { cum += monthCashNet(ym); cumAt[ym] = cum; }
  const anchorYm = A.bank && A.bank.asOf ? A.bank.asOf.slice(0, 7) : null;
  const anchorBal = A.bank && A.bank.balance != null ? A.bank.balance : null;
  const offset = (anchorYm && anchorBal != null && cumAt[anchorYm] != null) ? anchorBal - cumAt[anchorYm] : 0;
  const out = {};
  for (const ym of yms) out[ym] = R(offset + cumAt[ym]);
  return out;
}
// อนุกรมยอดคงเหลือปลายเดือน (ให้กราฟเส้น) — [{label, v}]
export function bankBalanceSeries() {
  const bal = bankBalances();
  return monthList().map((ym) => ({ label: thaiMonthShort(ym), v: bal[ym] }));
}
const _MON = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function thaiMonthShort(ym) { return _MON[+ym.slice(5) - 1]; }

export function cashflowMonth(ym) {
  const A = grabAssum();
  const pl = plMonth(ym);
  const cashIn = pl ? pl.platformIn : 0;
  const foodEstimated = !(A.foodPaid && A.foodPaid[ym] != null);
  const foodPaid = foodEstimated ? (pl ? pl.food : 0) : A.foodPaid[ym];
  const fix = fixForMonth(ym);
  const staffMeal = A.fix.staffMeal;
  const cashOut = foodPaid + fix + staffMeal;
  const bal = bankBalances();
  const yms = monthList();
  const i = yms.indexOf(ym);
  const endBalance = bal[ym];
  const startBalance = i > 0 ? bal[yms[i - 1]] : R(endBalance - (cashIn - cashOut));
  return {
    ym, cashIn, foodPaid, foodEstimated, fix, staffMeal,
    cashOut, net: R(cashIn - cashOut),
    startBalance, endBalance,
    anchored: !!(A.bank && A.bank.balance != null),
    anchorLabel: A.bank && A.bank.asOf ? A.bank.asOf : null,
  };
}
