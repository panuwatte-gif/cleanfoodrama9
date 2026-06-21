// ============================================================
// pages/data.js — แท็บ "ข้อมูล" (hub) · ลิงก์ข้อมูลกลางชุดเดียว
//   • ระยะเวลาสินค้าคงเหลือ & อายุสินค้าเก่า (FIFO)  → stocklist
//   • โภชนาการและสารอาหาร                          → nutrition
//   • เมนู · ราคาขาย                                → menulist
//   • ข้อมูลรายรับ-รายจ่าย                           → money
// ctx = { go, role, toast, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag } from "../components/components.js";
import { storeChip } from "../components/layout.js";
import { cats, menus } from "../data/store.js";
import { catEmoji } from "../utils/formulas.js";
import { STOCK_SEED } from "../data/seed.js";

const bold = (t) => h("b", null, t);

// การ์ดลิงก์มาตรฐาน
function linkCard(root, { iconName, tintCls = "green", title, sub, soft, onClick, right, extra }) {
  const ic = pi(iconName, 18);
  return h("button", {
    type: "button", class: "card list-press" + (soft ? " soft-card soft-amber" : ""),
    style: { textAlign: "left", width: "100%" }, onClick,
  },
    h("div", { class: "rowflex" },
      h("span", { class: "catic " + tintCls }, ic),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { style: { fontWeight: 700, fontSize: "15px" } }, title),
        h("div", { style: { fontSize: "12.5px", color: "var(--muted)" } }, sub),
      ),
      right || (() => { const c = pi("chev", 18); c.style.color = "var(--faint)"; return c; })(),
    ),
    extra,
  );
}

export function dataScreen(ctx) {
  const { go, role, shopCtx } = ctx;
  const low = STOCK_SEED.filter((s) => s.st !== "ok").length;

  const catBadges = h("div", { class: "rowflex", style: { flexWrap: "wrap", gap: "6px", marginTop: "11px" } },
    cats().map((c) => {
      const em = catEmoji(c.id);
      return h("span", { class: "badge", style: { background: "var(--bg)", border: "1px solid var(--border-soft)" } },
        em ? h("span", { style: { fontSize: "12px" } }, em) : pi(c.icon, 12), c.name);
    }),
  );

  return h("div", { class: "page-wrap", "data-screen-label": "data" },
    hdr({ title: "ข้อมูล", sub: (shopCtx ? shopCtx.shop : "พระราม 9") + " · สต๊อก เมนู โภชนาการ — ชุดเดียวกับข้อมูลกลาง", right: shopCtx ? storeChip(shopCtx) : undefined }),
    h("div", { class: "page stack" },
      linkCard(null, {
        iconName: "box", tintCls: "fill",
        title: "ระยะเวลาสินค้าคงเหลือ & อายุสินค้าเก่า",
        sub: "ใช้ได้อีกกี่วัน · ล็อต FIFO (อายุของเก่า) · อัปเดต 18:40 เมื่อวาน",
        right: low ? tag("ต่ำ " + low, { kind: "dgr", iconName: "alert" }) : tag("ปกติ", { kind: "ok" }),
        onClick: () => go({ name: "stocklist" }),
        extra: catBadges,
      }),

      linkCard(null, {
        iconName: "leaf", tintCls: "green",
        title: "โภชนาการและสารอาหาร",
        sub: "พลังงาน/โปรตีน/คาร์บ/ไขมัน — ต่อเมนู และต่อวัตถุดิบ",
        onClick: () => go({ name: "nutrition" }),
      }),

      linkCard(null, {
        iconName: "tag", tintCls: "green",
        title: "เมนู · ราคาขาย",
        sub: menus().length + " เมนู · ราคาขาย − ส่วนลด = ราคาสุทธิ",
        onClick: () => go({ name: "menulist" }),
      }),

      linkCard(null, {
        iconName: "cal", tintCls: "amber", soft: true,
        title: "ข้อมูลรายรับ-รายจ่าย",
        sub: "ปฏิทินทั้งเดือน · แตะวันเพื่อแก้ — แก้ได้ทั้งวันนี้และย้อนหลัง",
        onClick: () => go({ name: "money" }),
      }),

      role !== "owner" && note(["การ", bold("เพิ่ม/ลบ/ย้ายหมวด"), "รายการ ทำได้ที่ \"ข้อมูลกลาง\" ฝั่ง", bold("เจ้าของ"), " — ที่นี่ดูและกรอกได้อย่างเดียว"], { iconName: "lock" }),
    ),
  );
}
