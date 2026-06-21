// ============================================================
// pages/reports.js — แท็บ "รายงาน" + จอรายงาน (พอร์ตจาก prototype2 screens-reports.jsx)
//   reportsScreen      — การ์ดรายงาน + ประจำวัน
//   incExpReportScreen — กราฟผสม รับ/จ่าย + สะสม + จุดคุ้มทุน
//   topSellersScreen / lowSellersScreen — อันดับขายดี/ขายน้อย + ขายตามวัน
//   stockReportScreen  — Inventory Analysis (ใช้ได้กี่วัน · มูลค่า · ขายจริง)
// ctx tab = { go, role, shopCtx } · ctx detail = { go, back, role, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag, meter, itemIc, emo } from "../components/components.js";
import { storeChip } from "../components/layout.js";
import { lineChart, comboChart } from "../components/charts.js";
import { fmt, itemById, stockOf, STOCK_DAYS, breakevenPerDay, SALES_CUM, DAILY_INEX } from "../utils/formulas.js";
import { items } from "../data/store.js";
import {
  MONEY, STOCK_SEED as STOCK, REV_TARGET_YEAR, COST_MODEL, TOP_FOOD, TOP_DRINK,
  DOW_SALES, BOTTOM_FOOD, BOTTOM_DRINK, INV_GROUPS, STOCKVAL_CUM, COUNT_RESULT,
} from "../data/seed.js";

const bold = (t) => h("b", null, t);
const lowCount = () => STOCK.filter((s) => s.st !== "ok").length;

/* ===================== แท็บรายงาน ===================== */
export function reportsScreen({ go, role, shopCtx } = {}) {
  const store = shopCtx ? shopCtx.shop : "พระราม 9";

  const card = (cls, ic, icTone, title, tagEl, body, footTxt, footTone, route) =>
    h("button", { type: "button", class: "card list-press soft-card " + cls, style: { textAlign: "left", width: "100%" }, onClick: () => go({ name: route }) },
      h("div", { class: "split" },
        h("div", { class: "rowflex" }, h("span", { class: "catic " + icTone + " sm" }, pi(ic, 15)), h("span", { style: { fontWeight: 700, fontSize: "14.5px" } }, title)),
        tagEl,
      ),
      body,
      h("div", { class: "split", style: { marginTop: "10px", fontSize: "12px", color: "var(--muted)" } },
        h("span", null, footTxt),
        h("span", { class: "rowflex", style: { gap: "4px", color: footTone || "var(--primary-dark)", fontWeight: 600 } }, "ดูรายงานเต็ม ", pi("chev", 13)),
      ),
    );

  // inventory mini-rows
  const invRows = STOCK_DAYS().slice(0, 4).map((s) => {
    const it = itemById(s.id);
    const lo = s.avg < 2;
    return h("div", { class: "rowflex", style: { gap: "8px" } },
      itemIc(it),
      h("span", { style: { fontSize: "12px", width: "104px", flex: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, it.name),
      meter(Math.min(100, s.avg / 7 * 100), lo ? "lo" : s.avg < 3 ? "warn" : ""),
      h("span", { class: "tnum", style: { fontSize: "11.5px", fontWeight: 700, width: "52px", textAlign: "right", color: lo ? "var(--danger)" : "var(--primary-dark)" } }, s.avg + " วัน"),
    );
  });

  const badge = (icName, txt) => h("span", { class: "badge", style: { background: "var(--surface)", border: "1px solid var(--border-soft)" } }, pi(icName, 12), txt);

  const dailyRows = [
    { ic: "chat", t: "ส่งเข้ากลุ่ม LINE", s: "เลือกหัวข้อที่จะส่ง · ระบบแต่งข้อความให้", tag: tag("รอส่ง", { kind: "warn" }), r: "linesend" },
    { ic: "history", t: "ประวัติ + แก้ย้อนหลัง", s: "ทุกการบันทึก · audit log ลบไม่ได้", r: "history" },
    { ic: "scale", t: "ความแม่นพยากรณ์ (back-test)", s: "ทาย vs จริง · error เฉลี่ย ±5.6%", r: "fchistory" },
  ].map((x) => {
    const chevEl = (() => { const c = pi("chev", 16); c.style.color = "var(--faint)"; return c; })();
    return h("button", { type: "button", class: "rowflex list-press", style: { width: "100%", border: 0, background: "transparent", textAlign: "left", padding: "12px 2px", borderBottom: "1px solid var(--border-soft)" }, onClick: () => go({ name: x.r }) },
      h("span", { class: "catic green sm" }, pi(x.ic, 15)),
      h("span", { style: { flex: 1, minWidth: 0 } },
        h("span", { style: { display: "block", fontWeight: 600, fontSize: "14.5px" } }, x.t),
        h("span", { style: { display: "block", fontSize: "12px", color: "var(--muted)" } }, x.s),
      ),
      x.tag || chevEl,
    );
  });

  return h("div", { class: "page-wrap", "data-screen-label": "reports" },
    hdr({ title: "รายงาน", sub: store + " · รายงานผลทั้งหมดอยู่ที่นี่", right: storeChip(shopCtx) }),
    h("div", { class: "page stack" },
      card("soft-green", "wallet", "green", "รายรับ - รายจ่าย",
        tag("สะสม ฿" + fmt(SALES_CUM[SALES_CUM.length - 1].v), { kind: "ok", iconName: "trend" }),
        h("div", { style: { marginTop: "12px" } }, lineChart(SALES_CUM.map((p) => ({ label: p.d, v: p.v })), { color: "var(--primary)" })),
        "ยอดขายสะสม · มิ.ย. 2569", null, "incexpreport"),
      card("soft-blue", "box", "blue", "Inventory Analysis",
        tag("ต่ำ " + lowCount(), { kind: "dgr", iconName: "alert" }),
        h("div", { class: "stack", style: { gap: "7px", marginTop: "12px" } }, invRows),
        "ใช้ได้อีกกี่วัน · แยกอาหาร/เครื่องดื่ม/บรรจุภัณฑ์", null, "stockreport"),
      card("soft-amber", "trend", "amber", "อันดับขายดี",
        tag("Top 5", { kind: "warn", iconName: "up" }),
        h("div", { class: "rowflex", style: { gap: "6px", flexWrap: "wrap", marginTop: "11px" } }, badge("pan", "อาหาร 5 อันดับ"), badge("cup2", "เครื่องดื่ม 5 อันดับ"), badge("cal", "ขายดีตามวัน จ–อา")),
        "เมนูขายดี · วันขายดีที่สุด", null, "topsellers"),
      card("soft-rose", "down", "rose", "ขายน้อย — ต้องดูแล",
        tag("Bottom 3", { kind: "dgr", iconName: "down" }),
        h("div", { class: "rowflex", style: { gap: "6px", flexWrap: "wrap", marginTop: "11px" } }, badge("pan", "อาหาร 3 อันดับ"), badge("cup2", "เครื่องดื่ม 3 อันดับ"), badge("cal", "ขายไม่ดีตามวัน")),
        "เมนูขายน้อย · วันที่เงียบ", "var(--danger-ink)", "lowsellers"),
      h("div", { class: "overline" }, "ประจำวัน"),
      h("div", { class: "card", style: { padding: "4px 16px" } }, dailyRows),
      role === "owner" && note([h("span", null, "รายงานเชิงลึกของเจ้าของ (สรุปผู้บริหาร · ภาษี · ต้นทุน) ย้ายไปอยู่แท็บ "), bold('"เพิ่มเติม"'), " แล้ว"], { iconName: "lock" }),
    ),
  );
}

/* ===================== รายรับ-รายจ่าย (สะสม) ===================== */
export function incExpReportScreen({ back, go } = {}) {
  const totalIn = MONEY.monthIncome, totalEx = MONEY.monthExpense;
  return h("div", { class: "page-wrap", "data-screen-label": "incexpreport" },
    hdr({ title: "รายรับ-รายจ่าย", sub: "กราฟผสม · สะสม · จุดคุ้มทุน", onBack: back, right: h("span", { class: "catic green" }, pi("wallet", 18)) }),
    h("div", { class: "page stack" },
      h("div", { class: "card" },
        h("div", { class: "split" },
          h("div", null, h("div", { class: "overline" }, "รายได้สะสม · มิ.ย. 2569"), h("div", { class: "big-num", style: { fontSize: "24px", color: "var(--primary-dark)", marginTop: "1px" } }, "฿" + fmt(SALES_CUM[SALES_CUM.length - 1].v))),
          h("div", { style: { textAlign: "right" } }, h("div", { class: "overline" }, "เป้า/ปี (VAT)"), h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "15px", color: "#7C3AED", marginTop: "2px" } }, "฿" + fmt(REV_TARGET_YEAR))),
        ),
        h("div", { style: { marginTop: "10px" } }, comboChart({ daily: DAILY_INEX, target: REV_TARGET_YEAR, breakeven: breakevenPerDay })),
        h("div", { class: "combo-legend" },
          h("span", null, h("i", { style: { background: "#8FD0A8" } }), "รายรับ/วัน"),
          h("span", null, h("i", { style: { background: "#F3B765" } }), "รายจ่าย/วัน"),
          h("span", { style: { color: "var(--primary)" } }, h("i", { style: { background: "currentColor" } }), "รายได้สะสม"),
          h("span", { style: { color: "#E11D48" } }, h("i", { class: "dash", style: { color: "currentColor" } }), "จุดคุ้มทุน ฿" + fmt(breakevenPerDay) + "/วัน"),
          h("span", { style: { color: "#7C3AED" } }, h("i", { class: "dash", style: { color: "currentColor" } }), "เป้า/ปี 1.8 ล้าน"),
        ),
      ),
      note([bold("เตือนภาษี:"), " รายได้สะสมแตะเส้นประ ", bold("1.8 ล้าน/ปี"), " เมื่อไหร่ = ถึงเกณฑ์ ", bold("ต้องจด VAT"), " · จุดคุ้มทุนคิดจาก fixed cost (เช่า · ค่าแรง · ไฟ-น้ำ) + variable " + Math.round(COST_MODEL.varRatio * 100) + "%"], { amber: true }),
      h("div", { class: "rowflex", style: { gap: "10px" } },
        h("div", { class: "card", style: { flex: 1, textAlign: "center" } }, h("div", { class: "overline" }, "รายได้รวม"), h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "18px", color: "var(--primary-dark)", marginTop: "3px" } }, "฿" + fmt(totalIn))),
        h("div", { class: "card", style: { flex: 1, textAlign: "center" } }, h("div", { class: "overline" }, "ค่าใช้จ่ายรวม"), h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "18px", color: "var(--warning-ink)", marginTop: "3px" } }, "฿" + fmt(totalEx))),
      ),
      h("button", { type: "button", class: "card list-press soft-card soft-amber split", style: { width: "100%", textAlign: "left" }, onClick: () => go({ name: "money" }) },
        h("div", { class: "rowflex" }, h("span", { class: "catic amber sm" }, pi("cal", 15)), h("div", null, h("div", { style: { fontWeight: 700, fontSize: "14px" } }, "แก้ไขรายวัน (ปฏิทิน)"), h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "ไปหน้าปฏิทิน · แก้ได้ทั้งวันนี้และย้อนหลัง"))),
        (() => { const c = pi("chev", 16); c.style.color = "var(--faint)"; return c; })(),
      ),
      note([h("span", null, "หน้านี้ดูรายงาน"), bold("สะสม"), " — แก้ตัวเลขรายวันที่ ", bold("ข้อมูล → ข้อมูลรายรับ-รายจ่าย"), " (ปฏิทิน)"]),
    ),
  );
}

/* ===================== อันดับขายดี / ขายน้อย ===================== */
function rankList(data, color, top) {
  const max = Math.max(...data.map((d) => d.qty));
  return h("div", { class: "card", style: { padding: "6px 16px 10px" } },
    data.map((d, i) => {
      const it = itemById(d.id);
      const no = top
        ? h("span", { class: "rank-no" }, String(i + 1))
        : h("span", { class: "rank-no", style: { background: "#FCE3E7", color: "#BE123C" } }, String(i + 1));
      return h("div", { class: "rank-row" + (top ? " top" + (i + 1) : "") },
        no, itemIc(it),
        h("div", { style: { flex: 1, minWidth: 0 } },
          h("div", { class: "rank-name" }, it ? it.name : d.id),
          h("div", { class: "rank-bar", style: { marginTop: "5px" } }, h("i", { style: { width: (d.qty / max * 100) + "%", background: color } })),
        ),
        h("div", { class: "rank-val" }, h("div", { class: "rank-qty" }, fmt(d.qty)), h("div", { class: "rank-rev" }, "฿" + fmt(d.rev))),
      );
    }),
  );
}

function dowBars(highlightCls, target) {
  const dowMax = Math.max(...DOW_SALES.map((d) => d.v));
  return h("div", { class: "dow-bars" },
    DOW_SALES.map((d) => h("div", { class: "col" + (d.d === target ? " " + highlightCls : "") },
      h("span", { class: "v" }, Math.round(d.v / 1000) + "k"),
      h("span", { class: "bar", style: { height: Math.max(6, d.v / dowMax * 86) + "px" } }),
      h("span", { class: "lbl" }, d.d.slice(0, 2)),
    )),
  );
}

export function topSellersScreen({ back } = {}) {
  const bestDow = DOW_SALES.reduce((a, b) => (b.v > a.v ? b : a)).d;
  return h("div", { class: "page-wrap", "data-screen-label": "topsellers" },
    hdr({ title: "อันดับขายดี", sub: "เมนูขายดี · วันขายดี · มิ.ย. 2569", onBack: back, right: h("span", { class: "catic amber" }, pi("trend", 18)) }),
    h("div", { class: "page stack" },
      h("div", { class: "split" }, h("span", { class: "overline" }, "5 อันดับขายดี · อาหาร"), tag("เฉพาะอาหาร", { kind: "ok", iconName: "pan" })),
      rankList(TOP_FOOD, "linear-gradient(90deg,#9FD37E,#54AE7B)", true),
      h("div", { class: "split", style: { marginTop: "4px" } }, h("span", { class: "overline" }, "5 อันดับขายดี · เครื่องดื่ม"), tag("เฉพาะเครื่องดื่ม", { kind: "fifo", iconName: "cup2" })),
      rankList(TOP_DRINK, "linear-gradient(90deg,#7CC6E8,#2563EB)", true),
      h("div", { class: "split", style: { marginTop: "4px" } }, h("span", { class: "overline" }, "ขายดีตามวัน · จันทร์–อาทิตย์"), tag("ดีสุด " + bestDow, { kind: "warn", iconName: "cal" })),
      h("div", { class: "card" }, dowBars("best", bestDow),
        note([bold("เสาร์–อาทิตย์"), " ขายดีสุด — เตรียมของ + คนให้พอ · จันทร์เบาสุด เหมาะทำความสะอาด/สต๊อก"], { iconName: "trend" })),
    ),
  );
}

export function lowSellersScreen({ back } = {}) {
  const worstDow = DOW_SALES.reduce((a, b) => (b.v < a.v ? b : a)).d;
  return h("div", { class: "page-wrap", "data-screen-label": "lowsellers" },
    hdr({ title: "ขายน้อย — ต้องดูแล", sub: "3 อันดับขายน้อย · วันเงียบ · มิ.ย. 2569", onBack: back, right: h("span", { class: "catic rose" }, pi("down", 18)) }),
    h("div", { class: "page stack" },
      note([h("span", null, "เมนูขายน้อยอาจ"), bold("จัดโปรกระตุ้น"), " หรือ", bold("ลดสต๊อก/ตัดเมนู"), " เพื่อไม่ให้ของค้างเสีย — วันเงียบเหมาะทำความสะอาด/เตรียมของล่วงหน้า"], { amber: true }),
      h("div", { class: "split" }, h("span", { class: "overline" }, "3 อันดับขายน้อย · อาหาร"), tag("เฉพาะอาหาร", { kind: "dgr", iconName: "pan" })),
      rankList(BOTTOM_FOOD, "linear-gradient(90deg,#FBC0C8,#EF4444)", false),
      h("div", { class: "split", style: { marginTop: "4px" } }, h("span", { class: "overline" }, "3 อันดับขายน้อย · เครื่องดื่ม"), tag("เฉพาะเครื่องดื่ม", { kind: "dgr", iconName: "cup2" })),
      rankList(BOTTOM_DRINK, "linear-gradient(90deg,#F6B8D6,#BE185D)", false),
      h("div", { class: "split", style: { marginTop: "4px" } }, h("span", { class: "overline" }, "ขายไม่ดีตามวัน · จันทร์–อาทิตย์"), tag("เงียบสุด " + worstDow, { kind: "warn", iconName: "cal" })),
      h("div", { class: "card" }, dowBars("worst", worstDow),
        note([bold(worstDow), " ขายน้อยสุด — ลดเตรียมของ · จัดโปร/จับคู่เมนู กระตุ้นวันเงียบ"], { iconName: "cal" })),
    ),
  );
}

/* ===================== Inventory Analysis ===================== */
const grpColor = { food: "#54AE7B", drink: "#2563EB", pack: "#EA7B2C" };
const srSt = { grp: "food", ctx: null };

export function stockReportScreen(ctx) {
  srSt.ctx = ctx;
  srSt.grp = "food";
  const root = h("div", { class: "page-wrap", "data-screen-label": "stockreport" });
  paintStockReport(root);
  return root;
}

function groupRows(gid) {
  const g = INV_GROUPS.find((x) => x.id === gid);
  return items().filter((it) => g.cats.includes(it.cat) && it.isActive !== false).map((it) => {
    const inf = stockOf(it.id);
    const avg = inf.days;
    return { id: it.id, avg, min: Math.max(0.2, Math.round(avg * 0.7 * 10) / 10), max: Math.round(avg * 1.45 * 10) / 10, st: inf.st };
  }).sort((a, b) => a.avg - b.avg).slice(0, 12);
}

function paintStockReport(root) {
  const { back } = srSt.ctx;
  const grp = srSt.grp;
  const rows = groupRows(grp);
  const maxDays = Math.max(...rows.map((s) => s.max), 5);
  const curGroup = INV_GROUPS.find((g) => g.id === grp);

  const tabs = INV_GROUPS.map((g) => {
    const low = items().filter((it) => g.cats.includes(it.cat)).filter((it) => stockOf(it.id).st !== "ok").length;
    return h("button", { type: "button", class: "invtab tint-" + g.tint + (grp === g.id ? " on" : ""), onClick: () => { srSt.grp = g.id; paintStockReport(root); } },
      h("span", { class: "ic", style: { background: grpColor[g.id] } }, emo(g.icon, { s: 18 })),
      h("span", { class: "nm" }, g.name),
      h("span", { class: "ct" }, low ? "ต่ำ " + low : "ปกติ"),
    );
  });

  const dayRows = rows.map((s) => {
    const it = itemById(s.id);
    const lo = s.avg < 2;
    return h("div", { class: "daysbar-row" },
      itemIc(it),
      h("span", { style: { flex: "none", width: "92px", fontSize: "12.5px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, it.name),
      h("div", { class: "daysbar-track" },
        h("span", { class: "rng", style: { left: (s.min / maxDays * 100) + "%", right: (100 - s.max / maxDays * 100) + "%", background: lo ? "#FBD0D5" : undefined } }),
        h("span", { class: "avg", style: { left: (s.avg / maxDays * 100) + "%", background: lo ? "var(--danger)" : grpColor[grp] } }),
      ),
      h("div", { class: "daysbar-vals" },
        h("span", { class: "daysbar-avg", style: { color: lo ? "var(--danger)" : "var(--primary-dark)" } }, String(s.avg)),
        h("span", { style: { fontSize: "10px", color: "var(--faint)" } }, "วัน"),
        h("span", { class: "daysbar-mm" }, "min " + s.min, h("br"), "max " + s.max),
      ),
    );
  });

  const tableHead = h("tr", { style: { color: "var(--muted)", fontSize: "10.5px" } },
    h("th", { style: { textAlign: "left", padding: "8px 0", fontWeight: 600 } }, "รายการ"),
    ...["ก่อน", "รับ", "นี้", "เสีย"].map((t) => h("th", { style: { textAlign: "right", padding: "8px 2px", fontWeight: 600 } }, t)),
    h("th", { style: { textAlign: "right", padding: "8px 0", fontWeight: 600 } }, "ขายจริง"),
  );
  const tableRows = COUNT_RESULT.map((r) => {
    const it = itemById(r.id);
    const sold = Math.round((r.prev + r.recv - r.count - r.waste) * 100) / 100;
    const td = (v, col) => h("td", { class: "tnum", style: { textAlign: "right", padding: "8px 2px", color: col } }, String(v));
    return h("tr", { style: { borderTop: "1px solid var(--border-soft)" } },
      h("td", { style: { padding: "8px 0" } }, h("span", { class: "rowflex", style: { gap: "6px" } }, itemIc(it), h("span", { style: { fontSize: "12px" } }, it.name))),
      td(r.prev, "var(--muted)"), td(r.recv, "var(--muted)"),
      h("td", { class: "tnum", style: { textAlign: "right", padding: "8px 2px" } }, String(r.count)),
      td(r.waste, r.waste ? "var(--danger)" : "var(--faint)"),
      h("td", { class: "tnum", style: { textAlign: "right", padding: "8px 0", fontWeight: 800, color: "var(--primary-dark)" } }, String(sold)),
    );
  });

  root.replaceChildren(
    hdr({ title: "Inventory Analysis", sub: "ใช้ได้อีกกี่วัน แยกหมวด · มูลค่า · ขายจริง", onBack: back, right: h("span", { class: "catic blue" }, pi("box", 18)) }),
    h("div", { class: "page stack" },
      h("div", { class: "overline" }, "ใช้ได้อีกกี่วัน · แยกหมวดใหญ่"),
      h("div", { class: "invtabs" }, tabs),
      h("div", { class: "card", style: { padding: "6px 16px" } }, dayRows),
      note([h("span", null, "หมวด "), bold(curGroup.name), " · ขีดเข้ม = ค่าเฉลี่ย (avg) · แท่งบาง = ช่วง min–max ที่การใช้ผันผวน — สลับหมวดด้านบนเพื่อดูแยกกัน"]),
      h("div", { class: "overline" }, "มูลค่าสต๊อกรวมสะสม"),
      h("div", { class: "card soft-card soft-blue" },
        h("div", { class: "big-num", style: { fontSize: "25px", color: "#1D4ED8" } }, "฿" + fmt(STOCKVAL_CUM[STOCKVAL_CUM.length - 1].v)),
        h("div", { style: { fontSize: "11.5px", color: "var(--muted)", marginBottom: "10px" } }, "มูลค่าของในสต๊อกตอนนี้ · 11 มิ.ย."),
        lineChart(STOCKVAL_CUM.map((p) => ({ label: p.d, v: p.v })), { color: "#2563EB", h: 112 }),
      ),
      h("div", { class: "split" }, h("span", { class: "overline" }, "ขายจริง · จากผลนับล่าสุด 10 มิ.ย."), tag("อ้างอิงผลนับ", { kind: "fifo", iconName: "lock" })),
      note([h("span", null, "สูตร: "), bold("ขายจริง = คงเหลือรอบก่อน + รับเข้า − คงเหลือรอบนี้ − เสีย/ทิ้ง/โอนออก")], { iconName: "scale" }),
      h("div", { class: "card", style: { padding: "6px 14px 10px" } },
        h("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
          h("thead", null, tableHead),
          h("tbody", null, tableRows),
        ),
      ),
    ),
  );
}
