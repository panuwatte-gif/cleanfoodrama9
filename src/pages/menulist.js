// ============================================================
// pages/menulist.js — เมนู · ราคาขาย
//   เจ้าของ: เพิ่ม/แก้/ลบ เมนูได้ (ชื่อ/กลุ่ม/หน่วย/ต้นทุน/ราคา/ส่วนลด/รูป)
//   *** เพิ่มเมนู = สร้าง "รายการ" ในข้อมูลกลาง + "เมนู" (ราคา) ผูกกัน ***
//   → จานเดียวโผล่ทุกหน้า (เมนู · ข้อมูลกลาง · นับสต๊อก) + รูปลิงก์กันด้วย id
//   บังคับแค่ ชื่อ + ราคา (ที่เหลือใส่ทีหลังได้ — ต้นทุนไม่ต้องครบ)
// ctx = { go, back, role, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, searchBox, itemIc, iconPicker, emptyState } from "../components/components.js";
import { sheet, pinSheetBody } from "../components/sheet.js";
import { menus, saveMenu, removeMenu, saveItem } from "../data/store.js";
import { fmt, itemById } from "../utils/formulas.js";

const bold = (t) => h("b", null, t);
const mst = { q: "", ctx: null, edit: null, pin: null };
const field = (label, input) =>
  h("label", { class: "stack", style: { gap: "5px" } }, h("span", { class: "field-label" }, label), input);

// กลุ่มเมนู → ผูกกับหมวด/หมวดย่อยจริงในข้อมูลกลาง (+ หน่วยเริ่มต้น)
const MENU_GROUPS = [
  { key: "beef",    cat: "protein", sub: "beef",    unit: "kg",  name: "เนื้อ" },
  { key: "pork",    cat: "protein", sub: "pork",    unit: "kg",  name: "หมู" },
  { key: "chicken", cat: "protein", sub: "chicken", unit: "kg",  name: "ไก่" },
  { key: "duck",    cat: "protein", sub: "duck",    unit: "kg",  name: "เป็ด" },
  { key: "fish",    cat: "protein", sub: "fish",    unit: "kg",  name: "ปลา" },
  { key: "shrimp",  cat: "protein", sub: "shrimp",  unit: "kg",  name: "กุ้ง" },
  { key: "egg",     cat: "egg",     sub: null,      unit: "ฟอง", name: "ไข่ / ของเพิ่ม" },
  { key: "drink",   cat: "drink",   sub: "zero",    unit: "ขวด", name: "เครื่องดื่ม" },
  { key: "other",   cat: "dry",     sub: null,      unit: "",    name: "อื่นๆ" },
];
const groupOf = (it) => {
  if (!it) return "other";
  const g = MENU_GROUPS.find((x) => x.cat === it.cat && (x.sub || null) === (it.sub || null))
        || MENU_GROUPS.find((x) => x.cat === it.cat);
  return g ? g.key : "other";
};

// รูปเมนู: รูปอัปเอง (icon-<item|id>) ก่อน → ไอคอน item ที่ผูก → ไอคอนสำรอง
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
  const { back, role } = mst.ctx;
  const owner = role === "owner";
  const q = mst.q.toLowerCase();
  const list = menus().filter((m) => !q || (m.name || "").toLowerCase().includes(q));
  const searchEl = searchBox({ value: mst.q, onChange: (v) => { mst.q = v; paint(root); }, placeholder: "ค้นหาเมนู…" });

  root.replaceChildren(
    hdr({ title: "เมนู · ราคาขาย", sub: menus().length + " เมนู · ราคาขาย − ส่วนลด = ราคาสุทธิ", onBack: back, right: h("span", { class: "catic green" }, pi("tag", 18)) }),
    h("div", { class: "page stack" },
      owner
        ? note(["แตะเมนูเพื่อแก้ · กด", bold("เพิ่มเมนูใหม่"), "ด้านล่าง — เพิ่มแล้วจะไปโผล่ที่", bold("ข้อมูลกลาง"), "และนับสต๊อกได้ด้วย (เชื่อมกันด้วยรูป/ชื่อเดียวกัน)"], { iconName: "tag" })
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
function openAdd(root) {
  const itemId = "new-" + Date.now();
  mst.edit = { new: true, id: "mn-" + Date.now(), itemId, name: "", group: "other", unit: "", cost: "", price: "", disc: "", icon: "tag" };
  renderSheets(root);
}
function openEdit(m, root) {
  const it = m.item ? itemById(m.item) : null;
  const itemId = m.item || m.id;   // เมนูเก่าที่ยังไม่มี item → ใช้ id เมนูเป็น id รายการ (เซฟแล้วจะสร้างให้)
  mst.edit = {
    id: m.id, itemId, item: m.item,
    name: m.name || (it && it.name) || "",
    group: groupOf(it),
    unit: (it && it.unit) || "",
    cost: it && it.cost != null ? String(it.cost) : "",
    price: m.price != null ? String(m.price) : "",
    disc: m.disc ? String(m.disc) : "",
    icon: (it && it.icon) || m.icon || "tag",
  };
  renderSheets(root);
}

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
  const g = MENU_GROUPS.find((x) => x.key === e.group) || MENU_GROUPS[MENU_GROUPS.length - 1];
  const name = (e.name || "").trim();
  const price = Math.max(0, parseFloat(e.price) || 0);
  const disc = Math.max(0, parseFloat(e.disc) || 0);
  const unit = (e.unit || g.unit || "").trim();
  const hasCost = !(e.cost === "" || e.cost == null);

  // 1) รายการในข้อมูลกลาง (เชื่อมทุกหน้า + นับสต๊อกได้) — ต้นทุนใส่เฉพาะถ้ามี
  const itemRec = { id: e.itemId, cat: g.cat, sub: g.sub || undefined, name, unit, icon: e.icon || "tag", isActive: true };
  if (hasCost) itemRec.cost = Math.max(0, parseFloat(e.cost) || 0);
  await saveItem(itemRec);

  // 2) เมนู (ราคา) ชี้มาที่รายการเดียวกัน
  await saveMenu({ id: e.id, item: e.itemId, name, price, disc, icon: e.icon || "tag" });

  const isNew = e.new;
  mst.edit = null;
  paint(root);
  mst.ctx.toast(isNew ? "เพิ่มเมนูแล้ว — เชื่อมข้อมูลกลางให้ด้วย" : "บันทึกแล้ว");
}

function editBody(root) {
  const e = mst.edit;
  const slotId = "icon-" + e.itemId;
  const picker = iconPicker({ value: e.icon, tint: "green", slotId, onChange: (n) => { mst.edit.icon = n; } });

  const nameIn = h("input", { type: "text", class: "input", value: e.name || "", placeholder: "เช่น หมูกระเทียม + ข้าว" });
  const unitIn = h("input", { type: "text", class: "input", value: e.unit || "", placeholder: "kg / ฟอง / ขวด (ไม่ใส่ก็ได้)" });
  const costIn = h("input", { type: "text", inputMode: "decimal", class: "input tnum", value: e.cost || "", placeholder: "ไม่ทราบ = เว้นว่าง" });
  const priceIn = h("input", { type: "text", inputMode: "decimal", class: "input tnum", value: e.price !== "" && e.price != null ? String(e.price) : "", placeholder: "0" });
  const discIn = h("input", { type: "text", inputMode: "decimal", class: "input tnum", value: e.disc ? String(e.disc) : "", placeholder: "0" });

  const groupSel = h("select", { class: "input" },
    MENU_GROUPS.map((gr) => h("option", { value: gr.key }, gr.name)));
  groupSel.value = e.group || "other";
  groupSel.addEventListener("change", () => {
    mst.edit.group = groupSel.value;
    const gr = MENU_GROUPS.find((x) => x.key === groupSel.value);
    if (gr && !(unitIn.value && unitIn.value.trim())) { unitIn.value = gr.unit || ""; mst.edit.unit = unitIn.value; }
  });

  const valid = () => !!(mst.edit.name && String(mst.edit.name).trim()) && parseFloat(priceIn.value) > 0;
  const saveBtn = h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => { if (valid()) saveMenuEdit(root); } }, pi("check", 16), "บันทึก");
  const syncBtn = () => { const ok = valid(); saveBtn.disabled = !ok; saveBtn.style.opacity = ok ? 1 : 0.45; };
  nameIn.addEventListener("input", () => { mst.edit.name = nameIn.value; syncBtn(); });
  priceIn.addEventListener("input", () => { mst.edit.price = priceIn.value; syncBtn(); });
  discIn.addEventListener("input", () => { mst.edit.disc = discIn.value; });
  costIn.addEventListener("input", () => { mst.edit.cost = costIn.value; });
  unitIn.addEventListener("input", () => { mst.edit.unit = unitIn.value; });
  syncBtn();

  return h("div", { class: "stack", style: { gap: "12px" } },
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 4px" } }, e.new ? "เพิ่มเมนูใหม่" : "แก้ไขเมนู"),
    h("div", { style: { fontSize: "11.5px", color: "var(--muted)", textAlign: "center", marginBottom: "4px" } }, "กรอกแค่ชื่อ + ราคา ก็บันทึกได้ · ที่เหลือใส่ทีหลังได้"),
    field("ชื่อเมนู *", nameIn),
    h("div", { class: "rowflex", style: { gap: "10px", alignItems: "flex-end" } },
      h("div", { style: { flex: 1.3 } }, field("กลุ่ม (ไว้จัดหมวด/นับสต๊อก)", groupSel)),
      h("div", { style: { flex: 1 } }, field("หน่วย", unitIn)),
    ),
    h("div", null,
      h("div", { class: "field-label", style: { marginBottom: "6px" } }, "รูป/ไอคอนของเมนู"),
      picker,
    ),
    h("div", { class: "rowflex", style: { gap: "10px", alignItems: "flex-end" } },
      h("div", { style: { flex: 1 } }, field("ราคาขาย (฿) *", priceIn)),
      h("div", { style: { flex: 1 } }, field("ส่วนลด (฿)", discIn)),
      h("div", { style: { flex: 1 } }, field("ต้นทุน (฿)", costIn)),
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
