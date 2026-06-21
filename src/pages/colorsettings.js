// ============================================================
// pages/colorsettings.js — ปรับสี / ธีม (เจ้าของ) · พอร์ตจาก prototype2 ColorSettingsScreen
// ธีมสำเร็จรูป (preset) + ปรับเองทีละส่วน (custom) · บันทึกถาวร (localStorage)
// ctx = { go, back, role, toast, theme, setTheme }
//   setTheme(patch) → app merge + applyTheme + persist + re-render (หน้านี้ rebuild)
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, seg } from "../components/components.js";
import { COLOR_DEFAULTS } from "../utils/theme.js";
import { logEdit } from "../data/editlog.js";

const bold = (t) => h("b", null, t);

const COLOR_PRESETS = [
  { id: "clean",   name: "เขียวคลีน",   t: { primary: "#16A34A", secondary: "#2563EB", bg: "#F6F7F4", surface: "#FFFFFF", text: "#111827", warning: "#F59E0B", pending: "#F59E0B", fab: "#16A34A" } },
  { id: "kaprao",  name: "เขียวกะเพรา", t: { primary: "#4E8F66", secondary: "#C8A557", bg: "#F5F2E8", surface: "#FFFFFF", text: "#2C3F31", warning: "#C8A557", pending: "#C8A557", fab: "#4E8F66" } },
  { id: "holding", name: "เขียวโฮลดิ้ง", t: { primary: "#128A5A", secondary: "#C7A249", bg: "#F7F8F5", surface: "#FFFFFF", text: "#12241C", warning: "#C7A249", pending: "#C7A249", fab: "#0B5C3C" } },
  { id: "sky",     name: "ฟ้าสดใส",     t: { primary: "#2563EB", secondary: "#06B6D4", bg: "#F2F6FF", surface: "#FFFFFF", text: "#152033", warning: "#F59E0B", pending: "#F59E0B", fab: "#2563EB" } },
  { id: "warm",    name: "ส้มอบอุ่น",   t: { primary: "#EA7B2C", secondary: "#16A34A", bg: "#FFF7EE", surface: "#FFFFFF", text: "#3A2A1C", warning: "#E11D48", pending: "#EA7B2C", fab: "#EA7B2C" } },
  { id: "pastel",  name: "ม่วงพาสเทล", t: { primary: "#8B5CF6", secondary: "#EC4899", bg: "#F7F4FE", surface: "#FFFFFF", text: "#241B33", warning: "#F59E0B", pending: "#A78BFA", fab: "#8B5CF6" } },
];
const COLOR_SWATCHES = {
  primary:   ["#62B98C", "#16A34A", "#4E8F66", "#128A5A", "#2563EB", "#8B5CF6", "#EA7B2C", "#E11D48"],
  secondary: ["#5B8DEF", "#2563EB", "#06B6D4", "#C8A557", "#16A34A", "#EC4899", "#8B5CF6"],
  bg:        ["#F6F8F4", "#F6F7F4", "#F5F2E8", "#F2F6FF", "#FFF7EE", "#F7F4FE", "#FFF1F4"],
  surface:   ["#FFFFFF", "#FFFDF8", "#FBFCFE", "#FFF9F3"],
  text:      ["#384B40", "#111827", "#12241C", "#2C3F31", "#152033", "#3A2A1C"],
  warning:   ["#F0A93B", "#F59E0B", "#E11D48", "#C8A557", "#EA7B2C"],
  pending:   ["#F0A93B", "#F59E0B", "#A78BFA", "#06B6D4", "#EAB308", "#EA7B2C"],
  fab:       ["#62B98C", "#16A34A", "#0B5C3C", "#2563EB", "#8B5CF6", "#EA7B2C", "#E11D48"],
};
const COLOR_ROWS = [
  { k: "primary", t: "สีหลักของระบบ" },
  { k: "secondary", t: "สีรอง" },
  { k: "bg", t: "สีพื้นหลัง" },
  { k: "surface", t: "สีการ์ด" },
  { k: "text", t: "สีข้อความ" },
  { k: "warning", t: "สีคำเตือน" },
  { k: "pending", t: "สีสถานะรอดำเนินการ" },
  { k: "fab", t: "สีปุ่มกลางด้านล่าง" },
];

const cst = { tab: "preset" };

export function colorSettingsScreen(ctx) {
  const theme = ctx.theme || COLOR_DEFAULTS;
  const by = ctx.role === "owner" ? "เจ้าของ" : "พนักงาน";
  const activePreset = COLOR_PRESETS.find((p) => COLOR_ROWS.every((r) => p.t[r.k] === theme[r.k]));

  const presetGrid = h("div", { class: "theme-grid" },
    COLOR_PRESETS.map((p) => h("button", {
      type: "button", class: "theme-card" + (activePreset && activePreset.id === p.id ? " on" : ""),
      onClick: () => { logEdit({ txt: 'เปลี่ยนธีมสี → "' + p.name + '"', by }); ctx.setTheme(p.t); ctx.toast('เปลี่ยนเป็นธีม "' + p.name + '" แล้ว'); },
    },
      h("div", { class: "theme-swatches" }, ["primary", "secondary", "warning", "fab"].map((k) => h("span", { class: "theme-sw", style: { background: p.t[k] } }))),
      h("div", { style: { fontWeight: 800, fontSize: "13.5px" } }, p.name),
      h("div", { style: { fontSize: "11px", color: "var(--muted)", marginTop: "1px" } }, activePreset && activePreset.id === p.id ? "กำลังใช้" : "แตะเพื่อใช้"),
    )),
  );

  const customCard = h("div", { class: "card", style: { padding: "4px 16px" } },
    COLOR_ROWS.map((r) => h("div", { class: "color-row" },
      h("span", { class: "color-dot", style: { background: theme[r.k] } }),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { style: { fontSize: "13.5px", fontWeight: 700 } }, r.t),
        h("div", { class: "color-swatches", style: { marginTop: "7px" } },
          COLOR_SWATCHES[r.k].map((c) => h("button", {
            type: "button", class: "color-swatch" + (theme[r.k] === c ? " on" : ""), style: { background: c }, "aria-label": c,
            onClick: () => { logEdit({ txt: "ปรับสี " + r.t + " → " + c, by }); ctx.setTheme({ [r.k]: c }); },
          }))),
      ),
    )),
  );

  return h("div", { class: "page-wrap", "data-screen-label": "colorsettings" },
    hdr({ title: "ปรับสี", sub: "ธีมสำเร็จรูป · ปรับเองตามส่วน", onBack: ctx.back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    h("div", { class: "page stack" },
      note(["เลือก", bold("ธีมสำเร็จรูป"), "ทั้งชุด หรือ", bold("ปรับเองทีละส่วน"), " — เปลี่ยนแล้วทั้งแอปเปลี่ยนสีทันที"], { iconName: "settings" }),
      seg({ grow: true, value: cst.tab, onChange: (v) => { cst.tab = v; ctx.go({ name: "colorsettings", replace: true }); }, options: [{ v: "preset", t: "ธีมสำเร็จรูป", ic: "image" }, { v: "custom", t: "ปรับเองตามส่วน", ic: "settings" }] }),
      cst.tab === "preset" ? presetGrid : customCard,
      h("button", { type: "button", class: "btn btn-block", onClick: () => { logEdit({ txt: "คืนค่าสีเริ่มต้น", by }); ctx.setTheme({ ...COLOR_DEFAULTS }); ctx.toast("คืนค่าสีเริ่มต้นแล้ว"); } }, pi("refresh", 15), "คืนค่าเริ่มต้น"),
      note(["สีที่ตั้งจะถูก", bold("บันทึกไว้"), " — เปิดแอปครั้งหน้ายังเป็นสีเดิม"], { amber: true }),
    ),
  );
}
