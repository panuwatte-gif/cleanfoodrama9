/* ============================================================
   pages/stock.js — ฟังก์ชัน 2: นับสต็อก + พยากรณ์ยอดขาย
   เข้าได้ทุกคน · แชมป์จัดการหมวด/รายการได้
   ============================================================ */
import { state } from '../state.js';
import { can } from '../auth.js';
import { pageHead, num, esc, mockTag, icon } from '../components.js';

let activeCat = null;

export default {
  render() {
    const cats = state.db.stockCategories;
    if (!activeCat) activeCat = cats[0].id;
    const cat = cats.find((c) => c.id === activeCat) || cats[0];
    const items = state.db.stockItems.filter((i) => i.cat === cat.id);
    const dates = Object.keys(state.db.stockCounts).sort().reverse();
    const today = state.db.stockCounts[dates[0]] || {};
    const yest = state.db.stockCounts[dates[1]] || {};
    const levels = state.config.perishLevels;
    const perishOf = (id) => levels.find((l) => l.level === (state.db.stockPerish[id] || 1)) || levels[0];

    const rows = items.map((it) => {
      const tv = today[it.id], yv = yest[it.id];
      const sold = (yv != null && tv != null) ? (yv - tv) : null;
      const fc = sold != null ? (sold * 1.15) : null; // mock forecast
      const daysLeft = (fc && fc > 0 && tv != null) ? (tv / fc).toFixed(1) : null; // พอใช้อีกกี่วัน
      const pl = perishOf(it.id);
      const noSpice = state.db.noSpiceItems.includes(it.id);
      return `<tr>
        <td><div class="row">
          <span class="perish-dot" title="${esc(pl.label)} (เก็บ ~${pl.shelfDays} วัน)" style="width:9px;height:9px;border-radius:999px;background:${pl.color};flex-shrink:0"></span>
          <span style="width:30px;height:30px;border-radius:8px;background:var(--sage-100);color:${cat.color};display:grid;place-items:center">${icon(cat.icon, 16)}</span>
          <span>${esc(it.name)}</span>
          ${noSpice ? '<span class="pill pill-green" style="font-size:10px">มีไม่เผ็ด</span>' : ''}
          ${it.note ? `<span class="li-s">(${esc(it.note)})</span>` : ''}
        </div></td>
        <td class="num data">${tv != null ? num(tv) : '<span style="color:var(--ink-3)">—</span>'}</td>
        <td class="num data" style="color:var(--ink-3)">${yv != null ? num(yv) : '—'}</td>
        <td class="num data" style="color:${sold > 0 ? 'var(--chili)' : 'var(--ink-3)'}">${sold != null ? num(sold) : '—'}</td>
        <td class="num data" style="color:var(--basil-700);font-weight:600">${fc != null ? fc.toFixed(1) : '—'}</td>
        <td class="num data">${daysLeft != null ? `<span style="color:${daysLeft < 2 ? 'var(--chili)' : 'var(--ink)'};font-weight:600">${daysLeft} วัน</span>` : '—'}</td>
        <td style="text-align:right"><input class="input" style="width:90px;padding:7px 10px;text-align:right" placeholder="0" inputmode="decimal"></td>
      </tr>`;
    }).join('');

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'นับสต็อก & พยากรณ์', desc: 'กรอกจำนวนคงเหลือวันนี้ ระบบคำนวณยอดขาย (วันก่อน − วันนี้) พยากรณ์ด้วยค่าเฉลี่ยถ่วงน้ำหนัก และประเมินว่าสต็อกพอใช้อีกกี่วัน', actions: `<button class="btn btn-outline btn-sm">${icon('refresh', 16)} ประวัติ</button><button class="btn btn-sm" style="background:#06c755;color:#fff" id="send-line">${icon('send', 16)} ส่ง LINE</button><button class="btn btn-primary">${icon('check', 18)} บันทึก</button>` })}

      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:18px">
        ${cats.map((c) => `<button class="chip ${c.id === activeCat ? 'active' : ''}" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}
        ${can.editSystemConfig() ? `<button class="chip" style="border-style:dashed">${icon('plus', 15)} เพิ่มหมวด</button>` : ''}
      </div>

      <div class="card card-pad">
        <div class="row" style="justify-content:space-between;margin-bottom:6px">
          <div class="section-title">${esc(cat.name)} <span class="li-s">· หน่วย ${cat.unit}</span></div>
          ${mockTag('สูตร forecast ต่อจริงในฟังก์ชัน 2')}
        </div>
        <table class="tbl">
          <thead><tr><th>รายการ</th><th style="text-align:right">คงเหลือวันนี้</th><th style="text-align:right">เมื่อวาน</th><th style="text-align:right">ขายได้</th><th style="text-align:right">พยากรณ์</th><th style="text-align:right">พอใช้อีก</th><th style="text-align:right">กรอกใหม่</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="grid cols-3" style="margin-top:18px">
        <div class="card card-pad"><div class="overline">น้ำหนักถ่วง</div><div class="section-title" style="margin:4px 0 10px">ค่าจาก state.config</div>
          <div class="row" style="gap:6px">${state.config.forecast.weights.map((w, i) => `<span class="pill ${i === 0 ? 'pill-green' : 'pill-gray'}" title="วันที่ ${i + 1} ย้อนหลัง">${w}</span>`).join('')}</div>
          <div class="li-s" style="margin-top:10px">วันใกล้ปัจจุบันน้ำหนักมากกว่า · เทียบวันเดียวกัน (จ.–จ.)</div>
        </div>
        <div class="card card-pad"><div class="overline">สต็อกต่ำ</div><div class="section-title" style="margin:4px 0 10px">เตือนเมื่อ < ${state.config.forecast.lowStockThresholdPct}%</div>
          <div class="li"><div class="li-ico" style="background:var(--chili-soft);color:var(--chili)">${icon('alert', 18)}</div><div class="li-main"><div class="li-t">กะเพราอกไก่สับ</div><div class="li-s">เหลือ 5 กก. · ต่ำกว่าพยากรณ์</div></div></div>
        </div>
        <div class="card card-pad"><div class="overline">ระดับความเสียง่าย</div><div class="section-title" style="margin:4px 0 10px">ปรับเครื่องหมายเองได้</div>
          ${state.config.perishLevels.map((l) => `<div class="row" style="gap:9px;padding:4px 0"><span style="width:11px;height:11px;border-radius:999px;background:${l.color}"></span><span style="flex:1">${l.label}</span><span class="li-s">~${l.shelfDays} วัน</span></div>`).join('')}
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
  },
};
