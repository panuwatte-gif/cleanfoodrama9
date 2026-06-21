// ============================================================
// pages/forecast.js — พยากรณ์ยอดขาย 7 วัน + back-test · พอร์ตจาก prototype2 screens-forecast.jsx
//   forecastScreen   — ทุกเมนู วันนี้+6 วัน · ช่วง ต่ำ/สูง · เฉลี่ยถ่วง · ความน่าจะเป็น
//   fcHistoryScreen  — เทียบทาย vs จริง (back-test)
// ctx = { go, back, toast, role }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag, emptyState, seg, searchBox, sectionTabs, itemIc, emo } from "../components/components.js";
import { mascot } from "../components/mascot.js";
import { fmt, itemById, sectionsFor, itemsOf, fc7, fc7DayTotals, WEEK7 } from "../utils/formulas.js";
import { cats } from "../data/store.js";
import { TODAY, FC_HISTORY } from "../data/seed.js";

const bold = (t) => h("b", null, t);
const fst = { filter: "all", q: "", range: "7", ctx: null };
const confCls = (v) => (v >= 85 ? "good" : v >= 78 ? "mid" : "low");

function fc7Card(it, tint) {
  const st = fc7(it.id);
  const days = st.days.map((d) => h("div", { class: "fc7-day" + (d.today ? " today" : "") },
    h("div", { class: "fc7-d-lbl" }, d.abbr, h("span", null, String(d.d))),
    h("div", { class: "fc7-d-range" }, String(d.lo), h("span", null, "–"), String(d.hi)),
    h("div", { class: "fc7-d-unit" }, st.u),
    h("div", { class: "fc7-d-conf " + confCls(d.conf) }, d.conf + "%"),
  ));
  const sumCell = (i, b, cls, u) => h("div", null, h("i", null, i), h("b", { class: cls }, String(b)), h("u", null, u));
  return h("div", { class: "fc7-card tint-" + tint },
    h("div", { class: "fc7-head" },
      itemIc(it, { sm: false }),
      h("div", { class: "fc7-name" },
        h("span", { class: "fc7-name-t" }, it.name),
        h("button", { type: "button", class: "fc7-hist", onClick: () => fst.ctx.go({ name: "fchistory" }) }, pi("history", 11), "ดูกราฟย้อนหลัง"),
      ),
      h("span", { class: "fc7-conf " + confCls(st.prob) }, "มั่นใจ " + st.prob + "%"),
    ),
    h("div", { class: "fc7-summary" },
      sumCell("ต่ำสุด", st.min, "lo", st.u),
      sumCell("สูงสุด", st.max, "hi", st.u),
      sumCell("เฉลี่ยถ่วง นน.", st.wavg, "avg", st.u),
      sumCell("โอกาส", st.prob + "%", "prob", "น่าจะเป็น"),
    ),
    h("div", { class: "fc7-rec" },
      pi("cart", 13),
      h("span", null, "เผื่อความปลอดภัย ", h("b", null, st.bufPct + "%"), " → แนะนำสั่ง ", h("b", { class: "fc7-rec-v" }, st.rec + " " + st.u), "/วัน"),
    ),
    h("div", { class: "fc7-days" }, days),
  );
}

export function forecastScreen(ctx) {
  fst.ctx = ctx;
  fst.filter = "all"; fst.q = ""; fst.range = "7";
  const root = h("div", { class: "page-wrap", "data-screen-label": "forecast" });
  paint(root);
  return root;
}

function paint(root) {
  const { go, back, toast } = fst.ctx;
  const FC_CATS = cats().filter((c) => ["protein", "egg", "drink"].includes(c.id));
  const q = fst.q.toLowerCase();
  const matchQ = (it) => !q || it.name.toLowerCase().includes(q);
  const sections = sectionsFor(FC_CATS)
    .map((s) => ({ ...s, items: s.items.filter(matchQ) }))
    .filter((s) => s.items.length && (fst.filter === "all" || s.id === fst.filter));
  const dayTotals = fc7DayTotals(itemsOf("protein"));
  const weekLabel = WEEK7[0].d + "–" + WEEK7[6].d + " " + TODAY.mon;

  const searchEl = searchBox({ value: fst.q, onChange: (v) => { fst.q = v; paint(root); }, placeholder: "ค้นหาเมนู…" });

  const sectionNodes = [];
  sections.forEach((sec) => {
    sectionNodes.push(h("div", { class: "overline", style: { display: "flex", alignItems: "center", gap: "7px" } }, emo(sec.icon, { s: 14 }), sec.name));
    sec.items.forEach((it) => sectionNodes.push(fc7Card(it, sec.tint)));
  });
  if (!sections.length) sectionNodes.push(emptyState({ compact: true, iconName: "search", title: 'ไม่พบ "' + fst.q + '"', sub: "ลองพิมพ์ชื่อเมนูอื่น หรือเลือกหมวดด้านบน" }));

  const trendIc = pi("trend", 24); Object.assign(trendIc.style, { color: "var(--primary)", flex: "none" });

  root.replaceChildren(
    hdr({ title: "พยากรณ์ยอดขาย", sub: "ดูคาดการณ์ล่วงหน้า 7 วัน · " + weekLabel, onBack: back, right: h("span", { class: "catic helper-ic-violet" }, pi("trend", 18)) }),
    h("div", { class: "page stack" },
      h("div", { class: "fc7-hero" },
        h("span", { class: "fc7-hero-art" }, mascot(62, { spark: true })),
        h("div", { style: { flex: 1, minWidth: 0 } },
          h("div", { class: "fc7-hero-title" }, "แนวโน้มสัปดาห์นี้ ", h("b", null, "ดีขึ้น +12%")),
          h("div", { class: "fc7-hero-sub" }, "เทียบสัปดาห์ก่อน · โมเดลอัปเดตล่าสุด 09:30 น."),
        ),
        trendIc,
      ),
      h("div", { class: "fc7-stats" },
        h("div", null, h("i", null, "ความแม่นยำ"), h("b", null, "±5.6%")),
        h("div", null, h("i", null, "ช่วงคาดการณ์"), h("b", null, "7 วัน")),
        h("div", null, h("i", null, "วันที่"), h("b", null, weekLabel)),
      ),
      h("div", { class: "rowflex", style: { gap: "8px" } },
        seg({ value: fst.range, grow: true, options: [{ v: "7", t: "7 วัน" }, { v: "14", t: "14 วัน" }, { v: "30", t: "30 วัน" }], onChange: (v) => { if (v === "7") { fst.range = v; paint(root); } else toast("เดโม — ช่วง " + v + " วัน (ใช้ข้อมูลเพิ่ม)"); } }),
        h("button", { type: "button", class: "btn", style: { flex: "none", whiteSpace: "nowrap" }, onClick: () => go({ name: "fchistory" }) }, pi("history", 15), "back-test"),
      ),
      h("div", { class: "overline" }, "รวมเมนูอาหารต่อวัน · ช่วงคาดการณ์ (kg)"),
      h("div", { class: "fc7-daystrip" },
        dayTotals.map((d) => h("div", { class: "fc7-dt" + (d.today ? " today" : "") },
          h("span", { class: "fc7-dt-lbl" }, d.abbr + " " + d.d),
          h("span", { class: "fc7-dt-val" }, d.lo + "–" + d.hi),
          h("span", { class: "fc7-dt-u" }, "kg รวม"),
        )),
      ),
      searchEl,
      sectionTabs({ cats: FC_CATS, value: fst.filter, onChange: (id) => { fst.q = ""; fst.filter = id; paint(root); } }),
      note([h("span", null, "คาดการณ์"), bold("ทุกเมนู"), " วันนี้ + 6 วันล่วงหน้า — เลื่อนการ์ดด้านขวาเพื่อดูครบ 7 วัน · มี", bold("ช่วงต่ำ–สูง · เฉลี่ยถ่วงน้ำหนัก · ความน่าจะเป็น"), " ทุกตัว · แถบเขียว = ", bold("แนะนำสั่ง"), " (เฉลี่ย + เผื่อความปลอดภัยจากค่า assumption)"], { iconName: "trend" }),
      ...sectionNodes,
      h("button", { type: "button", class: "card list-press", style: { textAlign: "left", width: "100%" }, onClick: () => go({ name: "assumptions" }) },
        h("div", { class: "rowflex" },
          h("span", { class: "catic green sm" }, pi("settings", 15)),
          h("span", { style: { flex: 1, fontSize: "13.5px", fontWeight: 600 } }, "ปรับสูตรพยากรณ์ (ช่วงข้อมูลย้อนหลัง · เผื่อ)"),
          (() => { const c = pi("chev", 16); c.style.color = "var(--faint)"; return c; })(),
        ),
      ),
    ),
  );

  // refocus search (กัน focus หลุดตอนพิมพ์)
  if (fst.q) {
    const inp = searchEl.querySelector("input");
    if (inp) { inp.focus(); const n = inp.value.length; inp.setSelectionRange(n, n); }
  }
}

/* ===================== back-test ===================== */
export function fcHistoryScreen({ back } = {}) {
  const bars = [
    { l: "5 สัปดาห์", v: 1.8 }, { l: "4", v: 2.1 }, { l: "3", v: 1.9 },
    { l: "2", v: 2.3 }, { l: "ล่าสุด", v: 2.4, hi: true },
  ];
  const max = 2.5;
  const barCols = bars.map((b) => h("div", { class: "bcol" },
    h("span", { class: "bval" }, String(b.v)),
    h("span", { class: "bbar" + (b.hi ? " hi" : ""), style: { height: (b.v / max) * 62 + "px" } }),
    h("span", { class: "blbl" }, b.l),
  ));
  barCols.push(h("div", { class: "bcol" },
    h("span", { class: "bval", style: { color: "var(--primary-dark)", fontWeight: 700 } }, "2.2"),
    h("span", { class: "bbar ghost", style: { height: (2.2 / max) * 62 + "px" } }),
    h("span", { class: "blbl", style: { color: "var(--primary-dark)", fontWeight: 700 } }, "พรุ่งนี้"),
  ));

  const thead = h("tr", { style: { color: "var(--muted)", fontSize: "11.5px" } },
    h("th", { style: { textAlign: "left", padding: "8px 0", fontWeight: 600 } }, "วันที่"),
    ...["ทาย", "จริง", "error"].map((t) => h("th", { style: { textAlign: "right", padding: "8px 0", fontWeight: 600 } }, t)),
  );
  const trows = FC_HISTORY.map((r) => h("tr", { style: { borderTop: "1px solid var(--border-soft)" } },
    h("td", { style: { padding: "8px 0", fontFamily: "var(--font-ui)" } }, r.d),
    h("td", { style: { textAlign: "right", padding: "8px 0" } }, String(r.pred)),
    h("td", { style: { textAlign: "right", padding: "8px 0", fontWeight: 700 } }, String(r.real)),
    h("td", { style: { textAlign: "right", padding: "8px 0", fontWeight: 700, color: r.hit ? "var(--primary-dark)" : "var(--warning-ink)" } }, r.err),
  ));

  return h("div", { class: "page-wrap", "data-screen-label": "fchistory" },
    hdr({ title: "พยากรณ์ย้อนหลัง", sub: "เทียบที่ทายไว้ กับของจริง · กระเพราเนื้อ", onBack: back, right: itemIc("kp-beef", { sm: false }) }),
    h("div", { class: "page stack" },
      h("div", { class: "card" },
        h("div", { class: "overline", style: { marginBottom: "12px" } }, 'ยอดขาย "วันศุกร์" ย้อนหลัง (kg)'),
        h("div", { class: "bars" }, barCols),
      ),
      h("div", { class: "card", style: { padding: "6px 16px 10px" } },
        h("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" } },
          h("thead", null, thead),
          h("tbody", { class: "tnum" }, trows),
        ),
      ),
      h("div", { class: "card split", style: { padding: "13px 16px" } },
        h("span", { style: { fontSize: "13px", fontWeight: 600, color: "var(--muted)" } }, "error เฉลี่ยเดือนนี้"),
        tag("±5.6%", { kind: "ok" }),
      ),
      note("โมเดลใช้ค่า error เหล่านี้ปรับช่วงพยากรณ์ให้แคบลงเอง — แม่นขึ้นเรื่อยๆ"),
    ),
  );
}
