// ============================================================
// pages/execsummary.js — สรุปผู้บริหาร (เจ้าของ)
// อ่านจาก "ของจริง" (income/expense → Supabase) · ส่ง LINE จริง + รายงานผลจริง
// ctx = { back, toast, go, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag } from "../components/components.js";
import { fmt } from "../utils/formulas.js";
import { TODAY } from "../data/seed.js";
import { incomeRows, expenseRows } from "../data/store.js";
import { sendLineReport } from "../services/reportService.js";

const bold = (t) => h("b", null, t);

function ln(l, v, c, b) {
  return h("div", { class: "split", style: { padding: "3px 0" } },
    h("span", { style: { fontSize: b ? "13.5px" : "12.5px", fontWeight: b ? 700 : 400, color: b ? "var(--text)" : "var(--muted)" } }, l),
    h("span", { class: "tnum", style: { fontWeight: b ? 800 : 600, fontSize: b ? "14.5px" : "13px", color: c || "var(--text)" } }, v),
  );
}
const sec = (t) => h("div", { class: "overline", style: { borderBottom: "1.5px solid var(--text)", paddingBottom: "4px", margin: "10px 0 6px", color: "var(--text)" } }, t);
function kpi(l, v, c, soft, lock) {
  return h("div", { style: { border: "1px solid", borderColor: soft ? "#EDDFB8" : "var(--border-soft)", background: soft ? "#FDFBF4" : "var(--bg)", borderRadius: "12px", padding: "8px 11px" } },
    h("div", { class: "overline", style: { fontSize: "10px", color: soft ? "#9A7A2E" : undefined } }, l, " ", lock && pi("lock", 9)),
    h("div", { class: "big-num", style: { fontSize: "18px", color: c || "var(--text)", marginTop: "2px" } }, v),
  );
}

// รวมยอดตาม key (ช่องทาง/หมวด) → [[name, total], ...] เรียงมาก→น้อย
function groupSum(rows, keyField, valField) {
  const m = {};
  for (const r of rows) {
    const k = r[keyField] || "อื่นๆ";
    m[k] = (m[k] || 0) + (Number(r[valField]) || 0);
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

export function execSummaryScreen({ back, toast, go, shopCtx } = {}) {
  const store = shopCtx ? shopCtx.shop : "ร้าน";
  const inc = incomeRows(), exp = expenseRows();
  const hasData = inc.length > 0 || exp.length > 0;

  const income = inc.reduce((s, r) => s + (Number(r.gross) || 0), 0);
  const incomeNet = inc.reduce((s, r) => s + (Number(r.net) || 0), 0);
  const expense = exp.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const net = incomeNet - expense;
  const netStr = (net >= 0 ? "+฿" : "−฿") + fmt(Math.abs(net));

  const byCh = groupSum(inc, "ch", "gross");
  const byCat = groupSum(exp, "cat", "amount");

  const now = new Date();
  const hhmm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  const monthLabel = TODAY.mon + " " + TODAY.be;

  // ---- ข้อความที่จะส่งเข้า LINE (จากของจริง) ----
  function summaryText() {
    const out = [
      "ยอดขาย ฿" + fmt(income) + " · ค่าใช้จ่าย ฿" + fmt(expense) + " · สุทธิ " + netStr,
    ];
    if (byCh.length) out.push("รายได้: " + byCh.map(([k, v]) => k + " ฿" + fmt(v)).join(" · "));
    if (byCat.length) out.push("ค่าใช้จ่าย: " + byCat.map(([k, v]) => k + " ฿" + fmt(v)).join(" · "));
    return out.join("\n");
  }

  // ---- ปุ่มส่ง LINE (ส่งจริง + รายงานผลจริง) ----
  const sendBtn = h("button", { type: "button", class: "btn btn-primary" }, pi("send", 15), "ส่ง LINE");
  sendBtn.addEventListener("click", async () => {
    if (sendBtn.disabled) return;
    if (!hasData) { toast("ยังไม่มีข้อมูลให้ส่ง — บันทึกรายได้/ค่าใช้จ่ายก่อน", "err"); return; }
    sendBtn.disabled = true;
    sendBtn.replaceChildren(pi("send", 15), document.createTextNode("กำลังส่ง…"));
    const res = await sendLineReport({ title: "สรุปผู้บริหาร · " + store, text: summaryText(), shop: store, by: "เจ้าของ" });
    if (res.ok) toast("ส่งสรุปเข้ากลุ่ม LINE แล้ว ✓");
    else if (res.skipped) toast("ยังไม่ได้ตั้งค่า LINE — ใส่ค่าใน Supabase ก่อน", "err");
    else toast("ส่งไม่สำเร็จ: " + (res.error || "เครือข่าย"), "err");
    sendBtn.disabled = false;
    sendBtn.replaceChildren(pi("send", 15), document.createTextNode("ส่ง LINE"));
  });

  const soon = (label) => h("div", { class: "split", style: { padding: "3px 0" } },
    h("span", { style: { fontSize: "12.5px", color: "var(--muted)" } }, label),
    h("span", { style: { fontSize: "11.5px", color: "var(--faint)" } }, "— กำลังต่อข้อมูลจริง"));

  return h("div", { class: "page-wrap", "data-screen-label": "execsummary", style: { display: "flex", flexDirection: "column", flex: 1 } },
    hdr({ title: "สรุปผู้บริหาร", sub: monthLabel, onBack: back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } },
        h("button", { type: "button", class: "btn", onClick: () => window.print() }, pi("print", 15), "ปริ้น"),
        sendBtn,
        h("button", { type: "button", class: "btn", onClick: () => go({ name: "export" }) }, pi("cloud", 15), "Backup"),
        h("button", { type: "button", class: "btn", onClick: () => go({ name: "export" }) }, pi("download", 15), "โหลด"),
      ),
      !hasData && note("ยังไม่มีข้อมูลรายได้/ค่าใช้จ่ายในระบบ — ตัวเลขด้านล่างจะขึ้นจริงเมื่อเริ่มบันทึก", { iconName: "info" }),
      h("div", { class: "card", style: { padding: "18px", boxShadow: "var(--shadow-md, 0 6px 18px rgba(15,23,42,.08))" } },
        h("div", { class: "split", style: { alignItems: "flex-start" } },
          h("div", null,
            h("div", { style: { font: "var(--h2)", color: "var(--primary-dark)" } }, "โคตรคลีน"),
            h("div", { style: { fontSize: "12px", color: "var(--muted)" } }, "สาขา" + store + " · สรุปประจำเดือน"),
          ),
          h("div", { style: { textAlign: "right" } },
            h("div", { style: { fontWeight: 800, fontSize: "15px" } }, monthLabel),
            h("div", { style: { fontSize: "11px", color: "var(--faint)" } }, "ออก " + TODAY.d + " " + TODAY.mon + " " + hhmm),
          ),
        ),
        h("hr", { class: "hr", style: { borderTopWidth: "1.5px", borderColor: "var(--text)", margin: "12px 0" } }),
        h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } },
          kpi("ยอดขาย", "฿" + fmt(income)),
          kpi("ค่าใช้จ่าย", "฿" + fmt(expense), "var(--warning-ink)"),
          kpi("รายได้สุทธิ", "฿" + fmt(incomeNet), true, true),
          kpi("ยอดสุทธิ", netStr, "var(--primary-dark)"),
        ),
        sec("รายได้ตามช่องทาง"),
        byCh.length
          ? h("div", null, ...byCh.map(([k, v]) => ln(k, "฿" + fmt(v))))
          : h("div", { style: { fontSize: "12px", color: "var(--faint)", padding: "3px 0" } }, "ยังไม่มีข้อมูลรายได้"),
        h("hr", { class: "hr", style: { margin: "5px 0" } }),
        ln("รวมรายได้", "฿" + fmt(income), "var(--primary-dark)", true),
        sec("ค่าใช้จ่ายตามหมวด"),
        byCat.length
          ? h("div", null, ...byCat.map(([k, v]) => ln(k, "฿" + fmt(v), "var(--warning-ink)")))
          : h("div", { style: { fontSize: "12px", color: "var(--faint)", padding: "3px 0" } }, "ยังไม่มีข้อมูลค่าใช้จ่าย"),
        h("hr", { class: "hr", style: { margin: "5px 0" } }),
        ln("รวมค่าใช้จ่าย", "฿" + fmt(expense), "var(--warning-ink)", true),
        sec("สต๊อก & ของเสีย"),
        h("div", { class: "stack", style: { gap: "6px" } }, soon("ของใกล้หมด"), soon("ทิ้ง/เสียเดือนนี้")),
        sec("พยากรณ์สัปดาห์หน้า"),
        soon("ประมาณการวัตถุดิบ"),
        h("hr", { class: "hr", style: { margin: "12px 0 8px" } }),
        h("div", { class: "split", style: { fontSize: "10.5px", color: "var(--faint)" } }, h("span", null, "สร้างอัตโนมัติจากระบบสต๊อกโคตรคลีน"), h("span", null, "หน้า 1/1")),
      ),
      note([h("span", null, "กำไร/ต้นทุนมี "), bold("กุญแจ"), " = เฉพาะเจ้าของ — ตัดออกอัตโนมัติเวลาส่งเข้ากลุ่มพนักงาน"]),
    ),
  );
}
