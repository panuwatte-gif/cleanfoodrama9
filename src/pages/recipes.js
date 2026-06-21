// ============================================================
// pages/recipes.js — สูตรอาหาร (เครื่องคิดสัดส่วน) · พอร์ตจาก prototype2 RecipesScreen
// ใส่ปริมาณรวมที่อยากได้ หรือแก้ช่องไหนก็ได้ → ปรับส่วนผสมที่เหลือตามสัดส่วน
// ช่องสัดส่วนอัปเดตในที่ (ไม่ paint) → ไม่เสีย focus ตอนพิมพ์
// ctx = { back, toast, role }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, searchBox, itemIc, emptyState } from "../components/components.js";
import { RECIPES } from "../data/seed.js";

const bold = (t) => h("b", null, t);
const rst = { open: RECIPES[0] && RECIPES[0].id, q: "" };

export function recipesScreen(ctx) {
  const root = h("div", { class: "page-wrap", "data-screen-label": "recipes", style: { display: "flex", flexDirection: "column", flex: 1 } });
  paint(root, ctx);
  return root;
}

function scalableRecipe(r, ctx) {
  const baseTotal = r.ing.reduce((a, ig) => a + ig[1], 0);
  let scale = 1;
  const fmtG = (g) => { const x = Math.round(g * 10) / 10; return x >= 10 ? String(Math.round(x)) : String(x); };
  const pct = (g) => Math.round((g / baseTotal) * 1000) / 10;
  const fields = [];
  let totalInput = null;
  const chips = [];

  const refresh = (exceptIdx) => {
    if (totalInput && exceptIdx !== -1) totalInput.value = fmtG(baseTotal * scale);
    fields.forEach(({ idx, input }) => { if (idx !== exceptIdx) input.value = fmtG(r.ing[idx][1] * scale); });
    chips.forEach((c) => c.el.classList.toggle("active", Math.abs(scale - c.m) < 0.001));
  };
  const onEdit = (idx, input) => {
    const s = input.value.replace(/[^0-9.]/g, ""); if (s !== input.value) input.value = s;
    const num = parseFloat(s);
    if (num > 0) scale = idx === -1 ? num / baseTotal : num / r.ing[idx][1];
    refresh(idx);
  };
  const mkField = (idx, big) => {
    const input = h("input", { type: "text", inputMode: "decimal", value: idx === -1 ? fmtG(baseTotal) : fmtG(r.ing[idx][1]), "aria-label": "ปริมาณ" });
    input.addEventListener("input", () => onEdit(idx, input));
    if (idx === -1) totalInput = input; else fields.push({ idx, input });
    return h("div", { class: "rcp-field" + (big ? " big" : "") }, input, h("span", null, r.unit));
  };

  const chipRow = h("div", { class: "rowflex", style: { gap: "8px", marginTop: "11px", flexWrap: "wrap" } });
  [0.5, 1, 2, 5].forEach((m) => {
    const el = h("button", { type: "button", class: "chip" + (Math.abs(scale - m) < 0.001 ? " active" : ""), onClick: () => { scale = m; refresh(null); } }, "×" + m);
    chips.push({ m, el }); chipRow.appendChild(el);
  });
  chipRow.appendChild(h("button", { type: "button", class: "chip", style: { marginLeft: "auto", color: "var(--muted)" }, onClick: () => { scale = 1; refresh(null); } }, pi("refresh", 12), "รีเซ็ต"));

  return h("div", { style: { padding: "2px 14px 14px" } },
    h("div", { class: "rcp-total" },
      h("div", { style: { minWidth: 0 } },
        h("div", { class: "overline", style: { color: "var(--primary-dark)" } }, "ปริมาณรวมที่ต้องการ"),
        h("div", { style: { fontSize: "11px", color: "var(--muted)", marginTop: "1px" } }, "แก้ช่องไหนก็ได้ — ปรับช่องอื่นให้ตามสัดส่วน"),
      ),
      mkField(-1, true),
    ),
    h("div", { class: "overline", style: { margin: "12px 0 4px" } }, "ส่วนผสม (ตามสัดส่วน)"),
    r.ing.map(([n], i) => h("div", { class: "rcp-row" },
      h("span", { class: "rcp-name" }, n, h("span", { class: "rcp-pct" }, pct(r.ing[i][1]) + "%")),
      mkField(i),
    )),
    chipRow,
    r.method && r.method.length > 0 && h("div", null,
      h("div", { class: "overline", style: { margin: "14px 0 6px" } }, "วิธีทำ / วิธีดอง"),
      h("div", { class: "stack", style: { gap: "6px" } },
        r.method.map((s, i) => h("div", { class: "rowflex", style: { alignItems: "flex-start", gap: "9px" } },
          h("span", { class: "step-num tnum" }, String(i + 1)),
          h("span", { style: { fontSize: "13px", lineHeight: 1.5 } }, s),
        )),
      ),
    ),
    ctx.role === "owner" && h("button", { type: "button", class: "btn btn-block", style: { marginTop: "12px" }, onClick: () => ctx.toast("เดโม — แก้สัดส่วนสูตร " + r.name) }, pi("edit", 15), "แก้สัดส่วนสูตร (เจ้าของ)"),
  );
}

function paint(root, ctx) {
  const rows = RECIPES.filter((r) => !rst.q || r.name.toLowerCase().includes(rst.q.toLowerCase()));
  const searchEl = searchBox({ value: rst.q, onChange: (v) => { rst.q = v; rst._refocus = true; paint(root, ctx); }, placeholder: "ค้นหาสูตร…" });
  searchEl.dataset.search = "1";
  root.replaceChildren(
    hdr({ title: "สูตรอาหาร", sub: "คำนวณสัดส่วน · ปรับปริมาณอัตโนมัติ", onBack: ctx.back, right: h("span", { class: "catic helper-ic-amber" }, pi("chefhat", 18)) }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      note(["ใส่", bold("ปริมาณรวม"), "ที่อยากได้ หรือแก้", bold("ช่องไหนก็ได้"), " — ระบบปรับส่วนผสมที่เหลือ", bold("ตามสัดส่วน"), "ให้อัตโนมัติ"], { iconName: "chefhat" }),
      searchEl,
      rows.map((r) => {
        const isOpen = rst.open === r.id;
        const baseTotal = r.ing.reduce((a, ig) => a + ig[1], 0);
        return h("div", { class: "acc-card" + (isOpen ? " open" : "") },
          h("button", { type: "button", class: "acc-head", onClick: () => { rst.open = isOpen ? null : r.id; paint(root, ctx); } },
            itemIc(r.item, { sm: false }),
            h("span", { style: { flex: 1, minWidth: 0 } },
              h("span", { style: { display: "block", fontWeight: 700, fontSize: "14.5px" } }, r.name),
              h("span", { class: "tnum", style: { display: "block", fontSize: "11.5px", color: "var(--muted)" } }, r.yield + " · รวม " + baseTotal + " " + r.unit),
            ),
            r.locked && h("span", { class: "owner-tag" }, pi("lock", 10), "สูตรล็อค"),
            h("span", { class: "acc-chev" }, pi("chevd", 16)),
          ),
          isOpen && scalableRecipe(r, ctx),
        );
      }),
      !rows.length && emptyState({ compact: true, iconName: "search", title: 'ไม่พบ "' + rst.q + '"', sub: "ลองพิมพ์ชื่อสูตรอื่น" }),
      ctx.role === "owner" && h("button", { type: "button", class: "btn btn-block", onClick: () => ctx.toast("เดโม — เพิ่มสูตรใหม่") }, pi("plus", 15), "เพิ่มสูตรใหม่"),
    ),
  );
  if (rst._refocus) { rst._refocus = false; const inp = root.querySelector('[data-search] input'); if (inp) { inp.focus(); const n = inp.value.length; inp.setSelectionRange(n, n); } }
}
