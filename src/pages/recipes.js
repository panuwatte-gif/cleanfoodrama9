// ============================================================
// pages/recipes.js — สูตรอาหาร (เครื่องคิดสัดส่วน + แก้สูตรจริง)
// • ทุกคน: ใส่ปริมาณรวมที่อยากได้ → ปรับส่วนผสมที่เหลือตามสัดส่วน
// • เจ้าของ: กด "แก้สูตร" เพื่อแก้สัดส่วน/ชื่อส่วนผสม/วิธีทำ — บันทึกขึ้นคลาวด์
// ช่องสัดส่วนอัปเดตในที่ (ไม่ paint) → ไม่เสีย focus ตอนพิมพ์
// ctx = { back, toast, role }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, searchBox, itemIc, emptyState } from "../components/components.js";
import { recipesRows, saveRecipe } from "../data/store.js";

const rst = { open: null, q: "", editing: {} };

export function recipesScreen(ctx) {
  const rows = recipesRows();
  if (rst.open == null && rows[0]) rst.open = rows[0].id;
  const root = h("div", { class: "page-wrap", "data-screen-label": "recipes", style: { display: "flex", flexDirection: "column", flex: 1 } });
  paint(root, ctx);
  return root;
}

const fmtG = (g) => { const x = Math.round(g * 10) / 10; return x >= 10 ? String(Math.round(x)) : String(x); };

// ---- โหมดคำนวณสัดส่วน (ทุกคน) ----
function scalableRecipe(r, ctx) {
  const baseTotal = r.ing.reduce((a, ig) => a + ig[1], 0);
  let scale = 1;
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
    ctx.role === "owner" && h("button", { type: "button", class: "btn btn-block", style: { marginTop: "12px" }, onClick: () => { rst.editing[r.id] = true; paint(ctx._root, ctx); } }, pi("edit", 15), "แก้สูตร (เจ้าของ)"),
  );
}

// ---- โหมดแก้สูตรจริง (เจ้าของ) — แก้สัดส่วน/ชื่อ/วิธีทำ แล้วบันทึก ----
function recipeEditor(r, ctx) {
  const root = ctx._root;
  const save = () => { saveRecipe({ ...r }); ctx.toast('บันทึกสูตร "' + r.name + '" แล้ว'); };

  const ingRows = r.ing.map((ig, i) => {
    const nameIn = h("input", { type: "text", class: "input", value: ig[0], placeholder: "ชื่อส่วนผสม", style: { fontSize: "13.5px", flex: 1, minWidth: 0 } });
    const amtIn = h("input", { type: "text", inputMode: "decimal", class: "input tnum", value: fmtG(ig[1]), "aria-label": "ปริมาณ", style: { fontSize: "14px", width: "72px", textAlign: "right", flex: "none" } });
    nameIn.addEventListener("input", () => { r.ing[i][0] = nameIn.value; });
    nameIn.addEventListener("blur", save);
    amtIn.addEventListener("input", () => { const s = amtIn.value.replace(/[^0-9.]/g, ""); if (s !== amtIn.value) amtIn.value = s; r.ing[i][1] = parseFloat(s) || 0; });
    amtIn.addEventListener("blur", save);
    return h("div", { class: "rowflex", style: { gap: "7px", alignItems: "center" } },
      nameIn, amtIn,
      h("span", { style: { fontSize: "11.5px", color: "var(--faint)", flex: "none" } }, r.unit),
      h("button", { type: "button", class: "mini-btn", "aria-label": "ลบส่วนผสม", style: { color: "var(--danger)" }, onClick: () => { r.ing.splice(i, 1); if (!r.ing.length) r.ing.push(["ส่วนผสมใหม่", 100]); save(); paint(root, ctx); } }, pi("trash", 14)),
    );
  });

  const methodRows = (r.method || []).map((s, i) => {
    const ta = h("textarea", { class: "input", rows: "1", style: { fontSize: "13px", lineHeight: 1.5, minHeight: "40px", resize: "none", padding: "8px 10px", flex: 1, minWidth: 0 } });
    ta.value = s;
    const autosize = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; };
    setTimeout(autosize, 0);
    ta.addEventListener("input", () => { r.method[i] = ta.value; autosize(); });
    ta.addEventListener("blur", () => { r.method[i] = ta.value.trim() || "—"; save(); });
    return h("div", { class: "rowflex", style: { alignItems: "flex-start", gap: "8px" } },
      h("span", { class: "step-num tnum", style: { marginTop: "6px" } }, String(i + 1)),
      ta,
      h("button", { type: "button", class: "mini-btn", "aria-label": "ลบขั้นตอน", style: { marginTop: "4px", color: "var(--danger)" }, onClick: () => { r.method.splice(i, 1); save(); paint(root, ctx); } }, pi("trash", 14)),
    );
  });

  return h("div", { style: { padding: "2px 14px 14px" } },
    h("div", { class: "overline", style: { margin: "6px 0 6px" } }, "ส่วนผสม (สัดส่วนฐาน · " + r.unit + ")"),
    h("div", { class: "stack", style: { gap: "8px" } }, ingRows),
    h("button", { type: "button", class: "btn btn-block", style: { marginTop: "10px" }, onClick: () => { r.ing.push(["ส่วนผสมใหม่", 100]); save(); paint(root, ctx); } }, pi("plus", 14), "เพิ่มส่วนผสม"),

    h("div", { class: "overline", style: { margin: "16px 0 6px" } }, "วิธีทำ / วิธีดอง"),
    h("div", { class: "stack", style: { gap: "8px" } }, methodRows),
    h("button", { type: "button", class: "btn btn-block", style: { marginTop: "10px" }, onClick: () => { if (!r.method) r.method = []; r.method.push("ขั้นตอนใหม่ — แตะเพื่อแก้"); save(); paint(root, ctx); } }, pi("plus", 14), "เพิ่มขั้นตอน"),

    h("div", { class: "rowflex", style: { gap: "8px", marginTop: "16px" } },
      h("button", { type: "button", class: "btn", style: { flex: 1 }, onClick: () => { r.locked = !r.locked; save(); paint(root, ctx); } }, pi(r.locked ? "lock" : "edit", 14), r.locked ? "ปลดล็อคให้พนักงานดู" : "ล็อคสูตร"),
      h("button", { type: "button", class: "btn btn-primary", style: { flex: 1 }, onClick: () => { save(); rst.editing[r.id] = false; paint(root, ctx); } }, pi("check", 15), "เสร็จ"),
    ),
  );
}

function paint(root, ctx) {
  ctx._root = root;
  const all = recipesRows();
  const rows = all.filter((r) => !rst.q || r.name.toLowerCase().includes(rst.q.toLowerCase()));
  const searchEl = searchBox({ value: rst.q, onChange: (v) => { rst.q = v; rst._refocus = true; paint(root, ctx); }, placeholder: "ค้นหาสูตร…" });
  searchEl.dataset.search = "1";
  root.replaceChildren(
    hdr({ title: "สูตรอาหาร", sub: ctx.role === "owner" ? "คำนวณสัดส่วน · เจ้าของแก้สูตรได้" : "คำนวณสัดส่วน · ปรับปริมาณอัตโนมัติ", onBack: ctx.back, right: h("span", { class: "catic helper-ic-amber" }, pi("chefhat", 18)) }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      searchEl,
      rows.map((r) => {
        const isOpen = rst.open === r.id;
        const editing = ctx.role === "owner" && rst.editing[r.id];
        const baseTotal = r.ing.reduce((a, ig) => a + ig[1], 0);
        return h("div", { class: "acc-card" + (isOpen ? " open" : "") },
          h("button", { type: "button", class: "acc-head", onClick: () => { rst.open = isOpen ? null : r.id; paint(root, ctx); } },
            itemIc(r.item, { sm: false }),
            h("span", { style: { flex: 1, minWidth: 0 } },
              h("span", { style: { display: "block", fontWeight: 700, fontSize: "14.5px" } }, r.name),
              h("span", { class: "tnum", style: { display: "block", fontSize: "11.5px", color: "var(--muted)" } }, (r.yield || "") + " · รวม " + Math.round(baseTotal) + " " + r.unit),
            ),
            editing ? h("span", { class: "owner-tag" }, pi("edit", 10), "กำลังแก้") : (r.locked && h("span", { class: "owner-tag" }, pi("lock", 10), "สูตรล็อค")),
            h("span", { class: "acc-chev" }, pi("chevd", 16)),
          ),
          isOpen && (editing ? recipeEditor(r, ctx) : scalableRecipe(r, ctx)),
        );
      }),
      !rows.length && emptyState({ compact: true, iconName: "search", title: 'ไม่พบ "' + rst.q + '"', sub: "ลองพิมพ์ชื่อสูตรอื่น" }),
      ctx.role === "owner" && h("button", { type: "button", class: "btn btn-block", onClick: () => {
        const id = "rc-" + Date.now();
        saveRecipe({ id, item: "kp-beef", name: "สูตรใหม่", yield: "สูตรร้าน", unit: "g", locked: false, ing: [["ส่วนผสมใหม่", 100]], method: [] });
        rst.open = id; rst.editing[id] = true; ctx.toast("เพิ่มสูตรใหม่แล้ว — กรอกรายละเอียด"); paint(root, ctx);
      } }, pi("plus", 15), "เพิ่มสูตรใหม่"),
    ),
  );
  if (rst._refocus) { rst._refocus = false; const inp = root.querySelector('[data-search] input'); if (inp) { inp.focus(); const n = inp.value.length; inp.setSelectionRange(n, n); } }
}
