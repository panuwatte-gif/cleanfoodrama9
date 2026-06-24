// ============================================================
// pages/forecast.js — พยากรณ์ยอดขาย 7 วัน + back-test (ใช้ engine จริง)
//   อนุมานยอดขายจากผลต่างการนับสต๊อกรายวัน (utils/forecast.js) — ไม่มีตัวเลขเดโม
//   ยังไม่มีข้อมูลพอ → empty state ซื่อสัตย์ (บอกให้เริ่มนับสต๊อกทุกวัน)
// ctx = { go, back, toast, role }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag, emptyState, searchBox, sectionTabs, itemIc, emo } from "../components/components.js";
import { mascot } from "../components/mascot.js";
import { fmt, itemById, unitOf, itemsOf, sectionsFor } from "../utils/formulas.js";
import { cats } from "../data/store.js";
import {
  hasSalesData, forecastItem, forecastNext, backtestSeries,
  todayISO, addDaysISO, DOW_SHORT,
} from "../utils/forecast.js";

const bold = (t) => h("b", null, t);
const fst = { filter: "all", q: "", ctx: null };
const confOf = (fc) => fc && fc.mape != null ? Math.max(40, Math.min(96, Math.round(100 - fc.bandPct))) : 55;
const confCls = (v) => (v >= 85 ? "good" : v >= 70 ? "mid" : "low");
const dayNum = (iso) => Number(iso.slice(8, 10));
const foodItems = () => [...itemsOf("protein"), ...itemsOf("egg"), ...itemsOf("drink")];

// การ์ดพยากรณ์ 7 วัน ของรายการเดียว (ใช้ engine)
function fcCard(it, tint) {
  const u = unitOf(it);
  const days = forecastNext(it.id, 7);
  const withFc = days.filter((d) => d.fc);
  if (!withFc.length) {
    return h("div", { class: "fc7-card tint-" + tint },
      h("div", { class: "fc7-head" }, itemIc(it, { sm: false }),
        h("div", { class: "fc7-name" }, h("span", { class: "fc7-name-t" }, it.name)),
        tag("ยังไม่มีข้อมูล", { kind: "fifo" })),
      h("div", { style: { fontSize: "12px", color: "var(--muted)", padding: "6px 2px 2px" } },
        "ยังนับสต๊อกของเมนูนี้ติดกันไม่พอ — นับ 2 วันติดเมื่อไหร่ ระบบเริ่มทายให้ทันที"),
    );
  }
  const lo = Math.min(...withFc.map((d) => d.fc.low));
  const hi = Math.max(...withFc.map((d) => d.fc.high));
  const avg = withFc.reduce((s, d) => s + d.fc.predicted, 0) / withFc.length;
  const base = withFc[0].fc;                       // ตัวแรก (พรุ่งนี้) ใช้โชว์ n/ความมั่นใจรวม
  const prob = confOf(base);
  const recDay = withFc.find((d) => true).fc;      // พรุ่งนี้

  const dayCells = days.map((d) => {
    const f = d.fc;
    return h("div", { class: "fc7-day" },
      h("div", { class: "fc7-d-lbl" }, DOW_SHORT[d.dow], h("span", null, String(dayNum(d.date)))),
      h("div", { class: "fc7-d-range" }, f ? String(f.low) : "—", f ? h("span", null, "–") : null, f ? String(f.high) : null),
      h("div", { class: "fc7-d-unit" }, u),
      h("div", { class: "fc7-d-conf " + confCls(confOf(f)) }, f ? confOf(f) + "%" : "—"),
    );
  });

  const sumCell = (i, b, cls, uu) => h("div", null, h("i", null, i), h("b", { class: cls }, String(b)), h("u", null, uu));
  return h("div", { class: "fc7-card tint-" + tint },
    h("div", { class: "fc7-head" },
      itemIc(it, { sm: false }),
      h("div", { class: "fc7-name" },
        h("span", { class: "fc7-name-t" }, it.name),
        h("button", { type: "button", class: "fc7-hist", onClick: () => fst.ctx.go({ name: "fchistory", id: it.id }) }, pi("history", 11), "ดูย้อนหลัง"),
      ),
      h("span", { class: "fc7-conf " + confCls(prob) }, base.n >= 5 ? "มั่นใจ " + prob + "%" : base.n >= 3 ? "ข้อมูลปานกลาง" : "ข้อมูลน้อย"),
    ),
    h("div", { class: "fc7-summary" },
      sumCell("ต่ำสุด", lo, "lo", u),
      sumCell("สูงสุด", hi, "hi", u),
      sumCell("เฉลี่ย/วัน", fmt(Math.round(avg * 100) / 100), "avg", u),
      sumCell("ช่วงคลาด", base.mape != null ? "±" + base.bandPct + "%" : "กว้าง", "prob", base.mape != null ? "MAPE" : "ข้อมูลน้อย"),
    ),
    h("div", { class: "fc7-rec" },
      pi("cart", 13),
      h("span", null, "กันขาด → แนะนำเตรียม ", h("b", { class: "fc7-rec-v" }, recDay.high + " " + u), "/วัน (ยอดสูงของช่วง)"),
    ),
    h("div", { class: "fc7-days" }, dayCells),
  );
}

export function forecastScreen(ctx) {
  fst.ctx = ctx;
  fst.filter = "all"; fst.q = "";
  const root = h("div", { class: "page-wrap", "data-screen-label": "forecast" });
  paint(root);
  return root;
}

function emptyForecast(go) {
  return h("div", { class: "page stack" },
    h("div", { class: "fc7-hero" },
      h("span", { class: "fc7-hero-art" }, mascot(62, { spark: true })),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { class: "fc7-hero-title" }, "ยังไม่มีข้อมูลพยากรณ์"),
        h("div", { class: "fc7-hero-sub" }, "ระบบทายจากผลต่างการนับสต๊อก — ยังไม่มีให้คำนวณ"),
      ),
    ),
    h("div", { class: "card", style: { lineHeight: 1.7 } },
      h("div", { class: "overline", style: { marginBottom: "6px" } }, "เริ่มยังไง"),
      h("div", { style: { fontSize: "13px", color: "var(--text)" } },
        h("b", null, "นับสต๊อกทุกวัน"), " (เมนู ", h("b", null, "ตรวจนับ"), ") — พอนับ ", h("b", null, "2 วันติดกัน"),
        " ระบบจะคำนวณ ", h("b", null, "ยอดขาย = คงเหลือเมื่อวาน + รับเข้า − ของเสีย − คงเหลือวันนี้"),
        " แล้วเริ่มพยากรณ์ให้เองทันที · ยิ่งนับครบหลายสัปดาห์ ช่วงคาดการณ์ยิ่งแคบ (แม่นขึ้น)"),
    ),
    h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => go({ name: "count" }) }, pi("clipboard", 16), "ไปนับสต๊อกตอนนี้"),
    note(["พยากรณ์/อันดับขายดี-ขายน้อย ผูกกับ", bold("ข้อมูลการนับจริง"), " — ไม่มีตัวเลขสมมุติ"], { iconName: "trend" }),
  );
}

function paint(root) {
  const { go, back } = fst.ctx;
  const headRight = h("span", { class: "catic helper-ic-violet" }, pi("trend", 18));

  if (!hasSalesData()) {
    root.replaceChildren(
      hdr({ title: "พยากรณ์ยอดขาย", sub: "คาดการณ์ล่วงหน้า 7 วัน จากข้อมูลนับสต๊อก", onBack: back, right: headRight }),
      emptyForecast(go),
    );
    return;
  }

  const FC_CATS = cats().filter((c) => ["protein", "egg", "drink"].includes(c.id));
  const q = fst.q.toLowerCase();
  const matchQ = (it) => !q || it.name.toLowerCase().includes(q);
  const sections = sectionsFor(FC_CATS)
    .map((s) => ({ ...s, items: s.items.filter(matchQ) }))
    .filter((s) => s.items.length && (fst.filter === "all" || s.id === fst.filter));

  // แถบรวมต่อวัน (ผลรวมช่วงพยากรณ์ของอาหารทุกเมนู)
  const base = todayISO();
  const dayTotals = [];
  for (let i = 1; i <= 7; i++) {
    const date = addDaysISO(base, i);
    let lo = 0, hi = 0, any = false;
    for (const it of foodItems()) { const f = forecastItem(it.id, date); if (f) { any = true; lo += f.low; hi += f.high; } }
    dayTotals.push({ date, dow: new Date(date + "T00:00:00").getDay(), lo: Math.round(lo * 10) / 10, hi: Math.round(hi * 10) / 10, any });
  }

  const searchEl = searchBox({ value: fst.q, onChange: (v) => { fst.q = v; paint(root); }, placeholder: "ค้นหาเมนู…" });

  const sectionNodes = [];
  sections.forEach((sec) => {
    sectionNodes.push(h("div", { class: "overline", style: { display: "flex", alignItems: "center", gap: "7px" } }, emo(sec.icon, { s: 14 }), sec.name));
    sec.items.forEach((it) => sectionNodes.push(fcCard(it, sec.tint)));
  });
  if (!sections.length) sectionNodes.push(emptyState({ compact: true, iconName: "search", title: fst.q ? 'ไม่พบ "' + fst.q + '"' : "ยังไม่มีเมนูในหมวดนี้", sub: "ลองพิมพ์ชื่อเมนูอื่น หรือเลือกหมวดด้านบน" }));

  root.replaceChildren(
    hdr({ title: "พยากรณ์ยอดขาย", sub: "คาดการณ์ล่วงหน้า 7 วัน · อิงข้อมูลนับสต๊อกจริง", onBack: back, right: headRight }),
    h("div", { class: "page stack" },
      h("div", { class: "overline" }, "รวมอาหารต่อวัน · ช่วงคาดการณ์"),
      h("div", { class: "fc7-daystrip" },
        dayTotals.map((d) => h("div", { class: "fc7-dt" },
          h("span", { class: "fc7-dt-lbl" }, DOW_SHORT[d.dow] + " " + dayNum(d.date)),
          h("span", { class: "fc7-dt-val" }, d.any ? d.lo + "–" + d.hi : "—"),
          h("span", { class: "fc7-dt-u" }, "รวม"),
        )),
      ),
      searchEl,
      sectionTabs({ cats: FC_CATS, value: fst.filter, onChange: (id) => { fst.q = ""; fst.filter = id; paint(root); } }),
      note([h("span", null, "ทายจาก"), bold("ผลต่างการนับสต๊อก"), " แยกตามวันในสัปดาห์ + เฉลี่ยถ่วงน้ำหนัก (λ จูนอัตโนมัติ) · ช่วง ต่ำ–สูง มาจาก ", bold("MAPE จริง"), " · ข้อมูลน้อย = ช่วงกว้างไว้ก่อน (ปลอดภัย)"], { iconName: "trend" }),
      ...sectionNodes,
      h("button", { type: "button", class: "card list-press", style: { textAlign: "left", width: "100%" }, onClick: () => go({ name: "assumptions" }) },
        h("div", { class: "rowflex" },
          h("span", { class: "catic green sm" }, pi("settings", 15)),
          h("span", { style: { flex: 1, fontSize: "13.5px", fontWeight: 600 } }, "ปรับค่ากลางระบบ (เกณฑ์สต๊อกต่ำ · เผื่อความปลอดภัย)"),
          (() => { const c = pi("chev", 16); c.style.color = "var(--faint)"; return c; })(),
        ),
      ),
    ),
  );

  if (fst.q) { const inp = searchEl.querySelector("input"); if (inp) { inp.focus(); const n = inp.value.length; inp.setSelectionRange(n, n); } }
}

/* ===================== back-test (เทียบทาย vs จริง · ต่อเมนู) ===================== */
export function fcHistoryScreen({ back, id } = {}) {
  // เลือกเมนู: ที่ส่งมา → ไม่งั้นเมนูแรกที่มีจุด back-test
  let itemId = id;
  if (!itemId || !backtestSeries(itemId).length) {
    const found = foodItems().find((it) => backtestSeries(it.id).length);
    itemId = found ? found.id : (itemId || (foodItems()[0] && foodItems()[0].id));
  }
  const it = itemById(itemId);
  const rows = itemId ? backtestSeries(itemId) : [];
  const u = it ? unitOf(it) : "";

  if (!rows.length) {
    return h("div", { class: "page-wrap", "data-screen-label": "fchistory" },
      hdr({ title: "พยากรณ์ย้อนหลัง", sub: "เทียบที่ทายไว้ กับของจริง", onBack: back, right: it ? itemIc(itemId, { sm: false }) : null }),
      h("div", { class: "page stack" },
        emptyState({ iconName: "history", title: "ยังเทียบย้อนหลังไม่ได้", sub: "ต้องมีประวัติการนับวันเดียวกัน (เช่นทุกวันศุกร์) อย่างน้อย 3 จุด — นับสต๊อกต่อเนื่องอีกสักพักแล้วกลับมาดู" }),
      ),
    );
  }

  const valid = rows.filter((r) => r.errPct != null);
  const mape = valid.length ? Math.round(valid.reduce((s, r) => s + Math.abs(r.errPct), 0) / valid.length * 10) / 10 : null;
  const recent = rows.slice(-8);
  const max = Math.max(...recent.map((r) => Math.max(r.real, r.pred)), 1);

  const barCols = recent.map((r) => h("div", { class: "bcol" },
    h("span", { class: "bval" }, String(r.real)),
    h("span", { class: "bbar" + (r.hit ? " hi" : ""), style: { height: (r.real / max) * 62 + "px" } }),
    h("span", { class: "blbl" }, r.dowName + r.date.slice(8, 10)),
  ));

  const thead = h("tr", { style: { color: "var(--muted)", fontSize: "11.5px" } },
    h("th", { style: { textAlign: "left", padding: "8px 0", fontWeight: 600 } }, "วันที่"),
    ...["ทาย", "จริง", "error"].map((t) => h("th", { style: { textAlign: "right", padding: "8px 0", fontWeight: 600 } }, t)),
  );
  const trows = rows.slice(-14).reverse().map((r) => h("tr", { style: { borderTop: "1px solid var(--border-soft)" } },
    h("td", { style: { padding: "8px 0", fontFamily: "var(--font-ui)" } }, r.dowName + " " + r.date.slice(5)),
    h("td", { style: { textAlign: "right", padding: "8px 0" } }, String(r.pred)),
    h("td", { style: { textAlign: "right", padding: "8px 0", fontWeight: 700 } }, String(r.real)),
    h("td", { style: { textAlign: "right", padding: "8px 0", fontWeight: 700, color: r.hit ? "var(--primary-dark)" : "var(--warning-ink)" } }, r.errPct == null ? "—" : (r.errPct > 0 ? "+" : "") + r.errPct + "%"),
  ));

  return h("div", { class: "page-wrap", "data-screen-label": "fchistory" },
    hdr({ title: "พยากรณ์ย้อนหลัง", sub: "เทียบที่ทายไว้ กับของจริง · " + (it ? it.name : ""), onBack: back, right: itemIc(itemId, { sm: false }) }),
    h("div", { class: "page stack" },
      h("div", { class: "card" },
        h("div", { class: "overline", style: { marginBottom: "12px" } }, "ยอดขายจริงย้อนหลัง (" + u + ")"),
        h("div", { class: "bars" }, barCols),
      ),
      h("div", { class: "card", style: { padding: "6px 16px 10px" } },
        h("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" } },
          h("thead", null, thead),
          h("tbody", { class: "tnum" }, trows),
        ),
      ),
      h("div", { class: "card split", style: { padding: "13px 16px" } },
        h("span", { style: { fontSize: "13px", fontWeight: 600, color: "var(--muted)" } }, "error เฉลี่ย (MAPE)"),
        mape != null ? tag("±" + mape + "%", { kind: mape <= 15 ? "ok" : "warn" }) : tag("ยังไม่พอ", { kind: "fifo" }),
      ),
      note("โมเดลใช้ค่า error เหล่านี้ปรับช่วงพยากรณ์ + จูน λ ให้เอง — นับครบหลายสัปดาห์ยิ่งแม่น"),
    ),
  );
}
