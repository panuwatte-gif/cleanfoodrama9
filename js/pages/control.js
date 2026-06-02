/* ============================================================
   pages/control.js — ตั้งค่า (Setting · ข้อ 13)
   ศูนย์รวมคุมทั้งแอป: สูตรคำนวณ · ปริมาณมาตรฐาน · ค่าฟี · ร้าน · เชื่อมต่อ
   เฉพาะแชมป์ (super owner)
   ============================================================ */
import { state } from '../state.js';
import { pageHead, esc, mockTag, icon } from '../components.js';
import { openForm, confirmDelete, addRow, updateRow, removeRow, commit, genId } from '../crud.js';

export default {
  render() {
    const c = state.config;
    const section = (title, sub, body, accent) => `<div class="card card-pad" style="${accent ? `border-top:3px solid ${accent}` : ''}"><div class="overline">${esc(title)}</div><div class="section-title" style="margin:2px 0 4px">${esc(sub)}</div><div style="margin-top:14px">${body}</div></div>`;
    const field = (label, value, suffix = '') => `<div style="margin-bottom:12px"><div class="field-label">${esc(label)}</div><div class="row" style="gap:8px"><input class="input data" value="${esc(value)}">${suffix ? `<span class="li-s" style="white-space:nowrap">${suffix}</span>` : ''}</div></div>`;

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'ตั้งค่า', desc: 'ศูนย์รวมคุมทุกอย่างในแอป · ปรับสูตร เงื่อนไข ค่ามาตรฐาน ค่าธรรมเนียม ได้โดยไม่ต้องแก้โค้ด', actions: `<span class="pill pill-purple">${icon('lock', 13)} เฉพาะแชมป์</span><button class="btn btn-primary">${icon('check', 18)} บันทึก</button>` })}

      <div class="locked" style="margin-bottom:18px;border-left-color:var(--carrot)">${icon('alert', 16)} <span>สูตรบางตัว (คะแนน, ค่าเฉลี่ยถ่วงน้ำหนัก) ยังเป็นเวอร์ชันเริ่มต้น — ปรับตัวแปรได้ที่นี่ และจะทำให้ละเอียดขึ้นเมื่อใช้งานจริง</span></div>

      <div class="grid cols-3">
        ${section('สูตรพยากรณ์', 'ค่าเฉลี่ยถ่วงน้ำหนัก (ฟังก์ชัน 2)', `
          <div class="field-label">น้ำหนักถ่วง (วันล่าสุด → เก่า)</div>
          <div class="row" style="gap:6px;margin-bottom:8px">${c.forecast.weights.map((w) => `<input class="input data" value="${w}" style="width:46px;text-align:center;padding:8px">`).join('')}</div>
          <div class="stk-note" style="margin-bottom:12px">พยากรณ์ = Σ(ยอดขายย้อนหลัง × น้ำหนัก) ÷ Σ(น้ำหนัก) · เทียบวันเดียวกัน (จ.–จ.)</div>
          ${field('มองย้อนหลัง', c.forecast.lookbackDays, 'วัน')}
          ${field('เตือนสต็อกต่ำเมื่อ <', c.forecast.lowStockThresholdPct, '%')}`, 'var(--basil-600)')}

        ${section('การเงิน', 'GP / VAT (ฟังก์ชัน 4)', `
          ${field('GP', c.finance.gpPercent, '%')}
          ${field('VAT', c.finance.vatPercent, '%')}
          <label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" ${c.finance.includeVatInGp ? 'checked' : ''}> <span class="li-s">รวม VAT ใน GP (→ ${(c.finance.gpPercent * (1 + c.finance.vatPercent / 100)).toFixed(1)}%)</span></label>`, 'var(--carrot)')}

        ${section('ปริมาณมาตรฐาน', 'ต่อจาน (ฟังก์ชัน 7)', `
          ${field('ข้าว/แป้ง (ค่าเริ่มต้น)', c.menu.portionStd.rice, 'กรัม')}
          ${field('เนื้อสัตว์ (ค่าเริ่มต้น)', c.menu.portionStd.protein, 'กรัม')}
          <div class="stk-note">แก้รายเมนูได้ที่หน้าคู่มือ (เช่น XL, เมนูเส้น)</div>`, 'var(--riceberry)')}

        ${section('คะแนนวันลา', 'Scoring (ฟังก์ชัน 6)', `
          ${field('คะแนนตั้งต้น', c.scoring.baseScore)}
          ${field('ตัวคูณบทลงโทษการลา', c.scoring.leavePenaltyFactor, '×')}
          ${field('คะแนนพิเศษ/มาแทนเพื่อน', c.scoring.extraScorePerCover)}
          <div class="row" style="gap:8px">${field('ลาวันยอดสูง', c.scoring.salesWeightHigh, '×')}${field('ลาวันยอดต่ำ', c.scoring.salesWeightLow, '×')}</div>
          <div class="stk-note">ลาในวันยอดขายสูง = หักหนักกว่า</div>`, 'var(--basil-600)')}

        ${section('ค่าฟีแพลตฟอร์ม', 'Delivery (ฟังก์ชัน 8)', `
          <table class="tbl"><tbody>${c.platforms.map((p) => `<tr><td><span class="pill" style="background:#fff;color:${p.color};border:1px solid var(--line-2)">${esc(p.name)}</span></td><td data-label="ค่าฟี" style="text-align:right"><input class="input data pf-fee" data-pf="${p.id}" value="${p.feePct}" style="width:60px;text-align:right;padding:7px">%</td><td data-label="" style="text-align:right;width:36px"><button class="btn btn-ghost btn-sm" data-pf-del="${p.id}">${icon('trash', 14)}</button></td></tr>`).join('')}</tbody></table>
          <button class="btn btn-outline btn-sm" style="width:100%;margin-top:10px" id="add-pf">${icon('plus', 15)} เพิ่มแพลตฟอร์ม</button>`, 'var(--info)')}

        ${section('ร้านค้า', 'จัดการร้าน (เพิ่ม/เปลี่ยนชื่อ/ปิด) · ขายหลายแพลตฟอร์ม', `
          ${state.db.stores.map((s) => `<div class="li"><div class="li-ico" style="background:var(--sage-100);color:var(--basil-700)">${icon('store', 18)}</div><div class="li-main"><div class="li-t" style="font-size:13.5px">${esc(s.short)} ${s.status === 'active' ? '<span class="pill pill-green" style="font-size:10px">เปิด</span>' : '<span class="pill pill-gray" style="font-size:10px">เตรียมเปิด</span>'}</div><div class="li-s">${(s.platforms || []).map((pid) => c.platforms.find((p) => p.id === pid)?.name || pid).join(' · ') || 'ยังไม่ระบุแพลตฟอร์ม'}</div></div><div class="row" style="gap:4px"><button class="btn btn-ghost btn-sm" data-store-edit="${s.id}">${icon('edit', 15)}</button><button class="btn btn-ghost btn-sm" data-store-del="${s.id}" style="color:var(--chili)">${icon('trash', 15)}</button></div></div>`).join('')}
          <button class="btn btn-outline btn-sm" style="width:100%;margin-top:10px" id="add-store">${icon('plus', 15)} เพิ่มร้าน</button>
          <div style="margin-top:10px" class="stk-note">${icon('refresh', 13)} เพิ่ม/แก้ร้าน → ตัวสลับร้านบนหัว·ทั้งระบบอัปเดตตาม</div>`, 'var(--carrot)')}
      </div>

      <div class="card card-pad" style="margin-top:18px">
        <div class="section-title" style="margin-bottom:4px">จัดการข้อมูลแต่ละหน้า</div>
        <div class="section-sub">เพิ่ม/แก้/ลบ/สลับลำดับ เมนู หมวด รายการ — ทำได้ที่หน้านั้น ๆ โดยตรง (จำกัดสิทธิ์ตาม login)</div>
        <div class="grid cols-4">
          ${[['เมนู & หมวดสต็อก', 'boxes', 'stock'], ['ราคา/หน่วยซื้อ', 'coins', 'expenses'], ['สูตรอาหาร', 'flask', 'recipe'], ['ผู้ใช้ & สิทธิ์', 'users', 'users']].map(([t, ic, nav]) => `
            <button class="qa" style="background:var(--paper);color:var(--ink);border:1px solid var(--line);min-height:96px;box-shadow:var(--sh-1)" data-nav="${nav}">
              <div class="qa-ico" style="background:var(--sage-100);color:var(--basil-700)">${icon(ic, 20)}</div>
              <div><div class="qa-t" style="font-size:14px">${t}</div></div></button>`).join('')}
        </div>
      </div>

      <div class="grid cols-2" style="margin-top:18px">
        ${section('การเชื่อมต่อภายนอก', 'Apps Script · Supabase · LINE (ฟังก์ชัน 5)', `
          ${field('Apps Script URL', c.integrations.appsScriptUrl || '')}
          ${field('Supabase URL', c.integrations.supabaseUrl || '')}
          ${field('LINE OA Token', c.integrations.lineOaToken ? '••••••' : '')}
          <div>${mockTag('stub — ยังไม่ยิงจริง')}</div>`, 'var(--info)')}

        <div class="card card-pad" style="border-left:3px solid var(--chili)">
          <div class="overline" style="color:var(--chili)">โซนอันตราย</div>
          <div class="section-title" style="margin:2px 0 4px">รีเซ็ตข้อมูล</div>
          <div class="section-sub">ล้างข้อมูลทั้งหมดใน localStorage กลับค่าเริ่มต้น</div>
          <button class="btn btn-danger btn-sm" id="reset-all">${icon('refresh', 16)} รีเซ็ตข้อมูลทั้งหมด</button>
        </div>
      </div>
    </div>`;
  },
  mount(ctx) {
    const btn = document.getElementById('reset-all');
    if (btn) btn.addEventListener('click', async () => {
      if (confirm('รีเซ็ตข้อมูลทั้งหมดกลับค่าเริ่มต้น?')) { const { resetAll } = await import('../storage.js'); resetAll(); }
    });

    const platformOpts = () => state.config.platforms.map((p) => ({ value: p.id, label: p.name }));

    // ---- ร้าน: เพิ่ม ----
    document.getElementById('add-store')?.addEventListener('click', () => openForm({
      title: 'เพิ่มร้าน',
      fields: [
        { key: 'short', label: 'ชื่อร้าน (ย่อ)', type: 'text', placeholder: 'เช่น สาขาทองหล่อ' },
        { key: 'name', label: 'ชื่อเต็ม', type: 'text', placeholder: 'กะเพราโคตรคลีน — สาขา…' },
        { key: 'status', label: 'สถานะ', type: 'select', options: [{ value: 'active', label: 'เปิดให้บริการ' }, { value: 'planned', label: 'เตรียมเปิด' }], value: 'active' },
        { key: 'platforms', label: 'ขายบนแพลตฟอร์ม', type: 'multiselect', options: platformOpts(), value: state.config.platforms.map((p) => p.id) },
      ],
      onSave: (v) => {
        if (!v.short) return false;
        addRow('stores', { id: genId('store'), short: v.short, name: v.name || v.short, status: v.status, platforms: v.platforms || [] });
        ctx.refresh();
      },
    }));

    // ---- ร้าน: แก้ / ลบ ----
    document.querySelectorAll('[data-store-edit]').forEach((el) => el.addEventListener('click', () => {
      const s = state.db.stores.find((x) => x.id === el.dataset.storeEdit);
      openForm({
        title: 'แก้ไขร้าน', values: s,
        fields: [
          { key: 'short', label: 'ชื่อร้าน (ย่อ)', type: 'text' },
          { key: 'name', label: 'ชื่อเต็ม', type: 'text' },
          { key: 'status', label: 'สถานะ', type: 'select', options: [{ value: 'active', label: 'เปิดให้บริการ' }, { value: 'planned', label: 'เตรียมเปิด' }] },
          { key: 'platforms', label: 'ขายบนแพลตฟอร์ม', type: 'multiselect', options: platformOpts() },
        ],
        onSave: (v) => { updateRow('stores', s.id, v); ctx.refresh(); },
      });
    }));
    document.querySelectorAll('[data-store-del]').forEach((el) => el.addEventListener('click', () => {
      const s = state.db.stores.find((x) => x.id === el.dataset.storeDel);
      confirmDelete(`ลบร้าน "${s.short}" ?`, () => {
        removeRow('stores', s.id);
        if (state.session.activeStoreId === s.id) state.session.activeStoreId = state.db.stores.find((x) => x.status === 'active')?.id;
        ctx.refresh();
      });
    }));

    // ---- แพลตฟอร์ม: แก้ฟี / ลบ / เพิ่ม ----
    document.querySelectorAll('.pf-fee').forEach((el) => el.addEventListener('change', () => {
      const p = state.config.platforms.find((x) => x.id === el.dataset.pf);
      if (p) { p.feePct = parseFloat(el.value) || 0; commit(); }
    }));
    document.querySelectorAll('[data-pf-del]').forEach((el) => el.addEventListener('click', () => {
      const p = state.config.platforms.find((x) => x.id === el.dataset.pfDel);
      confirmDelete(`ลบแพลตฟอร์ม "${p.name}" ?`, () => {
        const i = state.config.platforms.findIndex((x) => x.id === p.id);
        state.config.platforms.splice(i, 1); commit(); ctx.refresh();
      });
    }));
    document.getElementById('add-pf')?.addEventListener('click', () => openForm({
      title: 'เพิ่มแพลตฟอร์ม',
      fields: [
        { key: 'name', label: 'ชื่อแพลตฟอร์ม', type: 'text', placeholder: 'เช่น Robinhood' },
        { key: 'feePct', label: 'ค่าธรรมเนียม (%)', type: 'number', value: 30 },
        { key: 'color', label: 'สี', type: 'color', options: ['#00b14f', '#06c755', '#ee4d2d', '#2A6FDB', '#e08a3c'] },
      ],
      onSave: (v) => {
        if (!v.name) return false;
        state.config.platforms.push({ id: genId('pf'), name: v.name, feePct: v.feePct || 0, color: v.color, prefix: v.name.slice(0, 2).toUpperCase(), enabled: true });
        commit(); ctx.refresh();
      },
    }));
  },
};
