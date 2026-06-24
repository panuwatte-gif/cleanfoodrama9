// ============================================================
// pages/money.js — รายรับ-จ่าย รายเดือน (ปฏิทิน) · พอร์ตจาก prototype2 MoneyScreen
// แตะวัน → ดู/แก้ · ปุ่ม + รายได้ / + ค่าใช้จ่าย · ยอดสุทธิเดือน (เจ้าของ)
// ctx = { go, back, role, toast, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag, emptyState } from "../components/components.js";
import { storeChip } from "../components/layout.js";
import { fmt } from "../utils/formulas.js";
import { TODAY } from "../data/seed.js";
import { incomeRows, expenseRows } from "../data/store.js";

const bold = (t) => h("b", null, t);
const mst = { sel: TODAY.d, ctx: null };

export function moneyScreen(ctx) {
  mst.ctx = ctx;
  mst.sel = TODAY.d;
  const root = h("div", { class: "page-wrap", "data-screen-label": "money" });
  paint(root);
  return root;
}

function paint(root) {
  const { go, back, role, shopCtx } = mst.ctx;
  const sel = mst.sel;
  // รวมยอดจริงต่อวันจากที่บันทึก (income/expense) — ไม่มีข้อมูล = ว่างจริง
  const agg = {};
  for (const r of incomeRows()) { const d = r.day; (agg[d] || (agg[d] = { in: 0, ex: 0 })).in += (r.net != null ? r.net : (r.gross || 0)); }
  for (const r of expenseRows()) { const d = r.day; (agg[d] || (agg[d] = { in: 0, ex: 0 })).ex += (r.amount || 0); }
  const monthIn = Object.values(agg).reduce((s, x) => s + x.in, 0);
  const monthEx = Object.values(agg).reduce((s, x) => s + x.ex, 0);
  const net = monthIn - monthEx;
  const hasMonth = monthIn > 0 || monthEx > 0;
  const day = agg[sel];

  const calDays = [];
  for (let d = 1; d <= 30; d++) {
    const m = agg[d];
    const future = d > TODAY.d;
    const dots = h("span", { class: "cal-dots" },
      m && m.in > 0 && h("i", { class: "in", style: { background: "var(--primary)" } }),
      m && m.ex > 0 && h("i", { class: "ex", style: { background: "var(--warning)" } }),
    );
    calDays.push(h("button", {
      type: "button",
      class: "cal-day" + (sel === d ? " sel" : "") + (future ? " future" : ""),
      onClick: () => { if (!future) { mst.sel = d; paint(root); } },
    }, h("span", null, String(d)), dots));
  }

  const netCard = role !== "owner"
    ? note([bold("ยอดรวม/กำไรของเดือน"), " เห็นเฉพาะ", bold("เจ้าของ"), " — พนักงานบันทึกรายวันได้ตามปกติ"], { iconName: "lock" })
    : hasMonth
      ? h("div", { class: "card", style: { background: "radial-gradient(120% 140% at 100% 0%, rgba(22,163,74,0.10) 0%, transparent 55%), var(--surface)", borderColor: "var(--primary-soft)" } },
          h("div", { class: "split" }, h("span", { class: "overline" }, "ยอดสุทธิเดือนนี้"), tag(net >= 0 ? "กำไร" : "ขาดทุน", { kind: net >= 0 ? "ok" : "dgr" })),
          h("div", { class: "big-num", style: { fontSize: "28px", color: net >= 0 ? "var(--primary-dark)" : "var(--danger)", margin: "4px 0 10px" } }, (net >= 0 ? "+ ฿" : "− ฿") + fmt(Math.abs(net))),
          h("div", { class: "rowflex", style: { gap: "10px" } },
            h("div", { style: { flex: 1, textAlign: "center" } },
              h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "รายได้รวม"),
              h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "16px", color: "var(--primary-dark)" } }, "฿" + fmt(monthIn)),
            ),
            h("span", { class: "tnum", style: { color: "var(--faint)", fontSize: "16px" } }, "−"),
            h("div", { style: { flex: 1, textAlign: "center" } },
              h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "ค่าใช้จ่ายรวม"),
              h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "16px", color: "var(--warning-ink)" } }, "฿" + fmt(monthEx)),
            ),
          ),
        )
      : note(["ยังไม่มีบันทึกรายรับ-จ่ายเดือนนี้ — แตะ ", bold("+ รายได้"), " / ", bold("+ ค่าใช้จ่าย"), " เพื่อเริ่ม"], { iconName: "wallet" });

  const dayDetail = day
    ? [
        h("div", { class: "split", style: { padding: "3px 0" } },
          h("span", { style: { fontSize: "13.5px", color: "var(--muted)" } }, "ยอดขายสุทธิ (ทุกช่องทาง)"),
          h("span", { class: "tnum", style: { fontWeight: 700, color: "var(--primary-dark)" } }, "฿" + fmt(day.in)),
        ),
        h("div", { class: "split", style: { padding: "3px 0" } },
          h("span", { style: { fontSize: "13.5px", color: "var(--muted)" } }, "ค่าใช้จ่าย"),
          h("span", { class: "tnum", style: { fontWeight: 700, color: day.ex ? "var(--warning-ink)" : "var(--faint)" } }, day.ex ? "฿" + fmt(day.ex) : "—"),
        ),
      ]
    : [emptyState({ compact: true, iconName: "cal", title: "ยังไม่มีบันทึกของวันนี้", sub: "แตะ + รายได้ หรือ + ค่าใช้จ่าย ด้านบนเพื่อเริ่ม" })];

  root.replaceChildren(
    hdr({ title: "รายรับ-จ่าย", sub: "มิถุนายน 2569 · แตะวันเพื่อดู/แก้", onBack: back, right: storeChip(shopCtx) }),
    h("div", { class: "page stack" },
      h("div", { class: "rowflex", style: { gap: "10px" } },
        h("button", { type: "button", class: "btn btn-soft btn-block", onClick: () => go({ name: "income", day: sel }) }, pi("plus", 16), "รายได้"),
        h("button", { type: "button", class: "btn btn-block", onClick: () => go({ name: "expense", day: sel }) }, pi("plus", 16), "ค่าใช้จ่าย"),
      ),
      netCard,
      h("div", { class: "card", style: { padding: "14px" } },
        h("div", { class: "cal-grid", style: { marginBottom: "4px" } },
          ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((w) => h("div", { class: "cal-dow" }, w)),
        ),
        h("div", { class: "cal-grid" }, calDays),
        h("div", { class: "rowflex", style: { gap: "14px", marginTop: "10px", fontSize: "11.5px", color: "var(--muted)" } },
          h("span", { class: "rowflex", style: { gap: "5px" } }, h("i", { style: { width: "6px", height: "6px", borderRadius: "99px", background: "var(--primary)" } }), "รายได้"),
          h("span", { class: "rowflex", style: { gap: "5px" } }, h("i", { style: { width: "6px", height: "6px", borderRadius: "99px", background: "var(--warning)" } }), "ค่าใช้จ่าย"),
        ),
      ),
      h("div", { class: "card" },
        h("div", { class: "split" },
          h("span", { style: { fontWeight: 700, fontSize: "15px" } }, "วันที่ " + sel + " มิ.ย."),
          h("button", { type: "button", class: "badge", style: { border: "1px solid var(--border)", background: "var(--surface)" }, onClick: () => go({ name: "income", day: sel }) }, pi("edit", 11), "ดู / แก้วันนี้"),
        ),
        h("div", { class: "hr" }),
        ...dayDetail,
      ),
      note("แก้ย้อนหลังได้ทุกวันในเดือน — ทั้งรายได้และค่าใช้จ่าย ระบบคำนวณยอดเดือนใหม่ให้เอง"),
    ),
  );
}
