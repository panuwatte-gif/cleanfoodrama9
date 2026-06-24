// ============================================================
// pages/export.js — ส่งออก & สำรอง (เจ้าของ)
//   • สำรองข้อมูลทั้งหมดเป็นไฟล์ .json (จริง — อ่านทุก key ของแอป)
//   • ดาวน์โหลดรายงานเป็น Excel/CSV (จริง) หรือ PDF (เปิดหน้าต่างพิมพ์)
//   • กู้คืนจากไฟล์สำรอง (เขียนทับ → โหลดใหม่)
// ctx = { back, toast, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, seg, toggle } from "../components/components.js";
import { storeChip } from "../components/layout.js";
import { itemById, unitOf, stockOf } from "../utils/formulas.js";
import { TODAY } from "../data/seed.js";
import { menus, items, incomeRows, expenseRows } from "../data/store.js";
import { getEditLogs } from "../data/editlog.js";

const DATASETS = [
  { id: "stock",   t: "สต๊อกคงเหลือ",     s: "รายการ + จำนวนคงเหลือ", ic: "box",     c: "green" },
  { id: "money",   t: "รายรับ - รายจ่าย", s: "รายวันทั้งเดือน",        ic: "wallet",  c: "violet" },
  { id: "menu",    t: "เมนู · ราคาขาย",   s: "รายการเมนูทั้งหมด",      ic: "tag",     c: "amber" },
  { id: "master",  t: "ข้อมูลกลาง",       s: "วัตถุดิบ/สินค้า",        ic: "db",      c: "blue" },
  { id: "history", t: "ประวัติ · audit",  s: "บันทึกการแก้ไขย้อนหลัง", ic: "history", c: "rose" },
];

const st = { ctx: null, fmt: "excel", range: "เดือนนี้", sel: new Set(["stock", "money"]), auto: true };

/* ---------- ตัวช่วยไฟล์ ---------- */
function downloadBlob(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}
function stamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes());
}
const csvCell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const rowsToCsv = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\n");

/* ---------- ดึงข้อมูลจริงต่อชุด ---------- */
function datasetRows(id) {
  try {
    if (id === "stock")
      return [["รายการ", "คงเหลือ", "หน่วย"], ...(items() || []).filter((it) => it.isActive !== false).map((it) => { const s = stockOf(it.id); return [it.name, s.qty, unitOf(it)]; })];
    if (id === "money") {
      const days = {};
      for (const r of incomeRows()) { const d = r.day; (days[d] || (days[d] = { in: 0, ex: 0 })).in += (r.net != null ? r.net : (r.gross || 0)); }
      for (const r of expenseRows()) { const d = r.day; (days[d] || (days[d] = { in: 0, ex: 0 })).ex += (r.amount || 0); }
      const ks = Object.keys(days).map(Number).sort((a, b) => a - b);
      return [["วันที่", "รายรับ (บาท)", "รายจ่าย (บาท)"], ...ks.map((d) => [d + " " + TODAY.mon, days[d].in, days[d].ex])];
    }
    if (id === "menu") {
      const m = menus() || [];
      return [["เมนู", "ราคา"], ...m.map((x) => [x.name, x.price ?? x.priceSell ?? ""])];
    }
    if (id === "master") {
      const m = items() || [];
      return [["ชื่อ", "หน่วย"], ...m.map((x) => [x.name, x.unit || ""])];
    }
    if (id === "history") {
      const l = getEditLogs() || [];
      return [["เวลา", "รายการ", "โดย"], ...l.map((x) => [x.t || x.at || "", x.txt || "", x.by || ""])];
    }
  } catch (e) { /* เดโม — ถอยเป็นว่าง */ }
  return [["(ไม่มีข้อมูล)"]];
}

function doDownload() {
  const ids = [...st.sel];
  if (!ids.length) { st.ctx.toast("เลือกชุดข้อมูลอย่างน้อย 1 รายการ"); return; }
  if (st.fmt === "pdf") return printReport(ids);
  const parts = ids.map((id) => { const ds = DATASETS.find((d) => d.id === id); return "# " + (ds ? ds.t : id) + "\n" + rowsToCsv(datasetRows(id)); });
  const csv = "\uFEFF" + parts.join("\n\n"); // BOM ให้ Excel อ่านไทยถูก
  const isXls = st.fmt === "excel";
  downloadBlob("rama9-report-" + stamp() + (isXls ? ".xls" : ".csv"), csv, isXls ? "application/vnd.ms-excel;charset=utf-8" : "text/csv;charset=utf-8");
  st.ctx.toast("ดาวน์โหลดรายงานแล้ว · " + ids.length + " ชุด");
}

function printReport(ids) {
  const w = window.open("", "_blank");
  if (!w) { st.ctx.toast("เปิดหน้าต่างพิมพ์ไม่ได้ — อนุญาต popup ก่อน"); return; }
  const tables = ids.map((id) => {
    const ds = DATASETS.find((d) => d.id === id), rows = datasetRows(id);
    const head = "<tr>" + rows[0].map((c) => "<th>" + c + "</th>").join("") + "</tr>";
    const body = rows.slice(1).map((r) => "<tr>" + r.map((c) => "<td>" + c + "</td>").join("") + "</tr>").join("");
    return "<h2>" + (ds ? ds.t : id) + "</h2><table>" + head + body + "</table>";
  }).join("");
  w.document.write(
    "<html><head><meta charset='utf-8'><title>รายงาน CleanFoodRama9</title><style>" +
    "body{font-family:'Noto Sans Thai',sans-serif;padding:28px;color:#1f2a24}h1{font-size:21px;margin:0 0 4px}" +
    ".sub{color:#777;font-size:12px;margin-bottom:18px}h2{font-size:15px;margin:22px 0 4px;color:#2C5743}" +
    "table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #d8d8d8;padding:6px 9px;text-align:left}" +
    "th{background:#EEF6EE}</style></head><body>" +
    "<h1>รายงานสรุป · " + (st.ctx.shopCtx ? st.ctx.shopCtx.shop : "ร้าน") + "</h1>" +
    "<div class='sub'>ช่วง: " + st.range + " · ออกเมื่อ " + new Date().toLocaleString("th-TH") + "</div>" +
    tables + "<scr" + "ipt>window.onload=function(){setTimeout(function(){window.print()},350)}</scr" + "ipt></body></html>"
  );
  w.document.close();
  st.ctx.toast("เตรียมไฟล์ PDF — กด “บันทึกเป็น PDF” ในหน้าต่างพิมพ์");
}

function doBackup() {
  const dump = { app: "CleanFoodRama9", exportedAt: new Date().toISOString(), data: {} };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("cfr9:")) dump.data[k] = localStorage.getItem(k);
    }
  } catch (e) { /* ignore */ }
  downloadBlob("rama9-backup-" + stamp() + ".json", JSON.stringify(dump, null, 2), "application/json");
  st.ctx.toast("สำรองข้อมูลทั้งหมดเป็นไฟล์แล้ว");
}

function doRestore(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const j = JSON.parse(r.result);
      if (!j || !j.data) throw new Error("bad");
      Object.keys(j.data).forEach((k) => { if (k.startsWith("cfr9:")) localStorage.setItem(k, j.data[k]); });
      st.ctx.toast("กู้คืนข้อมูลแล้ว · กำลังโหลดใหม่…");
      setTimeout(() => location.reload(), 950);
    } catch (e) { st.ctx.toast("ไฟล์สำรองไม่ถูกต้อง"); }
  };
  r.readAsText(file);
}

/* ---------- หน้าจอ ---------- */
export function exportScreen(ctx) {
  st.ctx = ctx;
  const root = h("div", { class: "page-wrap", "data-screen-label": "export" });
  paint(root);
  return root;
}

function paint(root) {
  const { back, toast, shopCtx } = st.ctx;

  const dsRows = DATASETS.map((d) => {
    const on = st.sel.has(d.id);
    return h("button", { type: "button", class: "ds-row list-press" + (on ? " on" : ""), onClick: () => { on ? st.sel.delete(d.id) : st.sel.add(d.id); paint(root); } },
      h("span", { class: "catic sm " + d.c }, pi(d.ic, 16)),
      h("div", { style: { flex: 1, minWidth: 0, textAlign: "left" } },
        h("div", { style: { fontWeight: 700, fontSize: "13.5px" } }, d.t),
        h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, d.s),
      ),
      h("span", { class: "ds-check" + (on ? " on" : "") }, on ? pi("check", 13) : null),
    );
  });

  const fileIn = h("input", { type: "file", accept: ".json,application/json", style: { display: "none" } });
  fileIn.addEventListener("change", (e) => { const f = e.target.files && e.target.files[0]; if (f) doRestore(f); });

  const extLabel = st.fmt === "excel" ? ".xls" : st.fmt === "csv" ? ".csv" : "PDF";

  root.replaceChildren(
    hdr({ title: "ส่งออก & สำรอง", sub: "ดาวน์โหลดรายงาน · สำรอง/กู้คืนข้อมูล", onBack: back, right: storeChip(shopCtx) }),
    h("div", { class: "page stack" },
      note(["ไฟล์ที่ออก = ", h("b", null, "สแน็ปช็อตข้อมูลปัจจุบัน"), " ในเครื่อง — เก็บไฟล์สำรองไว้กันข้อมูลหาย หรือย้ายเครื่องได้"], { iconName: "cloud" }),

      // สำรอง
      h("div", { class: "overline ov-teal" }, "สำรองข้อมูล (Backup)"),
      h("div", { class: "card more-card soft-teal", style: { padding: "14px 16px" } },
        h("div", { class: "split", style: { marginBottom: "12px" } },
          h("div", { class: "rowflex" },
            h("span", { class: "catic teal" }, pi("cloud", 18)),
            h("div", { style: { minWidth: 0 } },
              h("div", { style: { fontWeight: 800, fontSize: "14.5px" } }, "สำรองข้อมูลทั้งหมด"),
              h("div", { style: { fontSize: "12px", color: "var(--muted)" } }, "ดาวน์โหลดเป็นไฟล์ .json — เก็บไว้กันข้อมูลหาย/ย้ายเครื่อง"),
            ),
          ),
          h("span", { class: "badge badge-green" }, pi("cloud", 10), "ซิงค์คลาวด์"),
        ),
        h("button", { type: "button", class: "btn btn-primary btn-block", onClick: doBackup }, pi("down", 16), "สำรองเป็นไฟล์ตอนนี้"),
        h("div", { class: "split", style: { marginTop: "12px" } },
          h("span", { style: { fontSize: "13.5px", fontWeight: 600 } }, "สำรองอัตโนมัติทุกวัน"),
          toggle(st.auto, (v) => { st.auto = v; toast(v ? "เปิดสำรองอัตโนมัติทุกวัน" : "ปิดสำรองอัตโนมัติ"); }),
        ),
      ),

      // ดาวน์โหลดรายงาน
      h("div", { class: "overline ov-blue" }, "ดาวน์โหลดรายงาน"),
      h("div", { class: "card", style: { padding: "14px 16px", display: "flex", flexDirection: "column", gap: "13px" } },
        h("div", null,
          h("div", { class: "field-label", style: { marginBottom: "6px" } }, "รูปแบบไฟล์"),
          seg({ value: st.fmt, grow: true, options: [{ v: "excel", t: "Excel" }, { v: "csv", t: "CSV" }, { v: "pdf", t: "PDF" }], onChange: (v) => { st.fmt = v; paint(root); } }),
        ),
        h("div", null,
          h("div", { class: "field-label", style: { marginBottom: "6px" } }, "ช่วงเวลา"),
          seg({ value: st.range, grow: true, options: [{ v: "เดือนนี้", t: "เดือนนี้" }, { v: "7 วัน", t: "7 วันล่าสุด" }, { v: "ทั้งหมด", t: "ทั้งหมด" }], onChange: (v) => { st.range = v; paint(root); } }),
        ),
        h("div", null,
          h("div", { class: "field-label", style: { marginBottom: "6px" } }, "เลือกชุดข้อมูล (เลือกได้หลายชุด)"),
          h("div", { class: "ds-list" }, dsRows),
        ),
        h("button", { type: "button", class: "btn btn-primary btn-block", onClick: doDownload }, pi("doc", 16), "ดาวน์โหลด (" + extLabel + ")"),
      ),

      // กู้คืน
      h("div", { class: "overline ov-amber" }, "กู้คืน / นำเข้า"),
      h("div", { class: "card more-card soft-amber", style: { padding: "14px 16px" } },
        note([h("b", null, "การกู้คืนจะเขียนทับข้อมูลปัจจุบัน"), " — ใช้ไฟล์สำรอง (.json) ที่ออกจากแอปนี้เท่านั้น"], { amber: true }),
        h("button", { type: "button", class: "btn btn-block", style: { marginTop: "10px" }, onClick: () => fileIn.click() }, pi("up", 16), "เลือกไฟล์สำรอง (.json)"),
        fileIn,
      ),

      h("p", { style: { fontSize: "11px", color: "var(--faint)", textAlign: "center", margin: "10px 0 0" } }, "ข้อมูลซิงค์ขึ้น Supabase อัตโนมัติแล้ว · ไฟล์สำรองนี้ไว้เก็บออฟไลน์/ย้ายเครื่อง"),
    ),
  );
}
