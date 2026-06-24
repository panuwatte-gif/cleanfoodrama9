// ============================================================
// pages/menulist.js — เมนู · ราคาขาย  (ตารางเดี่ยว standalone — จดโปรกันลืม)
//   • ไม่ลิงก์สต๊อก/ข้อมูลกลาง (การลิงก์เดิมทำชื่อไม่ตรงแล้วพัง — ตัดทิ้ง)
//   • คอลัมน์: กับข้าว | ชนิดข้าว | ราคาตั้งขาย | ส่วนลด | ราคาสุทธิ (=ตั้งขาย−ส่วนลด)
//   • 1 แถว = 1 รายการขาย (กับข้าวเดียวกันคนละชนิดข้าว = คนละแถว)
//   • เก็บลง Supabase ตาราง rama9_price_list (ไม่มี foreign key)
// ctx = { go, back, role, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, searchBox, emptyState } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { priceRows, savePrice, removePrice } from "../data/store.js";
import { fmt } from "../utils/formulas.js";

const bold = (t) => h("b", null, t);
const pst = { q: "", ctx: null, edit: null };
const netOf = (r) => Math.max(0, (Number(r.price) || 0) - (Number(r.disc) || 0));
const field = (label, input, hint) =>
  h("label", { class: "stack", style: { gap: "5px" } }, h("span", { class: "field-label" }, label), input,
    hint ? h("span", { style: { fontSize: "11px", color: "var(--faint)" } }, hint) : null);

// เรียง: ตามชื่อกับข้าว แล้วชนิดข้าว (อ่านง่าย จัดกลุ่มจานเดียวกันติดกัน)
const sorted = (rows) => [...rows].sort((a, b) =>
  (a.dish || "").localeCompare(b.dish || "", "th") || (a.rice || "").localeCompare(b.rice || "", "th"));

function priceCell(lbl, val, col, strike) {
  return h("div", { style: { textAlign: "right", minWidth: "52px" } },
    h("div", { style: { fontSize: "10px", color: "var(--faint)" } }, lbl),
    h("div", { class: "tnum", style: { fontSize: "13.5px", fontWeight: 700, color: col || "var(--text)", textDecoration: strike ? "line-through" : "none" } }, val),
  );
}

function priceRow(r, root) {
  const owner = pst.ctx.role === "owner";
  const disc = Number(r.disc) || 0;
  return h("div", { class: "card split", style: { padding: "11px 14px", cursor: owner ? "pointer" : "default" }, onClick: owner ? () => openEdit(r, root) : undefined },
    h("div", { class: "rowflex", style: { minWidth: 0, flex: 1, gap: "10px" } },
      h("span", { class: "catic green", style: { flex: "none" } }, pi("tag", 17)),
      h("div", { style: { minWidth: 0 } },
        h("div", { style: { fontWeight: 700, fontSize: "14px" } }, r.dish || "—"),
        r.rice
          ? h("div", { class: "rowflex", style: { gap: "4px", fontSize: "11px", color: "var(--primary-dark)", fontWeight: 600, marginTop: "1px" } }, pi("rice", 11), r.rice)
          : h("div", { style: { fontSize: "11px", color: "var(--faint)" } }, "ไม่ระบุชนิดข้าว"),
      ),
    ),
    h("div", { class: "rowflex", style: { gap: "9px", flex: "none" } },
      disc ? priceCell("ตั้งขาย", fmt(r.price || 0), "var(--muted)", true) : priceCell("ตั้งขาย", fmt(r.price || 0), "var(--muted)"),
      disc ? priceCell("ส่วนลด", "−" + fmt(disc), "var(--warning-ink)") : null,
      priceCell("สุทธิ", fmt(netOf(r)) + " ฿", "var(--primary-dark)"),
      owner ? h("span", { class: "catic", style: { background: "transparent", flex: "none" } }, pi("edit", 15)) : null,
    ),
  );
}

export function menuListScreen(ctx) {
  pst.ctx = ctx; pst.q = ""; pst.edit = null;
  const root = h("div", { class: "page-wrap", "data-screen-label": "menulist" });
  root._sheets = h("div");
  paint(root);
  return root;
}

function paint(root) {
  const { back, role } = pst.ctx;
  const owner = role === "owner";
  const q = pst.q.toLowerCase();
  const rows = sorted(priceRows()).filter((r) => !q || (r.dish || "").toLowerCase().includes(q) || (r.rice || "").toLowerCase().includes(q));
  const searchEl = searchBox({ value: pst.q, onChange: (v) => { pst.q = v; paint(root); }, placeholder: "ค้นหากับข้าว / ชนิดข้าว…" });
  const total = priceRows().length;

  root.replaceChildren(
    hdr({ title: "เมนู · ราคาขาย", sub: total + " รายการ · ตั้งขาย − ส่วนลด = สุทธิ", onBack: back, right: h("span", { class: "catic green" }, pi("tag", 18)) }),
    h("div", { class: "page stack" },
      owner
        ? note(["จดราคาขาย", bold("กันลืมโปร"), " — กับข้าวเดียวกันคนละชนิดข้าวก็แยกเป็นคนละแถวได้ · แตะแถวเพื่อแก้"], { iconName: "tag" })
        : note(["ราคาตั้งขาย − ส่วนลด = ", bold("ราคาสุทธิ"), " · แก้ไขทำที่ฝั่ง", bold("เจ้าของ")], { iconName: "tag" }),
      searchEl,
      rows.length
        ? h("div", { class: "stack" },
            h("div", { class: "rowflex", style: { padding: "0 14px", fontSize: "10.5px", color: "var(--faint)", fontWeight: 700, letterSpacing: ".3px" } },
              h("span", { style: { flex: 1 } }, "กับข้าว · ชนิดข้าว"),
              h("span", null, "ตั้งขาย · ส่วนลด · สุทธิ")),
            ...rows.map((r) => priceRow(r, root)))
        : emptyState({ compact: true, iconName: q ? "search" : "tag", title: q ? 'ไม่พบ "' + pst.q + '"' : "ยังไม่มีรายการราคา", sub: owner ? "กดเพิ่มรายการด้านล่าง" : "ยังไม่มีข้อมูล" }),
      owner && h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => openAdd(root) }, pi("plus", 16), "เพิ่มรายการขาย"),
    ),
    root._sheets,
  );

  renderSheets(root);
  if (pst.q) { const inp = searchEl.querySelector("input"); if (inp) { inp.focus(); const n = inp.value.length; inp.setSelectionRange(n, n); } }
}

/* ---------- เพิ่ม / แก้ / ลบ ---------- */
function openAdd(root) {
  pst.edit = { new: true, id: "pl-" + Date.now(), dish: "", rice: "", price: "", disc: "" };
  renderSheets(root);
}
function openEdit(r, root) {
  pst.edit = { id: r.id, dish: r.dish || "", rice: r.rice || "", price: r.price != null ? String(r.price) : "", disc: r.disc ? String(r.disc) : "" };
  renderSheets(root);
}

async function doSave(root) {
  const e = pst.edit;
  const dish = (e.dish || "").trim();
  const price = Math.max(0, parseFloat(e.price) || 0);
  if (!dish || !(price > 0)) return;
  await savePrice({
    id: e.id,
    dish,
    rice: (e.rice || "").trim(),
    price,
    disc: Math.max(0, parseFloat(e.disc) || 0),
    at: new Date().toISOString(),
  });
  const isNew = e.new;
  pst.edit = null; paint(root);
  pst.ctx.toast(isNew ? "เพิ่มรายการขายแล้ว" : "บันทึกแล้ว");
}

async function doDelete(root) {
  const e = pst.edit;
  await removePrice(e.id);
  pst.edit = null; paint(root);
  pst.ctx.toast("ลบรายการแล้ว");
}

function editBody(root) {
  const e = pst.edit;
  const dishIn = h("input", { type: "text", class: "input", value: e.dish || "", placeholder: "เช่น กะเพราไก่ / หมูกระเทียม" });
  const riceIn = h("input", { type: "text", class: "input", value: e.rice || "", placeholder: "เช่น หอมมะลิ / ไรซ์เบอร์รี่ (เว้นว่างได้)" });
  const priceIn = h("input", { type: "text", inputMode: "decimal", class: "input tnum", value: e.price !== "" && e.price != null ? String(e.price) : "", placeholder: "0" });
  const discIn = h("input", { type: "text", inputMode: "decimal", class: "input tnum", value: e.disc ? String(e.disc) : "", placeholder: "0" });

  const netBig = h("div", { class: "big-num tnum", style: { fontSize: "24px", color: "var(--primary-dark)" } }, "฿0");
  const recalc = () => {
    const p = Math.max(0, parseFloat(priceIn.value) || 0);
    const d = Math.max(0, parseFloat(discIn.value) || 0);
    netBig.textContent = "฿" + fmt(Math.max(0, p - d));
  };

  const valid = () => !!(dishIn.value && dishIn.value.trim()) && parseFloat(priceIn.value) > 0;
  const saveBtn = h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => { if (valid()) doSave(root); } }, pi("check", 16), "บันทึก");
  const syncBtn = () => { const ok = valid(); saveBtn.disabled = !ok; saveBtn.style.opacity = ok ? 1 : 0.45; };

  dishIn.addEventListener("input", () => { pst.edit.dish = dishIn.value; syncBtn(); });
  riceIn.addEventListener("input", () => { pst.edit.rice = riceIn.value; });
  priceIn.addEventListener("input", () => { pst.edit.price = priceIn.value; recalc(); syncBtn(); });
  discIn.addEventListener("input", () => { pst.edit.disc = discIn.value; recalc(); });
  recalc(); syncBtn();

  return h("div", { class: "stack", style: { gap: "12px" } },
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 2px" } }, e.new ? "เพิ่มรายการขาย" : "แก้ไขรายการขาย"),
    h("div", { style: { fontSize: "11.5px", color: "var(--muted)", textAlign: "center", marginBottom: "2px" } }, "กรอกกับข้าว + ราคาตั้งขาย ก็พอ — ชนิดข้าว/ส่วนลดใส่ถ้ามี"),
    field("กับข้าว *", dishIn),
    field("ชนิดข้าว", riceIn, "กับข้าวเดียวกันคนละชนิดข้าว = แยกเป็นคนละแถว"),
    h("div", { class: "rowflex", style: { gap: "10px", alignItems: "flex-end" } },
      h("div", { style: { flex: 1 } }, field("ราคาตั้งขาย (฿) *", priceIn)),
      h("div", { style: { flex: 1 } }, field("ส่วนลด (฿)", discIn)),
    ),
    h("div", { class: "card soft-card soft-green split" },
      h("div", null, h("div", { class: "overline" }, "ราคาสุทธิ (คำนวณ)"), netBig),
      h("span", { class: "catic fill", style: { width: "44px", height: "44px", borderRadius: "14px" } }, pi("tag", 20)),
    ),
    saveBtn,
    !e.new && h("button", { type: "button", class: "btn btn-block", style: { color: "var(--danger)", borderColor: "var(--danger)" }, onClick: () => doDelete(root) }, pi("trash", 15), "ลบรายการนี้"),
  );
}

function renderSheets(root) {
  const layer = root._sheets;
  layer.replaceChildren();
  if (pst.edit) layer.appendChild(sheet({ onClose: () => { pst.edit = null; renderSheets(root); }, children: editBody(root) }));
}
