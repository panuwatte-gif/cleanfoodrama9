// ============================================================
// pages/menulist.js — เมนู · ราคาขาย (อ่านจากข้อมูลกลาง MENUS)
//   ราคาขาย − ส่วนลด = ราคาสุทธิ · แตะ "แก้ที่ข้อมูลกลาง" (เจ้าของ)
// ctx = { go, back, role, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, searchBox, itemIc, emptyState } from "../components/components.js";
import { menus } from "../data/store.js";
import { fmt } from "../utils/formulas.js";

const bold = (t) => h("b", null, t);
const mst = { q: "", ctx: null };

function priceCell(lbl, val, col, strike) {
  return h("div", { style: { textAlign: "right", minWidth: "56px" } },
    h("div", { style: { fontSize: "10px", color: "var(--faint)" } }, lbl),
    h("div", { class: "tnum", style: { fontSize: "14px", fontWeight: 700, color: col || "var(--text)", textDecoration: strike ? "line-through" : "none" } }, val),
  );
}

function menuRow(m) {
  const net = (m.price || 0) - (m.disc || 0);
  return h("div", { class: "card split", style: { padding: "11px 14px" } },
    h("div", { class: "rowflex", style: { minWidth: 0, flex: 1 } },
      itemIc(m.item, { sm: false }),
      h("div", { style: { minWidth: 0 } },
        h("div", { style: { fontWeight: 700, fontSize: "14px" } }, m.name),
        m.disc ? h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, "ส่วนลด " + fmt(m.disc) + " ฿") : null,
      ),
    ),
    h("div", { class: "rowflex", style: { gap: "10px", flex: "none" } },
      m.disc ? priceCell("ราคา", fmt(m.price), "var(--muted)", true) : null,
      priceCell("สุทธิ", fmt(net) + " ฿", "var(--primary-dark)"),
    ),
  );
}

export function menuListScreen(ctx) {
  mst.ctx = ctx; mst.q = "";
  const root = h("div", { class: "page-wrap", "data-screen-label": "menulist" });
  paint(root);
  return root;
}

function paint(root) {
  const { back, go, role } = mst.ctx;
  const q = mst.q.toLowerCase();
  const list = menus().filter((m) => !q || m.name.toLowerCase().includes(q));
  const searchEl = searchBox({ value: mst.q, onChange: (v) => { mst.q = v; paint(root); }, placeholder: "ค้นหาเมนู…" });

  root.replaceChildren(
    hdr({ title: "เมนู · ราคาขาย", sub: menus().length + " เมนู · ราคาขาย − ส่วนลด = ราคาสุทธิ", onBack: back, right: h("span", { class: "catic green" }, pi("tag", 18)) }),
    h("div", { class: "page stack" },
      note(["ราคาดึงจาก ", bold("ข้อมูลกลาง"), " — แก้ราคา/ส่วนลด/เพิ่มเมนู ทำที่ฝั่ง", bold("เจ้าของ"), " แล้วทุกหน้าปรับตาม"], { iconName: "tag" }),
      searchEl,
      list.length ? h("div", { class: "stack" }, list.map(menuRow)) : emptyState({ compact: true, iconName: "search", title: 'ไม่พบ "' + mst.q + '"', sub: "ลองคำอื่น" }),
      role === "owner" && h("button", { type: "button", class: "btn btn-block", onClick: () => go({ name: "master" }) }, pi("db", 15), "ไปข้อมูลกลาง (แก้ราคา/เพิ่มเมนู)"),
    ),
  );

  if (mst.q) { const inp = searchEl.querySelector("input"); if (inp) { inp.focus(); const n = inp.value.length; inp.setSelectionRange(n, n); } }
}
