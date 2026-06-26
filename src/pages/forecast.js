// ============================================================
// pages/forecast.js — Inventory Analysis (วิเคราะห์สต๊อกต่อวัตถุดิบ)
//   ต่อรายการ: คงเหลือ · ใช้ถึงรอบรับของถัดไป · สาขาเบิก · ค่าเผื่อ · รวมที่ต้องมี ·
//   ควรเติม · วันคงเหลือ · สถานะ พอ/เสี่ยง/ไม่พอ · โหมดที่ใช้ + เหตุผล
//   ทางเดียวของระบบพยากรณ์ (forecast/forecastEngine + inventoryPlanner)
// ctx = { go, back, role }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, searchBox, sectionTabs, emptyState, itemIc, tag, emo } from "../components/components.js";
import { mascot } from "../components/mascot.js";
import { items, cats } from "../data/store.js";
import { unitOf, fmtQty, matchCat, sectionsFor } from "../utils/formulas.js";
import { hasUsageData } from "../utils/usage.js";
import { planIngredient } from "../forecast/inventoryPlanner.js";
import { getActiveForecastMode, MODE_LABEL } from "../forecast/eventRegimeManager.js";

const bold = (t) => h("b", null, t);
const fst = { ctx: null, filter: "all", q: "" };
const MODE_TINT = { normal: "green", event: "amber", event_ramp: "amber", event_stable: "violet", post_event: "blue", new_store: "rose", manual_override: "rose" };
const STATUS = { "พอ": { k: "ok", c: "var(--primary-dark)" }, "เสี่ยง": { k: "warn", c: "var(--warning-ink)" }, "ไม่พอ": { k: "dgr", c: "var(--danger)" } };

export function forecastScreen(ctx) {
  fst.ctx = ctx; fst.filter = "all"; fst.q = "";
  const root = h("div", { class: "page-wrap", "data-screen-label": "forecast" });
  paint(root);
  return root;
}

// แถวตัวเลขในการ์ด
function statRow(label, val, opt = {}) {
  return h("div", { class: "split", style: { padding: "5px 0", borderTop: opt.top ? "1px solid var(--border-soft)" : "none" } },
    h("span", { style: { fontSize: "12.5px", color: "var(--muted)" } }, label),
    h("span", { class: "tnum", style: { fontWeight: opt.bold ? 800 : 600, fontSize: opt.bold ? "15px" : "13px", color: opt.color || "var(--text)" } }, val),
  );
}

function card(it) {
  const p = planIngredient(it.id);
  const u = unitOf(it);
  if (!p) {
    return h("div", { class: "card", style: { padding: "12px 15px" } },
      h("div", { class: "rowflex", style: { gap: "9px" } }, itemIc(it, { sm: false }),
        h("span", { style: { flex: 1, fontWeight: 700, fontSize: "14px" } }, it.name), tag("ยังไม่มีข้อมูล", { kind: "fifo" })));
  }
  const st = STATUS[p.status] || STATUS["พอ"];
  const fc = p.fc;
  const mTint = MODE_TINT[fc.mode] || "green";
  return h("div", { class: "card", style: { padding: "13px 15px" } },
    h("div", { class: "rowflex", style: { gap: "10px", marginBottom: "8px" } },
      itemIc(it, { sm: false }),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { style: { fontWeight: 800, fontSize: "14.5px" } }, it.name),
        h("div", { class: "rowflex", style: { gap: "5px", marginTop: "3px" } },
          h("span", { class: "badge badge-" + (mTint === "amber" ? "yellow" : mTint === "rose" ? "red" : mTint === "violet" ? "violet" : mTint === "blue" ? "blue" : "green") }, MODE_LABEL[fc.mode] || fc.mode)),
      ),
      tag(p.status, { kind: st.k }),
    ),
    fc.shock ? note([bold(fc.shock.dir === "up" ? "⚠ ยอดพุ่ง: " : "⚠ ยอดตก: "), fc.shock.msg], { amber: true }) : null,
    h("div", { style: { marginTop: "4px" } },
      statRow("คงเหลือตอนนี้", fmtQty(p.onHand, u) + " " + u, { bold: true }),
      statRow("ใช้ถึงรอบรับของ (~" + p.daysUntil + " วัน)", fmtQty(p.forecastUsage, u) + " " + u, { top: true }),
      p.transfer > 0 ? statRow("สาขาเบิก (ในช่วงนี้)", fmtQty(p.transfer, u) + " " + u) : null,
      statRow("ค่าเผื่อเริ่มต้น (" + fc.safetyPct + "%)", fmtQty(p.safety, u) + " " + u),
      statRow("รวมที่ต้องมี", fmtQty(p.required, u) + " " + u, { bold: true, top: true }),
      statRow("ควรเติม", p.orderNeeded > 0 ? fmtQty(p.orderNeeded, u) + " " + u : "ยังไม่ต้องเติม", { bold: true, color: st.c }),
      statRow("วันคงเหลือ", p.daysCover == null ? "—" : (p.over ? ">" + p.daysCover : p.daysCover) + " วัน", { top: true }),
    ),
    h("div", { style: { fontSize: "11px", color: "var(--faint)", marginTop: "7px", lineHeight: 1.45 } }, "โหมด: " + (MODE_LABEL[fc.mode] || fc.mode) + " · " + fc.reason),
  );
}

function paint(root) {
  const { go, back, role } = fst.ctx;
  const settingsBtn = h("button", { type: "button", class: "hdr-icon", "aria-label": "ตั้งค่าพยากรณ์", onClick: () => go({ name: "forecastsettings" }) }, pi("settings", 18));

  if (!hasUsageData()) {
    root.replaceChildren(
      hdr({ title: "วิเคราะห์สต๊อก", sub: "พยากรณ์การใช้ + ควรเติมเท่าไหร่", onBack: back, right: settingsBtn }),
      h("div", { class: "page stack" },
        h("div", { class: "fc7-hero" }, h("span", { class: "fc7-hero-art" }, mascot(62, { spark: true })),
          h("div", { style: { flex: 1, minWidth: 0 } },
            h("div", { class: "fc7-hero-title" }, "ยังไม่มีข้อมูลพอ"),
            h("div", { class: "fc7-hero-sub" }, "เริ่มนับสต๊อกสักระยะ ระบบจะคำนวณยอดใช้และพยากรณ์ให้"))),
      ),
    );
    return;
  }

  const fm = getActiveForecastMode();
  const mTint = MODE_TINT[fm.mode] || "green";
  const modeBadge = h("button", { type: "button", class: "card soft-card soft-" + mTint + " list-press", style: { width: "100%", textAlign: "left", display: "block", padding: "11px 14px" }, onClick: () => go({ name: "forecastsettings" }) },
    h("div", { class: "rowflex", style: { gap: "9px" } },
      h("span", { class: "catic " + mTint }, pi("trend", 16)),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { class: "overline" }, "โหมดพยากรณ์"),
        h("div", { style: { fontWeight: 800, fontSize: "14px" } }, MODE_LABEL[fm.mode] || fm.mode),
        h("div", { style: { fontSize: "11px", color: "var(--muted)", marginTop: "2px", lineHeight: 1.4 } }, fm.reason)),
      (() => { const c = pi("settings", 16); c.style.color = "var(--faint)"; return c; })()),
  );

  const FC_CATS = cats().filter((c) => ["protein", "egg", "drink", "sauce", "rice", "dry"].includes(c.id));
  const q = fst.q.toLowerCase();
  const matchQ = (it) => !q || it.name.toLowerCase().includes(q);
  const list = (items() || []).filter((it) => it.isActive !== false && matchCat(it, fst.filter) && matchQ(it));

  const searchEl = searchBox({ value: fst.q, onChange: (v) => { fst.q = v; paint(root); }, placeholder: "ค้นหาวัตถุดิบ…" });

  root.replaceChildren(
    hdr({ title: "วิเคราะห์สต๊อก", sub: "พยากรณ์การใช้ · ควรเติมถึงรอบรับของ", onBack: back, right: settingsBtn }),
    h("div", { class: "page stack" },
      modeBadge,
      searchEl,
      sectionTabs({ cats: FC_CATS, value: fst.filter, allLabel: "ทั้งหมด", onChange: (id) => { fst.q = ""; fst.filter = id; paint(root); } }),
      note(["ตัวเลขจาก", bold("ยอดใช้จริงที่นับ"), " (เกลี่ยวันเว้นนับ) · ", bold("ควรเติม"), " = ใช้ถึงรอบรับของ + สาขาเบิก + ค่าเผื่อ − คงเหลือ"], { iconName: "trend" }),
      list.length ? h("div", { class: "stack" }, list.map((it) => card(it)))
        : emptyState({ compact: true, iconName: "search", title: fst.q ? 'ไม่พบ "' + fst.q + '"' : "ไม่มีวัตถุดิบในหมวดนี้", sub: "ลองหมวดอื่น" }),
    ),
  );
  if (fst.q) { const inp = searchEl.querySelector("input"); if (inp) { inp.focus(); const n = inp.value.length; inp.setSelectionRange(n, n); } }
}
