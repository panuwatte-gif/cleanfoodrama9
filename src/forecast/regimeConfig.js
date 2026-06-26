// ============================================================
// forecast/regimeConfig.js — ตั้งค่า event + โหมดพยากรณ์ (regime switching)
//   เก็บใน localStorage (ใช้งานออฟไลน์ได้) · ตาราง Supabase rama9_forecast_*
//   สร้างเผื่ออนาคตแล้ว (ค่อยผูก sync ทีหลัง) · เจ้าของแก้ได้หมดในหน้าตั้งค่า
//
//   event ตั้งต้น = "ไทยช่วยไทย" 2026-06-15 → 2026-09-14 (แก้วัน/ค่าได้)
// ============================================================

import { load, save } from "../utils/storage.js";

const EV_KEY = "forecast:events";
const SET_KEY = "forecast:settings";

// event ตั้งต้น — แก้ไขได้ในหน้าตั้งค่า (ไม่ hardcode แบบแก้ไม่ได้)
const EVENTS_SEED = [{
  id: "evt-thaichuaythai",
  event_name: "ไทยช่วยไทย",
  start_date: "2026-06-15",
  end_date: "2026-09-14",
  status: "active",                 // scheduled / active / ended / disabled
  model_strategy: "auto",           // auto / force_normal / force_event_ramp / force_event_stable / force_post_event
  seed_factor_default: 2.0,
  min_factor: 1.0,
  max_factor: 3.2,
  safety_stock_percent: 30,
  cooldown_days_after_event: 28,
  notes: "โครงการระยะสั้น 3 เดือน — ยอดเปลี่ยน regime ห้ามเฉลี่ยข้ามช่วง",
}];

const SETTINGS_SEED = {
  active_mode: "auto",              // auto / normal / event_ramp / event_stable / post_event / manual_override
  manual_override_mode: null,
  manual_override_until: null,      // ISO date
  manual_override_reason: null,
  min_event_same_weekday_observations: 3,
  recent_short_days: 3,
  recent_medium_days: 7,
  recent_long_days: 14,
  cap_recent_factor_min: 0.70,
  cap_recent_factor_max: 1.30,
  default_startup_safety_percent: 30,
  display_days_cover_cap: 30,
};

export function getEvents() {
  const e = load(EV_KEY, null);
  return (e && e.length) ? e : EVENTS_SEED.map((x) => ({ ...x }));
}
export function saveEvents(list) { save(EV_KEY, list); }
export function saveEvent(ev) {
  const list = getEvents();
  const i = list.findIndex((x) => x.id === ev.id);
  if (i >= 0) list[i] = { ...list[i], ...ev };
  else list.push({ ...ev });
  saveEvents(list);
  return list;
}
export function removeEvent(id) { saveEvents(getEvents().filter((x) => x.id !== id)); }

export function getSettings() { return { ...SETTINGS_SEED, ...(load(SET_KEY, {}) || {}) }; }
export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  save(SET_KEY, next);
  return next;
}

// event ที่ "เปิดใช้" (ไม่ disabled) — เรียงตามวันเริ่ม
export function activeEvents() {
  return getEvents().filter((e) => e.status !== "disabled").sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
}
