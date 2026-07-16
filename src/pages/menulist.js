// ============================================================
// pages/menulist.js — เมนู · ราคาขาย  (ตารางเดี่ยว standalone — จดโปรกันลืม)
//   • ไม่ลิงก์สต๊อก/ข้อมูลกลาง (การลิงก์เดิมทำชื่อไม่ตรงแล้วพัง — ตัดทิ้ง)
//   • คอลัมน์: กับข้าว | ชนิดข้าว | ราคาตั้งขาย | ส่วนลด | ราคาสุทธิ | ชื่อร้าน
//       สุทธิ = ตั้งขาย − ส่วนลด · ถ้าเว้นตั้งขายไว้ ใส่ "ราคาสุทธิ" ตรง ๆ ได้ (ของที่ลงไว้)
//   • แบ่งหมวด (อาหารจานหลัก/เครื่องดื่ม/Topping/Add-on) · แก้/ลบ/สลับลำดับ/ย้ายหมวดได้
//   • หมวด "ซื้อเพิ่ม (Add-on)" = ของเสริม จัดโปร/ส่วนลดไม่ได้
//   • เก็บลง Supabase ตาราง rama9_price_list (ไม่มี foreign key)
// ctx = { go, back, role, toast, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, searchBox, emptyState } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { priceRows, savePrice, removePrice } from "../data/store.js";
import { PRICE_CATS, ADDON_CAT } from "../data/seed.js";
import { fmt } from "../utils/formulas.js";
import { menuThumb } from "../data/menuImages.js";

const bold = (t) => h("b", null, t);
const pst = { q: "", cat: "all", ctx: null, edit: null };

// สุทธิ: ถ้ามีราคาตั้งขาย → ตั้งขาย − ส่วนลด · ไม่งั้นใช้ค่า net ที่เก็บไว้ (ของที่ลงมา)
const netOf = (r) => {
  const price = Number(r.price) || 0;
  if (price > 0) return Math.max(0, price - (Number(r.disc) || 0));
  return Number(r.net) || 0;
};
const isAddon = (cat) => cat === ADDON_CAT;
const field = (label, input, hint) =>
  h("label", { class: "stack", style: { gap: "5px" } }, h("span", { class: "field-label" }, label), input,
    hint ? h("span", { style: { fontSize: "11px", color: "var(--faint)" } }, hint) : null);

// ลำดับหมวด: PRICE_CATS ก่อน แล้วหมวดแปลก ๆ (ที่เจ้าของเพิ่มเอง) ต่อท้าย
function orderedCats() {
  const present = [...new Set(priceRows().map((r) => r.cat || "อื่นๆ"))];
  const known = PRICE_CATS.filter((c) => true);
  const extra = present.filter((c) => !known.includes(c));
  return [...known, ...extra];
}
// แถวในหมวดเดียว เรียงตาม ord (ไม่มี ord → ท้าย)
const rowsInCat = (cat) => priceRows().filter((r) => (r.cat || "อื่นๆ") === cat)
  .sort((a, b) => (a.ord || 9999) - (b.ord || 9999) || (a.dish || "").localeCompare(b.dish || "", "th"));

function priceCell(lbl, val, col, strike) {
  return h("div", { style: { textAlign: "right", minWidth: "46px" } },
    h("div", { style: { fontSize: "10px", color: "var(--faint)" } }, lbl),
    h("div", { class: "tnum", style: { fontSize: "13px", fontWeight: 700, color: col || "var(--text)", textDecoration: strike ? "line-through" : "none" } }, val),
  );
}

// ปุ่มสลับลำดับ ▲▼ (เจ้าของ) — สลับ ord กับเพื่อนบ้านในหมวดเดียวกัน
async function moveRow(r, dir, root) {
  const group = rowsInCat(r.cat || "อื่นๆ");
  const i = group.findIndex((x) => x.id === r.id);
  const j = i + dir;
  if (j < 0 || j >= group.length) return;
  const a = group[i], b = group[j];
  const ao = a.ord != null ? a.ord : (i + 1) * 10;
  const bo = b.ord != null ? b.ord : (j + 1) * 10;
  await savePrice({ ...a, ord: bo });
  await savePrice({ ...b, ord: ao });
  paint(root);
}

function priceRow(r, root, idx, lastIdx) {
  const owner = pst.ctx.role === "owner";
  const price = Number(r.price) || 0;
  const disc = Number(r.disc) || 0;
  const hasNet = netOf(r) > 0;
  const addon = isAddon(r.cat);

  const reorder = owner ? h("div", { class: "stack", style: { gap: "2px", flex: "none" } },
    moveBtn("up", () => moveRow(r, -1, root), idx === 0),
    moveBtn("down", () => moveRow(r, 1, root), idx === lastIdx),
  ) : null;

  return h("div", { class: "card split", style: { padding: "10px 12px 10px 14px", cursor: owner ? "pointer" : "default" }, onClick: owner ? () => openEdit(r, root) : undefined },
    h("div", { class: "rowflex", style: { minWidth: 0, flex: 1, gap: "10px" } },
      (!addon && menuThumb(r.dish, 42, { borderRadius: "12px" })) || h("span", { class: "catic " + (addon ? "amber" : "green"), style: { flex: "none" } }, pi(addon ? "plus" : "tag", 16)),
      h("div", { style: { minWidth: 0 } },
        h("div", { style: { fontWeight: 700, fontSize: "13.5px" } }, r.dish || "—"),
        h("div", { class: "rowflex", style: { gap: "7px", marginTop: "2px", flexWrap: "wrap" } },
          r.rice
            ? h("span", { class: "rowflex", style: { gap: "4px", fontSize: "11px", color: "var(--primary-dark)", fontWeight: 600 } }, pi("rice", 11), r.rice)
            : (addon ? null : h("span", { style: { fontSize: "11px", color: "var(--faint)" } }, "—")),
          r.shop && h("span", { class: "rowflex", style: { gap: "3px", fontSize: "10.5px", color: "var(--muted)", fontWeight: 600, background: "var(--bg)", border: "1px solid var(--border-soft)", borderRadius: "6px", padding: "1px 6px" } }, pi("store", 10), r.shop),
        ),
      ),
    ),
    h("div", { class: "rowflex", style: { gap: "8px", flex: "none" } },
      (!addon && price > 0 && disc) ? priceCell("ตั้งขาย", fmt(price), "var(--muted)", true) : (price > 0 ? priceCell("ตั้งขาย", fmt(price), "var(--muted)") : priceCell("ตั้งขาย", "—", "var(--faint)")),
      (!addon && disc) ? priceCell("ส่วนลด", "−" + fmt(disc), "var(--warning-ink)") : null,
      priceCell("สุทธิ", hasNet ? fmt(netOf(r)) + " ฿" : "—", hasNet ? "var(--primary-dark)" : "var(--faint)"),
      reorder,
      owner ? h("span", { class: "catic", style: { background: "transparent", flex: "none", width: "24px" } }, pi("edit", 14)) : null,
    ),
  );
}

function moveBtn(dir, onClick, disabled) {
  const ic = pi("chevd", 13);
  if (dir === "up") ic.style.transform = "rotate(180deg)";
  const b = h("button", {
    type: "button", class: "reorder-btn", "aria-label": dir === "up" ? "เลื่อนขึ้น" : "เลื่อนลง",
    onClick: (e) => { e.stopPropagation(); if (!disabled) onClick(); },
    style: { width: "26px", height: "20px", display: "grid", placeItems: "center", border: "1px solid var(--border-soft)", borderRadius: "7px", background: "var(--surface)", color: disabled ? "var(--faint)" : "var(--muted)", opacity: disabled ? 0.4 : 1, cursor: disabled ? "default" : "pointer", padding: 0 },
  }, ic);
  return b;
}

export function menuListScreen(ctx) {
  pst.ctx = ctx; pst.q = ""; pst.cat = "all"; pst.edit = null;
  const root = h("div", { class: "page-wrap", "data-screen-label": "menulist" });
  root._sheets = h("div");
  paint(root);
  return root;
}

function catHeader(cat, count) {
  const addon = isAddon(cat);
  return h("div", { class: "split", style: { padding: "2px 4px 0", marginTop: "4px" } },
    h("span", { class: "rowflex", style: { gap: "7px" } },
      h("span", { class: "overline", style: { color: addon ? "var(--warning-ink)" : "var(--primary-dark)" } }, cat),
      h("span", { style: { fontSize: "11px", color: "var(--faint)", fontWeight: 600 } }, count + " รายการ"),
    ),
  );
}

function paint(root) {
  const { back, role } = pst.ctx;
  const owner = role === "owner";
  const q = pst.q.toLowerCase();
  const match = (r) => !q || (r.dish || "").toLowerCase().includes(q) || (r.rice || "").toLowerCase().includes(q) || (r.shop || "").toLowerCase().includes(q);
  const total = priceRows().length;
  const cats = orderedCats();
  // แถบแท็บแยกหมวด (เลื่อนได้ — ลากเมาส์/ล้อเมาส์/ปัดนิ้ว)
  const catTabBar = total ? h("div", { class: "chip-tabs cat-tabs" },
    h("button", { type: "button", class: "chip" + (pst.cat === "all" ? " active" : ""), onClick: () => { pst.cat = "all"; paint(root); } }, pi("grid", 13), "ทั้งหมด"),
    cats.filter((c) => rowsInCat(c).length).map((c) => h("button", { type: "button", class: "chip" + (pst.cat === c ? " active" : ""), onClick: () => { pst.cat = c; paint(root); } },
      pi(isAddon(c) ? "plus" : "tag", 12), c)),
  ) : null;

  const sections = [];
  cats.forEach((cat) => {
    if (pst.cat !== "all" && cat !== pst.cat) return;     // กรองตามแท็บหมวดที่เลือก
    const rows = rowsInCat(cat).filter(match);
    if (q && !rows.length) return;                 // ตอนค้นหา ซ่อนหมวดที่ไม่มีผล
    sections.push(catHeader(cat, rowsInCat(cat).length));
    if (isAddon(cat)) sections.push(note(["ของเสริม/ซื้อเพิ่ม — ", bold("จัดโปร/ส่วนลดไม่ได้"), " (คิดราคาตรง) · เผื่อไว้เพิ่มเมนูซื้อเพิ่มทีหลัง"], { amber: true }));
    if (rows.length) rows.forEach((r, i) => sections.push(priceRow(r, root, i, rows.length - 1)));
    else sections.push(h("div", { style: { padding: "8px 14px", fontSize: "12px", color: "var(--faint)" } }, "ยังไม่มีรายการในหมวดนี้"));
    if (owner) sections.push(
      h("button", { type: "button", class: "btn btn-block", style: { borderStyle: "dashed", color: "var(--muted)", marginTop: "2px" }, onClick: () => openAdd(root, cat) }, pi("plus", 14), "เพิ่มในหมวด " + cat),
    );
  });

  const searchEl = searchBox({ value: pst.q, onChange: (v) => { pst.q = v; paint(root); }, placeholder: "ค้นหากับข้าว / ชนิดข้าว / ร้าน…" });

  root.replaceChildren(
    hdr({ title: "เมนู · ราคาขาย", sub: total + " รายการ · ตั้งขาย − ส่วนลด = สุทธิ", onBack: back, right: h("span", { class: "catic green" }, pi("tag", 18)) }),
    h("div", { class: "page stack" },
      owner
        ? note(["จดราคาขาย", bold("กันลืมโปร"), " — แตะแถวเพื่อแก้/ลบ · ▲▼ สลับลำดับ · ราคาที่ลงไว้คือ", bold("ราคาสุทธิ"), " (ตั้งขาย/ส่วนลดเว้นว่างได้ ค่อยเติมทีหลัง)"], { iconName: "tag" })
        : note(["ราคาตั้งขาย − ส่วนลด = ", bold("ราคาสุทธิ"), " · แก้ไขทำที่ฝั่ง", bold("เจ้าของ")], { iconName: "tag" }),
      owner && note([bold("ชื่อร้าน:"), " ระบุได้ว่าเมนูนี้ของร้านไหน — กำลังจะ", bold("เปิดร้านเพิ่ม"), " บางเมนูอาจใช้ร่วมกันได้"], { amber: true }),
      searchEl,
      catTabBar,
      total ? h("div", { class: "stack", style: { gap: "8px" } }, ...sections)
            : emptyState({ compact: true, iconName: "tag", title: "ยังไม่มีรายการราคา", sub: owner ? "กดเพิ่มรายการในหมวด" : "ยังไม่มีข้อมูล" }),
    ),
    root._sheets,
  );

  renderSheets(root);
  if (pst.q) { const inp = searchEl.querySelector("input"); if (inp) { inp.focus(); const n = inp.value.length; inp.setSelectionRange(n, n); } }
}

/* ---------- เพิ่ม / แก้ / ลบ ---------- */
const shopNames = () => {
  const fromCtx = (pst.ctx && pst.ctx.shopCtx && pst.ctx.shopCtx.shops || []).map((s) => s.name);
  const fromRows = priceRows().map((r) => r.shop).filter(Boolean);
  return [...new Set([...fromCtx, ...fromRows])];
};
const defaultShop = () => (pst.ctx && pst.ctx.shopCtx && pst.ctx.shopCtx.shop) || (shopNames()[0] || "กะเพราโคตรคลีน");

function nextOrd(cat) {
  const group = rowsInCat(cat);
  return group.length ? (group[group.length - 1].ord || group.length * 10) + 10 : 10;
}
function openAdd(root, cat) {
  const c = cat || PRICE_CATS[0];
  pst.edit = { new: true, id: "pl-" + Date.now(), cat: c, dish: "", rice: "", price: "", disc: "", net: "", shop: defaultShop(), ord: nextOrd(c) };
  renderSheets(root);
}
function openEdit(r, root) {
  pst.edit = {
    id: r.id, cat: r.cat || PRICE_CATS[0], dish: r.dish || "", rice: r.rice || "",
    price: r.price != null && r.price !== "" ? String(r.price) : "",
    disc: r.disc ? String(r.disc) : "",
    net: (Number(r.price) || 0) > 0 ? "" : (r.net != null ? String(r.net) : ""),
    shop: r.shop || "", ord: r.ord,
  };
  renderSheets(root);
}

async function doSave(root) {
  const e = pst.edit;
  const dish = (e.dish || "").trim();
  const price = Math.max(0, parseFloat(e.price) || 0);
  const addon = isAddon(e.cat);
  const disc = addon ? 0 : Math.max(0, parseFloat(e.disc) || 0);
  const manualNet = Math.max(0, parseFloat(e.net) || 0);
  const net = price > 0 ? Math.max(0, price - disc) : manualNet;
  if (!dish || !(net > 0)) return;                 // ต้องมีชื่อ + ราคาสุทธิ (จากตั้งขายหรือกรอกตรง)
  await savePrice({
    id: e.id,
    cat: (e.cat || PRICE_CATS[0]).trim(),
    dish, rice: (e.rice || "").trim(),
    price: price > 0 ? price : null,
    disc, net,
    shop: (e.shop || "").trim(),
    ord: e.ord != null ? e.ord : nextOrd(e.cat),
    at: new Date().toISOString(),
  });
  const isNew = e.new;
  pst.edit = null; paint(root);
  pst.ctx.toast(isNew ? "เพิ่มรายการขายแล้ว" : "บันทึกแล้ว");
}

async function doDelete(root) {
  await removePrice(pst.edit.id);
  pst.edit = null; paint(root);
  pst.ctx.toast("ลบรายการแล้ว");
}

function editBody(root) {
  const e = pst.edit;
  const addon = isAddon(e.cat);

  // หมวด (เลือก/พิมพ์เองได้)
  const catListId = "catlist-" + e.id;
  const catList = h("datalist", { id: catListId }, PRICE_CATS.map((c) => h("option", { value: c })));
  const catIn = h("input", { type: "text", class: "input", value: e.cat || "", placeholder: "เลือกหรือพิมพ์หมวดใหม่", list: catListId, autocomplete: "off" });

  const dishIn = h("input", { type: "text", class: "input", value: e.dish || "", placeholder: "เช่น กะเพราไก่ / เพิ่มอกไก่ 50 ก." });
  const riceIn = h("input", { type: "text", class: "input", value: e.rice || "", placeholder: "เช่น หอมมะลิ / ไรซ์เบอรี่ (เว้นว่างได้)" });
  const priceIn = h("input", { type: "text", inputMode: "decimal", class: "input tnum", value: e.price !== "" && e.price != null ? String(e.price) : "", placeholder: "เว้นว่างได้" });
  const discIn = h("input", { type: "text", inputMode: "decimal", class: "input tnum", value: e.disc ? String(e.disc) : "", placeholder: "0" });
  const netIn = h("input", { type: "text", inputMode: "decimal", class: "input tnum", value: e.net ? String(e.net) : "", placeholder: "0" });

  const shopOpts = shopNames();
  const shopListId = "shoplist-" + e.id;
  const shopList = h("datalist", { id: shopListId }, shopOpts.map((nm) => h("option", { value: nm })));
  const shopIn = h("input", { type: "text", class: "input", value: e.shop || "", placeholder: "เช่น กะเพราโคตรคลีน", list: shopListId, autocomplete: "off" });

  const netBig = h("div", { class: "big-num tnum", style: { fontSize: "24px", color: "var(--primary-dark)" } }, "฿0");
  const discWrap = h("div", { style: { flex: 1 } }, field("ส่วนลด (฿)", discIn));
  const netRow = h("div", { style: { flex: 1 } });

  const recalc = () => {
    const p = Math.max(0, parseFloat(priceIn.value) || 0);
    const d = isAddon(catIn.value) ? 0 : Math.max(0, parseFloat(discIn.value) || 0);
    let net;
    if (p > 0) { net = Math.max(0, p - d); netIn.value = String(net); netIn.disabled = true; netIn.style.opacity = 0.6; }
    else { netIn.disabled = false; netIn.style.opacity = 1; net = Math.max(0, parseFloat(netIn.value) || 0); }
    netBig.textContent = "฿" + fmt(net);
    // หมวด add-on: ซ่อนช่องส่วนลด
    discWrap.style.display = isAddon(catIn.value) ? "none" : "";
  };
  // ช่อง "ราคาสุทธิ (กรอกตรง)" — แสดงเมื่อไม่กรอกตั้งขาย
  netRow.replaceChildren(field("ราคาสุทธิ (฿)", netIn, "กรอกตรงได้เมื่อเว้นราคาตั้งขาย"));

  const valid = () => {
    const p = Math.max(0, parseFloat(priceIn.value) || 0);
    const d = isAddon(catIn.value) ? 0 : Math.max(0, parseFloat(discIn.value) || 0);
    const net = p > 0 ? Math.max(0, p - d) : Math.max(0, parseFloat(netIn.value) || 0);
    return !!(dishIn.value && dishIn.value.trim()) && net > 0;
  };
  const saveBtn = h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => { if (valid()) doSave(root); } }, pi("check", 16), "บันทึก");
  const syncBtn = () => { const ok = valid(); saveBtn.disabled = !ok; saveBtn.style.opacity = ok ? 1 : 0.45; };

  catIn.addEventListener("input", () => { pst.edit.cat = catIn.value; recalc(); });
  dishIn.addEventListener("input", () => { pst.edit.dish = dishIn.value; syncBtn(); });
  riceIn.addEventListener("input", () => { pst.edit.rice = riceIn.value; });
  priceIn.addEventListener("input", () => { pst.edit.price = priceIn.value; recalc(); syncBtn(); });
  discIn.addEventListener("input", () => { pst.edit.disc = discIn.value; recalc(); });
  netIn.addEventListener("input", () => { pst.edit.net = netIn.value; recalc(); syncBtn(); });
  recalc(); syncBtn();

  return h("div", { class: "stack", style: { gap: "12px" } },
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 2px" } }, e.new ? "เพิ่มรายการขาย" : "แก้ไขรายการขาย"),
    h("div", { style: { fontSize: "11.5px", color: "var(--muted)", textAlign: "center", marginBottom: "2px" } }, "กรอกกับข้าว + ราคาสุทธิ ก็พอ — ตั้งขาย/ส่วนลด/ชนิดข้าวใส่ถ้ามี"),
    h("div", null, field("หมวด", catIn, "อาหารจานหลัก · เครื่องดื่ม · Topping · Add-on (หรือพิมพ์หมวดใหม่)"), catList),
    field("กับข้าว / ชื่อรายการ *", dishIn),
    field("ชนิดข้าว", riceIn, "กับข้าวเดียวกันคนละชนิดข้าว = แยกเป็นคนละแถว"),
    h("div", null, field("ชื่อร้าน", shopIn, "ระบุว่าเมนูนี้ของร้านไหน (ไว้แยกตอนเปิดร้านใหม่ · เว้นว่างได้)"), shopList),
    h("div", { class: "rowflex", style: { gap: "10px", alignItems: "flex-end" } },
      h("div", { style: { flex: 1 } }, field("ราคาตั้งขาย (฿)", priceIn)),
      discWrap,
    ),
    netRow,
    h("div", { class: "card soft-card soft-green split" },
      h("div", null, h("div", { class: "overline" }, "ราคาสุทธิ"), netBig),
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
