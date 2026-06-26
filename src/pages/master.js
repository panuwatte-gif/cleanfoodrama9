// ============================================================
// pages/master.js — ข้อมูลกลาง (เจ้าของ) · พอร์ตจาก prototype2 MasterScreen
// แหล่งข้อมูลเดียว: แก้ที่นี่ ทุกหน้า link ตาม
//
// 6 แท็บ (จำลองหน้าที่ link): ทั้งหมด · สั่งของ · รับของ · นับคงเหลือ · ทิ้ง · สินค้าคงเหลือ
// ทำได้: เพิ่ม/ลบ(soft-delete)/แก้ชื่อ-ราคา/เปลี่ยนไอคอน/สลับลำดับ/ย้ายหมวด + แก้คงเหลือย้อนหลัง
// ทุกการแก้ → logEdit() จริง (เห็นในหน้าประวัติ)
//
// กันค่าหาย/ไม่เสีย focus: ช่อง "ต้นทุน" (order/recv) และ "คงเหลือ" (stock) อัปเดต
//   db เงียบๆ (persistData ไม่ bump) — ไม่ re-render ทั้งแอปตอนพิมพ์
// โครงสร้าง (เพิ่ม/ลบ/สลับ/ย้าย) → bumpData() เพื่อให้ทุกหน้า link ตาม
// ctx = { go, back, role, toast, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, seg, searchBox, toggle, tag, iconPicker, itemIc, catIc, emptyState } from "../components/components.js";
import { sheet, pinSheetBody } from "../components/sheet.js";
import { entryList } from "./_entry.js";
import { cats, items, stockRows, saveItem, removeItem, persistData, bumpData } from "../data/store.js";
import { itemById, catById, unitOf, itemIcon, itemTint, orderCats, fmt } from "../utils/formulas.js";
import { logEdit } from "../data/editlog.js";
import { TODAY, UNIT_CHOICES } from "../data/seed.js";

const MD_TABS = [
  { v: "all",   t: "ข้อมูลทั้งหมด", ic: "db",    scope: "all",   tint: { bg: "#F4F1FE", bd: "#E1D8F9", fg: "#6D28D9" } },
  { v: "order", t: "สั่งของ",        ic: "send",  scope: "order", tint: { bg: "#F1F8EE", bd: "#CFE8C7", fg: "#15803D" } },
  { v: "recv",  t: "รับของ",         ic: "truck", scope: "order", tint: { bg: "#EFF5FF", bd: "#CFE0FB", fg: "#1D4ED8" } },
  { v: "count", t: "นับคงเหลือ",     ic: "scale", scope: "all",   tint: { bg: "#ECFBF6", bd: "#BDEDE2", fg: "#0F766E" } },
  { v: "waste", t: "ทิ้ง",           ic: "trash", scope: "all",   tint: { bg: "#FFF1F2", bd: "#FBD0D5", fg: "#BE123C" } },
  { v: "stock", t: "สินค้าคงเหลือ",  ic: "box",   scope: "all",   tint: { bg: "#FFF8EC", bd: "#FBE6BC", fg: "#B45309" } },
];
const MD_SCOPE_NOTE = {
  all:   "ฐานข้อมูลทั้งหมดของแอป · ทุกหน้า link ออกจากที่นี่ — แก้ที่นี่เปลี่ยนทั้งหมด",
  order: "ต้นทุนขาย (฿/หน่วย) แก้ได้ที่นี่ · แก้ฝั่งสั่งของ = ฝั่งรับของเปลี่ยนตาม",
  recv:  "ต้นทุนขาย (฿/หน่วย) แก้ได้ที่นี่ · แก้ฝั่งรับของ = ฝั่งสั่งของเปลี่ยนตาม",
  count: 'รายการ · ลำดับ · ไอคอน ที่นี่ = หน้า "นับสินค้าคงเหลือ" เป๊ะ',
  waste: 'รายการ · ลำดับ · ไอคอน ที่นี่ = หน้า "ทิ้ง" เป๊ะ',
  stock: 'กรอก "คงเหลือ" ได้ที่นี่ (วันนี้/ย้อนหลัง) · ลำดับ = หน้า "สินค้าคงเหลือ"',
};

const st = {
  tab: "all", openCat: "protein", q: "",
  edit: null, catEdit: null, pin: null,
  day: TODAY.d, qtyMap: {},
  countVals: {}, wasteVals: {}, cOpen: {}, wOpen: {},
  ctx: null,
};

const bold = (t) => h("b", null, t);
const role = () => (st.ctx && st.ctx.role) === "owner" ? "เจ้าของ" : "พนักงาน";

export function masterScreen(ctx) {
  st.ctx = ctx;
  const root = h("div", { class: "page-wrap", "data-screen-label": "master", style: { display: "flex", flexDirection: "column", flex: 1 } });
  root._sheets = h("div");
  paint(root);
  return root;
}

/* ---------- ตัวช่วย stock (คงเหลือ วันนี้/ย้อนหลัง) ---------- */
const qtyOf = (id) => {
  const k = st.day + ":" + id;
  if (st.qtyMap[k] !== undefined) return st.qtyMap[k];
  const s = stockRows().find((x) => x.id === id);
  return (s && st.day === TODAY.d) ? String(s.qty) : "";
};
function setQty(id, v) {
  st.qtyMap[st.day + ":" + id] = v;
  if (st.day === TODAY.d) { const s = stockRows().find((x) => x.id === id); if (s) { s.qty = parseFloat(v || 0) || 0; persistData(); } }
}

/* ---------- เรียงรายการในหมวด (ตามหมวดย่อย) — เฉพาะที่ยังใช้งาน ---------- */
function orderedOf(catId) {
  const c = catById(catId);
  const list = items().filter((i) => i.cat === catId && i.isActive !== false);
  const subs = (c && c.subs) || [];
  if (!subs.length) return list;
  return subs.flatMap((s) => list.filter((i) => i.sub === s.id)).concat(list.filter((i) => !i.sub));
}

/* ---------- สลับลำดับ / ย้ายหมวด ---------- */
function moveItem(id, dir, root) {
  const it = itemById(id);
  const arr = items();
  const peers = arr.filter((x) => x.cat === it.cat && (x.sub || "") === (it.sub || "") && x.isActive !== false);
  const pIdx = peers.findIndex((x) => x.id === id);
  const nIdx = pIdx + dir;
  if (nIdx < 0 || nIdx >= peers.length) return;
  const a = arr.indexOf(peers[pIdx]), b = arr.indexOf(peers[nIdx]);
  [arr[a], arr[b]] = [arr[b], arr[a]];
  persistData(); logEdit({ txt: 'สลับลำดับ "' + it.name + '"', by: role() });
  st.ctx.toast("สลับลำดับแล้ว — ทุกหน้าเรียงตามนี้"); bumpData();
}
function moveCat(id, dir) {
  const arr = cats();
  const i = arr.findIndex((c) => c.id === id);
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  persistData(); bumpData();
}

/* ---------- date bar ---------- */
function dateBar(root) {
  const isToday = st.day === TODAY.d;
  return h("div", { class: "datebar" },
    h("button", { type: "button", class: "hdr-icon", style: { width: "32px", height: "32px" }, "aria-label": "วันก่อนหน้า", onClick: () => { st.day = Math.max(1, st.day - 1); paint(root); } }, pi("chevl", 16)),
    h("div", { style: { flex: 1, textAlign: "center" } },
      h("div", { class: "rowflex", style: { justifyContent: "center", gap: "7px" } },
        (() => { const c = pi("cal", 14); c.style.color = "var(--muted)"; return c; })(),
        h("span", { style: { fontWeight: 700, fontSize: "14px" } }, (isToday ? "วันนี้ · " + TODAY.dow + " " : "") + st.day + " มิ.ย."),
        !isToday && tag("ย้อนหลัง", { kind: "warn", iconName: "history" }),
      ),
    ),
    h("button", { type: "button", class: "hdr-icon", style: { width: "32px", height: "32px", opacity: isToday ? 0.35 : 1 }, disabled: isToday, "aria-label": "วันถัดไป", onClick: () => { st.day = Math.min(TODAY.d, st.day + 1); paint(root); } }, pi("chev", 16)),
  );
}

/* ---------- แถวรายการ (ต่างกันตามแท็บ) ---------- */
function itRow(it, root) {
  const tab = st.tab;
  const iconBtn = h("button", { type: "button", class: "ic-edit", style: { border: 0, background: "transparent", padding: 0, flex: "none", cursor: "pointer" }, "aria-label": "เปลี่ยนไอคอน", onClick: () => openEdit(it, root) }, itemIc(it, { sm: false }));
  const nameCell = h("span", { class: "entry-name", style: { flex: 1, minWidth: 0 } }, it.name,
    h("span", { style: { display: "block", fontSize: "10.5px", color: "var(--faint)" } }, unitOf(it) + " · ต้นทุน ฿" + fmt(it.cost || 0) + (it.spicy ? " · เผ็ด/ไม่เผ็ด" : "")));

  let ctrl;
  if (tab === "order" || tab === "recv") {
    const costIn = h("input", { type: "text", inputMode: "decimal", class: "md-cost-in tnum", value: it.cost != null ? String(it.cost) : "", placeholder: "0" });
    costIn.addEventListener("input", () => {
      const s = costIn.value.replace(/[^0-9.]/g, ""); if (s !== costIn.value) costIn.value = s;
      const live = itemById(it.id); if (live) live.cost = s === "" ? 0 : (parseFloat(s) || 0);
      persistData();
    });
    const unitSel = h("select", { "aria-label": "หน่วย" }, UNIT_CHOICES.map((u) => h("option", { value: u, selected: u === unitOf(it) }, u)));
    unitSel.addEventListener("change", () => { const live = itemById(it.id); if (live) { live.unit = unitSel.value; persistData(); logEdit({ txt: 'เปลี่ยนหน่วย "' + it.name + '" → ' + unitSel.value, by: role() }); bumpData(); } });
    ctrl = h("div", { class: "rowflex md-cost", style: { gap: "6px", flex: "none" } },
      h("span", { class: "md-cost-wrap" }, costIn, h("span", { class: "md-cost-baht" }, "฿")),
      h("span", { class: "unit-sel md-unit" }, unitSel, pi("chevd", 13)),
      h("button", { type: "button", class: "mini-btn", "aria-label": "แก้ไข", onClick: () => openEdit(it, root) }, pi("edit", 13)),
    );
  } else if (tab === "stock") {
    const qIn = h("input", { type: "text", inputMode: "decimal", class: "qty-in" + (qtyOf(it.id) ? " filled" : ""), value: qtyOf(it.id), placeholder: "0" });
    qIn.addEventListener("input", () => { const s = qIn.value.replace(/[^0-9.]/g, ""); if (s !== qIn.value) qIn.value = s; qIn.classList.toggle("filled", !!s); setQty(it.id, s); });
    ctrl = h("div", { class: "rowflex", style: { gap: "5px", flex: "none" } },
      qIn,
      h("span", { style: { fontSize: "11px", color: "var(--faint)", width: "26px" } }, unitOf(it)),
      h("button", { type: "button", class: "mini-btn", "aria-label": "แก้รายละเอียด", onClick: () => openEdit(it, root) }, pi("edit", 13)),
    );
  } else {
    ctrl = h("div", { class: "rowflex", style: { gap: "4px", flex: "none" } },
      h("button", { type: "button", class: "mini-btn", "aria-label": "เลื่อนขึ้น", onClick: () => moveItem(it.id, -1, root) }, pi("up", 13)),
      h("button", { type: "button", class: "mini-btn", "aria-label": "เลื่อนลง", onClick: () => moveItem(it.id, 1, root) }, pi("down", 13)),
      h("button", { type: "button", class: "mini-btn", "aria-label": "แก้ไข", onClick: () => openEdit(it, root) }, pi("edit", 13)),
    );
  }
  return h("div", { class: "entry-row", style: { gap: "7px" } }, iconBtn, nameCell, ctrl);
}

/* ---------- main paint ---------- */
function paint(root) {
  const ctx = st.ctx;
  const cur = MD_TABS.find((x) => x.v === st.tab);
  const scopeCats = cur.scope === "order" ? orderCats() : cats();
  const totalCount = scopeCats.reduce((n, c) => n + items().filter((i) => i.cat === c.id && i.isActive !== false).length, 0);
  const found = st.q ? items().filter((i) => i.isActive !== false && scopeCats.some((c) => c.id === i.cat) && i.name.toLowerCase().includes(st.q.toLowerCase())) : null;

  const tabsBar = h("div", { class: "md-tabs" },
    MD_TABS.map((x) => h("button", { type: "button", class: "md-tab" + (st.tab === x.v ? " on" : ""), onClick: () => { st.tab = x.v; st.q = ""; st.openCat = "protein"; paint(root); } }, pi(x.ic, 15), x.t)),
  );

  const scopeBar = h("div", { class: "md-scope", style: { "--c-bg": cur.tint.bg, "--c-border": cur.tint.bd, "--c-fg": cur.tint.fg } },
    h("span", { class: "md-scope-ic", style: { "--c-fg": cur.tint.fg } }, pi(cur.ic, 18)),
    h("span", { class: "md-scope-tt" }, h("b", null, "กำลังแก้: หน้า" + cur.t), h("span", null, MD_SCOPE_NOTE[st.tab])),
  );

  const showDate = st.tab === "stock" || st.tab === "count" || st.tab === "waste";

  let body;
  if (st.tab === "count" || st.tab === "waste") {
    const vals = st.tab === "count" ? st.countVals : st.wasteVals;
    const open = st.tab === "count" ? st.cOpen : st.wOpen;
    body = h("div", { class: "stack" },
      st.tab === "waste" && note(["กรอกเฉพาะรายการที่", bold("ทิ้ง/เสีย"), " · ใช้รายการ + ลำดับเดียวกับหน้าตรวจนับ"], { amber: true, iconName: "trash" }),
      entryList({
        vals, commit: (k, v) => { vals[k] = v; }, filter: "all", q: st.q, cats: cats(),
        open, toggleOpen: (id) => { open[id] = !(open[id] !== false); paint(root); },
      }),
    );
  } else if (found) {
    body = h("div", { class: "acc-card open" },
      h("div", { style: { padding: "4px 0 6px" } },
        found.map((it) => itRow(it, root)),
        !found.length && emptyState({ compact: true, iconName: "search", title: 'ไม่พบ "' + st.q + '"', sub: "ลองคำอื่น หรือเพิ่มรายการใหม่" }),
      ),
    );
  } else {
    body = h("div", { class: "stack" },
      scopeCats.map((c) => catCard(c, root)),
      st.tab !== "count" && st.tab !== "waste" && h("button", { type: "button", class: "btn btn-block", onClick: () => addCat(root) }, pi("plus", 15), "เพิ่มหมวดใหม่"),
    );
  }

  const searchEl = searchBox({ value: st.q, onChange: (v) => { st.q = v; st._refocus = true; paint(root); }, placeholder: "ค้นหาใน " + (found ? found.length : totalCount) + " รายการ…" });
  searchEl.dataset.search = "1";

  const content = h("div", { class: "page stack", style: { paddingBottom: "12px" } },
    tabsBar,
    scopeBar,
    showDate && dateBar(root),
    note([bold("เพิ่ม · ลบ · แก้ชื่อ/ราคา · เปลี่ยนไอคอน · สลับลำดับ · ย้ายหมวด"), " ได้หมดที่นี่ — แตะไอคอนหน้ารายการเพื่อเปลี่ยนรูป" + (st.tab === "stock" ? " · กรอกคงเหลือได้ทั้งวันนี้และย้อนหลัง" : "")], { iconName: "db" }),
    searchEl,
    body,
    note([h("span", null, "ทุกการแก้เก็บ "), bold("audit"), h("span", null, " (ใคร·เมื่อไหร่·แก้อะไร) — หน้าสั่ง/รับ/นับ/ทิ้ง/คงเหลือ/พยากรณ์ ใช้ชุดนี้ link ตามอัตโนมัติ")], { amber: true }),
  );

  root.replaceChildren(
    hdr({ title: "ข้อมูลกลาง", sub: "แหล่งข้อมูลเดียว · แก้ที่นี่ ทุกหน้าเปลี่ยนตาม", onBack: ctx.back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    content,
    root._sheets,
  );
  if (st._refocus) { st._refocus = false; const inp = root.querySelector('[data-search] input'); if (inp) { inp.focus(); const n = inp.value.length; inp.setSelectionRange(n, n); } }
  renderSheets(root);
}

/* ---------- การ์ดหมวด (accordion) ---------- */
function catCard(c, root) {
  const open = st.openCat === c.id;
  const list = orderedOf(c.id);
  const head = h("div", { class: "acc-head", style: { cursor: "default" } },
    h("button", { type: "button", class: "ic-edit", style: { border: 0, background: "transparent", padding: 0, flex: "none" }, "aria-label": "เปลี่ยนไอคอนหมวด", onClick: () => openCatEdit(c, root) }, catIc(c.id, { sm: true })),
    h("button", { type: "button", style: { border: 0, background: "transparent", padding: 0, display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0, textAlign: "left" }, onClick: () => { st.openCat = open ? null : c.id; paint(root); } },
      h("span", { style: { flex: 1, fontWeight: 700, fontSize: "14.5px" } }, c.name,
        h("span", { class: "tnum", style: { display: "block", fontWeight: 400, fontSize: "11px", color: "var(--faint)" } }, list.length + " รายการ" + (c.subs ? " · " + c.subs.length + " หมวดย่อย" : ""))),
    ),
    h("button", { type: "button", class: "mini-btn", "aria-label": "เลื่อนหมวดขึ้น", onClick: () => moveCat(c.id, -1) }, pi("up", 13)),
    h("button", { type: "button", class: "mini-btn", "aria-label": "เลื่อนหมวดลง", onClick: () => moveCat(c.id, 1) }, pi("down", 13)),
    h("button", { type: "button", class: "mini-btn", "aria-label": "แก้หมวด", onClick: () => openCatEdit(c, root) }, pi("edit", 13)),
    h("button", { type: "button", class: "acc-chev", style: { border: 0, background: "transparent", padding: 0 }, "aria-label": "เปิด/ปิด", onClick: () => { st.openCat = open ? null : c.id; paint(root); } }, pi("chevd", 16)),
  );

  let inner = null;
  if (open) {
    const rows = c.subs
      ? c.subs.map((sb) => {
        const subItems = list.filter((i) => i.sub === sb.id);
        return h("div", null,
          h("div", { class: "sub-head" }, h("span", { class: "sub-ic" }, pi(sb.icon, 13)), h("span", null, sb.name), h("i"), h("span", { class: "tnum", style: { fontSize: "10.5px", color: "var(--faint)" } }, String(subItems.length))),
          subItems.length
            ? subItems.map((it) => itRow(it, root))
            : h("p", { style: { fontSize: "12px", color: "var(--faint)", margin: 0, padding: "6px 14px 8px" } }, 'ยังไม่มีรายการ — กด "เพิ่มรายการ" แล้วเลือกหมวดย่อยนี้'),
        );
      })
      : list.map((it) => itRow(it, root));
    inner = h("div", { style: { paddingBottom: "8px" } },
      rows,
      h("div", { class: "rowflex", style: { padding: "8px 14px 4px", gap: "8px" } },
        h("button", { type: "button", class: "btn btn-block", style: { fontSize: "12.5px", padding: "8px 10px" }, onClick: () => openAddItem(c, root) }, pi("plus", 14), "เพิ่มรายการใน" + c.name)),
    );
  }
  return h("div", { class: "acc-card" + (open ? " open" : "") }, head, inner);
}

/* ---------- เปิด sheet ---------- */
function openEdit(it, root) { st.edit = { ...it, cost: it.cost != null ? String(it.cost) : "", icon: itemIcon(it) }; renderSheets(root); }
function openAddItem(c, root) {
  st.edit = { new: true, id: "new-" + Date.now(), name: "", unit: c.unit === "—" ? "" : c.unit, cat: c.id, sub: c.subs ? c.subs[0].id : undefined, cost: "", icon: c.icon, spicy: false };
  renderSheets(root);
}
function openCatEdit(c, root) { st.catEdit = { ...c }; renderSheets(root); }
function addCat(root) {
  cats().push({ id: "cat-" + Date.now(), name: "หมวดใหม่", unit: "", icon: "box", tint: "green" });
  persistData(); logEdit({ txt: "เพิ่มหมวดใหม่", kind: "add", by: role() }); bumpData();
  st.ctx.toast("เพิ่มหมวดใหม่แล้ว — แตะ ✎ เพื่อตั้งชื่อ/ไอคอน");
}

/* ---------- บันทึก/ลบ ---------- */
function saveEdit(root) {
  const e = st.edit;
  const cost = e.cost === "" || e.cost == null ? 0 : (parseFloat(e.cost) || 0);
  if (e.new) {
    saveItem({ id: e.id, cat: e.cat, sub: e.sub, name: e.name, unit: e.unit, icon: e.icon, spicy: !!e.spicy, cost });
    logEdit({ txt: 'เพิ่มรายการ "' + e.name + '"', kind: "add", by: role() });
    st.ctx.toast('เพิ่ม "' + e.name + '" แล้ว — ขึ้นทุกหน้าทันที');
  } else {
    const live = itemById(e.id);
    if (live) Object.assign(live, { name: e.name, unit: e.unit, cost, cat: e.cat, sub: e.sub, icon: e.icon, spicy: !!e.spicy });
    persistData();
    logEdit({ txt: 'แก้รายการ "' + e.name + '"', by: role() });
    st.ctx.toast('บันทึก "' + e.name + '" แล้ว — อัปเดตทุกหน้าที่ link');
  }
  st.edit = null; bumpData();
}
function delItem(root) {
  // กันลบพลาด: ต้องใส่รหัสก่อน (9999)
  const e = st.edit;
  askPin(root, { title: 'ลบรายการ "' + e.name + '"', sub: "ใส่รหัสเพื่อยืนยันการลบ" }, () => {
    st.edit = null; st.pin = null;
    logEdit({ txt: 'ลบรายการ "' + e.name + '" (ซ่อนจากทุกหน้า)', kind: "del", by: role() });
    st.ctx.toast('ลบ "' + e.name + '" ออกจากทุกหน้าแล้ว · เก็บ audit');
    removeItem(e.id); // soft-delete + bumpData
  });
}
function saveCat(root) {
  const c = st.catEdit; const live = catById(c.id);
  if (live) Object.assign(live, { name: c.name, icon: c.icon });
  persistData(); logEdit({ txt: 'แก้หมวด "' + c.name + '"', by: role() });
  st.ctx.toast("แก้หมวดแล้ว — ทุกหน้าเปลี่ยนตาม"); st.catEdit = null; bumpData();
}
function delCat(root) {
  const c = st.catEdit;
  if (items().some((i) => i.cat === c.id && i.isActive !== false)) { st.ctx.toast('หมวด "' + c.name + '" ยังมีรายการอยู่ — ลบ/ย้ายรายการออกก่อน'); return; }
  askPin(root, { title: 'ลบหมวด "' + c.name + '"', sub: "ใส่รหัสเพื่อยืนยันการลบ" }, () => {
    const arr = cats(); const i = arr.findIndex((x) => x.id === c.id); if (i >= 0) arr.splice(i, 1);
    if (st.openCat === c.id) st.openCat = null;
    persistData(); logEdit({ txt: 'ลบหมวด "' + c.name + '"', kind: "del", by: role() });
    st.ctx.toast('ลบหมวด "' + c.name + '" แล้ว · เก็บ audit'); st.catEdit = null; st.pin = null; bumpData();
  });
}

// เปิด sheet ใส่รหัส (9999) ก่อนทำงานอันตราย เช่น ลบ
function askPin(root, { title, sub }, onOk) {
  st.pin = { title, sub, onOk };
  renderSheets(root);
}

/* ---------- sheets layer ---------- */
function renderSheets(root) {
  const layer = root._sheets;
  layer.replaceChildren();
  if (st.edit) layer.appendChild(sheet({ onClose: () => { st.edit = null; renderSheets(root); }, children: editBody(root) }));
  if (st.catEdit) layer.appendChild(sheet({ onClose: () => { st.catEdit = null; renderSheets(root); }, children: catBody(root) }));
  if (st.pin) layer.appendChild(sheet({
    onClose: () => { st.pin = null; renderSheets(root); },
    children: pinSheetBody({ title: st.pin.title, sub: st.pin.sub, onOk: st.pin.onOk, onCancel: () => { st.pin = null; renderSheets(root); } }),
  }));
}

function editBody(root) {
  const e = st.edit;
  const nameIn = h("input", { type: "text", class: "input", value: e.name, placeholder: "เช่น กะเพราหมู" });
  const unitIn = h("input", { type: "text", class: "input", value: e.unit || "", placeholder: "kg / ฟอง / แพ็ค" });
  const costIn = h("input", { type: "text", inputMode: "decimal", class: "input tnum", value: e.cost || "", placeholder: "0" });
  const saveBtn = h("button", { type: "button", class: "btn btn-primary btn-block", disabled: !e.name, style: { opacity: e.name ? 1 : 0.45 }, onClick: () => { if (st.edit.name) saveEdit(root); } }, pi("check", 16), "บันทึก");
  nameIn.addEventListener("input", () => { st.edit.name = nameIn.value; saveBtn.disabled = !st.edit.name; saveBtn.style.opacity = st.edit.name ? 1 : 0.45; });
  unitIn.addEventListener("input", () => { st.edit.unit = unitIn.value; });
  costIn.addEventListener("input", () => { const s = costIn.value.replace(/[^0-9.]/g, ""); if (s !== costIn.value) costIn.value = s; st.edit.cost = s; });
  setTimeout(() => nameIn.focus(), 30);

  const subs = catById(e.cat) && catById(e.cat).subs ? catById(e.cat).subs : [];
  return h("div", null,
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 14px" } }, e.new ? "เพิ่มรายการใหม่" : "แก้ไขรายการ"),
    h("div", { class: "stack" },
      h("label", { class: "field", style: { margin: 0 } }, h("span", { class: "field-label" }, "ชื่อรายการ"), nameIn),
      h("div", null, h("div", { class: "field-label", style: { marginBottom: "6px" } }, "รูป/ไอคอนของรายการ"),
        iconPicker({ value: e.icon, tint: itemTint(e), slotId: "icon-" + e.id, onChange: (n) => { st.edit.icon = n; renderSheets(root); } })),
      h("div", { class: "rowflex", style: { gap: "10px" } },
        h("label", { class: "field", style: { margin: 0, flex: 1 } }, h("span", { class: "field-label" }, "หน่วย"), unitIn),
        h("label", { class: "field", style: { margin: 0, flex: 1 } }, h("span", { class: "field-label" }, "ราคาต้นทุน ฿/หน่วย"), costIn),
      ),
      h("div", { class: "card split", style: { padding: "10px 14px" } },
        h("span", { style: { fontSize: "13.5px", fontWeight: 600 } }, "มีแบบ เผ็ด / ไม่เผ็ด"),
        toggle(!!e.spicy, (v) => { st.edit.spicy = v; renderSheets(root); }),
      ),
      h("div", null, h("div", { class: "field-label", style: { marginBottom: "6px" } }, "หมวด (ย้ายได้)"),
        h("div", { class: "rowflex", style: { flexWrap: "wrap", gap: "6px" } },
          cats().map((c) => h("button", { type: "button", class: "chip" + (e.cat === c.id ? " active" : ""), onClick: () => { st.edit.cat = c.id; st.edit.sub = c.subs ? c.subs[0].id : undefined; renderSheets(root); } }, pi(c.icon, 12), c.name)))),
      subs.length > 0 && h("div", null, h("div", { class: "field-label", style: { marginBottom: "6px" } }, "หมวดย่อย"),
        h("div", { class: "rowflex", style: { flexWrap: "wrap", gap: "6px" } },
          subs.map((s) => h("button", { type: "button", class: "chip" + (e.sub === s.id ? " active" : ""), onClick: () => { st.edit.sub = s.id; renderSheets(root); } }, pi(s.icon, 12), s.name)))),
      h("div", { class: "rowflex", style: { gap: "10px", marginTop: "4px" } },
        !e.new && h("button", { type: "button", class: "btn", style: { color: "var(--danger)" }, onClick: () => delItem(root) }, pi("trash", 15), "ลบ"),
        h("button", { type: "button", class: "btn btn-block", onClick: () => { st.edit = null; renderSheets(root); } }, "ยกเลิก"),
        saveBtn,
      ),
    ),
  );
}

function catBody(root) {
  const c = st.catEdit;
  const nameIn = h("input", { type: "text", class: "input", value: c.name });
  nameIn.addEventListener("input", () => { st.catEdit.name = nameIn.value; });
  return h("div", null,
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 14px" } }, "แก้ไขหมวด"),
    h("div", { class: "stack" },
      h("label", { class: "field", style: { margin: 0 } }, h("span", { class: "field-label" }, "ชื่อหมวด"), nameIn),
      h("div", null, h("div", { class: "field-label", style: { marginBottom: "6px" } }, "รูป/ไอคอนของหมวด"),
        iconPicker({ value: c.icon, tint: c.tint || "green", slotId: "icon-cat-" + c.id, onChange: (n) => { st.catEdit.icon = n; renderSheets(root); } })),
      note("หมวดที่ยังมีรายการอยู่ ลบไม่ได้ — ย้ายรายการออกก่อน"),
      h("div", { class: "rowflex", style: { gap: "10px" } },
        h("button", { type: "button", class: "btn", style: { color: "var(--danger)" }, onClick: () => delCat(root) }, pi("trash", 15), "ลบหมวด"),
        h("button", { type: "button", class: "btn btn-block", onClick: () => { st.catEdit = null; renderSheets(root); } }, "ยกเลิก"),
        h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => saveCat(root) }, pi("check", 16), "บันทึก"),
      ),
    ),
  );
}
