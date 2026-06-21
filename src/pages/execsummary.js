// ============================================================
// pages/execsummary.js — สรุปผู้บริหาร (เจ้าของ · พร้อมปริ้น) · พอร์ตจาก prototype2 ExecSummaryScreen
// ctx = { back, toast, go, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag } from "../components/components.js";
import { fmt } from "../utils/formulas.js";
import { MONEY, STOCK_SEED as STOCK, TODAY } from "../data/seed.js";

const bold = (t) => h("b", null, t);
const lowCount = () => STOCK.filter((s) => s.st !== "ok").length;

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

export function execSummaryScreen({ back, toast, go, shopCtx } = {}) {
  const store = shopCtx ? shopCtx.shop : "กะเพราโคตรคลีน";
  const net = MONEY.monthIncome - MONEY.monthExpense;

  return h("div", { class: "page-wrap", "data-screen-label": "execsummary", style: { display: "flex", flexDirection: "column", flex: 1 } },
    hdr({ title: "สรุปผู้บริหาร", sub: "พร้อมปริ้น · มิ.ย. 2569", onBack: back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } },
        h("button", { type: "button", class: "btn", onClick: () => toast("เดโม — เปิดหน้าปริ้น A4 ในระบบจริง") }, pi("print", 15), "ปริ้น"),
        h("button", { type: "button", class: "btn btn-primary", onClick: () => toast("ส่งสรุปเข้า LINE เจ้าของแล้ว") }, pi("send", 15), "ส่ง LINE"),
        h("button", { type: "button", class: "btn", onClick: () => go({ name: "export" }) }, pi("cloud", 15), "Backup"),
        h("button", { type: "button", class: "btn", onClick: () => go({ name: "export" }) }, pi("download", 15), "โหลด"),
      ),
      h("div", { class: "card", style: { padding: "18px", boxShadow: "var(--shadow-md, 0 6px 18px rgba(15,23,42,.08))" } },
        h("div", { class: "split", style: { alignItems: "flex-start" } },
          h("div", null,
            h("div", { style: { font: "var(--h2)", color: "var(--primary-dark)" } }, "โคตรคลีน"),
            h("div", { style: { fontSize: "12px", color: "var(--muted)" } }, "สาขา" + store + " · สรุปประจำเดือน"),
          ),
          h("div", { style: { textAlign: "right" } },
            h("div", { style: { fontWeight: 800, fontSize: "15px" } }, "มิ.ย. 2569"),
            h("div", { style: { fontSize: "11px", color: "var(--faint)" } }, "ออก " + TODAY.d + " " + TODAY.mon + " 21:40"),
          ),
        ),
        h("hr", { class: "hr", style: { borderTopWidth: "1.5px", borderColor: "var(--text)", margin: "12px 0" } }),
        h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } },
          kpi("ยอดขาย", "฿" + fmt(MONEY.monthIncome)),
          kpi("ค่าใช้จ่าย", "฿" + fmt(MONEY.monthExpense), "var(--warning-ink)"),
          kpi("กำไรขั้นต้น", "฿" + fmt(net), true, true),
          kpi("ยอดสุทธิ", "+฿" + fmt(net), "var(--primary-dark)"),
        ),
        sec("รายได้ตามช่องทาง"),
        ln("Grab", "฿168,200"), ln("Lineman", "฿98,300"), ln("Shopee", "฿23,100"), ln("หน้าร้าน", "฿22,400"),
        h("hr", { class: "hr", style: { margin: "5px 0" } }),
        ln("รวมรายได้", "฿" + fmt(MONEY.monthIncome), "var(--primary-dark)", true),
        sec("ค่าใช้จ่ายตามหมวด"),
        ln("ต้นทุนวัตถุดิบ (COGS)", "฿78,300", "var(--warning-ink)"), ln("ค่าเช่า", "฿8,000"), ln("บรรจุภัณฑ์", "฿11,200"), ln("ค่าไฟ + น้ำ", "฿6,900"), ln("อื่นๆ", "฿9,200"),
        h("hr", { class: "hr", style: { margin: "5px 0" } }),
        ln("รวมค่าใช้จ่าย", "฿" + fmt(MONEY.monthExpense), "var(--warning-ink)", true),
        sec("สต๊อก & ของเสีย"),
        h("div", { class: "stack", style: { gap: "6px" } },
          h("div", { class: "rowflex" }, h("span", { class: "catic rose sm" }, pi("alert", 14)), h("span", { style: { flex: 1, fontSize: "12.5px" } }, "ของใกล้หมด"), tag(lowCount() + " รายการ", { kind: "dgr" })),
          h("div", { class: "rowflex" }, h("span", { class: "catic amber sm" }, pi("trash", 14)), h("span", { style: { flex: 1, fontSize: "12.5px" } }, "ทิ้ง/เสียเดือนนี้"), h("span", { class: "tnum", style: { fontWeight: 700, fontSize: "13px", color: "var(--warning-ink)" } }, "฿1,150 · 1.4%")),
        ),
        sec("พยากรณ์สัปดาห์หน้า"),
        h("div", { class: "note", style: { fontSize: "12px" } }, pi("trend", 15), h("div", null, "เตรียมเนื้อ ~22 กก. · กุ้ง ~6 กก. · ไข่ดองโชยุ ~210 ฟอง (สูงกว่าสัปดาห์นี้ +9%)")),
        h("hr", { class: "hr", style: { margin: "12px 0 8px" } }),
        h("div", { class: "split", style: { fontSize: "10.5px", color: "var(--faint)" } }, h("span", null, "สร้างอัตโนมัติจากระบบสต๊อกโคตรคลีน"), h("span", null, "หน้า 1/1")),
      ),
      note([h("span", null, "กำไร/ต้นทุนมี "), bold("กุญแจ"), " = เฉพาะเจ้าของ — ตัดออกอัตโนมัติเวลาส่งเข้ากลุ่มพนักงาน"]),
    ),
  );
}
