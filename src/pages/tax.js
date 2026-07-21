// ============================================================
// pages/tax.js — คำนวณ + วางแผนภาษี (เจ้าของ) · พอร์ตจาก prototype2 TaxScreen
// PIT ขั้นบันได + นิติบุคคล SME + VAT · ดึง default จากข้อมูลจริงในระบบ
// ช่องเลขอัปเดต live (result card) ไม่ repaint → ไม่เสีย focus
// ctx = { back }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag, seg, qtyInput, toggle as toggleEl } from "../components/components.js";
import { fmt, pit, cit, fixedMonthTotal } from "../utils/formulas.js";
import { assume, incomeRows, expenseRows } from "../data/store.js";
import { COST_MODEL } from "../data/seed.js";

const bold = (t) => h("b", null, t);
const num = (v) => parseFloat(String(v).replace(/,/g, "")) || 0;
const SSO_MAX = 9000, LIFE_MAX = 100000;
const realCostPct = () => Math.round(COST_MODEL.varRatio * 100);
const fixedYear = () => fixedMonthTotal * 12;
const actualExpenseOf = (annualRev) => Math.round(annualRev * COST_MODEL.varRatio + fixedYear());
// ค่าเริ่มต้นจากข้อมูลจริง (รายได้/ค่าใช้จ่ายที่บันทึก) — ไม่มี = 0 (กรอกเองได้)
const monthIncomeReal = () => Math.round(incomeRows().reduce((s, r) => s + (r.net != null ? r.net : (r.gross || 0)), 0));
const monthExpenseReal = () => Math.round(expenseRows().reduce((s, r) => s + (r.amount || 0), 0));
// รายได้/ค่าใช้จ่าย "จริง" รายเดือน (YYYY-MM) — ป้อน dropdown เลือกเดือนในหน้าภาษี
const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const _sumByMonth = (rows, val) => { const m = {}; for (const r of rows) { const ym = (r.date || "").slice(0, 7); if (!ym) continue; m[ym] = (m[ym] || 0) + val(r); } return m; };
const incomeByMonth = () => _sumByMonth(incomeRows(), (r) => (r.net != null ? r.net : (r.gross || 0)));
const expenseByMonth = () => _sumByMonth(expenseRows(), (r) => (r.amount || 0));
const monthsWithData = () => [...new Set([...Object.keys(incomeByMonth()), ...Object.keys(expenseByMonth())])].sort();
const thMonthLabel = (ym) => MONTHS_TH[+ym.slice(5) - 1] + " " + String(+ym.slice(0, 4) + 543).slice(-2);

const txt = { tab: "calc", calc: null, plan: null, ctx: null };

export function taxScreen(ctx) {
  txt.ctx = ctx;
  txt.tab = "calc";
  const pd = assume("tax-deduct", 60000);
  const months = monthsWithData();
  const im = incomeByMonth(), em = expenseByMonth();
  const ym = months.length ? months[months.length - 1] : "";
  const inc = ym ? Math.round(im[ym] || 0) : 0;
  const exp = ym ? Math.round(em[ym] || 0) : 0;
  const cActualDefault = exp > 0 ? exp * 12 : actualExpenseOf(inc * 12);
  txt.calc = { m: String(inc), ym: ym || "avg", cMethod: "actual", cActual: String(Math.round(cActualDefault)), cPersonal: String(pd), cSso: String(SSO_MAX), cLife: "0", cDonate: "0" };
  txt.plan = { entity: "person", jdVat: false, gp: "30", period: "month", rev: String(inc), costPct: String(realCostPct()), deduct: "actual", pSso: String(SSO_MAX), pLife: "0", pDonate: "0" };
  const root = h("div", { class: "page-wrap", style: { display: "flex", flexDirection: "column", flex: 1 } });
  paint(root);
  return root;
}

function ln(l, v, c, b) {
  return h("div", { class: "split", style: { padding: "4px 0" } },
    h("span", { style: { fontSize: b ? "13.5px" : "12.5px", fontWeight: b ? 700 : 400, color: b ? "var(--text)" : "var(--muted)" } }, l),
    h("span", { class: "tnum", style: { fontWeight: b ? 800 : 600, fontSize: b ? "15px" : "13px", color: c || "var(--text)" } }, v),
  );
}
function ded(label, hint, value, onChange) {
  return h("div", { class: "split" },
    h("div", { style: { minWidth: 0 } },
      h("div", { style: { fontSize: "13px", fontWeight: 600 } }, label),
      hint && h("div", { style: { fontSize: "10.5px", color: "var(--muted)" } }, hint),
    ),
    h("div", { class: "rowflex", style: { gap: "4px", flex: "none" } }, qtyInput({ value, onChange, wide: true }), h("span", { style: { fontSize: "11.5px", color: "var(--faint)" } }, "บาท")),
  );
}
function bracketRows(parts) {
  if (!parts.length) return [h("div", { style: { fontSize: "12.5px", color: "var(--primary-dark)", fontWeight: 700, padding: "6px 0" } }, "อยู่ในเกณฑ์ยกเว้น — ภาษี ฿0")];
  return parts.map((p) => h("div", { class: "bracket-row" },
    h("span", { class: "rate", style: { color: "var(--warning-ink)" } }, Math.round(p.rate * 100) + "%"),
    h("span", { class: "tnum", style: { fontSize: "11.5px", color: "var(--muted)" } }, "ฐาน ฿" + fmt(Math.round(p.base))),
    h("span", { class: "amt" }, "฿" + fmt(Math.round(p.amt))),
  ));
}
function vatCard(isVat, revAnnual, extra) {
  return h("div", { class: "card split", style: isVat ? { background: "var(--tint-amber)", borderColor: "var(--warning-soft)" } : {} },
    h("div", { class: "rowflex" },
      h("span", { class: "catic sm " + (isVat ? "amber" : "green") }, pi(isVat ? "alert" : "check", 14)),
      h("div", null,
        h("div", { style: { fontSize: "13.5px", fontWeight: 700 } }, extra ? (isVat ? "ต้องจด VAT" : "ยังไม่ต้องจด VAT") : "เกณฑ์ VAT (1.8 ล้าน/ปี)"),
        h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, extra || ("รายได้ปีนี้ ฿" + fmt(revAnnual))),
      ),
    ),
    extra ? tag(isVat ? "มี VAT 7%" : "ปลอด VAT", { kind: isVat ? "warn" : "ok", iconName: isVat ? "alert" : "check" })
          : (isVat ? tag("เกิน — ต้องจด VAT", { kind: "warn", iconName: "alert" }) : tag("ยังไม่ถึง", { kind: "ok", iconName: "check" })),
  );
}

function paint(root) {
  const { back } = txt.ctx;
  const body = txt.tab === "calc" ? buildCalc(root) : buildPlan(root);
  root.replaceChildren(
    hdr({ title: "ภาษี", sub: "คำนวณ + วางแผนภาษี · ดึงข้อมูลจริงจากระบบ", onBack: back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      seg({ value: txt.tab, grow: true, onChange: (v) => { txt.tab = v; paint(root); }, options: [{ v: "calc", t: "คำนวณภาษี", ic: "calc" }, { v: "plan", t: "วางแผนภาษี", ic: "trend" }] }),
      ...body,
    ),
  );
}

/* ---------- คำนวณภาษี ---------- */
function buildCalc(root) {
  const c = txt.calc;
  const incomeHint = h("div", { class: "tnum", style: { fontSize: "11px", color: "var(--faint)", marginTop: "5px" } });
  const resultMount = h("div", {});
  const vatMount = h("div", {});

  const incomeIn = h("input", { type: "text", inputMode: "numeric", class: "input tnum", style: { fontSize: "22px", fontWeight: 700 }, value: c.m });
  incomeIn.addEventListener("input", () => { const s = incomeIn.value.replace(/[^0-9]/g, ""); if (s !== incomeIn.value) incomeIn.value = s; c.m = s; recalc(); });

  const actualIn = qtyInput({ value: c.cActual, onChange: (v) => { c.cActual = v; recalc(); }, wide: true });

  // dropdown เลือกเดือน (ม.ค.–ธ.ค.) — ตั้งรายได้ + ค่าใช้จ่ายตามจริงของเดือนนั้น · ไม่มีข้อมูล = กรอกมือ
  const months = monthsWithData();
  const im = incomeByMonth(), em = expenseByMonth();
  const monthSel = h("select", { class: "input", style: { fontSize: "13px", padding: "8px 10px", width: "100%" } },
    h("option", { value: "avg" }, "เฉลี่ยทุกเดือนที่มีข้อมูล"),
    ...months.map((m) => h("option", { value: m }, thMonthLabel(m) + " · รายได้ ฿" + fmt(Math.round(im[m] || 0)) + " · จ่าย ฿" + fmt(Math.round(em[m] || 0)))),
  );
  monthSel.value = c.ym || "avg";
  monthSel.addEventListener("change", () => {
    const v = monthSel.value; c.ym = v;
    if (v === "avg") {
      const n = months.length || 1;
      c.m = String(Math.round(months.reduce((s, k) => s + (im[k] || 0), 0) / n));
      const ex = Math.round(months.reduce((s, k) => s + (em[k] || 0), 0) / n);
      c.cActual = String(ex > 0 ? ex * 12 : actualExpenseOf(num(c.m) * 12));
    } else {
      c.m = String(Math.round(im[v] || 0));
      const ex = Math.round(em[v] || 0);
      c.cActual = String(ex > 0 ? ex * 12 : actualExpenseOf(num(c.m) * 12));
    }
    paint(root);
  });

  function recalc() {
    const cAnnual = num(c.m) * 12;
    incomeHint.textContent = "= ทั้งปี ฿" + fmt(cAnnual) + " · ค่าเริ่มต้นจากรายได้เดือนนี้";
    const cExpense = c.cMethod === "lump" ? cAnnual * 0.6 : num(c.cActual);
    const cNet = Math.max(0, cAnnual - cExpense);
    const cSsoUse = Math.min(num(c.cSso), SSO_MAX);
    const cLifeUse = Math.min(num(c.cLife), LIFE_MAX);
    const cDeduct = num(c.cPersonal) + cSsoUse + cLifeUse + num(c.cDonate);
    const cTaxable = Math.max(0, cNet - cDeduct);
    const { tax, parts } = pit(cTaxable);
    const vat = cAnnual > 1800000;

    const lines = [
      ln("รายได้ทั้งปี (×12)", "฿" + fmt(cAnnual)),
      ln(c.cMethod === "lump" ? "หักค่าใช้จ่ายเหมา 60%" : "หักค่าใช้จ่ายตามจริง", "−฿" + fmt(Math.round(cExpense))),
      ln("ลดหย่อนส่วนตัว", "−฿" + fmt(num(c.cPersonal))),
      ln("ประกันสังคม", "−฿" + fmt(cSsoUse)),
    ];
    if (cLifeUse > 0) lines.push(ln("ประกันชีวิต", "−฿" + fmt(cLifeUse)));
    if (num(c.cDonate) > 0) lines.push(ln("เงินบริจาค", "−฿" + fmt(num(c.cDonate))));

    resultMount.replaceChildren(
      h("div", { class: "overline", style: { color: "#92560B" } }, "ภาษีที่ต้องเสีย / ปี"),
      h("div", { class: "big-num", style: { fontSize: "27px", color: "var(--warning-ink)", margin: "2px 0 10px" } }, "฿" + fmt(Math.round(tax))),
      ...lines,
      h("div", { class: "hr" }),
      ln("เงินได้สุทธิ (ฐานภาษี)", "฿" + fmt(Math.round(cTaxable)), null, true),
      h("div", { class: "overline", style: { margin: "10px 0 4px" } }, "ภาษีขั้นบันได"),
      ...bracketRows(parts),
      h("div", { class: "hr" }),
      ln("รวมภาษี / ปี", "฿" + fmt(Math.round(tax)), "var(--warning-ink)", true),
      ln("เฉลี่ยกันไว้ / เดือน", "฿" + fmt(Math.round(tax / 12)), "var(--warning-ink)"),
    );
    vatMount.replaceChildren(vatCard(vat, cAnnual));
  }

  const methodSeg = seg({ value: c.cMethod, grow: true, onChange: (v) => { c.cMethod = v; paint(root); }, options: [{ v: "lump", t: "เหมา 60%" }, { v: "actual", t: "ตามจริง (จากระบบ)" }] });

  const actualCard = c.cMethod === "actual"
    ? h("div", { class: "card stack", style: { gap: "9px" } },
        h("div", { class: "split" },
          h("div", { style: { minWidth: 0 } }, h("div", { style: { fontSize: "13px", fontWeight: 700 } }, "ค่าใช้จ่ายตามจริง / ปี"), h("div", { style: { fontSize: "10.5px", color: "var(--muted)" } }, "ดึงจากต้นทุนจริงในระบบ · แก้ได้")),
          h("div", { class: "rowflex", style: { gap: "4px", flex: "none" } }, actualIn, h("span", { style: { fontSize: "11.5px", color: "var(--faint)" } }, "บาท")),
        ),
        h("div", { class: "hr", style: { margin: 0 } }),
        ln("ต้นทุนผันแปร (" + realCostPct() + "% ของยอดขาย)", "฿" + fmt(Math.round(num(c.m) * 12 * COST_MODEL.varRatio))),
        ln("ต้นทุนคงที่ทั้งปี (เช่า/แรง/ไฟ)", "฿" + fmt(fixedYear())),
        h("button", { type: "button", class: "chip", style: { alignSelf: "flex-start", color: "var(--muted)" }, onClick: () => { c.cActual = String(actualExpenseOf(num(c.m) * 12)); paint(root); } }, pi("refresh", 12), "ดึงค่าจากระบบใหม่ (฿" + fmt(actualExpenseOf(num(c.m) * 12)) + ")"),
      )
    : note("เหมา 60% — หักค่าใช้จ่ายแบบเหมาตามมาตรา 40(8) โดยไม่ต้องมีหลักฐานค่าใช้จ่าย");

  const out = [
    note([h("span", null, "ทุกช่องตั้ง"), bold("ค่าเริ่มต้นจากข้อมูลจริงในระบบ"), "แล้ว — รายได้ · ค่าใช้จ่ายตามจริง · ลดหย่อน แก้ทับได้ทุกช่อง"], { iconName: "wallet" }),
    h("div", { class: "card" },
      months.length
        ? h("div", { style: { marginBottom: "10px" } },
            h("div", { style: { fontSize: "12px", fontWeight: 600, color: "var(--muted)", marginBottom: "6px" } }, "เลือกเดือน (ดึงรายได้ + ค่าใช้จ่ายจริงของเดือนนั้น)"),
            monthSel)
        : note("ยังไม่มีข้อมูลรายเดือนในระบบ — กรอกรายได้/ค่าใช้จ่ายเองด้านล่างได้"),
      h("div", { style: { fontSize: "12px", fontWeight: 600, color: "var(--muted)", marginBottom: "6px" } }, "รายได้ / เดือน (ดึงจากระบบ · แก้ได้)"),
      h("div", { class: "rowflex", style: { gap: "8px" } }, incomeIn, h("span", { style: { fontSize: "13px", color: "var(--muted)", flex: "none" } }, "บาท")),
      incomeHint,
    ),
    h("div", { class: "overline" }, "หักค่าใช้จ่าย"),
    methodSeg,
    actualCard,
    h("div", { class: "overline" }, "ค่าลดหย่อน"),
    h("div", { class: "card stack", style: { gap: "12px" } },
      ded("ลดหย่อนส่วนตัว", "ค่าเริ่มต้นจากระบบ (assumption)", c.cPersonal, (v) => { c.cPersonal = v; recalc(); }),
      h("div", { class: "hr", style: { margin: 0 } }),
      ded("ประกันสังคม", "สูงสุด " + fmt(SSO_MAX) + "/ปี", c.cSso, (v) => { c.cSso = v; recalc(); }),
      h("div", { class: "hr", style: { margin: 0 } }),
      ded("ประกันชีวิต", "เพดาน " + fmt(LIFE_MAX), c.cLife, (v) => { c.cLife = v; recalc(); }),
      h("div", { class: "hr", style: { margin: 0 } }),
      ded("เงินบริจาค", "หักได้ตามจ่ายจริง", c.cDonate, (v) => { c.cDonate = v; recalc(); }),
    ),
    h("div", { class: "card soft-card soft-amber" }, resultMount),
    vatMount,
    note([h("span", null, "ลดหย่อนส่วนตัว · % เหมา · เกณฑ์ VAT ดึงจาก "), bold("ปรับค่า assumption"), " · ค่าใช้จ่ายตามจริงดึงจาก", bold("ต้นทุนจริง"), "ในระบบ"]),
  ];
  recalc();
  return out;
}

/* ---------- วางแผนภาษี ---------- */
function buildPlan(root) {
  const p = txt.plan;
  const isPerson = () => p.entity === "person" || p.entity === "partner";
  const revHint = h("div", { class: "tnum", style: { fontSize: "11px", color: "var(--faint)", marginTop: "5px" } });
  const gpEffSpan = h("b", { class: "tnum" });
  const resultMount = h("div", {});
  const vatMount = h("div", {});

  const revIn = h("input", { type: "text", inputMode: "numeric", class: "input tnum", style: { fontSize: "18px", fontWeight: 700 }, value: p.rev });
  revIn.addEventListener("input", () => { const s = revIn.value.replace(/[^0-9]/g, ""); if (s !== revIn.value) revIn.value = s; p.rev = s; recalc(); });

  function recalc() {
    const annualRev = p.period === "month" ? num(p.rev) * 12 : num(p.rev);
    revHint.textContent = "= ทั้งปี ฿" + fmt(annualRev) + " · ค่าเริ่มต้นจากรายได้เดือนนี้";
    gpEffSpan.textContent = (num(p.gp) + 7) + "%";
    const gpEff = num(p.gp) + 7;
    const pSsoUse = Math.min(num(p.pSso), SSO_MAX);
    const pLifeUse = Math.min(num(p.pLife), LIFE_MAX);
    let planTaxable, planTax, planParts, expense, deduction, profit;
    if (isPerson()) {
      expense = p.deduct === "lump" ? annualRev * 0.6 : annualRev * (num(p.costPct) / 100);
      const net = annualRev - expense;
      deduction = p.entity === "partner" ? 120000 : 60000;
      planTaxable = Math.max(0, net - deduction - (pSsoUse + pLifeUse + num(p.pDonate)));
      const r = pit(planTaxable); planTax = r.tax; planParts = r.parts;
    } else {
      profit = annualRev * (1 - num(p.costPct) / 100);
      const r = cit(profit); planTax = r.tax; planParts = r.parts; planTaxable = Math.max(0, profit);
    }
    const mustVat = p.jdVat || annualRev > 1800000;

    const lines = [];
    if (isPerson()) {
      lines.push(ln("รายได้ทั้งปี", "฿" + fmt(annualRev)));
      lines.push(ln(p.deduct === "lump" ? "หักค่าใช้จ่ายเหมา 60%" : "หักต้นทุนตามจริง " + p.costPct + "%", "−฿" + fmt(Math.round(expense))));
      lines.push(ln("หักลดหย่อน (" + (p.entity === "partner" ? "หสม." : "บุคคล") + ")", "−฿" + fmt(deduction)));
      if (pSsoUse > 0) lines.push(ln("ประกันสังคม", "−฿" + fmt(pSsoUse)));
      if (pLifeUse > 0) lines.push(ln("ประกันชีวิต", "−฿" + fmt(pLifeUse)));
      if (num(p.pDonate) > 0) lines.push(ln("เงินบริจาค", "−฿" + fmt(num(p.pDonate))));
      lines.push(h("div", { class: "hr" }), ln("เงินได้สุทธิ", "฿" + fmt(Math.round(planTaxable)), null, true));
    } else {
      lines.push(ln("รายได้ทั้งปี", "฿" + fmt(annualRev)));
      lines.push(ln("หักต้นทุน " + p.costPct + "%", "−฿" + fmt(Math.round(annualRev - profit))));
      lines.push(h("div", { class: "hr" }), ln("กำไรสุทธิ (ฐานภาษี)", "฿" + fmt(Math.round(profit)), null, true));
    }

    resultMount.replaceChildren(
      h("div", { class: "overline", style: { color: "#92560B" } }, "ผลประมาณการภาษี/ปี"),
      h("div", { class: "big-num", style: { fontSize: "27px", color: "var(--warning-ink)", margin: "2px 0 10px" } }, "฿" + fmt(Math.round(planTax))),
      ...lines,
      h("div", { class: "overline", style: { margin: "10px 0 4px" } }, isPerson() ? "ภาษีขั้นบันได" : "ภาษีนิติบุคคล (SME)"),
      ...bracketRows(planParts),
      h("div", { class: "hr" }),
      ln("รวมภาษีที่ต้องเสีย/ปี", "฿" + fmt(Math.round(planTax)), "var(--warning-ink)", true),
      ln("เฉลี่ยกันไว้/เดือน", "฿" + fmt(Math.round(planTax / 12)), "var(--warning-ink)"),
    );
    vatMount.replaceChildren(vatCard(mustVat, annualRev, "รายได้ ฿" + fmt(annualRev) + "/ปี · GP จริง " + gpEff + "%"));
  }

  const ENT = [{ v: "person", nm: "บุคคล", sub: "ลดหย่อน 60,000" }, { v: "partner", nm: "หสม.", sub: "ลดหย่อน 120,000" }, { v: "corp", nm: "นิติบุคคล", sub: "15% / 20%" }];
  const entTypes = h("div", { class: "tax-types" }, ENT.map((e) => h("button", { type: "button", class: "tax-type" + (p.entity === e.v ? " on" : ""), onClick: () => { p.entity = e.v; paint(root); } },
    h("div", { class: "tt-nm" }, e.nm), h("div", { class: "tt-sub" }, e.sub))));

  const gpIn = qtyInput({ value: p.gp, onChange: (v) => { p.gp = v; recalc(); } });
  const costIn = qtyInput({ value: p.costPct, onChange: (v) => { p.costPct = v; recalc(); } });
  const mustVatNow = p.jdVat || (p.period === "month" ? num(p.rev) * 12 : num(p.rev)) > 1800000;

  const setupCard = h("div", { class: "card stack", style: { gap: "12px" } },
    h("div", { class: "split" },
      h("div", { style: { minWidth: 0 } }, h("div", { style: { fontSize: "13.5px", fontWeight: 700 } }, "2 · จด VAT"), h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, "เกิน 1.8 ล้าน/ปี ต้องจดอัตโนมัติ")),
      toggleEl(mustVatNow, () => { p.jdVat = !p.jdVat; paint(root); }),
    ),
    h("div", { class: "hr", style: { margin: 0 } }),
    h("div", { class: "split" },
      h("div", { style: { minWidth: 0 } }, h("div", { style: { fontSize: "13.5px", fontWeight: 700 } }, "3 · GP เฉลี่ย"), h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, "ใส่ GP เท่าไหร่ ระบบ +7% (VAT) ให้ = ", gpEffSpan)),
      h("div", { class: "rowflex", style: { gap: "4px" } }, gpIn, h("span", { style: { fontSize: "12px", color: "var(--faint)" } }, "%")),
    ),
    h("div", { class: "hr", style: { margin: 0 } }),
    h("div", null,
      h("div", { class: "split", style: { marginBottom: "7px" } }, h("div", { style: { fontSize: "13.5px", fontWeight: 700 } }, "4 · คาดการณ์รายได้"), seg({ value: p.period, onChange: (v) => { p.period = v; paint(root); }, options: [{ v: "month", t: "/เดือน" }, { v: "year", t: "/ปี" }] })),
      h("div", { class: "rowflex", style: { gap: "8px" } }, revIn, h("span", { style: { fontSize: "12px", color: "var(--muted)", flex: "none" } }, "บาท")),
      revHint,
    ),
    h("div", { class: "hr", style: { margin: 0 } }),
    h("div", { class: "split" },
      h("div", { style: { minWidth: 0 } }, h("div", { style: { fontSize: "13.5px", fontWeight: 700 } }, "5 · ต้นทุนคิดเป็น %"), h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, "ค่า default จากการคำนวณจริง = " + realCostPct() + "%")),
      h("div", { class: "rowflex", style: { gap: "4px" } }, costIn, h("span", { style: { fontSize: "12px", color: "var(--faint)" } }, "%")),
    ),
    isPerson() && h("div", { class: "hr", style: { margin: 0 } }),
    isPerson() && h("div", null,
      h("div", { style: { fontSize: "13.5px", fontWeight: 700, marginBottom: "7px" } }, "6 · หักค่าใช้จ่าย"),
      seg({ value: p.deduct, grow: true, onChange: (v) => { p.deduct = v; paint(root); }, options: [{ v: "lump", t: "เหมา 60%" }, { v: "actual", t: "ตามจริง (" + p.costPct + "%)" }] }),
    ),
  );

  const dedCard = isPerson() ? [
    h("div", { class: "overline" }, "7 · ค่าลดหย่อนอื่น (จากระบบ · แก้ได้)"),
    h("div", { class: "card stack", style: { gap: "12px" } },
      ded("ประกันสังคม", "สูงสุด " + fmt(SSO_MAX) + "/ปี", p.pSso, (v) => { p.pSso = v; recalc(); }),
      h("div", { class: "hr", style: { margin: 0 } }),
      ded("ประกันชีวิต", "เพดาน " + fmt(LIFE_MAX), p.pLife, (v) => { p.pLife = v; recalc(); }),
      h("div", { class: "hr", style: { margin: 0 } }),
      ded("เงินบริจาค", "หักได้ตามจ่ายจริง", p.pDonate, (v) => { p.pDonate = v; recalc(); }),
    ),
  ] : [];

  const out = [
    note([h("span", null, "ทุกช่องตั้ง"), bold("ค่าเริ่มต้นจากข้อมูลจริงในระบบ"), " (รายได้ · ต้นทุน · ลดหย่อน) — ปรับสมมติฐานเพื่อเทียบรูปแบบจ้าง/จดทะเบียนก่อนตัดสินใจ"], { iconName: "trend" }),
    h("div", { class: "overline" }, "1 · รูปแบบผู้เสียภาษี"),
    entTypes,
    setupCard,
    ...dedCard,
    h("div", { class: "card soft-card soft-amber" }, resultMount),
    vatMount,
    note([bold("ประมาณการเบื้องต้น"), " — ลดหย่อนเพิ่มได้อีก (บุตร · พ่อแม่ · กองทุน RMF/SSF) · เช็คกับนักบัญชีก่อนยื่นจริง"], { amber: true }),
  ];
  recalc();
  return out;
}
