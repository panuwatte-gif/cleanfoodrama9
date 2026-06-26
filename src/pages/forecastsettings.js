// ============================================================
// pages/forecastsettings.js — ตั้งค่าพยากรณ์ (regime switching)
//   A) โหมดที่ใช้อยู่ตอนนี้ + เหตุผล + กลับ Auto
//   B) จัดการ Event (ไทยช่วยไทย ฯลฯ) — แก้วัน/ค่า/เปิด-ปิด/เพิ่ม
//   C) บังคับโหมดเอง (manual override) + วันหมดอายุ + เหตุผล
//   D) สุขภาพโมเดล — มีข้อมูลกี่วัน · เมนูที่ข้อมูลน้อย
//   + พรีวิวพยากรณ์พรุ่งนี้ภายใต้โหมดปัจจุบัน (เห็นผลทันที)
// ctx = { go, back, role, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, seg, toggle, tag, emptyState, itemIc } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { items } from "../data/store.js";
import { unitOf } from "../utils/formulas.js";
import { todayISO } from "../utils/forecast.js";
import { getEvents, saveEvent, removeEvent, getSettings, saveSettings } from "../forecast/regimeConfig.js";
import { getActiveForecastMode, MODE_LABEL } from "../forecast/eventRegimeManager.js";
import { forecastItemRegime } from "../forecast/forecastEngine.js";

const bold = (t) => h("b", null, t);
const fst = { ctx: null, evEdit: null };

const MODE_TINT = { normal: "green", event_ramp: "amber", event_stable: "violet", post_event: "blue", manual_override: "rose" };

export function forecastSettingsScreen(ctx) {
  fst.ctx = ctx; fst.evEdit = null;
  const root = h("div", { class: "page-wrap", "data-screen-label": "forecastsettings" });
  root._sheets = h("div");
  paint(root);
  return root;
}

function modeBadge(m) {
  const tint = MODE_TINT[m.mode] || "green";
  return h("div", { class: "card soft-card soft-" + tint, style: { padding: "13px 15px" } },
    h("div", { class: "rowflex", style: { gap: "10px", marginBottom: "6px" } },
      h("span", { class: "catic " + tint }, pi("trend", 18)),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { class: "overline" }, "โหมดที่ใช้อยู่ตอนนี้"),
        h("div", { style: { fontWeight: 800, fontSize: "16px" } }, MODE_LABEL[m.mode] || m.mode),
      ),
      m.manual ? tag("Manual", { kind: "dgr" }) : tag("Auto", { kind: "ok" }),
    ),
    h("div", { style: { fontSize: "12.5px", color: "var(--muted)", lineHeight: 1.5 } }, m.reason),
  );
}

function paint(root) {
  const { back, role, toast } = fst.ctx;
  const owner = role === "owner";
  const s = getSettings();
  const m = getActiveForecastMode(todayISO());
  const events = getEvents();

  // ---- พรีวิวพยากรณ์พรุ่งนี้ (เห็นผลของโหมด) ----
  const withData = (items() || []).filter((it) => it.isActive !== false).map((it) => ({ it, fc: forecastItemRegime(it.id) })).filter((x) => x.fc);
  withData.sort((a, b) => (b.fc.predicted - a.fc.predicted));
  const previewRows = withData.slice(0, 8).map(({ it, fc }) => h("div", { class: "rowflex", style: { gap: "9px", padding: "9px 0", borderTop: "1px solid var(--border-soft)" } },
    itemIc(it, { sm: true }),
    h("div", { style: { flex: 1, minWidth: 0 } },
      h("div", { style: { fontWeight: 700, fontSize: "13px" } }, it.name),
      fc.shock ? h("div", { style: { fontSize: "10.5px", color: fc.shock.dir === "up" ? "var(--warning-ink)" : "var(--danger)", fontWeight: 600 } }, "⚠ " + fc.shock.msg) : null,
    ),
    h("div", { style: { textAlign: "right", flex: "none" } },
      h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "14px", color: "var(--primary-dark)" } }, fc.low + "–" + fc.high + " " + unitOf(it)),
      h("div", { style: { fontSize: "10px", color: "var(--faint)" } }, "เผื่อ " + fc.safetyPct + "%"),
    ),
  ));

  // ---- D) model health ----
  const healthy = withData.length;
  const thin = withData.filter((x) => x.fc.n.total < 5).length;

  const content = h("div", { class: "page stack" },
    note(["พยากรณ์แบบ ", bold("เลือกโหมดตามสถานการณ์"), " — ช่วง event (ไทยช่วยไทย) ระบบจะไม่เอายอดช่วงปกติมาเฉลี่ยตรง ๆ"], { iconName: "trend" }),

    // A) โหมดปัจจุบัน
    modeBadge(m),
    h("div", { class: "rowflex", style: { gap: "10px" } },
      h("button", { type: "button", class: "btn btn-block" + (s.active_mode === "auto" ? " btn-primary" : ""), disabled: s.active_mode === "auto", onClick: () => { saveSettings({ active_mode: "auto", manual_override_mode: null, manual_override_until: null, manual_override_reason: null }); toast("กลับเป็น Auto Mode แล้ว"); paint(root); } }, pi("refresh", 15), "ใช้ Auto Mode"),
    ),

    // C) manual override (เจ้าของ)
    owner ? h("div", { class: "acc-card", style: { padding: "13px 15px" } },
      h("div", { class: "overline", style: { marginBottom: "8px" } }, "บังคับโหมดเอง (ชั่วคราว)"),
      s.active_mode === "manual_override"
        ? note([bold("กำลังบังคับ: "), MODE_LABEL[s.manual_override_mode] || s.manual_override_mode, s.manual_override_until ? " · ถึง " + s.manual_override_until : "", s.manual_override_reason ? " · " + s.manual_override_reason : ""], { amber: true })
        : null,
      h("div", { class: "rowflex", style: { gap: "8px", flexWrap: "wrap", marginTop: "6px" } },
        ["normal", "event_ramp", "event_stable", "post_event"].map((md) => h("button", {
          type: "button", class: "chip" + (s.active_mode === "manual_override" && s.manual_override_mode === md ? " active" : ""),
          onClick: () => openOverride(root, md),
        }, MODE_LABEL[md])),
      ),
    ) : null,

    // B) event manager
    h("div", { class: "split", style: { marginTop: "4px" } },
      h("span", { class: "overline" }, "Event ที่กระทบยอดขาย"),
      owner ? h("button", { type: "button", class: "mini-btn", "aria-label": "เพิ่ม event", onClick: () => openEvent(root, null) }, pi("plus", 14)) : null,
    ),
    h("div", { class: "stack", style: { gap: "8px" } },
      events.map((ev) => eventCard(ev, root, owner)),
    ),

    // D) model health
    h("div", { class: "overline", style: { marginTop: "4px" } }, "สุขภาพโมเดล"),
    h("div", { class: "card", style: { padding: "12px 15px" } },
      healthRow("รายการที่พยากรณ์ได้", healthy + " รายการ", "ok"),
      healthRow("รายการข้อมูลยังน้อย (<5 วัน)", thin + " รายการ", thin ? "warn" : "ok"),
      healthRow("ช่วงคลาด", "ยังเป็น “ค่าเผื่อเริ่มต้น”", "fifo"),
      h("div", { style: { fontSize: "11px", color: "var(--faint)", marginTop: "8px", lineHeight: 1.5 } }, "ยังไม่มีประวัติเทียบ “ทาย vs จริง” มากพอ ระบบจึงใช้ค่าเผื่อกันขาด ไม่ใช่ค่า error จริง"),
    ),

    // พรีวิว
    h("div", { class: "overline", style: { marginTop: "4px" } }, "พรีวิวพยากรณ์พรุ่งนี้ (ภายใต้โหมดนี้)"),
    previewRows.length
      ? h("div", { class: "card", style: { padding: "2px 15px 10px" } }, previewRows)
      : emptyState({ compact: true, iconName: "trend", title: "ยังไม่มีข้อมูลพอพยากรณ์", sub: "บันทึกนับสต๊อก/ยอดขายสักระยะก่อน" }),
  );

  root.replaceChildren(
    hdr({ title: "ตั้งค่าพยากรณ์", sub: "โหมด · Event · ค่าเผื่อ", onBack: back, right: h("span", { class: "catic violet" }, pi("trend", 18)) }),
    content,
    root._sheets,
  );
  renderSheets(root);
}

function healthRow(label, val, kind) {
  return h("div", { class: "rowflex", style: { gap: "8px", padding: "6px 0", borderBottom: "1px solid var(--border-soft)" } },
    h("span", { style: { flex: 1, fontSize: "13px", color: "var(--text-2)" } }, label),
    tag(val, { kind }),
  );
}

function eventCard(ev, root, owner) {
  const m = getActiveForecastMode(todayISO());
  const isNow = m.event && m.event.id === ev.id;
  const statusTint = ev.status === "active" ? "ok" : ev.status === "disabled" ? "dgr" : "warn";
  return h("button", {
    type: "button", class: "card list-press", style: { width: "100%", textAlign: "left", display: "block", padding: "12px 15px", cursor: owner ? "pointer" : "default" },
    onClick: owner ? () => openEvent(root, ev) : undefined,
  },
    h("div", { class: "rowflex", style: { gap: "9px" } },
      h("span", { class: "catic " + (isNow ? "amber" : "") }, pi("cal", 16)),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { class: "rowflex", style: { gap: "6px" } }, h("span", { style: { fontWeight: 800, fontSize: "14.5px" } }, ev.event_name), isNow ? tag("ตอนนี้", { kind: "ok" }) : null),
        h("div", { style: { fontSize: "11.5px", color: "var(--muted)", marginTop: "2px" } }, ev.start_date + " → " + (ev.end_date || "ไม่กำหนด")),
      ),
      tag(ev.status, { kind: statusTint }),
      owner ? h("span", { class: "catic", style: { background: "transparent", width: "22px" } }, pi("edit", 14)) : null,
    ),
  );
}

/* ---------- C) override sheet ---------- */
function openOverride(root, mode) {
  fst.evEdit = { _override: true, mode, until: "", reason: "" };
  renderSheets(root);
}

/* ---------- B) event edit sheet ---------- */
function openEvent(root, ev) {
  fst.evEdit = ev
    ? { ...ev }
    : { id: "evt-" + Date.now(), event_name: "", start_date: todayISO(), end_date: "", status: "scheduled", model_strategy: "auto", seed_factor_default: 2.0, min_factor: 1.0, max_factor: 3.2, safety_stock_percent: 30, cooldown_days_after_event: 28, notes: "", _new: true };
  renderSheets(root);
}

function field(label, input, hint) {
  return h("label", { class: "stack", style: { gap: "5px" } }, h("span", { class: "field-label" }, label), input, hint ? h("span", { style: { fontSize: "11px", color: "var(--faint)" } }, hint) : null);
}
function inp(value, attrs = {}) { return h("input", { class: "input", value: value != null ? String(value) : "", ...attrs }); }

function renderSheets(root) {
  const layer = root._sheets;
  layer.replaceChildren();
  const e = fst.evEdit;
  if (!e) return;
  const { toast } = fst.ctx;

  if (e._override) {
    const untilIn = inp(e.until, { type: "date", min: todayISO() });
    const reasonIn = inp(e.reason, { placeholder: "เช่น ทดสอบช่วงโปรแรง" });
    layer.appendChild(sheet({
      onClose: () => { fst.evEdit = null; renderSheets(root); },
      children: h("div", { class: "stack", style: { gap: "12px" } },
        h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 2px" } }, "บังคับโหมด: " + (MODE_LABEL[e.mode] || e.mode)),
        note(["ระบบจะใช้โหมดนี้จนถึงวันหมดอายุ แล้ว", bold("กลับ Auto เอง"), " · เว้นวันหมดอายุ = จนกว่าจะกดกลับ Auto"], { amber: true }),
        field("ใช้ถึงวันที่ (เว้นว่างได้)", untilIn),
        field("เหตุผล", reasonIn),
        h("div", { class: "rowflex", style: { gap: "10px" } },
          h("button", { type: "button", class: "btn btn-block", onClick: () => { fst.evEdit = null; renderSheets(root); } }, "ยกเลิก"),
          h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => {
            saveSettings({ active_mode: "manual_override", manual_override_mode: e.mode, manual_override_until: untilIn.value || null, manual_override_reason: reasonIn.value || null });
            fst.evEdit = null; toast("บังคับโหมด " + (MODE_LABEL[e.mode] || e.mode) + " แล้ว"); paint(root);
          } }, pi("check", 16), "บังคับใช้"),
        ),
      ),
    }));
    return;
  }

  // event editor
  const nameIn = inp(e.event_name, { placeholder: "เช่น ไทยช่วยไทย" });
  const startIn = inp(e.start_date, { type: "date" });
  const endIn = inp(e.end_date, { type: "date" });
  const seedIn = inp(e.seed_factor_default, { type: "text", inputMode: "decimal" });
  const minIn = inp(e.min_factor, { type: "text", inputMode: "decimal" });
  const maxIn = inp(e.max_factor, { type: "text", inputMode: "decimal" });
  const safeIn = inp(e.safety_stock_percent, { type: "text", inputMode: "decimal" });
  const coolIn = inp(e.cooldown_days_after_event, { type: "text", inputMode: "numeric" });
  const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };

  const statusSeg = seg({ value: e.status, grow: true, options: [{ v: "scheduled", t: "รอเริ่ม" }, { v: "active", t: "กำลังจัด" }, { v: "ended", t: "จบแล้ว" }, { v: "disabled", t: "ปิด" }], onChange: (v) => { fst.evEdit.status = v; } });

  layer.appendChild(sheet({
    onClose: () => { fst.evEdit = null; renderSheets(root); },
    children: h("div", { class: "stack", style: { gap: "12px" } },
      h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 2px" } }, e._new ? "เพิ่ม Event" : "แก้ Event"),
      field("ชื่อ Event", nameIn),
      h("div", { class: "rowflex", style: { gap: "10px" } }, h("div", { style: { flex: 1 } }, field("เริ่ม", startIn)), h("div", { style: { flex: 1 } }, field("จบ", endIn, "เว้นว่าง = ยังไม่กำหนด"))),
      h("div", null, h("div", { class: "field-label", style: { marginBottom: "6px" } }, "สถานะ"), statusSeg),
      h("div", { class: "rowflex", style: { gap: "10px" } },
        h("div", { style: { flex: 1 } }, field("ตัวคูณตั้งต้น", seedIn, "ตอนข้อมูล event ยังน้อย")),
        h("div", { style: { flex: 1 } }, field("ค่าเผื่อ %", safeIn)),
      ),
      h("div", { class: "rowflex", style: { gap: "10px" } },
        h("div", { style: { flex: 1 } }, field("ตัวคูณต่ำสุด", minIn)),
        h("div", { style: { flex: 1 } }, field("ตัวคูณสูงสุด", maxIn)),
        h("div", { style: { flex: 1 } }, field("cooldown (วัน)", coolIn, "หลังจบ")),
      ),
      h("div", { class: "rowflex", style: { gap: "10px", marginTop: "4px" } },
        !e._new ? h("button", { type: "button", class: "btn", style: { color: "var(--danger)" }, onClick: () => { removeEvent(e.id); fst.evEdit = null; fst.ctx.toast("ลบ event แล้ว"); paint(root); } }, pi("trash", 15), "ลบ") : null,
        h("button", { type: "button", class: "btn btn-block", onClick: () => { fst.evEdit = null; renderSheets(root); } }, "ยกเลิก"),
        h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => {
          if (!nameIn.value.trim() || !startIn.value) { fst.ctx.toast("ใส่ชื่อ + วันเริ่มก่อน"); return; }
          saveEvent({ id: e.id, event_name: nameIn.value.trim(), start_date: startIn.value, end_date: endIn.value || null, status: fst.evEdit.status, model_strategy: e.model_strategy || "auto", seed_factor_default: num(seedIn.value, 2), min_factor: num(minIn.value, 1), max_factor: num(maxIn.value, 3.2), safety_stock_percent: num(safeIn.value, 30), cooldown_days_after_event: num(coolIn.value, 28), notes: e.notes || "" });
          fst.evEdit = null; fst.ctx.toast("บันทึก event แล้ว"); paint(root);
        } }, pi("check", 16), "บันทึก"),
      ),
    ),
  }));
}
