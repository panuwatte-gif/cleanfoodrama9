// ============================================================
// utils/dateutil.js — ตัวช่วยวันที่แบบ ISO (YYYY-MM-DD) สำหรับปฏิทินข้ามเดือน
//   ใช้ในหน้า รายรับ-จ่าย / บันทึกรายได้ / บันทึกค่าใช้จ่าย — แก้ข้อมูลย้อนหลังได้ทุกเดือน
//   • record key = วันที่เต็ม (เช่น inc-2026-06-01-Grab) → ไม่ชนกันข้ามเดือน
//   • เรคคอร์ดเก่าที่ไม่มี field `date` → อนุมานจากเดือนปัจจุบัน + field `day` (legacy)
// ============================================================

import { TODAY_YMD, MON_ABBR } from "../data/seed.js";

export const pad2 = (n) => String(n).padStart(2, "0");
export const toIso = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
export const todayIso = () => toIso(TODAY_YMD.y, TODAY_YMD.m, TODAY_YMD.d);
export const parseIso = (iso) => { const [y, m, d] = (iso || todayIso()).split("-").map(Number); return { y, m, d }; };

// วันที่ของเรคคอร์ด: ใช้ field `date` ถ้ามี · ไม่มี = อนุมานจากเดือนปัจจุบัน + `day` (ของเก่า)
export const recDate = (r) => (r && r.date) ? r.date : toIso(TODAY_YMD.y, TODAY_YMD.m, (r && r.day) || 1);

export const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
export const firstDow = (y, m) => new Date(y, m - 1, 1).getDay(); // 0=อาทิตย์

export const isFutureIso = (iso) => iso > todayIso();
export const addDaysIso = (iso, delta) => {
  const { y, m, d } = parseIso(iso);
  const dt = new Date(y, m - 1, d + delta);
  return toIso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};

// ป้ายไทย
export const monthLabel = (y, m) => MON_ABBR[m - 1] + " " + (y + 543);           // "มิ.ย. 2569"
export const thaiShort = (iso) => { const { m, d } = parseIso(iso); return d + " " + MON_ABBR[m - 1]; }; // "1 มิ.ย."
export const thaiLong = (iso) => { const { y, m, d } = parseIso(iso); return d + " " + MON_ABBR[m - 1] + " " + (y + 543); }; // "1 มิ.ย. 2569"
