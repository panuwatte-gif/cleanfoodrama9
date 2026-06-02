/* ============================================================
   pages/stock.js — นับสต็อก + พยากรณ์ + inline CRUD
   อ่านทะเบียนกลางผ่าน menu.js → รายการตรงกันทั้งแอป
   เพิ่ม/แก้/ลบ/สลับลำดับ ได้ในหน้านี้ (จำกัดสิทธิ์ตามหมวด)
   ============================================================ */
import { state } from '../state.js';
import { can } from '../auth.js';
import { pageHead, num, esc, icon } from '../components.js';
import { categories, category, itemsInCategory, foodByProtein, itemsBySubcat, itemsByRawSub, proteinGroups } from '../menu.js';
import { openForm, confirmDelete, addRow, updateRow, removeRow, moveItem, commit, genId } from '../crud.js';

let activeCat = null;

const storeOpts = () => state.db.stores.map((s) => ({ value: s.id, label: s.short }));
const multiStore = () => state.db.stores.length > 1;
const perishOpts = () => state.config.perishLevels.map((l) => ({ value: l.level, label: `${l.level} · ${l.label}` }));

export default {
  render() {
    const cats = categories();
    if (!activeCat || !category(activeCat)) activeCat = cats[0].id;
    const cat = category(activeCat);
    const editable = can.editCategory(cat);
    const dates = Object.keys(state.db.stockCounts).sort().reverse();
    const today = state.db.stockCounts[dates[0]] || {};
    const yest = state.db.stockCounts[dates[1]] || {};
    const levels = state.config.perishLevels;
    const perishOf = (id) => levels.find((l) => l.level === (state.db.stockPerish[id] || 1)) || levels[0];

    // แถวรายการ (+ ปุ่มจัดการเมื่อมีสิทธิ์)
    const itemRow = (it) => {
      const tv = today[it.id], yv = yest[it.id];
      const sold = (yv != null && tv != null) ? (yv - tv) : null;
      const fc = sold != null ? sold * 1.15 : null;
      const daysLeft = (fc && fc > 0 && tv != null) ? (tv / fc).toFixed(1) : null;
      const pl = perishOf(it.id);
      const storeTag = (multiStore() && it.stores && it.stores.length < state.db.stores.length)
        ? `<span class="stk-note">${it.stores.map((sid) => state.db.stores.find((s) => s.id === sid)?.short).filter(Boolean).join(', ')}</span>` : '';
      return `<div class="stk-row">
        <span class="perish-dot" title="${esc(pl.label)} (~${pl.shelfDays} วัน)" style="background:${pl.color}"></span>
        <span class="stk-name">${esc(it.name)}${it.madeInHouse ? '<span class="pill pill-purple stk-tag">ทำเอง</span>' : ''}${it.note ? `<span class="stk-note">${esc(it.note)}</span>` : ''}${storeTag}</span>
        <span class="stk-stat">${tv != null ? `คงเหลือ <b class="data">${num(tv)}</b>` : '<span style="color:var(--ink-3)">—</span>'}${daysLeft != null ? ` · พอใช้ <b class="data" style="color:${daysLeft < 2 ? 'var(--chili)' : 'var(--basil-700)'}">${daysLeft} วัน</b>` : ''}</span>
        <input class="input stk-input data" placeholder="${tv != null ? num(tv) : '0'}" inputmode="decimal">
        ${editable ? `<span class="stk-manage"><span class="ord-btns"><button data-up="${it.id}" style="transform:rotate(180deg)">${icon('chevronDown', 12)}</button><button data-down="${it.id}">${icon('chevronDown', 12)}</button></span>
          <button class="btn btn-ghost btn-sm" data-edit="${it.id}">${icon('edit', 14)}</button>
          <button class="btn btn-ghost btn-sm" data-del="${it.id}" style="color:var(--chili)">${icon('trash', 14)}</button></span>` : ''}
      </div>`;
    };

    const card = (title, sub, groups, accent, addCtx) => {
      const count = groups.reduce((s, g) => s + g.items.length, 0);
      return `<div class="card card-pad" style="border-top:3px solid ${accent}">
        <div class="row" style="justify-content:space-between;margin-bottom:4px">
          <div class="section-title">${esc(title)}</div><span class="pill pill-gray">${count} รายการ</span>
        </div>
        ${sub ? `<div class="section-sub" style="margin-bottom:12px">${esc(sub)}</div>` : '<div style="height:8px"></div>'}
        ${groups.map((g) => `${g.label ? `<div class="stk-grouplbl">${esc(g.label)}</div>` : ''}${g.items.map(itemRow).join('')}`).join('')}
        ${editable ? `<button class="btn btn-ghost btn-sm stk-add" data-add='${esc(JSON.stringify(addCtx))}'>${icon('plus', 14)} เพิ่มรายการ</button>` : ''}
      </div>`;
    };

    let body = '';
    if (cat.layout === 'spice') {
      const normal = foodByProtein(cat.id, 'spicy').map((g) => ({ label: g.group.label, items: g.items }));
      const nospice = foodByProtein(cat.id, 'noSpice').map((g) => ({ label: g.group.label, items: g.items }));
      body = `<div class="grid cols-2">
        ${card('รสชาติปกติ', 'เผ็ด · ใส่พริกและกระเทียม', normal, 'var(--chili)', { cat: cat.id, variant: 'spicy' })}
        ${card('ไม่เผ็ด / ไม่พริก / ไม่กระเทียม', 'ตัดพริกและกระเทียมออกทั้งหมด', nospice, 'var(--basil-600)', { cat: cat.id, variant: 'noSpice' })}
      </div>`;
    } else if (cat.layout === 'subcat') {
      const grps = itemsBySubcat(cat.id);
      body = `<div class="grid cols-2">${grps.map((g) => card(g.sub.name, null, [{ label: '', items: g.items }], 'var(--info)', { cat: cat.id, sub: g.sub.id })).join('')}</div>`;
    } else {
      const rawGroups = itemsByRawSub(cat.id);
      const groups = rawGroups.length > 1 || (rawGroups[0] && rawGroups[0].name)
        ? rawGroups.map((g) => ({ label: g.name, items: g.items }))
        : [{ label: '', items: itemsInCategory(cat.id) }];
      body = card(cat.name, `หน่วย ${cat.unit}`, groups, cat.color, { cat: cat.id, flat: true });
    }

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'นับสต็อก & พยากรณ์', desc: 'กรอกจำนวนคงเหลือวันนี้ ระบบคำนวณยอดขาย พยากรณ์ และประเมินว่าพอใช้อีกกี่วัน', actions: `<button class="btn btn-outline btn-sm">${icon('refresh', 16)} ประวัติ</button><button class="btn btn-sm" style="background:#06c755;color:#fff" id="send-line">${icon('send', 16)} ส่ง LINE</button><button class="btn btn-primary">${icon('check', 18)} บันทึก</button>` })}

      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:18px">
        ${cats.map((c) => `<button class="chip ${c.id === activeCat ? 'active' : ''}" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}
        <button class="chip" style="border-style:dashed" id="add-cat">${icon('plus', 15)} เพิ่มหมวด</button>
      </div>

      ${editable ? `<div class="locked" style="margin-bottom:16px;border-left-color:var(--basil-600)">${icon('sliders', 16)} <span>โหมดจัดการ: เพิ่ม/แก้/ลบ/สลับลำดับ ได้เลย · ${cat.editScope === 'champ' ? 'หมวดนี้เฉพาะแชมป์แก้ได้' : 'สาขาแก้ได้เอง'} · เชื่อมกับ คู่มือ · ส่ง/รับของ · ต้นทุนอาหาร</span></div>`
        : `<div class="locked" style="margin-bottom:16px">${icon('lock', 16)} <span>หมวดนี้แก้ได้เฉพาะแชมป์ — คุณกรอกจำนวนได้ตามปกติ</span></div>`}

      ${body}

      <div class="grid cols-3" style="margin-top:18px">
        <div class="card card-pad"><div class="overline">น้ำหนักถ่วง</div><div class="section-title" style="margin:4px 0 10px">ค่าจาก ตั้งค่า</div>
          <div class="row" style="gap:6px">${state.config.forecast.weights.map((w, i) => `<span class="pill ${i === 0 ? 'pill-green' : 'pill-gray'}">${w}</span>`).join('')}</div>
          <div class="stk-note" style="margin-top:10px">วันใกล้ปัจจุบันน้ำหนักมากกว่า · เทียบวันเดียวกัน</div>
        </div>
        <div class="card card-pad"><div class="overline">สต็อกต่ำ</div><div class="section-title" style="margin:4px 0 10px">เตือนเมื่อ < ${state.config.forecast.lowStockThresholdPct}%</div>
          <div class="stk-row"><span class="perish-dot" style="background:var(--chili)"></span><span class="stk-name">กะเพราอกไก่สับ</span><span class="stk-stat" style="color:var(--chili)">เหลือ 5 กก.</span></div>
        </div>
        <div class="card card-pad"><div class="overline">ระดับความเสียง่าย</div><div class="section-title" style="margin:4px 0 10px">ปรับเองได้</div>
          ${state.config.perishLevels.map((l) => `<div class="row" style="gap:9px;padding:3px 0"><span class="perish-dot" style="background:${l.color}"></span><span style="flex:1">${esc(l.label)}</span><span class="stk-note">~${l.shelfDays} วัน</span></div>`).join('')}
        </div>
      </div>
    </div>`;
  },

  mount(ctx) {
    document.querySelectorAll('[data-cat]').forEach((el) => el.addEventListener('click', () => { activeCat = el.dataset.cat; ctx.refresh(); }));

    const ln = document.getElementById('send-line');
    if (ln) ln.addEventListener('click', async () => {
      ln.textContent = 'กำลังส่ง…';
      const { notifyChannels } = await import('../api.js');
      await notifyChannels({ subject: 'สรุปสต็อก + พยากรณ์', message: 'รายงานสต็อกประจำวัน' });
      ln.textContent = '✓ ส่งแล้ว';
      setTimeout(() => ctx.refresh(), 1200);
    });

    const cat = category(activeCat);

    // ฟอร์มเพิ่ม/แก้รายการ — ฟิลด์ปรับตาม layout
    const itemFields = (ctxData, it) => {
      const f = [{ key: 'name', label: 'ชื่อรายการ', type: 'text' }];
      if (cat.layout === 'spice') {
        f.push({ key: 'protein', label: 'กลุ่มโปรตีน', type: 'select', options: proteinGroups().map((g) => ({ value: g.id, label: g.label })), value: it?.protein || (ctxData && ctxData.proteinDefault) });
        f.push({ key: 'spicy', label: 'มีสูตรเผ็ด (ใส่พริก+กระเทียม)', type: 'checkbox', value: it ? it.spicy : (ctxData?.variant === 'spicy') });
        f.push({ key: 'noSpice', label: 'มีสูตรไม่เผ็ด', type: 'checkbox', value: it ? it.noSpice : (ctxData?.variant === 'noSpice') });
      } else {
        f.push({ key: 'unit', label: 'หน่วยนับ', type: 'text', value: it?.unit || cat.unit, placeholder: 'เช่น kg / ใบ / ขวด' });
        f.push({ key: 'note', label: 'หมายเหตุ (ถ้ามี)', type: 'text', value: it?.note || '' });
      }
      f.push({ key: 'perish', label: 'ระดับความเสียง่าย', type: 'select', options: perishOpts(), value: it ? (state.db.stockPerish[it.id] || 1) : 1 });
      if (multiStore()) f.push({ key: 'stores', label: 'ขายที่ร้าน', type: 'multiselect', options: storeOpts(), value: it?.stores || state.db.stores.map((s) => s.id), hint: 'เลือกร้านที่มีเมนูนี้' });
      return f;
    };

    // เพิ่มรายการ
    document.querySelectorAll('[data-add]').forEach((el) => el.addEventListener('click', () => {
      const ctxData = JSON.parse(el.dataset.add);
      openForm({
        title: 'เพิ่มรายการใหม่', fields: itemFields(ctxData, null),
        onSave: (v) => {
          if (!v.name) return false;
          const id = genId('it');
          const row = { id, cat: ctxData.cat, name: v.name, order: 99 };
          if (cat.layout === 'spice') { row.protein = v.protein; row.spicy = !!v.spicy; row.noSpice = !!v.noSpice; row.unit = 'kg'; }
          else { row.unit = v.unit || cat.unit; if (v.note) row.note = v.note; }
          if (ctxData.sub) row.sub = ctxData.sub;
          if (multiStore() && v.stores) row.stores = v.stores;
          addRow('stockItems', row);
          state.db.stockPerish[id] = Number(v.perish) || 1; commit();
          ctx.refresh();
        },
      });
    }));

    // แก้รายการ
    document.querySelectorAll('[data-edit]').forEach((el) => el.addEventListener('click', () => {
      const it = state.db.stockItems.find((x) => x.id === el.dataset.edit);
      openForm({
        title: 'แก้ไขรายการ', values: it, fields: itemFields(null, it),
        onSave: (v) => {
          const patch = { name: v.name };
          if (cat.layout === 'spice') { patch.protein = v.protein; patch.spicy = !!v.spicy; patch.noSpice = !!v.noSpice; }
          else { patch.unit = v.unit; patch.note = v.note || undefined; }
          if (multiStore()) patch.stores = v.stores;
          updateRow('stockItems', it.id, patch);
          state.db.stockPerish[it.id] = Number(v.perish) || 1; commit();
          ctx.refresh();
        },
      });
    }));

    // ลบรายการ
    document.querySelectorAll('[data-del]').forEach((el) => el.addEventListener('click', () => {
      const it = state.db.stockItems.find((x) => x.id === el.dataset.del);
      confirmDelete(`ลบ "${it.name}" ออกจากทะเบียนกลาง? (จะหายทุกหน้า)`, () => { removeRow('stockItems', it.id); ctx.refresh(); });
    }));

    // สลับลำดับ (ภายในกลุ่มเดียวกัน: หมวด + โปรตีน + sub)
    const sameGroup = (a, b) => a.cat === b.cat && (a.protein || '') === (b.protein || '') && (a.sub || '') === (b.sub || '');
    document.querySelectorAll('[data-up]').forEach((el) => el.addEventListener('click', () => { moveItem('stockItems', el.dataset.up, -1, sameGroup); ctx.refresh(); }));
    document.querySelectorAll('[data-down]').forEach((el) => el.addEventListener('click', () => { moveItem('stockItems', el.dataset.down, 1, sameGroup); ctx.refresh(); }));

    // เพิ่มหมวด
    document.getElementById('add-cat')?.addEventListener('click', () => openForm({
      title: 'เพิ่มหมวดสต็อก',
      fields: [
        { key: 'name', label: 'ชื่อหมวด', type: 'text', placeholder: 'เช่น ของแห้ง' },
        { key: 'unit', label: 'หน่วยเริ่มต้น', type: 'text', value: 'หน่วย' },
        { key: 'color', label: 'สี', type: 'color', options: ['#2f8f5b', '#e08a3c', '#cf3b2c', '#5e3a63', '#2A6FDB'] },
      ],
      onSave: (v) => {
        if (!v.name) return false;
        const maxOrder = Math.max(0, ...state.db.stockCategories.map((c) => c.order || 0));
        addRow('stockCategories', { id: genId('cat'), name: v.name, icon: 'box', unit: v.unit || 'หน่วย', color: v.color, order: maxOrder + 1, layout: 'flat', editScope: 'staff', fromCentral: false });
        ctx.refresh();
      },
    }));
  },
};
