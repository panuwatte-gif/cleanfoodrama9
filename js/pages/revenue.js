/* ============================================================
   pages/revenue.js — บันทึกรายได้ + ปฏิทินย้อนหลัง
   เลือกวันจากปฏิทิน → ดู/แก้ไขข้อมูลของวันนั้น (ย้อนหลังได้)
   ตารางคำนวณกำไรแสดงเฉพาะเจ้าของ
   ============================================================ */
import { state } from '../state.js';
import { can } from '../auth.js';
import { pageHead, baht, esc, lockedNote, barChart, mockTag, icon } from '../components.js';

let selDate = '2026-05-31';
let calMonth = '2026-05'; // YYYY-MM ที่ปฏิทินกำลังโชว์

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const fmtThai = (iso) => { const [y, m, d] = iso.split('-'); return `${+d} ${TH_MONTHS[+m - 1]} ${y}`; };

function calendar() {
  const [y, m] = calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const startDow = first.getDay(); // 0=อา
  const days = new Date(y, m, 0).getDate();
  const recorded = new Set(state.db.revenue.map((r) => r.date));
  const dow = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div></div>';
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const has = recorded.has(iso);
    const sel = iso === selDate;
    cells += `<button class="cal-day ${sel ? 'sel' : ''} ${has ? 'has' : ''}" data-day="${iso}">${d}${has ? '<span class="cal-dot"></span>' : ''}</button>`;
  }

  return `<div class="card card-pad" style="margin-bottom:18px">
    <div class="row" style="justify-content:space-between;margin-bottom:12px">
      <div class="section-title">${icon('calendar', 18)} ปฏิทินรายได้</div>
      <div class="row" style="gap:6px">
        <button class="btn btn-ghost btn-sm" data-mon="-1">${icon('chevronLeft', 16)}</button>
        <span class="data" style="font-weight:600;min-width:96px;text-align:center">${TH_MONTHS[m - 1]} ${y}</span>
        <button class="btn btn-ghost btn-sm" data-mon="1">${icon('chevronRight', 16)}</button>
      </div>
    </div>
    <div class="cal-grid cal-dow">${dow.map((d) => `<div class="cal-h">${d}</div>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
    <div class="row" style="gap:14px;margin-top:12px;flex-wrap:wrap">
      <span class="stk-note"><span class="cal-dot" style="position:static;display:inline-block;margin-right:5px"></span>วันที่มีบันทึกแล้ว</span>
      <span class="stk-note">แตะวันเพื่อดู/แก้ไขย้อนหลัง</span>
    </div>
  </div>`;
}

export default {
  render() {
    const stores = state.db.stores.filter((s) => s.status === 'active');
    const fin = state.config.finance;
    const effectiveGp = fin.includeVatInGp ? (fin.gpPercent + fin.gpPercent * fin.vatPercent / 100).toFixed(1) : fin.gpPercent;
    const recOf = (sid) => state.db.revenue.find((x) => x.storeId === sid && x.date === selDate) || { gross: 0, fees: 0, net: 0 };
    const hasData = state.db.revenue.some((r) => r.date === selDate);

    const cards = stores.map((s) => {
      const r = recOf(s.id);
      return `<div class="card card-pad">
        <div class="row" style="justify-content:space-between;margin-bottom:14px">
          <div class="row"><span style="width:40px;height:40px;border-radius:12px;background:var(--sage-100);color:var(--basil-700);display:grid;place-items:center">${icon('store', 20)}</span>
            <div><div class="li-t">${esc(s.short)}</div><div class="li-s">${fmtThai(selDate)}</div></div></div>
          ${hasData ? '<span class="pill pill-green">มีข้อมูล</span>' : '<span class="pill pill-gray">ยังว่าง</span>'}
        </div>
        ${[['ยอดขายสุทธิ', r.net], ['รายได้', r.gross], ['หักเงิน (ค่าฟี)', r.fees]].map(([lbl, val]) => `
          <div class="field-label">${lbl}</div>
          <input class="input data" style="margin-bottom:12px" value="${val ? baht(val) : ''}" placeholder="0">
        `).join('')}
      </div>`;
    }).join('');

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'บันทึกรายได้ & ค่าธรรมเนียม', desc: 'เลือกวันจากปฏิทินเพื่อดู/แก้ไขย้อนหลัง · กรอกแยกตามร้าน · ตารางคำนวณกำไรแสดงเฉพาะเจ้าของ', actions: `<button class="btn btn-primary">${icon('check', 18)} บันทึก ${fmtThai(selDate)}</button>` })}

      ${calendar()}

      <div class="locked" style="margin-bottom:18px;border-left-color:var(--carrot)">${icon('refresh', 16)} <span>กำลังดู/แก้ไขข้อมูลของ <b>${fmtThai(selDate)}</b> — แตะวันอื่นในปฏิทินเพื่อย้อนหลัง</span></div>

      <div class="grid cols-3" style="margin-bottom:22px">${cards}</div>

      <div class="card card-pad" style="margin-bottom:22px">
        <div class="overline">Year to date</div>
        <div class="section-title" style="margin-bottom:14px">รายได้แยกตามร้าน</div>
        ${barChart(stores.map((s) => ({ label: s.short, value: state.db.revenue.filter((r) => r.storeId === s.id).reduce((a, r) => a + r.gross, 0) * 40 })), baht)}
      </div>

      ${can.viewFinance() ? `
      <div class="card card-pad owner-only">
        <div class="row" style="justify-content:space-between;margin-bottom:6px">
          <div><div class="overline" style="color:var(--riceberry)">เฉพาะเจ้าของ</div><div class="section-title">ตารางรายได้ · ต้นทุน · กำไร</div></div>
          <span class="pill pill-purple">${icon('lock', 13)} Owner</span>
        </div>
        <div class="row" style="gap:18px;flex-wrap:wrap;margin:14px 0">
          <div><div class="li-s">GP</div><div class="data" style="font-size:22px;font-weight:600">${fin.gpPercent}%</div></div>
          <div><div class="li-s">รวม VAT ${fin.vatPercent}%</div><div class="data" style="font-size:22px;font-weight:600;color:var(--basil-700)">${effectiveGp}%</div></div>
        </div>
        <div class="tbl-scroll"><table class="tbl tbl-stack">
          <thead><tr><th>วันที่</th><th style="text-align:right">รายได้</th><th style="text-align:right">ค่าฟี</th><th style="text-align:right">ต้นทุน (GP)</th><th style="text-align:right">กำไรขั้นต้น</th></tr></thead>
          <tbody>${state.db.revenue.map((r) => { const cost = Math.round(r.gross * fin.gpPercent / 100); return `<tr>
            <td>${fmtThai(r.date)}</td>
            <td data-label="รายได้" class="num data">${baht(r.gross)}</td><td data-label="ค่าฟี" class="num data" style="color:var(--chili)">−${baht(r.fees)}</td>
            <td data-label="ต้นทุน" class="num data">${baht(cost)}</td><td data-label="กำไรขั้นต้น" class="num data" style="color:var(--basil-700);font-weight:600">${baht(r.net - cost)}</td></tr>`; }).join('')}</tbody>
        </table></div>
        <div style="margin-top:12px">${mockTag('ต่อสูตรงบกำไรขาดทุน + ภาษีในหน้าแสดงผล')}</div>
      </div>` : lockedNote('ตารางคำนวณกำไร/ต้นทุน/GP แสดงเฉพาะเจ้าของ — คุณกรอกยอดได้ตามปกติ')}
    </div>`;
  },

  mount(ctx) {
    document.querySelectorAll('[data-day]').forEach((el) => el.addEventListener('click', () => { selDate = el.dataset.day; ctx.refresh(); }));
    document.querySelectorAll('[data-mon]').forEach((el) => el.addEventListener('click', () => {
      const [y, m] = calMonth.split('-').map(Number);
      const nm = m + Number(el.dataset.mon);
      const ny = y + Math.floor((nm - 1) / 12);
      const mm = ((nm - 1) % 12 + 12) % 12 + 1;
      calMonth = `${ny}-${String(mm).padStart(2, '0')}`;
      ctx.refresh();
    }));
  },
};
