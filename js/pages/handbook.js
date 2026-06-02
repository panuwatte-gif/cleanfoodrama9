/* ============================================================
   pages/handbook.js — คู่มือพนักงาน
   เมนู&โภชนาการ (ดึงจากทะเบียนกลาง · แยกร้าน) · อุปกรณ์ ·
   การแพ็ค (ใส่รูปได้) · ลูกค้าถามบ่อย · ปัญหา&วิธีแก้
   ใครก็เพิ่ม/แก้ได้
   ============================================================ */
import { state } from '../state.js';
import { pageHead, esc, mockTag, icon } from '../components.js';
import { categories, foodByProtein, itemsBySubcat, activeStores, activeStoreId } from '../menu.js';

let activeSec = 'menu';
const SECTIONS = [
  { id: 'menu',      label: 'เมนู & โภชนาการ', icon: 'flame',  color: 'var(--chili)' },
  { id: 'equipment', label: 'อุปกรณ์',         icon: 'sliders', color: 'var(--info)' },
  { id: 'packing',   label: 'การแพ็ค',         icon: 'box',    color: 'var(--carrot)' },
  { id: 'faq',       label: 'ลูกค้าถามบ่อย',   icon: 'book2',  color: 'var(--basil-600)' },
  { id: 'problem',   label: 'ปัญหา & วิธีแก้',  icon: 'alert',  color: 'var(--riceberry)' },
];

/* ---------- เมนู & โภชนาการ ---------- */
function menuSection() {
  const cfg = state.config.menu;
  const storeId = activeStoreId();
  const nut = (state.db.menuNutrition[storeId]) || {};
  const baseLabel = (id) => cfg.baseChoices.find((b) => b.id === id)?.label || '—';

  const foodRow = (it) => {
    const d = nut[it.id] || {};
    const baseG = d.baseGram ?? cfg.portionStd.rice;
    const protG = d.proteinGram ?? cfg.portionStd.protein;
    return `<tr>
      <td>${esc(it.name)}</td>
      <td><select class="input hb-sel">${cfg.baseChoices.map((b) => `<option ${b.id === d.base ? 'selected' : ''}>${esc(b.label)}</option>`).join('')}</select></td>
      <td><input class="input data hb-num" value="${baseG}"></td>
      <td><input class="input data hb-num" value="${protG}"></td>
      <td><input class="input data hb-num" value="${d.kcal ?? ''}" placeholder="—"></td>
      <td><input class="input data hb-num" value="${d.protein ?? ''}" placeholder="—"></td>
      <td><input class="input data hb-num" value="${d.fat ?? ''}" placeholder="—"></td>
      <td><input class="input data hb-num" value="${d.carb ?? ''}" placeholder="—"></td>
    </tr>`;
  };

  const head = `<thead><tr><th>เมนู</th><th>ชนิดข้าว/แป้ง</th><th>ข้าว/เส้น (g)</th><th>เนื้อสัตว์ (g)</th><th>kcal</th><th>โปรตีน</th><th>ไขมัน</th><th>คาร์บ</th></tr></thead>`;

  // อาหารปรุงสำเร็จ จัดกลุ่มตามโปรตีน
  const foodCat = categories().find((c) => c.layout === 'spice');
  const foodGroups = foodCat ? foodByProtein(foodCat.id) : [];
  const foodCard = `<div class="card card-pad" style="border-top:3px solid var(--basil-600)">
    <div class="row" style="justify-content:space-between;margin-bottom:4px"><div class="section-title">อาหารปรุงสำเร็จ</div><span class="pill pill-gray">มาตรฐาน ข้าว ${cfg.portionStd.rice}g · เนื้อ ${cfg.portionStd.protein}g</span></div>
    <div class="section-sub" style="margin-bottom:12px">ค่าเริ่มต้นข้าว 150g / เนื้อ 100g — แก้รายเมนูได้ (เช่น XL, เมนูเส้น)</div>
    <div class="tbl-scroll"><table class="tbl hb-tbl">${head}<tbody>
      ${foodGroups.map((g) => `<tr class="hb-grouprow"><td colspan="8">${esc(g.group.label)}</td></tr>${g.items.map(foodRow).join('')}`).join('')}
    </tbody></table></div>
  </div>`;

  // เครื่องดื่ม (kcal อย่างเดียว)
  const drinkCat = categories().find((c) => c.layout === 'subcat');
  const drinkGroups = drinkCat ? itemsBySubcat(drinkCat.id) : [];
  const drinkCard = `<div class="card card-pad" style="border-top:3px solid var(--info);margin-top:18px">
    <div class="section-title" style="margin-bottom:12px">เครื่องดื่ม</div>
    <div class="tbl-scroll"><table class="tbl hb-tbl"><thead><tr><th>เครื่องดื่ม</th><th>ปริมาณ (ml)</th><th>kcal</th><th>โปรตีน</th><th>ไขมัน</th><th>คาร์บ</th></tr></thead><tbody>
      ${drinkGroups.map((g) => `<tr class="hb-grouprow"><td colspan="6">${esc(g.sub.name)}</td></tr>${g.items.map((it) => {
        const d = nut[it.id] || {};
        const ml = d.ml ?? (/ชาไทย|มัทฉะ/.test(it.name) ? 220 : 250);
        return `<tr><td>${esc(it.name)}</td><td><input class="input data hb-num" value="${ml}"></td><td><input class="input data hb-num" value="${d.kcal ?? ''}" placeholder="${g.sub.id === 'sub_zero' ? '0' : '—'}"></td><td><input class="input data hb-num" value="${d.protein ?? ''}" placeholder="—"></td><td><input class="input data hb-num" value="${d.fat ?? ''}" placeholder="—"></td><td><input class="input data hb-num" value="${d.carb ?? ''}" placeholder="—"></td></tr>`;
      }).join('')}`).join('')}
    </tbody></table></div>
  </div>`;

  return `${foodCard}${drinkCard}<div style="margin-top:12px">${mockTag('ดึงรายการจากทะเบียนกลาง — เพิ่มเมนูที่หน้านับสต็อก/ตั้งค่า แล้วขึ้นที่นี่อัตโนมัติ')}</div>`;
}

/* ---------- อุปกรณ์ ---------- */
function equipmentSection() {
  return `<div class="grid cols-2">${state.db.equipmentGuides.map((e) => `
    <div class="card card-pad" style="border-left:3px solid var(--info)">
      <div class="row" style="justify-content:space-between;align-items:flex-start"><div class="li-t">${esc(e.title)}</div><span style="color:var(--info)">${icon('sliders', 18)}</span></div>
      <div class="ds-body" style="font-size:13.5px;margin-top:6px;color:var(--ink-2)">${esc(e.body)}</div>
      ${e.fields.length ? `<div style="margin-top:12px;background:var(--cream-100);border-radius:var(--r-md);padding:12px">${e.fields.map((f) => `<div class="row" style="justify-content:space-between;padding:4px 0"><span class="li-s">${esc(f.label)}</span><span class="data" style="font-weight:600">${f.secret ? '••••••' : esc(f.value)}</span></div>`).join('')}</div>` : ''}
      <button class="btn btn-ghost btn-sm" style="margin-top:10px">${icon('edit', 14)} แก้ไข</button>
    </div>`).join('')}
    <div class="card card-pad" style="border-style:dashed;display:grid;place-items:center;text-align:center;color:var(--ink-3);cursor:pointer;min-height:120px"><div>${icon('plus', 24)}<div class="li-t" style="margin-top:6px">เพิ่มคู่มืออุปกรณ์</div></div></div>
  </div>`;
}

/* ---------- การแพ็ค (ใส่รูปได้) ---------- */
function packingSection() {
  return `<div class="grid" style="gap:18px">${state.db.packingGuides.map((p) => `
    <div class="card card-pad" style="border-left:3px solid var(--carrot)">
      <div class="row" style="gap:12px;margin-bottom:12px">
        <span style="width:34px;height:34px;border-radius:999px;background:var(--carrot);color:#fff;display:grid;place-items:center;font-family:var(--font-mono);font-weight:700;flex-shrink:0">${p.step}</span>
        <div class="section-title" style="margin:0">${esc(p.title)}</div>
      </div>
      <div class="grid" style="grid-template-columns:${p.hasImage ? '1fr 240px' : '1fr'};gap:16px;align-items:start">
        <ul class="hb-points">${p.points.map((pt) => `<li>${esc(pt)}</li>`).join('')}</ul>
        ${p.hasImage ? `<image-slot id="pack_${p.id}" style="width:100%;height:180px" shape="rounded" radius="14" placeholder="วางรูปประกอบขั้นตอนนี้"></image-slot>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-top:12px">${icon('edit', 14)} แก้ไขขั้นตอน</button>
    </div>`).join('')}
    <div class="card card-pad" style="border-style:dashed;text-align:center;color:var(--ink-3);cursor:pointer">${icon('plus', 22)}<div class="li-t" style="margin-top:6px">เพิ่มขั้นตอน</div></div>
  </div>`;
}

/* ---------- FAQ / ปัญหา ---------- */
function listSection(sectionId, color, ic) {
  const entries = state.db.handbook.filter((h) => h.section === sectionId);
  return `<div class="grid cols-2">${entries.map((e) => `
    <div class="card card-pad" style="border-left:3px solid ${color}">
      <div class="row" style="justify-content:space-between;align-items:flex-start"><div class="li-t">${esc(e.title)}</div><span style="color:${color}">${icon(ic, 18)}</span></div>
      <div class="ds-body" style="font-size:14px;margin-top:8px;color:var(--ink-2)">${esc(e.body)}</div>
      <div class="row" style="justify-content:space-between;margin-top:12px;color:var(--ink-3);font-size:11.5px"><span>โดย ${esc(state.db.users.find((u) => u.id === e.author)?.name || '')}</span><span>${e.updated}</span></div>
    </div>`).join('') || '<div class="empty card card-pad">ยังไม่มีหัวข้อ</div>'}
    <div class="card card-pad" style="border-style:dashed;display:grid;place-items:center;text-align:center;color:var(--ink-3);cursor:pointer;min-height:110px"><div>${icon('plus', 22)}<div class="li-t" style="margin-top:6px">เพิ่มหัวข้อ</div></div></div>
  </div>`;
}

export default {
  render() {
    const stores = activeStores();
    const sec = SECTIONS.find((s) => s.id === activeSec) || SECTIONS[0];
    const storeSwitcher = stores.length > 1
      ? `<div class="row" style="gap:6px">${stores.map((s) => `<button class="chip ${s.id === activeStoreId() ? 'active' : ''}" data-store="${s.id}">${esc(s.short)}</button>`).join('')}</div>`
      : `<span class="pill pill-green">${icon('store', 13)} ${esc(stores[0]?.short || '')}</span>`;

    let body = '';
    if (activeSec === 'menu') body = menuSection();
    else if (activeSec === 'equipment') body = equipmentSection();
    else if (activeSec === 'packing') body = packingSection();
    else if (activeSec === 'faq') body = listSection('faq', 'var(--basil-600)', 'book2');
    else body = listSection('problem', 'var(--riceberry)', 'alert');

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'คู่มือพนักงาน', desc: 'ข้อมูลสำคัญหน้างาน · ใครก็เพิ่ม/แก้ได้ เพื่อช่วยกันสะสมความรู้', actions: storeSwitcher })}
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:18px">
        ${SECTIONS.map((s) => `<button class="chip ${s.id === activeSec ? 'active' : ''}" data-sec="${s.id}">${esc(s.label)}</button>`).join('')}
      </div>
      ${body}
    </div>`;
  },
  mount(ctx) {
    document.querySelectorAll('[data-sec]').forEach((el) => el.addEventListener('click', () => { activeSec = el.dataset.sec; ctx.refresh(); }));
    document.querySelectorAll('[data-store]').forEach((el) => el.addEventListener('click', () => { state.session.activeStoreId = el.dataset.store; ctx.refresh(); }));
  },
};
