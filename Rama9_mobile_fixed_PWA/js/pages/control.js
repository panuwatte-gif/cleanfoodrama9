/* ============================================================
   pages/control.js — ฟังก์ชัน 9: ควบคุมระบบ & ต้นทุน
   เฉพาะแชมป์ (super owner) · รวม config ทุกฟังก์ชัน
   ============================================================ */
import { state } from '../state.js';
import { pageHead, esc, mockTag, icon } from '../components.js';

export default {
  render() {
    const c = state.config;
    const section = (title, sub, body) => `<div class="card card-pad"><div class="overline">${esc(title)}</div><div class="section-title" style="margin:2px 0 4px">${esc(sub)}</div><div style="margin-top:14px">${body}</div></div>`;
    const field = (label, value, suffix = '') => `<div style="margin-bottom:12px"><div class="field-label">${esc(label)}</div><div class="row" style="gap:8px"><input class="input data" value="${esc(value)}">${suffix ? `<span class="li-s" style="white-space:nowrap">${suffix}</span>` : ''}</div></div>`;

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'ควบคุมระบบ & ต้นทุน', desc: 'ศูนย์รวม config ทุกฟังก์ชัน · ปรับสูตร เงื่อนไข ค่าธรรมเนียม ได้โดยไม่ต้องแก้โค้ด', actions: `<span class="pill pill-purple">${icon('lock', 13)} เฉพาะแชมป์</span><button class="btn btn-primary">${icon('check', 18)} บันทึก config</button>` })}

      <div class="grid cols-3">
        ${section('ฟังก์ชัน 2', 'สูตรพยากรณ์', `
          <div class="field-label">น้ำหนักถ่วง (วันล่าสุด → เก่า)</div>
          <div class="row" style="gap:6px;margin-bottom:12px">${c.forecast.weights.map((w) => `<input class="input data" value="${w}" style="width:48px;text-align:center;padding:8px">`).join('')}</div>
          ${field('มองย้อนหลัง', c.forecast.lookbackDays, 'วัน')}
          ${field('เตือนสต็อกต่ำเมื่อ <', c.forecast.lowStockThresholdPct, '%')}`)}

        ${section('ฟังก์ชัน 4', 'การเงิน', `
          ${field('GP', c.finance.gpPercent, '%')}
          ${field('VAT', c.finance.vatPercent, '%')}
          <label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" ${c.finance.includeVatInGp ? 'checked' : ''}> <span class="li-s">รวม VAT ใน GP (→ ${(c.finance.gpPercent * (1 + c.finance.vatPercent / 100)).toFixed(1)}%)</span></label>`)}

        ${section('ฟังก์ชัน 6', 'คะแนนวันลา', `
          ${field('คะแนนตั้งต้น', c.scoring.baseScore)}
          ${field('คะแนนพิเศษ/มาแทนเพื่อน', c.scoring.extraScorePerCover)}
          ${field('ตัวคูณ ลาวันยอดสูง', c.scoring.salesWeightHigh, '×')}`)}

        ${section('ฟังก์ชัน 8', 'ค่าฟีแพลตฟอร์ม', `
          <table class="tbl"><tbody>${c.platforms.map((p) => `<tr><td><span class="pill" style="background:#fff;color:${p.color};border:1px solid var(--line-2)">${esc(p.name)}</span></td><td style="text-align:right"><input class="input data" value="${p.feePct}" style="width:64px;text-align:right;padding:7px">%</td></tr>`).join('')}</tbody></table>
          <button class="btn btn-outline btn-sm" style="width:100%;margin-top:10px">${icon('plus', 15)} เพิ่มแพลตฟอร์ม</button>`)}

        ${section('ร้านค้า', 'จัดการร้าน (เพิ่ม/เปลี่ยนชื่อ/ปิด)', `
          ${state.db.stores.map((s) => `<div class="li"><div class="li-ico" style="background:var(--sage-100);color:var(--basil-700)">${icon('store', 18)}</div><div class="li-main"><div class="li-t" style="font-size:13.5px">${esc(s.short)}</div><div class="li-s">${s.status}</div></div><button class="btn btn-ghost btn-sm">${icon('edit', 15)}</button></div>`).join('')}
          <button class="btn btn-outline btn-sm" style="width:100%;margin-top:10px">${icon('plus', 15)} เพิ่มร้าน</button>
          <div style="margin-top:10px">${mockTag('เปลี่ยนชื่อร้าน → propagate ทั้งระบบ')}</div>`)}

        ${section('ฟังก์ชัน 5', 'การเชื่อมต่อภายนอก', `
          ${field('Apps Script URL', c.integrations.appsScriptUrl || '')}
          ${field('Supabase URL', c.integrations.supabaseUrl || '')}
          ${field('LINE OA Token', c.integrations.lineOaToken ? '••••••' : '')}
          <div>${mockTag('stub — ยังไม่ยิงจริง')}</div>`)}
      </div>

      <div class="card card-pad" style="margin-top:18px;border-left:3px solid var(--chili)">
        <div class="row" style="justify-content:space-between"><div><div class="section-title">โซนอันตราย</div><div class="li-s">รีเซ็ตข้อมูลทั้งหมดกลับค่าเริ่มต้น (ล้าง localStorage)</div></div>
        <button class="btn btn-danger btn-sm" id="reset-all">${icon('refresh', 16)} รีเซ็ตข้อมูล</button></div>
      </div>
    </div>`;
  },
  mount() {
    const btn = document.getElementById('reset-all');
    if (btn) btn.addEventListener('click', async () => {
      if (confirm('รีเซ็ตข้อมูลทั้งหมดกลับค่าเริ่มต้น?')) { const { resetAll } = await import('../storage.js'); resetAll(); }
    });
  },
};
