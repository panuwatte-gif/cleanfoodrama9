/* ============================================================
   pages/handbook.js — ฟังก์ชันใหม่: คู่มือพนักงาน
   แคล/สารอาหาร · FAQ ลูกค้า · ปัญหา&วิธีแก้ · มาตรฐานปริมาณ
   ใครก็เพิ่มได้
   ============================================================ */
import { state } from '../state.js';
import { pageHead, esc, icon } from '../components.js';

let activeSec = 'nutrition';
const SECTIONS = [
  { id: 'nutrition', label: 'แคลอรี่ & สารอาหาร', icon: 'flame', color: 'var(--chili)' },
  { id: 'faq',       label: 'ลูกค้าถามบ่อย',      icon: 'book2', color: 'var(--info)' },
  { id: 'problem',   label: 'ปัญหา & วิธีแก้',     icon: 'alert', color: 'var(--carrot)' },
  { id: 'portion',   label: 'มาตรฐานปริมาณ',      icon: 'target', color: 'var(--basil-600)' },
];

export default {
  render() {
    const entries = state.db.handbook.filter((h) => h.section === activeSec);
    const sec = SECTIONS.find((s) => s.id === activeSec);
    const std = state.config.menu.portionStd;

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'คู่มือพนักงาน', desc: 'ข้อมูลสำคัญหน้างาน · ใครก็เพิ่ม/แก้ได้ เพื่อช่วยกันสะสมความรู้', actions: `<button class="btn btn-primary">${icon('plus', 18)} เพิ่มหัวข้อ</button>` })}

      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:18px">
        ${SECTIONS.map((s) => `<button class="chip ${s.id === activeSec ? 'active' : ''}" data-sec="${s.id}">${esc(s.label)}</button>`).join('')}
      </div>

      ${activeSec === 'portion' ? `<div class="card card-pad" style="margin-bottom:18px;background:var(--sage-100)">
        <div class="overline">มาตรฐานต่อจาน</div>
        <div class="row" style="gap:28px;margin-top:10px;flex-wrap:wrap">
          <div><div class="li-s">ข้าว (มาตรฐาน)</div><div class="data" style="font-size:24px;font-weight:600">${std.rice} g</div></div>
          <div><div class="li-s">เนื้อสัตว์ (มาตรฐาน)</div><div class="data" style="font-size:24px;font-weight:600">${std.protein} g</div></div>
          <div style="border-left:1px solid var(--line-2);padding-left:28px"><div class="li-s">XL</div><div class="data" style="font-size:18px;font-weight:600">ข้าว 220g · เนื้อ 150g</div></div>
          <div><div class="li-s">กุ้งอบเส้นแก้ว (อนาคต)</div><div class="data" style="font-size:18px;font-weight:600">เส้น 200g · กุ้ง 100g</div></div>
        </div>
      </div>` : ''}

      <div class="grid cols-2">
        ${entries.map((e) => `<div class="card card-pad" style="border-left:3px solid ${sec.color}">
          <div class="row" style="justify-content:space-between;align-items:flex-start">
            <div class="li-t">${esc(e.title)}</div>
            <span style="color:${sec.color};flex-shrink:0">${icon(sec.icon, 18)}</span>
          </div>
          <div class="ds-body" style="font-size:14px;margin-top:8px;color:var(--ink-2)">${esc(e.body)}</div>
          <div class="row" style="justify-content:space-between;margin-top:12px;color:var(--ink-3);font-size:11.5px">
            <span>โดย ${esc(state.db.users.find((u) => u.id === e.author)?.name || '')}</span><span>${e.updated}</span>
          </div>
        </div>`).join('') || '<div class="empty card card-pad">ยังไม่มีหัวข้อในหมวดนี้</div>'}
        <div class="card card-pad" style="border-style:dashed;text-align:center;color:var(--ink-3);cursor:pointer;display:grid;place-items:center">
          <div>${icon('plus', 24)}<div class="li-t" style="margin-top:6px">เพิ่มหัวข้อใน "${esc(sec.label)}"</div></div>
        </div>
      </div>
    </div>`;
  },
  mount(ctx) {
    document.querySelectorAll('[data-sec]').forEach((el) => el.addEventListener('click', () => { activeSec = el.dataset.sec; ctx.refresh(); }));
  },
};
