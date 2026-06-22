// ============================================================
// pages/nutrition.js — โภชนาการและสารอาหาร (หน้า "ข้อมูล")
//   • ต่อเมนู: พลังงาน/โปรตีน/คาร์บ/ไขมัน ต่อ 1 จาน-แก้ว
//   • ต่อวัตถุดิบ: ค่าต่อ 100 ก. / ต่อฟอง / ต่อขวด
//   • เพิ่ม / แก้ไข / ลบ ข้อมูลได้ (เก็บลง localStorage ผ่าน store)
// ctx = { go, back, role, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, seg, searchBox, itemIc, emo, emptyState, qtyInput } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { itemById, sectionsFor, sortMenus } from "../utils/formulas.js";
import { cats, menus, nutriMenu, nutriIngr, saveNutri, removeNutri } from "../data/store.js";
import { uid } from "../utils/id.js";

const bold = (t) => h("b", null, t);
const nst = { mode: "menu", q: "", ctx: null, edit: null, draft: {} };
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

// แถวมาโคร 4 ช่อง: พลังงาน · โปรตีน · คาร์บ · ไขมัน (ตัวเลข tabular)
function macroRow(n) {
  const cell = (val, unit, lbl, col) => h("div", { style: { flex: 1, textAlign: "center", padding: "2px 0" } },
    h("div", { class: "tnum", style: { fontSize: "17px", fontWeight: 800, color: col, lineHeight: 1.1 } }, val),
    h("div", { style: { fontSize: "9.5px", color: "var(--faint)", marginTop: "1px" } }, unit),
    h("div", { style: { fontSize: "10.5px", color: "var(--muted)", marginTop: "2px", fontWeight: 600 } }, lbl),
  );
  return h("div", { class: "rowflex", style: { gap: "4px", background: "var(--bg)", borderRadius: "12px", padding: "8px 4px", border: "1px solid var(--border-soft)" } },
    cell(n.kcal, "kcal", "พลังงาน", "var(--text)"),
    cell(n.p, "กรัม", "โปรตีน", "var(--primary-dark)"),
    cell(n.c, "กรัม", "คาร์บ", "#B45309"),
    cell(n.f, "กรัม", "ไขมัน", "#1D4ED8"),
  );
}

// ปุ่มดินสอมุมการ์ด (บอกว่าการ์ดนี้แตะแก้ได้)
function editChip() {
  return h("span", { class: "catic green sm", style: { flex: "none" } }, pi("edit", 15));
}

// การ์ดเมนู — แตะเพื่อแก้/เพิ่มข้อมูล
function menuCard(root, m) {
  const n = nutriMenu()[m.id];
  return h("button", {
    type: "button", class: "card list-press", style: { padding: "12px 14px", width: "100%", textAlign: "left", display: "block" },
    onClick: () => openEdit(root, { mode: "menu", id: m.id, name: m.name, item: m.item, isNew: !n }),
  },
    h("div", { class: "rowflex", style: { marginBottom: n ? "10px" : "0" } },
      itemIc(m.item, { sm: false }),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { style: { fontWeight: 700, fontSize: "14.5px" } }, m.name),
        h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "ต่อ 1 จาน/แก้ว เสิร์ฟ"),
      ),
      editChip(),
    ),
    n
      ? macroRow(n)
      : h("div", { class: "rowflex", style: { gap: "6px", color: "var(--primary-dark)", fontSize: "12.5px", fontWeight: 700, padding: "2px 2px" } }, pi("plus", 15), "เพิ่มข้อมูลโภชนาการ"),
  );
}

// การ์ดวัตถุดิบ — แตะเพื่อแก้/เพิ่มข้อมูล
function ingrCard(root, { id, name, item, n, isCustom }) {
  return h("button", {
    type: "button", class: "card list-press", style: { padding: "10px 13px", width: "100%", textAlign: "left", display: "block" },
    onClick: () => openEdit(root, { mode: "ingr", id, name, item, isCustom, isNew: !n }),
  },
    h("div", { class: "rowflex", style: { marginBottom: n ? "8px" : "0" } },
      item ? itemIc(item, { sm: true }) : h("span", { class: "catic green sm" }, pi("leaf", 15)),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { style: { fontWeight: 700, fontSize: "13.5px" } }, name),
        h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, n ? "ค่าต่อ " + (n.per || "—") : "ยังไม่มีข้อมูล"),
      ),
      editChip(),
    ),
    n
      ? macroRow(n)
      : h("div", { class: "rowflex", style: { gap: "6px", color: "var(--primary-dark)", fontSize: "12px", fontWeight: 700, padding: "2px 2px" } }, pi("plus", 14), "เพิ่มข้อมูล"),
  );
}

export function nutritionScreen(ctx) {
  nst.ctx = ctx;
  nst.edit = null;
  const root = h("div", { class: "page-wrap", "data-screen-label": "nutrition" });
  root._sheets = h("div");
  paint(root);
  return root;
}

function paint(root) {
  const { back } = nst.ctx;
  const q = nst.q.toLowerCase();
  const searchEl = searchBox({ value: nst.q, onChange: (v) => { nst.q = v; paint(root); }, placeholder: nst.mode === "menu" ? "ค้นหาเมนู…" : "ค้นหาวัตถุดิบ…" });

  const addBtn = h("button", {
    type: "button", class: "btn btn-soft btn-block", style: { fontWeight: 700, justifyContent: "center" },
    onClick: () => openEdit(root, { mode: nst.mode, isNew: true, isCustom: true }),
  }, pi("plus", 16), nst.mode === "menu" ? "เพิ่มเมนูใหม่" : "เพิ่มวัตถุดิบใหม่");

  let body;
  if (nst.mode === "menu") {
    const list = sortMenus(menus()).filter((m) => !q || m.name.toLowerCase().includes(q));
    // รายการที่เพิ่มเอง (ไม่ผูกกับเมนูในระบบ)
    const menuIds = new Set(menus().map((m) => m.id));
    const customs = Object.keys(nutriMenu())
      .filter((id) => !menuIds.has(id))
      .map((id) => ({ id, ...nutriMenu()[id] }))
      .filter((e) => !q || (e.name || "").toLowerCase().includes(q));

    const nodes = list.map((m) => menuCard(root, m));
    if (customs.length) {
      nodes.push(h("div", { class: "overline", style: { marginTop: "4px" } }, "เพิ่มเอง"));
      customs.forEach((e) => nodes.push(menuCustomCard(root, e)));
    }
    body = (list.length || customs.length)
      ? h("div", { class: "stack" }, nodes)
      : emptyState({ compact: true, iconName: "search", title: 'ไม่พบ "' + nst.q + '"', sub: "ลองพิมพ์ชื่อเมนูอื่น" });
  } else {
    // วัตถุดิบ — แบ่งหมวด เฉพาะรายการที่มีค่าโภชนาการ + รายการเพิ่มเอง
    const FOOD_CATS = cats().filter((c) => ["protein", "egg", "rice", "drink"].includes(c.id));
    const nodes = [];
    const seen = new Set();
    sectionsFor(FOOD_CATS).forEach((sec) => {
      const rows = sec.items
        .filter((it) => nutriIngr()[it.id] && (!q || it.name.toLowerCase().includes(q)))
        .map((it) => { seen.add(it.id); return ingrCard(root, { id: it.id, name: it.name, item: it, n: nutriIngr()[it.id] }); });
      if (rows.length) {
        nodes.push(h("div", { class: "overline", style: { display: "flex", alignItems: "center", gap: "7px" } }, emo(sec.icon, { s: 14 }), sec.name));
        nodes.push(...rows);
      }
    });
    // รายการที่เพิ่มเอง หรือไม่อยู่ในหมวดอาหารด้านบน
    const customs = Object.keys(nutriIngr())
      .filter((id) => !seen.has(id))
      .map((id) => ({ id, n: nutriIngr()[id], it: itemById(id) }))
      .filter((e) => { const nm = e.it ? e.it.name : (e.n.name || ""); return !q || nm.toLowerCase().includes(q); });
    if (customs.length) {
      nodes.push(h("div", { class: "overline", style: { marginTop: "4px" } }, "อื่นๆ / เพิ่มเอง"));
      customs.forEach((e) => nodes.push(ingrCard(root, {
        id: e.id, name: e.it ? e.it.name : (e.n.name || "ไม่มีชื่อ"), item: e.it || null, n: e.n, isCustom: !e.it,
      })));
    }
    body = nodes.length ? h("div", { class: "stack" }, nodes) : emptyState({ compact: true, iconName: "search", title: "ไม่พบวัตถุดิบ", sub: "ลองคำอื่น หรือกด \"เพิ่มวัตถุดิบใหม่\"" });
  }

  root.replaceChildren(
    hdr({ title: "โภชนาการและสารอาหาร", sub: "ต่อเมนู และต่อวัตถุดิบ · เพิ่ม/แก้ไข/ลบ ได้", onBack: back, right: h("span", { class: "catic green" }, pi("leaf", 18)) }),
    h("div", { class: "page stack" },
      note(["พลังงาน · โปรตีน · คาร์บ · ไขมัน ", bold("ต่อเมนู"), " และ ", bold("ต่อวัตถุดิบ"), " — ", bold("แตะการ์ด"), "เพื่อแก้/ลบ หรือกดปุ่มด้านล่างเพื่อเพิ่มรายการใหม่"], { iconName: "leaf" }),
      seg({ value: nst.mode, grow: true, options: [{ v: "menu", t: "ต่อเมนู" }, { v: "ingr", t: "ต่อวัตถุดิบ" }], onChange: (v) => { nst.mode = v; nst.q = ""; paint(root); } }),
      searchEl,
      addBtn,
      body,
    ),
    root._sheets,
  );

  renderSheets(root);
  if (nst.q) { const inp = searchEl.querySelector("input"); if (inp) { inp.focus(); const n = inp.value.length; inp.setSelectionRange(n, n); } }
}

// การ์ดเมนูที่เพิ่มเอง (ไม่มี item icon — ใช้ leaf)
function menuCustomCard(root, e) {
  return h("button", {
    type: "button", class: "card list-press", style: { padding: "12px 14px", width: "100%", textAlign: "left", display: "block" },
    onClick: () => openEdit(root, { mode: "menu", id: e.id, name: e.name, isCustom: true, isNew: false }),
  },
    h("div", { class: "rowflex", style: { marginBottom: "10px" } },
      h("span", { class: "catic green sm" }, pi("leaf", 15)),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { style: { fontWeight: 700, fontSize: "14.5px" } }, e.name || "ไม่มีชื่อ"),
        h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "ต่อ 1 จาน/แก้ว เสิร์ฟ · เพิ่มเอง"),
      ),
      editChip(),
    ),
    macroRow(e),
  );
}

// ---- เปิดชีตแก้/เพิ่ม ----
function openEdit(root, { mode, id = null, name = "", item = null, isCustom = false, isNew = false } = {}) {
  const map = mode === "menu" ? nutriMenu() : nutriIngr();
  const existing = (id && map[id]) || {};
  nst.edit = { mode, id, name, item, isCustom, isNew };
  nst.draft = {
    name: isCustom ? (existing.name || name || "") : (name || ""),
    per: existing.per || (mode === "ingr" ? "100 ก." : ""),
    kcal: existing.kcal != null ? String(existing.kcal) : "",
    p: existing.p != null ? String(existing.p) : "",
    c: existing.c != null ? String(existing.c) : "",
    f: existing.f != null ? String(existing.f) : "",
  };
  renderSheets(root);
}

function textField(label, key, placeholder) {
  const input = h("input", {
    type: "text", class: "input", value: nst.draft[key] || "", placeholder,
    style: { width: "100%" },
    onInput: (e) => { nst.draft[key] = e.target.value; },
  });
  return h("div", { class: "stack", style: { gap: "6px" } }, h("div", { class: "field-label" }, label), input);
}

function macroField(label, unit, key, col) {
  return h("div", { class: "stack", style: { gap: "5px" } },
    h("div", { class: "field-label" }, label + " (" + unit + ")"),
    qtyInput({ value: nst.draft[key], onChange: (v) => { nst.draft[key] = v; }, wide: true }),
  );
}

function saveDraft(root) {
  const e = nst.edit;
  const { ctx } = nst;
  const name = (nst.draft.name || "").trim();
  if (e.isCustom && !name) { ctx.toast("ใส่ชื่อรายการก่อนบันทึก"); return; }
  const data = { kcal: num(nst.draft.kcal), p: num(nst.draft.p), c: num(nst.draft.c), f: num(nst.draft.f) };
  if (e.mode === "ingr") data.per = (nst.draft.per || "").trim() || "100 ก.";
  if (e.isCustom) data.name = name;
  const id = e.id || uid(e.mode === "menu" ? "mn-x" : "in-x");
  const wasNew = e.isNew;
  nst.edit = null;
  saveNutri(e.mode, id, data); // async — bumpData() → รีเรนเดอร์ทั้งหน้า
  ctx.toast(wasNew ? "เพิ่มข้อมูลโภชนาการแล้ว" : "บันทึกแล้ว");
}

function delDraft(root) {
  const e = nst.edit;
  const { ctx } = nst;
  nst.edit = null;
  removeNutri(e.mode, e.id);
  ctx.toast("ลบข้อมูลแล้ว");
}

function renderSheets(root) {
  const layer = root._sheets;
  layer.replaceChildren();
  const e = nst.edit;
  if (!e) return;

  const title = e.isNew ? (e.isCustom ? "เพิ่มรายการใหม่" : "เพิ่มข้อมูลโภชนาการ") : "แก้ไขข้อมูลโภชนาการ";
  const sub = e.isCustom ? (e.mode === "menu" ? "เมนูที่เพิ่มเอง" : "วัตถุดิบที่เพิ่มเอง") : (e.name || "");

  layer.appendChild(sheet({
    onClose: () => { nst.edit = null; renderSheets(root); },
    children: h("div", null,
      h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 4px" } }, title),
      h("p", { style: { fontSize: "12.5px", color: "var(--muted)", textAlign: "center", margin: "0 0 14px" } }, sub),

      h("div", { class: "stack", style: { gap: "12px" } },
        e.isCustom && textField("ชื่อรายการ", "name", e.mode === "menu" ? "เช่น สลัดอกไก่ย่าง" : "เช่น อกไก่ลวก"),
        e.mode === "ingr" && textField("ค่าต่อหน่วย", "per", "เช่น 100 ก. / 1 ฟอง / 1 ขวด"),
        h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" } },
          macroField("พลังงาน", "kcal", "kcal"),
          macroField("โปรตีน", "กรัม", "p"),
          macroField("คาร์บ", "กรัม", "c"),
          macroField("ไขมัน", "กรัม", "f"),
        ),
      ),

      note(e.mode === "menu" ? "ค่าต่อ 1 จาน/แก้ว เสิร์ฟ" : "ค่าต่อหน่วยที่ระบุไว้ด้านบน"),

      h("div", { class: "rowflex", style: { gap: "10px", marginTop: "14px" } },
        h("button", { type: "button", class: "btn btn-block", onClick: () => { nst.edit = null; renderSheets(root); } }, "ยกเลิก"),
        h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => saveDraft(root) }, pi("check", 16), "บันทึก"),
      ),
      !e.isNew && h("button", {
        type: "button", class: "btn btn-block",
        style: { marginTop: "10px", color: "var(--danger)", borderColor: "var(--danger)" },
        onClick: () => delDraft(root),
      }, pi("trash", 16), "ลบข้อมูลรายการนี้"),
    ),
  }));
}
