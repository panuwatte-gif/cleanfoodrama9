// ============================================================
// components/layout.js — bottom nav (5 ช่อง + ปุ่มกลาง FAB) + StoreChip
// พอร์ตจาก prototype2/ui.jsx NavBar + StoreChip
//   navBar({ active, role, onTab, onFab })
//   storeChip(ctx) — ctx = { shop, shops, setShop, addShop }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "./icons.js";

export function navBar({ active, role, onTab, onFab } = {}) {
  const owner = role === "owner";
  const tab = (id, ic, t) => h("button", {
    type: "button", class: "navtab" + (active === id ? " active" : ""), onClick: () => onTab(id),
  }, pi(ic, 21, active === id ? 2.2 : 2), h("span", { class: "lbl" }, t));

  return h("nav", { class: "nav cols-5" },
    tab("home", "home", "หน้าหลัก"),
    tab("data", "db", "ข้อมูล"),
    h("button", { type: "button", class: "nav-fab", "aria-label": "Dashboard และเอกสาร", onClick: onFab }, pi("trend", 24)),
    tab("reports", "doc", "รายงาน"),
    owner ? tab("more", "more", "เพิ่มเติม") : tab("account", "user", "บัญชี"),
  );
}

// ---- StoreChip (เลือกร้าน · เจ้าของแก้ชื่อร้านได้) ----
export function storeChip(ctx) {
  let open = false;
  let editing = null; // ชื่อร้านที่กำลังแก้ (เจ้าของ)
  const wrap = h("div", { class: "store-dd" });

  function close(e) { if (!wrap.contains(e.target)) { open = false; editing = null; document.removeEventListener("mousedown", close); render(); } }

  function render() {
    const name = ctx ? ctx.shop : "พระราม 9";
    const chip = h("button", {
      type: "button", class: "store-chip list-press" + (open ? " open" : ""),
      onClick: () => {
        if (!ctx) return;
        open = !open; editing = null;
        if (open) document.addEventListener("mousedown", close); else document.removeEventListener("mousedown", close);
        render();
      },
    }, pi("store", 13), h("span", { class: "store-chip-name" }, name),
      (() => { const c = pi("chevd", 12); c.classList.add("store-chip-chev"); return c; })());

    const canEdit = ctx && ctx.canEdit;

    // แถวแก้ชื่อ (อินไลน์)
    const renameRow = (s) => {
      const inp = h("input", { class: "store-rename-input", type: "text", value: s.name, maxlength: "24", "aria-label": "ชื่อร้าน" });
      const commit = () => { const ok = ctx.renameShop(s.name, inp.value); if (!ok) { inp.classList.add("err"); inp.focus(); } };
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") commit(); else if (e.key === "Escape") { editing = null; render(); } });
      setTimeout(() => { inp.focus(); inp.select(); }, 0);
      return h("div", { class: "store-rename-row" },
        inp,
        h("button", { type: "button", class: "store-rename-ok", "aria-label": "บันทึก", onClick: commit }, pi("check", 15)),
        ctx.shops.length > 1 && h("button", { type: "button", class: "store-rename-x", "aria-label": "ลบร้านนี้", style: { color: "var(--danger)" }, onClick: () => { ctx.removeShop(s.name); } }, pi("trash", 14)),
        h("button", { type: "button", class: "store-rename-x", "aria-label": "ยกเลิก", onClick: () => { editing = null; render(); } }, "✕"),
      );
    };

    // แถวรายการร้าน — ทุกร้านเลือกใช้งานได้ (เจ้าของลบร้านที่ไม่ใช้เองได้ที่ปุ่มแก้)
    const itemRow = (s) => h("div", { class: "store-menu-row" },
      h("button", {
        type: "button", role: "menuitem", class: "store-menu-item" + (ctx.shop === s.name ? " on" : ""),
        onClick: () => { ctx.setShop(s.name); open = false; document.removeEventListener("mousedown", close); render(); },
      },
        h("span", { class: "catic sm " + (ctx.shop === s.name ? "fill" : "green") }, pi("store", 15)),
        h("span", { style: { flex: 1, minWidth: 0 } },
          h("span", { style: { display: "block", fontWeight: 700, fontSize: "13.5px" } }, s.name),
          h("span", { style: { display: "block", fontSize: "11px", color: "var(--muted)" } }, "เปิดขายอยู่"),
        ),
        ctx.shop === s.name && (() => { const c = pi("check", 16); c.style.color = "var(--primary)"; return c; })(),
      ),
      canEdit && h("button", { type: "button", class: "store-edit-btn", "aria-label": "แก้ชื่อร้าน", onClick: () => { editing = s.name; render(); } }, pi("edit", 14)),
    );

    const menu = open && ctx && h("div", { class: "store-menu", role: "menu" },
      h("div", { class: "store-menu-head" }, canEdit ? "เลือก/แก้ชื่อร้าน" : "เลือกร้าน"),
      ctx.shops.map((s) => (editing === s.name ? renameRow(s) : itemRow(s))),
      h("button", { type: "button", class: "store-menu-add", onClick: () => { ctx.addShop(); render(); } }, pi("plus", 14), "เพิ่มร้านใหม่"),
    );

    wrap.replaceChildren(chip, menu || h("span", { style: { display: "none" } }));
  }
  render();
  return wrap;
}
