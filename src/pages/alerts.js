// ============================================================
// pages/alerts.js — ตั้งค่าแจ้งเตือนสต๊อกสินค้า (หน้า "ข้อมูล")
// แบ่งหมวดละเอียด (อาหาร › เนื้อ/หมู/เป็ด/ไก่/ปลา · ไข่ · เครื่องดื่ม · …)
// ทุกรายการ: ปริมาณคงเหลือ + ปุ่มเปิด/ปิดแจ้งเตือน + เกณฑ์ขั้นต่ำที่จะเตือน
// ctx = { back, role, toast, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { searchBox, note, tag, itemIc, menuTabs, hdr, toggle, qtyInput, emo } from "../components/components.js";
import { sectionsFor, stockOf, unitOf, threshOf, fmtQty, proteinSubIds } from "../utils/formulas.js";
import { cats, items as allItems, setStockThreshold, setStockAlert, alertOnOf } from "../data/store.js";

const bold = (t) => h("b", null, t);

// module state — คงข้ามการ re-render (thresh draft = ค่าเกณฑ์ที่กำลังแก้ ยังไม่กดบันทึก)
const st = { top: "all", sub: "all", q: "", lineOn: true, thresh: {}, ctx: null };

export function alertSettingsScreen(ctx) {
  st.ctx = ctx;
  const root = h("div", { class: "page-wrap", "data-screen-label": "alerts", style: { display: "flex", flexDirection: "column", flex: 1 } });
  paint(root);
  return root;
}

// แถวสินค้า 1 รายการ: คงเหลือ + toggle + ช่องเกณฑ์
function itemRow(root, it) {
  const inf = stockOf(it.id);
  const u = unitOf(it);
  const on = alertOnOf(it.id);
  const lo = inf.st === "lo", mid = inf.st === "mid";
  const statusTag = lo ? tag("ต่ำ", { kind: "dgr", iconName: "alert" })
    : mid ? tag("ใกล้หมด", { kind: "warn" })
    : tag("ปกติ", { kind: "ok" });

  const threshVal = st.thresh[it.id] != null ? st.thresh[it.id] : String(threshOf(it.id));
  const threshIn = qtyInput({ value: threshVal, onChange: (v) => { st.thresh[it.id] = v; } });
  const threshWrap = h("div", { class: "rowflex", style: { gap: "6px", opacity: on ? 1 : 0.4, pointerEvents: on ? "auto" : "none" } },
    h("span", { style: { fontSize: "11.5px", color: "var(--muted)", flex: "none" } }, "เตือน ≤"),
    threshIn,
    h("span", { style: { fontSize: "11px", color: "var(--faint)", flex: "none", width: "30px" } }, u),
  );

  return h("div", { class: "alert-row", style: { padding: "11px 4px", borderBottom: "1px solid var(--border-soft)" } },
    h("div", { class: "rowflex", style: { gap: "10px" } },
      itemIc(it, { sm: false }),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { style: { fontWeight: 700, fontSize: "13.5px" } }, it.name),
        h("div", { class: "rowflex", style: { gap: "6px", marginTop: "2px", flexWrap: "wrap" } },
          h("span", { class: "tnum", style: { fontSize: "11.5px", color: inf.qty > 0 ? "var(--muted)" : "var(--faint)" } }, "เหลือ " + fmtQty(inf.qty, u) + " " + u),
          statusTag,
        ),
      ),
      toggle(on, async (v) => { await setStockAlert(it.id, v); st.ctx.toast(v ? 'เปิดแจ้งเตือน "' + it.name + '"' : 'ปิดแจ้งเตือน "' + it.name + '"'); paint(root); }),
    ),
    h("div", { style: { marginTop: "8px", display: "flex", justifyContent: "flex-end" } }, threshWrap),
  );
}

function paint(root) {
  const ctx = st.ctx;
  const storeName = ctx.shopCtx ? ctx.shopCtx.shop : "พระราม 9";
  const filter = st.top === "all" ? "all" : st.top === "protein" ? (st.sub === "all" ? "protein" : st.sub) : st.top;
  const psub = proteinSubIds(cats());
  const q = st.q.toLowerCase();

  const totalOn = (allItems() || []).filter((it) => it.isActive !== false && alertOnOf(it.id)).length;
  const totalAll = (allItems() || []).filter((it) => it.isActive !== false).length;

  const sections = sectionsFor(cats()).map((sec) => ({
    ...sec,
    items: sec.items.filter((it) => it.isActive !== false && (!q || it.name.toLowerCase().includes(q))),
  })).filter((sec) => sec.items.length && (filter === "all" || sec.id === filter || (filter === "protein" && psub.includes(sec.id))));

  const sectionCards = sections.map((sec) => h("div", { class: "ent2-card tint-" + sec.tint + " open" },
    h("div", { class: "ent2-cat", style: { cursor: "default" } },
      h("span", { class: "ent2-cat-ic" }, emo(sec.icon, { s: 20 })),
      h("span", { class: "ent2-cat-name" }, sec.name),
      h("span", { class: "ent2-count" }, sec.items.length + " รายการ"),
    ),
    h("div", { class: "ent2-body", style: { padding: "2px 14px 6px" } }, sec.items.map((it) => itemRow(root, it))),
  ));

  const content = h("div", { class: "page stack", style: { paddingBottom: "12px" } },
    // เปิด/ปิดส่งเข้ากลุ่ม LINE (สวิตช์รวม)
    h("div", { class: "card split", style: { padding: "12px 14px" } },
      h("div", { class: "rowflex" },
        h("span", { class: "catic blue sm" }, pi("bell", 15)),
        h("div", { style: { minWidth: 0 } },
          h("div", { style: { fontSize: "13.5px", fontWeight: 700 } }, "ส่งแจ้งเตือนเข้ากลุ่ม LINE"),
          h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "ของถึงเกณฑ์ → บอทเตือนในกลุ่มร้านอัตโนมัติ"),
        ),
      ),
      toggle(st.lineOn, (v) => { st.lineOn = v; paint(root); }),
    ),
    note(["เปิด/ปิดแจ้งเตือนได้", bold("ทุกรายการ"), " · ตั้ง", bold("เกณฑ์ขั้นต่ำ"), " (เหลือเท่าไหร่ถึงเตือน) แยกรายตัว — กรอกเสร็จกด ", bold("บันทึกเกณฑ์"), " ด้านล่าง"], { iconName: "bell" }),
    searchBox({ value: st.q, onChange: (v) => { st.q = v; paint(root); }, placeholder: "ค้นหาสินค้า…" }),
    menuTabs({ cats: cats(), top: st.top, sub: st.sub, onTop: (id) => { st.q = ""; st.top = id; st.sub = "all"; paint(root); }, onSub: (id) => { st.q = ""; st.sub = id; paint(root); } }),
    sectionCards.length ? h("div", { class: "stack" }, sectionCards)
      : h("p", { style: { fontSize: "13px", color: "var(--faint)", textAlign: "center", padding: "16px 0", margin: 0 } }, "ไม่พบรายการ"),
    note(['ค่ากลาง "เหลือกี่วันถึงเตือน" ตั้งได้ที่ ', bold("เพิ่มเติม → ปรับค่า assumption"), " · ตรงนี้ปรับเกณฑ์เป็นจำนวนรายตัว ทับค่ากลาง"], { amber: true }),
  );

  const saveFoot = h("div", { class: "foot" },
    h("div", { style: { flex: 1 } },
      h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "เปิดแจ้งเตือน"),
      h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "14px" } }, totalOn + " / " + totalAll + " รายการ"),
    ),
    h("button", { type: "button", class: "btn btn-primary", onClick: async () => {
      const entries = Object.entries(st.thresh);
      for (const [tid, v] of entries) await setStockThreshold(tid, v);
      st.thresh = {};
      ctx.toast(entries.length ? "บันทึกเกณฑ์แจ้งเตือน " + entries.length + " รายการแล้ว" : "บันทึกเกณฑ์แล้ว");
      paint(root);
    } }, pi("check", 17), "บันทึกเกณฑ์"),
  );

  root.replaceChildren(
    hdr({ title: "ตั้งค่าแจ้งเตือนสต๊อกสินค้า", sub: storeName + " · เปิด/ปิด + เกณฑ์ขั้นต่ำ รายตัว", onBack: ctx.back, right: h("span", { class: "catic blue" }, pi("bell", 18)) }),
    content,
    saveFoot,
  );
}
