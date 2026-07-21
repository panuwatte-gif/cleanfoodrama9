// ============================================================
// pages/stocklist.js — สินค้าคงเหลือ (พอร์ตจาก prototype2 StockScreen)
// ใช้ได้อีกกี่วัน · FIFO · แยก เผ็ด/ไม่เผ็ด · กรองของใกล้หมด · ตั้งเกณฑ์แจ้งเตือน
// ctx = { go, back, role, toast, shopCtx, low }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { searchBox, note, tag, itemIc, menuTabs, hdr, meter, toggle, qtyInput, emo } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { sectionsFor, stockOf, stockVariants, itemById, unitOf, threshOf, proteinSubIds } from "../utils/formulas.js";
import { cats, items as allItems, stockRows, editStockQty, setStockThreshold, saveItem, removeItem, addItem, addCategory, saveCategory, removeCategory, moveCategory, moveItem } from "../data/store.js";

const st = {
  lowOnly: false, top: "all", sub: "all", openItem: null, q: "",
  alertSheet: false, editStock: null, qty: {}, lineOn: true,
  thresh: {}, manage: false,
  ctx: null,
};

const bold = (t) => h("b", null, t);

// ปุ่มจิ๋วในโหมดจัดการ
function mmini(label, fn, tone) {
  return h("button", { type: "button", style: { padding: "4px 9px", fontSize: "12px", fontWeight: 700, borderRadius: "8px", border: "1px solid var(--border-soft)", background: tone === "danger" ? "#FDECEC" : "var(--surface)", color: tone === "danger" ? "var(--danger)" : "var(--text)", cursor: "pointer", flex: "none" }, onClick: fn }, label);
}
// โหมดจัดการ: เพิ่ม/ลบ/แก้ชื่อ/สลับตำแหน่ง ทั้งรายการและหมวด
function manageChildren(root) {
  const ctx = st.ctx;
  const refresh = () => paint(root);
  const blocks = cats().map((c) => {
    const catItems = allItems().filter((it) => it.cat === c.id && it.isActive !== false);
    const itemRows = catItems.map((it) => h("div", { class: "rowflex", style: { gap: "5px", padding: "7px 0", borderTop: "1px solid var(--border-soft)" } },
      itemIc(it),
      h("span", { style: { flex: 1, minWidth: 0, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, it.name),
      mmini("▲", async () => { await moveItem(it.id, -1); refresh(); }),
      mmini("▼", async () => { await moveItem(it.id, 1); refresh(); }),
      mmini("แก้ชื่อ", async () => { const nm = prompt("แก้ชื่อรายการ", it.name); if (nm && nm.trim()) { await saveItem({ ...it, name: nm.trim() }); ctx.toast("แก้ชื่อแล้ว"); refresh(); } }),
      mmini("ลบ", async () => { if (confirm("ลบ \"" + it.name + "\" ?")) { await removeItem(it.id); ctx.toast("ลบรายการแล้ว"); refresh(); } }, "danger"),
    ));
    return h("div", { class: "card", style: { padding: "9px 13px", marginBottom: "10px" } },
      h("div", { class: "rowflex", style: { gap: "5px", paddingBottom: "8px", borderBottom: "2px solid var(--border-soft)" } },
        h("span", { class: "ent2-cat-ic" }, emo(c.icon || "box", { s: 18 })),
        h("span", { style: { flex: 1, minWidth: 0, fontWeight: 800, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, c.name),
        mmini("▲", async () => { await moveCategory(c.id, -1); refresh(); }),
        mmini("▼", async () => { await moveCategory(c.id, 1); refresh(); }),
        mmini("แก้ชื่อ", async () => { const nm = prompt("แก้ชื่อหมวด", c.name); if (nm && nm.trim()) { await saveCategory(c.id, { name: nm.trim() }); ctx.toast("แก้ชื่อหมวดแล้ว"); refresh(); } }),
        mmini("ลบ", async () => { const r = await removeCategory(c.id); ctx.toast(r.ok ? "ลบหมวดแล้ว" : r.reason); refresh(); }, "danger"),
      ),
      ...itemRows,
      h("button", { type: "button", class: "chip", style: { marginTop: "9px" }, onClick: async () => { const nm = prompt("ชื่อรายการใหม่ในหมวด " + c.name); if (nm && nm.trim()) { await addItem({ name: nm.trim(), cat: c.id }); ctx.toast("เพิ่มรายการแล้ว"); refresh(); } } }, pi("plus", 12), "เพิ่มรายการ"),
    );
  });
  return [
    h("div", { class: "rowflex", style: { gap: "8px", marginBottom: "2px" } },
      h("button", { type: "button", class: "chip active", onClick: () => { st.manage = false; paint(root); } }, pi("chevl", 13), "เสร็จ / กลับ"),
      h("span", { style: { flex: 1, fontWeight: 800, fontSize: "15px" } }, "จัดการรายการ & หมวด"),
    ),
    note(["เพิ่ม/ลบ/แก้ชื่อ/สลับตำแหน่ง ", bold("รายการและหมวด"), " — มีผลทั้งแอป (ตรวจนับ · เตรียมของ · รายงาน)"], { iconName: "edit" }),
    ...blocks,
    h("button", { type: "button", class: "btn btn-primary btn-block", style: { marginTop: "4px" }, onClick: async () => { const nm = prompt("ชื่อหมวดใหม่"); if (nm && nm.trim()) { await addCategory(nm.trim()); ctx.toast("เพิ่มหมวดแล้ว"); paint(root); } } }, pi("plus", 16), "เพิ่มหมวดใหม่"),
  ];
}

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
  // จำกัดไม่ให้ over (เกิน 30 วัน → "30+")
  const dDisp = (v.days != null && v.days > 30) ? "30+" : String(v.days);

  const detail = isOpen && h("div", { class: "stk-detail" },
    h("div", { class: "stk-line41" },
      pi("sun", 15),
      h("div", null, "เหลือ ", bold(v.qty + " " + u), " · แยกเป็น ", bold(v.lots.length + " ล็อต (FIFO)"), " · ใช้ได้อีกประมาณ ", bold(dDisp + " วัน"), " ", h("span", { style: { color: "var(--muted)" } }, "(ขายเฉลี่ย " + v.use + " " + u + "/วัน)")),
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
        h("div", { class: "big-num", style: { fontSize: (isChild ? 17 : 20) + "px", color: dcol, lineHeight: 1.05 } }, dDisp),
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
  const filter = st.top === "all" ? "all" : st.top === "protein" ? (st.sub === "all" ? "protein" : st.sub) : st.top;
  const q = st.q, lowOnly = st.lowOnly;
  const lowCount = allItems().filter((it) => stockOf(it.id).st !== "ok").length;
  const psub = proteinSubIds(cats());

  const sections = sectionsFor(cats()).map((sec) => {
    const list = sec.items.filter((it) => {
      const inf = stockOf(it.id);
      if (q && !it.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (lowOnly && inf.st === "ok") return false;
      return true;
    });
    return { ...sec, items: list };
  }).filter((sec) => sec.items.length && (filter === "all" || sec.id === filter || (filter === "protein" && psub.includes(sec.id))));

  const bellBtn = h("button", { type: "button", class: "hdr-icon line-icon", "aria-label": "ตั้งเกณฑ์แจ้งเตือน", onClick: () => { st.alertSheet = true; renderSheets(root); } }, pi("bell", 18), h("i", { class: "dot" }));

  const content = h("div", { class: "page stack" },
    searchBox({ value: q, onChange: (v) => { st.q = v; paint(root); }, placeholder: "ค้นหาในสต๊อก…" }),
    h("div", { class: "rowflex", style: { gap: "8px", flexWrap: "wrap" } },
      h("button", { type: "button", class: "chip" + (lowOnly ? " active" : ""), style: { flex: "none" }, onClick: () => { st.lowOnly = !st.lowOnly; paint(root); } }, pi("alert", 12), "ใกล้หมด" + (lowCount ? " " + lowCount : "")),
      h("span", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "แบ่งหมวด · tab เหมือนหน้าตรวจนับ"),
    ),
    menuTabs({ cats: cats(), top: st.top, sub: st.sub, onTop: (id) => { st.q = ""; st.top = id; st.sub = "all"; paint(root); }, onSub: (id) => { st.q = ""; st.sub = id; paint(root); } }),

    h("button", { type: "button", class: "card list-press split", style: { width: "100%", padding: "11px 14px", textAlign: "left" }, onClick: () => { st.manage = true; paint(root); } },
      h("div", { class: "rowflex" },
        h("span", { class: "catic violet sm" }, pi("edit", 15)),
        h("div", { style: { minWidth: 0 } },
          h("div", { style: { fontSize: "13.5px", fontWeight: 700 } }, "จัดการรายการ & หมวด"),
          h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "เพิ่ม · แก้ชื่อ · ลบ · สลับตำแหน่ง — ทั้งรายการและหมวด"),
        ),
      ),
      pi("chev", 16),
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

  if (st.manage) content.replaceChildren(...manageChildren(root));

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
          h("button", { type: "button", class: "btn btn-primary btn-block", onClick: async () => { const v = st.qty[id]; st.editStock = null; await editStockQty(id, Number(v || 0), ctx.user ? ctx.user.name : "เจ้าของ"); delete st.qty[id]; ctx.toast("ปรับคงเหลือ " + it.name + " แล้ว"); paint(root); } }, pi("check", 16), "บันทึก"),
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
          stockRows().map((s) => {
            const it = itemById(s.id);
            if (!it) return null;
            return h("div", { class: "rowflex", style: { padding: "9px 0", borderBottom: "1px solid var(--border-soft)" } },
              itemIc(it),
              h("span", { style: { flex: 1, fontSize: "13.5px" } }, it.name),
              qtyInput({ value: st.thresh[s.id] != null ? st.thresh[s.id] : String(threshOf(s.id)), onChange: (v) => { st.thresh[s.id] = v; } }),
              h("span", { style: { fontSize: "11.5px", color: "var(--faint)", width: "38px" } }, unitOf(it)),
            );
          }),
        ),
        note(['ค่ากลาง "เหลือใช้ได้กี่วันถึงเตือน" ตั้งได้ที่ ', bold("เพิ่มเติม → assumption"), " · ตรงนี้ปรับรายตัวทับค่ากลาง"], { amber: true }),
        h("button", { type: "button", class: "btn btn-primary btn-block", style: { marginTop: "12px" }, onClick: async () => { for (const [tid, v] of Object.entries(st.thresh)) { await setStockThreshold(tid, v); } st.alertSheet = false; ctx.toast("บันทึกเกณฑ์แจ้งเตือนแล้ว"); paint(root); } }, pi("check", 16), "บันทึกเกณฑ์"),
      ),
    }));
  }
}
