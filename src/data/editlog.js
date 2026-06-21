// ============================================================
// data/editlog.js — audit trail จริง (logEdit) เก็บ localStorage
//
// เฟส 2 ต้องการ "logEdit() จริงลง store + หน้าประวัติ/audit แสดงของจริง"
// ทุกการแก้ข้อมูลกลาง/assumption/ธีม เรียก logEdit() → เก็บถาวร (ลบไม่ได้)
// หน้า history อ่านผ่าน getEditLogs() (ใหม่สุดอยู่บน)
//
// แยกจาก data/store.js เพื่อเลี่ยง import วน (store ไม่ import ไฟล์นี้)
// seed ครั้งแรกด้วย AUDIT เดิม เพื่อหน้า history ไม่ว่างตั้งแต่เริ่ม
// ============================================================

import { load, save } from "../utils/storage.js";
import { AUDIT } from "./seed.js";

const LK = "editlog:v1";
const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function stamp(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return d.getDate() + " " + MONTHS_TH[d.getMonth()] + " " + hh + ":" + mm;
}

let log = null;
function init() {
  if (log) return log;
  const saved = load(LK, null);
  log = (saved && Array.isArray(saved)) ? saved
    : AUDIT.map((a, i) => ({ id: "seed-" + i, txt: a.txt, by: a.by, t: a.t, kind: a.kind }));
  return log;
}

// getEditLogs() → array (ใหม่สุดบน) — สำเนา กันแก้ภายนอก
export function getEditLogs() { return init().slice(); }

// logEdit({ txt, kind, by }) — by = ชื่อผู้แก้ (เช่น "เจ้าของ" / "พนักงาน")
// kind: 'edit' | 'add' | 'del'  (ใช้เลือกไอคอน/สีในหน้า history)
export function logEdit({ txt, kind = "edit", by = "เจ้าของ" } = {}) {
  if (!txt) return;
  const l = init();
  l.unshift({ id: "el-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6), txt, by: "รหัส: " + by, t: stamp(), kind });
  save(LK, l);
  return l[0];
}
