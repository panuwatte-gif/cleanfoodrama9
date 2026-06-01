/* ============================================================
   pages/revenue.js — ฟังก์ชัน 4: บันทึกรายได้ + หักค่าธรรมเนียม
   พนักงานกรอกได้ · ตารางคำนวณการเงินแสดงเฉพาะเจ้าของ
   ============================================================ */
import { state } from '../state.js';
import { can } from '../auth.js';
import { pageHead, baht, esc, lockedNote, barChart, mockTag, icon } from '../components.js';

export default {
  render() {
    const stores = state.db.stores;
    const rev = state.db.revenue;
    const fin = state.config.finance;
    const effectiveGp = fin.includeVatInGp ? (fin.gpPercent + fin.gpPercent * fin.vatPercent / 100).toFixed(1) : fin.gpPercent;

    const cards = stores.map((s) => {
      const r = rev.find((x) => x.storeId === s.id) || { gross: 0, fees: 0, net: 0 };
      const planned = s.status !== 'active';
      return `<div class="card card-pad" style="${planned ? 'opacity:.6' : ''}">
        <div class="row" style="justify-content:space-between;margin-bottom:14px">
          <div class="row"><span style="width:40px;height:40px;border-radius:12px;background:var(--sage-100);color:var(--basil-700);display:grid;place-items:center">${icon('store', 20)}</span>
            <div><div class="li-t">${esc(s.short)}</div><div class="li-s">${planned ? 'เตรียมเปิด' : 'วันนี้'}</div></div></div>
          ${planned ? '<span class="pill pill-gray">standby</span>' : '<span class="pill pill-green">active</span>'}
        </div>
        ${['ยอดขายสุทธิ', 'รายได้', 'หักเงิน'].map((lbl, i) => `
          <div class="field-label">${lbl}</div>
          <input class="input data" style="margin-bottom:12px" value="${i === 0 ? baht(r.net) : i === 1 ? baht(r.gross) : baht(r.fees)}" ${planned ? 'disabled' : ''}>
        `).join('')}
      </div>`;
    }).join('');

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'บันทึกรายได้ & ค่าธรรมเนียม', desc: 'พนักงานกรอกข้อมูลประจำวันแยกตามร้าน · เลือกวันที่/บันทึกย้อนหลัง/แก้ไขได้ · ตารางคำนวณกำไรแสดงเฉพาะเจ้าของ', actions: `<div class="topbar-search" style="margin:0;width:auto;padding:7px 14px">${icon('calendar', 16)}<input type="date" value="2026-05-31" style="border:none;outline:none;background:none;font-family:var(--font-mono);color:var(--ink)"></div><button class="btn btn-primary">${icon('check', 18)} บันทึก</button>` })}

      <div class="locked" style="margin-bottom:18px;border-left-color:var(--carrot)">${icon('refresh', 16)} <span>กำลังแก้ไขข้อมูลของ <b>31 พ.ค. 2026</b> — เลือกวันอื่นด้านบนเพื่อบันทึก/แก้ไขย้อนหลัง</span></div>

      <div class="grid cols-3" style="margin-bottom:22px">${cards}
        <div class="card card-pad" style="border-style:dashed;display:grid;place-items:center;text-align:center;color:var(--ink-3);cursor:pointer">
          <div>${icon('plus', 26)}<div class="li-t" style="margin-top:6px">เพิ่มร้าน</div><div class="li-s">รองรับหลายร้าน</div></div>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:22px">
        <div class="overline">Year to date</div>
        <div class="section-title" style="margin-bottom:14px">รายได้แยกตามร้าน</div>
        ${barChart([
          { label: 'พระราม 9', value: 2083000 }, { label: 'ร้านที่ 2', value: 0, alt: true },
        ], baht)}
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
          <div><div class="li-s">ค่าน้ำ</div><div class="data" style="font-size:22px;font-weight:600">${baht(fin.utilities.water)}</div></div>
          <div><div class="li-s">ค่าไฟ</div><div class="data" style="font-size:22px;font-weight:600">${baht(fin.utilities.electricity)}</div></div>
        </div>
        <table class="tbl">
          <thead><tr><th>ร้าน</th><th style="text-align:right">รายได้</th><th style="text-align:right">ค่าฟี</th><th style="text-align:right">ต้นทุน (GP)</th><th style="text-align:right">กำไรขั้นต้น</th></tr></thead>
          <tbody>${rev.map((r) => { const cost = Math.round(r.gross * fin.gpPercent / 100); return `<tr>
            <td>${esc(state.db.stores.find((s) => s.id === r.storeId)?.short || '')}</td>
            <td class="num data">${baht(r.gross)}</td><td class="num data" style="color:var(--chili)">−${baht(r.fees)}</td>
            <td class="num data">${baht(cost)}</td><td class="num data" style="color:var(--basil-700);font-weight:600">${baht(r.net - cost)}</td></tr>`; }).join('')}</tbody>
        </table>
        <div style="margin-top:12px">${mockTag('ต่อสูตรงบกำไรขาดทุน + ภาษีในฟังก์ชัน 4/9')}</div>
      </div>` : lockedNote('ตารางคำนวณกำไร/ต้นทุน/GP แสดงเฉพาะเจ้าของ — คุณกรอกยอดได้ตามปกติ')}
    </div>`;
  },
};
