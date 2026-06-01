/* ============================================================
   auth.js — ระบบล็อกอิน + สิทธิ์ตามตำแหน่ง (RBAC)
   ------------------------------------------------------------
   ฟังก์ชัน 1 จะมาเสียบ logic จริง (เปลี่ยนรหัส, block, CRUD user)
   ตอนนี้รองรับ login + การกรองเมนู/สิทธิ์ตามตำแหน่งครบแล้ว
   ============================================================ */
import { state, notify, ROLES } from './state.js';
import { persist } from './storage.js';

export { ROLES };

// คืน user ปัจจุบัน
export function currentUser() {
  return state.db.users.find((u) => u.id === state.session.currentUserId) || null;
}

// ล็อกอินด้วยชื่อ + PIN
export function login(userId, pin) {
  const u = state.db.users.find((x) => x.id === userId);
  if (!u) return { ok: false, error: 'ไม่พบผู้ใช้' };
  if (u.blocked) return { ok: false, error: 'บัญชีนี้ถูกระงับการใช้งาน' };
  if (String(u.pin) !== String(pin)) return { ok: false, error: 'รหัสผ่านไม่ถูกต้อง' };
  state.session.currentUserId = u.id;
  persist();
  return { ok: true, user: u };
}

export function logout() {
  state.session.currentUserId = null;
  persist();
  notify();
}

/* ------------------------------------------------------------
   PERMISSIONS — กำหนดว่าตำแหน่งไหนเห็น/ทำอะไรได้
   level: owner=3, supervisor=2, employee=1
   ใช้ minLevel เป็นเกณฑ์เข้าถึงหน้า
   ------------------------------------------------------------ */
export const PAGES = [
  // ทั่วไป
  { id: 'dashboard',  group: 'ทั่วไป',     label: 'หน้าแรก',            icon: 'dashboard', minLevel: 1 },
  { id: 'mytasks',    group: 'ทั่วไป',     label: 'งานของฉัน & โน้ต',    icon: 'clipboard', minLevel: 1 },
  { id: 'handbook',   group: 'ทั่วไป',     label: 'คู่มือพนักงาน',       icon: 'book2',     minLevel: 1 },
  { id: 'music',      group: 'ทั่วไป',     label: 'เพลงร้าน',            icon: 'music',     minLevel: 1 },
  // ปฏิบัติการ
  { id: 'stock',      group: 'ปฏิบัติการ', label: 'นับสต็อก & พยากรณ์',  icon: 'boxes',     minLevel: 1, fn: 2 },
  { id: 'receiving',  group: 'ปฏิบัติการ', label: 'รับของ (FIFO)',       icon: 'truck',     minLevel: 1 },
  { id: 'capture',    group: 'ปฏิบัติการ', label: 'ถ่ายภาพออเดอร์',      icon: 'camera',    minLevel: 1, fn: 5 },
  { id: 'revenue',    group: 'ปฏิบัติการ', label: 'บันทึกรายได้',        icon: 'wallet',    minLevel: 1, fn: 4 },
  { id: 'attendance', group: 'ปฏิบัติการ', label: 'วันลา & คะแนน',       icon: 'calendar',  minLevel: 1, fn: 6 },
  // เครื่องมือ
  { id: 'recipe',     group: 'เครื่องมือ', label: 'สูตรอาหารอัจฉริยะ',   icon: 'flask',     minLevel: 1, fn: 7 },
  { id: 'simulator',  group: 'เครื่องมือ', label: 'จำลองเมนู & แคมเปญ',  icon: 'calculator',minLevel: 3, fn: 8 },
  // จัดการ
  { id: 'users',      group: 'จัดการ',     label: 'ผู้ใช้ & สิทธิ์',     icon: 'users',     minLevel: 2, fn: 1 },
  { id: 'control',    group: 'จัดการ',     label: 'ควบคุมระบบ & ต้นทุน', icon: 'sliders',   minLevel: 3, fn: 9, ownerOnly: 'champ' },
];

// level ของตำแหน่ง
export function levelOf(role) {
  return { owner: 3, supervisor: 2, employee: 1 }[role] || 0;
}

// เข้าหน้านี้ได้ไหม?
export function canAccess(pageId) {
  const u = currentUser();
  if (!u) return false;
  const page = PAGES.find((p) => p.id === pageId);
  if (!page) return false;
  if (levelOf(u.role) < page.minLevel) return false;
  // หน้าควบคุมระบบ: เฉพาะ Champ (super owner) เท่านั้น
  if (page.ownerOnly === 'champ' && !u.isSuperOwner) return false;
  return true;
}

// เมนูที่ผู้ใช้ปัจจุบันเห็น
export function visiblePages() {
  return PAGES.filter((p) => canAccess(p.id));
}

/* ความสามารถเฉพาะ (ใช้ซ่อน/แสดงปุ่มภายในหน้า) ----------------- */
export const can = {
  // ดูข้อมูลการเงิน/กำไร/ภาษี (เจ้าของเท่านั้น)
  viewFinance: () => levelOf((currentUser() || {}).role) >= 3,
  // แก้ config/สูตร/logic ยาก ๆ (Champ เท่านั้น)
  editSystemConfig: () => !!(currentUser() || {}).isSuperOwner,
  // จัดการผู้ใช้ (หัวหน้าขึ้นไป)
  manageUsers: () => levelOf((currentUser() || {}).role) >= 2,
  // ประกาศข้อความวิ่ง (หัวหน้าขึ้นไป)
  postAnnouncement: () => levelOf((currentUser() || {}).role) >= 2,
  // มอบหมายงานให้พนักงาน (หัวหน้าขึ้นไป)
  assignTask: () => levelOf((currentUser() || {}).role) >= 2,
};
