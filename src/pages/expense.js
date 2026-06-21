// ============================================================
// pages/expense.js — บันทึกค่าใช้จ่าย (แท็บหมวด) · พอร์ตจาก prototype2 ExpenseScreen
// หมวด pack/rice/sauce/dry กรอกเป็นรายการ (link ข้อมูลกลาง · แก้ ฿/หน่วยได้)
// หมวดอื่นกรอกจำนวนเงินรวม · แก้ย้อนหลังได้
// ctx = { back, toast, day }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, qtyInput, emptyState, dateBar, itemIc, emo } from "../components/components.js";
import { storeChip } from "../components/layout.js";
import { fmt, itemsOf, catById, unitOf } from "../utils/formulas.js";
import { MONEY, EXP_INV_CAT, TODAY } from "../data/seed.js";
import { saveExpenseRecord } from "../data/store.js";

const bold = (t) => h("b", null, t);
const num = (v) => parseFloat(v || 0) || 0;
const est = { day: TODAY.d, cat: "บรรจุภัณฑ์", amt: "", packQty: {}, packPrice: null, ctx: null };

function allInvItems() {
  return Object.values(EXP_INV_CAT).flatMap((cid) => itemsOf(cid));
}

export function expenseScreen(ctx) {
  est.ctx = ctx;
  est.day = ctx.day || TODAY.d;
  est.cat = "บรรจุภัณฑ์";
  est.amt = "";
  est.packQty = {};
  est.packPrice = Object.fromEntries(allInvItems().map((it) => [it.id, String(it.cost)]));
  const root = h("div", { class: "page-wrap", style: { display: "flex", flexDirection: "column", flex: 1 } });
  paint(root);
  return root;
}

const costOf = (it) => num(est.packPrice[it.id] !== undefined ? est.packPrice[it.id] : it.cost);

function paint(root) {
  const { back, toast, shopCtx } = est.ctx;
  const cat = est.cat;
  const invCatId = EXP_INV_CAT[cat];
  const invItems = invCatId ? itemsOf(invCatId) : [];
  const invCat = invCatId ? catById(invCatId) : null;

  // foot live spans
  const footTotal = h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "15px" } });
  const footCount = h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } });
  const saveBtn = h("button", { type: "button", class: "btn btn-primary" }, pi("check", 17), "บันทึก");

  function recompute() {
    const total = invItems.reduce((s, it) => s + num(est.packQty[it.id]) * costOf(it), 0);
    const filled = invItems.filter((it) => est.packQty[it.id]).length;
    footTotal.textContent = "฿" + fmt(Math.round(total));
    footCount.textContent = "รวม " + filled + " รายการ";
    saveBtn.disabled = !filled;
    saveBtn.style.opacity = filled ? 1 : .45;
    return { total, filled };
  }

  const invRow = (it) => {
    const eqSpan = h("span", {});
    const updateEq = () => { eqSpan.textContent = est.packQty[it.id] ? " · = ฿" + fmt(Math.round(num(est.packQty[it.id]) * costOf(it))) : ""; };
    const priceIn = h("input", { type: "text", inputMode: "decimal", class: "price-in", value: est.packPrice[it.id] });
    priceIn.addEventListener("input", () => { const s = priceIn.value.replace(/[^0-9.]/g, ""); if (s !== priceIn.value) priceIn.value = s; est.packPrice[it.id] = s; updateEq(); recompute(); });
    const qIn = qtyInput({ value: est.packQty[it.id] || "", onChange: (v) => { est.packQty[it.id] = v; updateEq(); recompute(); } });
    updateEq();
    return h("div", { class: "entry-row" },
      itemIc(it),
      h("span", { class: "entry-name" }, it.name,
        h("span", { class: "tnum", style: { display: "flex", alignItems: "center", gap: "4px", fontSize: "10.5px", color: "var(--faint)", marginTop: "2px" } },
          "฿", priceIn, "/" + unitOf(it), eqSpan),
      ),
      h("div", { class: "rowflex", style: { gap: "6px" } }, qIn, h("span", { style: { fontSize: "11.5px", color: "var(--faint)", width: "38px" } }, unitOf(it))),
    );
  };

  // chips
  const chips = MONEY.expCats.map((c) => h("button", {
    type: "button", class: "chip" + (cat === c ? " active" : ""), onClick: () => { est.cat = c; paint(root); },
  }, EXP_INV_CAT[c] && emo(catById(EXP_INV_CAT[c]).icon, { s: 12 }), c));
  chips.push(h("button", { type: "button", class: "chip", style: { color: "var(--muted)" }, onClick: () => toast("เพิ่ม/จัดการหมวดได้ที่ ข้อมูลกลาง") }, pi("plus", 12), " เพิ่มหมวด"));

  let body, foot;
  if (invCatId) {
    const groups = invCat.subs
      ? invCat.subs.map((sb) => {
          const subItems = invItems.filter((i) => i.sub === sb.id);
          if (!subItems.length) return null;
          return h("div", { class: "acc-card open" },
            h("div", { class: "sub-head", style: { paddingTop: "10px" } }, h("span", { class: "sub-ic" }, emo(sb.icon, { s: 13 })), h("span", null, sb.name), h("i")),
            h("div", { style: { paddingBottom: "6px" } }, subItems.map(invRow)),
          );
        }).filter(Boolean)
      : [h("div", { class: "acc-card open" },
          h("div", { class: "sub-head", style: { paddingTop: "10px" } }, h("span", { class: "sub-ic" }, emo(invCat.icon, { s: 13 })), h("span", null, invCat.name), h("i")),
          h("div", { style: { paddingBottom: "6px" } }, invItems.map(invRow)),
        )];
    body = [
      note(["กรอกจำนวนที่ซื้อแต่ละรายการ — ราคาต่อหน่วยปรับได้ที่ช่อง ", bold("฿/หน่วย")], { iconName: "box" }),
      ...groups,
      h("button", { type: "button", class: "btn btn-block", onClick: () => toast("เพิ่มรายการใหม่ได้ที่ ข้อมูลกลาง (เพิ่มเติม)") }, pi("plus", 15), "เพิ่มรายการในหมวดนี้"),
    ];
    saveBtn.addEventListener("click", () => {
      const { total, filled } = recompute();
      const lines = invItems.filter((it) => est.packQty[it.id]).map((it) => ({ id: it.id, name: it.name, qty: num(est.packQty[it.id]), cost: costOf(it) }));
      saveExpenseRecord({ id: "exp-" + est.day + "-" + cat, day: est.day, cat, kind: "inventory", amount: Math.round(total), count: filled, lines, at: new Date().toISOString() });
      toast("บันทึก" + cat + " " + est.day + " มิ.ย. ฿" + fmt(Math.round(total)) + " — บันทึกขึ้นคลาวด์แล้ว"); back();
    });
    foot = h("div", { class: "foot" }, h("div", { style: { flex: 1 } }, footCount, footTotal), saveBtn);
  } else {
    const amtIn = h("input", { type: "text", inputMode: "numeric", class: "input tnum", style: { fontSize: "22px", fontWeight: 700 }, placeholder: "0", value: est.amt });
    amtIn.addEventListener("input", () => { const s = amtIn.value.replace(/[^0-9]/g, ""); if (s !== amtIn.value) amtIn.value = s; est.amt = s; blockSave.disabled = !est.amt; blockSave.style.opacity = est.amt ? 1 : .45; });
    const detailIn = h("input", { type: "text", class: "input", placeholder: "เช่น " + (cat === "ค่าเช่า" ? "ค่าเช่ารายเดือน" : "ค่า" + cat + "รอบเดือนนี้") });
    const savedRows = est.day === TODAY.d
      ? MONEY.todayExp.map((e) => h("div", { class: "rowflex", style: { padding: "10px 0" } },
          h("span", { class: "catic blue sm" }, pi("box", 15)),
          h("div", { style: { flex: 1, minWidth: 0 } }, h("div", { style: { fontSize: "13.5px", fontWeight: 600 } }, e.cat), h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, e.note)),
          h("span", { class: "tnum", style: { fontWeight: 700 } }, "฿" + fmt(e.amt)),
          h("button", { type: "button", class: "hdr-icon", style: { width: "30px", height: "30px" }, "aria-label": "แก้ไข", onClick: () => toast("แก้รายการได้จากหน้าประวัติการบันทึก") }, pi("edit", 14)),
        ))
      : [emptyState({ compact: true, iconName: "box", title: "ยังไม่มีบันทึกหมวดนี้", sub: "วันที่ " + est.day + " มิ.ย. · เพิ่มรายการด้านบน" })];
    body = [
      h("div", { class: "card" },
        h("div", { class: "split", style: { marginBottom: "6px" } },
          h("span", { style: { fontSize: "12px", fontWeight: 600, color: "var(--muted)" } }, "จำนวนเงิน · " + est.day + " มิ.ย."),
          h("span", { class: "badge" }, cat),
        ),
        h("div", { class: "rowflex", style: { gap: "8px" } }, amtIn, h("span", { style: { fontSize: "13px", color: "var(--muted)", flex: "none" } }, "บาท")),
        h("div", { class: "field", style: { margin: "12px 0 0" } },
          h("span", { class: "field-label" }, "รายละเอียด"),
          detailIn,
        ),
      ),
      h("button", { type: "button", class: "btn btn-block", onClick: () => toast("เพิ่มรายการใหม่ได้ที่ ข้อมูลกลาง (เพิ่มเติม)") }, pi("plus", 15), "เพิ่มรายการในหมวดนี้"),
      h("div", { class: "overline" }, "บันทึกแล้ว · " + est.day + " มิ.ย."),
      h("div", { class: "card", style: { padding: "4px 16px" } }, ...savedRows),
    ];
    const blockSave = h("button", { type: "button", class: "btn btn-primary btn-block", disabled: !est.amt, style: { opacity: est.amt ? 1 : .45 } }, pi("check", 17), "บันทึก");
    blockSave.addEventListener("click", () => {
      saveExpenseRecord({ id: "exp-" + est.day + "-" + cat + "-" + Date.now(), day: est.day, cat, kind: "amount", amount: num(est.amt), note: detailIn.value.trim(), at: new Date().toISOString() });
      toast("บันทึก" + cat + " · " + est.day + " มิ.ย. ฿" + fmt(num(est.amt)) + " — บันทึกขึ้นคลาวด์แล้ว"); back();
    });
    foot = h("div", { class: "foot" }, h("button", { type: "button", class: "btn btn-block", onClick: back }, "ยกเลิก"), blockSave);
  }

  root.replaceChildren(
    hdr({ title: "บันทึกค่าใช้จ่าย", sub: "เลือกวัน · แก้ย้อนหลังได้ · link ข้อมูลกลาง", onBack: back, right: storeChip(shopCtx) }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      dateBar({ day: est.day, onChange: (d) => { est.day = d; paint(root); } }),
      h("div", { class: "chip-tabs" }, chips),
      note([bold("เนื้อ/ไก่/ปลา สด"), " ต้นทุนคิดอัตโนมัติจากของรับเข้า (เห็นฝั่งเจ้าของ) — ส่วน ", bold("บรรจุภัณฑ์ · ข้าว · ซอส · ของแห้ง"), " กรอกตอนซื้อได้ที่นี่เลย"], { amber: true }),
      ...body,
    ),
    foot,
  );
  if (invCatId) recompute();
}
