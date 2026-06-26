// ============================================================
// pages/assumptions.js — ปรับค่า assumption ของสูตรทั้ง app (เจ้าของ)
// ค่ากลางที่ทุกสูตรใช้ · persist ผ่าน data/store · แก้แล้วทุกหน้าใช้ค่าใหม่
//
// รอบนี้:
//   • กลุ่ม "รายได้" ตั้งค่าแยกร้านได้ (tab เลือกร้าน) — GP/ค่าการตลาด ต่อร้าน
//     → บันทึกรายได้ของร้านที่เลือกอยู่จะดึงค่า GP ของร้านนั้นมาช่วยคิด
//   • แยก "เกณฑ์เตือนสต๊อก" ออกจาก "หน่วย & การแปลง" (ไข่ 1 แผง) — คนละเรื่องกัน
//   • ทุกแถวบอก "ใช้กับสูตรไหน" · ค่าที่เพิ่มเอง = ค่าอ้างอิง (ยังไม่ผูกกับสูตร)
//   • ช่องกรอกอัปเดตเงียบ (ไม่ paint) → ไม่เสีย focus ตอนพิมพ์
// ctx = { go, back, role, toast, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note } from "../components/components.js";
import { sheet, pinSheetBody } from "../components/sheet.js";
import { assumptions, persistData, bumpData } from "../data/store.js";
import { logEdit } from "../data/editlog.js";

const bold = (t) => h("b", null, t);
const GRP_ICON = { "รายได้": "wallet", "เกณฑ์เตือนสต๊อก": "alert", "หน่วย & การแปลง": "swap", "พยากรณ์": "trend", "ภาษี": "doc", "สต๊อก": "box" };
const GRP_ORDER = ["รายได้", "เกณฑ์เตือนสต๊อก", "หน่วย & การแปลง", "พยากรณ์", "ภาษี"];
const ast = { ctx: null, pin: null, shop: null };

// ค่าที่กำลังแก้ (เก็บนอก paint เพื่อคงค่าระหว่าง re-render จาก add/del/สลับร้าน)
let vals = {};

// รายชื่อร้าน (จากตัวสลับร้านบนหัว) — ใช้กับกลุ่มที่ตั้งค่าแยกร้าน
function shopNames() {
  const sc = ast.ctx && ast.ctx.shopCtx;
  const list = (sc && sc.shops ? sc.shops.map((s) => s.name) : []).filter(Boolean);
  return list.length ? list : ["ร้านหลัก"];
}
// คีย์ของ vals: ค่าแยกร้าน = id@ร้าน · ค่าปกติ = id
const valKey = (a) => (a.perShop ? a.id + "@" + ast.shop : a.id);
// ค่าปัจจุบันของแถว (แยกร้าน → byShop[ร้าน] ถ้ามี ไม่งั้นค่ากลาง a.v)
function curVal(a) {
  if (a.perShop) {
    const bs = a.byShop || {};
    return (bs[ast.shop] != null && bs[ast.shop] !== "") ? bs[ast.shop] : (a.v != null ? a.v : "");
  }
  return a.v != null ? a.v : "";
}

export function assumptionsScreen(ctx) {
  ast.ctx = ctx; ast.pin = null;
  ast.shop = (ctx.shopCtx && ctx.shopCtx.shop) || shopNames()[0];
  loadVals();
  const root = h("div", { class: "page-wrap", "data-screen-label": "assumptions", style: { display: "flex", flexDirection: "column", flex: 1 } });
  root._sheets = h("div");
  paint(root);
  return h("div", { style: { display: "contents" } }, root, root._sheets);
}

// โหลด vals ของร้านที่เลือกอยู่ (เรียกตอนเปิดหน้า + ตอนสลับร้าน)
function loadVals() {
  vals = {};
  assumptions().forEach((a) => { vals[valKey(a)] = curVal(a); });
}

function valField(key, wide) {
  const inp = h("input", { type: "text", inputMode: "decimal", class: "qty-in" + (wide ? " wide" : "") + (vals[key] ? " filled" : ""), value: vals[key] != null ? vals[key] : "", placeholder: "0" });
  inp.addEventListener("input", () => { const s = inp.value.replace(/[^0-9.]/g, ""); if (s !== inp.value) inp.value = s; inp.classList.toggle("filled", !!s); vals[key] = s; });
  return inp;
}

function row(a) {
  const wide = String(curVal(a)).length > 4 || a.custom;
  if (a.custom) {
    // ค่าที่เพิ่มเอง — แก้ชื่อ/หน่วย + ลบได้ · เป็น "ค่าอ้างอิง" (ยังไม่ผูกกับสูตรอัตโนมัติ)
    const nameIn = h("input", { type: "text", class: "input", style: { flex: 1, fontSize: "13px", padding: "7px 9px" }, value: a.name, placeholder: "ชื่อค่า" });
    nameIn.addEventListener("input", () => { a.name = nameIn.value; persistData(); });
    const unitIn = h("input", { type: "text", class: "input", style: { width: "54px", fontSize: "12px", padding: "7px 6px", textAlign: "center" }, value: a.unit || "", placeholder: "หน่วย" });
    unitIn.addEventListener("input", () => { a.unit = unitIn.value; persistData(); });
    return h("div", { class: "asm-row", style: { padding: "9px 0", borderBottom: "1px solid var(--border-soft)" } },
      h("div", { class: "rowflex", style: { gap: "8px", alignItems: "center" } },
        nameIn, valField(valKey(a), true), unitIn,
        h("button", { type: "button", class: "hdr-icon line-icon", style: { color: "var(--danger)", flex: "none" }, "aria-label": "ลบค่านี้", onClick: () => askDelete(a) }, pi("trash", 15)),
      ),
      h("div", { class: "asm-use ref" }, pi("alert", 11), "ค่าอ้างอิง — ยังไม่ได้ผูกกับสูตรโดยอัตโนมัติ"),
    );
  }
  return h("div", { class: "asm-row", style: { padding: "10px 0", borderBottom: "1px solid var(--border-soft)" } },
    h("div", { class: "rowflex", style: { gap: "10px", alignItems: "center" } },
      h("span", { class: "catic green sm" }, pi(GRP_ICON[a.grp] || "settings", 14)),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { style: { fontSize: "13.5px", fontWeight: 600 } }, a.name),
        a.use && h("div", { class: "asm-use" }, "ใช้กับ: " + a.use),
      ),
      valField(valKey(a), wide),
      h("span", { style: { fontSize: "11.5px", color: "var(--faint)", width: "52px", flex: "none", textAlign: "right" } }, a.unit),
    ),
  );
}

// แถบเลือกร้าน (เฉพาะกลุ่มที่ตั้งค่าแยกร้าน) — สลับร้าน = flush ค่าเดิม → โหลดค่าร้านใหม่
function shopTabs(root) {
  const names = shopNames();
  return h("div", { class: "asm-shoptabs" },
    names.map((nm) => h("button", {
      type: "button", class: "asm-shoptab" + (nm === ast.shop ? " active" : ""),
      onClick: () => { if (nm === ast.shop) return; flushVals(); ast.shop = nm; loadVals(); paint(root); },
    }, pi("store", 12), nm)),
  );
}

function flushVals() {
  assumptions().forEach((a) => {
    const k = valKey(a);
    if (vals[k] === undefined) return;
    if (a.perShop) { a.byShop = a.byShop || {}; a.byShop[ast.shop] = String(vals[k]); }
    else { a.v = String(vals[k]); }
  });
}

function addRow(grp) {
  flushVals();
  const id = "a-" + Date.now();
  assumptions().push({ id, grp, name: "ค่าใหม่", v: "", unit: "", custom: true });
  vals[id] = "";
  persistData(); logEdit({ txt: 'เพิ่มค่า assumption ใหม่ในกลุ่ม "' + grp + '"', kind: "add", by: by() });
  bumpData(); ast.ctx.toast('เพิ่มค่าในกลุ่ม "' + grp + '" — เป็นค่าอ้างอิง (ยังไม่ผูกกับสูตร)');
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
  flushVals();
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
      note(["ค่าตรงนี้ ", bold("ผูกกับสูตรจริง"), " — แก้แล้วหน้าที่เขียนว่า ", bold('"ใช้กับ:…"'), " คำนวณใหม่ทันที · ค่าที่เพิ่มเองเป็น ", bold("ค่าอ้างอิง"), " (เก็บไว้ดู ยังไม่ได้ผูกกับสูตร)"], { iconName: "settings" }),
      groups.map((g) => {
        const rows = assumptions().filter((a) => a.grp === g);
        const perShop = rows.some((a) => a.perShop);
        return h("div", { class: "stack" },
          h("div", { class: "split" },
            h("div", { class: "overline" }, g),
            perShop && h("span", { class: "badge", style: { background: "var(--primary-tint)", border: "1px solid var(--primary-soft)", color: "var(--primary-dark)", fontSize: "10.5px" } }, pi("store", 11), "แยกร้าน"),
          ),
          perShop && shopTabs(root),
          perShop && h("div", { style: { fontSize: "11.5px", color: "var(--muted)", margin: "-2px 2px 2px", lineHeight: 1.5 } }, "ตั้งค่าของร้าน ", bold(ast.shop), " — บันทึกรายได้ของร้านนี้จะดึงค่า GP/การตลาดชุดนี้มาช่วยคิด"),
          h("div", { class: "card", style: { padding: "4px 16px" } }, rows.map(row)),
          h("button", { type: "button", class: "btn btn-block", style: { fontSize: "12.5px", padding: "8px 10px" }, onClick: () => addRow(g) }, pi("plus", 14), 'เพิ่มค่าอ้างอิงในกลุ่ม "' + g + '"'),
        );
      }),
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
