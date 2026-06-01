/* ============================================================
   storage.js — บันทึก/โหลด state จาก localStorage
   ฟังก์ชันถัดไป (Supabase) จะมาแทน layer นี้ได้เลย
   ============================================================ */
import { state, initialState } from './state.js';

const KEY = 'rama9_state_v1';

// โหลด state จาก localStorage (ถ้ามี) — merge แบบตื้นเพื่อกัน schema เพี้ยน
export function hydrate() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    // เก็บ config + db + session ที่บันทึกไว้ ทับลงบนโครงเริ่มต้น
    if (saved.config)  state.config  = { ...initialState.config, ...saved.config };
    if (saved.db)      state.db      = { ...initialState.db, ...saved.db };
    if (saved.session) state.session = { ...initialState.session, ...saved.session };
    if (saved.ui)      state.ui      = { ...initialState.ui, ...saved.ui };
  } catch (e) {
    console.warn('hydrate failed, ใช้ค่าเริ่มต้น', e);
  }
}

// บันทึก state ทั้งก้อนลง localStorage
export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      config: state.config,
      db: state.db,
      session: state.session,
      ui: state.ui,
    }));
  } catch (e) {
    console.warn('persist failed', e);
  }
}

// รีเซ็ตข้อมูลทั้งหมดกลับค่าเริ่มต้น (สำหรับทดสอบ)
export function resetAll() {
  localStorage.removeItem(KEY);
  location.reload();
}
