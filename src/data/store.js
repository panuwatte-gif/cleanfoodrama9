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
  CATS_SEED, ITEMS_SEED, MENUS_SEED, ASSUMPTIONS_SEED, ASSUMP_META, STOCK_SEED,
  MENU_NUTRI, INGR_NUTRI, USERS_SEED, TASKS_SEED, RECIPES, MANUAL, TODAY, PAYROLL, SONGS, SALES_SEED, PRICE_SEED,
} from "./seed.js";
import { logEdit } from "./editlog.js";
// stockOf อ่านแถวสต๊อกสด (live) เพื่อ seed แถวใหม่ของรายการที่ยังไม่มี
// import วน store↔formulas ปลอดภัย: เรียกเฉพาะตอน runtime (ในฟังก์ชัน) ไม่ใช่ตอน eval
import { stockOf } from "../utils/formulas.js";
// background cloud sync (Supabase via api gateway). hydrateData is re-exported
// below so the bootstrap has a single import point. scheduleSync() fires on
// every local write so changes mirror up to Supabase (debounced).
import { scheduleSync, hydrateData } from "./backend.js";
export { hydrateData };

const DATA_KEY = "data:v1";

// deep clone (ข้อมูลตื้นพอ — JSON ปลอดภัยสุด)
const clone = (x) => JSON.parse(JSON.stringify(x));

// migration เมนู: แยก "ข้าว" ออกจากชื่อ (ตัด "+ ข้าว" ท้ายชื่อ) + ตั้ง rice/riceItem
// idempotent — รันซ้ำได้ (rice เคยตั้งแล้วจะคงไว้) · ใช้กับทั้ง local + cloud
function migMenu(m) {
  if (!m) return m;
  const hadRice = /\+\s*ข้าว/.test(m.name || "");
  const name = (m.name || "").replace(/\s*\+\s*ข้าว\s*$/, "").trim();
  return {
    ...m, name,
    rice: (m.rice != null) ? m.rice : hadRice,
    riceItem: m.riceItem || ((m.rice != null ? m.rice : hadRice) ? "rice-iraya" : null),
  };
}

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
    tasks: [],
    recipes: clone(RECIPES),
    manual: clone(MANUAL),
    payroll: clone(PAYROLL),
    songs: clone(SONGS),
    priceList: clone(PRICE_SEED),
    counts: [],
    salesDaily: clone(SALES_SEED),
    income: [],
    expense: [],
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
  if (!db.tasks) db.tasks = [];
  if (!db.recipes || !db.recipes.length) db.recipes = clone(RECIPES);
  if (!db.manual || !db.manual.length) db.manual = clone(MANUAL);
  if (!db.payroll || !db.payroll.length) db.payroll = clone(PAYROLL);
  if (!db.songs) db.songs = clone(SONGS);
  // กวาดเพลงเดโม (ไม่มีไฟล์เสียงจริง = ไม่มี url และไม่ใช่ไฟล์ในเครื่อง) ออก — เล่นไม่ได้อยู่แล้ว
  db.songs = (db.songs || []).filter((s) => s && (s.url || s.local));
  if (!db.priceList) db.priceList = [];
  // เมนู·ราคาขายตั้งต้น — ยังว่าง→ใส่ชุดเมนูจริง (cloud จะทับได้ถ้ามี)
  if (!db.priceList.length) db.priceList = clone(PRICE_SEED);
  if (!db.counts) db.counts = [];
  // ยอดขายรายวัน (ledger พยากรณ์) — ถ้ายังว่าง เติมจากชีตพนักงาน (มิ.ย. 2026)
  if (!db.salesDaily || !db.salesDaily.length) db.salesDaily = clone(SALES_SEED);
  if (!db.income) db.income = [];
  if (!db.expense) db.expense = [];
  // migration: แยกข้าวออกจากชื่อเมนู + ตั้ง rice/riceItem (idempotent)
  db.menus = (db.menus || []).map(migMenu);
  // migration: กัน "กุ้ง" (และหมวดย่อย/เมนู seed) หายจากข้อมูลเก่าที่บันทึกไว้ก่อนมีกุ้ง
  //   self-heal แบบ idempotent — เติมเฉพาะที่ "ไม่มี id อยู่เลย" (ของที่ผู้ใช้ตั้งใจลบ = soft-delete ยังมี id → ไม่เด้งกลับ)
  {
    const pSeed = CATS_SEED.find((c) => c.id === "protein");
    const p = (db.cats || []).find((c) => c.id === "protein");
    if (p && pSeed && pSeed.subs) { p.subs = p.subs || []; pSeed.subs.forEach((sub) => { if (!p.subs.some((s) => s.id === sub.id)) p.subs.push(clone(sub)); }); }
    ITEMS_SEED.filter((i) => i.sub === "shrimp").forEach((seed) => { if (!(db.items || []).some((i) => i.id === seed.id)) db.items.push(clone(seed)); });
    MENUS_SEED.filter((m) => /shrimp/.test(m.item || "")).forEach((seed) => { if (!(db.menus || []).some((m) => m.id === seed.id)) db.menus.push(clone(seed)); });
    save(DATA_KEY, db);
  }
  // migration เฟส 6: โครงงาน/ข้อความใหม่ (status submitted · due · notice/note)
  // ถ้ายังเป็นชุด seed เก่า (t-seed*) → แทนด้วยชุดเดโมใหม่ทั้งก้อน
  // migration: ลบงานเดโมเก่า (t-s0X / t-seed) — เริ่มจากว่างจริง
  if (db.tasks.some((t) => /^t-s/.test(t.id))) db.tasks = db.tasks.filter((t) => !/^t-s/.test(t.id));
  // migration (ครั้งเดียว): ลบข้อมูล "เดโม" ที่เคยฝังไว้ — พนักงานตัวอย่าง (payroll pr-1..4)
  // + โภชนาการตัวอย่าง — เพื่อเริ่มบันทึก "ข้อมูลจริง" · กันไม่ให้เดโมเด้งกลับขึ้นคลาวด์
  if (!db._cleanDemo1) {
    db.payroll = (db.payroll || []).filter((p) => !/^pr-[1-9]$/.test(p.id));
    db.nutriMenu = {};
    db.nutriIngr = {};
    db._cleanDemo1 = true;
    save(DATA_KEY, db);
  }
  // sync โครงสร้างค่ามาตรฐาน (grp/name/unit/use/perShop) ของ assumption ทุกครั้งที่โหลด
  // เป็นข้อมูล "ฝั่งโค้ด" ไม่ใช่ค่าที่ผู้ใช้ตั้ง → sync ได้เสมอ (กัน flag ค้างจาก cache เก่า)
  // ค่า v / byShop (แยกร้าน) / ค่าที่เพิ่มเอง (custom) ไม่ถูกแตะ
  {
    const cur = db.assumptions || (db.assumptions = []);
    ASSUMPTIONS_SEED.forEach((seed) => {
      const ex = cur.find((a) => a.id === seed.id);
      if (!ex) { cur.push(clone(seed)); return; }
      ex.grp = seed.grp; ex.name = seed.name; ex.unit = seed.unit;
      ex.use = seed.use; ex.perShop = seed.perShop || false;
    });
    save(DATA_KEY, db);
  }
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
  if (value != null) {
    if (coll === "menus" && Array.isArray(value)) value = value.map(migMenu);
    d[coll] = value;
    // กัน "กุ้ง" หาย: ถ้าคลาวด์ส่ง cats/items มาแบบไม่มีกุ้ง → เติมจาก seed (idempotent)
    if (coll === "cats" && Array.isArray(value)) {
      const pSeed = CATS_SEED.find((c) => c.id === "protein");
      const p = value.find((c) => c.id === "protein");
      if (p && pSeed && pSeed.subs) { p.subs = p.subs || []; pSeed.subs.forEach((sub) => { if (!p.subs.some((s) => s.id === sub.id)) p.subs.push(clone(sub)); }); }
    }
    if (coll === "items" && Array.isArray(value)) {
      ITEMS_SEED.filter((i) => i.sub === "shrimp").forEach((seed) => { if (!value.some((i) => i.id === seed.id)) value.push(clone(seed)); });
    }
    saveDb();
  }
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
export function recipesRows() { return initData().recipes; }
export function manualRows() { return initData().manual; }
export function payrollRows() { return initData().payroll; }
export function songsRows() { return initData().songs; }
export function priceRows() { return initData().priceList; }
// ยอดขายรายวันต่อรายการ (ledger) — ต้นทางพยากรณ์/อันดับ · 1 แถว = วัน+รายการ (sold)
export function salesRows() { return initData().salesDaily; }
// บันทึกการนับสต๊อกรายวัน (ledger) — ต้นทางของพยากรณ์ · 1 แถว = วันที่+รายการ
export function countsRows() { return initData().counts; }
export function incomeRows() { return initData().income; }
export function expenseRows() { return initData().expense; }

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

// ---- เมนู (เพิ่ม/แก้/ลบ) — sync ขึ้น rama9_menus (ลบจริงได้เพราะ backend mirror delete) ----
export async function saveMenu(menu) {
  const list = menus();
  const i = list.findIndex((x) => x.id === menu.id);
  if (i >= 0) list[i] = { ...list[i], ...menu };
  else list.push({ ...menu });
  persist(); bumpData();
  return clone(menu);
}
export async function removeMenu(id) {
  initData().menus = menus().filter((m) => m.id !== id);
  persist(); bumpData();
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

// ============================================================
// สต๊อกจริง — รับ / นับ / ทิ้ง / ปรับ / ตั้งเกณฑ์ (persist + sync + audit)
// ทุกฟังก์ชันเขียนแถวใน db.stock → bumpData ให้ทุกหน้าวาดใหม่ +
// scheduleSync ดันขึ้น rama9_stock_items อัตโนมัติ
// ============================================================
const _r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const _todayLot = () => TODAY.d + " " + TODAY.mon;
// วันที่จริง (ISO YYYY-MM-DD) สำหรับ ledger พยากรณ์ — ต้องใช้วันจริงเพื่อคิดวันในสัปดาห์/หน้าต่าง 4 เดือน
const _todayISO = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

// ---- daily ledger (rama9_stock_counts) — count = คงเหลือปลายวัน · recv/waste = การเคลื่อนไหวระหว่างวัน ----
// แยกจาก lots ชัดเจน: lots = FIFO อย่างเดียว · counts = ประวัติรายวันสำหรับสูตรพยากรณ์
function _countRow(date, itemId) {
  const d = initData();
  const id = date + "|" + itemId;
  let r = d.counts.find((x) => x.id === id);
  if (!r) { r = { id, date, item: itemId, qty: null, recv: 0, waste: 0, at: new Date().toISOString() }; d.counts.push(r); }
  return r;
}
function _recCount(date, itemId, qty) { const r = _countRow(date, itemId); r.qty = _r2(qty); r.at = new Date().toISOString(); }
function _recRecv(date, itemId, qty) { const r = _countRow(date, itemId); r.recv = _r2((r.recv || 0) + _r2(qty)); }
function _recWaste(date, itemId, qty) { const r = _countRow(date, itemId); r.waste = _r2((r.waste || 0) + _r2(qty)); }

// หาแถวสต๊อก — ถ้ายังไม่มี สร้างจากค่าประมาณ (stockOf) เพื่อให้ต่อเนื่องกับที่หน้าจอเคยแสดง
function ensureStockRow(id) {
  const d = initData();
  let row = d.stock.find((s) => s.id === id);
  if (!row) {
    let inf; try { inf = stockOf(id); } catch (_) { inf = { qty: 0, use: 0, lots: [] }; }
    row = { id, qty: _r2(inf.qty), use: inf.use, lots: (inf.lots || []).map((l) => ({ ...l })) };
    d.stock.push(row);
  }
  if (!row.lots) row.lots = [];
  return row;
}

// ปรับล็อตให้รวมได้ตามยอดใหม่ (คงสัดส่วน/อายุล็อตเดิม · ไม่มีล็อต = ล็อตสดวันนี้)
function rescaleLots(row, newQty) {
  const cur = (row.lots || []).reduce((a, l) => a + (Number(l.qty) || 0), 0);
  if (cur <= 0) { row.lots = newQty > 0 ? [{ d: _todayLot(), lot: TODAY.d, qty: _r2(newQty), age: 0 }] : []; return; }
  const k = newQty / cur;
  row.lots = row.lots.map((l) => ({ ...l, qty: _r2(l.qty * k) })).filter((l) => l.qty > 0);
}

// ตัดของออกแบบ FIFO (เก่าก่อน = age มากก่อน) — ใช้ตอนทิ้ง/ของเสีย
function reduceFifo(row, amount) {
  let rest = _r2(amount);
  const lots = (row.lots || []).slice().sort((a, b) => (b.age || 0) - (a.age || 0));
  for (const l of lots) { if (rest <= 0) break; const take = Math.min(Number(l.qty) || 0, rest); l.qty = _r2(l.qty - take); rest = _r2(rest - take); }
  row.lots = lots.filter((l) => l.qty > 0);
}

const _nm = (id) => { const it = items().find((x) => x.id === id); return it ? it.name : id; };

// รับของ: บวกเข้าคงเหลือ + เพิ่มล็อตสดวันนี้
// lines = [{ id, qty }]  (qty = จำนวนที่รับเข้า)
export async function applyReceive(lines, by = "พนักงาน") {
  const rows = (lines || []).filter((l) => Number(l.qty) > 0);
  const iso = _todayISO();
  rows.forEach(({ id, qty }) => {
    const row = ensureStockRow(id);
    const n = _r2(qty);
    row.qty = _r2((Number(row.qty) || 0) + n);
    row.lots = [...(row.lots || []), { d: _todayLot(), lot: TODAY.d, qty: n, age: 0 }];
    _recRecv(iso, id, n);   // ledger: รับเข้าวันนี้
  });
  if (rows.length) { persist(); bumpData(); logEdit({ txt: "รับของเข้าสต๊อก " + rows.length + " รายการ", kind: "add", by }); }
  return rows.length;
}

// ตรวจนับ: ตั้งคงเหลือ = ยอดที่นับได้ (set) + ปรับล็อตตามยอดใหม่
// lines = [{ id, qty }]  (qty = ยอดนับจริง)
export async function applyCount(lines, by = "พนักงาน") {
  const rows = (lines || []).filter((l) => l.qty !== "" && l.qty != null);
  const iso = _todayISO();
  rows.forEach(({ id, qty }) => {
    const row = ensureStockRow(id);
    const n = _r2(qty);
    row.qty = n;
    rescaleLots(row, n);
    _recCount(iso, id, n);   // ledger: คงเหลือ ณ วันนับ
  });
  if (rows.length) { persist(); bumpData(); logEdit({ txt: "บันทึกตรวจนับ " + rows.length + " รายการ", kind: "add", by }); }
  return rows.length;
}

// ทิ้ง/ของเสีย: ตัดออกจากคงเหลือแบบ FIFO
// lines = [{ id, qty, reason }]
export async function applyWaste(lines, by = "พนักงาน") {
  const rows = (lines || []).filter((l) => Number(l.qty) > 0);
  const iso = _todayISO();
  rows.forEach(({ id, qty }) => {
    const row = ensureStockRow(id);
    const n = _r2(qty);
    row.qty = _r2(Math.max(0, (Number(row.qty) || 0) - n));
    reduceFifo(row, n);
    _recWaste(iso, id, n);   // ledger: ของเสีย/ทิ้งวันนี้
  });
  if (rows.length) {
    persist(); bumpData();
    const txt = rows.length === 1
      ? "บันทึกของทิ้ง " + _nm(rows[0].id) + " " + _r2(rows[0].qty) + (rows[0].reason ? " (" + rows[0].reason + ")" : "")
      : "บันทึกของทิ้ง " + rows.length + " รายการ";
    logEdit({ txt, kind: "edit", by });
  }
  return rows.length;
}

// ปรับคงเหลือด้วยมือ (หน้าสต๊อก/ข้อมูลกลาง) — set + audit
export async function editStockQty(id, qty, by = "เจ้าของ") {
  const row = ensureStockRow(id);
  const before = _r2(row.qty);
  const n = _r2(qty);
  row.qty = n;
  rescaleLots(row, n);
  persist(); bumpData();
  logEdit({ txt: 'แก้คงเหลือ "' + _nm(id) + '" ' + before + " → " + n, kind: "edit", by });
  return clone(row);
}

// ตั้งเกณฑ์แจ้งเตือนของต่ำรายตัว (qty) — "" / null = ใช้ค่ากลาง
export async function setStockThreshold(id, v) {
  const row = ensureStockRow(id);
  row.threshold = (v === "" || v == null) ? null : _r2(v);
  persist(); bumpData();
  return clone(row);
}

// เปิด/ปิดแจ้งเตือนของต่ำรายตัว (default = เปิด) — ปิดแล้วบอทไม่เตือนรายการนี้
export async function setStockAlert(id, on) {
  const row = ensureStockRow(id);
  row.alertOn = !!on;
  persist(); bumpData();
  return clone(row);
}
// อ่านสถานะแจ้งเตือนรายตัว (ไม่เคยตั้ง = เปิด)
export function alertOnOf(id) {
  const row = stockRows().find((s) => s.id === id);
  return !(row && row.alertOn === false);
}

// ---- ล็อต FIFO รายตัว (เพิ่ม/แก้/ลบ) — qty รวมคิดใหม่จากผลรวมล็อตเสมอ ----
const _sumLots = (row) => _r2((row.lots || []).reduce((a, l) => a + (Number(l.qty) || 0), 0));

export async function addLot(id, qty, by = "พนักงาน") {
  const n = _r2(qty);
  if (n <= 0) return null;
  const row = ensureStockRow(id);
  row.lots = [...(row.lots || []), { d: _todayLot(), lot: TODAY.d, qty: n, age: 0 }];
  row.qty = _sumLots(row);
  persist(); bumpData();
  logEdit({ txt: 'เพิ่มล็อต "' + _nm(id) + '" +' + n, kind: "add", by });
  return clone(row);
}

export async function editLot(id, lotIdx, qty, by = "เจ้าของ") {
  const row = ensureStockRow(id);
  const lot = (row.lots || [])[lotIdx];
  if (!lot) return null;
  const before = _r2(lot.qty);
  const n = _r2(qty);
  if (n <= 0) row.lots = row.lots.filter((_, i) => i !== lotIdx);
  else lot.qty = n;
  row.qty = _sumLots(row);
  persist(); bumpData();
  logEdit({ txt: 'แก้ล็อต "' + _nm(id) + '" ' + before + " → " + n, by });
  return clone(row);
}

export async function removeLot(id, lotIdx, by = "เจ้าของ") {
  const row = ensureStockRow(id);
  const lot = (row.lots || [])[lotIdx];
  if (!lot) return null;
  const q = _r2(lot.qty);
  row.lots = row.lots.filter((_, i) => i !== lotIdx);
  row.qty = _sumLots(row);
  persist(); bumpData();
  logEdit({ txt: 'ลบล็อต "' + _nm(id) + '" −' + q, kind: "del", by });
  return clone(row);
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

// ---- สูตรอาหาร (recipes) — เจ้าของแก้สัดส่วน/ขั้นตอน + persist + sync ----
export async function getRecipes() { return clone(recipesRows()); }
export async function saveRecipe(rec) {
  const list = recipesRows();
  const i = list.findIndex((x) => x.id === rec.id);
  if (i >= 0) list[i] = { ...list[i], ...rec };
  else list.push({ ...rec });
  persist(); bumpData();
  return clone(rec);
}
export async function removeRecipe(id) {
  const d = initData();
  d.recipes = recipesRows().filter((r) => r.id !== id);
  persist(); bumpData();
  return true;
}
// เลื่อนสูตรขึ้น/ลง (dir = -1 ขึ้น · +1 ลง) — ลำดับนี้ใช้ทุกหน้า (หน้าแรก + หน้าแก้สูตร อ่านชุดเดียวกัน)
export async function moveRecipe(id, dir) {
  const list = recipesRows();
  const i = list.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return false;
  const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
  persist(); bumpData();
  return true;
}

// ---- คู่มือพนักงาน (manual) — เจ้าของเพิ่ม/แก้/ลบ + persist + sync ----
export async function getManual() { return clone(manualRows()); }
export async function saveManualTopic(topic) {
  const list = manualRows();
  const i = list.findIndex((x) => x.id === topic.id);
  if (i >= 0) list[i] = { ...list[i], ...topic };
  else list.push({ ...topic });
  persist(); bumpData();
  return clone(topic);
}
export async function removeManualTopic(id) {
  const d = initData();
  d.manual = manualRows().filter((m) => m.id !== id);
  persist(); bumpData();
  return true;
}

// ---- รายได้ / ค่าใช้จ่าย (income / expense) — บันทึกจริง + sync ขึ้นคลาวด์ ----
// upsert ตาม id (วัน+ช่องทาง/หมวด) — บันทึกซ้ำ = แก้ทับ
export async function getIncome() { return clone(incomeRows()); }
export async function saveIncomeRecord(rec) {
  const list = incomeRows();
  const i = list.findIndex((x) => x.id === rec.id);
  if (i >= 0) list[i] = { ...list[i], ...rec };
  else list.push({ ...rec });
  persist(); bumpData();
  return clone(rec);
}
export async function removeIncomeRecord(id) {
  const d = initData();
  d.income = incomeRows().filter((r) => r.id !== id);
  persist(); bumpData();
  return true;
}
export async function getExpense() { return clone(expenseRows()); }
export async function saveExpenseRecord(rec) {
  const list = expenseRows();
  const i = list.findIndex((x) => x.id === rec.id);
  if (i >= 0) list[i] = { ...list[i], ...rec };
  else list.push({ ...rec });
  persist(); bumpData();
  return clone(rec);
}
export async function removeExpenseRecord(id) {
  const d = initData();
  d.expense = expenseRows().filter((r) => r.id !== id);
  persist(); bumpData();
  return true;
}

// ---- ค่าแรงพนักงาน (payroll) — เจ้าของแก้รายชื่อ/ค่าจ้าง/OT + persist + sync ----export async function getPayroll() { return clone(payrollRows()); }
export async function setPayroll(rows) {
  initData().payroll = (rows || []).map((r) => ({ ...r }));
  persist(); bumpData();
  return clone(payrollRows());
}

// ---- เพลงร้าน (songs) — metadata + persist + sync (ไฟล์เสียงอยู่ Storage) ----
export async function getSongs() { return clone(songsRows()); }
export async function saveSong(song) {
  const list = songsRows();
  const i = list.findIndex((x) => x.id === song.id);
  if (i >= 0) list[i] = { ...list[i], ...song };
  else list.push({ ...song });
  persist(); bumpData();
  return clone(song);
}
export async function removeSong(id) {
  const d = initData();
  d.songs = songsRows().filter((s) => s.id !== id);
  persist(); bumpData();
  return true;
}

// ---- เมนู·ราคาขาย (price list) — ตารางเดี่ยว standalone ไม่มี FK ----
// 1 แถว = 1 รายการขาย (กับข้าวเดียวคนละชนิดข้าว = คนละแถว) · สุทธิ = ตั้งขาย − ส่วนลด (คำนวณตอนแสดง)
export async function getPriceList() { return clone(priceRows()); }
export async function savePrice(row) {
  const list = priceRows();
  const i = list.findIndex((x) => x.id === row.id);
  if (i >= 0) list[i] = { ...list[i], ...row };
  else list.push({ ...row });
  persist(); bumpData();
  return clone(row);
}
export async function removePrice(id) {
  const d = initData();
  d.priceList = priceRows().filter((r) => r.id !== id);
  persist(); bumpData();
  return true;
}

// ---- ยอดขายรายวันต่อรายการ (sales ledger) — ป้อนพยากรณ์ · upsert ตาม id (วัน|รายการ) ----
export async function getSalesDaily() { return clone(salesRows()); }
export async function saveSalesRow(date, itemId, sold) {
  const d = initData();
  const id = date + "|" + itemId;
  const n = Math.round((Number(sold) || 0) * 1000) / 1000;
  const i = d.salesDaily.findIndex((x) => x.id === id);
  if (i >= 0) d.salesDaily[i] = { ...d.salesDaily[i], sold: n };
  else d.salesDaily.push({ id, date, item: itemId, sold: n });
  persist(); bumpData();
  return true;
}
export async function removeSalesRow(id) {
  const d = initData();
  d.salesDaily = salesRows().filter((r) => r.id !== id);
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

// อ่านค่า assumption แบบ "แยกร้าน" — ถ้า assumption ตั้ง perShop และร้านนี้มีค่าเฉพาะ
// (byShop[shop]) ใช้ค่านั้น ไม่งั้น fall back ค่ากลาง (a.v) แล้วค่อย fallback ที่ส่งมา
export function assumeShop(id, shop, fallback = 0) {
  const a = assumptions().find((x) => x.id === id);
  if (!a) return fallback;
  let raw = a.v;
  if (a.perShop && a.byShop && shop && a.byShop[shop] != null && a.byShop[shop] !== "") raw = a.byShop[shop];
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}
