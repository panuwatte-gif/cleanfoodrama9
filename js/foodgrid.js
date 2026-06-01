/* ============================================================
   foodgrid.js — โครงตารางอาหาร+เครื่องดื่ม "มาตรฐานเดียว"
   ใช้ร่วมกันที่: หน้าส่ง/รับของ + หน้าต้นทุนรับอาหาร
   → เรียงเหมือนกัน รายการเหมือนกันเป๊ะ (รสชาติปกติ / ไม่เผ็ด / เครื่องดื่ม)
   เพิ่มเมนูที่ทะเบียนกลาง → ขึ้นทั้งสองหน้าอัตโนมัติ
   ------------------------------------------------------------
   ใช้: foodGrid({ headCols(variant), cell(item, variant) })
     headCols → string ของ <th> คอลัมน์ขวา
     cell     → string ของ <td> คอลัมน์ขวา (ต่อ 1 รายการ)
   ============================================================ */
import { categories, foodByProtein, itemsBySubcat } from './menu.js';
import { esc } from './components.js';

export function foodGrid({ headCols, cell }) {
  let html = '';
  categories().filter((c) => c.fromCentral).forEach((cat) => {
    if (cat.layout === 'spice') {
      html += `<div class="grid cols-2">
        ${card('รสชาติปกติ', 'เผ็ด · ใส่พริก+กระเทียม', 'var(--chili)', foodByProtein(cat.id, 'spicy'), 'spicy', headCols, cell)}
        ${card('ไม่เผ็ด', 'ไม่ใส่พริก+กระเทียม', 'var(--basil-600)', foodByProtein(cat.id, 'noSpice'), 'noSpice', headCols, cell)}
      </div>`;
    } else if (cat.layout === 'subcat') {
      html += `<div class="section-title" style="margin:18px 0 12px">${esc(cat.name)}</div><div class="grid cols-2">`;
      itemsBySubcat(cat.id).forEach((g) => {
        html += card(g.sub.name, null, 'var(--info)', [{ group: null, items: g.items }], 'drink', headCols, cell);
      });
      html += `</div>`;
    }
  });
  return html;
}

function card(title, sub, accent, groups, variant, headCols, cell) {
  const count = groups.reduce((s, g) => s + g.items.length, 0);
  return `<div class="card card-pad" style="border-top:3px solid ${accent}">
    <div class="row" style="justify-content:space-between;margin-bottom:4px"><div class="section-title">${esc(title)}</div><span class="pill pill-gray">${count} รายการ</span></div>
    ${sub ? `<div class="section-sub" style="margin-bottom:10px">${esc(sub)}</div>` : '<div style="height:6px"></div>'}
    <table class="tbl fg-tbl"><thead><tr><th>รายการ</th>${headCols(variant)}</tr></thead><tbody>
      ${groups.map((g) => `${g.group ? `<tr class="hb-grouprow"><td colspan="6">${esc(g.group.label)}</td></tr>` : ''}${g.items.map((it) => `<tr class="fg-row" data-item="${it.id}" data-variant="${variant}"><td>${esc(it.name)}</td>${cell(it, variant)}</tr>`).join('')}`).join('')}
    </tbody></table>
  </div>`;
}
