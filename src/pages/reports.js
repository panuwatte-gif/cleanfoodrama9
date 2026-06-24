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
import { hdr, note, tag, meter, itemIc, emo, emptyState } from "../components/components.js";
import { storeChip } from "../components/layout.js";
import { lineChart, comboChart } from "../components/charts.js";
import { fmt, itemById, unitOf, stockOf, STOCK_DAYS, breakevenPerDay } from "../utils/formulas.js";
import { items, incomeRows, expenseRows } from "../data/store.js";
import { REV_TARGET_YEAR, COST_MODEL, INV_GROUPS } from "../data/seed.js";
import { salesRanking, latestDayResults, inferDailySales, DOW_TH } from "../utils/forecast.js";

const bold = (t) => h("b", null, t);
const lowCount = () => (items() || []).filter((it) => it.isActive !== false && stockOf(it.id).st !== "ok").length;

// ---- ข้อมูลจริงจากที่บันทึก (income/expense → Supabase) ----
// รวมยอดต่อวัน: in = ยอดขาย(gross) · ex = ค่าใช้จ่าย · เรียงตามวัน
function realDaily() {
  const byDay = {};
  for (const r of incomeRows()) { const d = r.day; (byDay[d] || (byDay[d] = { d, in: 0, ex: 0 })).in += (r.gross || 0); }
  for (const r of expenseRows()) { const d = r.day; (byDay[d] || (byDay[d] = { d, in: 0, ex: 0 })).ex += (r.amount || 0); }
  return Object.values(byDay).sort((a, b) => a.d - b.d).map((x) => ({ d: String(x.d), in: x.in, ex: x.ex }));
}
function realCum(daily) { let a = 0; return daily.map((x) => ({ d: x.d, v: (a += x.in) })); }
const realStockValue = () => Math.round((items() || []).filter((it) => it.isActive !== false)
  .reduce((s, it) => s + (stockOf(it.id).qty || 0) * (it.cost || 0), 0));

/* ===================== แท็บรายงาน ===================== */
export function reportsScreen({ go, role, shopCtx } = {}) {
  const store = shopCtx ? shopCtx.shop : "พระราม 9";
  const daily = realDaily();
  const cum = realCum(daily);
  const cumTotal = cum.length ? cum[cum.length - 1].v : 0;
  const cumChart = cum.length
    ? lineChart(cum.map((p) => ({ label: p.d, v: p.v })), { color: "var(--primary)" })
    : h("div", { style: { padding: "16px 6px", textAlign: "center", color: "var(--faint)", fontSize: "12px" } }, "ยังไม่มีข้อมูล — บันทึกรายได้แล้วกราฟจะขึ้นจริง");

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
    { ic: "scale", t: "ความแม่นพยากรณ์ (back-test)", s: "เทียบทาย vs จริง · อัปเดตตามข้อมูลนับ", r: "fchistory" },
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
        tag("สะสม ฿" + fmt(cumTotal), { kind: "ok", iconName: "trend" }),
        h("div", { style: { marginTop: "12px" } }, cumChart),
        "ยอดขายสะสม · จากที่บันทึกจริง", null, "incexpreport"),
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
  const daily = realDaily();
  const cum = realCum(daily);
  const cumTotal = cum.length ? cum[cum.length - 1].v : 0;
  const totalIn = cumTotal;
  const totalEx = daily.reduce((s, d) => s + d.ex, 0);
  const chartEl = daily.length
    ? comboChart({ daily, target: REV_TARGET_YEAR, breakeven: breakevenPerDay })
    : h("div", { style: { padding: "30px 10px", textAlign: "center", color: "var(--faint)", fontSize: "12.5px", lineHeight: 1.6 } },
        "ยังไม่มีข้อมูลรายรับ-รายจ่าย", h("br"), "บันทึกที่ ", bold("รายได้"), " / ", bold("ค่าใช้จ่าย"), " แล้วกราฟจะขึ้นจริง");
  return h("div", { class: "page-wrap", "data-screen-label": "incexpreport" },
    hdr({ title: "รายรับ-รายจ่าย", sub: "กราฟผสม · สะสม · จุดคุ้มทุน", onBack: back, right: h("span", { class: "catic green" }, pi("wallet", 18)) }),
    h("div", { class: "page stack" },
      h("div", { class: "card" },
        h("div", { class: "split" },
          h("div", null, h("div", { class: "overline" }, "รายได้สะสม (ที่บันทึกจริง)"), h("div", { class: "big-num", style: { fontSize: "24px", color: "var(--primary-dark)", marginTop: "1px" } }, "฿" + fmt(cumTotal))),
          h("div", { style: { textAlign: "right" } }, h("div", { class: "overline" }, "เป้า/ปี (VAT)"), h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "15px", color: "#7C3AED", marginTop: "2px" } }, "฿" + fmt(REV_TARGET_YEAR))),
        ),
        h("div", { style: { marginTop: "10px" } }, chartEl),
        daily.length && h("div", { class: "combo-legend" },
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

/* ===================== อันดับขายดี / ขายน้อย (จากยอดขายอนุมาน) ===================== */
// rows = [{id, name, total, avg, days}] จาก salesRanking()
function rankList(rows, color, top) {
  const max = Math.max(...rows.map((d) => d.total), 1);
  return h("div", { class: "card", style: { padding: "6px 16px 10px" } },
    rows.map((d, i) => {
      const it = itemById(d.id);
      const u = it ? unitOf(it) : "";
      const no = top
        ? h("span", { class: "rank-no" }, String(i + 1))
        : h("span", { class: "rank-no", style: { background: "#FCE3E7", color: "#BE123C" } }, String(i + 1));
      return h("div", { class: "rank-row" + (top ? " top" + (i + 1) : "") },
        no, itemIc(it),
        h("div", { style: { flex: 1, minWidth: 0 } },
          h("div", { class: "rank-name" }, d.name || (it ? it.name : d.id)),
          h("div", { class: "rank-bar", style: { marginTop: "5px" } }, h("i", { style: { width: (d.total / max * 100) + "%", background: color } })),
        ),
        h("div", { class: "rank-val" }, h("div", { class: "rank-qty" }, fmt(d.total) + " " + u), h("div", { class: "rank-rev" }, "เฉลี่ย " + fmt(d.avg) + "/วัน")),
      );
    }),
  );
}

// ค่าเฉลี่ยยอดขายต่อวันในสัปดาห์ (จันทร์→อาทิตย์) จากยอดขายอนุมานจริง
function dowAverages(cats) {
  const sums = Array(7).fill(0), cnts = Array(7).fill(0);
  for (const it of (items() || []).filter((x) => x.isActive !== false && cats.includes(x.cat)))
    for (const s of inferDailySales(it.id)) { sums[s.dow] += s.sales; cnts[s.dow] += 1; }
  return [1, 2, 3, 4, 5, 6, 0].map((dw) => ({ d: DOW_TH[dw], v: cnts[dw] ? Math.round(sums[dw] / cnts[dw] * 10) / 10 : 0, has: cnts[dw] > 0 }));
}
function dowBars(rows, highlightCls, target) {
  const dowMax = Math.max(...rows.map((d) => d.v), 1);
  return h("div", { class: "dow-bars" },
    rows.map((d) => h("div", { class: "col" + (d.d === target ? " " + highlightCls : "") },
      h("span", { class: "v" }, d.has ? String(d.v) : "—"),
      h("span", { class: "bar", style: { height: Math.max(6, d.v / dowMax * 86) + "px" } }),
      h("span", { class: "lbl" }, d.d.slice(0, 2)),
    )),
  );
}

export function topSellersScreen({ back } = {}) {
  const food = salesRanking({ windowDays: 30, cats: ["protein", "egg"] }).slice(0, 5);
  const drink = salesRanking({ windowDays: 30, cats: ["drink"] }).slice(0, 5);
  const dows = dowAverages(["protein", "egg", "drink"]);
  const hasDow = dows.some((d) => d.has);
  const bestDow = hasDow ? dows.reduce((a, b) => (b.v > a.v ? b : a)).d : null;
  const empty = !food.length && !drink.length;
  return h("div", { class: "page-wrap", "data-screen-label": "topsellers" },
    hdr({ title: "อันดับขายดี", sub: "เมนูขายดี · วันขายดี · 30 วันล่าสุด", onBack: back, right: h("span", { class: "catic amber" }, pi("trend", 18)) }),
    h("div", { class: "page stack" },
      empty
        ? emptyState({ iconName: "trend", title: "ยังจัดอันดับขายดีไม่ได้", sub: "อันดับคิดจากยอดขายที่อนุมานจากการนับสต๊อก — เริ่มนับสต๊อกทุกวัน แล้วอันดับจะขึ้นจริงทันที" })
        : h("div", { class: "stack" },
            food.length ? h("div", { class: "stack", style: { gap: "8px" } },
              h("div", { class: "split" }, h("span", { class: "overline" }, "ขายดี · อาหาร"), tag("เฉพาะอาหาร", { kind: "ok", iconName: "pan" })),
              rankList(food, "linear-gradient(90deg,#9FD37E,#54AE7B)", true)) : null,
            drink.length ? h("div", { class: "stack", style: { gap: "8px", marginTop: "4px" } },
              h("div", { class: "split" }, h("span", { class: "overline" }, "ขายดี · เครื่องดื่ม"), tag("เฉพาะเครื่องดื่ม", { kind: "fifo", iconName: "cup2" })),
              rankList(drink, "linear-gradient(90deg,#7CC6E8,#2563EB)", true)) : null,
            hasDow ? h("div", { class: "stack", style: { gap: "8px", marginTop: "4px" } },
              h("div", { class: "split" }, h("span", { class: "overline" }, "ขายดีตามวัน · จันทร์–อาทิตย์"), tag("ดีสุด " + bestDow, { kind: "warn", iconName: "cal" })),
              h("div", { class: "card" }, dowBars(dows, "best", bestDow),
                note([bold("วันขายดี"), " เตรียมของ + คนให้พอ · วันเบาเหมาะทำความสะอาด/สต๊อก — คิดจากยอดขายจริงต่อวันในสัปดาห์"], { iconName: "trend" }))) : null,
          ),
    ),
  );
}

export function lowSellersScreen({ back } = {}) {
  const food = salesRanking({ windowDays: 30, cats: ["protein", "egg"] }).slice(-3).reverse();
  const drink = salesRanking({ windowDays: 30, cats: ["drink"] }).slice(-3).reverse();
  const dows = dowAverages(["protein", "egg", "drink"]);
  const withData = dows.filter((d) => d.has);
  const worstDow = withData.length ? withData.reduce((a, b) => (b.v < a.v ? b : a)).d : null;
  const empty = !food.length && !drink.length;
  return h("div", { class: "page-wrap", "data-screen-label": "lowsellers" },
    hdr({ title: "ขายน้อย — ต้องดูแล", sub: "อันดับขายน้อย · วันเงียบ · 30 วันล่าสุด", onBack: back, right: h("span", { class: "catic rose" }, pi("down", 18)) }),
    h("div", { class: "page stack" },
      empty
        ? emptyState({ iconName: "down", title: "ยังจัดอันดับขายน้อยไม่ได้", sub: "ต้องมียอดขายที่อนุมานจากการนับสต๊อกก่อน — เริ่มนับสต๊อกทุกวันแล้วกลับมาดู" })
        : h("div", { class: "stack" },
            note([h("span", null, "เมนูขายน้อยอาจ"), bold("จัดโปรกระตุ้น"), " หรือ", bold("ลดสต๊อก/ตัดเมนู"), " เพื่อไม่ให้ของค้างเสีย"], { amber: true }),
            food.length ? h("div", { class: "stack", style: { gap: "8px" } },
              h("div", { class: "split" }, h("span", { class: "overline" }, "ขายน้อย · อาหาร"), tag("เฉพาะอาหาร", { kind: "dgr", iconName: "pan" })),
              rankList(food, "linear-gradient(90deg,#FBC0C8,#EF4444)", false)) : null,
            drink.length ? h("div", { class: "stack", style: { gap: "8px", marginTop: "4px" } },
              h("div", { class: "split" }, h("span", { class: "overline" }, "ขายน้อย · เครื่องดื่ม"), tag("เฉพาะเครื่องดื่ม", { kind: "dgr", iconName: "cup2" })),
              rankList(drink, "linear-gradient(90deg,#F6B8D6,#BE185D)", false)) : null,
            worstDow ? h("div", { class: "stack", style: { gap: "8px", marginTop: "4px" } },
              h("div", { class: "split" }, h("span", { class: "overline" }, "ขายไม่ดีตามวัน · จันทร์–อาทิตย์"), tag("เงียบสุด " + worstDow, { kind: "warn", iconName: "cal" })),
              h("div", { class: "card" }, dowBars(dows, "worst", worstDow),
                note([bold(worstDow), " ขายน้อยสุด — ลดเตรียมของ · จัดโปร/จับคู่เมนูกระตุ้นวันเงียบ"], { iconName: "cal" }))) : null,
          ),
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
  const dayRes = latestDayResults();
  const tableRows = (dayRes ? dayRes.rows : []).map((r) => {
    const it = itemById(r.id);
    const td = (v, col) => h("td", { class: "tnum", style: { textAlign: "right", padding: "8px 2px", color: col } }, String(v));
    return h("tr", { style: { borderTop: "1px solid var(--border-soft)" } },
      h("td", { style: { padding: "8px 0" } }, h("span", { class: "rowflex", style: { gap: "6px" } }, itemIc(it), h("span", { style: { fontSize: "12px" } }, it ? it.name : r.id))),
      td(r.prev, "var(--muted)"), td(r.recv, "var(--muted)"),
      h("td", { class: "tnum", style: { textAlign: "right", padding: "8px 2px" } }, String(r.count)),
      td(r.waste, r.waste ? "var(--danger)" : "var(--faint)"),
      h("td", { class: "tnum", style: { textAlign: "right", padding: "8px 0", fontWeight: 800, color: "var(--primary-dark)" } }, String(r.sold)),
    );
  });

  root.replaceChildren(
    hdr({ title: "Inventory Analysis", sub: "ใช้ได้อีกกี่วัน แยกหมวด · มูลค่า · ขายจริง", onBack: back, right: h("span", { class: "catic blue" }, pi("box", 18)) }),
    h("div", { class: "page stack" },
      h("div", { class: "overline" }, "ใช้ได้อีกกี่วัน · แยกหมวดใหญ่"),
      h("div", { class: "invtabs" }, tabs),
      h("div", { class: "card", style: { padding: "6px 16px" } }, dayRows),
      note([h("span", null, "หมวด "), bold(curGroup.name), " · ขีดเข้ม = ค่าเฉลี่ย (avg) · แท่งบาง = ช่วง min–max ที่การใช้ผันผวน — สลับหมวดด้านบนเพื่อดูแยกกัน"]),
      h("div", { class: "overline" }, "มูลค่าสต๊อกรวม (ปัจจุบัน)"),
      h("div", { class: "card soft-card soft-blue" },
        h("div", { class: "big-num", style: { fontSize: "25px", color: "#1D4ED8" } }, "฿" + fmt(realStockValue())),
        h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "คงเหลือจริง × ต้นทุน/หน่วย · คิดสดจากสต๊อกตอนนี้"),
      ),
      h("div", { class: "split" }, h("span", { class: "overline" }, dayRes ? "ขายจริง · จากผลนับล่าสุด " + dayRes.date.slice(5) : "ขายจริง · จากผลนับ"), tag("อ้างอิงผลนับ", { kind: "fifo", iconName: "lock" })),
      note([h("span", null, "สูตร: "), bold("ขายจริง = คงเหลือเมื่อวาน + รับเข้า − ของเสีย − คงเหลือวันนี้")], { iconName: "scale" }),
      dayRes
        ? h("div", { class: "card", style: { padding: "6px 14px 10px" } },
            h("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
              h("thead", null, tableHead),
              h("tbody", null, tableRows),
            ),
          )
        : h("div", { class: "card", style: { padding: "18px", textAlign: "center", color: "var(--muted)", fontSize: "12.5px", lineHeight: 1.6 } },
            "ยังคำนวณ \"ขายจริง\" ไม่ได้", h("br"), "ต้องนับสต๊อก ", bold("2 วันติดกัน"), " ระบบถึงคิดยอดขายจากผลต่างให้"),
    ),
  );
}
