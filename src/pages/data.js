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
import { cats, menus, priceRows, items, alertOnOf } from "../data/store.js";
import { catEmoji, stockOf } from "../utils/formulas.js";
import { PEAK_DAILY, peakByHour } from "../data/peakhours.js";

const bold = (t) => h("b", null, t);

// การ์ดชั่วโมงพีค (Grab) — ยอดออเดอร์รายชั่วโมง + ทางเข้าหน้าวิเคราะห์เต็ม
function peakHourCard(go) {
  const hours = peakByHour();
  const max = Math.max(...hours, 1);
  const total = hours.reduce((a, b) => a + b, 0);
  const ranked = hours.map((v, i) => ({ i, v })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 3);
  const topSet = new Set(ranked.map((r) => r.i));
  const hh = (i) => String(i).padStart(2, "0") + ":00";
  const bars = h("div", { style: { display: "flex", alignItems: "flex-end", gap: "2px", height: "84px", padding: "4px 0" } },
    hours.map((v, i) => {
      const on = topSet.has(i);
      return h("div", { title: hh(i) + " · " + v + " ออเดอร์", style: { flex: 1, height: Math.max(2, v / max * 100) + "%", background: on ? "var(--primary)" : "var(--primary-soft, #CDE9D6)", borderRadius: "3px 3px 0 0", minWidth: 0 } });
    }),
  );
  const axis = h("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "9.5px", color: "var(--faint)", marginTop: "3px" } },
    ["00:00", "06:00", "12:00", "18:00", "23:00"].map((t) => h("span", null, t)));
  const topTxt = ranked.map((r) => hh(r.i) + " (" + r.v + ")").join(" · ");
  return h("button", { type: "button", class: "card list-press", style: { width: "100%", textAlign: "left", border: 0 }, onClick: () => go({ name: "salesanalytics" }) },
    h("div", { class: "rowflex", style: { marginBottom: "8px" } },
      h("span", { class: "catic amber" }, pi("trend", 18)),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { style: { fontWeight: 700, fontSize: "15px" } }, "วิเคราะห์การขาย · Grab"),
        h("div", { style: { fontSize: "12px", color: "var(--muted)" } }, "ขายดีรายวัน · รายชั่วโมง · เมนูขายดี — ข้อมูลจริง " + PEAK_DAILY.length + " วัน"),
      ),
      (() => { const c = pi("chev", 18); c.style.color = "var(--faint)"; return c; })(),
    ),
    bars, axis,
    h("div", { style: { display: "flex", alignItems: "center", gap: "6px", marginTop: "9px", paddingTop: "9px", borderTop: "1px solid var(--border-soft)", fontSize: "12px", color: "var(--muted)" } },
      pi("clock", 13), h("span", null, "ชั่วโมงพีค: "), bold(topTxt)),
  );
}

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
  const low = (items() || []).filter((it) => it.isActive !== false && stockOf(it.id).st !== "ok").length;
  const alertOn = (items() || []).filter((it) => it.isActive !== false && alertOnOf(it.id)).length;

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
      peakHourCard(go),
      linkCard(null, {
        iconName: "box", tintCls: "fill",
        title: "ระยะเวลาสินค้าคงเหลือ & อายุสินค้าเก่า",
        sub: "ใช้ได้อีกกี่วัน · ล็อต FIFO (อายุของเก่า) · อัปเดต 18:40 เมื่อวาน",
        right: low ? tag("ต่ำ " + low, { kind: "dgr", iconName: "alert" }) : tag("ปกติ", { kind: "ok" }),
        onClick: () => go({ name: "stocklist" }),
        extra: catBadges,
      }),

      linkCard(null, {
        iconName: "bell", tintCls: "blue",
        title: "ตั้งค่าแจ้งเตือนสต๊อกสินค้า",
        sub: "เปิด/ปิด + ตั้งเกณฑ์ขั้นต่ำ · แยกหมวด · ทุกรายการ",
        right: tag(alertOn + " เปิด", { kind: "ok", iconName: "bell" }),
        onClick: () => go({ name: "alerts" }),
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
        sub: priceRows().length + " รายการ · ตั้งขาย − ส่วนลด = สุทธิ",
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
