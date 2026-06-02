/* ============================================================
   pages/expenses.js — บันทึกค่าใช้จ่าย
   foodcost(เชื่อมรับของ) · recurring(รายเดือน) · wage(รายคน) ·
   itemized(จำนวน×ราคา/หน่วย · ราคา+หน่วยกรอกอิสระ ค้างเป็น default)
   หมวด owner:true เฉพาะเจ้าของ · เพิ่มหมวดเองได้
   ============================================================ */
import { state } from '../state.js';
import { can } from '../auth.js';
import { pageHead, baht, num, esc, mockTag, icon } from '../components.js';
import { categories, itemsInCategory } from '../menu.js';
import { foodGrid } from '../foodgrid.js';
import { openForm, addRow, commit, genId } from '../crud.js';

let activeCat = null;
const DAILY_DAYS = 26;

const foodCatId = () => (categories().find((c) => c.layout === 'spice') || {}).id;
const foodList = () => { const id = foodCatId(); return id ? itemsInCategory(id) : []; };
const recvQty = (itemId) => state.db.receivings.filter((r) => r.itemId === itemId).reduce((s, r) => s + r.received.qty, 0);

function catAmount(c) {
  if (c.type === 'foodcost') return foodList().reduce((s, it) => s + recvQty(it.id) * (state.db.foodCosts[it.id] || 0), 0);
  if (c.type === 'recurring') return c.monthly || 0;
  if (c.type === 'wage') return state.db.payroll.filter((p) => p.active).reduce((s, p) => s + (p.type === 'monthly' ? p.amount : p.amount * DAILY_DAYS), 0);
  return state.db.expenses.filter((e) => e.catId === c.id).reduce((s, e) => s + e.amount, 0);
}

export default {
  render() {
    const isOwner = can.viewFinance();
    const cats = state.db.expenseCategories.filter((c) => isOwner || !c.owner);
    if (!activeCat || !cats.find((c) => c.id === activeCat)) activeCat = cats[0]?.id;
    const cat = cats.find((c) => c.id === activeCat);
    const monthTotal = cats.reduce((s, c) => s + catAmount(c), 0);

    const summary = `<div class="grid exp-summary" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:22px">
      ${cats.map((c) => `<button class="kpi" style="text-align:left;border:none;cursor:pointer;${c.id === activeCat ? 'outline:2px solid var(--basil-500)' : ''}" data-ecat="${c.id}">
        <div class="kpi-ico" style="background:var(--cream-100);color:${c.color}">${icon(c.icon, 20)}</div>
        <div class="kpi-label">${esc(c.name)}${c.owner ? ' ' + icon('lock', 11) : ''}</div>
        <div class="kpi-val" style="font-size:21px">${baht(catAmount(c))}<span style="font-size:11px;color:var(--ink-3)">${c.type === 'recurring' || c.type === 'wage' ? '/ด.' : ''}</span></div>
      </button>`).join('')}
    </div>`;

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'บันทึกค่าใช้จ่าย', desc: 'ต้นทุนอาหารเชื่อมหน้ารับของ · รายเดือนคิดอัตโนมัติ · ค่าแรงรายคน · บรรจุภัณฑ์/วัตถุดิบกรอกราคา+หน่วยอิสระ (ค้างเป็น default)', actions: `<div class="topbar-search" style="margin:0;width:auto;padding:7px 14px">${icon('calendar', 16)}<input type="date" value="2026-06-02" style="border:none;outline:none;background:none;font-family:var(--font-mono);color:var(--ink);width:130px"></div>` })}

      ${summary}

      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:18px">
        ${cats.map((c) => `<button class="chip ${c.id === activeCat ? 'active' : ''}" data-ecat="${c.id}">${esc(c.name)}</button>`).join('')}
        ${isOwner ? `<button class="chip" style="border-style:dashed" id="add-ecat">${icon('plus', 15)} เพิ่มหมวด</button>` : ''}
      </div>

      ${panel(cat)}

      ${isOwner ? `<div class="card card-pad owner-only" style="margin-top:18px">
        <div class="row" style="justify-content:space-between"><div><div class="overline" style="color:var(--riceberry)">เฉพาะเจ้าของ</div><div class="section-title">รวมค่าใช้จ่ายโดยประมาณ (ต่อเดือน)</div></div>
        <div class="data" style="font-size:30px;font-weight:600;color:var(--chili)">${baht(monthTotal)}</div></div>
        <div style="margin-top:8px">${mockTag('นำไปคำนวณกำไร/ภาษีที่หน้าแสดงผล (รอบ E)')}</div>
      </div>` : ''}
    </div>`;
  },
  mount(ctx) {
    document.querySelectorAll('[data-ecat]').forEach((el) => el.addEventListener('click', () => { activeCat = el.dataset.ecat; ctx.refresh(); }));

    // itemized: เป็นเงิน = ราคา(กรอกได้) × จำนวน
    const recalcIt = () => {
      let total = 0;
      document.querySelectorAll('.it-row').forEach((row) => {
        const price = parseFloat(row.querySelector('.it-price')?.value) || 0;
        const qty = parseFloat(row.querySelector('.it-qty')?.value) || 0;
        const amt = price * qty;
        row.querySelector('.it-amt').textContent = amt ? baht(Math.round(amt)) : '—';
        total += amt;
      });
      const t = document.getElementById('it-total'); if (t) t.textContent = baht(Math.round(total));
    };
    document.querySelectorAll('.it-qty, .it-price').forEach((el) => el.addEventListener('input', recalcIt));

    // foodcost: เป็นเงิน = รับเข้า × ต้นทุน/หน่วย
    const recalcFc = () => {
      let total = 0;
      document.querySelectorAll('.fg-row').forEach((row) => {
        const costEl = row.querySelector('.fc-cost'); if (!costEl) return;
        const qty = parseFloat(row.querySelector('.fc-q')?.dataset.qty) || 0;
        const amt = qty * (parseFloat(costEl.value) || 0);
        const amtEl = row.querySelector('.fc-amt'); if (amtEl) amtEl.textContent = amt ? baht(Math.round(amt)) : '—';
        total += amt;
      });
      const t = document.getElementById('fc-total'); if (t) t.textContent = baht(Math.round(total));
    };
    document.querySelectorAll('.fc-cost').forEach((el) => el.addEventListener('input', recalcFc));
    recalcFc();

    // เพิ่มรายการ (itemized: บรรจุภัณฑ์ / วัตถุดิบ / อื่นๆ)
    document.querySelectorAll('[data-additem]').forEach((el) => el.addEventListener('click', () => {
      const catId = el.dataset.additem;
      const ecat = state.db.expenseCategories.find((c) => c.id === catId);
      const fields = [
        { key: 'name', label: 'ชื่อรายการ', type: 'text', placeholder: 'เช่น กล่องอาหาร 3 ช่อง' },
        { key: 'unitPrice', label: 'ราคา/หน่วย (฿)', type: 'number', placeholder: '0' },
        { key: 'unit', label: 'หน่วยนับ', type: 'text', placeholder: 'เช่น ใบ / ขวด / กก.' },
        { key: 'vat', label: 'มี VAT (เคลมภาษีซื้อ)', type: 'checkbox' },
      ];
      if (ecat.linksStock) fields.push({ key: 'addStock', label: 'เพิ่มเข้าสต็อกด้วย', type: 'checkbox', value: true });
      openForm({
        title: `เพิ่มรายการใน ${ecat.name}`, fields,
        onSave: (v) => {
          if (!v.name) return false;
          const row = { id: genId('xi'), catId, name: v.name, unitPrice: v.unitPrice || 0, unit: v.unit || 'หน่วย', vat: !!v.vat, stockItemId: null };
          if (ecat.linksStock && v.addStock) {
            const sid = genId('it');
            addRow('stockItems', { id: sid, cat: 'cat_other', name: v.name, unit: v.unit || 'หน่วย', order: 99 });
            row.stockItemId = sid;
          }
          addRow('expenseItems', row);
          ctx.refresh();
        },
      });
    }));
  },
};

function panel(cat) {
  if (!cat) return '';
  if (cat.type === 'foodcost') return foodcostPanel(cat);
  if (cat.type === 'wage') return wagePanel(cat);
  if (cat.type === 'recurring') return recurringPanel(cat);
  if (cat.type === 'itemized') return itemizedPanel(cat);
  return manualPanel(cat);
}

/* ต้นทุนรับอาหาร — ใช้โครงเดียวกับหน้าส่ง/รับของ (foodGrid) */
function foodcostPanel(cat) {
  const grid = foodGrid({
    headCols: () => `<th style="text-align:right">รับเข้า</th><th style="text-align:right">ต้นทุน/หน่วย</th><th style="text-align:right">เป็นเงิน</th>`,
    cell: (it) => { const q = recvQty(it.id); return `<td data-label="รับเข้า" class="num data fc-q" data-qty="${q}">${q ? num(q) : '<span style="color:var(--ink-3)">—</span>'}</td>`
      + `<td data-label="ต้นทุน/หน่วย" style="text-align:right"><div class="row" style="gap:3px;justify-content:flex-end"><span class="stk-note">฿</span><input class="input data fc-cost" value="${state.db.foodCosts[it.id] || ''}" placeholder="0" style="width:64px;text-align:right;padding:6px"></div></td>`
      + `<td data-label="เป็นเงิน" class="num data fc-amt" style="font-weight:600;color:var(--basil-700)">—</td>`; },
  });
  return `<div class="card card-pad" style="border-top:3px solid ${cat.color}">
    <div class="row" style="justify-content:space-between;margin-bottom:6px"><div class="section-title">ต้นทุนรับอาหาร</div><span class="pill pill-green">${icon('truck', 13)} โครงเดียวกับหน้าส่ง/รับของ</span></div>
    <div class="section-sub">รายการเรียงเหมือนหน้าส่ง/รับของเป๊ะ (รสชาติปกติ / ไม่เผ็ด / เครื่องดื่ม) · ใส่ <b>ต้นทุน/หน่วย</b> ค้างไว้ (แก้ได้ · default) — พอฝั่งรับคอนเฟิร์มยอด ระบบคูณเป็นเงินให้ (เฉพาะเจ้าของเห็น)</div>
    <div style="margin-top:14px">${grid}</div>
    <div class="row" style="justify-content:space-between;margin-top:16px;padding-top:14px;border-top:1.5px solid var(--line)">
      <span class="stk-note">${icon('refresh', 13)} ยอดรับมาจากหน้าส่ง/รับของ — รายการเรียงเหมือนกัน</span>
      <div class="row" style="gap:14px"><div style="text-align:right"><div class="li-s">รวมต้นทุนรับ</div><div class="data" id="fc-total" style="font-size:24px;font-weight:600;color:var(--basil-700)">฿0</div></div>
      <button class="btn btn-primary" style="height:46px">${icon('check', 18)} บันทึกต้นทุน</button></div>
    </div>
  </div>`;
}

function manualPanel(cat) {
  return `<div class="grid" style="grid-template-columns:minmax(280px,330px) minmax(0,1fr)">
    <div class="card card-pad" style="align-self:start;border-top:3px solid ${cat.color}">
      <div class="section-title" style="margin-bottom:14px">เพิ่ม ${esc(cat.name)}</div>
      <div class="field-label">จำนวนเงิน (฿)</div><input class="input data" placeholder="0" style="margin-bottom:12px">
      <div class="field-label">วันที่</div><input class="input data" type="date" value="2026-06-02" style="margin-bottom:12px">
      <div class="field-label">หมายเหตุ</div><input class="input" placeholder="—" style="margin-bottom:16px">
      <button class="btn btn-primary" style="width:100%">${icon('plus', 18)} บันทึก</button>
    </div>
    ${historyCard(cat)}
  </div>`;
}

function recurringPanel(cat) {
  return `<div class="grid" style="grid-template-columns:minmax(280px,330px) minmax(0,1fr)">
    <div class="card card-pad" style="align-self:start;border-top:3px solid ${cat.color}">
      <div class="row" style="gap:9px;margin-bottom:6px"><span style="color:${cat.color}">${icon(cat.icon, 20)}</span><div class="section-title">${esc(cat.name)} — รายเดือน</div></div>
      <div class="section-sub">คิดเป็นค่าใช้จ่ายทุกเดือนอัตโนมัติ จนกว่าจะปรับค่า</div>
      <div class="field-label">ยอดต่อเดือน (฿)</div>
      <input class="input data" value="${cat.monthly || 0}" style="margin-bottom:12px;font-size:18px">
      <button class="btn btn-primary" style="width:100%">${icon('check', 18)} อัปเดตยอดรายเดือน</button>
      <div class="locked" style="margin-top:12px;border-left-color:${cat.color}">${icon('refresh', 14)} <span>ระบบลงค่าใช้จ่ายนี้ให้ทุกเดือนอัตโนมัติ</span></div>
    </div>
    ${historyCard(cat)}
  </div>`;
}

function wagePanel() {
  const ppl = state.db.payroll;
  const monthlyTotal = ppl.filter((p) => p.active).reduce((s, p) => s + (p.type === 'monthly' ? p.amount : p.amount * 26), 0);
  return `<div class="card card-pad" style="border-top:3px solid var(--basil-600)">
    <div class="row" style="justify-content:space-between;margin-bottom:6px"><div class="section-title">ค่าแรงรายคน</div><span class="pill pill-gray">รวม ~${baht(monthlyTotal)}/เดือน</span></div>
    <div class="section-sub">เงินเดือน = คิดทุกเดือนคงที่ · รายวัน = ไม่คิดวันลา/ร้านหยุด และหยุดจ่ายเมื่อลาออก</div>
    <table class="tbl tbl-stack">
      <thead><tr><th>พนักงาน</th><th>ประเภท</th><th style="text-align:right">อัตรา (฿)</th><th style="text-align:right">ต่อเดือน (ประมาณ)</th><th>สถานะ</th><th></th></tr></thead>
      <tbody>${ppl.map((p) => `<tr style="${p.active ? '' : 'opacity:.5'}">
        <td class="li-t">${esc(p.name)}</td>
        <td data-label="ประเภท"><select class="input" style="padding:6px 8px;min-width:110px"><option ${p.type === 'monthly' ? 'selected' : ''}>เงินเดือน</option><option ${p.type === 'daily' ? 'selected' : ''}>รายวัน</option></select></td>
        <td data-label="อัตรา" style="text-align:right"><input class="input data" value="${p.amount}" style="width:96px;text-align:right;padding:6px"><span class="stk-note"> /${p.type === 'monthly' ? 'ด.' : 'วัน'}</span></td>
        <td data-label="ต่อเดือน" class="num data" style="font-weight:600">${baht(p.type === 'monthly' ? p.amount : p.amount * 26)}</td>
        <td data-label="สถานะ">${p.active ? '<span class="pill pill-green">ทำงาน</span>' : '<span class="pill pill-gray">ลาออก</span>'}</td>
        <td data-label="" style="text-align:right"><button class="btn btn-ghost btn-sm">${icon('edit', 15)}</button></td></tr>`).join('')}</tbody>
    </table>
    <button class="btn btn-outline btn-sm" style="margin-top:12px">${icon('plus', 15)} เพิ่มพนักงาน</button>
    <div style="margin-top:10px">${mockTag('รายวันคิดตามวันมาทำงานจริง (เชื่อมหน้าวันลา)')}</div>
  </div>`;
}

function itemizedPanel(cat) {
  const items = state.db.expenseItems.filter((i) => i.catId === cat.id);
  const groups = [];
  items.forEach((it) => { const k = it.group || ''; let g = groups.find((x) => x.name === k); if (!g) { g = { name: k, items: [] }; groups.push(g); } g.items.push(it); });

  const itemRow = (it) => `<tr class="it-row">
    <td>${esc(it.name)}${it.stockItemId === null && cat.linksStock ? '<span class="pill pill-orange stk-tag" title="ยังไม่มีในสต็อก — จะถูกเพิ่มให้">ใหม่</span>' : ''}</td>
    <td data-label="ราคา/หน่วย"><div class="row" style="gap:3px;justify-content:flex-end"><span class="stk-note">฿</span><input class="input data it-price" value="${it.unitPrice}" style="width:62px;text-align:right;padding:6px"><span class="stk-note">/</span><input class="input it-unit" value="${esc(it.unit)}" style="width:56px;padding:6px;font-size:12px"></div></td>
    <td data-label="จำนวน" style="text-align:center"><input class="input data it-qty" placeholder="0" inputmode="decimal" style="width:70px;text-align:right;padding:6px"></td>
    <td data-label="เป็นเงิน" class="num data it-amt" style="font-weight:600;color:var(--basil-700)">—</td>
    <td data-label="VAT" style="text-align:center"><input type="checkbox" ${it.vat ? 'checked' : ''} title="มี VAT (เคลมภาษีซื้อ)"></td>
  </tr>`;

  const empty = items.length === 0;
  return `<div class="card card-pad" style="border-top:3px solid ${cat.color}">
    <div class="row" style="justify-content:space-between;margin-bottom:6px"><div class="section-title">${esc(cat.name)}</div>
      ${cat.linksStock ? `<span class="pill pill-green">${icon('boxes', 13)} เข้าสต็อกอัตโนมัติ</span>` : ''}</div>
    <div class="section-sub">ราคา + หน่วย <b>กรอกอิสระ</b> (ใส่เท่าไร/หน่วยอะไรก็ได้) แล้ว<b>ค้างเป็น default</b> ไม่ต้องกรอกใหม่ทุกรอบ · กรอกแค่จำนวน → คูณให้อัตโนมัติ · ✓ = มี VAT</div>
    <table class="tbl tbl-stack">
      <thead><tr><th>รายการ</th><th style="text-align:right">ราคา / หน่วย</th><th style="text-align:center">จำนวน</th><th style="text-align:right">เป็นเงิน</th><th style="text-align:center">VAT</th></tr></thead>
      <tbody>${empty ? '' : groups.map((g) => `${g.name ? `<tr class="hb-grouprow"><td colspan="5">${esc(g.name)}</td></tr>` : ''}${g.items.map(itemRow).join('')}`).join('')}</tbody>
    </table>
    ${empty ? '<div class="empty">ยังไม่มีรายการ — กดเพิ่มรายการเพื่อเริ่ม</div>' : ''}
    <button class="btn btn-outline btn-sm" style="margin-top:12px" data-additem="${cat.id}">${icon('plus', 15)} เพิ่มรายการ</button>
    <div class="row" style="justify-content:space-between;margin-top:14px;padding-top:14px;border-top:1.5px solid var(--line)">
      <div>${cat.linksStock ? `<span class="stk-note">${icon('boxes', 13)} จำนวนที่กรอกจะถูกบวกเข้าสต็อก (รายการใหม่จะถูกสร้างให้)</span>` : ''}</div>
      <div class="row" style="gap:14px"><div style="text-align:right"><div class="li-s">รวมรอบนี้</div><div class="data" id="it-total" style="font-size:24px;font-weight:600;color:var(--basil-700)">฿0</div></div>
      <button class="btn btn-primary" style="height:46px">${icon('check', 18)} บันทึก</button></div>
    </div>
    <div style="margin-top:10px">${mockTag(cat.linksStock ? 'บันทึก + บวกเข้าสต็อก · ราคา/หน่วยจำเป็น default (รอบ inline CRUD)' : 'บันทึก · ราคา/หน่วยจำเป็น default')}</div>
  </div>`;
}

function historyCard(cat) {
  const rows = state.db.expenses.filter((e) => e.catId === cat.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = rows.reduce((s, e) => s + e.amount, 0);
  return `<div class="card card-pad">
    <div class="row" style="justify-content:space-between;margin-bottom:6px"><div class="section-title">ประวัติ ${esc(cat.name)}</div><span class="pill pill-gray">รวม ${baht(total)}</span></div>
    ${mockTag('บันทึก/แก้ไขจริงในรอบ inline CRUD')}
    <table class="tbl tbl-stack" style="margin-top:12px">
      <thead><tr><th>วันที่</th><th>หมายเหตุ</th><th>ผู้บันทึก</th><th style="text-align:right">จำนวน</th><th></th></tr></thead>
      <tbody>${rows.map((e) => `<tr><td class="data">${e.date}</td><td data-label="หมายเหตุ">${esc(e.note) || '<span style="color:var(--ink-3)">—</span>'}</td><td data-label="ผู้บันทึก">${esc(state.db.users.find((u) => u.id === e.by)?.name || '')}</td><td data-label="จำนวน" class="num data" style="font-weight:600">${baht(e.amount)}</td><td data-label="" style="text-align:right"><button class="btn btn-ghost btn-sm">${icon('edit', 15)}</button></td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">ยังไม่มีรายการ</div></td></tr>'}</tbody>
    </table>
  </div>`;
}
