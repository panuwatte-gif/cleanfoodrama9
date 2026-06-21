// ============================================================
// pages/stockdetail.js — รายละเอียดสต๊อก + FIFO (พอร์ตจาก prototype2 StockDetailScreen)
// คงเหลือรวม · แยกของหายไป (เมื่อวาน − นับ + รับ) → ขายจริง · ล็อต FIFO
// ctx = { go, back, role, toast, shopCtx, id }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { tag, meter, hdr } from "../components/components.js";
import { itemById, catById, subById, unitOf, fmt } from "../utils/formulas.js";
import { STOCK_SEED, SHRINK_DEMO } from "../data/seed.js";

export function stockDetailScreen(ctx) {
  const s = STOCK_SEED.find((x) => x.id === ctx.id) || STOCK_SEED[2];
  const it = itemById(s.id);
  const c = catById(it.cat);
  const u = unitOf(it);
  const sh = SHRINK_DEMO;
  const subName = it.sub && subById(it.cat, it.sub) ? " · " + subById(it.cat, it.sub).name : "";

  return h("div", { class: "page-wrap", "data-screen-label": "stockdetail" },
    hdr({
      title: it.name, sub: c.name + subName, onBack: ctx.back,
      right: h("button", { type: "button", class: "hdr-icon", "aria-label": "แก้รายการ", onClick: () => ctx.toast("เดโม — แก้ข้อมูลรายการ " + it.name) }, pi("edit", 18)),
    }),
    h("div", { class: "page stack" },
      // คงเหลือรวม
      h("div", { class: "card" },
        h("div", { class: "split" },
          h("div", null,
            h("div", { class: "overline" }, "คงเหลือรวม"),
            h("div", { class: "big-num", style: { fontSize: "30px" } }, String(s.qty), " ", h("span", { style: { fontSize: "14px", fontWeight: 600, color: "var(--muted)" } }, u)),
          ),
          h("div", { style: { textAlign: "right" } },
            it.spicy && tag("มีแบบเผ็ด", { kind: "dgr", iconName: "flame" }),
            h("div", { class: "tnum", style: { fontSize: "12px", color: "var(--muted)", marginTop: "6px" } }, "ใช้เฉลี่ย " + s.use + " " + u + "/วัน"),
          ),
        ),
        h("div", { style: { marginTop: "12px" } }, meter(Math.min(100, s.qty / (s.use * 5) * 100))),
      ),

      // แยกของหายไป
      h("div", { class: "split" },
        h("span", { class: "overline" }, "เมื่อวาน · แยกของที่หายไป"),
        tag("shrinkage", { kind: "warn", iconName: "alert" }),
      ),
      h("div", { class: "card" },
        h("div", { class: "split", style: { padding: "2px 0" } },
          h("span", { style: { fontSize: "13px", color: "var(--muted)" } }, "หายไปทั้งหมด ", h("span", { style: { fontSize: "11px", color: "var(--faint)" } }, "(เมื่อวาน − วันนี้ + รับเข้า)")),
          h("span", { class: "tnum", style: { fontWeight: 700 } }, sh.gone + " " + u),
        ),
        h("div", { class: "split", style: { padding: "6px 0 2px" } },
          h("span", { style: { fontSize: "13px", color: "var(--muted)" } }, "− ทิ้ง / เสีย / พนักงานทาน"),
          h("span", { class: "tnum", style: { fontWeight: 700, color: "var(--danger)" } }, sh.waste + " " + u),
        ),
        h("div", { class: "hr" }),
        h("div", { class: "split" },
          h("span", { style: { fontWeight: 700, fontSize: "14px" } }, "= ขายออกจริง"),
          h("span", { class: "tnum", style: { fontWeight: 800, fontSize: "16px", color: "var(--primary-dark)" } }, sh.sold + " " + u),
        ),
        ctx.role === "owner" && h("div", { class: "split", style: { marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed var(--border)" } },
          h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ"),
          h("span", { class: "tnum", style: { fontSize: "12.5px", color: "var(--muted)" } }, "มูลค่าทิ้ง ≈ ฿" + fmt(Math.round(sh.waste * it.cost)) + " · ต้นทุน ฿" + fmt(it.cost) + "/" + u),
        ),
      ),

      // ล็อต FIFO
      h("div", { class: "split" },
        h("span", { class: "overline" }, "แยกตามล็อต (FIFO)"),
        h("button", { type: "button", class: "badge", style: { border: "1px solid var(--border)", background: "var(--surface)" }, onClick: () => ctx.toast("เดโม — เพิ่มล็อตรับเข้า") }, pi("plus", 11), "ล็อต"),
      ),
      h("div", { class: "card", style: { padding: "4px 16px" } },
        s.lots.map((l) => h("div", { class: "lot-row" },
          h("span", { class: "lot-bar", style: { background: l.age >= 2 ? "var(--warning)" : "var(--primary)" } }),
          h("div", { style: { flex: 1 } },
            h("div", { style: { fontWeight: 700, fontSize: "14px" } }, "รับเข้า " + l.d),
            h("div", { style: { fontSize: "12px", color: "var(--muted)" } }, "ล็อต #" + l.lot + " · " + (l.age >= 2 ? "ใช้ก่อน" : "สดใหม่")),
          ),
          tag("อยู่มา " + l.age + " วัน", { kind: "fifo" }),
          h("span", { class: "tnum", style: { fontWeight: 800, fontSize: "15px" } }, String(l.qty)),
          h("button", { type: "button", class: "mini-btn", "aria-label": "แก้ล็อต", onClick: () => ctx.toast("เดโม — แก้ล็อต #" + l.lot) }, pi("edit", 13)),
        )),
      ),

      h("div", { class: "rowflex", style: { gap: "10px" } },
        h("button", { type: "button", class: "btn btn-block", onClick: () => ctx.go({ name: "history" }) }, pi("edit", 16), "แก้ไขย้อนหลัง"),
        h("button", { type: "button", class: "btn btn-soft btn-block", onClick: () => ctx.go({ name: "forecast" }) }, pi("trend", 16), "ดูพยากรณ์"),
      ),
    ),
  );
}
