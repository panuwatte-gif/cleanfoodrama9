// ============================================================
// pages/payroll.js — ค่าแรงพนักงาน (เจ้าของ) · พอร์ตจาก prototype2 PayrollScreen
// รายวัน / เงินเดือน + OT · รวมค่าแรงทั้งร้าน · ส่งเข้าสูตรต้นทุน
// ช่องกรอกอัปเดตในที่ (ไม่ paint ทั้งหน้า) → ไม่เสีย focus · เพิ่ม/ลบ → paint
// ctx = { back, toast, role }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note } from "../components/components.js";
import { fmt } from "../utils/formulas.js";
import { PAYROLL } from "../data/seed.js";
import { logEdit } from "../data/editlog.js";

const bold = (t) => h("b", null, t);
const num = (v) => parseFloat(v || 0) || 0;
const pst = { rows: PAYROLL.map((p) => ({ ...p })), ctx: null };

function calc(r) {
  if (r.type === "daily") {
    const base = num(r.wage) * num(r.days);
    const ot = num(r.otRate) * num(r.otHours) * num(r.days);
    return { base, ot, total: base + ot };
  }
  const base = num(r.wage);
  const ot = num(r.otRate) * num(r.otHours);
  return { base, ot, total: base + ot };
}
const grandOf = () => pst.rows.reduce((s, r) => s + calc(r).total, 0);

export function payrollScreen(ctx) {
  pst.ctx = ctx;
  const root = h("div", { class: "page-wrap", "data-screen-label": "payroll", style: { display: "flex", flexDirection: "column", flex: 1 } });
  root._refs = {};
  paint(root);
  return root;
}

function field(lab, val, on, suf) {
  const inp = h("input", { type: "text", inputMode: "decimal", value: val, placeholder: "0" });
  inp.addEventListener("input", () => { const s = inp.value.replace(/[^0-9.]/g, ""); if (s !== inp.value) inp.value = s; on(s); });
  return { el: h("div", { class: "pay-fld" }, h("div", { class: "lab" }, lab), h("div", { class: "in-wrap" }, inp, suf && h("span", { class: "suf" }, suf))), inp };
}

function paint(root) {
  const ctx = pst.ctx;
  const refs = root._refs;
  const grandTop = h("div", { class: "big-num", style: { fontSize: "26px", color: "var(--primary-dark)", marginTop: "2px" } }, "฿" + fmt(Math.round(grandOf())));
  const grandFoot = h("span", { class: "tnum", style: { flex: 1, fontSize: "12.5px", color: "var(--muted)" } }, pst.rows.length + " คน · รวม ฿" + fmt(Math.round(grandOf())));

  const refreshTotals = (r, totalSpan, subSpan) => {
    const c = calc(r);
    if (subSpan) subSpan.textContent = "ฐาน ฿" + fmt(Math.round(c.base)) + " + OT ฿" + fmt(Math.round(c.ot));
    if (totalSpan) totalSpan.textContent = "฿" + fmt(Math.round(c.total));
    grandTop.textContent = "฿" + fmt(Math.round(grandOf()));
    grandFoot.textContent = pst.rows.length + " คน · รวม ฿" + fmt(Math.round(grandOf()));
  };

  const cards = pst.rows.map((r) => {
    const perLab = r.type === "daily" ? "ค่าจ้าง/วัน" : "เงินเดือน/เดือน";
    const subSpan = h("span", { class: "tnum", style: { fontSize: "11.5px", color: "var(--muted)" } });
    const totalSpan = h("span", { class: "tnum", style: { fontWeight: 800, fontSize: "16px", color: "var(--primary-dark)" } });
    const set = (patch) => { Object.assign(r, patch); };
    const onChange = () => refreshTotals(r, totalSpan, subSpan);

    const nameIn = h("input", { type: "text", class: "input", style: { flex: 1, minWidth: 0, fontWeight: 700, padding: "8px 10px" }, value: r.name, placeholder: "ชื่อพนักงาน" });
    nameIn.addEventListener("input", () => { r.name = nameIn.value; });

    const wageF = field(perLab, r.wage, (v) => { set({ wage: v }); onChange(); }, "บาท");
    const secondF = r.type === "daily"
      ? field("จำนวนวันทำงาน", r.days, (v) => { set({ days: v }); onChange(); }, "วัน")
      : field("OT รวม/เดือน", r.otHours, (v) => { set({ otHours: v }); onChange(); }, "ชม.");
    const otRateF = field("OT (บาท/ชม.)", r.otRate, (v) => { set({ otRate: v }); onChange(); }, "฿/ชม.");
    const fourthF = r.type === "daily"
      ? field("OT เฉลี่ย/วัน", r.otHours, (v) => { set({ otHours: v }); onChange(); }, "ชม.")
      : field("(เงินเดือนรวม OT แล้ว)", "", () => {}, "");

    refreshTotals(r, totalSpan, subSpan);

    return h("div", { class: "pay-card" },
      h("div", { class: "pay-top" },
        h("span", { class: "pay-av" }, (r.name || "?").trim().charAt(0)),
        nameIn,
        h("span", { class: "pay-seg" },
          h("button", { type: "button", class: r.type === "daily" ? "on" : "", onClick: () => { r.type = "daily"; paint(root); } }, "รายวัน"),
          h("button", { type: "button", class: r.type === "monthly" ? "on" : "", onClick: () => { r.type = "monthly"; paint(root); } }, "เงินเดือน"),
        ),
      ),
      h("div", { class: "pay-grid" }, wageF.el, secondF.el, otRateF.el, fourthF.el),
      h("div", { class: "pay-total" },
        subSpan,
        h("span", { class: "rowflex", style: { gap: "8px" } },
          totalSpan,
          h("button", { type: "button", class: "mini-btn", "aria-label": "ลบ", onClick: () => { pst.rows = pst.rows.filter((x) => x.id !== r.id); paint(root); } }, pi("trash", 13)),
        ),
      ),
    );
  });

  root.replaceChildren(
    hdr({ title: "ค่าแรงพนักงาน", sub: "รายวัน / เงินเดือน + OT · เดือนนี้", onBack: ctx.back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      note(["กรอก", bold("รายชื่อ + ประเภทจ้าง + ค่าจ้าง + OT"), " — ระบบรวมค่าแรงทั้งร้านให้ และส่งเข้าสูตรต้นทุน/จุดคุ้มทุนอัตโนมัติ"], { iconName: "users" }),
      h("div", { class: "card soft-card soft-green split" },
        h("div", null, h("div", { class: "overline" }, "ค่าแรงรวมเดือนนี้"), grandTop),
        h("span", { class: "catic fill", style: { width: "46px", height: "46px", borderRadius: "15px" } }, pi("users", 22)),
      ),
      cards,
      h("button", { type: "button", class: "btn btn-block", onClick: () => { pst.rows = [...pst.rows, { id: "pr-" + Date.now(), name: "พนักงานใหม่", type: "daily", wage: 0, otRate: 0, otHours: 0, days: 26 }]; paint(root); } }, pi("plus", 15), "เพิ่มพนักงาน"),
      note(["OT รายวันคิด = ", bold("OT/ชม. × ชม.ต่อวัน × จำนวนวัน"), " · OT เงินเดือนคิด = ", bold("OT/ชม. × ชม.รวมทั้งเดือน")], { amber: true }),
    ),
    h("div", { class: "foot" },
      grandFoot,
      h("button", { type: "button", class: "btn btn-primary", onClick: () => { logEdit({ txt: "บันทึกค่าแรง " + pst.rows.length + " คน · ฿" + fmt(Math.round(grandOf())), by: ctx.role === "owner" ? "เจ้าของ" : "พนักงาน" }); ctx.toast("บันทึกค่าแรง " + pst.rows.length + " คน · ฿" + fmt(Math.round(grandOf())) + " แล้ว"); ctx.back(); } }, pi("check", 17), "บันทึก"),
    ),
  );
}
