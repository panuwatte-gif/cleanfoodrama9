// ============================================================
// pages/menulist.js — เมนู · ราคาขาย
//   เจ้าของ: แตะเมนูเพื่อแก้ (ชื่อ/ราคา/ส่วนลด/รูป) · ปุ่มล่างเพิ่มเมนูใหม่
//   ราคาขาย − ส่วนลด = ราคาสุทธิ · รูปเก็บ Supabase + โชว์ทุกหน้าที่ใช้ร่วมกัน
// ctx = { go, back, role, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, searchBox, itemIc, iconPicker, emptyState } from "../components/components.js";
import { sheet, pinSheetBody } from "../components/sheet.js";
import { menus, saveMenu, removeMenu } from "../data/store.js";
import { fmt } from "../utils/formulas.js";

const bold = (t) => h("b", null, t);
const mst = { q: "", ctx: null, edit: null, pin: null };
const field = (label, input) =>
  h("label", { class: "stack", style: { gap: "5px" } }, h("span", { class: "field-label" }, label), input);

// รูปเมนู: รูปอัปเอง (icon-<item|id>) ก่อน → ไอคอนของ item ที่ผูก → ไอคอนสำรอง
function menuIcon(m) {
  const key = "icon-" + (m.item || m.id);
  const photo = window.kkSlots ? window.kkSlots.get(key) : null;
  if (photo) return h("span", { class: "catic photo" }, h("img", { src: photo, alt: "" }));
  if (m.item) return itemIc(m.item, { sm: false });
  return h("span", { class: "catic green" }, pi(m.icon || "tag", 18));
}

function priceCell(lbl, val, col, strike) {
  return h("div", { style: { textAlign: "right", minWidth: "56px" } },
    h("div", { style: { fontSize: "10px", color: "var(--faint)" } }, lbl),
    h("div", { class: "tnum", style: { fontSize: "14px", fontWeight: 700, color: col || "var(--text)", textDecoration: strike ? "line-through" : "none" } }, val),
  );
}

function menuRow(m, root) {
  const owner = mst.ctx.role === "owner";
  const net = (m.price || 0) - (m.disc || 0);
  return h("div", { class: "card split", style: { padding: "11px 14px", cursor: owner ? "pointer" : "default" }, onClick: owner ? () => openEdit(m, root) : undefined },
    h("div", { class: "rowflex", style: { minWidth: 0, flex: 1 } },
      menuIcon(m),
      h("div", { style: { minWidth: 0 } },
        h("div", { style: { fontWeight: 700, fontSize: "14px" } }, m.name),
        m.disc ? h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, "ส่วนลด " + fmt(m.disc) + " ฿") : null,
      ),
    ),
    h("div", { class: "rowflex", style: { gap: "10px", flex: "none" } },
      m.disc ? priceCell("ราคา", fmt(m.price), "var(--muted)", true) : null,
      priceCell("สุทธิ", fmt(net) + " ฿", "var(--primary-dark)"),
      owner ? h("span", { class: "catic", style: { background: "transparent" } }, pi("edit", 15)) : null,
    ),
  );
}

export function menuListScreen(ctx) {
  mst.ctx = ctx; mst.q = ""; mst.edit = null; mst.pin = null;
  const root = h("div", { class: "page-wrap", "data-screen-label": "menulist" });
  root._sheets = h("div");
  paint(root);
  return root;
}

function paint(root) {
  const { back, go, role } = mst.ctx;
  const owner = role === "owner";
  const q = mst.q.toLowerCase();
  const list = menus().filter((m) => !q || (m.name || "").toLowerCase().includes(q));
  const searchEl = searchBox({ value: mst.q, onChange: (v) => { mst.q = v; paint(root); }, placeholder: "ค้นหาเมนู…" });

  root.replaceChildren(
    hdr({ title: "เมนู · ราคาขาย", sub: menus().length + " เมนู · ราคาขาย − ส่วนลด = ราคาสุทธิ", onBack: back, right: h("span", { class: "catic green" }, pi("tag", 18)) }),
    h("div", { class: "page stack" },
      owner
        ? note(["แตะเมนูเพื่อ", bold("แก้ชื่อ/ราคา/ส่วนลด/รูป"), " · กด", bold("เพิ่มเมนูใหม่"), "ด้านล่าง — รูปจะโชว์ทุกหน้าที่ใช้เมนูนั้นร่วมกัน"], { iconName: "tag" })
        : note(["ราคาขาย − ส่วนลด = ", bold("ราคาสุทธิ"), " · แก้ไขทำที่ฝั่ง", bold("เจ้าของ")], { iconName: "tag" }),
      searchEl,
      list.length
        ? h("div", { class: "stack" }, list.map((m) => menuRow(m, root)))
        : emptyState({ compact: true, iconName: "search", title: mst.q ? 'ไม่พบ "' + mst.q + '"' : "ยังไม่มีเมนู", sub: owner ? "กดเพิ่มเมนูใหม่ด้านล่าง" : "ลองคำอื่น" }),
      owner && h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => openAdd(root) }, pi("plus", 16), "เพิ่มเมนูใหม่"),
    ),
    root._sheets,
  );

  renderSheets(root);
  if (mst.q) { const inp = searchEl.querySelector("input"); if (inp) { inp.focus(); const n = inp.value.length; inp.setSelectionRange(n, n); } }
}

/* ---------- เพิ่ม/แก้/ลบ ---------- */
function openEdit(m, root) { mst.edit = { ...m }; renderSheets(root); }
function openAdd(root) { mst.edit = { new: true, id: "mn-" + Date.now(), name: "", price: "", disc: "", icon: "tag" }; renderSheets(root); }

function askDelete(root) {
  const e = mst.edit;
  mst.edit = null;
  mst.pin = {
    title: "ยืนยันลบเมนู",
    sub: 'ลบ "' + (e.name || "") + '" · ใส่รหัสเพื่อยืนยัน',
    onOk: async () => { await removeMenu(e.id); mst.pin = null; paint(root); mst.ctx.toast("ลบเมนูแล้ว"); },
  };
  renderSheets(root);
}

async function saveMenuEdit(root) {
  const e = mst.edit;
  const rec = {
    id: e.id, item: e.item,
    name: (e.name || "").trim(),
    price: Math.max(0, parseFloat(e.price) || 0),
    disc: Math.max(0, parseFloat(e.disc) || 0),
    icon: e.icon || "tag",
  };
  const isNew = e.new;
  await saveMenu(rec);
  mst.edit = null;
  paint(root);
  mst.ctx.toast(isNew ? "เพิ่มเมนูแล้ว" : "บันทึกแล้ว");
}

function editBody(root) {
  const e = mst.edit;
  const slotId = "icon-" + (e.item || e.id);
  const picker = iconPicker({ value: e.icon, tint: "green", slotId, onChange: (n) => { mst.edit.icon = n; } });

  const nameIn = h("input", { type: "text", class: "input", value: e.name || "", placeholder: "เช่น ปลาทอดน้ำปลา + ข้าว" });
  const priceIn = h("input", { type: "text", inputMode: "decimal", class: "input tnum", value: e.price !== "" && e.price != null ? String(e.price) : "", placeholder: "0" });
  const discIn = h("input", { type: "text", inputMode: "decimal", class: "input tnum", value: e.disc ? String(e.disc) : "", placeholder: "0" });

  const valid = () => !!(mst.edit.name && String(mst.edit.name).trim()) && parseFloat(priceIn.value) > 0;
  const saveBtn = h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => { if (valid()) saveMenuEdit(root); } }, pi("check", 16), "บันทึก");
  const syncBtn = () => { const ok = valid(); saveBtn.disabled = !ok; saveBtn.style.opacity = ok ? 1 : 0.45; };
  nameIn.addEventListener("input", () => { mst.edit.name = nameIn.value; syncBtn(); });
  priceIn.addEventListener("input", () => { mst.edit.price = priceIn.value; syncBtn(); });
  discIn.addEventListener("input", () => { mst.edit.disc = discIn.value; });
  syncBtn();

  return h("div", { class: "stack", style: { gap: "12px" } },
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 8px" } }, e.new ? "เพิ่มเมนูใหม่" : "แก้ไขเมนู"),
    field("ชื่อเมนู", nameIn),
    h("div", null,
      h("div", { class: "field-label", style: { marginBottom: "6px" } }, "รูป/ไอคอนของเมนู"),
      picker,
    ),
    h("div", { class: "rowflex", style: { gap: "10px", alignItems: "flex-end" } },
      h("div", { style: { flex: 1 } }, field("ราคาขาย (฿)", priceIn)),
      h("div", { style: { flex: 1 } }, field("ส่วนลด (฿) — ไม่มีใส่ 0", discIn)),
    ),
    saveBtn,
    !e.new && h("button", { type: "button", class: "btn btn-block", style: { color: "var(--danger)", borderColor: "var(--danger)" }, onClick: () => askDelete(root) }, pi("trash", 15), "ลบเมนูนี้"),
  );
}

function renderSheets(root) {
  const layer = root._sheets;
  layer.replaceChildren();
  if (mst.edit) layer.appendChild(sheet({ onClose: () => { mst.edit = null; renderSheets(root); }, children: editBody(root) }));
  if (mst.pin) layer.appendChild(sheet({
    onClose: () => { mst.pin = null; renderSheets(root); },
    children: pinSheetBody({ title: mst.pin.title, sub: mst.pin.sub, onOk: mst.pin.onOk, onCancel: () => { mst.pin = null; renderSheets(root); } }),
  }));
}
