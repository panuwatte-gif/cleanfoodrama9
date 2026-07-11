// ============================================================
// pages/orderplan.js — "คำแนะนำการสั่งของ"
//   ความจุตู้ (ธรรมดา/แช่แข็ง) + จำนวนรอบส่ง/สัปดาห์ → คำนวณต้องสั่งอะไรเท่าไร แบ่งตามรอบ
//   ใช้ข้อมูลกลางจริง (items/stockOf) + พยากรณ์จาก formulaLibrary (สูตรเดียวทั้งแอป)
//     ต้องสั่งรวม/สัปดาห์ = max(0, ใช้/วัน × 7 − คงเหลือ)  ·  แบ่งเท่าๆ กันตามรอบส่ง
// ctx = { go, back, role, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, emptyState, itemIc } from "../components/components.js";
import { chick, cic } from "../components/mascot.js";
import { items } from "../data/store.js";
import { unitOf, fmtQty, stockOf } from "../utils/formulas.js";
import { hasUsageData, todayISO } from "../utils/usage.js";
import { forecastItem, getCfg, saveCfg } from "../forecast/formulaLibrary.js";

const bold = (t) => h("b", null, t);
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const ROUNDS = [1, 2, 3, 4];
const ost = { ctx: null };
const isFrozen = (it) => it.cat === "protein";          // โปรตีน/เนื้อ → ช่องแช่แข็ง · ที่เหลือ → ช่องธรรมดา
const kgOf = (it, q) => q * (it.unit === "g" ? 0.001 : (it.unit === "kg" ? 1 : 0)); // เฉพาะของชั่งกิโล

export function orderPlanScreen(ctx) {
  ost.ctx = ctx;
  const root = h("div", { class: "page-wrap", "data-screen-label": "orderplan" });
  paint(root);
  return root;
}

function paint(root) {
  const { back, toast } = ost.ctx;
  const cfg = getCfg();
  const capN = cfg.fridgeNormal != null ? cfg.fridgeNormal : 120;
  const capF = cfg.fridgeFreezer != null ? cfg.fridgeFreezer : 80;
  const rounds = cfg.deliveryRounds || 3;

  if (!hasUsageData()) {
    root.replaceChildren(hdr({ title: "คำแนะนำการสั่งของ", sub: "ความจุตู้ + รอบส่ง", onBack: back }),
      h("div", { class: "page stack" }, h("div", { class: "fc-empty-hero" }, chick(96, "wave", { float: true }),
        h("div", null, h("div", { style: { fontWeight: 800, fontSize: "16px", color: "var(--primary-deep)" } }, "ยังไม่มีข้อมูลพอ"),
          h("div", { style: { fontSize: "13px", color: "var(--text-2)", marginTop: "3px" } }, "เริ่มนับสต๊อก ระบบจะคำนวณปริมาณสั่งให้")))));
    return;
  }

  // ---- คำนวณรายการที่ต้องสั่ง ----
  const list = (items() || []).filter((it) => it.isActive !== false).map((it) => {
    const fc = forecastItem(it.id, todayISO());
    const perDay = fc ? (fc.predicted > 0 ? fc.predicted : fc.avg) : 0;
    const onHand = (stockOf(it.id) || {}).qty || 0;
    const weekly = perDay * 7;
    const order = Math.max(0, r2(weekly - onHand));
    return { it, u: unitOf(it), perDay, onHand, weekly: r2(weekly), order, frozen: isFrozen(it) };
  }).filter((x) => x.order > 0).sort((a, b) => b.order - a.order);

  // ---- ความจุโดยประมาณ: ของในตู้ตอนนี้ + ที่จะสั่งเข้ามา (เฉพาะของชั่งกิโล) ----
  let usedN = 0, usedF = 0;
  (items() || []).forEach((it) => {
    if (it.isActive === false) return;
    const onHand = (stockOf(it.id) || {}).qty || 0;
    const k = kgOf(it, onHand);
    if (isFrozen(it)) usedF += k; else usedN += k;
  });
  usedN = r2(usedN); usedF = r2(usedF);
  const pctN = capN > 0 ? Math.min(100, Math.round(usedN / capN * 100)) : 0;
  const pctF = capF > 0 ? Math.min(100, Math.round(usedF / capF * 100)) : 0;

  // ---- ตัวแก้ความจุ ----
  const capInput = (val, onSet, label, ic) => {
    const inp = h("input", { class: "input cap-inp", type: "number", inputmode: "decimal", value: String(val), min: "0", step: "5" });
    inp.addEventListener("change", () => { const v = Math.max(0, Number(inp.value) || 0); onSet(v); paint(root); });
    return h("div", { class: "cap-box" }, cic(ic, 40),
      h("div", { style: { flex: 1, minWidth: 0 } }, h("div", { class: "cap-lbl" }, label),
        h("div", { class: "cap-row" }, inp, h("span", { class: "cap-u" }, "กิโล"))));
  };

  const roundSeg = h("div", { class: "prep-seg round-seg" }, ROUNDS.map((n) =>
    h("button", { type: "button", class: "prep-seg-b" + (rounds === n ? " on" : ""), onClick: () => { saveCfg({ deliveryRounds: n }); paint(root); } },
      n + " รอบ", rounds === n ? pi("check", 13) : null)));

  const usageBar = (label, ic, pct, used, cap, tone) => h("div", { class: "cap-use " + tone },
    h("div", { class: "cap-use-top" }, cic(ic, 30), h("div", null, h("div", { class: "cap-use-lbl" }, label), h("div", { class: "cap-use-pct" }, pct + "%"))),
    h("div", { class: "cap-use-meta" }, "ใช้ไป " + fmtQty(used) + " / " + cap + " กิโล"),
    h("div", { class: "cap-track" }, h("div", { class: "cap-fill", style: { width: pct + "%" } })),
    h("div", { class: "cap-left" }, "เหลือใช้งานได้ " + fmtQty(Math.max(0, r2(cap - used))) + " กิโล"));

  // ---- ตารางสั่งของ ----
  const splitVal = (order) => r2(order / rounds);
  const headCells = [h("div", null, "รายการ"), h("div", { class: "op-r" }, "ต้องสั่งรวม")];
  for (let i = 1; i <= rounds; i++) headCells.push(h("div", { class: "op-r" }, "รอบ " + i));
  const tableRows = list.length ? list.map((x) => {
    const cells = [h("div", { class: "op-name" }, itemIc(x.it, { sm: true }), h("span", null, x.it.name)),
      h("div", { class: "op-r op-tot" }, fmtQty(x.order, x.u), h("s", null, x.u))];
    for (let i = 0; i < rounds; i++) cells.push(h("div", { class: "op-r op-split" }, fmtQty(splitVal(x.order), x.u)));
    return h("div", { class: "op-row", style: { gridTemplateColumns: "minmax(96px,1.4fr) 74px" + " 1fr".repeat(rounds) } }, ...cells);
  }) : [emptyState({ compact: true, iconName: "cart", title: "ของพอใช้ทั้งสัปดาห์", sub: "ยังไม่ต้องสั่งเพิ่ม" })];

  root.replaceChildren(
    hdr({ title: "คำแนะนำการสั่งของ", sub: "คำนวณจากความจุตู้ + รอบส่งที่เลือก", onBack: back, right: h("span", { class: "catic helper-ic-violet" }, pi("cart", 18)) }),
    h("div", { class: "page stack" },
      h("div", { class: "prep-hero" }, chick(66, "wave", { float: true }),
        h("div", { style: { flex: 1, minWidth: 0 } },
          h("div", { class: "prep-hero-k" }, "วางแผนสั่งของ"),
          h("div", { class: "prep-hero-d" }, list.length + " รายการต้องสั่ง"),
          h("div", { class: "prep-hero-meta" }, h("span", { class: "prep-badge" }, rounds + " รอบ/สัปดาห์"), h("span", { class: "prep-badge ok" }, "พอดีความจุ")))),

      h("div", { class: "card" },
        h("div", { class: "rowflex", style: { gap: "7px", marginBottom: "11px" } }, cic("sliders", 20), h("b", { style: { fontSize: "15px", color: "var(--primary-deep)" } }, "ตั้งค่าความจุตู้เย็น")),
        h("div", { class: "cap-grid" },
          capInput(capN, (v) => saveCfg({ fridgeNormal: v }), "ช่องธรรมดา", "fridge"),
          capInput(capF, (v) => saveCfg({ fridgeFreezer: v }), "ช่องแช่แข็ง", "freezer"))),

      h("div", { class: "card" },
        h("div", { class: "rowflex", style: { gap: "7px", marginBottom: "11px" } }, cic("delivery", 20), h("b", { style: { fontSize: "15px", color: "var(--primary-deep)" } }, "จำนวนรอบส่งของต่อสัปดาห์")),
        roundSeg,
        h("div", { style: { fontSize: "11.5px", color: "var(--muted)", marginTop: "9px" } }, "✨ แบ่งของมาส่ง ", bold(rounds + " ครั้ง/สัปดาห์"), " เพื่อให้สต๊อกพอดี ไม่ล้นตู้")),

      h("div", { class: "card cap-usewrap" },
        h("div", { class: "rowflex", style: { gap: "7px", marginBottom: "12px" } }, cic("barchart", 20), h("b", { style: { fontSize: "15px", color: "var(--primary-deep)" } }, "การใช้งานความจุโดยประมาณ")),
        h("div", { class: "cap-use-grid" }, usageBar("ช่องธรรมดา", "fridge", pctN, usedN, capN, "n"), usageBar("ช่องแช่แข็ง", "freezer", pctF, usedF, capF, "f"))),

      h("div", { class: "card", style: { padding: "0", overflow: "hidden" } },
        h("div", { class: "rowflex", style: { gap: "7px", padding: "13px 14px 11px" } }, cic("clipboard", 20), h("b", { style: { fontSize: "15px", color: "var(--primary-deep)", flex: 1 } }, "คำแนะนำการสั่ง (รวมทั้งสัปดาห์)")),
        h("div", { class: "op-table" },
          h("div", { class: "op-head", style: { gridTemplateColumns: "minmax(96px,1.4fr) 74px" + " 1fr".repeat(rounds) } }, ...headCells),
          ...tableRows)),

      note(["คำนวณจากความจุ ช่องธรรมดา ", bold(capN + " กก."), " · แช่แข็ง ", bold(capF + " กก."), " + รอบส่ง ", bold(rounds + " รอบ"), " · ต้องสั่ง = ใช้/วัน×7 − คงเหลือ แล้วแบ่งเท่าๆ กัน"], { iconName: "cart" }),
    ),
  );
}
