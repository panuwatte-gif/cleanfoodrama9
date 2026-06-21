// ============================================================
// pages/history.js — ประวัติการบันทึก + แก้ย้อนหลัง + audit จริง
// พอร์ตจาก prototype2 HistoryScreen · audit อ่านจาก data/editlog (ของจริง)
// ctx = { back, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag } from "../components/components.js";
import { RECORDS } from "../data/seed.js";
import { getEditLogs } from "../data/editlog.js";

const bold = (t) => h("b", null, t);
const hst = { filter: "all" };

export function historyScreen(ctx) {
  const root = h("div", { class: "page-wrap", "data-screen-label": "history" });
  paint(root, ctx);
  return root;
}

const KIND_IC = { add: "plus", del: "trash", edit: "edit" };
const KIND_TINT = { add: "green", del: "rose", edit: "amber" };

function paint(root, ctx) {
  const rows = RECORDS.filter((r) => hst.filter === "all" || r.kind === hst.filter);
  const audit = getEditLogs();

  root.replaceChildren(
    hdr({ title: "ประวัติการบันทึก", sub: "แก้ย้อนหลังได้ — ทั้งวันนี้และอดีต", onBack: ctx.back }),
    h("div", { class: "page stack" },
      h("div", { class: "rowflex", style: { gap: "6px" } },
        [{ v: "all", t: "ทั้งหมด" }, { v: "receive", t: "รับของ" }, { v: "count", t: "ตรวจนับ" }].map((f) =>
          h("button", { type: "button", class: "chip" + (hst.filter === f.v ? " active" : ""), onClick: () => { hst.filter = f.v; paint(root, ctx); } }, f.t)),
      ),
      note("แก้ค่าที่กรอกผิดได้ทุกวัน — ระบบคำนวณสต๊อก/ยอดขายย้อนหลังให้ใหม่อัตโนมัติ"),

      rows.map((r) => h("div", { class: "card", style: { padding: "12px 14px", borderColor: r.today ? "var(--primary-soft)" : undefined } },
        h("div", { class: "rowflex" },
          h("span", { class: "catic " + (r.kind === "receive" ? "green" : "blue") + " sm" }, pi(r.kind === "receive" ? "truck" : "scale", 15)),
          h("div", { style: { flex: 1, minWidth: 0 } },
            h("div", { style: { fontWeight: 700, fontSize: "14px" } }, (r.kind === "receive" ? "รับของ" : "ตรวจนับคงเหลือ") + " · " + r.items + " รายการ"),
            h("div", { style: { fontSize: "12px", color: "var(--muted)" } }, r.d + " · " + r.t + " น." + (r.today ? " · วันนี้" : "")),
          ),
          h("button", { type: "button", class: "badge", style: { border: "1px solid var(--border)", background: "var(--surface)" }, onClick: () => ctx.toast("เดโม — เปิดฟอร์มแก้รายการ " + r.d) }, pi("edit", 11), "แก้"),
        ),
      )),

      h("div", { class: "split", style: { marginTop: "4px" } },
        h("span", { class: "overline" }, "ประวัติการแก้ไข (ลบไม่ได้)"),
        tag("audit", { kind: "fifo", iconName: "shield" }),
      ),
      h("div", { class: "card", style: { padding: "4px 16px" } },
        audit.length ? audit.map((a, i) => h("div", { class: "rowflex", style: { padding: "10px 0", borderBottom: i < audit.length - 1 ? "1px solid var(--border-soft)" : "none", alignItems: "flex-start" } },
          h("span", { class: "catic sm " + (KIND_TINT[a.kind] || "amber") }, pi(KIND_IC[a.kind] || "edit", 14)),
          h("div", { style: { flex: 1, minWidth: 0 } },
            h("div", { style: { fontSize: "13px", lineHeight: 1.45 } }, a.txt),
            h("div", { style: { fontSize: "11.5px", color: "var(--faint)", marginTop: "2px" } }, a.by + " · " + a.t),
          ),
        )) : h("p", { style: { fontSize: "12.5px", color: "var(--faint)", textAlign: "center", padding: "12px 0", margin: 0 } }, "ยังไม่มีการแก้ไข"),
      ),
      note(["", bold("กันกลบของหาย:"), " ทุกการแก้ย้อนหลังบันทึก timestamp + ใครแก้ ลบไม่ได้ — เจ้าของย้อนดูได้เสมอ"]),
    ),
  );
}
