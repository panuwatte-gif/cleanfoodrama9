/* ============================================================
   menu.js — ทะเบียนกลาง (Single Source) สำหรับรายการเมนู/สต็อก
   ทุกหน้า (นับสต็อก · คู่มือ · จำลองเมนู) เรียกผ่านที่นี่
   → รายการเรียงเหมือนกัน เพิ่ม/แก้ที่ state ที่เดียว เปลี่ยนทั้งแอป
   ============================================================ */
import { state } from './state.js';

// ร้านที่กำลังดูอยู่ (เผื่ออนาคตหลายร้าน) + ร้านที่เปิดใช้งานจริง
export function activeStoreId() {
  return state.session.activeStoreId || (state.db.stores.find((s) => s.status === 'active') || {}).id;
}
export function activeStores() {
  return state.db.stores.filter((s) => s.status === 'active');
}
// เมนูนี้ใช้กับร้านที่กำลังดูไหม? (ไม่ระบุ stores = ใช้ได้ทุกร้าน)
export function inActiveStore(it) {
  return !it.stores || it.stores.includes(activeStoreId());
}

// หมวดทั้งหมด เรียงตาม order
export function categories() {
  return [...state.db.stockCategories].sort((a, b) => (a.order || 0) - (b.order || 0));
}
export function category(catId) {
  return state.db.stockCategories.find((c) => c.id === catId);
}

// รายการในหมวด เรียงตาม order + กรองเฉพาะร้านที่กำลังดู
export function itemsInCategory(catId) {
  return state.db.stockItems
    .filter((i) => i.cat === catId && inActiveStore(i))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

// ลำดับกลุ่มโปรตีน (จาก config)
export function proteinGroups() {
  return [...state.config.menu.proteinGroups].sort((a, b) => (a.order || 0) - (b.order || 0));
}
export function proteinLabel(id) {
  return state.config.menu.proteinGroups.find((g) => g.id === id)?.label || id;
}

// อาหารปรุงสำเร็จ จัดกลุ่มตามโปรตีน → [{group, items[]}]
// variant: 'spicy' | 'noSpice' | null(ทั้งหมด) — กรองเฉพาะเมนูที่มีสูตรนั้น
export function foodByProtein(catId, variant = null) {
  const items = itemsInCategory(catId);
  return proteinGroups()
    .map((g) => ({
      group: g,
      items: items
        .filter((it) => (it.protein || 'other') === g.id)
        .filter((it) => !variant || it[variant]),
    }))
    .filter((grp) => grp.items.length > 0);
}

// เครื่องดื่ม จัดกลุ่มตามหมวดย่อย → [{sub, items[]}]
export function itemsBySubcat(catId) {
  const cat = category(catId);
  const subs = (cat?.subCategories || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  const items = itemsInCategory(catId);
  return subs.map((s) => ({ sub: s, items: items.filter((it) => it.sub === s.id) }))
    .filter((grp) => grp.items.length > 0);
}

// วัตถุดิบ จัดกลุ่มตาม field 'sub' (string เช่น ไข่/ข้าว) → [{name, items[]}]
export function itemsByRawSub(catId) {
  const items = itemsInCategory(catId);
  const groups = [];
  items.forEach((it) => {
    const key = it.sub || '';
    let g = groups.find((x) => x.name === key);
    if (!g) { g = { name: key, items: [] }; groups.push(g); }
    g.items.push(it);
  });
  return groups;
}

export const itemById = (id) => state.db.stockItems.find((i) => i.id === id);
export const itemName = (id) => itemById(id)?.name || id;
