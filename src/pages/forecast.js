// ============================================================
// pages/forecast.js — "คำแนะนำการเตรียมของ" (พยากรณ์ 7 วัน · จ–อา)
//   ★ Redesign ตาม reference: ตารางมุมมอง 7 วัน + tab หมวดหมู่
//   • คอลัมน์: เมนู | คงเหลือ | คาดใช้ จ/อ/พ/พฤ/ศ/ส/อา  (สถานะ = จุดสีหน้าคงเหลือ)
//   • ต่อแถวแตะได้ → กางสถิติ + ตัด FIFO ล็อตเก่าสุดก่อน
//   • หมวดที่โชว์/ซ่อน ตั้งได้ในหน้า "เพิ่มเติม" (prepHidden)
//   • พยากรณ์รายวันจาก fc7() (logic เดิม) · คงเหลือ/ล็อตจาก stockOf() (ข้อมูลจริง)
// ctx = { go, back, role }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, searchBox, emptyState, itemIc, emo } from "../components/components.js";
import { chick, cic } from "../components/mascot.js";
import { items, cats } from "../data/store.js";
import { unitOf, fmtQty, stockOf, fc7 } from "../utils/formulas.js";
import { todayISO } from "../utils/usage.js";
import { getFormulas, getCfg, saveCfg, getPrepHidden, riceBreakdown } from "../forecast/formulaLibrary.js";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const bold = (t) => h("b", null, t);
// แสดงคาดใช้/วัน — ของนับชิ้นที่ขายน้อย (<10/วัน) โชว์ทศนิยม 1 ตำแหน่ง (ไม่ปัดขึ้นเป็นจำนวนเต็มจนโป่ง)
const fcCell = (v, u) => { const n = Number(v) || 0; const kg = (u === "kg" || u === "g"); if (!kg && n > 0 && n < 10) return String(Math.round(n * 10) / 10); return fmtQty(v, u); };

// จันทร์→อาทิตย์ (คงที่) + ตัวย่อ
const MON_SUN = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
const ABBR = { "จันทร์": "จ.", "อังคาร": "อ.", "พุธ": "พ.", "พฤหัสบดี": "พฤ.", "ศุกร์": "ศ.", "เสาร์": "ส.", "อาทิตย์": "อา." };
const MON_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const MON_TH_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

const sameDay = (a, b) => a.toDateString() === b.toDateString();
// วันจันทร์ของสัปดาห์ที่ d อยู่
function mondayOf(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x;
}

// วันที่ของสัปดาห์ (จันทร์→อาทิตย์) — เริ่มจาก weekStart (วันจันทร์)
function weekDates(weekStart) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const mon = mondayOf(weekStart || now);
  return MON_SUN.map((full, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    return { full, abbr: ABBR[full], date: d, label: d.getDate() + " " + MON_TH[d.getMonth()], today: sameDay(d, now) };
  });
}

// ป้ายช่วงวันของสัปดาห์ที่กำลังดู เช่น "30 มิ.ย. – 6 ก.ค. 2569"
function weekRangeLabel() {
  const a = fst.week[0].date, b = fst.week[6].date;
  return a.getDate() + " " + MON_TH[a.getMonth()] + " – " + b.getDate() + " " + MON_TH[b.getMonth()] + " " + (b.getFullYear() + 543);
}
const isCurrentWeek = () => sameDay(fst.weekStart, mondayOf(new Date()));

// การ์ดปฏิทินเดือน — กดวันไหน → กระโดดไปสัปดาห์ของวันนั้น (ดูย้อนหลัง/เดือนอื่น)
function monthGrid(root) {
  const m = fst.calMonth, y = m.getFullYear(), mo = m.getMonth();
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const startPad = (new Date(y, mo, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const selMon = mondayOf(fst.weekStart);
  const selSun = new Date(selMon); selSun.setDate(selMon.getDate() + 6);
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(h("span", { class: "cal-cell empty" }));
  for (let dn = 1; dn <= daysInMonth; dn++) {
    const d = new Date(y, mo, dn);
    const inWeek = d >= selMon && d <= selSun;
    cells.push(h("button", {
      type: "button", class: "cal-cell" + (inWeek ? " inweek" : "") + (sameDay(d, now) ? " today" : ""),
      onClick: () => { fst.weekStart = mondayOf(d); fst.calOpen = false; paint(root); },
    }, String(dn)));
  }
  return h("div", { class: "prep-cal" },
    h("div", { class: "prep-cal-head" },
      h("button", { type: "button", class: "prep-nav-b", "aria-label": "เดือนก่อน", onClick: () => { fst.calMonth = new Date(y, mo - 1, 1); paint(root); } }, pi("chevl", 16)),
      h("span", { class: "prep-cal-title" }, MON_TH_FULL[mo] + " " + (y + 543)),
      h("button", { type: "button", class: "prep-nav-b", "aria-label": "เดือนถัดไป", onClick: () => { fst.calMonth = new Date(y, mo + 1, 1); paint(root); } }, pi("chev", 16))),
    h("div", { class: "prep-cal-wd" }, ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((w) => h("span", null, w))),
    h("div", { class: "prep-cal-grid" }, ...cells));
}

// แถบควบคุม: เลือกสูตรพยากรณ์ + เลื่อนสัปดาห์ + ปฏิทิน
function prepControls(root, cfg, forms) {
  const sel = h("select", { class: "prep-select" },
    ...forms.map((f) => h("option", { value: f.id }, f.name)));
  sel.value = cfg.defaultFormulaId;
  sel.addEventListener("change", () => { saveCfg({ defaultFormulaId: sel.value }); paint(root); });
  const shiftWeek = (days) => { const d = new Date(fst.weekStart); d.setDate(d.getDate() + days); fst.weekStart = mondayOf(d); fst.calMonth = new Date(fst.weekStart.getFullYear(), fst.weekStart.getMonth(), 1); paint(root); };
  return h("div", { class: "prep-ctrls" },
    h("label", { class: "prep-fld" },
      h("span", { class: "prep-fld-k" }, pi("trend", 14), "สูตรพยากรณ์ที่ใช้"),
      sel),
    h("div", { class: "prep-weeknav" },
      h("button", { type: "button", class: "prep-nav-b", "aria-label": "สัปดาห์ก่อน", onClick: () => shiftWeek(-7) }, pi("chevl", 16)),
      h("button", { type: "button", class: "prep-weeklabel" + (fst.calOpen ? " on" : ""), onClick: () => { fst.calOpen = !fst.calOpen; paint(root); } },
        pi("cal", 15), weekRangeLabel(), pi("chevd", 12)),
      h("button", { type: "button", class: "prep-nav-b", "aria-label": "สัปดาห์ถัดไป", onClick: () => shiftWeek(7) }, pi("chev", 16))),
    !isCurrentWeek() && h("button", { type: "button", class: "prep-today-b list-press", onClick: () => { fst.weekStart = mondayOf(new Date()); fst.calMonth = new Date(fst.weekStart.getFullYear(), fst.weekStart.getMonth(), 1); fst.calOpen = false; paint(root); } }, pi("history", 13), "กลับมาสัปดาห์นี้"),
    fst.calOpen && monthGrid(root));
}

// กลุ่มหมวด (โครงเดียวกับ reference: กับข้าว / เครื่องดื่ม / …)
const GROUP_DEFS = [
  { id: "protein", name: "กับข้าว", icon: "pan", tint: "green" },
  { id: "drink", name: "เครื่องดื่ม", icon: "cup2", tint: "blue" },
  { id: "egg", name: "ไข่", icon: "egg", tint: "amber" },
  { id: "sauce", name: "ซอส / น้ำจิ้ม", icon: "drop", tint: "rose" },
  { id: "rice", name: "ข้าว", icon: "rice", tint: "violet" },
  { id: "pack", name: "บรรจุภัณฑ์", icon: "box", tint: "amber" },
  { id: "dry", name: "อื่นๆ", icon: "jar", tint: "violet" },
];

// พยากรณ์รายวัน จ→อา ของรายการ (จาก fc7 — logic เดิม)
function week7(id) {
  const s = fc7(id);
  if (!s) return null;
  const map = {}; s.days.forEach((d) => { map[d.full] = d.mid; });
  const arr = MON_SUN.map((n) => (map[n] != null ? map[n] : 0));
  const sum = arr.reduce((a, b) => a + b, 0);
  return { arr, avg: sum / 7, u: s.u };
}

function statusFor(qty, dayUse) {
  if (!dayUse || dayUse <= 0) return { k: "none", dot: "var(--faint)", label: "ไม่มีคาดใช้" };
  const cover = qty / dayUse;
  if (qty <= 0 || cover < 1) return { k: "need", dot: "var(--danger)", label: "ต้องเตรียมเพิ่ม" };
  if (cover <= 3) return { k: "soon", dot: "var(--warning-ink)", label: "ใกล้หมด" };
  return { k: "ok", dot: "#2E8C5A", label: "เพียงพอ" };
}

function rowData(it) {
  const u = unitOf(it);
  const onHand = r2((stockOf(it.id) || {}).qty || 0);
  const wk = week7(it.id);
  const arr = wk ? wk.arr : [0, 0, 0, 0, 0, 0, 0];
  const dayUse = wk ? wk.avg : 0;
  const need = Math.max(0, r2(dayUse - onHand));
  return { it, u, onHand, arr, dayUse, need, st: statusFor(onHand, dayUse) };
}

/* ---------- FIFO รายละเอียด (กางจากแถว) ---------- */
function lotsOf(itemId) {
  const lots = ((stockOf(itemId) || {}).lots || []).filter((l) => (Number(l.qty) || 0) > 0);
  return lots.slice().sort((a, b) => (b.age || 0) - (a.age || 0) || String(a.d).localeCompare(String(b.d)));
}
function fifoDetail(d) {
  const lots = lotsOf(d.it.id);
  const tmr = d.arr[(new Date().getDay() + 6) % 7]; // คาดใช้ "วันนี้" โดยประมาณ
  let rem = tmr; const allocs = [];
  for (const l of lots) { const use = Math.min(Number(l.qty) || 0, Math.max(0, rem)); allocs.push({ d: l.d, age: l.age || 0, before: r2(l.qty), use: r2(use), after: r2((Number(l.qty) || 0) - use) }); rem = r2(rem - use); }
  const shortage = Math.max(0, r2(rem));
  const stat = (label, val, cls) => h("div", { class: "fc-stat" }, h("span", null, label), h("b", { class: cls || "" }, val));
  const rows = allocs.map((a, i) => h("div", { class: "fifo-row" },
    h("span", { class: "fifo-no" }, String(i + 1)),
    h("span", { class: "fifo-d" }, "อายุ " + a.age + " วัน"),
    h("span", { class: "fifo-c" }, fmtQty(a.before, d.u)),
    h("span", { class: "fifo-c use" }, a.use > 0 ? "ใช้ " + fmtQty(a.use, d.u) : "—"),
    h("span", { class: "fifo-c" }, fmtQty(a.after, d.u))));
  if (shortage > 0) rows.push(h("div", { class: "fifo-row short" }, h("span", { class: "fifo-no" }, "!"), h("span", { class: "fifo-d" }, "ของไม่พอ"), h("span", { class: "fifo-c" }, "—"), h("span", { class: "fifo-c use" }, "ขาด " + fmtQty(shortage, d.u)), h("span", { class: "fifo-c" }, "—")));
  const weekTotal = r2(d.arr.reduce((a, b) => a + b, 0));
  return h("div", { class: "prep-exp" },
    h("div", { class: "fc-stats4" },
      stat("คาดใช้/วัน", fcCell(d.dayUse, d.u) + " " + d.u),
      stat("คาดใช้ทั้งสัปดาห์", fcCell(weekTotal, d.u) + " " + d.u, "hi"),
      stat("ต้องเตรียม", d.need > 0 ? fcCell(d.need, d.u) + " " + d.u : "ไม่ต้อง", d.need > 0 ? "warn" : "ok"),
      stat("สถานะ", d.st.label, d.st.k === "need" ? "warn" : d.st.k === "ok" ? "ok" : "")),
    lots.length ? h("div", { class: "fifo-head" }, h("span", { class: "fifo-no" }, "#"), h("span", { class: "fifo-d" }, "ล็อต (เก่า→ใหม่)"), h("span", { class: "fifo-c" }, "เหลือ"), h("span", { class: "fifo-c" }, "ใช้วันนี้"), h("span", { class: "fifo-c" }, "เหลือ")) : null,
    ...rows,
    h("div", { class: "fifo-sum" }, cic(shortage > 0 ? "warning" : "clipboard", 16),
      h("span", null, !lots.length
        ? ["ยังไม่มีล็อตคงเหลือ · ", bold("เตรียม/รับเข้าก่อนเปิดร้าน")]
        : (shortage > 0
          ? ["หยิบล็อตเก่าสุดก่อน · ยังขาด ", bold(fmtQty(shortage, d.u) + " " + d.u)]
          : ["พอใช้วันนี้ — หยิบล็อตเก่าสุดก่อน ไม่ต้องเติม"]))),
  );
}

const fst = { ctx: null, cat: "all", q: "", open: new Set(), body: null, groups: [], week: [], weekStart: null, calOpen: false, calMonth: null };

export function forecastScreen(ctx) {
  fst.ctx = ctx; fst.cat = "all"; fst.q = ""; fst.open = new Set();
  fst.weekStart = mondayOf(new Date());
  fst.calOpen = false;
  fst.calMonth = new Date(fst.weekStart.getFullYear(), fst.weekStart.getMonth(), 1);
  const root = h("div", { class: "page-wrap", "data-screen-label": "forecast" });
  paint(root);
  return root;
}

/* ---------- ตาราง 7 วัน ของหนึ่งกลุ่ม ---------- */
function groupTable(g, rows) {
  const head = h("div", { class: "fc7-head" },
    h("span", { class: "fc7-c-name" }, "เมนู"),
    h("span", { class: "fc7-c-stock" }, "คงเหลือ"),
    ...fst.week.map((w) => h("span", { class: "fc7-c-day" + (w.today ? " today" : "") }, w.abbr)));
  const body = rows.map((d) => {
    const isOpen = fst.open.has(d.it.id);
    const tr = h("div", { class: "fc7-row" + (isOpen ? " on" : ""), onClick: () => { isOpen ? fst.open.delete(d.it.id) : fst.open.add(d.it.id); repaintBody(); } },
      h("span", { class: "fc7-c-name" },
        h("span", { class: "fc7-dot", style: { background: d.st.dot } }),
        h("span", { class: "fc7-nm" }, d.it.name)),
      h("span", { class: "fc7-c-stock" },
        h("b", { class: "tnum" }, d.onHand > 0 ? fmtQty(d.onHand, d.u) : "0"),
        h("span", { class: "fc7-u" }, d.u)),
      ...d.arr.map((v, i) => h("span", { class: "fc7-c-day tnum" + (fst.week[i] && fst.week[i].today ? " today" : "") }, fcCell(v, d.u))));
    return isOpen ? h("div", { class: "fc7-rowgroup" }, tr, fifoDetail(d)) : tr;
  });
  return h("div", { class: "fc7-block" },
    h("div", { class: "fc7-title tint-" + g.tint },
      h("span", { class: "fc7-title-ic" }, emo(g.icon, { s: 18 })),
      h("span", null, g.name),
      h("span", { class: "fc7-title-n" }, rows.length + " เมนู")),
    h("div", { class: "fc7-table" }, head, h("div", { class: "fc7-body" }, body)));
}

function repaintBody() {
  if (!fst.body) return;
  const q = fst.q.trim().toLowerCase();
  const nodes = [];
  fst.groups.forEach((g) => {
    if (fst.cat !== "all" && fst.cat !== g.id) return;
    let rows = g.rows;
    if (q) rows = rows.filter((d) => d.it.name.toLowerCase().includes(q));
    if (!rows.length) return;
    nodes.push(groupTable(g, rows));
  });
  fst.body.replaceChildren(...(nodes.length ? nodes : [emptyState({ compact: true, iconName: "search", title: "ไม่พบเมนู", sub: "ลองเปลี่ยนหมวด/คำค้น หรือเปิดหมวดในหน้าเพิ่มเติม" })]));
}

function paint(root) {
  const { back, go } = fst.ctx;
  const settingsBtn = h("button", { type: "button", class: "hdr-icon", "aria-label": "ตั้งค่าพยากรณ์", onClick: () => go({ name: "formulasettings" }) }, pi("settings", 18));

  const cfg = getCfg();
  const forms = getFormulas();
  const fName = (forms.find((f) => f.id === cfg.defaultFormulaId) || {}).name || "—";
  const hidden = getPrepHidden();
  fst.week = weekDates(fst.weekStart);

  // กลุ่มที่ "โชว์" (ไม่ถูกซ่อน) + มีรายการ
  // ★ แสดงเฉพาะรายการที่ "มียอดขายจริง" (คาดใช้>0) หรือ "มีของในสต๊อก" — ตัดรายการที่ไม่เคยขายทิ้ง
  fst.groups = GROUP_DEFS
    .filter((g) => !hidden.includes(g.id) && cats().some((c) => c.id === g.id))
    .map((g) => ({ ...g, rows: items().filter((it) => it.cat === g.id && it.isActive !== false).map(rowData).filter((d) => d.dayUse > 0 || d.onHand > 0) }))
    .filter((g) => g.rows.length);

  const allRows = fst.groups.flatMap((g) => g.rows);
  const needN = allRows.filter((d) => d.st.k === "need").length;
  const soonN = allRows.filter((d) => d.st.k === "soon").length;
  const okN = allRows.filter((d) => d.st.k === "ok").length;

  // ข้าวต้องหุง (×factor) จากรายการหมวดข้าว
  let riceCooked = 0;
  allRows.forEach((d) => { if (d.it.cat === "rice") riceCooked += d.dayUse; });
  const rice = riceBreakdown(riceCooked);

  // แถบพยากรณ์ 7 วัน (อาหาร) — รวมคาดใช้/วันของหมวดกับข้าว
  const proteinRows = (fst.groups.find((g) => g.id === "protein") || { rows: [] }).rows;
  const dayTotals = fst.week.map((w, i) => r2(proteinRows.reduce((s, d) => s + (d.arr[i] || 0), 0)));
  const maxDay = Math.max(...dayTotals, 1);
  const faceOf = (v) => { const r = v / maxDay; return r >= 0.8 ? "😋" : r >= 0.5 ? "🙂" : "😌"; };

  // tabs หมวดหมู่
  const tabs = h("div", { class: "chip-tabs cat-tabs fc7-tabs" },
    h("button", { type: "button", class: "chip" + (fst.cat === "all" ? " active" : ""), onClick: () => { fst.cat = "all"; repaintBody(); setActiveTab(); } }, pi("grid", 14), "ทั้งหมด"),
    ...fst.groups.map((g) => h("button", { type: "button", class: "chip" + (fst.cat === g.id ? " active" : ""), "data-cat": g.id, onClick: () => { fst.cat = g.id; repaintBody(); setActiveTab(); } }, emo(g.icon, { s: 14 }), g.name)));
  function setActiveTab() { tabs.querySelectorAll(".chip").forEach((b) => { const id = b.getAttribute("data-cat") || "all"; b.classList.toggle("active", id === fst.cat); }); }

  const mini = (tint, ic, val, label) => h("div", { class: "fc7-sum tint-" + tint },
    cic(ic, 24), h("div", { style: { minWidth: 0 } }, h("div", { class: "fc7-sum-v" }, String(val)), h("div", { class: "fc7-sum-k" }, label)));

  const legend = h("div", { class: "fc7-legend" },
    h("span", null, h("i", { style: { background: "#2E8C5A" } }), "เพียงพอ"),
    h("span", null, h("i", { style: { background: "var(--warning-ink)" } }), "ใกล้หมด"),
    h("span", null, h("i", { style: { background: "var(--danger)" } }), "ต้องเตรียมเพิ่ม"),
    h("span", null, h("i", { style: { background: "var(--faint)" } }), "ไม่มีคาดใช้"),
    h("span", { class: "fc7-legend-u" }, "คาดใช้ = /วัน"));

  fst.body = h("div", { class: "fc7-groups" });
  repaintBody();

  root.replaceChildren(
    hdr({ title: "คำแนะนำการเตรียมของ", sub: "พยากรณ์ 7 วัน · จันทร์–อาทิตย์", onBack: back, right: settingsBtn }),
    h("div", { class: "page stack" },
      // hero
      h("div", { class: "prep-hero" }, chick(70, "clipboard", { float: true }),
        h("div", { style: { flex: 1, minWidth: 0 } },
          h("div", { class: "prep-hero-k" }, "วางแผนเตรียมของ 7 วัน"),
          h("div", { class: "prep-hero-d" }, fst.week[0].label + " – " + fst.week[6].label),
          h("div", { class: "prep-hero-meta" },
            h("span", { class: "prep-badge" }, "สูตร: " + fName),
            h("span", { class: "prep-badge ok" }, "อัปเดต " + (new Date()).toLocaleDateString("th-TH", { day: "numeric", month: "short" })))) ),

      // เลือกสูตร + เลื่อนสัปดาห์ + ปฏิทินย้อนหลัง
      prepControls(root, cfg, forms),

      // แถบ 7 วัน
      h("div", { class: "fc7-week" }, fst.week.map((w, i) => h("div", { class: "fc7-wd" + (w.today ? " today" : "") },
        h("div", { class: "fc7-wd-d" }, w.abbr), h("div", { class: "fc7-wd-date" }, w.label),
        h("div", { class: "fc7-wd-face" }, faceOf(dayTotals[i])),
        h("div", { class: "fc7-wd-kg tnum" }, dayTotals[i] > 0 ? fmtQty(dayTotals[i]) + " กก." : "—")))),

      // สรุป
      h("div", { class: "fc7-sum-grid" },
        mini("rose", "warning", needN, "ต้องเตรียมเพิ่ม"),
        mini("amber", "clipboard", soonN, "ใกล้หมด"),
        mini("green", "check", okN, "เพียงพอ"),
        mini("violet", "rice-white", fmtQty(rice.raw) + " กก.", "ข้าวต้องหุง (×" + rice.factor + ")")),

      // tabs + ค้นหา
      tabs,
      searchBox({ value: fst.q, onChange: (v) => { fst.q = v; repaintBody(); }, placeholder: "ค้นหาเมนู…" }),
      legend,

      fst.body,

      note(["พยากรณ์รายวันจากสูตร ", bold(fName), " · แตะแถวดูล็อต FIFO (หยิบเก่าสุดก่อน) · ", bold("เปิด/ปิดหมวด"), " ได้ที่ ", bold("เพิ่มเติม › คำแนะนำการเตรียมของ")], { iconName: "trend" }),
      h("button", { type: "button", class: "orderplan-cta alt", onClick: () => go({ name: "reportback" }) },
        cic("doc-report", 30), h("div", { style: { flex: 1, textAlign: "left" } }, h("div", { style: { fontWeight: 800, fontSize: "14px" } }, "รายงานกลับ + การเรียนรู้โมเดล"), h("div", { style: { fontSize: "11.5px", opacity: .85 } }, "สรุปสิ่งที่ระบบทำ + MAPE/WMAPE")), pi("chev", 18)),
    ),
  );
}
