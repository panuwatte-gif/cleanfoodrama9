// ============================================================
// pages/stocklist.js — สินค้าคงเหลือ (พอร์ตจาก prototype2 StockScreen)
// ใช้ได้อีกกี่วัน · FIFO · แยก เผ็ด/ไม่เผ็ด · กรองของใกล้หมด · ตั้งเกณฑ์แจ้งเตือน
// ctx = { go, back, role, toast, shopCtx, low }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { searchBox, note, tag, itemIc, menuTabs, hdr, meter, toggle, qtyInput, emo } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { sectionsFor, stockOf, stockVariants, itemById, unitOf } from "../utils/formulas.js";
import { cats, items as allItems } from "../data/store.js";
import { STOCK_SEED } from "../data/seed.js";

const st = {
  lowOnly: false, top: "all", sub: "all", openItem: null, q: "",
  alertSheet: false, editStock: null, qty: {}, lineOn: true,
  thresh: Object.fromEntries(STOCK_SEED.map((s) => [s.id, String(Math.round(s.use * 2 * 10) / 10)])),
  ctx: null,
};

const bold = (t) => h("b", null, t);

export function stockListScreen(ctx) {
  st.ctx = ctx;
  if (ctx.low) st.lowOnly = true;
  st.editStock = null; st.alertSheet = false;
  const root = h("div", { class: "page-wrap", "data-screen-label": "stocklist", style: { display: "flex", flexDirection: "column", flex: 1 } });
  root._sheets = h("div");
  paint(root);
  return root;
}

function variantNode(root, it, v) {
  const u = unitOf(it);
  const isChild = v.tag === "hot" || v.tag === "mild";
  const isOpen = st.openItem === it.id + ":" + v.key;
  const dcol = v.st === "lo" ? "var(--danger)" : v.st === "mid" ? "var(--warning)" : "var(--primary-dark)";

  const detail = isOpen && h("div", { class: "stk-detail" },
    h("div", { class: "stk-line41" },
      pi("sun", 15),
      h("div", null, "เหลือ ", bold(v.qty + " " + u), " · แยกเป็น ", bold(v.lots.length + " ล็อต (FIFO)"), " · ใช้ได้อีกประมาณ ", bold(v.days + " วัน"), " ", h("span", { style: { color: "var(--muted)" } }, "(ขายเฉลี่ย " + v.use + " " + u + "/วัน)")),
    ),
    h("div", { style: { margin: "8px 0 4px" } }, meter(Math.min(100, v.days / 7 * 100), v.st === "lo" ? "lo" : v.st === "mid" ? "warn" : "")),
    h("div", { class: "overline", style: { marginTop: "10px" } }, "FIFO ละเอียด · ตอนนี้มี " + v.qty + " " + u),
    h("div", { class: "stk-fifo" },
      v.lots.map((l) => h("div", { class: "stk-lot" },
        h("span", { class: "stk-lot-bar", style: { background: l.age >= 3 ? "var(--danger)" : l.age >= 2 ? "var(--warning)" : "var(--primary)" } }),
        h("span", { class: "stk-lot-age" }, "อยู่มา ", h("b", { class: "tnum" }, String(l.age)), " วัน"),
        h("span", { style: { flex: 1, fontSize: "10.5px", color: "var(--faint)" } }, l.d + (l.age >= 2 ? " · ใช้ก่อน" : " · สดใหม่")),
        h("span", { class: "tnum", style: { fontWeight: 800, fontSize: "14px" } }, l.qty + " " + u),
      )),
      !v.lots.length && h("div", { style: { fontSize: "12px", color: "var(--faint)", padding: "4px 2px" } }, "ไม่มีล็อตคงเหลือ"),
    ),
    !isChild && h("div", { class: "rowflex", style: { gap: "8px", marginTop: "10px" } },
      h("button", { type: "button", class: "btn btn-block", style: { fontSize: "12.5px", padding: "8px" }, onClick: () => { st.editStock = { id: it.id }; if (st.qty[it.id] === undefined) st.qty[it.id] = String(stockOf(it.id).qty); renderSheets(root); } }, pi("edit", 14), "แก้คงเหลือ"),
      h("button", { type: "button", class: "btn btn-soft btn-block", style: { fontSize: "12.5px", padding: "8px" }, onClick: () => st.ctx.go({ name: "forecast" }) }, pi("trend", 14), "ดูพยากรณ์"),
    ),
  );

  return h("div", { class: "stk-item" + (isOpen ? " open" : "") + (isChild ? " stk-child" : "") },
    h("div", { class: "stk-head" },
      h("button", { type: "button", class: "stk-main list-press", onClick: () => { st.openItem = isOpen ? null : it.id + ":" + v.key; paint(root); } },
        isChild
          ? h("span", { class: "stk-spice " + v.tag }, pi(v.tag === "hot" ? "flame" : "snow", 15))
          : itemIc(it, { sm: false }),
        h("div", { style: { flex: 1, minWidth: 0 } },
          h("div", { style: { fontWeight: 700, fontSize: (isChild ? 13 : 14) + "px" } }, v.label),
          h("div", { class: "rowflex", style: { gap: "5px", marginTop: "3px", flexWrap: "wrap" } },
            h("span", { class: "tnum", style: { fontSize: "11px", color: "var(--muted)" } }, "เหลือ " + v.qty + " " + u),
            h("span", { class: "badge", style: { background: "var(--bg)", border: "1px solid var(--border-soft)", fontSize: "10.5px" } }, pi("box", 10), v.lots.length + " ล็อต"),
            v.st === "lo" && tag("ต่ำ", { kind: "dgr", iconName: "alert" }),
            v.st === "mid" && tag("ใกล้หมด", { kind: "warn" }),
          ),
        ),
      ),
      h("div", { style: { textAlign: "right", flex: "none", minWidth: "52px" } },
        h("div", { style: { fontSize: "9.5px", color: "var(--faint)", fontWeight: 600, lineHeight: 1.1 } }, "ใช้ได้อีก"),
        h("div", { class: "big-num", style: { fontSize: (isChild ? 17 : 20) + "px", color: dcol, lineHeight: 1.05 } }, String(v.days)),
        h("div", { style: { fontSize: "10px", color: "var(--faint)" } }, "วัน"),
      ),
      h("span", { class: "stk-chev" + (isOpen ? " on" : "") }, pi("chevd", 15)),
    ),
    detail,
  );
}

function paint(root) {
  const ctx = st.ctx;
  const storeName = ctx.shopCtx ? ctx.shopCtx.shop : "พระราม 9";
  const filter = st.top === "all" ? st.sub : st.top;
  const q = st.q, lowOnly = st.lowOnly;
  const lowCount = allItems().filter((it) => stockOf(it.id).st !== "ok").length;

  const sections = sectionsFor(cats()).map((sec) => {
    const list = sec.items.filter((it) => {
      const inf = stockOf(it.id);
      if (q && !it.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (lowOnly && inf.st === "ok") return false;
      return true;
    });
    return { ...sec, items: list };
  }).filter((sec) => sec.items.length && (filter === "all" || sec.id === filter));

  const bellBtn = h("button", { type: "button", class: "hdr-icon line-icon", "aria-label": "ตั้งเกณฑ์แจ้งเตือน", onClick: () => { st.alertSheet = true; renderSheets(root); } }, pi("bell", 18), h("i", { class: "dot" }));

  const content = h("div", { class: "page stack" },
    searchBox({ value: q, onChange: (v) => { st.q = v; paint(root); }, placeholder: "ค้นหาในสต๊อก…" }),
    h("div", { class: "rowflex", style: { gap: "8px", flexWrap: "wrap" } },
      h("button", { type: "button", class: "chip" + (lowOnly ? " active" : ""), style: { flex: "none" }, onClick: () => { st.lowOnly = !st.lowOnly; paint(root); } }, pi("alert", 12), "ใกล้หมด" + (lowCount ? " " + lowCount : "")),
      h("span", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "แบ่งหมวด · tab เหมือนหน้าตรวจนับ"),
    ),
    menuTabs({ cats: cats(), top: st.top, sub: st.sub, onTop: (id) => { st.q = ""; st.top = id; st.sub = "all"; paint(root); }, onSub: (id) => { st.q = ""; st.sub = id; paint(root); } }),

    h("button", { type: "button", class: "card list-press split", style: { width: "100%", padding: "11px 14px", textAlign: "left" }, onClick: () => { st.alertSheet = true; renderSheets(root); } },
      h("div", { class: "rowflex" },
        h("span", { class: "catic blue sm" }, pi("bell", 15)),
        h("div", { style: { minWidth: 0 } },
          h("div", { style: { fontSize: "13.5px", fontWeight: 700 } }, "เกณฑ์แจ้งเตือนของต่ำ (LINE)"),
          h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "ของถึงเกณฑ์ → bot เตือนในกลุ่มร้าน · ตั้งได้ทุกรายการ"),
        ),
      ),
      tag(st.lineOn ? "เปิด" : "ปิด", { kind: st.lineOn ? "ok" : "warn", iconName: st.lineOn ? "check" : "bell" }),
    ),

    note(["ข้อมูลชุดเดียวกับ", bold("หน้าแรก → ตรวจนับสินค้าคงเหลือ"), " · แตะรายการเพื่อดู ", bold("ใช้ได้อีกกี่วัน"), " + ", bold("FIFO ละเอียด"), " (กี่วัน-กี่กิโล)"], { iconName: "scale" }),

    sections.map((sec) => h("div", { class: "ent2-card tint-" + sec.tint + " open" },
      h("div", { class: "ent2-cat", style: { cursor: "default" } },
        h("span", { class: "ent2-cat-ic" }, emo(sec.icon, { s: 20 })),
        h("span", { class: "ent2-cat-name" }, sec.name),
        h("span", { class: "ent2-count" }, sec.items.length + " รายการ"),
      ),
      h("div", { class: "ent2-body", style: { padding: "2px 10px 8px" } },
        sec.items.map((it) => h("div", { class: "stk-group" + (it.spicy ? " spicy" : "") },
          stockVariants(it.id, st.qty[it.id]).map((v) => variantNode(root, it, v)),
        )),
      ),
    )),
    !sections.length && h("p", { style: { fontSize: "13px", color: "var(--faint)", textAlign: "center", padding: "14px 0", margin: 0 } }, lowOnly ? "ไม่มีของใกล้หมดในหมวดนี้ 🎉" : "ไม่พบรายการ"),
  );

  root.replaceChildren(
    hdr({ title: "สินค้าคงเหลือ", sub: storeName + " · อัปเดต 18:40 เมื่อวาน", onBack: ctx.back, right: bellBtn }),
    content,
    root._sheets,
  );
  renderSheets(root);
}

function renderSheets(root) {
  const ctx = st.ctx;
  const layer = root._sheets;
  layer.replaceChildren();

  if (st.editStock) {
    const id = st.editStock.id;
    const it = itemById(id);
    layer.appendChild(sheet({
      onClose: () => { st.editStock = null; renderSheets(root); },
      children: h("div", null,
        h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 4px" } }, "แก้คงเหลือ"),
        h("p", { style: { fontSize: "12.5px", color: "var(--muted)", textAlign: "center", margin: "0 0 14px" } }, it.name),
        h("div", { class: "card" },
          h("div", { class: "split" },
            h("span", { style: { fontSize: "13px", color: "var(--muted)" } }, "คงเหลือจริง (" + unitOf(it) + ")"),
            qtyInput({ value: st.qty[id] || "", onChange: (v) => { st.qty[id] = v; }, wide: true }),
          ),
        ),
        note("ปรับยอดที่นี่จะเก็บ audit (ใคร·เมื่อไหร่) — ใช้ตอนนับเพิ่มระหว่างวัน"),
        h("div", { class: "rowflex", style: { gap: "10px", marginTop: "14px" } },
          h("button", { type: "button", class: "btn btn-block", onClick: () => { st.editStock = null; renderSheets(root); } }, "ยกเลิก"),
          h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => { st.editStock = null; ctx.toast("ปรับคงเหลือ " + it.name + " แล้ว"); paint(root); } }, pi("check", 16), "บันทึก"),
        ),
      ),
    }));
  }

  if (st.alertSheet) {
    layer.appendChild(sheet({
      onClose: () => { st.alertSheet = false; renderSheets(root); },
      children: h("div", null,
        h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 4px" } }, "เกณฑ์แจ้งเตือนของต่ำ"),
        h("p", { style: { fontSize: "12.5px", color: "var(--muted)", textAlign: "center", margin: "0 0 12px" } }, "ของถึงเกณฑ์ → bot เตือนในกลุ่ม LINE ร้าน"),
        h("div", { class: "card split", style: { padding: "11px 14px" } },
          h("span", { style: { fontSize: "13.5px", fontWeight: 600 } }, "ส่งแจ้งเตือนเข้ากลุ่ม LINE"),
          toggle(st.lineOn, (v) => { st.lineOn = v; renderSheets(root); }),
        ),
        h("div", { class: "overline", style: { margin: "12px 0 0" } }, "ตั้งเกณฑ์รายตัว (เหลือเท่าไหร่ถึงเตือน)"),
        h("div", { class: "card", style: { padding: "2px 14px", maxHeight: "260px", overflowY: "auto", marginTop: "6px" } },
          STOCK_SEED.map((s) => {
            const it = itemById(s.id);
            return h("div", { class: "rowflex", style: { padding: "9px 0", borderBottom: "1px solid var(--border-soft)" } },
              itemIc(it),
              h("span", { style: { flex: 1, fontSize: "13.5px" } }, it.name),
              qtyInput({ value: st.thresh[s.id] || "", onChange: (v) => { st.thresh[s.id] = v; } }),
              h("span", { style: { fontSize: "11.5px", color: "var(--faint)", width: "38px" } }, unitOf(it)),
            );
          }),
        ),
        note(['ค่ากลาง "เหลือใช้ได้กี่วันถึงเตือน" ตั้งได้ที่ ', bold("เพิ่มเติม → assumption"), " · ตรงนี้ปรับรายตัวทับค่ากลาง"], { amber: true }),
        h("button", { type: "button", class: "btn btn-primary btn-block", style: { marginTop: "12px" }, onClick: () => { st.alertSheet = false; ctx.toast("บันทึกเกณฑ์แจ้งเตือนแล้ว"); paint(root); } }, pi("check", 16), "บันทึกเกณฑ์"),
      ),
    }));
  }
}
