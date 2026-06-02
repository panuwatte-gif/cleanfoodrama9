/* ============================================================
   pages/recipe.js — ฟังก์ชัน 7: สูตรอาหารอัจฉริยะ + คำนวณย้อนกลับ
   ============================================================ */
import { state } from '../state.js';
import { can } from '../auth.js';
import { pageHead, esc, lockedNote, mockTag, icon } from '../components.js';

let activeRecipe = null;

export default {
  render() {
    const recipes = state.db.recipes;
    if (!activeRecipe) activeRecipe = recipes[0].id;
    const r = recipes.find((x) => x.id === activeRecipe) || recipes[0];
    const target = 250; // mock target grams
    const factor = target / r.baseGram;

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'สูตรอาหารอัจฉริยะ', desc: 'ปรับสัดส่วนวัตถุดิบอัตโนมัติจากปริมาณแกนหลัก + คำนวณย้อนกลับเมื่อใส่เกินสูตร (ล็อกได้หลายตัวแปร)' })}

      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:18px">
        ${recipes.map((x) => `<button class="chip ${x.id === activeRecipe ? 'active' : ''}" data-rcp="${x.id}">${esc(x.name)}</button>`).join('')}
        ${can.editSystemConfig() ? `<button class="chip" style="border-style:dashed">${icon('plus', 15)} สูตรใหม่</button>` : ''}
      </div>

      <div class="grid cols-2">
        <div class="card card-pad">
          <div class="row" style="justify-content:space-between;margin-bottom:6px"><div class="section-title">โหมดปกติ (Dynamic)</div><span class="pill pill-green">×${factor.toFixed(2)}</span></div>
          <div class="section-sub">กำหนดปริมาณแกนหลัก → ระบบปรับตัวอื่นตามสัดส่วน</div>
          <div class="field-label">ปริมาณ${esc(r.ingredients[0].name)} (กรัม)</div>
          <input class="input data" value="${target}" style="margin-bottom:16px">
          <table class="tbl">
            <thead><tr><th>วัตถุดิบ</th><th style="text-align:right">สัดส่วน</th><th style="text-align:right">ต้องใช้ (ก.)</th></tr></thead>
            <tbody>${r.ingredients.map((ing) => `<tr><td>${esc(ing.name)}</td><td data-label="สัดส่วน" class="num data" style="color:var(--ink-3)">${ing.ratio}</td><td data-label="ต้องใช้ (ก.)" class="num data" style="font-weight:600;color:var(--basil-700)">${(ing.ratio * factor).toFixed(0)}</td></tr>`).join('')}</tbody>
          </table>
        </div>

        <div class="card card-pad">
          <div class="row" style="justify-content:space-between;margin-bottom:6px"><div class="section-title">คำนวณย้อนกลับ (Reverse)</div><span class="pill pill-orange">${icon('refresh', 13)} แก้รสให้สมดุล</span></div>
          <div class="section-sub">ปรุงพลาด? ล็อกค่าที่ใส่เกิน ระบบบอกว่าต้องเติมอะไรเพิ่มอีกเท่าไร</div>
          <div class="li"><div class="li-ico" style="background:var(--chili-soft);color:var(--chili)">${icon('lock', 18)}</div>
            <div class="li-main"><div class="li-t">น้ำปลา (ล็อก)</div><div class="li-s">ใส่จริง 140 ก. · สูตร 100 ก.</div></div>
            <input class="input data" value="140" style="width:90px;text-align:right"></div>
          <div style="margin:12px 0;padding:14px;background:var(--sage-100);border-radius:var(--r-md)">
            <div class="overline" style="margin-bottom:8px">ต้องเติมเพิ่ม</div>
            ${[['พริก', 35, 25], ['มะนาว', 56, 40], ['กระเทียม', 21, 15]].map(([n, now, base]) => `<div class="row" style="justify-content:space-between;padding:5px 0"><span>${n}</span><span class="data" style="font-weight:600;color:var(--basil-700)">+${(now - base)} ก.</span></div>`).join('')}
          </div>
          <button class="btn btn-outline btn-sm" style="width:100%">${icon('plus', 15)} ล็อกตัวแปรเพิ่ม</button>
          <div style="margin-top:12px">${mockTag('Pure function reverse-ratio · ต่อจริงในฟังก์ชัน 7')}</div>
        </div>
      </div>

      ${can.editSystemConfig() ? '' : lockedNote('การแก้ "สูตรต้นแบบ" ทำได้เฉพาะแชมป์ — คุณใช้คำนวณได้ตามปกติ')}
    </div>`;
  },
  mount(ctx) {
    document.querySelectorAll('[data-rcp]').forEach((el) => el.addEventListener('click', () => { activeRecipe = el.dataset.rcp; ctx.refresh(); }));
  },
};
