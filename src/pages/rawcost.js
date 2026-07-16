// ============================================================
// pages/rawcost.js — ต้นทุนวัตถุดิบ (ข้อมูลกลาง · เจ้าของ)
//   วัตถุดิบดิบแยกหมวด (เนื้อสัตว์ / ซอส) · การ์ดหลากสี · รูปต่อรายการ (webp)
//   ต้นทุนสุทธิ/กก. = ราคาซื้อ ÷ (yield/100) + ค่าส่ง + ค่าใช้จ่ายอื่น
//   เพิ่ม · ลบ · แก้ชื่อ/ตัวเลข · สลับลำดับ ได้ครบ (persist + audit)
// ctx = { back, toast, role }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note } from "../components/components.js";
import { items, persistData, saveItem, removeItem, bumpData } from "../data/store.js";
import { itemById, catById } from "../utils/formulas.js";
import { logEdit } from "../data/editlog.js";

const bold = (t) => h("b", null, t);
const rst = { ctx: null };

// ต้นทุนสุทธิ/กก.
export function netCostOf(it) {
  const buy = Number(it.cost) || 0;
  const y = Math.max(1, Number(it.yield) || 100);
  return buy / (y / 100) + (Number(it.ship) || 0) + (Number(it.other) || 0);
}
const money = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const rawItems = () => (items() || []).filter((it) => it.cat === "raw" && it.isActive !== false);
const inSub = (sub) => rawItems().filter((it) => (it.sub || null) === sub);

// จานสีการ์ด (วนตาม index) — ให้ตาไม่ลาย
const TINTS = [
  { bg: "#F1F8EE", bar: "#5FBE7D", ic: "#2E8C5A" },
  { bg: "#EEF5FF", bar: "#72A8E8", ic: "#3F73B8" },
  { bg: "#FFF6E9", bar: "#F4A64C", ic: "#B5781A" },
  { bg: "#F5EEFE", bar: "#AB90E2", ic: "#7E59C9" },
  { bg: "#FFEEF4", bar: "#F76CA0", ic: "#C8396A" },
  { bg: "#EAF8F5", bar: "#2BB3A3", ic: "#0F766E" },
];

function moveRaw(id, dir, root) {
  const arr = items(); const it = itemById(id);
  const peers = arr.filter((x) => x.cat === "raw" && (x.sub || "") === (it.sub || "") && x.isActive !== false);
  const pIdx = peers.findIndex((x) => x.id === id); const nIdx = pIdx + dir;
  if (nIdx < 0 || nIdx >= peers.length) return;
  const a = arr.indexOf(peers[pIdx]), b = arr.indexOf(peers[nIdx]);
  [arr[a], arr[b]] = [arr[b], arr[a]];
  persistData(); bumpData(); paint(root);
}
async function addRaw(sub, root) {
  const id = "rw-" + Date.now();
  await saveItem({ id, cat: "raw", sub, name: "วัตถุดิบใหม่", unit: "kg", spicy: false, cost: 0, yield: 100, ship: 0, other: 0, icon: sub === "rsauce" ? "drop" : "box" });
  logEdit({ txt: "เพิ่มวัตถุดิบใหม่", kind: "add", by: "เจ้าของ" });
  rst.ctx.toast("เพิ่มวัตถุดิบแล้ว — แก้ชื่อ/ราคาได้เลย"); paint(root);
}
async function delRaw(it, root) {
  await removeItem(it.id);
  logEdit({ txt: 'ลบวัตถุดิบ "' + it.name + '"', kind: "del", by: "เจ้าของ" });
  rst.ctx.toast('ลบ "' + it.name + '" แล้ว'); paint(root);
}

function numField(it, key, suffix, onChange) {
  const inp = h("input", { type: "text", inputMode: "decimal", class: "qty-in" + (it[key] != null && it[key] !== "" ? " filled" : ""), value: it[key] != null ? String(it[key]) : "", placeholder: "0", style: { width: "100%", textAlign: "center" } });
  inp.addEventListener("input", () => {
    const s = inp.value.replace(/[^0-9.]/g, ""); if (s !== inp.value) inp.value = s;
    inp.classList.toggle("filled", !!s);
    const live = itemById(it.id) || it;
    live[key] = s === "" ? (key === "yield" ? 100 : 0) : (parseFloat(s) || 0);
    persistData(); onChange();
  });
  return h("label", { class: "stack", style: { gap: "3px", flex: 1, minWidth: 0 } },
    h("span", { style: { fontSize: "10.5px", color: "var(--muted)", fontWeight: 600, textAlign: "center" } }, suffix), inp);
}

function itemCard(it, i, count, root) {
  const t = TINTS[i % TINTS.length];
  const netEl = h("span", { class: "tnum", style: { fontSize: "17px", fontWeight: 800, color: t.ic } }, "฿" + money(netCostOf(it)));
  const recompute = () => { netEl.textContent = "฿" + money(netCostOf(itemById(it.id) || it)); };
  const nameIn = h("input", { type: "text", class: "input", value: it.name || "", placeholder: "ชื่อวัตถุดิบ", style: { fontWeight: 700, fontSize: "14px", padding: "6px 9px", border: 0, background: "transparent" } });
  nameIn.addEventListener("input", () => { const live = itemById(it.id) || it; live.name = nameIn.value; persistData(); });
  nameIn.addEventListener("blur", () => { bumpData(); });
  // รูปวัตถุดิบ (image-slot → แปลง webp + persist อัตโนมัติ)
  const slot = h("image-slot", { id: "rawimg-" + it.id, shape: "rounded", radius: "12", placeholder: "รูป", style: { width: "50px", height: "50px", flex: "none", display: "block", border: "1px solid " + t.bar } });

  return h("div", { class: "card", style: { padding: "12px 14px", background: t.bg, borderLeft: "4px solid " + t.bar } },
    h("div", { class: "rowflex", style: { gap: "10px", alignItems: "center", marginBottom: "10px" } },
      slot,
      h("div", { style: { flex: 1, minWidth: 0 } },
        nameIn,
        h("div", { class: "rowflex", style: { gap: "2px", marginTop: "2px" } },
          h("button", { type: "button", class: "mini-btn", "aria-label": "เลื่อนขึ้น", style: { opacity: i === 0 ? 0.35 : 1 }, onClick: () => moveRaw(it.id, -1, root) }, pi("up", 13)),
          h("button", { type: "button", class: "mini-btn", "aria-label": "เลื่อนลง", style: { opacity: i === count - 1 ? 0.35 : 1 }, onClick: () => moveRaw(it.id, 1, root) }, pi("down", 13)),
          h("button", { type: "button", class: "mini-btn", "aria-label": "ลบ", style: { color: "var(--danger)" }, onClick: () => delRaw(it, root) }, pi("trash", 13)),
        ),
      ),
      h("span", { style: { textAlign: "right", flex: "none" } },
        h("span", { style: { display: "block", fontSize: "10px", color: "var(--faint)" } }, "สุทธิ ฿/กก."), netEl),
    ),
    h("div", { class: "rowflex", style: { gap: "7px", alignItems: "flex-end" } },
      numField(it, "cost", "ราคาซื้อ ฿", recompute),
      numField(it, "yield", "yield %", recompute),
      numField(it, "ship", "ค่าส่ง ฿", recompute),
      numField(it, "other", "อื่นๆ ฿", recompute),
    ),
  );
}

function paint(root) {
  const ctx = rst.ctx;
  const cat = catById("raw");
  const subs = (cat && cat.subs) || [{ id: null, name: "วัตถุดิบ" }];
  const list = rawItems();
  const meats = list.filter((it) => it.sub === "rmeat");
  const avgNet = meats.length ? meats.reduce((a, it) => a + netCostOf(it), 0) / meats.length : 0;

  const groups = subs.map((sb, gi) => {
    const rows = inSub(sb.id);
    const ov = ["ov-green", "ov-amber", "ov-blue", "ov-violet", "ov-rose"][gi % 5];
    return h("div", { class: "stack", style: { gap: "9px" } },
      h("div", { class: "overline " + ov }, sb.name || "วัตถุดิบ"),
      rows.map((it, i) => itemCard(it, i, rows.length, root)),
      h("button", { type: "button", class: "btn btn-block", style: { borderStyle: "dashed", color: "var(--muted)" }, onClick: () => addRaw(sb.id, root) }, pi("plus", 14), "เพิ่มใน " + (sb.name || "วัตถุดิบ")),
    );
  });

  root.replaceChildren(
    hdr({ title: "ต้นทุนวัตถุดิบ", sub: "ข้อมูลกลาง · เนื้อสัตว์ · ซอส (฿/กก.)", onBack: ctx.back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      note([bold("ต้นทุนสุทธิ"), " = ราคาซื้อ ÷ (yield%) + ค่าส่ง + อื่นๆ ต่อ ", bold("กิโล"), " · เพิ่ม/ลบ/แก้/สลับลำดับ + ใส่รูปได้ (แปลง webp อัตโนมัติ)"], { iconName: "db" }),
      meats.length ? h("div", { class: "card soft-card soft-green split", style: { padding: "12px 14px" } },
        h("div", null, h("div", { class: "overline" }, "เฉลี่ยต้นทุนเนื้อสัตว์ (สุทธิ)"), h("div", { class: "tnum", style: { fontSize: "20px", fontWeight: 800, color: "var(--primary-dark)" } }, "฿" + money(avgNet) + " /กก.")),
        h("span", { class: "catic fill", style: { width: "44px", height: "44px", borderRadius: "14px" } }, pi("db", 20))) : null,
      ...groups,
      note(["yield = ", bold("ส่วนใช้ได้จริง"), " หลังตัดแต่ง/ละลายน้ำแข็ง (เช่น กุ้ง 60% = ซื้อ 1 กก. ใช้ได้ 0.6) — ต้นทุนจริงจึงสูงกว่าราคาซื้อ"], { amber: true }),
    ),
  );
}

export function rawCostScreen(ctx) {
  rst.ctx = ctx;
  const root = h("div", { class: "page-wrap", "data-screen-label": "rawcost" });
  paint(root);
  return root;
}
