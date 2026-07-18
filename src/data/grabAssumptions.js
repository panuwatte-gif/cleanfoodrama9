// ============================================================
// data/grabAssumptions.js — ค่า assumption โมดูล Grab (ข้อ G ของสเปก)
// default = ค่าจริงปัจจุบัน · แก้ได้ที่หน้า "ตั้งค่ารายงาน Grab" · เก็บ localStorage
// โครงสร้างแบ่งหมวด — หน้า UI วนตามหมวดนี้ตรง ๆ
// ============================================================
import { load, save } from "../utils/storage.js";
const KEY = "kk_grab_assum_v3"; // bump เวอร์ชันเมื่อโครงสร้างเปลี่ยน — กันค่าเก่าคนละ shape มา merge แล้วพัง

export const GRAB_DEFAULTS = {
  // แพลตฟอร์ม (% ของยอดขายสุทธิ) — ใช้เป็น fallback เมื่อเดือนนั้นไม่มีไฟล์จริง
  platform: { gpPct: 30, vatOnGpPct: 7, mktPct: 4.8, adsPct: 5.5, adjPct: 0.6 },
  // ต้นทุนอาหาร/แพ็ก
  cost: {
    foodMode: "sent",            // "sent" = โหมดส่งสำเร็จ 63บ./ออเดอร์ · "raw" = วัตถุดิบสด+ซอส
    foodPerOrder: 63, saucePerDish: 4, herbPerDish: 2,
    ricePackPerOrder: 13, packPerDish: 5.92,
    riceCookRatio: 2.2, riceberryKg: 39, jasmineKg: 32, eggEach: 3.56,
  },
  // Fix cost + ภาษี — ค่าจริงปัจจุบัน = แชร์ค่าเช่า+พนักงานกับร้านข้างๆ 21,000/เดือน
  // timeline: fix ผูกช่วงเวลา — เดือนย้อนหลังใช้ค่าของช่วงนั้น (ห้ามเอา 50,000 ไปคิดเดือนที่จริงๆแชร์อยู่)
  fix: {
    mode: "share", share: 21000, solo: 50000, custom: 21000,
    timeline: [], // override รายช่วง [{from:"YYYY-MM", amount}] — เดือน ≥ from ใช้ค่านั้น (เฉพาะโหมดแชร์) · ว่าง = ใช้ค่าแชร์ทุกเดือน
    staffMeal: 2500, otHour: 100, deliveryRound: 180,
  },
  // ภาษี (K7): คิดตามรูปแบบกิจการ — individual บุคคลธรรมดา 40(8) หักเหมา 60% · partnership หสม. · company นิติบุคคล SME
  tax: { form: "individual", lumpExpensePct: 60, personalDeduction: 60000, extraDeduction: 0, partnerDeduction: 120000 },
  // ของหาย: ค่าปัจจุบันคำนวณอัตโนมัติจาก ส่งvsใช้ (ไม่ต้องกรอก) · กรอกเฉพาะเป้า what-if + เกณฑ์เตือน
  loss: { controlPct: 20, warnPct: 10 },
  // ราคาขายส่ง บาท/กก. (ตีมูลค่าของหาย)
  wholesale: { "เนื้อ": 330, "แซลมอน": 330, "อกไก่สับ": 200, "อกไก่นุ่ม": 220, "เป็ด": 170, "กุ้ง": 510 },
  // ยอดส่งวัตถุดิบ (กก.) ช่วงเทียบ ส่งvsใช้ — อัปเดตเองเมื่อมีรอบส่งใหม่
  send: { from: "2026-06-10", to: "2026-07-05", kg: { "เนื้อ": 34, "แซลมอน": 49, "อกไก่สับ": 48, "อกไก่นุ่ม": 16.5, "เป็ด": 5, "กุ้ง": 9 } },
  // เงินจ่ายค่าอาหารจริงรายเดือน (cash basis — ใช้ทำ cashflow)
  foodPaid: { "2026-03": 20033, "2026-04": 18201, "2026-05": 25642, "2026-06": 56384 },
  // ยอดเงินคงเหลือ "จริง" ในบัญชี ณ วันสิ้นเดือน (anchor) — ใช้ยึด running balance ของ cashflow
  // ให้ตรงกับสมุดบัญชีจริง (ไฟล์ Transfers ของ Grab ไม่ครบทุกเดือน → ใช้ยอดจริงยึดแทน)
  bank: { asOf: "2026-06-30", balance: 67511 },
  // ช่วงวิเคราะห์ (segment) — แก้ช่วงวันได้
  segments: [
    { id: "A", name: "เปิดเช้า-ปกติ", from: "2026-02-01", to: "2026-03-31", c: "#7FB5E3" },
    { id: "B", name: "เปิดสาย-ปกติ", from: "2026-04-01", to: "2026-05-31", c: "#B9A7E6" },
    { id: "C1", name: "แคมเปญต้น", from: "2026-06-01", to: "2026-06-15", c: "#F2C46B" },
    { id: "C2", name: "แคมเปญแรง", from: "2026-06-16", to: "2026-07-31", c: "#66BB8A" },
  ],
  // กติกาแปลงชื่อเมนู → โปรตีน (เช็คตามลำดับบน→ล่าง · คั่นทางเลือกด้วย |) — เพิ่มเมนู/LINE MAN ได้
  proteinRules: [
    { match: "แซลมอน+อกไก่", protein: "ผสม แซลมอน/อกไก่" },
    { match: "แซลมอน", protein: "แซลมอน" },
    { match: "เนื้อลีน|เนื้อคั่ว", protein: "เนื้อ" },
    { match: "เป็ด", protein: "เป็ด" },
    { match: "กุ้ง", protein: "กุ้ง" },
    { match: "นุ่ม|เทอริ|แจ่ว|2ซอส", protein: "อกไก่นุ่ม" },
    { match: "อกไก่", protein: "อกไก่สับ" },
  ],
  // ขนาดพอร์ชั่น (กรัมข้าวสุก/เนื้อสุก ต่อจาน)
  portions: { S: { rice: 150, meat: 100 }, M: { rice: 200, meat: 150 }, L: { rice: 250, meat: 200 } },
};

function deepMerge(base, over) {
  if (!over || typeof over !== "object" || Array.isArray(over)) return over !== undefined ? over : base;
  const out = { ...base };
  for (const k in over) out[k] = (base && typeof base[k] === "object" && !Array.isArray(base[k])) ? deepMerge(base[k], over[k]) : over[k];
  return out;
}

// อ่านค่า (default + ที่ผู้ใช้แก้ทับ)
export function grabAssum() { return deepMerge(GRAB_DEFAULTS, load(KEY, {})); }
// แก้ค่าทั้งหมวด เช่น setGrabAssum("platform", {gpPct:32})
export function setGrabAssum(section, patch) {
  const cur = load(KEY, {});
  cur[section] = deepMerge(deepMerge(GRAB_DEFAULTS[section], cur[section]), patch);
  save(KEY, cur);
}
// แทนที่ทั้งหมวด (ใช้กับ array เช่น segments / proteinRules)
export function replaceGrabAssum(section, value) {
  const cur = load(KEY, {}); cur[section] = value; save(KEY, cur);
}
// คืนค่าเริ่มต้นทีละหมวด
export function resetGrabAssum(section) {
  const cur = load(KEY, {}); delete cur[section]; save(KEY, cur);
}
