// ============================================================
// data/grabStore.js — ชั้นข้อมูล Grab: seed จริง (grabSeed.js) + ไฟล์ที่ผู้ใช้อัปเพิ่ม
// อัปโหลดใหม่ = upsert รายวัน (วันซ้ำ → แทนที่ด้วยข้อมูลล่าสุด ไม่นับซ้ำ)
// ส่วนที่อัปเพิ่มเก็บใน localStorage — ล้างได้จากหน้าอัปโหลด
// ============================================================
import { load, save } from "../utils/storage.js";
import { TXN_DAILY, FEE_MONTHLY, MENU_ITEMS, MENU_DAILY, TRANSFERS, ADS_DAILY, ADS_CAMPAIGNS, PEAK_HOURS } from "./grabSeed.js";
const KEY = "kk_grab_uploads_v1";

const emptyUploads = () => ({ txnDaily: {}, feeMonthly: {}, menuItems: [], menuDaily: {}, transfers: {}, adsDaily: {}, peakHours: {} });
let up = load(KEY, null) || emptyUploads();
if (!up.peakHours) up.peakHours = {}; // รองรับข้อมูลเก่าก่อนมี peak
function persist() { save(KEY, up); }

/* ---------- getters (seed + อัปโหลดรวมกันแล้ว) ---------- */
export function txnDaily() { return { ...TXN_DAILY, ...up.txnDaily }; }
export function feeMonthly() {
  const out = {};
  for (const src of [FEE_MONTHLY, up.feeMonthly]) for (const ym in src) out[ym] = { ...(out[ym] || {}), ...src[ym] };
  return out;
}
export function menuItems() { return MENU_ITEMS.concat(up.menuItems); }
export function menuDaily() { return { ...MENU_DAILY, ...up.menuDaily }; }
export function transfers() {
  // seed ไม่มีรหัสจ่ายรายได้ → กันซ้ำด้วย วันที่+ยอด
  const seen = {}; const out = [];
  for (const [d, v] of TRANSFERS) { seen[d + "|" + v] = 1; out.push([d, v]); }
  for (const pid in up.transfers) { const [d, v] = up.transfers[pid]; if (!seen[d + "|" + v]) { seen[d + "|" + v] = 1; out.push([d, v]); } }
  return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
export function adsDaily() { return { ...ADS_DAILY, ...up.adsDaily }; }
export function adsCampaigns() { return ADS_CAMPAIGNS; }
export function peakHours() { return { ...PEAK_HOURS, ...up.peakHours }; }

/* ---------- upsert จากไฟล์ที่ parse แล้ว (grabParseService) ---------- */
// คืนจำนวน {days ใหม่, days ทับ} เพื่อรายงานผลบนหน้าอัปโหลด
export function applyParsed(p) {
  let added = 0, replaced = 0;
  if (p.type === "txn") {
    const cur = txnDaily();
    for (const d in p.txnDaily) { cur[d] ? replaced++ : added++; up.txnDaily[d] = p.txnDaily[d]; }
    for (const ym in p.feeMonthly) up.feeMonthly[ym] = { ...(up.feeMonthly[ym] || FEE_MONTHLY[ym] || {}), ...p.feeMonthly[ym] };
  } else if (p.type === "menu") {
    // ชื่อเมนูใหม่ → ต่อท้าย index รวม
    const names = menuItems(); const nameIdx = {}; names.forEach((n, i) => (nameIdx[n] = i));
    const cur = menuDaily();
    for (const d in p.menuByDate) {
      cur[d] ? replaced++ : added++;
      up.menuDaily[d] = p.menuByDate[d].map(([name, u, g]) => {
        if (!(name in nameIdx)) { nameIdx[name] = names.length; names.push(name); up.menuItems.push(name); }
        return [nameIdx[name], u, g];
      });
    }
  } else if (p.type === "transfer") {
    const seen = {}; for (const [d, v] of TRANSFERS) seen[d + "|" + v] = 1;
    for (const pid in p.transfers) {
      const [d, v] = p.transfers[pid];
      if (up.transfers[pid] || seen[d + "|" + v]) replaced++; else added++;
      up.transfers[pid] = p.transfers[pid];
    }
  } else if (p.type === "ads") {
    const cur = adsDaily();
    for (const d in p.adsDaily) { cur[d] ? replaced++ : added++; up.adsDaily[d] = p.adsDaily[d]; }
  } else if (p.type === "peak") {
    const cur = peakHours();
    for (const d in p.peakDaily) { cur[d] ? replaced++ : added++; up.peakHours[d] = p.peakDaily[d]; }
  }
  persist();
  return { added, replaced };
}

// ล้างข้อมูลที่อัปเพิ่ม (เหลือ seed จริง)
export function clearUploads() { up = emptyUploads(); persist(); }
export function uploadCounts() {
  return { txn: Object.keys(up.txnDaily).length, menu: Object.keys(up.menuDaily).length, transfer: Object.keys(up.transfers).length, ads: Object.keys(up.adsDaily).length, peak: Object.keys(up.peakHours).length };
}
