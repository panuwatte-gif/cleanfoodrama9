// ============================================================
// pages/finstatement.js — งบการเงิน รายเดือน/ไตรมาส/ปี + Cashflow (เจ้าของ)
// P&L accrual จากไฟล์ transaction จริง · cashflow จากเงินโอนเข้าธนาคารจริง
// ตัวเลขทั้งหมดมาจาก finStatementService — หน้านี้แสดงผลอย่างเดียว
// ============================================================
import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, seg, tag } from "../components/components.js";
import { fmt } from "../utils/formulas.js";
import { lineChart } from "../components/charts.js";
import { plMonth, plSum, monthList, quarterOf, monthsOfQuarter, cashflowMonth, bankBalanceSeries, yearTax, fixForMonth } from "../services/finStatementService.js";
import { thaiMonth } from "../services/grabReportService.js";

const money = (v) => (v < 0 ? "−฿" + fmt(Math.abs(Math.round(v))) : "฿" + fmt(Math.round(v)));
function ln(l, v, { c, b, indent, prevV } = {}) {
  let cmp = null;
  if (prevV != null && prevV !== 0) {
    const chg = Math.round((v - prevV) / Math.abs(prevV) * 100);
    cmp = h("span", { class: "tnum", style: { fontSize: "10.5px", color: chg >= 0 ? "#2E7D4F" : "var(--danger,#C24040)", marginLeft: "6px" } }, (chg >= 0 ? "+" : "") + chg + "%");
  }
  return h("div", { class: "split", style: { padding: "4px 0", paddingLeft: indent ? "12px" : 0 } },
    h("span", { style: { fontSize: b ? "13px" : "12.5px", fontWeight: b ? 800 : 500, color: b ? "var(--text)" : "var(--muted)" } }, l),
    h("span", null, h("span", { class: "tnum", style: { fontWeight: b ? 800 : 600, fontSize: b ? "14px" : "12.5px", color: c || "var(--text)" } }, money(v)), cmp));
}
const rule = (heavy) => h("hr", { class: "hr", style: { margin: "6px 0", borderTopWidth: heavy ? "2px" : "1px", borderColor: heavy ? "var(--text)" : undefined } });

export function finStatementScreen({ back, go } = {}) {
  const yms = monthList();
  const state = { mode: "month", pick: yms[yms.length - 1] };
  const body = h("div", { class: "stack", style: { gap: "10px" } });

  function options() {
    if (state.mode === "month") return yms.map((m) => ({ v: m, t: thaiMonth(m) }));
    if (state.mode === "quarter") { const qs = [...new Set(yms.map(quarterOf))]; return qs.map((q) => ({ v: q, t: q.replace("2026-", "") + "/69" })); }
    return [{ v: "2026", t: "ปี 2569" }];
  }
  function currentPL() {
    if (state.mode === "month") return { cur: plSum([state.pick]), prev: plSum([yms[yms.indexOf(state.pick) - 1]].filter(Boolean)), label: thaiMonth(state.pick) };
    if (state.mode === "quarter") {
      const qs = [...new Set(yms.map(quarterOf))]; const i = qs.indexOf(state.pick);
      return { cur: plSum(monthsOfQuarter(state.pick).filter((m) => yms.includes(m))), prev: i > 0 ? plSum(monthsOfQuarter(qs[i - 1]).filter((m) => yms.includes(m))) : null, label: state.pick.replace("2026-", "ไตรมาส ").replace("Q", "") + " ปี 69" };
    }
    return { cur: plSum(yms), prev: null, label: "ปี 2569 (ก.พ. – ก.ค.)" };
  }

  function repaint() {
    const { cur, prev, label } = currentPL();
    const p = (k) => (prev ? prev[k] : null);
    // cashflow เฉพาะโหมดเดือน (โอนจริงมีเป็นช่วง)
    const cf = state.mode === "month" ? cashflowMonth(state.pick) : null;
    const balSeries = bankBalanceSeries();
    const kids = [
      // ตัวเลือกโหมดอยู่ใน repaint — highlight ขยับตาม state ทุกครั้ง (K8)
      seg({ value: state.mode, grow: true, options: [{ v: "month", t: "รายเดือน" }, { v: "quarter", t: "ไตรมาส" }, { v: "year", t: "ทั้งปี" }], onChange: (v) => { state.mode = v; state.pick = v === "month" ? yms[yms.length - 1] : v === "quarter" ? quarterOf(yms[yms.length - 1]) : "2026"; repaint(); } }),
      h("div", { class: "chip-tabs", style: { flexWrap: "wrap" } },
        options().map((o) => h("button", { type: "button", class: "chip" + (state.pick === o.v ? " active" : ""), onClick: () => { state.pick = o.v; repaint(); } }, o.t))),
      !cur ? note("ยังไม่มีข้อมูลช่วงนี้", { amber: true }) : h("div", { class: "card", style: { padding: "16px 17px" } },
        h("div", { class: "split", style: { alignItems: "flex-start" } },
          h("div", null,
            h("div", { style: { fontWeight: 800, fontSize: "15.5px" } }, "งบกำไรขาดทุน (P&L)"),
            h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, label + " · " + fmt(cur.orders) + " ออเดอร์" + (prev ? " · เทียบช่วงก่อนหน้า" : ""))),
          cur.real ? tag("จากไฟล์จริง", { kind: "ok" }) : tag("ประมาณการ", { kind: "warn" })),
        rule(true),
        ln("ยอดขายสุทธิ (อาหาร)", cur.ns, { b: true, prevV: p("ns") }),
        ln("ค่าธรรมเนียม GP + VAT + คอมมิชชัน", -cur.perOrderFee, { indent: true, prevV: prev ? -prev.perOrderFee : null }),
        ln("ค่าโฆษณา (Ads)", -cur.ads, { indent: true, prevV: prev ? -prev.ads : null }),
        cur.adj !== 0 && ln("การตลาด / ปรับยอด", -cur.adj, { indent: true }),
        rule(),
        ln("เงินเข้าจากแพลตฟอร์ม", cur.platformIn, { b: true, c: "#2E6BB0", prevV: p("platformIn") }),
        ln("ต้นทุนอาหารจ่ายจริง (" + fmt(cur.orders) + " × ฿63 · รวมของหายแล้ว)", -cur.food, { indent: true }),
        ln("ข้าว + แพ็กเกจ (× ฿13)", -cur.ricePack, { indent: true }),
        ln("มื้อพนักงาน", -cur.staffMeal, { indent: true }),
        ln("Fix cost ของช่วงนั้น (เช่า·แรง·อื่นๆ)", -cur.fix, { indent: true }),
        rule(true),
        ln("กำไรก่อนภาษี", cur.ebt, { b: true, c: cur.ebt >= 0 ? "var(--primary-dark,#2E7D4F)" : "var(--danger,#C24040)", prevV: p("ebt") }),
        // memo เปรียบเทียบ (K1): ของหายอยู่ใน ฿63 แล้ว — ไม่หักซ้ำ แค่โชว์ให้เห็นโอกาส
        h("div", { style: { marginTop: "8px", padding: "9px 11px", borderRadius: "11px", background: "#F6F9F6", border: "1px dashed var(--border)" } },
          h("div", { style: { fontSize: "11px", fontWeight: 700, color: "var(--muted)" } }, "📌 memo เปรียบเทียบ — ไม่ใช่ตัวหัก (ของหายรวมในต้นทุนจ่ายจริงข้างบนแล้ว)"),
          h("div", { class: "split", style: { padding: "3px 0 0" } },
            h("span", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "เทียบ: ต้นทุนตามยอดขาย (ถ้าไม่มีของหาย " + cur.lossPct + "%)"),
            h("span", { class: "tnum", style: { fontSize: "11.5px", fontWeight: 700 } }, money(-cur.memoFoodUsed))),
          h("div", { class: "split", style: { padding: "2px 0 0" } },
            h("span", { style: { fontSize: "11.5px", color: "var(--danger,#C24040)" } }, "→ โอกาสประหยัดถ้าคุมของหายได้"),
            h("span", { class: "tnum", style: { fontSize: "11.5px", fontWeight: 700, color: "var(--danger,#C24040)" } }, money(cur.memoLoss)))),
      ),
      // K7: ภาษีขั้นบันได — โชว์เฉพาะโหมด "ทั้งปี"
      state.mode === "year" && cur && (() => {
        const tx = yearTax(yms); if (!tx) return null;
        return h("div", { class: "card", style: { padding: "16px 17px" } },
          h("div", { class: "split" },
            h("div", { style: { fontWeight: 800, fontSize: "14.5px" } }, "🧾 ภาษีประมาณการทั้งปี · " + tx.form),
            tag("ประมาณการ", { kind: "warn" })),
          h("div", { style: { fontSize: "11.5px", color: "var(--muted)", margin: "3px 0 8px" } }, tx.note + " · เปลี่ยนรูปแบบกิจการได้ที่ ตั้งค่ารายงาน Grab"),
          ln("เงินได้พึงประเมิน (ยอดขายสุทธิ)", tx.revenue, { b: true }),
          tx.lumpExpense != null && ln("หักค่าใช้จ่ายเหมา 60%", -tx.lumpExpense, { indent: true }),
          tx.deduction != null && ln("ลดหย่อน", -tx.deduction, { indent: true }),
          rule(),
          ln("เงินได้สุทธิที่ต้องเสียภาษี", tx.taxable, { b: true }),
          ln("ภาษีตามขั้นบันได", -tx.tax, { b: true, c: tx.tax > 0 ? "#9A6A00" : "var(--primary-dark,#2E7D4F)" }),
          ln("กำไรหลังภาษี (ประมาณ)", cur.ebt - tx.tax, { b: true, c: (cur.ebt - tx.tax) >= 0 ? "var(--primary-dark,#2E7D4F)" : "var(--danger,#C24040)" }),
        );
      })(),
      cf && h("div", { class: "card", style: { padding: "16px 17px" } },
        h("div", { style: { fontWeight: 800, fontSize: "14.5px" } }, "💧 Cashflow (เงินสดจริง) · " + thaiMonth(cf.ym)),
        h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", margin: "10px 0" } },
          [["Grab จ่ายเข้าบัญชี", cf.cashIn, "#2E7D4F", "#DFF0E6", "ยอดจ่ายจากออเดอร์จริง"],
           ["จ่ายจริง", -cf.cashOut, "#9A6A00", "#FFF3D6", "ค่าอาหาร+fix+มื้อพนง."],
           ["เงินสดสุทธิเดือนนี้", cf.net, cf.net >= 0 ? "#2E7D4F" : "#B3402A", cf.net >= 0 ? "#DFF0E6" : "#FBE9E7", cf.net >= 0 ? "เข้ามากกว่าจ่าย" : "จ่ายมากกว่าเข้า"]].map(([l, v, ink, bg, sub]) =>
            h("div", { style: { borderRadius: "13px", background: bg, padding: "9px 11px" } },
              h("div", { style: { fontSize: "10.5px", fontWeight: 700, color: ink, opacity: .8 } }, l),
              h("div", { class: "tnum", style: { fontSize: "16px", fontWeight: 800, color: ink } }, money(v)),
              sub && h("div", { style: { fontSize: "9.5px", color: ink, opacity: .6 } }, sub)))),
        // ยอดคงเหลือปลายเดือน (ยึดยอดจริงในบัญชี)
        h("div", { class: "split", style: { alignItems: "center", padding: "10px 12px", borderRadius: "13px", background: "#EEF5FC", border: "1px solid #D8E7F5" } },
          h("div", null,
            h("div", { style: { fontSize: "11.5px", fontWeight: 700, color: "#2E6BB0" } }, "เงินคงเหลือปลายเดือน (ประมาณ)"),
            h("div", { style: { fontSize: "10px", color: "var(--faint)" } }, "ต้นเดือน " + money(cf.startBalance) + " → ปลายเดือน")),
          h("span", { class: "tnum", style: { fontWeight: 800, fontSize: "19px", color: cf.endBalance >= 0 ? "#2E6BB0" : "#B3402A" } }, money(cf.endBalance))),
        cf.foodEstimated && note("เดือนนี้ยังไม่ได้บันทึกยอด 'จ่ายค่าอาหารจริง' — ใช้ประมาณจากยอดขาย (฿63/ออเดอร์) ไปก่อน", { amber: true }),
        balSeries.length > 1 && h("div", { style: { marginTop: "8px" } },
          h("div", { style: { fontSize: "12px", fontWeight: 700, color: "var(--muted)", marginBottom: "3px" } }, "เงินคงเหลือปลายเดือน (ยึดยอดจริง " + (cf.anchorLabel ? "ณ " + (+cf.anchorLabel.slice(8)) + " " + thaiMonth(cf.anchorLabel.slice(0, 7)) : "") + ")"),
          lineChart(balSeries, { color: "#3F86D6", h: 96 })),
        rule(),
        h("div", { style: { fontSize: "11px", color: "var(--faint)" } }, "เงินสดใช้เกณฑ์ 'จ่ายจริง' — เดือนที่ซื้อของเข้าสต๊อกก้อนใหญ่ กระแสเงินสดอาจติดลบชั่วคราวได้ แต่ยอดคงเหลือยังยึดยอดจริงในบัญชี"),
      ),
      note(["ตัวเลขทุกเดือนมาจากไฟล์ transaction จริง (19 ม.ค. – 18 ก.ค.) · ต้นทุนอาหาร ฿63/ออเดอร์ = เงินจ่ายจริงรวมของหายแล้ว (ไม่หักซ้ำ) · fix cost/ภาษี แก้ได้ที่ ", h("b", null, "ตั้งค่ารายงาน Grab")], { iconName: "info" }),
    ].filter(Boolean);
    body.replaceChildren(...kids); // กรอง falsy ออก — replaceChildren ของ DOM จะพิมพ์ "null"/"false" เป็นข้อความ
  }

  repaint();
  return h("div", { class: "page-wrap", "data-screen-label": "finstatement" },
    hdr({ title: "งบการเงิน & Cashflow", sub: "เห็นเฉพาะเจ้าของ", onBack: back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    h("div", { class: "page stack", style: { paddingBottom: "16px" } }, body),
  );
}
