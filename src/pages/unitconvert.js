// ============================================================
// pages/unitconvert.js — แปลงหน่วย (เจ้าของ) · พอร์ตจาก prototype2 UnitConvertScreen
// ความหมายหน่วยนับ + แปลงอัตโนมัติ (ไข่ แผง→ฟอง ดึงค่าจาก assumption)
// ctx = { back, go }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, stepper } from "../components/components.js";
import { fmt } from "../utils/formulas.js";
import { assumptions } from "../data/store.js";

const bold = (t) => h("b", null, t);

const UNIT_INFO = [
  { u: "kg",      name: "กิโลกรัม", desc: "ชั่งน้ำหนัก — เนื้อสัตว์ · ข้าว · ผัก", ic: "scale" },
  { u: "g",       name: "กรัม",     desc: "หน่วยย่อยของกิโลกรัม — ใช้ในสูตร/ท็อปปิ้ง", ic: "scale" },
  { u: "ฟอง",     name: "ฟอง",      desc: "นับไข่ทีละฟอง — หน่วยที่ระบบตัดสต๊อกจริง", ic: "egg" },
  { u: "แผง",     name: "แผง",      desc: "รับไข่เป็นแผง · 1 แผง = 30 ฟอง", ic: "eggtray" },
  { u: "ขวด",     name: "ขวด",      desc: "เครื่องดื่ม · ซอสขวด นับทีละขวด", ic: "bottle" },
  { u: "ซอง",     name: "ซอง",      desc: "น้ำจิ้ม · ซอสซอง นับทีละซอง", ic: "drop" },
  { u: "แพ็ค",    name: "แพ็ค",     desc: "บรรจุภัณฑ์ที่มาเป็นแพ็ค (กล่อง · ถุง)", ic: "box" },
  { u: "แถว",     name: "แถว",      desc: "ถ้วย · แก้ว · ฝา ที่เรียงมาเป็นแถว", ic: "cup" },
  { u: "ถุง",     name: "ถุง",      desc: "วัตถุดิบบรรจุถุง — พริก · พริกป่น", ic: "bag" },
  { u: "แกลอน",   name: "แกลอน",    desc: "น้ำมัน · ของเหลวปริมาณมาก", ic: "jar" },
  { u: "กระป๋อง", name: "กระป๋อง",  desc: "แก๊ส · ของกระป๋อง นับทีละกระป๋อง", ic: "jar" },
  { u: "กล่อง",   name: "กล่อง",    desc: "บรรจุภัณฑ์ที่นับเป็นกล่อง", ic: "box" },
];

const ust = { tray: "4" };

export function unitConvertScreen(ctx) {
  const root = h("div", { class: "page-wrap", "data-screen-label": "unitconvert" });
  paint(root, ctx);
  return root;
}

function paint(root, ctx) {
  const eggA = assumptions().find((a) => a.id === "egg-tray");
  const eggPerTray = parseInt((eggA && eggA.v) || 30, 10) || 30;
  const trays = parseFloat(ust.tray || 0) || 0;

  const CONVERTS = [
    { from: "1 แผง", to: eggPerTray + " ฟอง", sub: "ไข่ — รับเป็นแผง · ตัดสต๊อกเป็นฟอง", ic: "eggtray", link: true },
    { from: "1 kg", to: "1,000 g", sub: "น้ำหนัก — มาตรฐานสากล", ic: "scale" },
  ];

  const eggOut = h("div", { class: "big-num", style: { fontSize: "26px", color: "var(--primary-dark)" } }, fmt(Math.round(trays * eggPerTray)));

  root.replaceChildren(
    hdr({ title: "แปลงหน่วย", sub: "ความหมายหน่วยนับ + แปลงอัตโนมัติ", onBack: ctx.back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    h("div", { class: "page stack" },
      note(["รับของเป็น", bold("หน่วยใหญ่"), " (แผง · แกลอน · แพ็ค) แต่ระบบ", bold("ตัดสต๊อก + คิดต้นทุน"), "เป็นหน่วยย่อยให้อัตโนมัติ — ไม่ต้องคิดเอง"], { iconName: "swap" }),

      h("div", { class: "overline" }, "การแปลงหน่วยอัตโนมัติ"),
      CONVERTS.map((c) => h("div", { class: "card uc-conv" },
        h("span", { class: "catic amber sm" }, pi(c.ic, 16)),
        h("div", { style: { flex: 1, minWidth: 0 } },
          h("div", { class: "uc-eq" },
            h("span", { class: "uc-from tnum" }, c.from),
            pi("swap", 16),
            h("span", { class: "uc-to tnum" }, c.to),
          ),
          h("div", { style: { fontSize: "11.5px", color: "var(--muted)", marginTop: "3px" } }, c.sub),
        ),
        c.link && h("button", { type: "button", class: "badge", style: { border: "1px solid var(--border)", background: "var(--surface)" }, onClick: () => ctx.go({ name: "assumptions" }) }, pi("edit", 11), "แก้ค่า"),
      )),

      h("div", { class: "card soft-card soft-amber" },
        h("div", { class: "overline", style: { color: "#92560B" } }, "ลองคำนวณ — ไข่"),
        h("div", { class: "rowflex", style: { gap: "12px", marginTop: "8px", alignItems: "flex-end" } },
          h("div", { style: { flex: 1, minWidth: 0 } },
            h("div", { class: "field-label", style: { marginBottom: "6px" } }, "รับเข้า (แผง)"),
            stepper({ value: ust.tray, onChange: (v) => { ust.tray = v; paint(root, ctx); } }),
          ),
          (() => { const s = pi("swap", 20); Object.assign(s.style, { color: "var(--muted)", flex: "none", marginBottom: "12px" }); return s; })(),
          h("div", { style: { flex: 1, minWidth: 0, textAlign: "right" } },
            h("div", { class: "field-label", style: { marginBottom: "2px" } }, "= ตัดสต๊อก (ฟอง)"),
            eggOut,
          ),
        ),
        h("div", { style: { marginTop: "10px" } }, note(["1 แผง = ", bold(eggPerTray + " ฟอง"), " — ปรับค่าได้ที่ ", bold("เพิ่มเติม → ปรับค่า assumption")])),
      ),

      h("div", { class: "overline" }, "ความหมายหน่วยนับในระบบ"),
      h("div", { class: "card", style: { padding: "4px 16px" } },
        UNIT_INFO.map((x, i) => h("div", { class: "rowflex", style: { padding: "10px 0", borderBottom: i < UNIT_INFO.length - 1 ? "1px solid var(--border-soft)" : "none" } },
          h("span", { class: "catic green sm" }, pi(x.ic, 15)),
          h("div", { style: { flex: 1, minWidth: 0 } },
            h("div", { style: { fontSize: "13.5px", fontWeight: 700 } }, x.name, h("span", { style: { fontSize: "11px", color: "var(--faint)", fontWeight: 600 } }, " · " + x.u)),
            h("div", { style: { fontSize: "12px", color: "var(--muted)", marginTop: "1px" } }, x.desc),
          ),
        )),
      ),
      note(["หน่วยของแต่ละรายการตั้งได้ที่ ", bold("ข้อมูลกลาง"), " — เปลี่ยนหน่วยแล้วช่องกรอก/รายงานทุกหน้าปรับตามทันที"], { amber: true }),
    ),
  );
}
