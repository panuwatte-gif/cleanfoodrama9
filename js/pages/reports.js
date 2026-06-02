/* ============================================================
   pages/reports.js — หน้าแสดงผล (ข้อ 12) รายงานรวมทุกด้าน
   12.1 สต็อก+พยากรณ์ · 12.2 ผลดำเนินงาน(เจ้าของ) · 12.3 สูตร ·
   12.4 วันลา+คะแนน · 12.5 ภาพถ่ายออเดอร์
   หัวข้อที่ไม่มีสิทธิ์ = ไม่โผล่ใน login นั้น
   ============================================================ */
import { state } from '../state.js';
import { can, currentUser } from '../auth.js';
import { kpi, baht, num, esc, barChart, donut, areaChart, mockTag, icon } from '../components.js';
import { categories, itemsInCategory } from '../menu.js';

let activeSec = null;

const SECTIONS = [
  { id: 'stock',  label: '12.1 สต็อก & พยากรณ์', perm: () => true },
  { id: 'ops',    label: '12.2 ผลดำเนินงาน',     perm: () => can.viewFinance() },
  { id: 'recipe', label: '12.3 สูตรอาหาร',        perm: () => true },
  { id: 'leave',  label: '12.4 วันลา & คะแนน',    perm: () => true },
  { id: 'orders', label: '12.5 ภาพถ่ายออเดอร์',  perm: () => true },
];

const foodCatId = () => (categories().find((c) => c.layout === 'spice') || {}).id;

/* ---------- 12.1 สต็อก + พยากรณ์ ---------- */
function secStock() {
  const dates = Object.keys(state.db.stockCounts).sort().reverse();
  const today = state.db.stockCounts[dates[0]] || {};
  const yest = state.db.stockCounts[dates[1]] || {};
  const items = itemsInCategory(foodCatId()).concat(itemsInCategory('cat_raw'));
  const rows = items.map((it) => {
    const tv = today[it.id], yv = yest[it.id];
    const sold = (yv != null && tv != null) ? yv - tv : null;
    const fc = sold != null ? sold * 1.15 : null;
    const dleft = (fc && fc > 0 && tv != null) ? (tv / fc).toFixed(1) : null;
    return { it, tv, fc, dleft };
  }).filter((r) => r.tv != null);
  const low = rows.filter((r) => r.dleft != null && r.dleft < 2);

  return `<div class="grid cols-3" style="margin-bottom:18px">
      ${kpi({ label: 'รายการที่นับวันนี้', value: num(rows.length), icon: 'boxes', color: 'var(--basil-700)' })}
      ${kpi({ label: 'ใกล้หมด (<2 วัน)', value: num(low.length), icon: 'alert', color: 'var(--chili)', bg: 'var(--chili-soft)' })}
      ${kpi({ label: 'รับเข้าล่าสุด', value: num(state.db.receivings.length) + ' ล็อต', icon: 'truck', color: 'var(--carrot)', bg: 'var(--carrot-soft)' })}
    </div>
    <div class="card card-pad">
      <div class="row" style="justify-content:space-between;margin-bottom:6px"><div class="section-title">สต็อกปัจจุบัน + พยากรณ์ + พอใช้กี่วัน</div>${mockTag('สูตรพยากรณ์ตั้งที่หน้าตั้งค่า')}</div>
      <table class="tbl"><thead><tr><th>รายการ</th><th style="text-align:right">คงเหลือ</th><th style="text-align:right">พยากรณ์/วัน</th><th style="text-align:right">พอใช้อีก</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${esc(r.it.name)}</td><td data-label="คงเหลือ" class="num data">${num(r.tv)} ${esc(r.it.unit)}</td><td data-label="พยากรณ์/วัน" class="num data" style="color:var(--basil-700)">${r.fc != null ? r.fc.toFixed(1) : '—'}</td><td data-label="พอใช้อีก" class="num data" style="font-weight:600;color:${r.dleft != null && r.dleft < 2 ? 'var(--chili)' : 'var(--ink)'}">${r.dleft != null ? r.dleft + ' วัน' : '—'}</td></tr>`).join('')}</tbody></table>
    </div>`;
}

/* ---------- 12.2 ผลดำเนินงาน (เจ้าของ) ---------- */
function secOps() {
  const rev = state.db.revenue;
  const fin = state.config.finance;
  const monthRev = 410000; // mock ยอดเดือน
  const monthExp = state.db.expenseCategories.reduce((s, c) => {
    if (c.type === 'recurring') return s + (c.monthly || 0);
    if (c.type === 'wage') return s + state.db.payroll.filter((p) => p.active).reduce((a, p) => a + (p.type === 'monthly' ? p.amount : p.amount * 26), 0);
    return s + state.db.expenses.filter((e) => e.catId === c.id).reduce((a, e) => a + e.amount, 0);
  }, 0);
  const grossProfit = monthRev - monthExp;
  const vatSale = Math.round(monthRev * fin.vatPercent / 100);

  return `<div class="grid cols-4" style="margin-bottom:18px">
      ${kpi({ label: 'รายได้ (เดือนนี้)', value: baht(monthRev), icon: 'wallet', color: 'var(--basil-700)' })}
      ${kpi({ label: 'ค่าใช้จ่ายรวม', value: baht(monthExp), icon: 'coins', color: 'var(--chili)', bg: 'var(--chili-soft)' })}
      ${kpi({ label: 'กำไรขั้นต้น', value: baht(grossProfit), icon: 'trendUp', color: 'var(--basil-700)', bg: 'var(--sage-100)' })}
      ${kpi({ label: 'VAT ขาย (ประมาณ)', value: baht(vatSale), icon: 'receipt', color: 'var(--riceberry)', bg: '#efe6f0' })}
    </div>
    <div class="grid" style="grid-template-columns:1.5fr 1fr;margin-bottom:18px">
      <div class="card card-pad"><div class="overline">เปรียบเทียบ</div><div class="section-title" style="margin-bottom:14px">รายได้ vs ค่าใช้จ่าย (6 เดือน)</div>
        ${barChart([{ label: 'ม.ค.', value: 298000 }, { label: 'ก.พ.', value: 312000 }, { label: 'มี.ค.', value: 345000 }, { label: 'เม.ย.', value: 330000 }, { label: 'พ.ค.', value: 388000 }, { label: 'มิ.ย.', value: 410000 }], baht)}
      </div>
      <div class="card card-pad"><div class="overline">โครงสร้างต้นทุน</div><div class="section-title" style="margin-bottom:16px">สัดส่วนค่าใช้จ่าย</div>
        ${donut([{ label: 'ค่าแรง', value: 57960, color: 'var(--basil-500)' }, { label: 'ค่าเช่า', value: 25000, color: 'var(--carrot)' }, { label: 'ต้นทุนอาหาร', value: 110000, color: 'var(--riceberry)' }, { label: 'อื่นๆ', value: 18000, color: 'var(--sage-300)' }], 140)}
      </div>
    </div>
    <div class="grid cols-2">
      <div class="card card-pad owner-only"><div class="overline" style="color:var(--riceberry)">บัญชี</div><div class="section-title" style="margin-bottom:12px">งบกำไรขาดทุน (ย่อ)</div>
        <table class="tbl"><tbody>
          <tr><td>รายได้รวม</td><td class="num data">${baht(monthRev)}</td></tr>
          <tr><td>หักค่าธรรมเนียมแพลตฟอร์ม</td><td class="num data" style="color:var(--chili)">−${baht(115000)}</td></tr>
          <tr><td>หักต้นทุน + ค่าใช้จ่าย</td><td class="num data" style="color:var(--chili)">−${baht(monthExp)}</td></tr>
          <tr style="border-top:2px solid var(--line)"><td style="font-weight:600">กำไรสุทธิ (ประมาณ)</td><td class="num data" style="font-weight:600;color:var(--basil-700)">${baht(grossProfit - 115000)}</td></tr>
        </tbody></table>
      </div>
      <div class="card card-pad owner-only"><div class="overline" style="color:var(--riceberry)">ภาษี</div><div class="section-title" style="margin-bottom:12px">ภาษีมูลค่าเพิ่ม (ประมาณ)</div>
        <table class="tbl"><tbody>
          <tr><td>VAT ขาย (${fin.vatPercent}%)</td><td class="num data">${baht(vatSale)}</td></tr>
          <tr><td>VAT ซื้อ (เคลมได้)</td><td class="num data" style="color:var(--basil-700)">−${baht(8400)}</td></tr>
          <tr style="border-top:2px solid var(--line)"><td style="font-weight:600">VAT ที่ต้องนำส่ง</td><td class="num data" style="font-weight:600">${baht(vatSale - 8400)}</td></tr>
        </tbody></table>
        <div style="margin-top:10px">${mockTag('ดึง VAT ซื้อจากรายการที่ติ๊ก VAT ในค่าใช้จ่าย')}</div>
      </div>
    </div>`;
}

/* ---------- 12.3 สูตรอาหาร ---------- */
function secRecipe() {
  const r = state.db.recipes[0];
  const target = 250, factor = target / r.baseGram;
  return `<div class="card card-pad">
    <div class="row" style="justify-content:space-between;margin-bottom:6px"><div class="section-title">${esc(r.name)} — ปรับปริมาณ</div><span class="pill pill-green">×${factor.toFixed(2)}</span></div>
    <div class="section-sub">ตัวอย่างผลคำนวณสูตร · ปรับ/แก้สูตรเต็มที่หน้า "สูตรอาหารอัจฉริยะ"</div>
    <table class="tbl"><thead><tr><th>วัตถุดิบ</th><th style="text-align:right">สัดส่วน</th><th style="text-align:right">ต้องใช้ (ก.)</th></tr></thead>
    <tbody>${r.ingredients.map((i) => `<tr><td>${esc(i.name)}</td><td data-label="สัดส่วน" class="num data" style="color:var(--ink-3)">${i.ratio}</td><td data-label="ต้องใช้ (ก.)" class="num data" style="font-weight:600;color:var(--basil-700)">${(i.ratio * factor).toFixed(0)}</td></tr>`).join('')}</tbody></table>
    <button class="btn btn-outline btn-sm" style="margin-top:14px" data-nav="recipe">ไปปรับสูตรเต็ม ${icon('chevronRight', 15)}</button>
  </div>`;
}

/* ---------- 12.4 วันลา + คะแนน ---------- */
function secLeave() {
  const scores = { u_oam: 96, u_user1: 88, u_user2: 100, u_su: 99 };
  const ppl = state.db.users.filter((u) => u.role !== 'owner');
  return `<div class="grid" style="grid-template-columns:1fr 1.3fr">
    <div class="card card-pad"><div class="overline">Leaderboard</div><div class="section-title" style="margin-bottom:14px">คะแนนประสิทธิภาพ</div>
      ${ppl.map((p) => { const sc = scores[p.id] || 100; const c = sc >= 95 ? 'var(--basil-600)' : sc >= 85 ? 'var(--carrot)' : 'var(--chili)'; return `<div class="li"><div class="li-ico" style="background:var(--cream);font-size:19px">${p.avatar}</div><div class="li-main"><div class="li-t">${esc(p.name)}</div></div><div class="data" style="font-size:22px;font-weight:600;color:${c}">${sc}</div></div>`; }).join('')}
    </div>
    <div class="card card-pad"><div class="overline">ปฏิทินวันลา</div><div class="section-title" style="margin-bottom:12px">รายการลาล่าสุด</div>
      <table class="tbl"><thead><tr><th>พนักงาน</th><th>วันที่</th><th>ประเภท</th><th style="text-align:right">ผลคะแนน</th></tr></thead>
      <tbody>${state.db.attendance.map((a) => `<tr><td>${esc(state.db.users.find((u) => u.id === a.userId)?.name || '')}</td><td data-label="วันที่" class="data">${a.date}</td><td data-label="ประเภท"><span class="pill ${a.type === 'ลาป่วย' ? 'pill-orange' : 'pill-gray'}">${esc(a.type)}</span></td><td data-label="ผลคะแนน" class="num data" style="color:var(--chili)">−4.2</td></tr>`).join('')}</tbody></table>
      <div style="margin-top:10px">${mockTag('สูตรคะแนนตั้งที่หน้าตั้งค่า')}</div>
    </div>
  </div>`;
}

/* ---------- 12.5 ภาพถ่ายออเดอร์ ---------- */
let ordPf = 'all';
function secOrders() {
  const pfs = state.config.platforms;
  const caps = state.db.captures.filter((c) => ordPf === 'all' || c.platform === ordPf);
  const pfName = (id) => pfs.find((p) => p.id === id) || { name: id, color: 'var(--ink-3)' };
  return `<div class="card card-pad">
    <div class="row" style="justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:12px">
      <div class="section-title">ค้นหาภาพถ่ายออเดอร์</div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <button class="chip ${ordPf === 'all' ? 'active' : ''}" data-ordpf="all">ทั้งหมด</button>
        ${pfs.map((p) => `<button class="chip ${ordPf === p.id ? 'active' : ''}" data-ordpf="${p.id}">${esc(p.name)}</button>`).join('')}
        <div class="topbar-search" style="margin:0;width:auto">${icon('search', 16)}<input placeholder="ค้นเลขออเดอร์…"></div>
      </div>
    </div>
    <div class="grid cols-4">${caps.map((c) => `<div class="card" style="box-shadow:var(--sh-1);overflow:hidden">
      <div style="aspect-ratio:4/3;background:var(--cream-200);display:grid;place-items:center;color:var(--ink-3);position:relative">${icon('camera', 28)}
        <span class="pill" style="position:absolute;top:8px;left:8px;background:#fff;color:${pfName(c.platform).color};box-shadow:var(--sh-1)">${esc(pfName(c.platform).name)}</span></div>
      <div style="padding:10px 12px"><div class="data" style="font-weight:600;font-size:14px">${esc(c.orderNo)}</div><div class="li-s">${new Date(c.date).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div>
    </div>`).join('')}</div>
  </div>`;
}

export default {
  render() {
    const secs = SECTIONS.filter((s) => s.perm());
    if (!activeSec || !secs.find((s) => s.id === activeSec)) activeSec = secs[0]?.id;
    const u = currentUser();

    let body = '';
    if (activeSec === 'stock') body = secStock();
    else if (activeSec === 'ops') body = secOps();
    else if (activeSec === 'recipe') body = secRecipe();
    else if (activeSec === 'leave') body = secLeave();
    else if (activeSec === 'orders') body = secOrders();

    return `<div class="content-inner fade-in">
      <div class="page-head">
        <div><div class="overline">รายงานรวม</div><h2>หน้าแสดงผล</h2><div class="desc">สรุปผลทุกด้านแยกเป็นการ์ด — หัวข้อที่คุณไม่มีสิทธิ์จะไม่แสดง</div></div>
        <span class="pill pill-green">${esc(u.name)}</span>
      </div>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:20px">
        ${secs.map((s) => `<button class="chip ${s.id === activeSec ? 'active' : ''}" data-sec="${s.id}">${esc(s.label)}</button>`).join('')}
      </div>
      ${body}
    </div>`;
  },
  mount(ctx) {
    document.querySelectorAll('[data-sec]').forEach((el) => el.addEventListener('click', () => { activeSec = el.dataset.sec; ctx.refresh(); }));
    document.querySelectorAll('[data-ordpf]').forEach((el) => el.addEventListener('click', () => { ordPf = el.dataset.ordpf; ctx.refresh(); }));
  },
};
