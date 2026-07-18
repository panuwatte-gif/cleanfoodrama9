// ============================================================
// pages/grabreports.js — รายงานวิเคราะห์ Grab (เจ้าของเท่านั้น)
// Executive summary 6 ใบ + แท็บ: รายชั่วโมง · จ-อา · เมนู/เตรียมของ · Ads · ส่งvsใช้ · คุ้มทุน
// ตัวเลขทุกตัวมาจาก grabReportService — หน้านี้แสดงผลอย่างเดียว
// ============================================================
import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, seg, tag } from "../components/components.js";
import { fmt } from "../utils/formulas.js";
import { barChart } from "../components/charts.js";
import {
  segments, segStats, hourlyProfile, dowProfile, prepTable, sendVsUse,
  adsSummary, adsMonthly, adsDailySeries, adsOrderShare, campaignRows,
  breakevenScenarios, classifyMenu, thaiMonth, DOW_TH,
} from "../services/grabReportService.js";
import { menuItems, menuDaily } from "../data/grabStore.js";
import { plMonth, monthList } from "../services/finStatementService.js";
import { dishImageUrl } from "../data/menuImages.js";

const r1 = (v) => Math.round(v * 10) / 10;

/* การ์ด KPI พาสเทล */
function kpiCard({ emoji, label, value, sub, bg, ink }) {
  return h("div", { style: { borderRadius: "16px", padding: "12px 13px", background: bg, border: "1px solid rgba(0,0,0,.04)" } },
    h("div", { class: "rowflex", style: { gap: "6px" } },
      h("span", { style: { fontSize: "15px" } }, emoji),
      h("span", { style: { fontSize: "11px", fontWeight: 700, color: ink, opacity: .75 } }, label)),
    h("div", { class: "tnum", style: { fontSize: "21px", fontWeight: 800, color: ink, marginTop: "3px" } }, value),
    sub && h("div", { style: { fontSize: "10.5px", color: ink, opacity: .65, marginTop: "1px" } }, sub),
  );
}
/* ปุ่มเลือก segment */
function segPicker(cur, onPick) {
  return h("div", { class: "chip-tabs", style: { flexWrap: "wrap" } },
    segments().map((s) => h("button", {
      type: "button", class: "chip" + (cur === s.id ? " active" : ""),
      style: cur === s.id ? { background: s.c, borderColor: s.c, color: "#fff" } : {},
      onClick: () => onPick(s.id),
    }, h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: s.c, display: "inline-block", marginRight: "4px" } }), s.id + " " + s.name)),
  );
}
const noData = (msg) => note([msg || "ยังไม่มีไฟล์ธุรกรรมของช่วงนี้ — อัปโหลดเพิ่มได้ที่หน้า \"อัปโหลดข้อมูล Grab\""], { amber: true });

/* ---------- แท็บ 1: รายชั่วโมง ---------- */
function hourlyTab(state, repaint) {
  const s = segments().find((x) => x.id === state.seg);
  const hp = hourlyProfile(state.seg);
  const st = segStats(state.seg);
  return h("div", { class: "stack", style: { gap: "10px" } },
    segPicker(state.seg, (id) => { state.seg = id; repaint(); }),
    !hp ? noData() : h("div", { class: "card", style: { padding: "14px 16px" } },
      h("div", { class: "split" },
        h("div", { style: { fontWeight: 800, fontSize: "13.5px" } }, "🕐 ออเดอร์/วัน รายชั่วโมง · ช่วง " + s.name),
        tag(hp.src === "peak" ? "ไฟล์ Peak Hour จริง" : "จากเวลาออเดอร์จริง", { kind: "ok" })),
      barChart(hp.data.map((d) => ({ v: d.v, label: d.hour + "" })), { h: 130, color: s.c }),
      h("div", { style: { fontSize: "11px", color: "var(--faint)", marginTop: "4px" } },
        "เฉลี่ยจาก " + hp.days + " วันขาย — พีคสุด " + hp.data.reduce((m, d) => (d.v > m.v ? d : m)).hour + ":00 น." + (st && st.hasData ? " · รวม " + st.ordersPerDay + " ออเดอร์/วัน" : "")),
    ),
  );
}

/* ---------- แท็บ 2: รายวัน จ-อา ---------- */
function dowTab(state, repaint) {
  const s = segments().find((x) => x.id === state.seg);
  const data = dowProfile(state.seg);
  return h("div", { class: "stack", style: { gap: "10px" } },
    segPicker(state.seg, (id) => { state.seg = id; repaint(); }),
    !data ? noData() : h("div", { class: "card", style: { padding: "14px 16px" } },
      h("div", { style: { fontWeight: 800, fontSize: "13.5px", marginBottom: "4px" } }, "📆 ออเดอร์/วัน แยกวันจันทร์-อาทิตย์ · " + s.name),
      barChart(data.map((d) => ({ v: d.v, label: d.dow })), { h: 130, color: s.c }),
      (() => { const best = data.reduce((m, d) => (d.v > m.v ? d : m)); const worst = data.reduce((m, d) => (d.v < m.v ? d : m));
        return h("div", { style: { fontSize: "11.5px", color: "var(--muted)", marginTop: "4px" } }, "ขายดีสุดวัน", h("b", null, best.dow), " (" + best.v + ") · เบาสุดวัน", h("b", null, worst.dow), " (" + worst.v + ")"); })(),
    ),
  );
}

/* ---------- แท็บ 3: เมนู + ตารางเตรียมของ ---------- */
function menuTab(state, repaint) {
  const s = segments().find((x) => x.id === state.seg);
  const names = menuItems(); const M = menuDaily();
  // รวมยอดเมนูในช่วง segment
  const tot = {}; let units = 0;
  for (const d in M) { if (d < s.from || d > s.to) continue; for (const [ix, u, g] of M[d]) { const t = tot[ix] || (tot[ix] = { u: 0, g: 0 }); t.u += u; t.g += g; units += u; } }
  const top = Object.keys(tot).map((ix) => ({ name: names[ix], ...tot[ix] })).sort((a, b) => b.u - a.u).slice(0, 8);
  const prep = prepTable(state.seg);
  const cellS = { padding: "5px 4px", fontSize: "11.5px", textAlign: "right", fontVariantNumeric: "tabular-nums" };
  return h("div", { class: "stack", style: { gap: "10px" } },
    segPicker(state.seg, (id) => { state.seg = id; repaint(); }),
    !top.length ? noData("ยังไม่มีไฟล์ยอดขายรายเมนูของช่วงนี้") : h("div", { class: "card", style: { padding: "14px 16px" } },
      h("div", { style: { fontWeight: 800, fontSize: "13.5px", marginBottom: "8px" } }, "🏆 เมนูขายดี · " + s.name),
      h("div", { class: "stack", style: { gap: "7px" } }, top.map((m) => {
        const pct = r1(m.u / units * 100); const img = dishImageUrl(m.name);
        return h("div", { class: "rowflex", style: { gap: "9px" } },
          img ? h("img", { src: img, alt: "", style: { width: "34px", height: "34px", borderRadius: "10px", objectFit: "cover", flex: "none" } })
            : h("span", { style: { width: "34px", height: "34px", borderRadius: "10px", background: "#F4F0E8", display: "grid", placeItems: "center", flex: "none" } }, "🍛"),
          h("div", { style: { flex: 1, minWidth: 0 } },
            h("div", { style: { fontSize: "11.5px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, m.name),
            h("div", { class: "meter", style: { marginTop: "3px" } }, h("i", { style: { width: Math.max(3, pct * 3) + "%", background: s.c } }))),
          h("div", { style: { textAlign: "right", flex: "none" } },
            h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "12.5px" } }, fmt(m.u) + " จาน"),
            h("div", { class: "tnum", style: { fontSize: "10.5px", color: "var(--muted)" } }, pct + "%")));
      })),
    ),
    prep && h("div", { class: "card", style: { padding: "14px 16px" } },
      h("div", { style: { fontWeight: 800, fontSize: "13.5px" } }, "🥩 ตารางเตรียมวัตถุดิบ (กรัมสุก/วัน)"),
      h("div", { style: { fontSize: "11px", color: "var(--muted)", margin: "2px 0 8px" } }, "เฉลี่ยจากยอดขายจริงช่วง " + s.name + " แยกวันจันทร์-อาทิตย์ — พนักงานใช้เตรียมของล่วงหน้า"),
      h("div", { style: { overflowX: "auto" } },
        h("div", { style: { minWidth: "430px" } },
          h("div", { style: { display: "grid", gridTemplateColumns: "76px repeat(7,1fr) 54px", background: "#F2FAF5", borderRadius: "10px", padding: "6px 4px", fontWeight: 700 } },
            h("div", { style: { ...cellS, textAlign: "left" } }, "วัตถุดิบ"), DOW_TH.map((d) => h("div", { style: { ...cellS, textAlign: "center" } }, d)), h("div", { style: { ...cellS, color: "var(--primary-dark,#2E7D4F)" } }, "เฉลี่ย")),
          prep.proteins.map((p, i) => h("div", { style: { display: "grid", gridTemplateColumns: "76px repeat(7,1fr) 54px", borderBottom: "1px solid var(--border-soft)", padding: "2px 4px", background: i % 2 ? "#FBFDFB" : "transparent" } },
            h("div", { style: { ...cellS, textAlign: "left", fontWeight: 700 } }, p.name),
            p.byDow.map((v) => h("div", { style: { ...cellS, textAlign: "center", color: "var(--muted)" } }, fmt(v))),
            h("div", { style: { ...cellS, fontWeight: 800, color: "var(--primary-dark,#2E7D4F)" } }, fmt(p.avg)))),
        )),
      h("div", { style: { marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } },
        prep.rice.map((rr) => h("div", { style: { borderRadius: "12px", background: "#FFF7E8", padding: "9px 11px" } },
          h("div", { style: { fontSize: "11.5px", fontWeight: 700 } }, "🍚 " + rr.name),
          h("div", { class: "tnum", style: { fontSize: "15px", fontWeight: 800, marginTop: "2px" } }, fmt(rr.cooked) + " ก.สุก/วัน"),
          h("div", { style: { fontSize: "10.5px", color: "var(--muted)" } }, "= ข้าวสาร ~" + fmt(rr.raw) + " ก. (หุง ×2.2)")))),
    ),
  );
}

/* ---------- แท็บ 4: Ads ---------- */
function adsTab() {
  const all = adsSummary(); const mo = adsMonthly(); const daily = adsDailySeries(30);
  const share = adsOrderShare(); const camp = campaignRows();
  const roasGood = all.roas >= 3;
  return h("div", { class: "stack", style: { gap: "10px" } },
    h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } },
      kpiCard({ emoji: "🎯", label: "ROAS ทั้งช่วง", value: "×" + all.roas, sub: roasGood ? "≥3 = คุ้มมาก · ตอนนี้ดีมาก" : "ต่ำกว่า 3 — ควรทบทวน", bg: roasGood ? "#DFF0E6" : "#FFF3D6", ink: roasGood ? "#2E7D4F" : "#9A6A00" }),
      kpiCard({ emoji: "💸", label: "ค่าโฆษณา/ออเดอร์", value: "฿" + all.costPerOrder, sub: "รวมจ่าย ฿" + fmt(all.spend), bg: "#E3EDFB", ink: "#2E6BB0" }),
      kpiCard({ emoji: "🛍️", label: "ออเดอร์จาก Ads", value: fmt(all.orders), sub: share + "% ของออเดอร์ทั้งหมด", bg: "#F1E8FA", ink: "#7A4FA8" }),
      kpiCard({ emoji: "💰", label: "ยอดขายจาก Ads", value: "฿" + fmt(all.sales), sub: "คลิก " + fmt(all.clicks) + " · เห็น " + fmt(all.impr), bg: "#FFF3D6", ink: "#9A6A00" }),
    ),
    h("div", { class: "card", style: { padding: "14px 16px" } },
      h("div", { style: { fontWeight: 800, fontSize: "13.5px", marginBottom: "4px" } }, "📣 ค่าโฆษณารายวัน (30 วันล่าสุด)"),
      barChart(daily.map((d) => ({ v: d.spend, label: +d.d.slice(8) + "" })), { h: 110, color: "#B9A7E6" }),
      h("div", { style: { fontSize: "11px", color: "var(--faint)", marginTop: "3px" } }, "ช่วงแคมเปญรัฐ (ปลาย มิ.ย.–ก.ค.) แทบไม่เสียค่า ads แต่ออเดอร์พุ่ง — ROAS รายวันสูงผิดปกติ"),
    ),
    h("div", { class: "card", style: { padding: "14px 16px" } },
      h("div", { style: { fontWeight: 800, fontSize: "13.5px", marginBottom: "6px" } }, "รายเดือน"),
      Object.keys(mo).sort().map((ym) => h("div", { class: "split", style: { padding: "5px 0", borderBottom: "1px solid var(--border-soft)" } },
        h("span", { style: { fontSize: "12.5px", fontWeight: 600 } }, thaiMonth(ym)),
        h("span", { class: "tnum", style: { fontSize: "12px" } }, "จ่าย ฿" + fmt(mo[ym].spend) + " · ขาย ฿" + fmt(mo[ym].sales) + " · ", h("b", { style: { color: mo[ym].roas >= 3 ? "var(--primary-dark,#2E7D4F)" : "#9A6A00" } }, "×" + mo[ym].roas)))),
      camp.length > 0 && h("div", { style: { marginTop: "10px" } },
        h("div", { style: { fontSize: "12px", fontWeight: 700, color: "var(--muted)", marginBottom: "4px" } }, "รายแคมเปญ"),
        camp.map((c) => h("div", { class: "split", style: { padding: "4px 0" } },
          h("span", { style: { fontSize: "11.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "55%" } }, c.name),
          h("span", { class: "tnum", style: { fontSize: "11.5px" } }, "฿" + fmt(Math.round(c.spend)) + " → ฿" + fmt(c.sales) + " (×" + c.roas + ")")))),
    ),
  );
}

/* ---------- แท็บ 5: ส่ง vs ใช้ ---------- */
function lossTab() {
  const sv = sendVsUse();
  const thD = (iso) => +iso.slice(8) + "/" + +iso.slice(5, 7);
  return h("div", { class: "stack", style: { gap: "10px" } },
    sv.warn && h("div", { class: "card", style: { padding: "12px 14px", background: "#FBE9E7", borderColor: "#E8B4A8" } },
      h("div", { class: "rowflex", style: { gap: "9px" } },
        h("span", { style: { fontSize: "20px" } }, "🚨"),
        h("div", null,
          h("div", { style: { fontWeight: 800, fontSize: "13.5px", color: "#B3402A" } }, "ของหาย " + sv.pctT + "% เกินเกณฑ์ " + sv.warnPct + "% — ผิดปกติ"),
          h("div", { style: { fontSize: "11.5px", color: "#B3402A", opacity: .85 } }, "ควรนับสต๊อกจริง + เช็คการตัก/ชั่งต่อจาน · ตัวเลขคำนวณอัตโนมัติจาก ส่งจริง vs ใช้ตามยอดขายจริง")))),
    h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } },
      kpiCard({ emoji: "📉", label: "ของหายรวม", value: sv.lostT + " กก. (" + sv.pctT + "%)", sub: "ช่วง " + thD(sv.from) + " – " + thD(sv.to), bg: "#FBE9E7", ink: "#B3402A" }),
      kpiCard({ emoji: "💸", label: "คิดเป็นเงิน", value: "฿" + fmt(sv.costT), sub: "ตีราคาขายส่งต่อกก.", bg: "#FBE9E7", ink: "#B3402A" }),
    ),
    h("div", { class: "card", style: { padding: "14px 16px" } },
      h("div", { style: { fontWeight: 800, fontSize: "13.5px", marginBottom: "6px" } }, "⚖️ ส่งเข้าครัว vs ใช้จริงตามยอดขาย (กก.)"),
      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 52px 52px 52px 64px", gap: "3px", fontSize: "11px", fontWeight: 700, color: "var(--muted)", padding: "0 2px 4px" } },
        h("div", null, "วัตถุดิบ"), h("div", { style: { textAlign: "right" } }, "ส่ง"), h("div", { style: { textAlign: "right" } }, "ใช้"), h("div", { style: { textAlign: "right" } }, "หาย"), h("div", { style: { textAlign: "right" } }, "มูลค่า")),
      sv.rows.map((r) => h("div", { style: { display: "grid", gridTemplateColumns: "1fr 52px 52px 52px 64px", gap: "3px", padding: "6px 2px", borderBottom: "1px solid var(--border-soft)", fontSize: "12.5px" } },
        h("div", { style: { fontWeight: 700 } }, r.protein, " ", r.pct > 25 && tag(r.pct + "%", { kind: "dgr" })),
        h("div", { class: "tnum", style: { textAlign: "right" } }, r.sent),
        h("div", { class: "tnum", style: { textAlign: "right", color: "var(--muted)" } }, r.used),
        h("div", { class: "tnum", style: { textAlign: "right", color: r.lost > 0 ? "var(--danger,#C24040)" : "var(--text)", fontWeight: 700 } }, r.lost),
        h("div", { class: "tnum", style: { textAlign: "right", color: "var(--danger,#C24040)" } }, "฿" + fmt(r.cost)))),
      h("div", { style: { fontSize: "11px", color: "var(--faint)", marginTop: "6px" } }, "\"ใช้\" คำนวณจากยอดขายเมนูจริง × กรัมต่อจาน · \"ส่ง\" แก้ได้ในหน้า ตั้งค่ารายงาน Grab (อัปเดตทุกรอบส่งของ)"),
    ),
    note(["คุมของหายให้เหลือ ≤20% = ประหยัดได้ราวเดือนละ ", h("b", null, "฿" + fmt(Math.round(sv.costT * 30 / 26 * (1 - 20 / Math.max(sv.pctT, 20))))), " — ดูผลต่อจุดคุ้มทุนที่แท็บ \"คุ้มทุน\""], { iconName: "leaf" }),
  );
}

/* ---------- แท็บ 6: จุดคุ้มทุน ---------- */
function beTab() {
  const be = breakevenScenarios();
  return h("div", { class: "stack", style: { gap: "10px" } },
    h("div", { class: "card", style: { padding: "14px 16px" } },
      h("div", { style: { fontWeight: 800, fontSize: "13.5px" } }, "🎯 จุดคุ้มทุน — ต้องขายกี่ออเดอร์/วัน"),
      h("div", { style: { fontSize: "11.5px", color: "var(--muted)", margin: "3px 0 10px" } },
        "เงินเข้า/ออเดอร์ล่าสุด ฿" + be.poPerOrder + " − (อาหาร ฿" + be.food + " + ข้าวแพ็ก ฿" + be.pack + " + ของหาย) = กำไรส่วนเกิน/ออเดอร์"),
      h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "7px" } },
        be.grid.flatMap((f, fi) => [
          h("div", { style: { gridColumn: "1 / -1", fontSize: "12px", fontWeight: 800, marginTop: "4px" } }, (fi === 0 ? "🏠 " : "🏢 ") + f.name + " (fix ฿" + fmt(f.fix) + "/เดือน)"),
          f.cells.map((c) => {
            const ok = c.bePerDay !== Infinity && c.bePerDay <= 35;
            return h("div", { style: { borderRadius: "13px", padding: "9px 10px", background: c.pct === 0 ? "#DFF0E6" : c.pct <= 20 ? "#FFF3D6" : "#FBE9E7", textAlign: "center" } },
              h("div", { style: { fontSize: "10px", fontWeight: 700, color: "var(--muted)" } }, c.name),
              h("div", { class: "tnum", style: { fontSize: "18px", fontWeight: 800, color: ok ? "#2E7D4F" : "#B3402A", marginTop: "2px" } }, c.bePerDay === Infinity ? "—" : c.bePerDay),
              h("div", { style: { fontSize: "9.5px", color: "var(--faint)" } }, "ออเดอร์/วัน · CM ฿" + c.cm));
          }),
        ])),
      be.base && h("div", { style: { fontSize: "11px", color: "var(--faint)", marginTop: "8px" } }, "ตอนนี้ขายเฉลี่ย " + be.base.ordersPerDay + " ออเดอร์/วัน (ช่วง " + be.base.seg.name + ") — เกินจุดคุ้มทุนเกือบทุกกรณี ✓"),
    ),
  );
}

/* ---------- หน้าใหญ่ ---------- */
export function grabReportsScreen({ back, go } = {}) {
  const segs = segments();
  const state = { tab: "hour", seg: segs[segs.length - 1].id };
  // KPI สรุปบน: ใช้ segment ล่าสุดที่มีข้อมูล
  let latest = null;
  for (const s of segs.slice().reverse()) { const st = segStats(s.id); if (st && st.hasData) { latest = st; break; } }
  const ads = adsSummary(); const sv = sendVsUse();
  const yms = monthList(); const lastFull = yms.filter((m) => m < "2026-07").pop();
  const pl = lastFull ? plMonth(lastFull) : null;

  const body = h("div", null);
  function repaint() {
    body.replaceChildren(
      state.tab === "hour" ? hourlyTab(state, repaint)
        : state.tab === "dow" ? dowTab(state, repaint)
        : state.tab === "menu" ? menuTab(state, repaint)
        : state.tab === "ads" ? adsTab()
        : state.tab === "loss" ? lossTab()
        : beTab(),
    );
  }
  const tabs = h("div", { class: "chip-tabs", style: { flexWrap: "wrap" } },
    [["hour", "🕐 รายชั่วโมง"], ["dow", "📆 จ-อา"], ["menu", "🍛 เมนู·เตรียมของ"], ["ads", "📣 Ads"], ["loss", "⚖️ ส่งvsใช้"], ["be", "🎯 คุ้มทุน"]].map(([id, t]) =>
      h("button", { type: "button", class: "chip" + (state.tab === id ? " active" : ""), style: { whiteSpace: "nowrap" }, onClick: (e) => { state.tab = id; [...e.currentTarget.parentNode.children].forEach((b) => b.classList.remove("active")); e.currentTarget.classList.add("active"); repaint(); } }, t)),
  );

  repaint();
  return h("div", { class: "page-wrap", "data-screen-label": "grabreports" },
    hdr({ title: "รายงาน Grab", sub: "จากไฟล์จริง ม.ค. – ก.ค. 69 · ทุกตัวเลขมีป้ายที่มา", onBack: back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    h("div", { class: "page stack", style: { paddingBottom: "16px" } },
      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" } },
        kpiCard({ emoji: "🛵", label: "ออเดอร์/วัน", value: latest ? String(latest.ordersPerDay) : "—", sub: latest ? "ช่วง" + latest.seg.name : "", bg: "#DFF0E6", ink: "#2E7D4F" }),
        kpiCard({ emoji: "🧾", label: "ยอด/ออเดอร์ (AOV)", value: latest ? "฿" + latest.aov : "—", sub: "ยอดขายสุทธิเฉลี่ย", bg: "#E3EDFB", ink: "#2E6BB0" }),
        kpiCard({ emoji: "💵", label: "เงินเข้า/ออเดอร์", value: latest ? "฿" + latest.poPerOrder : "—", sub: "หลังหักทุกค่าธรรมเนียม", bg: "#FFF3D6", ink: "#9A6A00" }),
        kpiCard({ emoji: "🎯", label: "ROAS", value: "×" + ads.roas, sub: ads.roas >= 3 ? "ดีมาก (เกณฑ์ ≥3)" : "ควรทบทวน", bg: ads.roas >= 3 ? "#DFF0E6" : "#FFF3D6", ink: ads.roas >= 3 ? "#2E7D4F" : "#9A6A00" }),
        kpiCard({ emoji: "📉", label: "ของหาย", value: sv.pctT + "%", sub: "฿" + fmt(sv.costT) + " ในรอบส่งล่าสุด", bg: "#FBE9E7", ink: "#B3402A" }),
        kpiCard({ emoji: "🌱", label: "กำไร " + (pl ? thaiMonth(pl.ym) : ""), value: pl ? (pl.net >= 0 ? "฿" + fmt(pl.net) : "−฿" + fmt(-pl.net)) : "—", sub: "ดูเต็มที่หน้างบการเงิน", bg: pl && pl.net >= 0 ? "#DFF0E6" : "#FBE9E7", ink: pl && pl.net >= 0 ? "#2E7D4F" : "#B3402A" }),
      ),
      tabs, body,
    ),
  );
}
