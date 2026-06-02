/* ============================================================
   pages/simulator.js — ฟังก์ชัน 8: จำลองเมนู & แคมเปญรายร้าน
   คำนวณยอดสุทธิที่ร้านได้จริงหลังหักค่าฟี + ส่วนลด
   ============================================================ */
import { state } from '../state.js';
import { pageHead, baht, esc, mockTag, icon } from '../components.js';

export default {
  render() {
    const pfs = state.config.platforms.filter((p) => p.enabled);
    const price = 159, itemDisc = 10, campaignDisc = 15;
    const rows = pfs.map((p) => {
      const afterDisc = price * (1 - itemDisc / 100) * (1 - campaignDisc / 100);
      const fee = afterDisc * p.feePct / 100;
      const net = afterDisc - fee;
      return `<tr>
        <td><span class="pill" style="background:#fff;color:${p.color};border:1px solid var(--line-2)">${esc(p.name)}</span></td>
        <td data-label="ราคาเต็ม" class="num data">${baht(price)}</td>
        <td data-label="ส่วนลด" class="num data" style="color:var(--ink-3)">−${itemDisc}% / −${campaignDisc}%</td>
        <td data-label="หลังลด" class="num data">${baht(Math.round(afterDisc))}</td>
        <td data-label="ค่าฟี" class="num data" style="color:var(--chili)">−${baht(Math.round(fee))} (${p.feePct}%)</td>
        <td data-label="สุทธิ" class="num data" style="font-weight:600;color:var(--basil-700);font-size:15px">${baht(Math.round(net))}</td>
      </tr>`;
    }).join('');

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'จำลองเมนู & แคมเปญ', desc: 'หน้าแอปเดลิเวอรีโชว์แค่ราคาเต็ม — หน้านี้คำนวณ "ยอดสุทธิที่ร้านได้จริง" หลังหักส่วนลดเมนู + แคมเปญ + ค่าฟีแพลตฟอร์ม' })}

      <div class="grid" style="grid-template-columns:340px 1fr">
        <div class="card card-pad">
          <div class="section-title" style="margin-bottom:14px">ตัวแปรจำลอง</div>
          <div class="field-label">เมนู</div>
          <select class="input" style="margin-bottom:14px"><option>ข้าวมันไก่ 5% — ราคาเต็ม</option><option>กะเพราเนื้อสับ</option></select>
          <div class="field-label">ราคาตั้งต้น</div><input class="input data" value="159" style="margin-bottom:14px">
          <div class="field-label">ส่วนลดรายเมนู (%)</div><input class="input data" value="10" style="margin-bottom:14px">
          <div class="field-label">แคมเปญส่วนลดรวมร้าน (%)</div><input class="input data" value="15" style="margin-bottom:18px">
          <button class="btn btn-primary" style="width:100%">${icon('calculator', 18)} คำนวณ</button>
        </div>

        <div class="card card-pad">
          <div class="row" style="justify-content:space-between"><div class="section-title">ยอดสุทธิที่ร้านได้รับจริง</div>${mockTag('ค่าฟีจาก state.config.platforms')}</div>
          <table class="tbl" style="margin-top:14px">
            <thead><tr><th>แพลตฟอร์ม</th><th style="text-align:right">ราคาเต็ม</th><th style="text-align:right">ส่วนลด</th><th style="text-align:right">หลังลด</th><th style="text-align:right">ค่าฟี</th><th style="text-align:right">สุทธิ</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  },
};
