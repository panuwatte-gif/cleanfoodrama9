// ============================================================
// forecast/regimeConfig.js — ตั้งค่า event + โหมด + ตารางสาขาเบิกของ
//   เก็บใน localStorage (ออฟไลน์ได้) · เจ้าของแก้ได้หมดในหน้าตั้งค่า · ไม่ hardcode
//
//   event มี seed รายวัตถุดิบ (ไม่ใช่ค่า global ค่าเดียว) + demand_cycle (wallet รีเซ็ตรายเดือน)
// ============================================================

import { load, save } from "../utils/storage.js";

const EV_KEY = "forecast:events:v2";
const SET_KEY = "forecast:settings:v2";
const TR_KEY = "forecast:transfers:v1";

// event ตั้งต้น: ไทยช่วยไทย 2026 (แก้ไขได้ทุกค่า)
const EVENTS_SEED = [{
  id: "evt-thaichuaythai",
  event_name: "ไทยช่วยไทย 2026",
  start_date: "2026-06-15",
  end_date: "2026-09-14",
  status: "active",                  // scheduled / active / ended / disabled
  min_factor: 1.0,
  max_factor: 4.5,                   // ดันขึ้นจาก 3.2 ไม่งั้นไข่/เนื้อโดนตัดยอด
  safety_stock_percent: 30,
  cooldown_days_after_event: 28,
  ramp_min_days: 4,                  // มีข้อมูล event ≥ 4 วัน → Stable
  // seed factor รายวัตถุดิบ (จับคู่ด้วยคีย์เวิร์ดในชื่อ) — ใช้ 2-3 วันแรกที่ข้อมูลยังน้อย
  seed_factor_by_ingredient: { "แซลม่อน": 2.5, "แซลมอน": 2.5, "เนื้อ": 3.1, "อกไก่": 2.9, "ไข่": 4.1, "กุ้ง": 1.3, "default": 2.0 },
  demand_cycle: "monthly_reset",     // "" = ไม่มี cycle · "monthly_reset" = wallet รีเซ็ตต้นเดือน
  cycle_reset_day: 1,
  cycle_peak_window_days: 7,         // ~7 วันแรกของเดือน = ช่วง peak
  notes: "โครงการ 3 เดือน · ยอดเป็นฟันเลื่อยรายเดือน (พุ่งต้นเดือน-พักปลายเดือน)",
}];

const SETTINGS_SEED = {
  active_mode: "auto",               // auto / manual_override
  manual_override_mode: null,        // normal / event_ramp / event_stable / post_event / new_store
  manual_override_until: null,
  manual_override_reason: null,
  is_new_store: false,               // ร้านเพิ่งเปิด — ใช้ New Store Reactive
  new_store_until: null,             // จบช่วงร้านใหม่อัตโนมัติ (ISO) — ว่าง = จนกว่าจะปิดเอง
  restock_interval_days: 7,          // รับของทุกกี่วัน (ใช้คำนวณ "ใช้ถึงรอบรับของถัดไป")
  new_store_min_days: 18,            // มีข้อมูลครบ ~2-3 สัปดาห์ → graduate เข้า Normal
  display_days_cover_cap: 30,
};

export function getEvents() { const e = load(EV_KEY, null); return (e && e.length) ? e : EVENTS_SEED.map((x) => ({ ...x })); }
export function saveEvents(list) { save(EV_KEY, list); }
export function saveEvent(ev) {
  const list = getEvents(); const i = list.findIndex((x) => x.id === ev.id);
  if (i >= 0) list[i] = { ...list[i], ...ev }; else list.push({ ...ev });
  saveEvents(list); return list;
}
export function removeEvent(id) { saveEvents(getEvents().filter((x) => x.id !== id)); }
export function activeEvents() { return getEvents().filter((e) => e.status !== "disabled").sort((a, b) => (a.start_date < b.start_date ? -1 : 1)); }

export function getSettings() { return { ...SETTINGS_SEED, ...(load(SET_KEY, {}) || {}) }; }
export function saveSettings(patch) { const next = { ...getSettings(), ...patch }; save(SET_KEY, next); return next; }

// seed factor ของวัตถุดิบหนึ่งใน event (จับคู่คีย์เวิร์ดในชื่อ → ไม่งั้น default)
export function seedFactorFor(itemName, ev) {
  const map = (ev && ev.seed_factor_by_ingredient) || {};
  const nm = (itemName || "");
  for (const key of Object.keys(map)) { if (key !== "default" && nm.includes(key)) return map[key]; }
  return map.default != null ? map.default : 2.0;
}

// ---- ตารางสาขาเบิกของ (scheduled branch transfer) ----
// แถว: { id, item, dow (0-6), qty, active }
export function getTransfers() { return load(TR_KEY, []) || []; }
export function saveTransfer(t) {
  const list = getTransfers(); const i = list.findIndex((x) => x.id === t.id);
  if (i >= 0) list[i] = { ...list[i], ...t }; else list.push({ ...t });
  save(TR_KEY, list); return list;
}
export function removeTransfer(id) { save(TR_KEY, getTransfers().filter((x) => x.id !== id)); }
