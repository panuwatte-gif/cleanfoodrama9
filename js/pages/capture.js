/* ============================================================
   pages/capture.js — ฟังก์ชัน 5: ถ่ายภาพออเดอร์ + สู้เคสเคลม
   ============================================================ */
import { state } from '../state.js';
import { pageHead, esc, mockTag, icon } from '../components.js';

let activePf = 'all';

export default {
  render() {
    const pfs = state.config.platforms;
    const caps = state.db.captures.filter((c) => activePf === 'all' || c.platform === activePf);
    const pfName = (id) => pfs.find((p) => p.id === id) || { name: id, color: 'var(--ink-3)' };

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'ถ่ายภาพออเดอร์ & สู้เคสเคลม', desc: 'เก็บภาพ + เลขออเดอร์เป็นหลักฐานโต้แย้งการเคลมบนแพลตฟอร์ม · บันทึกขึ้น Drive + Supabase อัตโนมัติ' })}

      <div class="grid cols-3" style="margin-bottom:22px">
        <button class="qa" style="background:linear-gradient(135deg,var(--basil-600),var(--basil-800));min-height:156px" data-cap="quick">
          <div class="qa-ico">${icon('camera', 26)}</div>
          <div><div class="qa-t">9.1 ถ่าย + กรอกเลขออเดอร์</div><div class="qa-s">เลือกค่าย (default Grab) · ยืนยัน · เซฟ — หลังบ้านประมวลผลเอง ไม่ต้องรอ</div></div>
        </button>
        <button class="qa" style="background:linear-gradient(135deg,var(--info),#23525e);min-height:156px" data-cap="scan">
          <div class="qa-ico">${icon('scan', 26)}</div>
          <div><div class="qa-t">9.2 ถ่ายเร็ว (หลายใบ)</div><div class="qa-s">เลขออเดอร์ใส่/ไม่ใส่ก็ได้ · แนะนำ 2 ใบ: ① อาหารคู่บิล ② บิลอย่างเดียว — AI ถอดข้อความเฉพาะรูปบิล</div></div>
        </button>
        <button class="qa" style="background:linear-gradient(135deg,var(--riceberry),#3f2744);min-height:156px" data-cap="translate">
          <div class="qa-ico">${icon('languages', 26)}</div>
          <div><div class="qa-t">9.3 ถ่ายแปลภาษา → ไทย</div><div class="qa-s">ถ่ายป้าย/ฉลาก/ข้อความ แปลเป็นไทยทันที</div></div>
        </button>
      </div>

      <div class="card card-pad">
        <div class="row" style="justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:12px">
          <div class="section-title">ประวัติออเดอร์</div>
          <div class="row" style="gap:8px;flex-wrap:wrap">
            <button class="chip ${activePf === 'all' ? 'active' : ''}" data-pf="all">ทั้งหมด</button>
            ${pfs.map((p) => `<button class="chip ${activePf === p.id ? 'active' : ''}" data-pf="${p.id}">${esc(p.name)}</button>`).join('')}
            <div class="topbar-search" style="margin:0;width:auto">${icon('search', 16)}<input placeholder="ค้นเลขออเดอร์…"></div>
          </div>
        </div>
        <div class="grid cols-4">
          ${caps.map((c) => `<div class="card" style="box-shadow:var(--sh-1);overflow:hidden">
            <div style="aspect-ratio:4/3;background:var(--cream-200);display:grid;place-items:center;color:var(--ink-3);position:relative">
              ${icon('camera', 30)}
              <span class="pill" style="position:absolute;top:8px;left:8px;background:#fff;color:${pfName(c.platform).color};box-shadow:var(--sh-1)">${esc(pfName(c.platform).name)}</span>
              ${c.synced ? '' : `<span class="pill pill-orange" style="position:absolute;top:8px;right:8px">รอ sync</span>`}
            </div>
            <div style="padding:11px 13px">
              <div class="data" style="font-weight:600;font-size:15px">${esc(c.orderNo)}</div>
              <div class="li-s">${new Date(c.date).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>`).join('')}
        </div>
        <div class="row" style="justify-content:space-between;margin-top:16px">
          ${mockTag('fetch → Apps Script / Supabase (stub)')}
          <button class="btn btn-outline btn-sm">${icon('download', 16)} Export หลักฐาน</button>
        </div>
      </div>
    </div>`;
  },
  mount(ctx) {
    document.querySelectorAll('[data-pf]').forEach((el) => el.addEventListener('click', () => { activePf = el.dataset.pf; ctx.refresh(); }));
  },
};
