/* ============================================================
   crud.js — เครื่องมือ inline CRUD ใช้ร่วมทั้งแอป
   - modal ฟอร์มเพิ่ม/แก้ (openForm)
   - ยืนยันลบ (confirmDelete)
   - helper จัดการ array ใน state.db + persist + notify
   - เลื่อนลำดับ (moveItem)
   ============================================================ */
import { state, notify } from './state.js';
import { persist } from './storage.js';
import { esc, icon } from './components.js';

export const genId = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e3)}`;

// บันทึก + แจ้ง re-render
export function commit() { persist(); notify(); }

/* ---------- array helpers (db[coll] = array) ---------- */
export function addRow(coll, row) { state.db[coll].push(row); commit(); return row; }
export function updateRow(coll, id, patch) {
  const r = state.db[coll].find((x) => x.id === id);
  if (r) Object.assign(r, patch);
  commit();
  return r;
}
export function removeRow(coll, id) {
  const i = state.db[coll].findIndex((x) => x.id === id);
  if (i >= 0) state.db[coll].splice(i, 1);
  commit();
}
// เลื่อนลำดับภายในกลุ่ม (อิง field order) — dir: -1 ขึ้น / +1 ลง
export function moveItem(coll, id, dir, sameGroup = () => true) {
  const arr = state.db[coll];
  const item = arr.find((x) => x.id === id);
  if (!item) return;
  const peers = arr.filter((x) => sameGroup(x, item)).sort((a, b) => (a.order || 0) - (b.order || 0));
  const idx = peers.findIndex((x) => x.id === id);
  const swap = peers[idx + dir];
  if (!swap) return;
  const t = item.order; item.order = swap.order; swap.order = t;
  commit();
}

/* ---------- modal form ----------
   fields: [{ key, label, type, options?, value?, placeholder?, hint? }]
   type: text | number | select | checkbox | color | multiselect
   onSave(values) → return false to keep open
*/
export function openForm({ title, fields, values = {}, submitLabel = 'บันทึก', onSave }) {
  closeModal();
  const ov = document.createElement('div');
  ov.className = 'modal-ov';
  ov.innerHTML = `<div class="modal-card" role="dialog">
    <div class="modal-head"><div class="modal-title">${esc(title)}</div><button class="modal-x" data-x>${icon('x', 20)}</button></div>
    <div class="modal-body">${fields.map((f) => fieldHtml(f, values[f.key] ?? f.value)).join('')}</div>
    <div class="modal-foot"><button class="btn btn-ghost" data-x>ยกเลิก</button><button class="btn btn-primary" data-save>${icon('check', 18)} ${esc(submitLabel)}</button></div>
  </div>`;
  document.body.appendChild(ov);

  const collect = () => {
    const out = {};
    fields.forEach((f) => {
      const el = ov.querySelector(`[data-k="${f.key}"]`);
      if (!el) return;
      if (f.type === 'checkbox') out[f.key] = el.checked;
      else if (f.type === 'number') out[f.key] = el.value === '' ? null : parseFloat(el.value);
      else if (f.type === 'multiselect') out[f.key] = [...ov.querySelectorAll(`[data-multi="${f.key}"]:checked`)].map((x) => x.value);
      else out[f.key] = el.value;
    });
    return out;
  };
  const save = () => { const v = collect(); if (onSave(v) !== false) closeModal(); };
  ov.querySelectorAll('[data-x]').forEach((b) => b.addEventListener('click', closeModal));
  ov.querySelector('[data-save]').addEventListener('click', save);
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) closeModal(); });
  setTimeout(() => ov.querySelector('input,select')?.focus(), 40);
  ov.querySelectorAll('input').forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && el.type !== 'checkbox') save(); }));
}

function fieldHtml(f, val) {
  const label = `<label class="field-label">${esc(f.label)}</label>`;
  let input = '';
  if (f.type === 'select') {
    input = `<select class="input" data-k="${f.key}">${f.options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(val) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  } else if (f.type === 'checkbox') {
    return `<label class="row" style="gap:9px;cursor:pointer;margin-bottom:14px"><input type="checkbox" data-k="${f.key}" ${val ? 'checked' : ''}> <span class="field-label" style="margin:0">${esc(f.label)}</span></label>`;
  } else if (f.type === 'multiselect') {
    input = `<div class="row" style="gap:8px;flex-wrap:wrap">${f.options.map((o) => `<label class="chip" style="cursor:pointer;display:inline-flex;gap:6px;align-items:center"><input type="checkbox" data-multi="${f.key}" value="${esc(o.value)}" ${(val || []).map(String).includes(String(o.value)) ? 'checked' : ''}> ${esc(o.label)}</label>`).join('')}</div>`;
  } else if (f.type === 'color') {
    input = `<div class="row" style="gap:8px;flex-wrap:wrap" data-k="${f.key}-wrap">${f.options.map((c) => `<button type="button" class="swatch" data-swatch="${f.key}" data-val="${c}" style="width:30px;height:30px;border-radius:8px;background:${c};border:2px solid ${String(c) === String(val) ? 'var(--ink)' : 'transparent'}"></button>`).join('')}<input type="hidden" data-k="${f.key}" value="${esc(val || f.options[0])}"></div>`;
  } else {
    input = `<input class="input ${f.type === 'number' ? 'data' : ''}" type="${f.type === 'number' ? 'number' : 'text'}" data-k="${f.key}" value="${val != null ? esc(val) : ''}" placeholder="${esc(f.placeholder || '')}">`;
  }
  return `<div class="modal-field">${label}${input}${f.hint ? `<div class="stk-note" style="margin-top:5px">${esc(f.hint)}</div>` : ''}</div>`;
}

export function closeModal() {
  const ov = document.querySelector('.modal-ov');
  if (ov) ov.remove();
}

// delegate สำหรับ color swatch
document.addEventListener('click', (e) => {
  const sw = e.target.closest('[data-swatch]');
  if (!sw) return;
  const wrap = sw.closest('[data-k$="-wrap"]') || sw.parentElement;
  wrap.querySelectorAll('[data-swatch]').forEach((b) => { b.style.border = '2px solid transparent'; });
  sw.style.border = '2px solid var(--ink)';
  wrap.querySelector(`[data-k="${sw.dataset.swatch}"]`).value = sw.dataset.val;
});

export function confirmDelete(msg, onYes) {
  closeModal();
  const ov = document.createElement('div');
  ov.className = 'modal-ov';
  ov.innerHTML = `<div class="modal-card" style="max-width:380px">
    <div class="modal-head"><div class="modal-title">ยืนยันการลบ</div><button class="modal-x" data-x>${icon('x', 20)}</button></div>
    <div class="modal-body"><div style="color:var(--ink-2);font-size:14.5px;line-height:1.6">${esc(msg)}</div></div>
    <div class="modal-foot"><button class="btn btn-ghost" data-x>ยกเลิก</button><button class="btn btn-danger" data-yes>${icon('trash', 16)} ลบ</button></div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelectorAll('[data-x]').forEach((b) => b.addEventListener('click', closeModal));
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) closeModal(); });
  ov.querySelector('[data-yes]').addEventListener('click', () => { onYes(); closeModal(); });
}
