// ============================================================
// pages/money.js — รายรับ-จ่าย รายเดือน (ปฏิทินข้ามเดือน)
// แตะวัน → ดู/แก้ · ปุ่ม + รายได้ / + ค่าใช้จ่าย · ยอดสุทธิเดือน (เจ้าของ)
// ‹ › เลื่อนเดือน → แก้ข้อมูลย้อนหลังได้ทุกเดือน (ไม่จำกัด 1 เดือน)
// ctx = { go, back, role, toast, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag, emptyState } from "../components/components.js";
import { storeChip } from "../components/layout.js";
import { fmt } from "../utils/formulas.js";
import { TODAY_YMD } from "../data/seed.js";
import { incomeRows, expenseRows } from "../data/store.js";
import { recDate, parseIso, toIso, daysInMonth, firstDow, monthLabel, todayIso } from "../utils/dateutil.js";

const bold = (t) => h("b", null, t);
const mst = { y: TODAY_YMD.y, m: TODAY_YMD.m, sel: TODAY_YMD.d, ctx: null };

export function moneyScreen(ctx) {
  mst.ctx = ctx;
  mst.y = TODAY_YMD.y; mst.m = TODAY_YMD.m; mst.sel = TODAY_YMD.d;
  const root = h("div", { class: "page-wrap", "data-screen-label": "money" });
  paint(root);
  return root;
}

// เลื่อนเดือน (clamp วันเลือกไม่ให้เกินจำนวนวันของเดือนใหม่)
function shiftMonth(delta, root) {
  let m = mst.m + delta, y = mst.y;
  if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
  // ห้ามเลยเดือนปัจจุบัน (อนาคต)
  if (y > TODAY_YMD.y || (y === TODAY_YMD.y && m > TODAY_YMD.m)) return;
  mst.y = y; mst.m = m;
  mst.sel = Math.min(mst.sel, daysInMonth(y, m));
  paint(root);
}

function paint(root) {
  const { go, back, role, shopCtx } = mst.ctx;
  const { y, m } = mst;
  const selIso = toIso(y, m, mst.sel);
  const today = todayIso();
  const isCurMonth = (y === TODAY_YMD.y && m === TODAY_YMD.m);

  // รวมยอดจริงต่อวัน "ของเดือนที่กำลังดู" (income/expense ตาม field date) — ไม่มีข้อมูล = ว่าง
  const agg = {};
  for (const r of incomeRows()) { const dt = parseIso(recDate(r)); if (dt.y === y && dt.m === m) (agg[dt.d] || (agg[dt.d] = { in: 0, ex: 0 })).in += (r.net != null ? r.net : (r.gross || 0)); }
  for (const r of expenseRows()) { const dt = parseIso(recDate(r)); if (dt.y === y && dt.m === m) (agg[dt.d] || (agg[dt.d] = { in: 0, ex: 0 })).ex += (r.amount || 0); }
  const monthIn = Object.values(agg).reduce((s, x) => s + x.in, 0);
  const monthEx = Object.values(agg).reduce((s, x) => s + x.ex, 0);
  const net = monthIn - monthEx;
  const hasMonth = monthIn > 0 || monthEx > 0;
  const day = agg[mst.sel];

  // ปฏิทินจริง: ช่องว่างนำหน้าตามวันในสัปดาห์ (จันทร์ขึ้นต้น) + จำนวนวันของเดือน
  const dim = daysInMonth(y, m);
  const lead = (firstDow(y, m) + 6) % 7; // 0=จันทร์
  const calCells = [];
  for (let i = 0; i < lead; i++) calCells.push(h("div", { class: "cal-day", style: { visibility: "hidden" } }));
  for (let d = 1; d <= dim; d++) {
    const iso = toIso(y, m, d);
    const mm = agg[d];
    const future = iso > today;
    const dots = h("span", { class: "cal-dots" },
      mm && mm.in > 0 && h("i", { class: "in", style: { background: "var(--primary)" } }),
      mm && mm.ex > 0 && h("i", { class: "ex", style: { background: "var(--warning)" } }),
    );
    calCells.push(h("button", {
      type: "button",
      class: "cal-day" + (mst.sel === d ? " sel" : "") + (future ? " future" : ""),
      onClick: () => { if (!future) { mst.sel = d; paint(root); } },
    }, h("span", null, String(d)), dots));
  }

  const netCard = role !== "owner"
    ? note([bold("ยอดรวม/กำไรของเดือน"), " เห็นเฉพาะ", bold("เจ้าของ"), " — พนักงานบันทึกรายวันได้ตามปกติ"], { iconName: "lock" })
    : hasMonth
      ? h("div", { class: "card", style: { background: "radial-gradient(120% 140% at 100% 0%, rgba(22,163,74,0.10) 0%, transparent 55%), var(--surface)", borderColor: "var(--primary-soft)" } },
          h("div", { class: "split" }, h("span", { class: "overline" }, "ยอดสุทธิ · " + monthLabel(y, m)), tag(net >= 0 ? "กำไร" : "ขาดทุน", { kind: net >= 0 ? "ok" : "dgr" })),
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
      : note(["ยังไม่มีบันทึกรายรับ-จ่ายของ " + monthLabel(y, m) + " — แตะ ", bold("+ รายได้"), " / ", bold("+ ค่าใช้จ่าย"), " เพื่อเริ่ม"], { iconName: "wallet" });

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

  const prevBtn = h("button", { type: "button", class: "hdr-icon", style: { width: "32px", height: "32px" }, "aria-label": "เดือนก่อนหน้า", onClick: () => shiftMonth(-1, root) }, pi("chevl", 16));
  const nextBtn = h("button", { type: "button", class: "hdr-icon", disabled: isCurMonth, style: { width: "32px", height: "32px", opacity: isCurMonth ? .35 : 1 }, "aria-label": "เดือนถัดไป", onClick: () => shiftMonth(1, root) }, pi("chev", 16));

  root.replaceChildren(
    hdr({ title: "รายรับ-จ่าย", sub: "แตะวันเพื่อดู/แก้ · ‹ › เลื่อนเดือน — แก้ย้อนหลังได้ทุกเดือน", onBack: back, right: storeChip(shopCtx) }),
    h("div", { class: "page stack" },
      h("div", { class: "rowflex", style: { gap: "10px" } },
        h("button", { type: "button", class: "btn btn-soft btn-block", onClick: () => go({ name: "income", date: selIso }) }, pi("plus", 16), "รายได้"),
        h("button", { type: "button", class: "btn btn-block", onClick: () => go({ name: "expense", date: selIso }) }, pi("plus", 16), "ค่าใช้จ่าย"),
      ),
      netCard,
      h("div", { class: "card", style: { padding: "14px" } },
        h("div", { class: "split", style: { marginBottom: "8px" } },
          prevBtn,
          h("span", { style: { fontWeight: 800, fontSize: "15px" } }, monthLabel(y, m)),
          nextBtn,
        ),
        h("div", { class: "cal-grid", style: { marginBottom: "4px" } },
          ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((w) => h("div", { class: "cal-dow" }, w)),
        ),
        h("div", { class: "cal-grid" }, calCells),
        h("div", { class: "rowflex", style: { gap: "14px", marginTop: "10px", fontSize: "11.5px", color: "var(--muted)" } },
          h("span", { class: "rowflex", style: { gap: "5px" } }, h("i", { style: { width: "6px", height: "6px", borderRadius: "99px", background: "var(--primary)" } }), "รายได้"),
          h("span", { class: "rowflex", style: { gap: "5px" } }, h("i", { style: { width: "6px", height: "6px", borderRadius: "99px", background: "var(--warning)" } }), "ค่าใช้จ่าย"),
        ),
      ),
      h("div", { class: "card" },
        h("div", { class: "split" },
          h("span", { style: { fontWeight: 700, fontSize: "15px" } }, "วันที่ " + mst.sel + " " + monthLabel(y, m)),
          h("button", { type: "button", class: "badge", style: { border: "1px solid var(--border)", background: "var(--surface)" }, onClick: () => go({ name: "income", date: selIso }) }, pi("edit", 11), "ดู / แก้วันนี้"),
        ),
        h("div", { class: "hr" }),
        ...dayDetail,
      ),
      note("แก้ย้อนหลังได้ทุกวันทุกเดือน — ทั้งรายได้และค่าใช้จ่าย ระบบคำนวณยอดเดือนใหม่ให้เอง"),
    ),
  );
}
