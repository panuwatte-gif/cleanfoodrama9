// ============================================================
// forecast/eventRegimeManager.js — ตัดสินว่า "วันนี้" ใช้โหมดพยากรณ์ไหน
//   ลำดับ: manual override (ยังไม่หมดอายุ) → event active → post-event cooldown → normal
//   + regimeTagForDate(): ติดป้ายข้อมูลย้อนหลังว่าเป็น normal / event / post_event
//     (ใช้แยกข้อมูลในสูตร — ห้ามเอา normal ก่อน event มาปนกับ event)
// ============================================================

import { activeEvents, getSettings } from "./regimeConfig.js";
import { todayISO } from "../utils/forecast.js";

export const MODE_LABEL = {
  normal: "ปกติ (Normal)",
  event_ramp: "ช่วง Event เริ่มต้น (Event Ramp)",
  event_stable: "ช่วง Event คงที่ (Event Stable)",
  post_event: "หลัง Event (ฟื้นตัว)",
  manual_override: "บังคับเอง (Manual)",
};

const DAY = 86400000;
const toD = (iso) => new Date(iso + "T00:00:00");
const daysBetween = (a, b) => Math.round((toD(b) - toD(a)) / DAY);
const within = (iso, start, end) => iso >= start && (!end || iso <= end);

// event ที่ active ในวันที่กำหนด
export function eventOn(iso = todayISO()) {
  return activeEvents().find((e) => within(iso, e.start_date, e.end_date) && e.status !== "disabled") || null;
}

// event ที่เพิ่งจบและยังอยู่ใน cooldown
export function recentEndedEvent(iso = todayISO()) {
  return activeEvents().find((e) => e.end_date && e.end_date < iso && daysBetween(e.end_date, iso) <= (e.cooldown_days_after_event || 28)) || null;
}

// นับจำนวนข้อมูล same-weekday ที่อยู่ "ภายใน event" (regime=event) สำหรับ dow เป้าหมาย
//   points = ชุดข้อมูลรายวัน [{date, dow}] (จาก inferDailySales) ที่ติดป้าย regime แล้ว
export function sameWeekdayEventCount(points, dow, ev) {
  if (!ev) return 0;
  return points.filter((p) => p.dow === dow && p.regime === "event").length;
}

// โหมดหลัก (ตาม pseudo ใน spec) — คืน { mode, reason, event, manual }
export function getActiveForecastMode(iso = todayISO(), { pointsForDow = null, dow = null } = {}) {
  const s = getSettings();

  // 1) manual override (ยังไม่หมดอายุ)
  if (s.active_mode === "manual_override" && s.manual_override_mode &&
      (!s.manual_override_until || s.manual_override_until >= iso)) {
    return {
      mode: s.manual_override_mode,
      reason: "เจ้าของบังคับโหมดเอง" + (s.manual_override_until ? " (ถึง " + s.manual_override_until + ")" : "") + (s.manual_override_reason ? " · " + s.manual_override_reason : ""),
      manual: true, event: eventOn(iso),
    };
  }

  // 2) event active
  const ev = eventOn(iso);
  if (ev) {
    // กลยุทธ์บังคับระดับ event
    if (ev.model_strategy === "force_event_stable") return { mode: "event_stable", reason: ev.event_name + " (บังคับ stable)", event: ev };
    if (ev.model_strategy === "force_event_ramp") return { mode: "event_ramp", reason: ev.event_name + " (บังคับ ramp)", event: ev };
    if (ev.model_strategy === "force_normal") return { mode: "normal", reason: ev.event_name + " (บังคับ normal)", event: ev };
    if (ev.model_strategy === "force_post_event") return { mode: "post_event", reason: ev.event_name + " (บังคับ post-event)", event: ev };

    // auto: ramp จนกว่าจะมี same-weekday ใน event ครบเกณฑ์
    const need = s.min_event_same_weekday_observations || 3;
    const have = (pointsForDow && dow != null) ? sameWeekdayEventCount(pointsForDow, dow, ev) : 0;
    if (have < need) {
      return { mode: "event_ramp", reason: "อยู่ในช่วง " + ev.event_name + " · ข้อมูลวันเดียวกันใน event ยังไม่ครบ " + need + " ครั้ง (มี " + have + ")", event: ev };
    }
    return { mode: "event_stable", reason: "อยู่ในช่วง " + ev.event_name + " · มีข้อมูลวันเดียวกันใน event ≥ " + need + " ครั้ง", event: ev };
  }

  // 3) post-event cooldown
  const ended = recentEndedEvent(iso);
  if (ended) {
    const wk = Math.floor(daysBetween(ended.end_date, iso) / 7) + 1;
    return { mode: "post_event", reason: ended.event_name + " จบแล้ว · กำลังฟื้นตัว (สัปดาห์ที่ " + wk + " หลังจบ)", event: null, endedEvent: ended };
  }

  // 4) normal
  return { mode: "normal", reason: "ช่วงปกติ — ไม่มี event และไม่อยู่ในช่วงฟื้นตัว", event: null };
}

// ติดป้าย regime ของ "วันที่ย้อนหลัง" เทียบ event ทั้งหมด
//   ภายในช่วง event = event · หลัง event ถึง cooldown = post_event · อื่น ๆ = normal
export function regimeTagForDate(iso) {
  for (const e of activeEvents()) {
    if (within(iso, e.start_date, e.end_date)) return "event";
  }
  for (const e of activeEvents()) {
    if (e.end_date && iso > e.end_date && daysBetween(e.end_date, iso) <= (e.cooldown_days_after_event || 28)) return "post_event";
  }
  return "normal";
}

// แยก baseline ก่อน event ล่าสุด (ใช้ใน post-event) — คืน start_date ของ event ที่ใกล้สุด
export function lastEventStart(iso = todayISO()) {
  const past = activeEvents().filter((e) => e.start_date <= iso).sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
  return past.length ? past[0].start_date : null;
}
