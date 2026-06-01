/* ============================================================
   pages/dashboard.js — ฟังก์ชัน 10: หน้าแรกแสดงผลสรุป
   role-aware: เจ้าของเห็นกราฟการเงิน/พยากรณ์ พนักงานเห็นทางลัด+งาน
   ============================================================ */
import { state } from '../state.js';
import { currentUser, can } from '../auth.js';
import { kpi, baht, num, esc, donut, areaChart, barChart, mockTag, icon } from '../components.js';

function quickActions(nav) {
  const u = currentUser();
  const acts = [
    { id: 'capture', t: 'ถ่ายภาพออเดอร์', s: 'เก็บหลักฐานสู้เคลม', ic: 'camera', bg: 'linear-gradient(135deg,var(--basil-600),var(--basil-700))' },
    { id: 'capture', t: 'ถ่าย + สแกนบิล', s: 'อาหาร + บิล บันทึกเร็ว', ic: 'scan', bg: 'linear-gradient(135deg,var(--info),#2c6675)' },
    { id: 'stock', t: 'นับสต็อกวันนี้', s: 'กรอกจำนวนคงเหลือ', ic: 'boxes', bg: 'linear-gradient(135deg,var(--carrot),#c4702a)' },
    { id: 'revenue', t: 'บันทึกรายได้', s: 'ยอดขายรายวัน', ic: 'wallet', bg: 'linear-gradient(135deg,var(--riceberry),#472b4b)' },
  ];
  return `<div class="grid cols-4">${acts.map((a) => `
    <button class="qa" style="background:${a.bg}" data-nav="${a.id}">
      <div class="qa-ico">${icon(a.ic, 24)}</div>
      <div><div class="qa-t">${a.t}</div><div class="qa-s">${a.s}</div></div>
    </button>`).join('')}</div>`;
}

function ownerInsights() {
  const rev = state.db.revenue;
  const today = rev[0] || { gross: 0, net: 0, fees: 0 };
  const yest = rev[1] || { gross: 0 };
  const delta = yest.gross ? Math.round(((today.gross - yest.gross) / yest.gross) * 100) : 0;
  // mock YTD monthly series
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.'];
  const series = [298, 312, 345, 330, 388, 410].map((v) => v * 1000);
  const platforms = state.config.platforms.filter((p) => p.enabled);
  const byPf = platforms.map((p) => ({ label: p.name, value: today.byPlatform?.[p.id] || 0, color: p.color }));

  const kpis = `<div class="grid cols-4" style="margin-bottom:18px">
    ${kpi({ label: 'รายได้วันนี้', value: baht(today.gross), icon: 'wallet', color: 'var(--basil-700)', delta: `${delta >= 0 ? '+' : ''}${delta}% จากเมื่อวาน`, deltaDir: delta >= 0 ? 'up' : 'down' })}
    ${kpi({ label: 'รายได้สุทธิ (หักค่าฟี)', value: baht(today.net), icon: 'trendUp', color: 'var(--basil-700)', bg: 'var(--sage-100)' })}
    ${kpi({ label: 'ค่าธรรมเนียมแพลตฟอร์ม', value: baht(today.fees), icon: 'receipt', color: 'var(--chili)', bg: 'var(--chili-soft)' })}
    ${kpi({ label: 'ออเดอร์วันนี้', value: num(state.db.captures.length) + ' บิล', icon: 'camera', color: 'var(--carrot)', bg: 'var(--carrot-soft)' })}
  </div>`;

  return `${kpis}
  <div class="grid" style="grid-template-columns:1.6fr 1fr;margin-bottom:18px">
    <div class="card card-pad">
      <div class="row" style="justify-content:space-between;margin-bottom:6px">
        <div><div class="overline">Year to date</div><div class="section-title">รายได้สะสมรายเดือน</div></div>
        <span class="pill pill-green">${icon('trendUp', 13)} +12% YoY</span>
      </div>
      ${areaChart(series, { h: 190 })}
      <div class="row" style="justify-content:space-between;margin-top:8px;color:var(--ink-3);font-size:12px">${months.map((m) => `<span>${m}</span>`).join('')}</div>
    </div>
    <div class="card card-pad">
      <div class="overline">สัดส่วนรายได้</div>
      <div class="section-title" style="margin-bottom:18px">แยกตามแพลตฟอร์ม (วันนี้)</div>
      ${donut(byPf, 150)}
    </div>
  </div>`;
}

function forecastPreview() {
  // mock forecast preview from config weights
  const items = [
    { n: 'กะเพราเนื้อสับ', f: 14.5, min: 11, max: 18 },
    { n: 'กะเพราอกไก่สับ', f: 9.0, min: 7, max: 12 },
    { n: 'ข้าวต้นฤดู', f: 38, min: 30, max: 45 },
  ];
  return `<div class="card card-pad">
    <div class="row" style="justify-content:space-between;margin-bottom:4px">
      <div><div class="overline">ฟังก์ชัน 2 · Forecast</div><div class="section-title">ประมาณการขายพรุ่งนี้</div></div>
      <button class="btn btn-ghost btn-sm" data-nav="stock">ดูทั้งหมด ${icon('chevronRight', 16)}</button>
    </div>
    <div class="section-sub">ค่าเฉลี่ยถ่วงน้ำหนัก · ${mockTag('Mock — ต่อสูตรจริงในฟังก์ชัน 2')}</div>
    ${items.map((it) => `<div class="li">
      <div class="li-ico" style="background:var(--sage-100);color:var(--basil-700)">${icon('flame', 20)}</div>
      <div class="li-main"><div class="li-t">${it.n}</div><div class="li-s">ช่วง ${it.min}–${it.max} หน่วย</div></div>
      <div class="data" style="font-size:20px;font-weight:600;color:var(--basil-700)">${it.f}</div>
    </div>`).join('')}
  </div>`;
}

function myTasks(nav) {
  const u = currentUser();
  const mine = state.db.tasks.filter((t) => t.assignedTo === u.id);
  return `<div class="card card-pad">
    <div class="row" style="justify-content:space-between;margin-bottom:14px">
      <div class="section-title">งานของฉัน</div>
      <button class="btn btn-ghost btn-sm" data-nav="mytasks">ทั้งหมด ${icon('chevronRight', 16)}</button>
    </div>
    ${mine.length ? mine.map((t) => `<div class="li">
      <div class="li-ico" style="background:${t.done ? 'var(--sage-100)' : 'var(--cream-200)'};color:${t.done ? 'var(--basil-600)' : 'var(--ink-3)'}">${icon(t.done ? 'check' : 'clipboard', 18)}</div>
      <div class="li-main"><div class="li-t" style="${t.done ? 'text-decoration:line-through;color:var(--ink-3)' : ''}">${esc(t.title)}</div><div class="li-s">${esc(t.detail)}</div></div>
      ${t.done ? '<span class="pill pill-green">เสร็จ</span>' : '<span class="pill pill-orange">ค้าง</span>'}
    </div>`).join('') : '<div class="empty">ยังไม่มีงานที่มอบหมาย</div>'}
  </div>`;
}

function guideCard() {
  return `<div class="card card-pad">
    <div class="section-title">คู่มือการทำงาน</div>
    <div class="section-sub">ไกด์ไลน์สำหรับพนักงาน</div>
    ${[['ถ่ายภาพทุกออเดอร์ก่อนปิดถุง', 'camera'], ['นับสต็อกตอนเช้าก่อน 09:00', 'boxes'], ['บันทึกรายได้ก่อนปิดร้าน', 'wallet']].map(([t, ic]) => `
      <div class="li"><div class="li-ico" style="background:var(--cream-100);color:var(--basil-700)">${icon(ic, 18)}</div><div class="li-main"><div class="li-t">${t}</div></div></div>`).join('')}
  </div>`;
}

export default {
  render() {
    const u = currentUser();
    const isOwner = can.viewFinance();
    const greet = new Date().getHours() < 12 ? 'สวัสดีตอนเช้า' : new Date().getHours() < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
    return `<div class="content-inner fade-in">
      <div class="page-head">
        <div>
          <div class="overline">${greet}</div>
          <h2>${esc(u.name)} 👋</h2>
          <div class="desc">ภาพรวมการดำเนินงาน · ${state.db.stores.find((s) => s.status === 'active')?.short || ''}</div>
        </div>
        <div class="row"><span class="pill pill-green">${icon('store', 14)} เปิดให้บริการ</span></div>
      </div>

      <div style="margin-bottom:22px">${quickActions()}</div>

      ${isOwner ? ownerInsights() : ''}

      <div class="grid" style="grid-template-columns:${isOwner ? '1fr 1fr' : '1.4fr 1fr'}">
        ${isOwner ? forecastPreview() : myTasks()}
        ${isOwner ? myTasks() : guideCard()}
      </div>
    </div>`;
  },
  // data-nav clicks are wired globally by app.js
  mount() {},
};
