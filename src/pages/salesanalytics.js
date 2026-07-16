// ============================================================
// pages/salesanalytics.js — วิเคราะห์การขาย (Grab · ข้อมูลจริง)
//   2.1 ขายดี/ไม่ดี รายวันในสัปดาห์ (เลือกช่วงวันได้ — รองรับช่วงคนละครึ่ง)
//   2.2 ออเดอร์รายชั่วโมงใน 1 วัน (ชั่วโมงพีค/เงียบ → กำหนดเวลาเปิด-ปิด)
//   2.3 ประมาณการเมนู Top 3 ที่ออกในแต่ละชั่วโมง (สัดส่วนเมนู × ออเดอร์/ชม.)
// ctx = { back, go, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note } from "../components/components.js";
import { barChart } from "../components/charts.js";
import { fmt } from "../utils/formulas.js";
import { load, save } from "../utils/storage.js";
import { GRAB_DAILY, menuShare } from "../data/grabData.js";
import { PEAK_DAILY } from "../data/peakhours.js";
import { menuThumb } from "../data/menuImages.js";

const bold = (t) => h("b", null, t);
const WD = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"];
const WDS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const wdIndex = (iso) => { const [y, m, d] = iso.split("-").map(Number); return (new Date(y, m - 1, d).getDay() + 6) % 7; };
const hh = (i) => String(i).padStart(2, "0") + ":00";
const shortName = (n) => {
  let s = n.replace(/\[[^\]]*\]/g, "").replace(/\|[^|]*/g, "").replace(/\d+\s*kcal/gi, "").replace(/\s+/g, " ").trim();
  return s.length > 22 ? s.slice(0, 22) + "…" : (s || n.slice(0, 20));
};

const sst = { from: "", to: "" };

function bounds() {
  const min = GRAB_DAILY.length ? GRAB_DAILY[0].d : "";
  const max = GRAB_DAILY.length ? GRAB_DAILY[GRAB_DAILY.length - 1].d : "";
  return { min, max };
}
const addDays = (iso, n) => { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };

export function salesAnalyticsScreen(ctx) {
  const { min, max } = bounds();
  const saved = load("salesRange", null);
  sst.from = (saved && saved.from) || (max ? addDays(max, -29) : "");
  sst.to = (saved && saved.to) || max;
  if (sst.from < min) sst.from = min;
  const root = h("div", { class: "page-wrap", "data-screen-label": "salesanalytics" });
  paint(root, ctx);
  return root;
}

function rangeRows() {
  return GRAB_DAILY.filter((d) => d.d >= sst.from && d.d <= sst.to);
}
function rangePeak() {
  return PEAK_DAILY.filter((d) => d.d >= sst.from && d.d <= sst.to);
}

function controls(root, ctx) {
  const { min, max } = bounds();
  const di = (val, on) => { const i = h("input", { type: "date", value: val, min, max, class: "input", style: { fontSize: "12.5px", padding: "7px 9px", flex: 1, minWidth: 0 } }); i.addEventListener("change", () => { on(i.value); save("salesRange", { from: sst.from, to: sst.to }); paint(root, ctx); }); return i; };
  const isP = (n) => sst.to === max && (n === "all" ? sst.from === min : sst.from === addDays(max, -(n - 1)));
  const preset = (n, label) => h("button", { type: "button", class: "chip" + (isP(n) ? " active" : ""), style: { padding: "5px 11px", fontSize: "12px" }, onClick: () => { sst.to = max; sst.from = n === "all" ? min : addDays(max, -(n - 1)); if (sst.from < min) sst.from = min; save("salesRange", { from: sst.from, to: sst.to }); paint(root, ctx); } }, label);
  return h("div", { class: "card", style: { padding: "12px 14px" } },
    h("div", { class: "rowflex", style: { gap: "6px", flexWrap: "wrap", marginBottom: "9px" } }, preset(7, "7 วัน"), preset(30, "30 วัน"), preset(90, "90 วัน"), preset("all", "ทั้งหมด")),
    h("div", { class: "rowflex", style: { gap: "7px", alignItems: "center" } },
      di(sst.from, (v) => { sst.from = v; if (sst.from > sst.to) sst.to = sst.from; }),
      h("span", { style: { color: "var(--faint)", flex: "none" } }, "→"),
      di(sst.to, (v) => { sst.to = v; if (sst.to < sst.from) sst.from = sst.to; })),
    h("div", { style: { fontSize: "11px", color: "var(--muted)", marginTop: "7px" } }, "💡 เลือกช่วงให้ตรงกับ ", bold("โปรรัฐ/คนละครึ่ง"), " เพื่อเทียบพฤติกรรมลูกค้าแยกช่วง"),
  );
}

// 2.1 ขายดี/ไม่ดี รายวันในสัปดาห์ — แท่งเขียวพาสเทล + ป้ายวัน/ตัวเลขชัด
function weekdayCard() {
  const rows = rangeRows();
  const sum = new Array(7).fill(0), cnt = new Array(7).fill(0);
  rows.forEach((r) => { const i = wdIndex(r.d); sum[i] += r.o; cnt[i]++; });
  const avg = sum.map((s, i) => (cnt[i] ? s / cnt[i] : 0));
  const max = Math.max(...avg, 1);
  const best = avg.indexOf(Math.max(...avg));
  const worst = avg.map((v, i) => ({ v, i })).filter((x) => cnt[x.i]).sort((a, b) => a.v - b.v)[0];
  const GREEN = "#8BD1AC", GREEN_HI = "#2E9B63";
  const H = 120;
  const bars = h("div", { style: { display: "flex", alignItems: "flex-end", gap: "7px", padding: "6px 0 0" } },
    avg.map((v, i) => h("div", { style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" } },
      h("div", { class: "tnum", style: { fontSize: "14px", fontWeight: 800, color: i === best ? GREEN_HI : "var(--text)", marginBottom: "5px" } }, cnt[i] ? (Math.round(v * 10) / 10) : "–"),
      h("div", { style: { width: "100%", height: Math.max(4, Math.round(v / max * H)) + "px", background: i === best ? GREEN_HI : GREEN, borderRadius: "8px 8px 0 0" } }),
    )));
  const labels = h("div", { style: { display: "flex", gap: "7px", marginTop: "7px" } },
    WDS.map((d, i) => h("div", { style: { flex: 1, textAlign: "center", fontSize: "15px", fontWeight: 800, color: i === best ? GREEN_HI : "var(--text)" } }, d)));
  return h("div", { class: "card" },
    h("div", { class: "dash-card-h" }, "ขายดีรายวัน (เฉลี่ยออเดอร์/วัน)"),
    bars, labels,
    h("div", { class: "rowflex", style: { gap: "8px", marginTop: "11px", paddingTop: "11px", borderTop: "1px solid var(--border-soft)" } },
      h("div", { style: { flex: 1 } }, h("div", { style: { fontSize: "11px", color: "var(--muted)", fontWeight: 700 } }, "ขายดีสุด"), h("div", { style: { fontSize: "15px", fontWeight: 800, color: GREEN_HI } }, WD[best] + " · " + (Math.round(avg[best] * 10) / 10) + "/วัน")),
      worst ? h("div", { style: { flex: 1 } }, h("div", { style: { fontSize: "11px", color: "var(--muted)", fontWeight: 700 } }, "ขายน้อยสุด"), h("div", { style: { fontSize: "15px", fontWeight: 800, color: "#C86A8F" } }, WD[worst.i] + " · " + (Math.round(worst.v * 10) / 10) + "/วัน")) : null,
    ),
  );
}

// 2.2 ออเดอร์รายชั่วโมง
function hourlyCard() {
  const rows = rangePeak();
  const h24 = new Array(24).fill(0);
  rows.forEach((r) => r.h.forEach((v, i) => { h24[i] += v; }));
  const days = rows.length || 1;
  const avg = h24.map((v) => v / days);
  const max = Math.max(...avg, 0.1);
  const active = avg.map((v, i) => ({ v, i })).filter((x) => x.v > 0.05);
  const peakH = active.slice().sort((a, b) => b.v - a.v)[0];
  const busy = avg.map((v, i) => ({ v, i })).filter((x) => x.v >= max * 0.12);
  const openH = busy.length ? busy[0].i : 10, closeH = busy.length ? busy[busy.length - 1].i : 20;
  const bars = h("div", { style: { display: "flex", alignItems: "flex-end", gap: "2px", height: "96px", padding: "4px 0" } },
    avg.map((v, i) => h("div", { title: hh(i) + " · " + (Math.round(v * 10) / 10) + "/วัน", style: { flex: 1, height: Math.max(2, v / max * 100) + "%", background: peakH && i === peakH.i ? "#2E9B63" : (v > 0.05 ? "#B9E3CB" : "var(--border-soft)"), borderRadius: "3px 3px 0 0" } })));
  const axis = h("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "9.5px", color: "var(--faint)", marginTop: "3px" } }, ["00", "06", "12", "18", "23"].map((t) => h("span", null, t + ":00")));
  return h("div", { class: "card" },
    h("div", { class: "dash-card-h" }, "ออเดอร์รายชั่วโมง (เฉลี่ย/วัน)"),
    bars, axis,
    h("div", { class: "rowflex", style: { gap: "8px", marginTop: "9px", paddingTop: "9px", borderTop: "1px solid var(--border-soft)" } },
      peakH ? h("div", { style: { flex: 1 } }, h("div", { style: { fontSize: "10.5px", color: "var(--faint)" } }, "ชั่วโมงพีค"), h("div", { style: { fontSize: "14px", fontWeight: 800, color: "var(--primary-dark)" } }, hh(peakH.i))) : null,
      h("div", { style: { flex: 1.4 } }, h("div", { style: { fontSize: "10.5px", color: "var(--faint)" } }, "ช่วงที่ควรเปิดร้าน"), h("div", { style: { fontSize: "13px", fontWeight: 700 } }, hh(openH) + " – " + hh(closeH + 1))),
    ),
  );
}

// 2.3 เมนูขายดีรายชั่วโมง — ประมาณการ "จำนวนจาน (เต็มจาน)" ต่อวัน แยกตามช่วงเวลา
const HOUR_BANDS = [
  { label: "เช้า–สาย", lo: 6, hi: 10 },
  { label: "กลางวัน", lo: 11, hi: 13 },
  { label: "บ่าย", lo: 14, hi: 16 },
  { label: "เย็น", lo: 17, hi: 19 },
  { label: "ค่ำ", lo: 20, hi: 23 },
];
const MENU_TINT = ["#2E9B63", "#3F73B8", "#B5781A"];
function topByHourCard() {
  const rows = rangePeak();
  const days = rows.length || 1;
  const h24 = new Array(24).fill(0);
  rows.forEach((r) => r.h.forEach((v, i) => { h24[i] += v; }));
  const share = menuShare(3); // top 3 menus + สัดส่วน
  const bands = HOUR_BANDS.map((b) => {
    let tot = 0; for (let i = b.lo; i <= b.hi; i++) tot += h24[i];
    return { ...b, perDay: tot / days, total: tot };
  }).filter((b) => b.perDay >= 0.1);

  const bandBlock = (b) => h("div", { style: { padding: "11px 12px", borderRadius: "14px", border: "1.5px solid var(--border)", background: "var(--surface)" } },
    h("div", { class: "split", style: { marginBottom: "9px" } },
      h("div", null,
        h("div", { style: { fontSize: "14px", fontWeight: 800, color: "var(--text)" } }, b.label),
        h("div", { style: { fontSize: "11px", color: "var(--muted)", fontWeight: 600 } }, hh(b.lo) + "–" + hh(b.hi))),
      h("div", { style: { textAlign: "right" } },
        h("div", { class: "tnum", style: { fontSize: "16px", fontWeight: 800, color: "#2E9B63" } }, "≈" + Math.round(b.perDay)),
        h("div", { style: { fontSize: "10.5px", color: "var(--faint)" } }, "ออเดอร์/วัน")),
    ),
    h("div", { class: "stack", style: { gap: "6px" } },
      share.map((m, k) => {
        const perDay = b.perDay * m.pct / 100;
        const plates = Math.round(perDay);
        return h("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
          (menuThumb(m.name, 30, { borderRadius: "9px" }) || h("span", { style: { width: "9px", height: "9px", borderRadius: "50%", background: MENU_TINT[k], flex: "none" } })),
          h("span", { style: { flex: 1, minWidth: 0, fontSize: "13px", fontWeight: 600, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, shortName(m.name)),
          plates >= 1
            ? h("span", { class: "tnum", style: { flex: "none", fontSize: "14px", fontWeight: 800, color: MENU_TINT[k] } }, plates + " จาน")
            : h("span", { style: { flex: "none", fontSize: "11.5px", fontWeight: 600, color: "var(--faint)" } }, "นานๆ ครั้ง"));
      }),
    ),
  );

  return h("div", { class: "card", style: { padding: "12px 14px" } },
    h("div", { class: "dash-card-h" }, "เมนูขายดี · จำนวนจานต่อวัน แยกช่วงเวลา"),
    h("div", { style: { fontSize: "11.5px", color: "var(--muted)", margin: "-4px 0 10px" } }, "ประมาณการ ", bold("จำนวนจานเต็ม/วัน"), " ของเมนูขายดี 3 อันดับ — เอาไว้เตรียมของแต่ละช่วง"),
    bands.length ? h("div", { class: "stack", style: { gap: "9px" } }, bands.map(bandBlock))
      : h("div", { style: { fontSize: "12.5px", color: "var(--faint)", padding: "16px 2px", textAlign: "center" } }, "ไม่มีข้อมูลในช่วงที่เลือก"),
  );
}

function paint(root, ctx) {
  const rows = rangeRows();
  const totO = rows.reduce((s, r) => s + r.o, 0), totN = rows.reduce((s, r) => s + r.n, 0);
  root.replaceChildren(
    hdr({ title: "วิเคราะห์การขาย", sub: "Grab · ขายดีรายวัน · รายชั่วโมง · เมนู", onBack: ctx.back, right: h("span", { class: "catic amber" }, pi("trend", 18)) }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      controls(root, ctx),
      h("div", { class: "card soft-card soft-green split", style: { padding: "11px 14px" } },
        h("div", null, h("div", { class: "overline" }, "ช่วงที่เลือก"), h("div", { style: { fontSize: "13px", fontWeight: 700 } }, rows.length + " วัน · " + fmt(totO) + " ออเดอร์")),
        h("div", { style: { textAlign: "right" } }, h("div", { class: "overline" }, "รายได้สุทธิ"), h("div", { class: "tnum", style: { fontSize: "16px", fontWeight: 800, color: "var(--primary-dark)" } }, "฿" + fmt(totN)))),
      h("div", { class: "overline ov-green" }, "2.1 ขายดี/ไม่ดี รายวัน"),
      weekdayCard(),
      h("div", { class: "overline ov-blue" }, "2.2 ออเดอร์รายชั่วโมง"),
      hourlyCard(),
      h("div", { class: "overline ov-amber" }, "2.3 เมนูขายดี ต่อชั่วโมง"),
      topByHourCard(),
      note(["จำนวนจานเป็น ", bold("ประมาณการปัดเต็มจาน"), " จากออเดอร์เฉลี่ยต่อวันในแต่ละช่วง × สัดส่วนเมนูขายดี — สะท้อนของจริงที่ขายเป็นจาน"], { amber: true }),
    ),
  );
}
