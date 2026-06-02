/* ============================================================
   pages/receiving.js — ส่งของ / รับของ (รื้อใหม่)
   เปิดมาเห็นเมนูทั้งหมด (เผ็ด+ไม่เผ็ด) กรอกทีเดียว · หน่วย กก./กรัม สลับได้
   รายงานสั้น: รอบนี้ตรงมั้ย ใครผิด แก้ได้ · รายละเอียด→หน้าแสดงผล
   ============================================================ */
import { state } from '../state.js';
import { num, esc, mockTag, icon } from '../components.js';
import { itemName } from '../menu.js';
import { foodGrid } from '../foodgrid.js';

let mode = 'send';      // send | receive | summary
let unit = 'kg';        // kg | g  (1 kg = 1000 g)
const KG = 1, G = 1000; // ตัวคูณแปลงหน่วย
const unitLabel = () => (unit === 'kg' ? 'กก.' : 'ก.');

// ตารางเมนูทั้งหมด (โครงเดียวกับหน้าต้นทุนรับอาหาร — ผ่าน foodGrid)
function entryGrid() {
  return foodGrid({
    headCols: () => `<th style="text-align:right">จำนวน</th>`,
    cell: () => `<td data-label="จำนวน" style="text-align:right"><div class="row" style="gap:6px;justify-content:flex-end"><input class="input data" placeholder="0" inputmode="decimal" style="width:84px;text-align:right;padding:6px"><span class="stk-note" style="width:24px">${unitLabel()}</span></div></td>`,
  });
}

export default {
  render() {
    const recs = state.db.receivings;
    const mismatches = recs.filter((r) => !r.received.ok);

    const seg = (id, label) => `<button class="chip ${mode === id ? 'active' : ''}" data-mode="${id}">${esc(label)}</button>`;
    const unitToggle = `<div class="row" style="gap:4px;background:var(--cream-200);padding:4px;border-radius:var(--r-pill)">
      ${['kg', 'g'].map((u) => `<button class="seg-u ${unit === u ? 'on' : ''}" data-unit="${u}">${u === 'kg' ? 'กก.' : 'กรัม'}</button>`).join('')}
    </div>`;

    let body = '';
    if (mode === 'summary') {
      body = `<div class="card card-pad">
        <div class="row" style="justify-content:space-between;margin-bottom:6px"><div class="section-title">สรุปรอบนี้</div>${mismatches.length ? `<span class="pill pill-red">${icon('alert', 13)} ไม่ตรง ${mismatches.length}</span>` : `<span class="pill pill-green">${icon('check', 13)} ตรงทั้งหมด</span>`}</div>
        <div class="section-sub">รายงานสั้น ๆ ว่ารอบนี้ส่ง-รับตรงกันไหม · แก้ได้ · ดูรายละเอียด/FIFO ที่ <b>หน้าแสดงผล</b></div>
        <table class="tbl">
          <thead><tr><th>รายการ</th><th style="text-align:right">ส่ง</th><th style="text-align:right">รับจริง</th><th style="text-align:right">ส่วนต่าง</th><th>สถานะ</th><th></th></tr></thead>
          <tbody>${recs.map((r) => { const diff = r.received.qty - r.sent.qty; return `<tr>
            <td>${esc(itemName(r.itemId))}</td>
            <td data-label="ส่ง" style="text-align:right"><input class="input data" style="width:74px;text-align:right;padding:6px" value="${r.sent.qty}"></td>
            <td data-label="รับจริง" style="text-align:right"><input class="input data" style="width:74px;text-align:right;padding:6px" value="${r.received.qty}"></td>
            <td data-label="ส่วนต่าง" class="num data" style="color:${diff === 0 ? 'var(--ink-3)' : 'var(--chili)'}">${diff > 0 ? '+' : ''}${diff} ${r.unit}</td>
            <td data-label="สถานะ">${r.received.ok ? '<span class="pill pill-green">ตรง</span>' : '<span class="pill pill-red">ไม่ตรง</span>'}${diff < 0 ? '<div class="stk-note">ครัวกลางส่งขาด</div>' : diff > 0 ? '<div class="stk-note">ส่งเกิน</div>' : ''}</td>
            <td data-label="" style="text-align:right"><button class="btn btn-ghost btn-sm">${icon('edit', 15)}</button></td></tr>`; }).join('')}</tbody>
        </table>
      </div>`;
    } else {
      const isSend = mode === 'send';
      body = `<div class="locked" style="margin-bottom:16px;border-left-color:${isSend ? 'var(--carrot)' : 'var(--basil-600)'}">
        ${icon(isSend ? 'truck' : 'check', 16)} <span>${isSend ? 'ฝั่งส่ง (ครัวกลาง): กรอกจำนวนที่ส่งของแต่ละเมนู' : 'ฝั่งรับ (สาขา): กรอกจำนวนที่นับได้จริง — ระบบยึดยอดนี้เป็นหลัก'} · หน่วย ${unitLabel()} (1 กก. = 1000 ก.)</span>
      </div>
      ${entryGrid()}
      <div class="card card-pad" style="margin-top:18px">
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;align-items:end">
          ${isSend ? `<div><div class="field-label">ค่าส่งรอบนี้ (฿)</div><input class="input data" placeholder="0"></div>` : ''}
          <div><div class="field-label">วันที่ & เวลา${isSend ? 'ส่ง' : 'รับ'}</div><input class="input data" type="datetime-local" value="2026-06-01T${isSend ? '07:00' : '09:00'}"></div>
          <button class="btn btn-primary" style="height:44px">${icon('check', 18)} ${isSend ? 'บันทึกการส่ง' : 'ยืนยันรับ + เข้าสต็อก'}</button>
        </div>
        <div style="margin-top:10px">${mockTag(isSend ? 'บันทึกฝั่งส่ง' : 'รวมเข้าสต็อก + FIFO (ยึดยอดรับ)')}</div>
      </div>`;
    }

    return `<div class="content-inner fade-in">
      <div class="page-head">
        <div><h2>ส่งของ / รับของ</h2><div class="desc">ครัวกลางกรอกจำนวนที่ส่ง · สาขากรอกจำนวนที่นับได้จริง (ยึดเป็นหลัก) · รายงานสั้นว่ารอบนี้ตรงไหม — รายละเอียด/FIFO ดูที่หน้าแสดงผล</div></div>
        <div class="row" style="gap:10px">${unitToggle}<div class="topbar-search" style="margin:0;width:auto;padding:7px 12px">${icon('calendar', 16)}<input type="date" value="2026-06-01" style="border:none;outline:none;background:none;font-family:var(--font-mono);color:var(--ink);width:130px"></div></div>
      </div>

      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:18px">
        ${seg('send', '① ฝั่งส่ง (ครัวกลาง)')}${seg('receive', '② ฝั่งรับ (สาขา)')}${seg('summary', '③ สรุปรอบนี้')}
      </div>

      ${body}
    </div>`;
  },
  mount(ctx) {
    document.querySelectorAll('[data-mode]').forEach((el) => el.addEventListener('click', () => { mode = el.dataset.mode; ctx.refresh(); }));
    document.querySelectorAll('[data-unit]').forEach((el) => el.addEventListener('click', () => { unit = el.dataset.unit; ctx.refresh(); }));
  },
};
