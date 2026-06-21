// ============================================================
// pages/assumptions.js — ปรับค่า assumption ของสูตรทั้ง app (เจ้าของ)
// ค่ากลางที่ทุกสูตรใช้ · persist ผ่าน data/store · แก้แล้วทุกหน้าใช้ค่าใหม่
//
// เพิ่มในรอบนี้:
//   • เพิ่ม "ค่าใหม่" ได้เองในทุกกลุ่ม (รายได้/สต๊อก/พยากรณ์/ภาษี + กลุ่มใหม่)
//   • ค่าที่เพิ่มเอง แก้ชื่อ/หน่วยได้ และลบได้ (ต้องใส่รหัส 9999 ก่อนลบ)
//   • ช่องกรอกอัปเดตเงียบ (ไม่ paint) → ไม่เสีย focus ตอนพิมพ์
// ctx = { go, back, role, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note } from "../components/components.js";
import { sheet, pinSheetBody } from "../components/sheet.js";
import { assumptions, persistData, bumpData } from "../data/store.js";
import { logEdit } from "../data/editlog.js";

const bold = (t) => h("b", null, t);
const GRP_ICON = { "รายได้": "wallet", "สต๊อก": "box", "พยากรณ์": "trend", "ภาษี": "doc" };
const GRP_ORDER = ["รายได้", "สต๊อก", "พยากรณ์", "ภาษี"];
const ast = { ctx: null, pin: null };

// ค่าที่กำลังแก้ (เก็บนอก paint เพื่อคงค่าระหว่าง re-render จาก add/del)
let vals = {};

export function assumptionsScreen(ctx) {
  ast.ctx = ctx; ast.pin = null;
  vals = Object.fromEntries(assumptions().map((a) => [a.id, a.v]));
  const root = h("div", { class: "page-wrap", "data-screen-label": "assumptions", style: { display: "flex", flexDirection: "column", flex: 1 } });
  root._sheets = h("div");
  paint(root);
  // คืน wrapper ที่มี sheets layer ต่อท้าย (overlay PIN)
  return h("div", { style: { display: "contents" } }, root, root._sheets);
}

function valField(id, wide) {
  const inp = h("input", { type: "text", inputMode: "decimal", class: "qty-in" + (wide ? " wide" : "") + (vals[id] ? " filled" : ""), value: vals[id] != null ? vals[id] : "", placeholder: "0" });
  inp.addEventListener("input", () => { const s = inp.value.replace(/[^0-9.]/g, ""); if (s !== inp.value) inp.value = s; inp.classList.toggle("filled", !!s); vals[id] = s; });
  return inp;
}

function row(a) {
  const wide = String(a.v).length > 4 || a.custom;
  if (a.custom) {
    // ค่าที่เพิ่มเอง — แก้ชื่อ/หน่วย + ลบได้
    const nameIn = h("input", { type: "text", class: "input", style: { flex: 1, fontSize: "13px", padding: "7px 9px" }, value: a.name, placeholder: "ชื่อค่า" });
    nameIn.addEventListener("input", () => { a.name = nameIn.value; persistData(); });
    const unitIn = h("input", { type: "text", class: "input", style: { width: "54px", fontSize: "12px", padding: "7px 6px", textAlign: "center" }, value: a.unit || "", placeholder: "หน่วย" });
    unitIn.addEventListener("input", () => { a.unit = unitIn.value; persistData(); });
    return h("div", { class: "rowflex", style: { padding: "9px 0", borderBottom: "1px solid var(--border-soft)", gap: "8px", alignItems: "center" } },
      nameIn, valField(a.id, true), unitIn,
      h("button", { type: "button", class: "hdr-icon line-icon", style: { color: "var(--danger)", flex: "none" }, "aria-label": "ลบค่านี้", onClick: () => askDelete(a) }, pi("trash", 15)),
    );
  }
  return h("div", { class: "rowflex", style: { padding: "9px 0", borderBottom: "1px solid var(--border-soft)" } },
    h("span", { class: "catic green sm" }, pi(GRP_ICON[a.grp] || "settings", 14)),
    h("span", { style: { flex: 1, fontSize: "13.5px", fontWeight: 600 } }, a.name),
    valField(a.id, wide),
    h("span", { style: { fontSize: "11.5px", color: "var(--faint)", width: "48px" } }, a.unit),
  );
}

function flushVals() {
  assumptions().forEach((a) => { if (vals[a.id] !== undefined) a.v = String(vals[a.id]); });
}

function addRow(grp) {
  flushVals();
  const id = "a-" + Date.now();
  assumptions().push({ id, grp, name: "ค่าใหม่", v: "", unit: "", custom: true });
  vals[id] = "";
  persistData(); logEdit({ txt: 'เพิ่มค่า assumption ใหม่ในกลุ่ม "' + grp + '"', kind: "add", by: by() });
  bumpData(); ast.ctx.toast('เพิ่มค่าในกลุ่ม "' + grp + '" — ตั้งชื่อ/ค่า/หน่วยได้เลย');
}

function by() { return ast.ctx.role === "owner" ? "เจ้าของ" : "พนักงาน"; }

function askDelete(a) {
  ast.pin = { a };
  renderRoot();
}
function doDelete(a) {
  flushVals();
  const arr = assumptions(); const i = arr.findIndex((x) => x.id === a.id); if (i >= 0) arr.splice(i, 1);
  delete vals[a.id];
  persistData(); logEdit({ txt: 'ลบค่า assumption "' + a.name + '"', kind: "del", by: by() });
  ast.pin = null; bumpData(); ast.ctx.toast('ลบ "' + a.name + '" แล้ว · เก็บ audit');
}

function save() {
  assumptions().forEach((a) => { if (vals[a.id] !== undefined) a.v = String(vals[a.id]); });
  persistData();
  logEdit({ txt: "ปรับค่า assumption (สูตรทุกหน้าใช้ค่าใหม่)", by: by() });
  bumpData();
  ast.ctx.toast("บันทึก assumption แล้ว · สูตรทุกหน้าอัปเดต");
  ast.ctx.back();
}

let _root = null;
function renderRoot() { if (_root) paint(_root); }

function paint(root) {
  _root = root;
  const seen = [...new Set(assumptions().map((a) => a.grp))];
  const groups = [...GRP_ORDER.filter((g) => seen.includes(g)), ...seen.filter((g) => !GRP_ORDER.includes(g))];

  root.replaceChildren(
    hdr({ title: "ปรับค่า assumption", sub: "ค่ากลางของทุกสูตรใน app", onBack: ast.ctx.back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      note(["แก้ที่นี่ → ", bold("สูตรทุกหน้า"), " (หักเงิน GP · พยากรณ์ · ใบสั่งของ · ภาษี · แปลงหน่วยไข่) คำนวณใหม่ทันที"], { iconName: "settings" }),
      groups.map((g) => h("div", { class: "stack" },
        h("div", { class: "overline" }, g),
        h("div", { class: "card", style: { padding: "4px 16px" } },
          assumptions().filter((a) => a.grp === g).map(row),
        ),
        h("button", { type: "button", class: "btn btn-block", style: { fontSize: "12.5px", padding: "8px 10px" }, onClick: () => addRow(g) }, pi("plus", 14), 'เพิ่มค่าในกลุ่ม "' + g + '"'),
      )),
      note(["ค่าที่", bold("เพิ่มเอง"), " แก้ชื่อ/หน่วยได้ และลบได้ (ต้องใส่รหัสก่อนลบ) · ทุกการเปลี่ยนเก็บ", bold("ประวัติ")], { amber: true }),
    ),
    h("div", { class: "foot" },
      h("button", { type: "button", class: "btn btn-block", onClick: ast.ctx.back }, "ยกเลิก"),
      h("button", { type: "button", class: "btn btn-primary btn-block", onClick: save }, pi("check", 17), "บันทึก"),
    ),
  );

  // overlay PIN (ลบค่าที่เพิ่มเอง)
  root._sheets.replaceChildren();
  if (ast.pin) {
    root._sheets.appendChild(sheet({
      onClose: () => { ast.pin = null; renderRoot(); },
      children: pinSheetBody({ title: 'ลบค่า "' + ast.pin.a.name + '"', sub: "ใส่รหัสเพื่อยืนยันการลบ", onOk: () => doDelete(ast.pin.a), onCancel: () => { ast.pin = null; renderRoot(); } }),
    }));
  }
}
