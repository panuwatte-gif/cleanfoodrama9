// ============================================================
// data/store.js — ชั้นข้อมูลกลาง (data layer) แบบ async
//
// ครองคอลเลกชันที่ "แก้ได้" (cats / items / menus / assumptions / stock)
// โหลดจาก localStorage ถ้ามี ไม่งั้นใช้ค่าตั้งต้นจาก seed.js
//
// กฎสำคัญ (ตามสถาปัตยกรรม): ฟังก์ชันอ่าน/เขียน "ทุกตัว" คืน Promise
//   await getItems() · await saveItem(it) · ฯลฯ
// แม้ตอนนี้ข้างในแค่อ่าน/เขียน localStorage — เพื่อให้เฟส 4 สลับไป
// Supabase ได้โดยไม่ต้องแก้หน้าจอ (หน้าจอ await อยู่แล้ว)
//
// สำหรับ "สูตร" (formulas.js) ที่ต้องอ่านข้อมูลแบบ sync ระหว่างคำนวณ
// มี getter sync ให้: cats() · items() · menus() · assumptions() · stockRows()
// ทุกครั้งที่เขียน → persist + bumpData() เพื่อให้ทุกหน้า re-render ตาม
// ============================================================

import { load, save } from "../utils/storage.js";
import {
  CATS_SEED, ITEMS_SEED, MENUS_SEED, ASSUMPTIONS_SEED, STOCK_SEED,
  MENU_NUTRI, INGR_NUTRI, USERS_SEED, TASKS_SEED,
} from "./seed.js";
// background cloud sync (Supabase via api gateway). hydrateData is re-exported
// below so the bootstrap has a single import point. scheduleSync() fires on
// every local write so changes mirror up to Supabase (debounced).
import { scheduleSync, hydrateData } from "./backend.js";
export { hydrateData };

const DATA_KEY = "data:v1";

// deep clone (ข้อมูลตื้นพอ — JSON ปลอดภัยสุด)
const clone = (x) => JSON.parse(JSON.stringify(x));

// live db — แก้ตรงนี้แล้ว persist
let db = null;

function fresh() {
  return {
    cats: clone(CATS_SEED),
    items: clone(ITEMS_SEED),
    menus: clone(MENUS_SEED),
    assumptions: clone(ASSUMPTIONS_SEED),
    stock: clone(STOCK_SEED),
    nutriMenu: clone(MENU_NUTRI),
    nutriIngr: clone(INGR_NUTRI),
    users: clone(USERS_SEED),
    tasks: clone(TASKS_SEED),
  };
}

export function initData() {
  if (db) return db;
  const saved = load(DATA_KEY, null);
  db = (saved && saved.items && saved.items.length) ? saved : fresh();
  // migration: ข้อมูลที่บันทึกไว้ก่อนมีโภชนาการ → เติมค่าตั้งต้นให้
  if (!db.nutriMenu) db.nutriMenu = clone(MENU_NUTRI);
  if (!db.nutriIngr) db.nutriIngr = clone(INGR_NUTRI);
  if (!db.users || !db.users.length) db.users = clone(USERS_SEED);
  if (!db.tasks) db.tasks = clone(TASKS_SEED);
  // migration เฟส 6: โครงงาน/ข้อความใหม่ (status submitted · due · notice/note)
  // ถ้ายังเป็นชุด seed เก่า (t-seed*) → แทนด้วยชุดเดโมใหม่ทั้งก้อน
  if (db.tasks.some((t) => /^t-seed/.test(t.id))) db.tasks = clone(TASKS_SEED);
  return db;
}

function saveDb() { save(DATA_KEY, db); }
// every local write persists to localStorage (instant, offline-safe) AND
// schedules a debounced push to the cloud through the api gateway.
function persist() { saveDb(); scheduleSync(); }

// adopt a cloud-pulled collection into the in-memory cache WITHOUT bouncing
// it straight back to the cloud (used by data/backend.js hydrate only).
export function __adoptRemote(coll, value) {
  const d = initData();
  if (value != null) { d[coll] = value; saveDb(); }
}

// persistData() — บันทึก db ปัจจุบันลง localStorage แบบ "เงียบ" (ไม่ bump)
// ใช้ตอนแก้ค่าทีละคีย์ในช่อง input (เช่น ต้นทุน/คงเหลือ ในหน้าข้อมูลกลาง)
// เพื่อไม่ให้ re-render ทั้งแอป → ช่องที่กำลังพิมพ์ไม่เสีย focus/caret
// หน้าที่อ่านค่าใหม่จะเห็นตอน render รอบถัดไปตามธรรมชาติ
export function persistData() { persist(); }

// ---- subscribe / notify (ข้อมูลกลางแก้ → ทุกหน้า link ตาม) ----
let listeners = [];
export function subscribeData(fn) { listeners.push(fn); return () => { listeners = listeners.filter((f) => f !== fn); }; }
export function bumpData() { listeners.slice().forEach((fn) => { try { fn(); } catch (e) { console.error("[data] listener", e); } }); }

// ---- sync getters (ใช้ในสูตร — อ่านสแนปช็อตปัจจุบัน) ----
export function cats() { return initData().cats; }
export function items() { return initData().items; }
export function menus() { return initData().menus; }
export function assumptions() { return initData().assumptions; }
export function stockRows() { return initData().stock; }
export function nutriMenu() { return initData().nutriMenu; }
export function nutriIngr() { return initData().nutriIngr; }
export function users() { return initData().users; }
export function tasksRows() { return initData().tasks; }

// ---- async readers (หน้าจอใช้ตัวนี้ — คืน Promise เสมอ) ----
export async function getCats() { return clone(cats()); }
export async function getItems({ category, activeOnly = false } = {}) {
  let list = items();
  if (category) list = list.filter((i) => i.cat === category);
  if (activeOnly) list = list.filter((i) => i.isActive !== false);
  return clone(list);
}
export async function getItem(id) { return clone(items().find((i) => i.id === id) || null); }
export async function getMenus() { return clone(menus()); }
export async function getAssumptions() { return clone(assumptions()); }
export async function getStock() { return clone(stockRows()); }

// ---- ผู้ใช้ + รหัสผ่าน (login / จัดการสิทธิ์) ----
export function userById(id) { return users().find((u) => u.id === id) || null; }
export function userByPin(pin) { return users().find((u) => String(u.pin) === String(pin)) || null; }
export async function getUsers() { return clone(users()); }
export async function findUserByPin(pin) { return clone(userByPin(pin)); }
export async function saveUser(user) {
  const list = users();
  const i = list.findIndex((x) => x.id === user.id);
  if (i >= 0) list[i] = { ...list[i], ...user };
  else list.push({ ...user });
  persist(); bumpData();
  return clone(user);
}
export async function removeUser(id) {
  const d = initData();
  d.users = users().filter((u) => u.id !== id);
  persist(); bumpData();
  return true;
}

// ---- งานที่มอบหมาย / โน้ต (rama9_tasks) ----
export async function getTasks() { return clone(tasksRows()); }
export async function getTasksFor(assigneeId) { return clone(tasksRows().filter((t) => t.assignee_id === assigneeId)); }
export async function getTasksAssignedBy(assignerId) { return clone(tasksRows().filter((t) => t.assigner_id === assignerId)); }
export function tasksForSync(assignerId, assigneeId) {
  return tasksRows().filter((t) => t.assigner_id === assignerId && t.assignee_id === assigneeId);
}
export async function addTask(task) {
  const d = initData();
  const row = { id: "t-" + Date.now(), kind: "task", status: "open", detail: "", manual_ref: null, done_at: null, created_at: new Date().toISOString(), ...task };
  d.tasks = [...tasksRows(), row];
  persist(); bumpData();
  return clone(row);
}
export async function setTaskStatus(id, status) {
  const t = tasksRows().find((x) => x.id === id);
  if (t) { t.status = status; t.done_at = status === "done" ? new Date().toISOString() : null; persist(); bumpData(); }
  return clone(t || null);
}
// พนักงานกด "ทำเสร็จแล้ว" → รอตรวจ (submitted)
export async function submitTask(id) {
  const t = tasksRows().find((x) => x.id === id);
  if (t) { t.status = "submitted"; t.bounced = false; t.done_at = new Date().toISOString(); persist(); bumpData(); }
  return clone(t || null);
}
// ผู้สั่งกด "อนุมัติ" → done
export async function approveTask(id) {
  const t = tasksRows().find((x) => x.id === id);
  if (t) { t.status = "done"; t.bounced = false; t.done_at = new Date().toISOString(); persist(); bumpData(); }
  return clone(t || null);
}
// ผู้สั่งกด "ตีกลับ" → open + ติดธง bounced (ให้พนักงานเห็นว่าถูกตีกลับ)
export async function reopenTask(id) {
  const t = tasksRows().find((x) => x.id === id);
  if (t) { t.status = "open"; t.bounced = true; t.done_at = null; persist(); bumpData(); }
  return clone(t || null);
}
// ผู้รับกด "รับทราบ" ประกาศ/ข้อความ
export async function ackTask(id) {
  const t = tasksRows().find((x) => x.id === id);
  if (t) { t.acked = true; persist(); bumpData(); }
  return clone(t || null);
}
export async function saveTask(task) {
  const list = tasksRows();
  const i = list.findIndex((x) => x.id === task.id);
  if (i >= 0) list[i] = { ...list[i], ...task };
  persist(); bumpData();
  return clone(task);
}
export async function removeTask(id) {
  const d = initData();
  d.tasks = tasksRows().filter((t) => t.id !== id);
  persist(); bumpData();
  return true;
}

// ---- async writers (persist + bump) ----
export async function saveItem(item) {
  const list = items();
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = { ...list[i], ...item };
  else list.push({ ...item });
  persist(); bumpData();
  return clone(item);
}
export async function removeItem(id) {
  // soft-delete: คงแถวไว้ ตั้ง isActive=false (กันของที่อ้างถึงพัง)
  const it = items().find((x) => x.id === id);
  if (it) { it.isActive = false; persist(); bumpData(); }
  return true;
}
export async function saveAssumption(id, value) {
  const a = assumptions().find((x) => x.id === id);
  if (a) { a.v = value; persist(); bumpData(); }
  return clone(a);
}
export async function setStockQty(id, qty) {
  const s = stockRows().find((x) => x.id === id);
  if (s) { s.qty = qty; persist(); bumpData(); }
  return clone(s || null);
}

// ---- โภชนาการ (เพิ่ม/แก้/ลบ ต่อเมนู และต่อวัตถุดิบ) ----
export async function saveNutri(mode, id, data) {
  const map = mode === "menu" ? nutriMenu() : nutriIngr();
  map[id] = { ...(map[id] || {}), ...data };
  persist(); bumpData();
  return clone(map[id]);
}
export async function removeNutri(mode, id) {
  const map = mode === "menu" ? nutriMenu() : nutriIngr();
  delete map[id];
  persist(); bumpData();
  return true;
}

// ---- reset (เผื่อเมนู "ล้างข้อมูลเดโม") ----
export async function resetData() { db = fresh(); persist(); bumpData(); return true; }

// อ่านค่า assumption เป็นตัวเลข (helper ใช้ในสูตร)
export function assume(id, fallback = 0) {
  const a = assumptions().find((x) => x.id === id);
  const n = a ? parseFloat(a.v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
