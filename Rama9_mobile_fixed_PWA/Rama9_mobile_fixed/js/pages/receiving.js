/* ============================================================
   pages/receiving.js — ฟังก์ชันใหม่: รับของเข้าสาขา + FIFO
   แชมป์ส่งของ → สาขาเช็ค + ลงรับ → รวมเข้าสต็อก คิด FIFO
   (ของเก่าใช้ก่อน · แสดงว่ามีของเก่ากี่กก. เก็บมานานแค่ไหน)
   ============================================================ */
import { state } from '../state.js';
import { pageHead, num, esc, mockTag, icon } from '../components.js';

const today = new Date('2026-06-01');
const daysAgo = (d) => Math.max(0, Math.round((today - new Date(d)) / 86400000));
const itemName = (id) => state.db.stockItems.find((i) => i.id === id)?.name || id;
const userName = (id) => state.db.users.find((u) => u.id === id)?.name || id;

export default {
  render() {
    const lots = [...state.db.receivings].sort((a, b) => new Date(a.receivedDate) - new Date(b.receivedDate));
    // group by item for FIFO summary
    const byItem = {};
    lots.forEach((l) => { (byItem[l.itemId] ||= []).push(l); });

    const summaryCards = Object.entries(byItem).map(([itemId, ls]) => {
      const total = ls.reduce((s, l) => s + l.remaining, 0);
      const oldest = ls.find((l) => l.remaining > 0) || ls[0];
      const age = daysAgo(oldest.receivedDate);
      const warn = age >= 4;
      return `<div class="card card-pad">
        <div class="row" style="justify-content:space-between;margin-bottom:8px">
          <div class="li-t">${esc(itemName(itemId))}</div>
          <span class="pill ${warn ? 'pill-red' : 'pill-green'}">${warn ? icon('alert', 12) : icon('check', 12)} เก่าสุด ${age} วัน</span>
        </div>
        <div class="data" style="font-size:26px;font-weight:600;color:var(--basil-700)">${num(total)} <span style="font-size:14px;color:var(--ink-3)">${oldest.unit}</span></div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:7px">
          ${ls.map((l, i) => `<div class="row" style="font-size:12.5px;gap:8px">
            <span class="pill ${i === 0 ? 'pill-orange' : 'pill-gray'}" style="font-size:10px">${i === 0 ? 'ใช้ก่อน' : 'ล็อต ' + (i + 1)}</span>
            <span style="color:var(--ink-3)">${l.receivedDate} · ${daysAgo(l.receivedDate)} วัน</span>
            <span class="data" style="margin-left:auto;font-weight:600;${l.remaining === 0 ? 'color:var(--ink-3);text-decoration:line-through' : ''}">${l.remaining}/${l.qty}</span>
          </div>`).join('')}
        </div>
      </div>`;
    }).join('');

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'รับของเข้าสาขา (FIFO)', desc: 'เช็คของที่ส่งมาจากครัวกลาง → ลงรับ → ระบบรวมเข้าสต็อกและคิดแบบ FIFO (ของเก่าใช้ก่อน + เตือนของค้างนาน)', actions: `<button class="btn btn-primary">${icon('plus', 18)} ลงรับของ</button>` })}

      <div class="grid" style="grid-template-columns:minmax(280px,340px) minmax(0,1fr)">
        <div class="card card-pad" style="align-self:start">
          <div class="section-title" style="margin-bottom:14px">ลงรับของใหม่</div>
          <div class="field-label">รายการ</div>
          <select class="input" style="margin-bottom:12px">${state.db.stockItems.slice(0, 12).map((i) => `<option>${esc(i.name)}</option>`).join('')}</select>
          <div class="row" style="gap:10px;margin-bottom:12px">
            <div style="flex:1"><div class="field-label">จำนวน</div><input class="input data" placeholder="0"></div>
            <div style="flex:1"><div class="field-label">วันที่รับ</div><input class="input data" type="date" value="2026-06-01"></div>
          </div>
          <div class="field-label">สภาพ / หมายเหตุ</div>
          <input class="input" placeholder="เช่น ครบ สภาพดี" style="margin-bottom:16px">
          <button class="btn btn-primary" style="width:100%">${icon('check', 18)} ยืนยันรับของ</button>
          <div style="margin-top:12px">${mockTag('รวมเข้า stock + สร้างล็อต FIFO ในฟังก์ชันจริง')}</div>
        </div>

        <div>
          <div class="row" style="justify-content:space-between;margin-bottom:14px">
            <div class="section-title">สต็อกตามล็อต (FIFO)</div>
            <span class="pill pill-orange">${icon('alert', 13)} เตือนเมื่อค้าง ≥ 4 วัน</span>
          </div>
          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${summaryCards}</div>

          <div class="card card-pad" style="margin-top:18px">
            <div class="section-title" style="margin-bottom:6px">ประวัติการรับ</div>
            <table class="tbl">
              <thead><tr><th>วันที่</th><th>รายการ</th><th style="text-align:right">รับ</th><th>ผู้ส่ง</th><th>ผู้เช็ค</th><th>หมายเหตุ</th></tr></thead>
              <tbody>${[...state.db.receivings].reverse().map((l) => `<tr>
                <td class="data">${l.receivedDate}</td><td>${esc(itemName(l.itemId))}</td>
                <td class="num data">${l.qty} ${l.unit}</td><td>${esc(userName(l.fromUserId))}</td><td>${esc(userName(l.checkedBy))}</td>
                <td class="li-s">${esc(l.note) || '—'}</td></tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  },
};
