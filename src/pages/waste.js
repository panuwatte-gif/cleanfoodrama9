// ============================================================
// pages/waste.js — แยกทิ้ง / ของเสีย (พอร์ตจาก prototype2 WasteScreen)
// logic: หายไป (เมื่อวาน − นับ + รับเข้า) → กรอกทิ้ง → ได้ "ขายจริง"
// ctx = { go, back, role, toast, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { note, tag, itemIc, hdr, qtyInput } from "../components/components.js";
import { itemById, unitOf, fmt } from "../utils/formulas.js";
import { TODAY } from "../data/seed.js";

const WASTE_GONE = [
  { id: "kp-beef", gone: 2.3 },
  { id: "egg-shoyu", gone: 28 },
  { id: "kp-shrimp", gone: 0.8 },
  { id: "dr-cocomat", gone: 11 },
];
const WASTE_REASONS = ["เสีย/หมดอายุ", "ทำพลาด", "ชิม/ทดลอง", "พนักงานทาน", "อื่นๆ"];

const st = { open: { "kp-beef": true }, waste: { "kp-beef": "0.2" }, reason: { "kp-beef": "เสีย/หมดอายุ" }, ctx: null };

const bold = (t) => h("b", null, t);
const wasteCount = () => Object.keys(st.waste).filter((k) => st.waste[k]).length;

export function wasteScreen(ctx) {
  st.ctx = ctx;
  const root = h("div", { class: "page-wrap", "data-screen-label": "waste", style: { display: "flex", flexDirection: "column", flex: 1 } });
  paint(root);
  return root;
}

function headTagNode(id) {
  return st.waste[id]
    ? tag("ทิ้ง " + st.waste[id], { kind: "dgr", iconName: "trash" })
    : h("span", { class: "badge" }, pi("plus", 11), "มีทิ้ง");
}

function paint(root) {
  const ctx = st.ctx;
  const footCount = h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "15px", color: wasteCount() ? "var(--danger)" : "var(--text)" } }, wasteCount() + " รายการ");

  const cards = WASTE_GONE.map(({ id, gone }) => {
    const it = itemById(id);
    const u = unitOf(it);
    const isOpen = !!st.open[id];
    const tagHolder = h("span", null, headTagNode(id));
    const w0 = parseFloat(st.waste[id] || 0) || 0;
    const sold0 = Math.max(0, Math.round((gone - w0) * 100) / 100);
    const soldSpan = h("span", { class: "tnum", style: { fontWeight: 800, fontSize: "16px", color: "var(--primary-dark)" } }, sold0 + " " + u);

    const onQty = (v) => {
      st.waste[id] = v;
      const w = parseFloat(v || 0) || 0;
      soldSpan.textContent = Math.max(0, Math.round((gone - w) * 100) / 100) + " " + u;
      tagHolder.replaceChildren(headTagNode(id));
      footCount.textContent = wasteCount() + " รายการ";
      footCount.style.color = wasteCount() ? "var(--danger)" : "var(--text)";
    };

    const body = isOpen && h("div", { style: { padding: "2px 14px 14px" } },
      h("div", { class: "split" },
        h("span", { style: { fontSize: "13px", color: "var(--muted)" } }, "ทิ้ง / เสีย (" + u + ")"),
        qtyInput({ value: st.waste[id] || "", onChange: onQty }),
      ),
      h("div", { style: { fontSize: "11.5px", fontWeight: 600, color: "var(--muted)", margin: "10px 0 6px" } }, "สาเหตุ"),
      h("div", { class: "rowflex", style: { flexWrap: "wrap", gap: "6px" } },
        WASTE_REASONS.map((r) => h("button", { type: "button", class: "chip" + (st.reason[id] === r ? " active" : ""), style: { fontSize: "12px", padding: "6px 11px" }, onClick: () => { st.reason[id] = r; paint(root); } }, r)),
      ),
      h("div", { class: "hr" }),
      h("div", { class: "split" },
        h("span", { style: { fontWeight: 700, fontSize: "13.5px" } }, "= ขายออกจริง"),
        soldSpan,
      ),
    );

    return h("div", { class: "acc-card" + (isOpen ? " open" : "") },
      h("button", { type: "button", class: "acc-head", onClick: () => { st.open[id] = !st.open[id]; paint(root); } },
        itemIc(it, { sm: false }),
        h("span", { style: { flex: 1, minWidth: 0 } },
          h("span", { style: { display: "block", fontWeight: 700, fontSize: "14.5px" } }, it.name),
          h("span", { class: "tnum", style: { display: "block", fontSize: "12px", color: "var(--muted)" } }, "หายไปวันนี้ " + gone + " " + u),
        ),
        tagHolder,
      ),
      body,
    );
  });

  const ownerNote = ctx.role === "owner"
    ? note(["มูลค่าของทิ้งวันนี้ ≈ ", h("b", { class: "tnum" }, "฿" + fmt(Math.round(0.2 * 320 + 2 * 8))), " (คิดจากต้นทุน/หน่วยอัตโนมัติ) · พยากรณ์เรียนจาก \"ขายจริง\" ไม่ใช่ \"หายไป\""])
    : note(["มูลค่าของทิ้ง (฿) ระบบคิดให้ฝั่ง", bold("เจ้าของ"), "อัตโนมัติ — พนักงานเห็นเฉพาะจำนวน"]);

  root.replaceChildren(
    hdr({ title: "แยกทิ้ง / ของเสีย", sub: "หลังตรวจนับ · " + TODAY.dow + " " + TODAY.d + " " + TODAY.mon, onBack: ctx.back, right: tag("ขั้น 2/2", { kind: "warn", iconName: "trash" }) }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      note([bold('ระบบคิด "หายไป" ให้เอง'), " (เมื่อวาน − นับวันนี้ + รับเข้า) · แตะเฉพาะรายการที่มีของทิ้ง — ที่เหลือถือว่าขายหมด"]),
      cards,
      ownerNote,
    ),
    h("div", { class: "foot" },
      h("div", { style: { flex: 1 } },
        h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "ทิ้งวันนี้"),
        footCount,
      ),
      h("button", { type: "button", class: "btn btn-primary", onClick: () => { ctx.toast("บันทึกแล้ว · ไปหน้าส่งรายงานประจำวัน"); ctx.go({ name: "dailyreport", replace: true }); } }, pi("send", 16), "บันทึก → ส่งรายงาน"),
    ),
  );
}
