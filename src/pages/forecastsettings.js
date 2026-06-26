// ============================================================
// pages/forecastsettings.js — ตั้งค่าพยากรณ์
//   A) โหมดปัจจุบัน + Auto/กลับ Auto   B) ร้านใหม่ (New Store Reactive)
//   C) บังคับโหมดเอง (manual override)  D) Event Manager (+ seed รายวัตถุดิบ + cycle)
//   E) สาขาเบิกของ (scheduled transfer) F) Model Health + รอบรับของ
//   + พรีวิว "ควรเติม" ภายใต้โหมดปัจจุบัน
// ctx = { go, back, role, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, seg, toggle, tag, emptyState, itemIc } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { items } from "../data/store.js";
import { unitOf } from "../utils/formulas.js";
import { todayISO, DOW_SHORT } from "../utils/usage.js";
import {
  getEvents, saveEvent, removeEvent, getSettings, saveSettings,
  getTransfers, saveTransfer, removeTransfer,
} from "../forecast/regimeConfig.js";
import { getActiveForecastMode, MODE_LABEL } from "../forecast/eventRegimeManager.js";
import { planIngredient } from "../forecast/inventoryPlanner.js";
import { backtestStats } from "../forecast/forecastRuns.js";

const bold = (t) => h("b", null, t);
const fst = { ctx: null, sheet: null };
const MODE_TINT = { normal: "green", event: "amber", event_ramp: "amber", event_stable: "violet", post_event: "blue", new_store: "rose", manual_override: "rose" };

export function forecastSettingsScreen(ctx) {
  fst.ctx = ctx; fst.sheet = null;
  const root = h("div", { class: "page-wrap", "data-screen-label": "forecastsettings" });
  root._sheets = h("div");
  paint(root);
  return root;
}

function field(label, input, hint) {
  return h("label", { class: "stack", style: { gap: "5px" } }, h("span", { class: "field-label" }, label), input, hint ? h("span", { style: { fontSize: "11px", color: "var(--faint)" } }, hint) : null);
}
const inp = (value, attrs = {}) => h("input", { class: "input", value: value != null ? String(value) : "", ...attrs });

function paint(root) {
  const { back, role, toast } = fst.ctx;
  const owner = role === "owner";
  const s = getSettings();
  const m = getActiveForecastMode();
  const events = getEvents();
  const transfers = getTransfers();
  const mTint = MODE_TINT[m.mode] || "green";

  // พรีวิว: ควรเติม ของรายการที่ต้องเติมมากสุด
  const plans = (items() || []).filter((it) => it.isActive !== false).map((it) => ({ it, p: planIngredient(it.id) })).filter((x) => x.p);
  plans.sort((a, b) => b.p.orderNeeded - a.p.orderNeeded);

  const content = h("div", { class: "page stack" },
    note(["เลือกโหมดพยากรณ์ตามสถานการณ์ · ช่วง event ระบบจะ", bold("ไม่เอายอดช่วงปกติมาเฉลี่ยตรง ๆ")], { iconName: "trend" }),

    // A) current mode
    h("div", { class: "card soft-card soft-" + mTint, style: { padding: "13px 15px" } },
      h("div", { class: "rowflex", style: { gap: "10px", marginBottom: "5px" } },
        h("span", { class: "catic " + mTint }, pi("trend", 18)),
        h("div", { style: { flex: 1, minWidth: 0 } }, h("div", { class: "overline" }, "โหมดที่ใช้อยู่"), h("div", { style: { fontWeight: 800, fontSize: "16px" } }, MODE_LABEL[m.mode] || m.mode)),
        m.manual ? tag("Manual", { kind: "dgr" }) : tag("Auto", { kind: "ok" }),
      ),
      h("div", { style: { fontSize: "12.5px", color: "var(--muted)", lineHeight: 1.5 } }, m.reason),
    ),
    h("button", { type: "button", class: "btn btn-block" + (s.active_mode === "auto" && !s.is_new_store ? " btn-primary" : ""), disabled: s.active_mode === "auto", onClick: () => { saveSettings({ active_mode: "auto", manual_override_mode: null, manual_override_until: null, manual_override_reason: null }); toast("กลับเป็น Auto Mode"); paint(root); } }, pi("refresh", 15), "ใช้ Auto Mode"),

    owner ? h("div", { class: "card split", style: { padding: "11px 15px" } },
      h("div", null, h("div", { style: { fontWeight: 700, fontSize: "13.5px" } }, "ร้านใหม่ (New Store Reactive)"), h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, "ใช้ยอดวันใกล้สุด + ค่าเผื่อหนา 38%")),
      toggle(s.is_new_store, (v) => { saveSettings({ is_new_store: v }); toast(v ? "เปิดโหมดร้านใหม่" : "ปิดโหมดร้านใหม่"); paint(root); }),
    ) : null,

    // C) manual override
    owner ? h("div", { class: "acc-card", style: { padding: "13px 15px" } },
      h("div", { class: "overline", style: { marginBottom: "8px" } }, "บังคับโหมดเอง (ชั่วคราว)"),
      s.active_mode === "manual_override" ? note([bold("กำลังบังคับ: "), MODE_LABEL[s.manual_override_mode] || s.manual_override_mode, s.manual_override_until ? " · ถึง " + s.manual_override_until : ""], { amber: true }) : null,
      h("div", { class: "rowflex", style: { gap: "8px", flexWrap: "wrap", marginTop: "6px" } },
        ["normal", "event_ramp", "event_stable", "post_event", "new_store"].map((md) => h("button", { type: "button", class: "chip" + (s.active_mode === "manual_override" && s.manual_override_mode === md ? " active" : ""), onClick: () => openOverride(root, md) }, MODE_LABEL[md])),
      ),
    ) : null,

    // D) event manager
    h("div", { class: "split", style: { marginTop: "4px" } }, h("span", { class: "overline" }, "Event ที่กระทบยอด"), owner ? h("button", { type: "button", class: "mini-btn", "aria-label": "เพิ่ม", onClick: () => openEvent(root, null) }, pi("plus", 14)) : null),
    h("div", { class: "stack", style: { gap: "8px" } }, events.map((ev) => eventCard(ev, root, owner, m))),

    // E) branch transfer
    h("div", { class: "split", style: { marginTop: "4px" } }, h("span", { class: "overline" }, "สาขาเบิกของ (รายสัปดาห์)"), owner ? h("button", { type: "button", class: "mini-btn", "aria-label": "เพิ่ม", onClick: () => openTransfer(root, null) }, pi("plus", 14)) : null),
    transfers.length ? h("div", { class: "stack", style: { gap: "6px" } }, transfers.map((t) => transferRow(t, root, owner)))
      : note(["ยังไม่มีตารางสาขาเบิก — ", bold("เพิ่ม"), " เพื่อให้ระบบกันของไว้ให้สาขาในรอบถัดไป (ไม่ถูกเฉลี่ยทิ้ง)"], {}),

    // F) restock interval + health
    owner ? h("div", { class: "card", style: { padding: "12px 15px" } },
      field("รับของทุกกี่วัน (รอบรับของ)", (() => { const i = inp(s.restock_interval_days, { type: "text", inputMode: "numeric" }); i.addEventListener("change", () => { const v = Math.max(1, parseInt(i.value) || 7); saveSettings({ restock_interval_days: v }); toast("ตั้งรอบรับของ " + v + " วัน"); paint(root); }); return i; })(), "ใช้คำนวณ “ใช้ถึงรอบรับของถัดไป”"),
    ) : null,
    h("div", { class: "overline", style: { marginTop: "4px" } }, "สุขภาพโมเดล"),
    h("div", { class: "card", style: { padding: "12px 15px" } },
      healthRow("วัตถุดิบที่พยากรณ์ได้", plans.length + " รายการ", "ok"),
      healthRow("ข้อมูลยังน้อย (<5 วัน)", plans.filter((x) => x.p.fc.n.total < 5).length + " รายการ", plans.some((x) => x.p.fc.n.total < 5) ? "warn" : "ok"),
      healthRow("มี shock เตือน", plans.filter((x) => x.p.fc.shock).length + " รายการ", plans.some((x) => x.p.fc.shock) ? "dgr" : "ok"),
      (() => { const bt = backtestStats(); return bt
        ? healthRow("ความคลาด (backtest " + bt.n + " จุด)", "WAPE " + bt.wape + "% · bias " + (bt.bias > 0 ? "+" : "") + bt.bias + "%", bt.wape < 20 ? "ok" : "warn")
        : healthRow("ช่วงคลาด", "กำลังเรียนรู้ข้อมูลจริง (ยังไม่มี backtest)", "fifo"); })(),
    ),

    // preview
    h("div", { class: "overline", style: { marginTop: "4px" } }, "ควรเติมมากสุด (ภายใต้โหมดนี้)"),
    plans.length ? h("div", { class: "card", style: { padding: "2px 15px 8px" } }, plans.slice(0, 6).map(({ it, p }) => h("div", { class: "rowflex", style: { gap: "9px", padding: "9px 0", borderTop: "1px solid var(--border-soft)" } },
      itemIc(it, { sm: true }),
      h("div", { style: { flex: 1, minWidth: 0 } }, h("div", { style: { fontWeight: 700, fontSize: "13px" } }, it.name), h("div", { style: { fontSize: "10.5px", color: "var(--muted)" } }, p.status + " · คงเหลือ " + p.onHand + " " + p.unit)),
      h("div", { style: { textAlign: "right", flex: "none" } }, h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "14px", color: p.orderNeeded > 0 ? "var(--warning-ink)" : "var(--primary-dark)" } }, p.orderNeeded > 0 ? "+" + p.orderNeeded + " " + p.unit : "พอ"), h("div", { style: { fontSize: "10px", color: "var(--faint)" } }, "ควรเติม")),
    ))) : emptyState({ compact: true, iconName: "trend", title: "ยังไม่มีข้อมูลพอ", sub: "เริ่มนับสต๊อกก่อน" }),
  );

  root.replaceChildren(
    hdr({ title: "ตั้งค่าพยากรณ์", sub: "โหมด · Event · สาขาเบิก", onBack: back, right: h("span", { class: "catic violet" }, pi("trend", 18)) }),
    content, root._sheets,
  );
  renderSheets(root);
}

function healthRow(label, val, kind) {
  return h("div", { class: "rowflex", style: { gap: "8px", padding: "6px 0", borderBottom: "1px solid var(--border-soft)" } }, h("span", { style: { flex: 1, fontSize: "13px", color: "var(--text-2)" } }, label), tag(val, { kind }));
}

function eventCard(ev, root, owner, m) {
  const isNow = m.event && m.event.id === ev.id;
  const sTint = ev.status === "active" ? "ok" : ev.status === "disabled" ? "dgr" : "warn";
  return h("button", { type: "button", class: "card list-press", style: { width: "100%", textAlign: "left", display: "block", padding: "12px 15px", cursor: owner ? "pointer" : "default" }, onClick: owner ? () => openEvent(root, ev) : undefined },
    h("div", { class: "rowflex", style: { gap: "9px" } },
      h("span", { class: "catic " + (isNow ? "amber" : "") }, pi("cal", 16)),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { class: "rowflex", style: { gap: "6px" } }, h("span", { style: { fontWeight: 800, fontSize: "14px" } }, ev.event_name), isNow ? tag("ตอนนี้", { kind: "ok" }) : null),
        h("div", { style: { fontSize: "11px", color: "var(--muted)", marginTop: "2px" } }, ev.start_date + " → " + (ev.end_date || "ไม่กำหนด") + (ev.demand_cycle === "monthly_reset" ? " · ฟันเลื่อยรายเดือน" : "")),
      ),
      tag(ev.status, { kind: sTint }),
      owner ? h("span", { class: "catic", style: { background: "transparent", width: "22px" } }, pi("edit", 14)) : null,
    ),
  );
}

function transferRow(t, root, owner) {
  const it = (items() || []).find((x) => x.id === t.item);
  return h("div", { class: "card split", style: { padding: "9px 13px", cursor: owner ? "pointer" : "default" }, onClick: owner ? () => openTransfer(root, t) : undefined },
    h("span", { class: "rowflex", style: { gap: "8px", minWidth: 0 } }, it ? itemIc(it, { sm: true }) : h("span", { class: "catic sm" }, pi("truck", 14)),
      h("span", { style: { fontSize: "13px", fontWeight: 600 } }, (it ? it.name : t.item) + " · " + DOW_SHORT[t.dow])),
    h("span", { class: "tnum", style: { fontWeight: 700, fontSize: "13px" } }, t.qty + " " + (it ? unitOf(it) : "")),
  );
}

/* ---------- sheets ---------- */
function openOverride(root, mode) { fst.sheet = { type: "override", mode, until: "", reason: "" }; renderSheets(root); }
function openEvent(root, ev) {
  fst.sheet = { type: "event", ...(ev ? { ...ev } : { id: "evt-" + Date.now(), event_name: "", start_date: todayISO(), end_date: "", status: "scheduled", min_factor: 1, max_factor: 4.5, safety_stock_percent: 30, cooldown_days_after_event: 28, ramp_min_days: 4, demand_cycle: "", cycle_reset_day: 1, cycle_peak_window_days: 7, seed_factor_by_ingredient: { default: 2.0 }, _new: true }) };
  renderSheets(root);
}
function openTransfer(root, t) { fst.sheet = { type: "transfer", ...(t ? { ...t } : { id: "tr-" + Date.now(), item: "", dow: 1, qty: "", active: true, _new: true }) }; renderSheets(root); }

function renderSheets(root) {
  const layer = root._sheets; layer.replaceChildren();
  const e = fst.sheet; if (!e) return;
  const { toast } = fst.ctx;
  const close = () => { fst.sheet = null; renderSheets(root); };

  if (e.type === "override") {
    const untilIn = inp(e.until, { type: "date", min: todayISO() });
    const reasonIn = inp(e.reason, { placeholder: "เช่น ทดสอบช่วงโปรแรง" });
    layer.appendChild(sheet({ onClose: close, children: h("div", { class: "stack", style: { gap: "12px" } },
      h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 2px" } }, "บังคับ: " + (MODE_LABEL[e.mode] || e.mode)),
      note(["ใช้โหมดนี้จนถึงวันหมดอายุ แล้ว", bold("กลับ Auto เอง")], { amber: true }),
      field("ถึงวันที่ (เว้นว่าง = จนกดกลับ Auto)", untilIn), field("เหตุผล", reasonIn),
      h("div", { class: "rowflex", style: { gap: "10px" } },
        h("button", { type: "button", class: "btn btn-block", onClick: close }, "ยกเลิก"),
        h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => { saveSettings({ active_mode: "manual_override", manual_override_mode: e.mode, manual_override_until: untilIn.value || null, manual_override_reason: reasonIn.value || null }); fst.sheet = null; toast("บังคับโหมดแล้ว"); paint(root); } }, pi("check", 16), "บังคับใช้"),
      ),
    ) }));
    return;
  }

  if (e.type === "transfer") {
    const list = (items() || []).filter((x) => x.isActive !== false);
    const itemSel = h("select", { class: "input" }, h("option", { value: "" }, "— เลือกวัตถุดิบ —"), list.map((x) => h("option", { value: x.id, selected: x.id === e.item }, x.name)));
    const dowSel = h("select", { class: "input" }, [1, 2, 3, 4, 5, 6, 0].map((d) => h("option", { value: d, selected: d === Number(e.dow) }, DOW_SHORT[d])));
    const qtyIn = inp(e.qty, { type: "text", inputMode: "decimal", placeholder: "0" });
    layer.appendChild(sheet({ onClose: close, children: h("div", { class: "stack", style: { gap: "12px" } },
      h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 2px" } }, e._new ? "เพิ่มสาขาเบิก" : "แก้สาขาเบิก"),
      note(["ยอดที่สาขามาเบิกประจำ — ระบบกันไว้ใน “รวมที่ต้องมี” ไม่เอาไปเฉลี่ยรวมยอดใช้"], {}),
      field("วัตถุดิบ", itemSel), field("วันที่เบิก", dowSel), field("จำนวนต่อรอบ", qtyIn),
      h("div", { class: "rowflex", style: { gap: "10px" } },
        !e._new ? h("button", { type: "button", class: "btn", style: { color: "var(--danger)" }, onClick: () => { removeTransfer(e.id); fst.sheet = null; toast("ลบแล้ว"); paint(root); } }, pi("trash", 15), "ลบ") : null,
        h("button", { type: "button", class: "btn btn-block", onClick: close }, "ยกเลิก"),
        h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => { if (!itemSel.value || !(parseFloat(qtyIn.value) > 0)) { toast("เลือกวัตถุดิบ + ใส่จำนวน"); return; } saveTransfer({ id: e.id, item: itemSel.value, dow: Number(dowSel.value), qty: parseFloat(qtyIn.value) || 0, active: true }); fst.sheet = null; toast("บันทึกแล้ว"); paint(root); } }, pi("check", 16), "บันทึก"),
      ),
    ) }));
    return;
  }

  // event editor
  const nameIn = inp(e.event_name, { placeholder: "เช่น ไทยช่วยไทย 2026" });
  const startIn = inp(e.start_date, { type: "date" });
  const endIn = inp(e.end_date, { type: "date" });
  const maxIn = inp(e.max_factor, { type: "text", inputMode: "decimal" });
  const minIn = inp(e.min_factor, { type: "text", inputMode: "decimal" });
  const safeIn = inp(e.safety_stock_percent, { type: "text", inputMode: "decimal" });
  const coolIn = inp(e.cooldown_days_after_event, { type: "text", inputMode: "numeric" });
  const seedTxt = Object.entries(e.seed_factor_by_ingredient || { default: 2.0 }).map(([k, v]) => k + ":" + v).join("\n");
  const seedIn = h("textarea", { class: "input", rows: 4, style: { resize: "vertical", fontFamily: "var(--font-num)" }, placeholder: "เนื้อ:3.1\nไข่:4.1\ndefault:2.0" }, seedTxt);
  const cycleOn = e.demand_cycle === "monthly_reset";
  let cyc = cycleOn;
  const cycToggle = toggle(cycleOn, (v) => { cyc = v; });
  const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
  const statusSeg = seg({ value: e.status, grow: true, options: [{ v: "scheduled", t: "รอเริ่ม" }, { v: "active", t: "จัดอยู่" }, { v: "ended", t: "จบ" }, { v: "disabled", t: "ปิด" }], onChange: (v) => { fst.sheet.status = v; } });

  layer.appendChild(sheet({ onClose: close, children: h("div", { class: "stack", style: { gap: "12px" } },
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 2px" } }, e._new ? "เพิ่ม Event" : "แก้ Event"),
    field("ชื่อ Event", nameIn),
    h("div", { class: "rowflex", style: { gap: "10px" } }, h("div", { style: { flex: 1 } }, field("เริ่ม", startIn)), h("div", { style: { flex: 1 } }, field("จบ", endIn, "เว้นว่าง = ยังไม่กำหนด"))),
    h("div", null, h("div", { class: "field-label", style: { marginBottom: "6px" } }, "สถานะ"), statusSeg),
    h("div", { class: "rowflex", style: { gap: "10px" } }, h("div", { style: { flex: 1 } }, field("ตัวคูณต่ำสุด", minIn)), h("div", { style: { flex: 1 } }, field("ตัวคูณสูงสุด", maxIn, "เช่น 4.5")), h("div", { style: { flex: 1 } }, field("ค่าเผื่อ %", safeIn))),
    field("cooldown หลังจบ (วัน)", coolIn),
    field("seed factor รายวัตถุดิบ", seedIn, "1 บรรทัด = ชื่อ:ตัวคูณ · ใช้ตอนข้อมูล event ยังน้อย"),
    h("div", { class: "card split", style: { padding: "10px 14px" } }, h("span", { style: { fontSize: "13px", fontWeight: 600 } }, "ยอดเป็นฟันเลื่อยรายเดือน (wallet รีเซ็ต)"), cycToggle),
    h("div", { class: "rowflex", style: { gap: "10px", marginTop: "2px" } },
      !e._new ? h("button", { type: "button", class: "btn", style: { color: "var(--danger)" }, onClick: () => { removeEvent(e.id); fst.sheet = null; fst.ctx.toast("ลบ event แล้ว"); paint(root); } }, pi("trash", 15), "ลบ") : null,
      h("button", { type: "button", class: "btn btn-block", onClick: close }, "ยกเลิก"),
      h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => {
        if (!nameIn.value.trim() || !startIn.value) { fst.ctx.toast("ใส่ชื่อ + วันเริ่ม"); return; }
        const seedMap = {}; (seedIn.value || "").split("\n").forEach((ln) => { const [k, v] = ln.split(":"); if (k && k.trim() && v != null && !isNaN(parseFloat(v))) seedMap[k.trim()] = parseFloat(v); }); if (!seedMap.default) seedMap.default = 2.0;
        saveEvent({ id: e.id, event_name: nameIn.value.trim(), start_date: startIn.value, end_date: endIn.value || null, status: fst.sheet.status, min_factor: num(minIn.value, 1), max_factor: num(maxIn.value, 4.5), safety_stock_percent: num(safeIn.value, 30), cooldown_days_after_event: num(coolIn.value, 28), ramp_min_days: e.ramp_min_days || 4, seed_factor_by_ingredient: seedMap, demand_cycle: cyc ? "monthly_reset" : "", cycle_reset_day: e.cycle_reset_day || 1, cycle_peak_window_days: e.cycle_peak_window_days || 7, notes: e.notes || "" });
        fst.sheet = null; fst.ctx.toast("บันทึก event แล้ว"); paint(root);
      } }, pi("check", 16), "บันทึก"),
    ),
  ) }));
}
