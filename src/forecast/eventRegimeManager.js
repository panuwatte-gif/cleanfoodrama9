// ============================================================
// forecast/eventRegimeManager.js — เลือกโหมดพยากรณ์ของ "วันนี้"
//   ลำดับ: manual override → new store reactive → event active →
//          post-event cooldown → normal
//   (ramp vs stable ของ event ตัดสินรายวัตถุดิบใน forecastEngine ตามจำนวนวันข้อมูล)
// ============================================================

import { activeEvents, getSettings } from "./regimeConfig.js";
import { todayISO, daysBetweenISO } from "../utils/usage.js";

export const MODE_LABEL = {
  normal: "ปกติ (Normal)",
  event: "ช่วง Event",
  event_ramp: "Event เริ่มต้น (Ramp)",
  event_stable: "Event คงที่ (Stable)",
  post_event: "หลัง Event (ฟื้นตัว)",
  new_store: "ร้านใหม่ (Reactive)",
  manual_override: "บังคับเอง (Manual)",
};

const within = (iso, start, end) => iso >= start && (!end || iso <= end);

export function eventOn(iso = todayISO()) {
  return activeEvents().find((e) => e.status !== "disabled" && within(iso, e.start_date, e.end_date)) || null;
}
export function recentEndedEvent(iso = todayISO()) {
  return activeEvents().find((e) => e.end_date && e.end_date < iso && daysBetweenISO(e.end_date, iso) <= (e.cooldown_days_after_event || 28)) || null;
}

// โหมดหลัก — คืน { mode, reason, event, endedEvent }
export function getActiveForecastMode(iso = todayISO()) {
  const s = getSettings();

  // 1) manual override (ยังไม่หมดอายุ)
  if (s.active_mode === "manual_override" && s.manual_override_mode &&
      (!s.manual_override_until || s.manual_override_until >= iso)) {
    return { mode: s.manual_override_mode, reason: "เจ้าของบังคับโหมดเอง" + (s.manual_override_until ? " (ถึง " + s.manual_override_until + ")" : "") + (s.manual_override_reason ? " · " + s.manual_override_reason : ""), manual: true, event: eventOn(iso) };
  }

  // 2) new store reactive
  if (s.is_new_store && (!s.new_store_until || s.new_store_until >= iso)) {
    return { mode: "new_store", reason: "ร้านเพิ่งเปิด — ใช้ยอดวันใกล้สุด + ค่าเผื่อหนา (Grab อาจดันร้านใหม่)", event: eventOn(iso) };
  }

  // 3) event active
  const ev = eventOn(iso);
  if (ev) return { mode: "event", reason: "อยู่ในช่วง " + ev.event_name + " (" + ev.start_date + " → " + (ev.end_date || "ไม่กำหนด") + ")", event: ev };

  // 4) post-event cooldown
  const ended = recentEndedEvent(iso);
  if (ended) {
    const wk = Math.floor(daysBetweenISO(ended.end_date, iso) / 7) + 1;
    return { mode: "post_event", reason: ended.event_name + " จบแล้ว · กำลังฟื้นตัว (สัปดาห์ที่ " + wk + ")", endedEvent: ended, event: null };
  }

  // 5) normal
  return { mode: "normal", reason: "ช่วงปกติ — ไม่มี event และไม่อยู่ในช่วงฟื้นตัว", event: null };
}

// ติดป้าย regime ของวันย้อนหลัง: event / post_event / normal (ใช้แยกข้อมูลในสูตร)
export function regimeTagForDate(iso) {
  for (const e of activeEvents()) if (within(iso, e.start_date, e.end_date)) return "event";
  for (const e of activeEvents()) if (e.end_date && iso > e.end_date && daysBetweenISO(e.end_date, iso) <= (e.cooldown_days_after_event || 28)) return "post_event";
  return "normal";
}

export function lastEventStart(iso = todayISO()) {
  const past = activeEvents().filter((e) => e.start_date <= iso).sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
  return past.length ? past[0].start_date : null;
}
