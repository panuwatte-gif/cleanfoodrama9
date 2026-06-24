// ============================================================
// pages/history.js — ประวัติการบันทึก + แก้ย้อนหลัง + audit จริง
//   อ่านจาก data/editlog (rama9_edit_logs) — ของจริงทั้งหมด ไม่มีเดโม
//   ทุกการรับของ/ตรวจนับ/ทิ้ง/แก้คงเหลือ ถูก logEdit ไว้แล้ว → แสดงที่นี่
// ctx = { back, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag, emptyState } from "../components/components.js";
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
const FILTERS = [
  { v: "all", t: "ทั้งหมด", kw: null },
  { v: "recv", t: "รับของ", kw: "รับของ" },
  { v: "count", t: "ตรวจนับ", kw: "ตรวจนับ" },
  { v: "waste", t: "ของทิ้ง", kw: "ของทิ้ง" },
];

function paint(root, ctx) {
  const all = getEditLogs();
  const cur = FILTERS.find((f) => f.v === hst.filter) || FILTERS[0];
  const audit = cur.kw ? all.filter((a) => a.txt && a.txt.includes(cur.kw)) : all;

  root.replaceChildren(
    hdr({ title: "ประวัติการบันทึก", sub: "ทุกการบันทึก/แก้ไข · ลบไม่ได้ (audit จริง)", onBack: ctx.back }),
    h("div", { class: "page stack" },
      h("div", { class: "rowflex", style: { gap: "6px", flexWrap: "wrap" } },
        FILTERS.map((f) =>
          h("button", { type: "button", class: "chip" + (hst.filter === f.v ? " active" : ""), onClick: () => { hst.filter = f.v; paint(root, ctx); } }, f.t)),
      ),
      note("ทุกการรับของ · ตรวจนับ · ทิ้ง · แก้คงเหลือ บันทึก timestamp + ใครทำ ไว้อัตโนมัติ — ลบไม่ได้"),
      h("div", { class: "split", style: { marginTop: "2px" } },
        h("span", { class: "overline" }, "รายการบันทึก / แก้ไข"),
        tag("audit", { kind: "fifo", iconName: "shield" }),
      ),
      audit.length
        ? h("div", { class: "card", style: { padding: "4px 16px" } },
            audit.map((a, i) => h("div", { class: "rowflex", style: { padding: "10px 0", borderBottom: i < audit.length - 1 ? "1px solid var(--border-soft)" : "none", alignItems: "flex-start" } },
              h("span", { class: "catic sm " + (KIND_TINT[a.kind] || "amber") }, pi(KIND_IC[a.kind] || "edit", 14)),
              h("div", { style: { flex: 1, minWidth: 0 } },
                h("div", { style: { fontSize: "13px", lineHeight: 1.45 } }, a.txt),
                h("div", { style: { fontSize: "11.5px", color: "var(--faint)", marginTop: "2px" } }, a.by + " · " + a.t),
              ),
            )))
        : emptyState({ compact: true, iconName: "history", title: hst.filter === "all" ? "ยังไม่มีประวัติ" : "ยังไม่มีประวัติหมวดนี้", sub: "เริ่มรับของ/ตรวจนับ แล้วประวัติจะขึ้นที่นี่" }),
      note(["", bold("กันกลบของหาย:"), " ประวัติทั้งหมดเก็บถาวร ลบไม่ได้ — เจ้าของย้อนดูได้เสมอว่าใครแก้อะไรเมื่อไหร่"]),
    ),
  );
}
