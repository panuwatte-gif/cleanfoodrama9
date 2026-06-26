// ============================================================
// pages/stockdetail.js — รายละเอียดสต๊อก + FIFO (พอร์ตจาก prototype2 StockDetailScreen)
// คงเหลือรวม · แยกของหายไป (เมื่อวาน − นับ + รับ) → ขายจริง · ล็อต FIFO (แก้/เพิ่ม/ลบ จริง)
// ctx = { go, back, role, toast, shopCtx, id, user }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { tag, meter, hdr, qtyInput, note } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { itemById, catById, subById, unitOf, fmt, stockOf } from "../utils/formulas.js";
import { inferDailySales } from "../utils/usage.js";
import { addLot, editLot, removeLot } from "../data/store.js";

const sdt = { id: null, ctx: null, sheet: null, val: "" };

export function stockDetailScreen(ctx) {
  sdt.ctx = ctx;
  sdt.id = ctx.id;
  sdt.sheet = null;
  const root = h("div", { class: "page-wrap", "data-screen-label": "stockdetail" });
  root._sheets = h("div");
  paint(root);
  return root;
}

const byName = () => (sdt.ctx.user ? sdt.ctx.user.name : (sdt.ctx.role === "owner" ? "เจ้าของ" : "พนักงาน"));

function paint(root) {
  const ctx = sdt.ctx;
  const s = stockOf(sdt.id);              // live stock (qty / use / lots) — fallback derive
  const it = itemById(sdt.id) || itemById(s.id);
  if (!it) { root.replaceChildren(hdr({ title: "ไม่พบรายการ", onBack: ctx.back })); return; }
  const c = catById(it.cat) || { name: "" };
  const u = unitOf(it);
  const subName = it.sub && subById(it.cat, it.sub) ? " · " + subById(it.cat, it.sub).name : "";
  const lots = s.lots || [];
  // ขายจริงจากผลนับล่าสุด (engine) — ไม่มีข้อมูล = empty ซื่อสัตย์
  const series = inferDailySales(sdt.id);
  const last = series.length ? series[series.length - 1] : null;
  const r2 = (n) => Math.round((n || 0) * 100) / 100;
  const shrinkBlock = last
    ? [
        h("div", { class: "split" },
          h("span", { class: "overline" }, "ผลนับ " + last.date.slice(5) + " · แยกของที่หายไป"),
          tag("ขายจริง", { kind: "ok", iconName: "scale" }),
        ),
        h("div", { class: "card" },
          h("div", { class: "split", style: { padding: "2px 0" } },
            h("span", { style: { fontSize: "13px", color: "var(--muted)" } }, "หายไปทั้งหมด ", h("span", { style: { fontSize: "11px", color: "var(--faint)" } }, "(เมื่อวาน + รับเข้า − วันนี้)")),
            h("span", { class: "tnum", style: { fontWeight: 700 } }, r2(last.prev + last.recv - last.count) + " " + u),
          ),
          h("div", { class: "split", style: { padding: "6px 0 2px" } },
            h("span", { style: { fontSize: "13px", color: "var(--muted)" } }, "− ทิ้ง / เสีย"),
            h("span", { class: "tnum", style: { fontWeight: 700, color: "var(--danger)" } }, last.waste + " " + u),
          ),
          h("div", { class: "hr" }),
          h("div", { class: "split" },
            h("span", { style: { fontWeight: 700, fontSize: "14px" } }, "= ขายออกจริง"),
            h("span", { class: "tnum", style: { fontWeight: 800, fontSize: "16px", color: "var(--primary-dark)" } }, last.sales + " " + u),
          ),
          ctx.role === "owner" && last.waste > 0 && h("div", { class: "split", style: { marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed var(--border)" } },
            h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ"),
            h("span", { class: "tnum", style: { fontSize: "12.5px", color: "var(--muted)" } }, "มูลค่าทิ้ง ≈ ฿" + fmt(Math.round(last.waste * (it.cost || 0))) + " · ต้นทุน ฿" + fmt(it.cost || 0) + "/" + u),
          ),
        ),
      ]
    : [
        h("div", { class: "split" },
          h("span", { class: "overline" }, "ขายจริงจากการนับ"),
          tag("ยังไม่มีข้อมูล", { kind: "fifo" }),
        ),
        h("div", { class: "card", style: { padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: "12.5px", lineHeight: 1.6 } },
          "นับสต๊อกรายการนี้ ", h("b", null, "2 วันติดกัน"), " ระบบจะคิด “ขายจริง = คงเหลือเมื่อวาน + รับเข้า − ของเสีย − คงเหลือวันนี้” ให้",
        ),
      ];

  root.replaceChildren(
    hdr({
      title: it.name, sub: c.name + subName, onBack: ctx.back,
      right: h("button", { type: "button", class: "hdr-icon", "aria-label": "แก้คงเหลือ", onClick: () => ctx.go({ name: "stocklist" }) }, pi("edit", 18)),
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
        h("div", { style: { marginTop: "12px" } }, meter(Math.min(100, s.qty / (Math.max(1, s.use) * 5) * 100))),
      ),

      // แยกของหายไป — จากข้อมูลการนับจริง (ไม่มี = empty)
      ...shrinkBlock,

      // ล็อต FIFO (จริง)
      h("div", { class: "split" },
        h("span", { class: "overline" }, "แยกตามล็อต (FIFO)"),
        h("button", { type: "button", class: "badge", style: { border: "1px solid var(--border)", background: "var(--surface)" }, onClick: () => { sdt.sheet = { mode: "add" }; sdt.val = ""; renderSheets(root); } }, pi("plus", 11), "เพิ่มล็อต"),
      ),
      h("div", { class: "card", style: { padding: "4px 16px" } },
        lots.length
          ? lots.map((l, i) => h("div", { class: "lot-row" },
              h("span", { class: "lot-bar", style: { background: l.age >= 2 ? "var(--warning)" : "var(--primary)" } }),
              h("div", { style: { flex: 1 } },
                h("div", { style: { fontWeight: 700, fontSize: "14px" } }, "รับเข้า " + (l.d || "—")),
                h("div", { style: { fontSize: "12px", color: "var(--muted)" } }, "ล็อต #" + (l.lot != null ? l.lot : i + 1) + " · " + ((l.age || 0) >= 2 ? "ใช้ก่อน" : "สดใหม่")),
              ),
              tag("อยู่มา " + (l.age || 0) + " วัน", { kind: "fifo" }),
              h("span", { class: "tnum", style: { fontWeight: 800, fontSize: "15px" } }, String(l.qty)),
              h("button", { type: "button", class: "mini-btn", "aria-label": "แก้ล็อต", onClick: () => { sdt.sheet = { mode: "edit", idx: i, lot: l }; sdt.val = String(l.qty); renderSheets(root); } }, pi("edit", 13)),
            ))
          : h("div", { style: { padding: "16px 0", textAlign: "center", color: "var(--faint)", fontSize: "12.5px" } }, "ยังไม่มีล็อต — กด “เพิ่มล็อต” เมื่อรับของเข้า"),
      ),

      h("div", { class: "rowflex", style: { gap: "10px" } },
        h("button", { type: "button", class: "btn btn-block", onClick: () => ctx.go({ name: "history" }) }, pi("edit", 16), "แก้ไขย้อนหลัง"),
        h("button", { type: "button", class: "btn btn-soft btn-block", onClick: () => ctx.go({ name: "forecast" }) }, pi("trend", 16), "ดูพยากรณ์"),
      ),
    ),
    root._sheets,
  );
  renderSheets(root);
}

function renderSheets(root) {
  const ctx = sdt.ctx;
  const layer = root._sheets;
  layer.replaceChildren();
  if (!sdt.sheet) return;

  const it = itemById(sdt.id) || {};
  const u = unitOf(it);
  const isAdd = sdt.sheet.mode === "add";
  const close = () => { sdt.sheet = null; renderSheets(root); };
  const qInput = qtyInput({ value: sdt.val, onChange: (v) => { sdt.val = v; }, wide: true });

  layer.appendChild(sheet({
    onClose: close,
    children: h("div", null,
      h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 4px" } }, isAdd ? "เพิ่มล็อตรับเข้า" : "แก้ล็อต #" + (sdt.sheet.lot.lot != null ? sdt.sheet.lot.lot : sdt.sheet.idx + 1)),
      h("p", { style: { fontSize: "12.5px", color: "var(--muted)", textAlign: "center", margin: "0 0 14px" } }, it.name),
      h("div", { class: "card split", style: { padding: "12px 14px" } },
        h("span", { style: { fontSize: "13px", color: "var(--muted)" } }, isAdd ? "จำนวนที่รับเข้า (" + u + ")" : "จำนวนคงเหลือในล็อต (" + u + ")"),
        qInput,
      ),
      note(isAdd ? "ล็อตใหม่นับเป็นของสดวันนี้ (อายุ 0 วัน) · คงเหลือรวมจะบวกเพิ่มให้" : "ตั้ง 0 = ลบล็อตนี้ออก · คงเหลือรวมคิดใหม่จากผลรวมล็อต · เก็บ audit"),
      h("div", { class: "rowflex", style: { gap: "10px", marginTop: "14px" } },
        !isAdd && h("button", { type: "button", class: "btn btn-block", style: { color: "var(--danger)" }, onClick: async () => { close(); await removeLot(sdt.id, sdt.sheet ? sdt.sheet.idx : 0, byName()); ctx.toast("ลบล็อตแล้ว · ปรับคงเหลือ"); paint(root); } }, pi("trash", 15), "ลบล็อต"),
        h("button", { type: "button", class: "btn btn-block", onClick: close }, "ยกเลิก"),
        h("button", { type: "button", class: "btn btn-primary btn-block", onClick: async () => {
          const v = Number(sdt.val || 0);
          const mode = sdt.sheet.mode, idx = sdt.sheet.idx;
          close();
          if (mode === "add") { if (v > 0) { await addLot(sdt.id, v, byName()); ctx.toast("เพิ่มล็อตแล้ว · เข้าสต๊อก"); } }
          else { await editLot(sdt.id, idx, v, byName()); ctx.toast("แก้ล็อตแล้ว · ปรับคงเหลือ"); }
          paint(root);
        } }, pi("check", 16), "บันทึก"),
      ),
    ),
  }));
}
