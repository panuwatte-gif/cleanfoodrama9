// ============================================================
// services/grabReportService.js — สูตรคำนวณรายงาน Grab ทั้งหมด (ข้อ D ของสเปก)
// หน้า UI ห้ามคำนวณเอง — แก้สูตรที่ไฟล์นี้ที่เดียว
// ============================================================
import { txnDaily, feeMonthly, menuItems, menuDaily, adsDaily, adsCampaigns, transfers, peakHours } from "../data/grabStore.js";
import { grabAssum } from "../data/grabAssumptions.js";
import { COST_MODEL } from "../data/seed.js";

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

/* ---------- วันที่ ---------- */
export const DOW_TH = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
// iso → 0=จันทร์ … 6=อาทิตย์
export function dowOf(iso) { return (new Date(iso + "T12:00:00").getDay() + 6) % 7; }
function eachDate(from, to) { const out = []; const d = new Date(from + "T12:00:00"); const end = new Date(to + "T12:00:00"); while (d <= end) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); } return out; }
export const thaiShort = (iso) => { const [y, m, d] = iso.split("-"); const M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]; return +d + " " + M[+m - 1]; };
export const thaiMonth = (ym) => { const M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]; return M[+ym.slice(5) - 1] + " " + (+ym.slice(0, 4) + 543).toString().slice(-2); };

/* ---------- D0: segment ---------- */
// segment จาก assumptions + เดือนใหม่หลังช่วงสุดท้าย = "ล่าสุด" อัตโนมัติ
export function segments() {
  const segs = grabAssum().segments.map((s) => ({ ...s }));
  const lastTo = segs.reduce((m, s) => (s.to > m ? s.to : m), "");
  const dates = Object.keys(txnDaily()).sort();
  const dataMax = dates[dates.length - 1] || "";
  if (dataMax > lastTo) segs.push({ id: "NEW", name: "ล่าสุด", from: lastTo.slice(0, 8) + "01", to: dataMax, c: "#F0A8C4" });
  return segs;
}
export function segById(id) { return segments().find((s) => s.id === id); }

/* ---------- D1: ออเดอร์ / AOV / เงินเข้าต่อออเดอร์ ---------- */
// เงินเข้า (po) ของ segment รวมแถวหักรายเดือน (ads/การตลาด/ปรับยอด) ตามสัดส่วนวันของเดือนที่อยู่ในช่วง
export function segStats(id) {
  const s = segById(id); if (!s) return null;
  const T = txnDaily(); const F = feeMonthly();
  let o = 0, ns = 0, po = 0, saleDays = 0;
  const months = {};
  for (const d of eachDate(s.from, s.to)) {
    const ym = d.slice(0, 7); months[ym] = months[ym] || { inSeg: 0, total: new Date(+ym.slice(0, 4), +ym.slice(5), 0).getDate() };
    months[ym].inSeg++;
    const t = T[d]; if (!t) continue;
    saleDays++; o += t.o; ns += t.ns; po += t.po;
  }
  let fees = 0;
  for (const ym in months) { const f = F[ym]; if (f) fees += Object.values(f).reduce((a, b) => a + b, 0) * (months[ym].inSeg / months[ym].total); }
  po = r2(po + fees); // แถวหักเป็นลบอยู่แล้ว
  return { seg: s, orders: o, netSales: r2(ns), payout: po, saleDays, aov: o ? r1(ns / o) : 0, poPerOrder: o ? r1(po / o) : 0, ordersPerDay: saleDays ? r1(o / saleDays) : 0, hasData: saleDays > 0 };
}

/* ---------- D2+K9: รายชั่วโมง (ออเดอร์/วัน · หารด้วยวันขายทั้ง segment) ----------
   ใช้ไฟล์ Peak Hour จริงก่อน (ละเอียดกว่า) · ไม่มีค่อยคำนวณจากเวลาสร้างธุรกรรม */
export const HOURS = Array.from({ length: 14 }, (_, i) => i + 10); // 10:00-23:00
export function hourlyProfile(id) {
  const s = segById(id); if (!s) return null;
  const P = peakHours(); const cntP = {}; let daysP = 0;
  for (const d of eachDate(s.from, s.to)) { const arr = P[d]; if (!arr) continue; daysP++; arr.forEach((v, hh) => { if (v) cntP[hh] = (cntP[hh] || 0) + v; }); }
  if (daysP > 0) return { src: "peak", days: daysP, data: HOURS.map((hh) => ({ hour: hh, v: r2((cntP[hh] || 0) / daysP) })) };
  const T = txnDaily(); const cnt = {}; let saleDays = 0;
  for (const d of eachDate(s.from, s.to)) { const t = T[d]; if (!t) continue; saleDays++; for (const hh in t.hr) cnt[hh] = (cnt[hh] || 0) + t.hr[hh]; }
  if (!saleDays) return null;
  return { src: "txn", days: saleDays, data: HOURS.map((hh) => ({ hour: hh, v: r2((cnt[hh] || 0) / saleDays) })) };
}

/* ---------- D3: รายวัน จ-อา (ออเดอร์/วัน · หารด้วยจำนวนวันที่เป็น dow นั้น) ---------- */
export function dowProfile(id) {
  const s = segById(id); if (!s) return null;
  const T = txnDaily(); const sum = [0, 0, 0, 0, 0, 0, 0], n = [0, 0, 0, 0, 0, 0, 0];
  let any = false;
  for (const d of eachDate(s.from, s.to)) { const t = T[d]; if (!t) continue; any = true; const w = dowOf(d); sum[w] += t.o; n[w]++; }
  if (!any) return null;
  return sum.map((v, w) => ({ dow: DOW_TH[w], v: n[w] ? r1(v / n[w]) : 0 }));
}

/* ---------- D4: ชื่อเมนู → ขนาด/โปรตีน/ข้าว ---------- */
// คืน { kind: dish|egg|drink, size, protein, rice, eggs }
export function classifyMenu(name) {
  const A = grabAssum();
  const hasRice = /ข้าว|ไรซ์/.test(name);
  if (!hasRice) {
    if (name.includes("ไข่")) { const m = name.match(/(\d)\s*ฟอง/); return { kind: "egg", eggs: m ? +m[1] : 1 }; }
    return { kind: "drink" };
  }
  let size = "S";
  if (name.includes("[L-Jumbo")) size = "L"; else if (name.includes("[M-Standard")) size = "M";
  let protein = null;
  for (const r of A.proteinRules) if (r.match.split("|").some((p) => name.includes(p))) { protein = r.protein; break; }
  const rice = /หอมมะลิ|ข้าวมะลิ/.test(name) ? "หอมมะลิ" : "ไรซ์เบอรี่";
  return { kind: "dish", size, protein: protein || "อกไก่สับ", rice };
}

/* ---------- D4: ตารางเตรียมของ — กรัมสุก/วัน แยก จ-อา ต่อ segment ---------- */
export const PROTEINS = ["เนื้อ", "แซลมอน", "อกไก่สับ", "อกไก่นุ่ม", "เป็ด", "กุ้ง"];
export function prepTable(id) {
  const s = segById(id); if (!s) return null;
  const A = grabAssum(); const names = menuItems(); const M = menuDaily();
  // grams[protein][dow] รวม แล้วหารจำนวนวัน dow ที่มีข้อมูลเมนู
  const g = {}; PROTEINS.forEach((p) => (g[p] = [0, 0, 0, 0, 0, 0, 0]));
  const rice = { "ไรซ์เบอรี่": [0, 0, 0, 0, 0, 0, 0], "หอมมะลิ": [0, 0, 0, 0, 0, 0, 0] };
  const nDow = [0, 0, 0, 0, 0, 0, 0]; let anyDays = 0;
  for (const d of eachDate(s.from, s.to)) {
    const rows = M[d]; if (!rows) continue;
    anyDays++; const w = dowOf(d); nDow[w]++;
    for (const [ix, units] of rows) {
      const c = classifyMenu(names[ix] || ""); if (c.kind !== "dish") continue;
      const meat = A.portions[c.size].meat * units;
      if (c.protein === "ผสม แซลมอน/อกไก่") { g["แซลมอน"][w] += meat / 2; g["อกไก่สับ"][w] += meat / 2; }
      else if (g[c.protein]) g[c.protein][w] += meat;
      rice[c.rice][w] += A.portions[c.size].rice * units;
    }
  }
  if (!anyDays) return null;
  const per = (arr) => arr.map((v, w) => (nDow[w] ? Math.round(v / nDow[w]) : 0));
  const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / anyDays);
  return {
    days: anyDays,
    proteins: PROTEINS.map((p) => ({ name: p, byDow: per(g[p]), avg: avg(g[p]) })).filter((r) => r.avg > 0),
    rice: Object.keys(rice).map((k) => { const cooked = avg(rice[k]); return { name: k, byDow: per(rice[k]), cooked, raw: Math.round(cooked / A.cost.riceCookRatio) }; }),
  };
}

/* ---------- D5: เทียบ ส่ง vs ใช้ ---------- */
// ใช้ (กก.) คำนวณจากยอดขายเมนูจริงในช่วงส่ง · ส่ง (กก.) จาก assumptions (อัปเดตเองต่อรอบส่ง)
export function ingredientUseKg(from, to) {
  const A = grabAssum(); const names = menuItems(); const M = menuDaily();
  const kg = {}; PROTEINS.forEach((p) => (kg[p] = 0));
  for (const d of eachDate(from, to)) {
    const rows = M[d]; if (!rows) continue;
    for (const [ix, units] of rows) {
      const c = classifyMenu(names[ix] || ""); if (c.kind !== "dish") continue;
      const meat = A.portions[c.size].meat * units / 1000;
      if (c.protein === "ผสม แซลมอน/อกไก่") { kg["แซลมอน"] += meat / 2; kg["อกไก่สับ"] += meat / 2; }
      else if (c.protein in kg) kg[c.protein] += meat;
    }
  }
  for (const p in kg) kg[p] = r1(kg[p]);
  return kg;
}
export function sendVsUse() {
  const A = grabAssum(); const used = ingredientUseKg(A.send.from, A.send.to);
  const warnPct = (A.loss && A.loss.warnPct) || 10;
  let sentT = 0, lostT = 0, costT = 0;
  const rows = Object.keys(A.send.kg).map((p) => {
    const sent = A.send.kg[p], u = Math.min(used[p] || 0, sent);
    const lost = r1(sent - u), pct = sent ? r1(lost / sent * 100) : 0, cost = Math.round(lost * (A.wholesale[p] || 0));
    sentT += sent; lostT += lost; costT += cost;
    return { protein: p, sent, used: u, lost, pct, warn: pct > warnPct, cost };
  });
  const pctT = sentT ? r1(lostT / sentT * 100) : 0;
  return { rows, from: A.send.from, to: A.send.to, sentT: r1(sentT), lostT: r1(lostT), pctT, costT, warnPct, warn: pctT > warnPct };
}

/* ---------- D6: Ads ---------- */
export function adsSummary(lastNDays) {
  const D = adsDaily(); const dates = Object.keys(D).sort();
  const use = lastNDays ? dates.slice(-lastNDays) : dates;
  let spend = 0, orders = 0, sales = 0, impr = 0, clicks = 0;
  for (const d of use) { const a = D[d]; spend += a[0]; orders += a[1]; sales += a[2]; impr += a[3]; clicks += a[4]; }
  return { from: use[0], to: use[use.length - 1], spend: Math.round(spend), orders, sales: Math.round(sales), impr, clicks, roas: spend ? r2(sales / spend) : 0, costPerOrder: orders ? r1(spend / orders) : 0 };
}
export function adsMonthly() {
  const D = adsDaily(); const out = {};
  for (const d in D) { const ym = d.slice(0, 7); const m = out[ym] || (out[ym] = { spend: 0, orders: 0, sales: 0 }); m.spend += D[d][0]; m.orders += D[d][1]; m.sales += D[d][2]; }
  for (const ym in out) { const m = out[ym]; m.spend = Math.round(m.spend); m.sales = Math.round(m.sales); m.roas = m.spend ? r2(m.sales / m.spend) : 0; }
  return out;
}
export function adsDailySeries(n = 30) {
  const D = adsDaily();
  return Object.keys(D).sort().slice(-n).map((d) => ({ d, spend: D[d][0], orders: D[d][1], sales: D[d][2], roas: D[d][0] ? r2(D[d][2] / D[d][0]) : 0 }));
}
// % ออเดอร์จาก ads เทียบออเดอร์ทั้งหมดช่วงเดียวกัน
export function adsOrderShare() {
  const D = adsDaily(); const T = txnDaily();
  let adO = 0, allO = 0;
  for (const d in D) { if (T[d]) { adO += D[d][1]; allO += T[d].o; } }
  return allO ? r1(adO / allO * 100) : 0;
}
export function campaignRows() {
  const C = adsCampaigns();
  return Object.keys(C).map((name) => ({ name, ...C[name], roas: C[name].spend ? r2(C[name].sales / C[name].spend) : 0 }));
}

/* ---------- D7+K10: จุดคุ้มทุน scenario (2 fix × 3 ของหาย) ----------
   ของหายปัจจุบัน = ค่าคำนวณจริงจาก ส่งvsใช้ (ไม่ใช่ค่ากรอกลอย — K5) */
export function breakevenScenarios() {
  const A = grabAssum();
  const segsR = segments().slice().reverse();
  let poPerOrder = 0, base = null;
  for (const s of segsR) { const st = segStats(s.id); if (st && st.hasData) { poPerOrder = st.poPerOrder; base = st; break; } }
  const food = A.cost.foodPerOrder, pack = A.cost.ricePackPerOrder;
  const livePct = sendVsUse().pctT;
  const lossCases = [
    { name: "ของหายปัจจุบัน " + livePct + "% (คำนวณจริง)", pct: livePct },
    { name: "คุมเหลือ " + A.loss.controlPct + "%", pct: A.loss.controlPct },
    { name: "ไม่มีของหาย", pct: 0 },
  ];
  const fixCases = [
    { name: "ปัจจุบัน · มีร้านแชร์ค่าใช้จ่าย", fix: A.fix.share },
    { name: "อยู่เดี่ยว (จ่ายเต็ม)", fix: A.fix.solo },
  ];
  const grid = fixCases.map((f) => ({
    ...f,
    cells: lossCases.map((l) => {
      const cm = poPerOrder - (food * (1 + l.pct / 100) + pack);
      const bePerDay = cm > 0 ? r1((f.fix + A.fix.staffMeal) / 30 / cm) : Infinity;
      return { ...l, cm: r1(cm), bePerDay };
    }),
  }));
  return { poPerOrder, food, pack, base, lossCases, grid };
}

/* ---------- จุดคุ้มทุน/วัน "ของจริง" (บาทยอดขายสุทธิต่อวัน) ----------
   = ต้นทุนคงที่จริงทั้งเดือน ÷ อัตรากำไรส่วนเพิ่ม ÷ 30
   • ต้นทุนคงที่ = โมเดลต้นทุน "เต็ม" (ค่าเช่า+แรง+ไฟ/น้ำ/เน็ต+อื่นๆ) + มื้อพนักงาน
     — ไม่ใช่แค่ค่าที่แชร์ 21,000 (ซึ่งทำให้จุดคุ้มทุนต่ำเกินจริง)
   • อัตรากำไรส่วนเพิ่ม = จากยอดขายจริง segment ล่าสุด: (ยอดขาย − ค่าธรรมเนียม Grab − อาหาร − แพ็ก) ÷ ยอดขาย
   คืนหน่วยเดียวกับ "ยอดขายสุทธิ/วัน" (แกนเดียวกับแท่งกราฟแดชบอร์ด) */
export function breakevenNetSalesPerDay() {
  const A = grabAssum();
  const fixedMonth = Object.values(COST_MODEL.fixedMonth).reduce((a, b) => a + b, 0) + (A.fix.staffMeal || 0);
  const segsR = segments().slice().reverse();
  let st = null;
  for (const s of segsR) { const x = segStats(s.id); if (x && x.hasData && x.netSales > 0) { st = x; break; } }
  if (!st) return 0;
  const grabFee = st.netSales - st.payout;                                  // GP+VAT+คอมมิชชัน ที่ Grab หัก
  const foodPack = st.orders * (A.cost.foodPerOrder + A.cost.ricePackPerOrder);
  const cmRatio = Math.max(0.05, (st.netSales - grabFee - foodPack) / st.netSales);
  return Math.round(fixedMonth / cmRatio / 30);
}

/* ---------- ความครบของข้อมูล (ปฏิทินย่อรายเดือน) ---------- */
// คืน { "YYYY-MM": { txn, menu, transfer, ads } } = จำนวนวันที่มีข้อมูลในเดือนนั้น ต่อชนิดไฟล์
export function coverage() {
  const months = {};
  const mark = (type, iso) => { const ym = iso.slice(0, 7); (months[ym] || (months[ym] = { txn: 0, menu: 0, transfer: 0, ads: 0, peak: 0 }))[type]++; };
  for (const d in txnDaily()) mark("txn", d);
  for (const d in menuDaily()) mark("menu", d);
  for (const d in adsDaily()) mark("ads", d);
  for (const d in peakHours()) mark("peak", d);
  for (const [d] of transfers()) mark("transfer", d);
  return months;
}
export const daysInMonth = (ym) => new Date(+ym.slice(0, 4), +ym.slice(5), 0).getDate();
