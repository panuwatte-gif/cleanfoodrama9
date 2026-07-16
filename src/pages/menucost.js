// ============================================================
// pages/menucost.js — สร้างเมนู (เครื่องคิดต้นทุน + กำไรต่อจาน · เจ้าของ)
//   • เลือกวัตถุดิบจากรายการ "ต้นทุนวัตถุดิบ" (raw) → ใส่กรัม/จาน
//     แปลงอัตโนมัติ: ต้นทุน ฿/กก. × กรัม ÷ 1000 = ฿/จาน
//   • ใส่ assumption: GP% + VAT% (แพลตฟอร์มหักจากราคาขาย = GP×(1+VAT))
//     + ค่าแรง / ค่าน้ำค่าไฟ / ค่า Ads / อื่นๆ (เลือกเป็น % หรือ ฿ ต่อจาน)
//   • ใส่ราคาขาย → คิดกำไร/จาน (บาท + %) หักต้นทุนทุกอย่างคร่าว ๆ
//   • ทุกค่าบันทึกใน localStorage (menucost:v1) แก้เพิ่มทีหลังได้
// ctx = { back, toast, role, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, itemIc } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { items } from "../data/store.js";
import { itemById, catById } from "../utils/formulas.js";
import { assumeShop } from "../data/store.js";
import { load, save } from "../utils/storage.js";
import { netCostOf } from "./rawcost.js";

const DK = "menucost:v1";
const bold = (t) => h("b", null, t);
const money = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const num = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };

const mst = { ctx: null, sheet: false };
let S = null;

function loadState(ctx) {
  const shop = (ctx.shopCtx && ctx.shopCtx.shop) || "";
  const def = {
    name: "", price: "", lines: [],
    gp: String(assumeShop("gp-grab", shop, 30)),
    vat: String(assumeShop("vat-plat", shop, 7)),
    laborM: "%", labor: "10",
    utilM: "฿", util: "4",
    adsM: "%", ads: "3",
    otherM: "฿", other: "0",
  };
  const saved = load(DK, null);
  S = saved ? { ...def, ...saved } : def;
}
const persist = () => save(DK, S);

function rawList() {
  return (items() || []).filter((it) => it.cat === "raw" && it.isActive !== false);
}

// ต้นทุนวัตถุดิบต่อจาน (บาท) = Σ netCost(฿/กก.) × กรัม ÷ 1000
function ingCostOf() {
  return S.lines.reduce((a, ln) => { const it = itemById(ln.id); return a + (it ? netCostOf(it) * num(ln.g) / 1000 : 0); }, 0);
}
function calc() {
  const price = num(S.price);
  const ing = ingCostOf();
  const gp = num(S.gp), vat = num(S.vat);
  const platPct = gp * (1 + vat / 100);           // GP โดน VAT ทับ → 30×1.07 = 32.1%
  const platFee = price * platPct / 100;
  const line = (m, v) => (m === "%" ? price * num(v) / 100 : num(v));
  const labor = line(S.laborM, S.labor);
  const util = line(S.utilM, S.util);
  const ads = line(S.adsM, S.ads);
  const other = line(S.otherM, S.other);
  const total = ing + platFee + labor + util + ads + other;
  const profit = price - total;
  const margin = price > 0 ? profit / price * 100 : 0;
  return { price, ing, gp, vat, platPct, platFee, labor, util, ads, other, total, profit, margin };
}

// ช่องตัวเลข — อัปเดต S เงียบ ๆ + เรียก onChange (คิดผลใหม่ในที่)
function nInput(key, { onChange, ph = "0", w } = {}) {
  const inp = h("input", { type: "text", inputMode: "decimal", class: "qty-in" + (S[key] ? " filled" : ""), value: S[key] != null ? String(S[key]) : "", placeholder: ph, style: { textAlign: "center", width: w || "100%" } });
  inp.addEventListener("input", () => { const s = inp.value.replace(/[^0-9.]/g, ""); if (s !== inp.value) inp.value = s; inp.classList.toggle("filled", !!s); S[key] = s; persist(); onChange && onChange(); });
  return inp;
}
// สลับหน่วย % / ฿ ของค่าใช้จ่าย
function modeToggle(mkey, onChange) {
  const mk = (v) => h("button", { type: "button", class: "chip" + (S[mkey] === v ? " active" : ""), style: { padding: "4px 10px", fontSize: "12px" }, onClick: () => { S[mkey] = v; persist(); onChange(); } }, v);
  return h("div", { class: "rowflex", style: { gap: "4px", flex: "none" } }, mk("%"), mk("฿"));
}

export function menuCostScreen(ctx) {
  mst.ctx = ctx; mst.sheet = false;
  loadState(ctx);
  const root = h("div", { class: "page-wrap", "data-screen-label": "menucost" });
  root._sheets = h("div");
  paint(root);
  return h("div", { style: { display: "contents" } }, root, root._sheets);
}

function expenseRow(label, vkey, mkey, root, recalc) {
  return h("div", { class: "rowflex", style: { gap: "8px", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-soft)" } },
    h("span", { style: { flex: 1, fontSize: "13.5px", fontWeight: 600 } }, label),
    modeToggle(mkey, () => paint(root)),
    nInput(vkey, { onChange: recalc, w: "70px" }),
  );
}

function paint(root) {
  const ctx = mst.ctx;
  // results holders (อัปเดตในที่ ไม่ต้อง paint ทั้งหน้า)
  const rIng = h("b", { class: "tnum" }, "");
  const rPlat = h("b", { class: "tnum" }, "");
  const rLabor = h("b", { class: "tnum" }, "");
  const rUtil = h("b", { class: "tnum" }, "");
  const rAds = h("b", { class: "tnum" }, "");
  const rOther = h("b", { class: "tnum" }, "");
  const rIngSum = h("b", { class: "tnum" }, "");
  const rTotal = h("b", { class: "tnum" }, "");
  const rProfit = h("div", { class: "tnum", style: { fontSize: "26px", fontWeight: 800 } }, "");
  const rMargin = h("div", { style: { fontSize: "12px", fontWeight: 700 } }, "");
  const platLbl = h("span", { style: { flex: 1, fontSize: "13px" } }, "");
  const lineCostEls = {};

  const recalc = () => {
    const c = calc();
    rIng.textContent = "฿" + money(c.ing);
    rIngSum.textContent = "฿" + money(c.ing);
    platLbl.textContent = "ค่าแพลตฟอร์ม (GP " + money(c.gp) + "% + VAT " + money(c.vat) + "% = " + money(c.platPct) + "%)";
    rPlat.textContent = "฿" + money(c.platFee);
    rLabor.textContent = "฿" + money(c.labor);
    rUtil.textContent = "฿" + money(c.util);
    rAds.textContent = "฿" + money(c.ads);
    rOther.textContent = "฿" + money(c.other);
    rTotal.textContent = "฿" + money(c.total);
    rProfit.textContent = (c.profit >= 0 ? "กำไร ฿" : "ขาดทุน ฿") + money(Math.abs(c.profit)) + " /จาน";
    rProfit.style.color = c.profit >= 0 ? "var(--primary-dark)" : "var(--danger)";
    rMargin.textContent = "อัตรากำไร " + money(c.margin) + "% ของราคาขาย";
    rMargin.style.color = c.profit >= 0 ? "var(--primary-dark)" : "var(--danger)";
    // อัปเดตต้นทุนแต่ละบรรทัดวัตถุดิบ
    S.lines.forEach((ln) => { const el = lineCostEls[ln.id]; if (el) { const it = itemById(ln.id); el.textContent = "฿" + money(it ? netCostOf(it) * num(ln.g) / 1000 : 0); } });
  };

  const nameIn = h("input", { type: "text", class: "input", value: S.name || "", placeholder: "ชื่อเมนู เช่น ข้าวกะเพราอกไก่" });
  nameIn.addEventListener("input", () => { S.name = nameIn.value; persist(); });

  // บรรทัดวัตถุดิบ
  const ingRows = S.lines.length
    ? S.lines.map((ln, i) => {
        const it = itemById(ln.id);
        const gIn = h("input", { type: "text", inputMode: "decimal", class: "qty-in", value: ln.g != null ? String(ln.g) : "", placeholder: "0", style: { width: "62px", textAlign: "center" } });
        gIn.addEventListener("input", () => { const s = gIn.value.replace(/[^0-9.]/g, ""); if (s !== gIn.value) gIn.value = s; ln.g = s; persist(); recalc(); });
        const costEl = h("span", { class: "tnum", style: { flex: "none", width: "64px", textAlign: "right", fontWeight: 700, color: "var(--primary-dark)", fontSize: "13px" } }, "");
        lineCostEls[ln.id] = costEl;
        return h("div", { class: "rowflex", style: { gap: "8px", alignItems: "center", padding: "9px 0", borderBottom: i < S.lines.length - 1 ? "1px solid var(--border-soft)" : "none" } },
          it ? itemIc(it, { sm: true }) : pi("box", 18),
          h("span", { style: { flex: 1, minWidth: 0 } },
            h("span", { style: { display: "block", fontSize: "13.5px", fontWeight: 600 } }, it ? it.name : "?"),
            h("span", { style: { fontSize: "10.5px", color: "var(--faint)" } }, it ? "฿" + money(netCostOf(it)) + "/กก." : "")),
          gIn, h("span", { style: { fontSize: "11px", color: "var(--faint)", flex: "none" } }, "ก."),
          costEl,
          h("button", { type: "button", class: "mini-btn", "aria-label": "ลบ", style: { color: "var(--danger)", flex: "none" }, onClick: () => { S.lines.splice(i, 1); persist(); paint(root); } }, pi("trash", 14)),
        );
      })
    : [h("div", { style: { fontSize: "12.5px", color: "var(--faint)", padding: "12px 2px", textAlign: "center" } }, "ยังไม่ได้เลือกวัตถุดิบ — กด \"เพิ่มวัตถุดิบ\"")];

  root.replaceChildren(
    hdr({ title: "สร้างเมนู", sub: "คิดต้นทุน + กำไรต่อจาน", onBack: ctx.back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      note(["เลือกวัตถุดิบ (จากหน้า ", bold("ต้นทุนวัตถุดิบ"), ") ใส่กรัม/จาน — ระบบแปลง ฿/กก. → ฿/จาน ให้ · ใส่ราคาขายเพื่อดูกำไรหลังหักทุกอย่าง"], { iconName: "chefhat" }),

      h("label", { class: "field", style: { margin: 0 } }, h("span", { class: "field-label" }, "ชื่อเมนู"), nameIn),

      h("div", { class: "overline ov-green" }, "วัตถุดิบต่อจาน"),
      h("div", { class: "card", style: { padding: "4px 14px" } }, ...ingRows),
      h("button", { type: "button", class: "btn btn-block", onClick: () => { mst.sheet = true; renderSheets(root); } }, pi("plus", 15), "เพิ่มวัตถุดิบ"),
      h("div", { class: "card soft-card soft-green split", style: { padding: "10px 14px" } },
        h("span", { style: { fontWeight: 700, fontSize: "13.5px" } }, "รวมต้นทุนวัตถุดิบ / จาน"), rIng),

      h("div", { class: "overline ov-amber" }, "ราคาขาย + ค่าใช้จ่าย (assumption)"),
      h("div", { class: "card", style: { padding: "12px 14px" } },
        h("div", { class: "rowflex", style: { gap: "8px", alignItems: "center", paddingBottom: "10px", borderBottom: "1px solid var(--border-soft)" } },
          h("span", { style: { flex: 1, fontSize: "14px", fontWeight: 700 } }, "ราคาขาย (฿/จาน)"),
          nInput("price", { onChange: recalc, w: "90px" })),
        h("div", { class: "rowflex", style: { gap: "8px", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-soft)" } },
          h("span", { style: { flex: 1, fontSize: "13.5px", fontWeight: 600 } }, "GP % (แพลตฟอร์ม)"), nInput("gp", { onChange: recalc, w: "60px" }),
          h("span", { style: { fontSize: "13px", color: "var(--muted)", flex: "none" } }, "VAT %"), nInput("vat", { onChange: recalc, w: "52px" })),
        expenseRow("ค่าแรง", "labor", "laborM", root, recalc),
        expenseRow("ค่าน้ำ / ค่าไฟ", "util", "utilM", root, recalc),
        expenseRow("ค่า Ads / โฆษณา", "ads", "adsM", root, recalc),
        expenseRow("ค่าใช้จ่ายอื่นๆ", "other", "otherM", root, recalc),
      ),

      h("div", { class: "overline ov-blue" }, "สรุปต้นทุน & กำไร / จาน"),
      h("div", { class: "card", style: { padding: "12px 16px" } },
        ...[[h("span", null, "ต้นทุนวัตถุดิบ"), rIngSum], [platLbl, rPlat], [h("span", null, "ค่าแรง"), rLabor], [h("span", null, "ค่าน้ำ/ค่าไฟ"), rUtil], [h("span", null, "ค่า Ads"), rAds], [h("span", null, "อื่นๆ"), rOther]].map(([l, v]) =>
          h("div", { class: "rowflex", style: { justifyContent: "space-between", padding: "5px 0", fontSize: "13px", color: "var(--muted)" } }, l, v)),
        h("div", { class: "rowflex", style: { justifyContent: "space-between", padding: "9px 0 4px", marginTop: "4px", borderTop: "1px solid var(--border-soft)", fontSize: "14px", fontWeight: 700 } }, h("span", null, "รวมต้นทุนทั้งหมด"), rTotal),
      ),
      h("div", { class: "card soft-card soft-green", style: { padding: "16px", textAlign: "center" } }, rProfit, rMargin),
      note(["ค่าแรง/ค่าน้ำไฟ/Ads/อื่นๆ เป็นค่าประมาณ ", bold("แก้เพิ่มทีหลังได้"), " · GP/VAT ดึงค่าเริ่มต้นจากหน้า assumption (แก้ตรงนี้เฉพาะการคิดเมนูนี้)"], { amber: true }),
    ),
  );
  recalc();
  renderSheets(root);
}

function renderSheets(root) {
  const layer = root._sheets;
  layer.replaceChildren();
  if (!mst.sheet) return;
  const list = rawList();
  const cat = catById("raw");
  const subs = (cat && cat.subs) || [{ id: null, name: "" }];
  const groups = subs.map((sb) => {
    const rows = list.filter((it) => (it.sub || null) === sb.id);
    if (!rows.length) return null;
    return h("div", { class: "stack", style: { gap: "6px" } },
      h("div", { class: "overline" }, sb.name || "วัตถุดิบ"),
      rows.map((it) => h("button", { type: "button", class: "rowflex list-press", style: { width: "100%", border: 0, background: "transparent", textAlign: "left", padding: "9px 4px", borderBottom: "1px solid var(--border-soft)" }, onClick: () => { S.lines.push({ id: it.id, g: 100 }); persist(); mst.sheet = false; paint(root); } },
        itemIc(it, { sm: true }),
        h("span", { style: { flex: 1, minWidth: 0, fontSize: "13.5px", fontWeight: 600 } }, it.name),
        h("span", { class: "tnum", style: { fontSize: "12px", color: "var(--primary-dark)", fontWeight: 700 } }, "฿" + money(netCostOf(it)) + "/กก."),
        pi("plus", 15))));
  }).filter(Boolean);
  layer.appendChild(sheet({
    onClose: () => { mst.sheet = false; renderSheets(root); },
    children: h("div", { class: "stack", style: { gap: "10px" } },
      h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 2px" } }, "เลือกวัตถุดิบ"),
      h("div", { style: { fontSize: "11.5px", color: "var(--muted)", textAlign: "center" } }, "แตะเพื่อเพิ่ม (ตั้งต้น 100 ก. · แก้กรัมทีหลังได้)"),
      ...(groups.length ? groups : [h("div", { style: { padding: "20px", textAlign: "center", color: "var(--faint)" } }, "ยังไม่มีวัตถุดิบ — เพิ่มที่หน้าต้นทุนวัตถุดิบ")]),
    ),
  }));
}
