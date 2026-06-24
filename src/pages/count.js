// ============================================================
// pages/count.js — ตรวจนับสินค้าคงเหลือ (พอร์ตจาก prototype2 CountScreen)
// แท็บ นับ/ทิ้ง · การ์ดหมวดพับได้ · เผ็ด/ไม่เผ็ด/รวม · ค้นหา ·
// เพิ่ม-ลบรายการกลางคัน · progress · sheet ยืนยัน · autosave draft
// ctx = { go, back, role, toast, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { seg, searchBox, note, menuTabs, hdr } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { entryList, entryFoot, confirmSheet, isFilled, sumOf } from "./_entry.js";
import { cats, items as allItems, saveItem, applyCount } from "../data/store.js";
import { catById } from "../utils/formulas.js";
import { TODAY } from "../data/seed.js";
import { load, save } from "../utils/storage.js";

const DK = "draft:count", DKW = "draft:countWaste";

// state คงอยู่ข้ามการ re-render เปลือก (autosave draft อยู่ใน localStorage)
const st = {
  tab: "count", top: "all", sub: "all", topW: "all", subW: "all",
  q: "", qW: "", open: {}, openW: {}, hidden: [],
  confirm: false, addTo: null, newName: "", newUnit: "kg",
  vals: load(DK, {}), wasteVals: load(DKW, {}),
  ctx: null,
};

const bold = (t) => h("b", null, t);
const histBtn = (ctx) => h("button", { type: "button", class: "hdr-icon", "aria-label": "ประวัติ", onClick: () => ctx.go({ name: "history" }) }, pi("history", 18));

export function countScreen(ctx) {
  st.ctx = ctx;
  st.confirm = false; st.addTo = null;
  const root = h("div", { class: "page-wrap", "data-screen-label": "count", style: { display: "flex", flexDirection: "column", flex: 1 } });
  root._sheets = h("div");
  paint(root);
  return root;
}

function paint(root) {
  const ctx = st.ctx;
  const sub = (ctx.shopCtx ? ctx.shopCtx.shop : "พระราม 9") + " · " + TODAY.dow + " " + TODAY.d + " " + TODAY.mon;
  const isCount = st.tab === "count";
  const vals = isCount ? st.vals : st.wasteVals;
  const commit = isCount
    ? (k, v) => { st.vals[k] = v; save(DK, st.vals); }
    : (k, v) => { st.wasteVals[k] = v; save(DKW, st.wasteVals); };
  const top = isCount ? st.top : st.topW;
  const subF = isCount ? st.sub : st.subW;
  const q = isCount ? st.q : st.qW;
  const filter = top === "all" ? subF : top;
  const open = isCount ? st.open : st.openW;
  const toggleOpen = (id) => { open[id] = !(open[id] !== false); paint(root); };

  const foot = entryFoot({
    vals, items: allItems(),
    label: isCount ? "บันทึกทั้งหมด" : "บันทึกของทิ้ง",
    icon: isCount ? "check" : "trash",
    onSave: isCount ? () => { st.confirm = true; renderSheets(root); }
      : () => ctx.toast("บันทึกของทิ้งแล้ว · เข้าสูตรคำนวณขายจริง"),
  });

  const list = entryList({
    vals, commit, footUpdate: foot.update, filter, q,
    cats: cats(), hideIds: st.hidden, open, toggleOpen,
    onAdd: (sec) => openAdd(root, sec),
    onRemove: (it) => { st.hidden = [...st.hidden, it.id]; ctx.toast('เอา "' + it.name + '" ออกจากการนับรอบนี้แล้ว'); paint(root); },
  });

  const setSearch = (v) => { if (isCount) st.q = v; else st.qW = v; paint(root); };
  const onTop = (id) => { if (isCount) { st.q = ""; st.top = id; st.sub = "all"; } else { st.qW = ""; st.topW = id; st.subW = "all"; } paint(root); };
  const onSub = (id) => { if (isCount) { st.q = ""; st.sub = id; } else { st.qW = ""; st.subW = id; } paint(root); };

  const content = h("div", { class: "page stack", style: { paddingBottom: "12px" } },
    seg({ grow: true, value: st.tab, onChange: (v) => { st.tab = v; paint(root); }, options: [{ v: "count", t: "นับสินค้าคงเหลือ", ic: "scale" }, { v: "waste", t: "ทิ้ง", ic: "trash" }] }),
    isCount
      ? note(["เลือกหัวข้อ → กรอกได้ทั้ง", bold("เผ็ด/ไม่เผ็ด"), " ระบบรวมให้ · ทุกหมวดเรียง", bold("เหมือนข้อมูลกลาง"), " · กด ", pi("plus", 11), " เพิ่มรายการ หรือ ", pi("x", 11), " เอาออกได้"])
      : note("กรอกเฉพาะรายการที่ทิ้ง/เสีย · ใช้รายการเดียวกับหน้านับ — ที่ไม่กรอกถือว่าไม่มีทิ้ง", { amber: true, iconName: "trash" }),
    searchBox({ value: q, onChange: setSearch, placeholder: isCount ? "ค้นหา… (ไม่ต้องใส่หน่วยหมด)" : "ค้นหารายการที่จะทิ้ง…" }),
    menuTabs({ cats: cats(), top, sub: subF, onTop, onSub }),
    list,
  );

  root.replaceChildren(
    hdr({ title: "ตรวจนับสินค้าคงเหลือ", sub, onBack: ctx.back, right: histBtn(ctx) }),
    content,
    foot.node,
    root._sheets,
  );
  renderSheets(root);
}

function openAdd(root, sec) {
  const isCat = !!catById(sec.id);
  st.addTo = { name: sec.name, cat: isCat ? sec.id : "protein", sub: isCat ? undefined : sec.id };
  st.newName = "";
  st.newUnit = isCat ? (catById(sec.id).unit === "—" ? "kg" : catById(sec.id).unit) : "kg";
  renderSheets(root);
}

function doSaveAdd() {
  const a = st.addTo, name = st.newName, unit = st.newUnit || "kg";
  st.addTo = null; st.newName = "";
  // saveItem → bumpData → app re-render (จอถูกสร้างใหม่ ไม่มี sheet ค้าง)
  saveItem({ id: "cnt-" + Date.now(), cat: a.cat, sub: a.sub, name, unit, spicy: false, cost: 0 });
  st.ctx.toast('เพิ่ม "' + name + '" เข้าข้อมูลกลางแล้ว — ขึ้นทุกหน้า');
}

function addSheetBody(root) {
  const nameIn = h("input", { type: "text", class: "input", value: st.newName, placeholder: "เช่น กระเพราหมูกรอบ" });
  const unitIn = h("input", { type: "text", class: "input", value: st.newUnit, placeholder: "kg / ฟอง / แพ็ค" });
  const saveBtn = h("button", { type: "button", class: "btn btn-primary btn-block", disabled: !st.newName, style: { opacity: st.newName ? 1 : 0.45 }, onClick: () => { if (st.newName) doSaveAdd(); } }, pi("check", 16), "เพิ่ม");
  nameIn.addEventListener("input", () => { st.newName = nameIn.value; saveBtn.disabled = !st.newName; saveBtn.style.opacity = st.newName ? 1 : 0.45; });
  unitIn.addEventListener("input", () => { st.newUnit = unitIn.value; });
  setTimeout(() => nameIn.focus(), 30);
  return h("div", null,
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 4px" } }, "เพิ่มรายการ"),
    h("p", { style: { fontSize: "12.5px", color: "var(--muted)", textAlign: "center", margin: "0 0 14px" } }, "เข้า " + st.addTo.name + " · เข้าข้อมูลกลางให้อัตโนมัติ"),
    h("div", { class: "stack" },
      h("label", { class: "field", style: { margin: 0 } }, h("span", { class: "field-label" }, "ชื่อรายการ"), nameIn),
      h("label", { class: "field", style: { margin: 0 } }, h("span", { class: "field-label" }, "หน่วยนับ"), unitIn),
      note(["เพิ่มที่นี่ = เพิ่มเข้า ", bold("ข้อมูลกลาง"), " เลย — ขึ้นทุกหน้าที่ link (นับ · สั่ง · พยากรณ์ · ต้นทุน)"]),
      h("div", { class: "rowflex", style: { gap: "10px" } },
        h("button", { type: "button", class: "btn btn-block", onClick: () => { st.addTo = null; renderSheets(root); } }, "ยกเลิก"),
        saveBtn,
      ),
    ),
  );
}

function renderSheets(root) {
  const layer = root._sheets;
  layer.replaceChildren();
  if (st.confirm) {
    layer.appendChild(confirmSheet({
      vals: st.vals,
      title: "ยืนยันการนับ?",
      dupNote: ['ระบบเช็คให้: วันนี้ยังไม่เคยบันทึก "นับสินค้าคงเหลือ" — ', bold("ไม่ซ้ำ"), " · ถัดไปมีขั้นแยกทิ้ง/เสีย"],
      onClose: () => { st.confirm = false; renderSheets(root); },
      onSave: async () => {
        st.confirm = false; renderSheets(root);
        // บันทึกตรวจนับ → ตั้งคงเหลือจริง (persist + sync Supabase)
        const lines = allItems().filter((it) => isFilled(st.vals, it))
          .map((it) => ({ id: it.id, qty: Number(sumOf(st.vals, it)) }))
          .filter((l) => !Number.isNaN(l.qty));
        await applyCount(lines, st.ctx.user ? st.ctx.user.name : (st.ctx.role === "owner" ? "เจ้าของ" : "พนักงาน"));
        st.vals = {}; save(DK, st.vals);
        st.ctx.go({ name: "waste", replace: true });
      },
    }));
  }
  if (st.addTo) {
    layer.appendChild(sheet({ onClose: () => { st.addTo = null; renderSheets(root); }, children: addSheetBody(root) }));
  }
}
