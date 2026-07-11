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
import { hdr, note, tag, meter, itemIc, emo, emptyState, sectionTabs } from "../components/components.js";
import { cic } from "../components/mascot.js";
import { storeChip } from "../components/layout.js";
import { cumLinesChart } from "../components/charts.js";
import { fmt, itemById, unitOf, stockOf, breakevenPerDay, coverDays, reorderPoint, fmtQty, fmtRate, matchCat, fc7 } from "../utils/formulas.js";
import { items, cats, incomeRows, expenseRows, countsRows } from "../data/store.js";
import { REV_TARGET_YEAR, COST_MODEL, BRANCH_COLORS, EXP_INV_CAT } from "../data/seed.js";
import { salesRanking, latestDayResults, inferDailySales, DOW_TH } from "../utils/usage.js";
import { thaiShort, recDate } from "../utils/dateutil.js";
import { getPrepHidden } from "../forecast/formulaLibrary.js";

const bold = (t) => h("b", null, t);
const lowCount = () => (items() || []).filter((it) => it.isActive !== false && stockOf(it.id).st !== "ok").length;

// ---- ข้อมูลจริงจากที่บันทึก (income/expense + ต้นทุนรับของ) ----
// หมวดที่กรอกต้นทุนเองในหน้า "ค่าใช้จ่าย" — กันนับซ้ำกับของรับเข้า
const MANUAL_EXP_CATS = new Set(Object.values(EXP_INV_CAT)); // pack · rice · sauce · dry

// ต้นทุนของรับเข้า (COGS) ต่อวัน — เฉพาะของสด (เนื้อ/ไข่/เครื่องดื่ม)
// ที่ไม่ได้กรอกในหน้าค่าใช้จ่าย = รับเข้า × ต้นทุน/หน่วย
function recvCostByDay() {
  const by = {};
  for (const r of countsRows()) {
    const recv = Number(r.recv) || 0; if (recv <= 0) continue;
    const it = itemById(r.item); if (!it || MANUAL_EXP_CATS.has(it.cat)) continue;
    const d = recDate(r);
    by[d] = (by[d] || 0) + recv * (it.cost || 0);
  }
  return by;
}

// รวมยอดต่อวัน (คีย์ตามวันเต็ม ISO — ไม่ปนข้ามเดือน):
//   in = รายรับสุทธิ (หลังหัก GP/Marketing) · ex = ค่าใช้จ่ายที่บันทึก + ต้นทุนของรับเข้า
function realDaily() {
  const byDay = {};
  const get = (iso) => (byDay[iso] || (byDay[iso] = { iso, in: 0, ex: 0 }));
  for (const r of incomeRows()) { get(recDate(r)).in += (r.net != null ? r.net : (r.gross || 0)); }
  for (const r of expenseRows()) { get(recDate(r)).ex += (r.amount || 0); }
  const recvCost = recvCostByDay();
  for (const iso in recvCost) { get(iso).ex += recvCost[iso]; }
  return Object.values(byDay)
    .sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0))
    .map((x) => ({ d: String(Number((x.iso || "").slice(8, 10)) || x.iso), in: x.in, ex: x.ex }));
}
function realCum(daily) { let a = 0; return daily.map((x) => ({ d: x.d, v: (a += x.in) })); }
// ยอดสะสม รายรับ/รายจ่าย/กำไร ตัวเลขปลายงวด (จากที่บันทึกจริง)
function cumTotals(daily) {
  const inT = daily.reduce((s, d) => s + d.in, 0);
  const exT = daily.reduce((s, d) => s + d.ex, 0);
  return { in: inT, ex: exT, profit: inT - exT };
}
const realStockValue = () => Math.round((items() || []).filter((it) => it.isActive !== false)
  .reduce((s, it) => s + (stockOf(it.id).qty || 0) * (it.cost || 0), 0));

/* ===================== แท็บรายงาน ===================== */
// การ์ด "คำแนะนำการสั่งของ" (ย้ายมาจากหน้าเตรียมของ) — มี tab หมวดหมู่ + รายการที่ควรสั่ง
const ORDER_GROUPS = [
  { id: "protein", name: "กับข้าว", icon: "pan", tint: "green" },
  { id: "drink", name: "เครื่องดื่ม", icon: "cup2", tint: "blue" },
  { id: "egg", name: "ไข่", icon: "egg", tint: "amber" },
  { id: "sauce", name: "ซอส", icon: "drop", tint: "rose" },
  { id: "rice", name: "ข้าว", icon: "rice", tint: "violet" },
  { id: "pack", name: "บรรจุภัณฑ์", icon: "box", tint: "amber" },
];
function orderPlanCard(go) {
  const card = h("div", { class: "card soft-card soft-rose", style: { padding: "14px" } });
  let cat = "all";
  // รายการที่ควรสั่ง = คาดใช้/วัน (จาก fc7) > คงเหลือ → ขาด
  function needList(catId) {
    return (items() || []).filter((it) => it.isActive !== false && (catId === "all" || it.cat === catId))
      .map((it) => {
        const s = fc7(it.id); const dayUse = s ? s.wavg : 0;
        const onHand = (stockOf(it.id).qty || 0);
        const u = unitOf(it);
        const rec = s ? s.rec : 0;            // แนะนำสั่ง/วัน (มี buffer)
        const need = Math.max(0, Math.round((dayUse - onHand) * 10) / 10);
        return { it, u, onHand, dayUse, rec, need };
      })
      .filter((x) => x.need > 0)
      .sort((a, b) => b.need - a.need);
  }
  function paint() {
    const groups = ORDER_GROUPS.filter((g) => cats().some((c) => c.id === g.id));
    const tabs = h("div", { class: "chip-tabs cat-tabs", style: { marginBottom: "10px" } },
      h("button", { type: "button", class: "chip" + (cat === "all" ? " active" : ""), onClick: () => { cat = "all"; paint(); } }, pi("grid", 13), "ทั้งหมด"),
      ...groups.map((g) => h("button", { type: "button", class: "chip" + (cat === g.id ? " active" : ""), onClick: () => { cat = g.id; paint(); } }, emo(g.icon, { s: 13 }), g.name)));
    const list = needList(cat).slice(0, 6);
    const rows = list.length
      ? list.map((x) => h("div", { class: "rowflex", style: { gap: "9px", padding: "8px 0", borderTop: "1px solid var(--border-soft)" } },
          itemIc(x.it),
          h("span", { style: { flex: 1, minWidth: 0 } },
            h("span", { style: { display: "block", fontWeight: 700, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, x.it.name),
            h("span", { style: { fontSize: "11px", color: "var(--muted)" } }, "คงเหลือ " + fmtQty(x.onHand, x.u) + " · คาดใช้ " + fmtQty(x.dayUse, x.u) + "/วัน")),
          h("span", { class: "tnum", style: { fontWeight: 800, fontSize: "13.5px", color: "var(--danger-ink)" } }, "สั่ง " + fmtQty(x.rec, x.u) + " " + x.u)))
      : [h("div", { style: { padding: "16px 4px", textAlign: "center", color: "var(--muted)", fontSize: "12.5px" } }, "หมวดนี้ของพอแล้ว — ยังไม่ต้องสั่งเพิ่ม 💚")];
    card.replaceChildren(
      h("div", { class: "split", style: { marginBottom: "10px" } },
        h("div", { class: "rowflex" }, h("span", { class: "catic rose sm" }, pi("cart", 16)),
          h("div", null, h("div", { style: { fontWeight: 800, fontSize: "15px" } }, "คำแนะนำการสั่งของ"),
            h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "ความจุตู้ + รอบส่ง → ต้องสั่งอะไรเท่าไร"))),
        tag(list.length + " ควรสั่ง", { kind: list.length ? "dgr" : "ok", iconName: "cart" })),
      tabs,
      ...rows,
      h("button", { type: "button", class: "orderplan-cta", style: { marginTop: "12px" }, onClick: () => go({ name: "orderplan" }) },
        cic("delivery", 28), h("div", { style: { flex: 1, textAlign: "left" } }, h("div", { style: { fontWeight: 800, fontSize: "14px" } }, "เปิดแผนสั่งของเต็ม"), h("div", { style: { fontSize: "11px", opacity: .9 } }, "ความจุตู้ · รอบส่ง · FIFO")), pi("chev", 18)),
    );
  }
  paint();
  return card;
}

export function reportsScreen({ go, role, shopCtx } = {}) {
  const store = shopCtx ? shopCtx.shop : "พระราม 9";
  const daily = realDaily();
  const cum = realCum(daily);
  const cumTotal = cum.length ? cum[cum.length - 1].v : 0;
  const tot = cumTotals(daily);
  const cumChart = daily.length
    ? cumLinesChart({ daily, h: 150 })
    : h("div", { style: { padding: "16px 6px", textAlign: "center", color: "var(--faint)", fontSize: "12px" } }, "ยังไม่มีข้อมูล — บันทึกรายได้แล้วกราฟจะขึ้นจริง");
  const cardLegend = daily.length ? h("div", { class: "combo-legend", style: { marginTop: "8px", gap: "10px" } },
    h("span", { style: { color: "#34B97A" } }, h("i", { style: { background: "currentColor" } }), "รายรับสะสม"),
    h("span", { style: { color: "#EF8C3B" } }, h("i", { style: { background: "currentColor" } }), "รายจ่ายสะสม"),
    h("span", { style: { color: "#7C3AED" } }, h("i", { style: { background: "currentColor" } }), "กำไรสะสม"),
  ) : null;

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

  // inventory mini-rows — ของใกล้หมดก่อน (อยู่ได้น้อยวันก่อน) · cap 30+ วัน
  const invRows = (items() || []).filter((it) => it.isActive !== false)
    .map((it) => ({ it, cov: coverDays(it.id) }))
    .filter((x) => (x.cov.qty || 0) > 0 && x.cov.use > 0)
    .sort((a, b) => (a.cov.raw == null ? 1e9 : a.cov.raw) - (b.cov.raw == null ? 1e9 : b.cov.raw))
    .slice(0, 4)
    .map(({ it, cov }) => {
      const lo = cov.raw != null && cov.raw < 2;
      const txt = cov.days == null ? "—" : (cov.over ? "30+" : cov.days);
      return h("div", { class: "rowflex", style: { gap: "8px" } },
        itemIc(it),
        h("span", { style: { fontSize: "12px", width: "104px", flex: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, it.name),
        meter(cov.raw == null ? 0 : Math.min(100, cov.raw / 7 * 100), lo ? "lo" : cov.raw < 4 ? "warn" : ""),
        h("span", { class: "tnum", style: { fontSize: "11.5px", fontWeight: 700, width: "52px", textAlign: "right", color: lo ? "var(--danger)" : "var(--primary-dark)" } }, txt + " วัน"),
      );
    });

  const badge = (icName, txt) => h("span", { class: "badge", style: { background: "var(--surface)", border: "1px solid var(--border-soft)" } }, pi(icName, 12), txt);

  // ---- สรุปสำหรับการ์ดแสดงผลของจริง (คงเหลือ + รับของ) ----
  const stockHave = (items() || []).filter((it) => it.isActive !== false && (stockOf(it.id).qty || 0) > 0);
  const stockVal = realStockValue();
  const recvDates = [...new Set(countsRows().filter((r) => (r.recv || 0) > 0).map((r) => r.date || ""))].filter(Boolean).sort();
  const lastRecv = recvDates.length ? recvDates[recvDates.length - 1] : null;
  const lastRecvCount = lastRecv ? countsRows().filter((r) => (r.date === lastRecv) && (r.recv || 0) > 0).length : 0;

  const dailyRows = [
    { ic: "chat", t: "ส่งเข้ากลุ่ม LINE", s: "เลือกหัวข้อที่จะส่ง · ระบบแต่งข้อความให้", tag: tag("รอส่ง", { kind: "warn" }), r: "linesend" },
    { ic: "history", t: "ประวัติ + แก้ย้อนหลัง", s: "ทุกการบันทึก · audit log ลบไม่ได้", r: "history" },
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
      orderPlanCard(go),
      card("soft-blue", "box", "blue", "สินค้าคงเหลือ & ของทิ้ง",
        tag(stockHave.length + " รายการ", { kind: "fifo", iconName: "box" }),
        h("div", { class: "rowflex", style: { gap: "10px", marginTop: "11px" } },
          h("div", { style: { flex: 1 } }, h("div", { class: "big-num tnum", style: { fontSize: "21px", color: "var(--primary-dark)" } }, String(stockHave.length)), h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, "รายการมีของ")),
          h("div", { style: { flex: 1 } }, h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "16px" } }, "฿" + fmt(stockVal)), h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, "มูลค่าคงเหลือ")),
        ),
        "คงเหลือปัจจุบัน · ของทิ้ง · เลือกวัน/เดือนย้อนหลังได้", null, "stocknow"),
      card("soft-amber", "truck", "amber", "รายงานการรับของ",
        tag(recvDates.length + " รอบ", { kind: "warn", iconName: "truck" }),
        h("div", { style: { marginTop: "11px", fontSize: "13px", color: "var(--muted)" } },
          lastRecv
            ? h("span", null, "รับล่าสุด ", bold(thaiShort(lastRecv)), " · ", bold(lastRecvCount + " รายการ"), " — เลือกวัน/เดือนย้อนหลังได้ในปฏิทิน")
            : h("span", null, "ยังไม่มีรอบรับของ — บันทึกที่ “รับของ”"),
        ),
        "รับอะไรมาบ้าง · ปริมาณเท่าไหร่ · เลือกวันในปฏิทิน", null, "recvreport"),
      card("soft-green", "wallet", "green", "รายรับ - รายจ่าย",
        tag((tot.profit >= 0 ? "กำไรสะสม ฿" : "ขาดทุน ฿") + fmt(Math.abs(tot.profit)), { kind: tot.profit >= 0 ? "ok" : "dgr", iconName: "trend" }),
        h("div", { style: { marginTop: "12px" } }, cumChart, cardLegend),
        "รายรับ · รายจ่าย · กำไร แบบสะสม · จากที่บันทึกจริง", null, "incexpreport"),
      card("soft-blue", "box", "blue", "Inventory Analysis",
        tag("ต่ำ " + lowCount(), { kind: "dgr", iconName: "alert" }),
        h("div", { class: "stack", style: { gap: "7px", marginTop: "12px" } }, invRows),
        "อยู่ได้อีกกี่วัน · จุดสั่งซื้อ · แยกหมวด", null, "stockreport"),
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

/* ===================== รายรับ-รายจ่าย — Full Report (สะสม · แยกร้าน) ===================== */
// แยกรายรับ/รายจ่ายตามร้าน (รองรับเปิดร้านเพิ่ม — ร้านที่ยังไม่มีบันทึก = 0 พร้อมโชว์เมื่อเริ่มลงข้อมูล)
function shopBreakdown(shopCtx) {
  const names = (shopCtx && shopCtx.shops && shopCtx.shops.length) ? shopCtx.shops.map((s) => s.name) : ["พระราม 9"];
  const main = names[0];
  const map = {}; names.forEach((nm) => (map[nm] = { in: 0, ex: 0 }));
  for (const r of incomeRows()) { const k = (r.shop && map[r.shop]) ? r.shop : main; map[k].in += (r.gross || 0); }
  for (const r of expenseRows()) { const k = (r.shop && map[r.shop]) ? r.shop : main; map[k].ex += (r.amount || 0); }
  return names.map((nm, i) => ({ name: nm, color: BRANCH_COLORS[i % BRANCH_COLORS.length], in: map[nm].in, ex: map[nm].ex, profit: map[nm].in - map[nm].ex }));
}

export function incExpReportScreen({ back, go, shopCtx } = {}) {
  const daily = realDaily();
  const tot = cumTotals(daily);
  const margin = tot.in > 0 ? Math.round((tot.profit / tot.in) * 100) : 0;
  const shops = shopBreakdown(shopCtx);
  const activeShops = shops.filter((s) => s.in > 0 || s.ex > 0);
  const maxShopRev = Math.max(...shops.map((s) => s.in), 1);

  const chartEl = daily.length
    ? cumLinesChart({ daily, h: 200 })
    : h("div", { style: { padding: "30px 10px", textAlign: "center", color: "var(--faint)", fontSize: "12.5px", lineHeight: 1.6 } },
        "ยังไม่มีข้อมูลรายรับ-รายจ่าย", h("br"), "บันทึกที่ ", bold("รายได้"), " / ", bold("ค่าใช้จ่าย"), " แล้วกราฟจะขึ้นจริง");

  // 3 KPI: รายรับ · รายจ่าย · กำไร
  const kpi = (label, val, color, sub) => h("div", { class: "card", style: { flex: 1, textAlign: "center", padding: "12px 8px" } },
    h("div", { class: "overline" }, label),
    h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "17px", color, marginTop: "3px" } }, "฿" + fmt(Math.abs(val))),
    sub && h("div", { style: { fontSize: "10.5px", color: "var(--muted)", marginTop: "2px" } }, sub),
  );

  // ตารางแยกร้าน (รองรับหลายสาขา)
  const shopRow = (s) => h("div", { class: "stack", style: { gap: "5px", padding: "11px 0", borderTop: "1px solid var(--border-soft)" } },
    h("div", { class: "split" },
      h("span", { class: "rowflex", style: { gap: "7px", minWidth: 0 } },
        h("span", { style: { width: "10px", height: "10px", borderRadius: "3px", background: s.color, flex: "none" } }),
        h("span", { style: { fontWeight: 700, fontSize: "13.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, s.name),
      ),
      h("span", { class: "tnum", style: { fontWeight: 800, fontSize: "13.5px", color: s.profit >= 0 ? "var(--primary-dark)" : "var(--danger)" } }, (s.profit >= 0 ? "กำไร ฿" : "ขาดทุน ฿") + fmt(Math.abs(s.profit))),
    ),
    h("div", { class: "meter" }, h("i", { style: { width: Math.max(3, s.in / maxShopRev * 100) + "%", background: s.color } })),
    h("div", { class: "rowflex", style: { gap: "14px", fontSize: "11.5px", color: "var(--muted)" } },
      h("span", { class: "tnum" }, "รายรับ ฿" + fmt(s.in)),
      h("span", { class: "tnum" }, "รายจ่าย ฿" + fmt(s.ex)),
    ),
  );

  return h("div", { class: "page-wrap", "data-screen-label": "incexpreport" },
    hdr({ title: "รายรับ-รายจ่าย (รายงานเต็ม)", sub: "สะสม · กำไร · แยกร้าน", onBack: back, right: h("span", { class: "catic green" }, pi("wallet", 18)) }),
    h("div", { class: "page stack" },
      // KPI 3 ตัว
      h("div", { class: "rowflex", style: { gap: "9px" } },
        kpi("รายรับรวม", tot.in, "var(--primary-dark)"),
        kpi("รายจ่ายรวม", tot.ex, "var(--warning-ink)"),
        kpi(tot.profit >= 0 ? "กำไรสุทธิ" : "ขาดทุนสุทธิ", tot.profit, tot.profit >= 0 ? "#7C3AED" : "var(--danger)", "มาร์จิน " + margin + "%"),
      ),
      // กราฟสะสม 3 เส้น (แกนขวา = สะสม) + แท่งรายได้รายวัน (แกนซ้าย คนละสเกล)
      h("div", { class: "card" },
        h("div", { class: "split", style: { marginBottom: "2px" } },
          h("div", { class: "overline" }, "ยอดสะสมรายวัน (จากที่บันทึกจริง)"),
          tag(daily.length + " วัน", { kind: "fifo", iconName: "cal" }),
        ),
        h("div", { style: { marginTop: "8px" } }, chartEl),
        daily.length && h("div", { class: "combo-legend", style: { gap: "11px" } },
          h("span", { style: { color: "#34B97A" } }, h("i", { style: { background: "currentColor" } }), "รายรับสะสม"),
          h("span", { style: { color: "#EF8C3B" } }, h("i", { style: { background: "currentColor" } }), "รายจ่ายสะสม"),
          h("span", { style: { color: "#7C3AED" } }, h("i", { style: { background: "currentColor" } }), "กำไรสะสม"),
          h("span", null, h("i", { style: { background: "#C5D5EC", height: "9px", width: "7px", borderRadius: "2px" } }), "รายได้/วัน (แกนซ้าย)"),
        ),
      ),
      note([bold("ทำไมแยก 2 แกน:"), " เส้น “สะสม” ตัวเลขโตขึ้นเรื่อยๆ (หลักแสน) ส่วน “รายได้/วัน” หลักพัน — ถ้าวางแกนเดียวกันเส้นรายวันจะแบนติดพื้น จึงแยกแกนซ้าย(รายวัน)/ขวา(สะสม) ให้เห็นทั้งคู่ชัด"], { iconName: "scale" }),

      // แยกตามร้าน (รองรับเปิดเพิ่ม)
      h("div", { class: "split" },
        h("span", { class: "overline" }, "แยกตามร้าน"),
        tag(activeShops.length + "/" + shops.length + " ร้านมีข้อมูล", { kind: "ok", iconName: "store" }),
      ),
      h("div", { class: "card", style: { padding: "2px 16px 12px" } }, shops.map(shopRow)),
      note([bold("รองรับเปิดร้านเพิ่ม:"), " ตอนนี้บันทึกรวมที่ร้านหลัก — เมื่อเปิดอีก 2 ร้านและเริ่มลงรายได้ (เลือกร้านบนหัวก่อนบันทึก) ระบบจะแยกบรรทัด + สีให้เองอัตโนมัติ"], { amber: true }),

      // ภาษี + คุ้มทุน (ย้ายเส้นประที่อ่านยากออกมาเป็นข้อความ)
      h("div", { class: "rowflex", style: { gap: "9px" } },
        h("div", { class: "card", style: { flex: 1, padding: "11px 12px" } }, h("div", { class: "overline" }, "จุดคุ้มทุน/วัน"), h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "15px", color: "#E11D48", marginTop: "2px" } }, "฿" + fmt(breakevenPerDay))),
        h("div", { class: "card", style: { flex: 1, padding: "11px 12px" } }, h("div", { class: "overline" }, "เกณฑ์จด VAT/ปี"), h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "15px", color: "#7C3AED", marginTop: "2px" } }, "฿" + fmt(REV_TARGET_YEAR))),
      ),
      note([bold("เตือนภาษี:"), " รายรับสะสมทั้งปีแตะ ", bold("1.8 ล้าน"), " เมื่อไหร่ = ถึงเกณฑ์ ", bold("ต้องจด VAT"), " · จุดคุ้มทุนคิดจาก fixed cost (เช่า · ค่าแรง · ไฟ-น้ำ) + variable " + Math.round(COST_MODEL.varRatio * 100) + "%"], { amber: true }),

      h("button", { type: "button", class: "card list-press soft-card soft-amber split", style: { width: "100%", textAlign: "left" }, onClick: () => go({ name: "money" }) },
        h("div", { class: "rowflex" }, h("span", { class: "catic amber sm" }, pi("cal", 15)), h("div", null, h("div", { style: { fontWeight: 700, fontSize: "14px" } }, "แก้ไขรายวัน (ปฏิทิน)"), h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "ไปหน้าปฏิทิน · แก้ได้ทั้งวันนี้และย้อนหลัง"))),
        (() => { const c = pi("chev", 16); c.style.color = "var(--faint)"; return c; })(),
      ),
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

/* ===================== Inventory Analysis (แยกหมวดเหมือนทั้งแอป) ===================== */
const srSt = { cat: "all", ctx: null };

export function stockReportScreen(ctx) {
  srSt.ctx = ctx;
  srSt.cat = "all";
  const root = h("div", { class: "page-wrap", "data-screen-label": "stockreport" });
  paintStockReport(root);
  return root;
}

// รายการที่จะวิเคราะห์ (มีคงเหลือ หรือ มีอัตราใช้) · เรียงของใกล้หมดก่อน
function invList(catId) {
  return (items() || []).filter((it) => it.isActive !== false && matchCat(it, catId))
    .map((it) => ({ it, cov: coverDays(it.id), reorder: reorderPoint(it.id) }))
    .filter((x) => (x.cov.qty || 0) > 0 || x.cov.use > 0)
    .sort((a, b) => (a.cov.raw == null ? 1e9 : a.cov.raw) - (b.cov.raw == null ? 1e9 : b.cov.raw));
}

function invItemRow({ it, cov, reorder }) {
  const u = cov.u || unitOf(it);
  const lo = cov.raw != null && cov.raw < 2;
  const mid = cov.raw != null && cov.raw >= 2 && cov.raw < 4;
  const color = lo ? "var(--danger)" : mid ? "var(--warning-ink)" : "var(--primary-dark)";
  const pct = cov.raw == null ? 0 : Math.min(100, (cov.raw / 7) * 100);
  const daysText = cov.days == null ? "—" : (cov.over ? "30+" : cov.days);
  return h("div", { class: "inv-row" },
    itemIc(it),
    h("div", { class: "inv-body" },
      h("div", { class: "inv-name" }, it.name),
      h("div", { class: "inv-meta" },
        h("span", { style: { color, fontWeight: 700 } }, "อยู่ได้ ~" + daysText + " วัน"),
        cov.use > 0 ? h("span", { class: "tnum" }, "ใช้ ~" + fmtRate(cov.use, u) + "/วัน") : h("span", { style: { color: "var(--faint)" } }, "ยังไม่มียอดใช้"),
        reorder != null ? h("span", { class: "tnum" }, "สั่งเมื่อ ≤ " + fmt(reorder) + " " + u) : null,
      ),
      meter(pct, lo ? "lo" : mid ? "warn" : ""),
    ),
    h("div", { class: "inv-right" },
      h("div", { class: "q tnum", style: { color: cov.qty > 0 ? "var(--primary-dark)" : "var(--faint)" } }, fmtQty(cov.qty, u)),
      h("div", { class: "qu" }, u + " คงเหลือ"),
    ),
  );
}

function paintStockReport(root) {
  const { back } = srSt.ctx;
  const list = invList(srSt.cat);
  const overCount = list.filter((x) => x.cov.over).length;

  const tabsEl = sectionTabs({ cats: cats(), value: srSt.cat, allLabel: "ทั้งหมด", onChange: (v) => { srSt.cat = v; paintStockReport(root); } });

  // ตาราง "ขายจริง" (จากผลนับล่าสุด) — คงไว้
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
    hdr({ title: "Inventory Analysis", sub: "อยู่ได้กี่วัน · จุดสั่งซื้อ · มูลค่า · ขายจริง", onBack: back, right: h("span", { class: "catic blue" }, pi("box", 18)) }),
    h("div", { class: "page stack" },
      h("div", { class: "overline" }, "อยู่ได้อีกกี่วัน · แยกหมวด"),
      tabsEl,
      list.length
        ? h("div", { class: "card", style: { padding: "4px 16px" } }, list.map(invItemRow))
        : emptyState({ compact: true, iconName: "box", title: "ยังไม่มีสินค้าในหมวดนี้", sub: "นับ/รับของแล้วจะขึ้นที่นี่" }),
      note([bold("อยู่ได้กี่วัน"), " = คงเหลือ ÷ ยอดใช้เฉลี่ย/วัน (30 วันล่าสุด) · เกิน 30 วันแสดง ", bold("“30+”"), " · ", bold("สั่งเมื่อ ≤"), " = จุดที่ควรสั่งเพิ่ม คิดเป็นจำนวนเต็มตามหน่วยจริง (ขวด/ฟอง = ไม่มีทศนิยม)"]),
      overCount ? note([bold(overCount + " รายการ"), " อยู่ได้เกิน 30 วัน — ถ้าเป็นของสด ให้ตรวจว่าค้างเกินอายุ หรือเป็นของเตรียมส่งสาขาอื่น (ไม่ใช่ขายช้า)"], { amber: true }) : null,
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
