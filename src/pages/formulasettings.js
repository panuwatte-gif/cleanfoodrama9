// ============================================================
// pages/formulasettings.js — "สูตรพยากรณ์" (ไลบรารีสูตร · เลือก/ปรับ/เพิ่ม/กำหนดช่วงวัน)
//   ★ Redesign (visual overhaul ตาม reference) — ใช้ DATA + handler เดิม 100%
//     (getFormulas/saveFormula/getRanges/saveRange/getCfg/saveCfg/backtest …)
//   ไม่แตะ logic พยากรณ์ — เปลี่ยนเฉพาะการแสดงผลให้ดูน่าใช้ เห็นครบในจอเดียว
// ctx = { go, back, role, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag, toggle } from "../components/components.js";
import { cic, chick } from "../components/mascot.js";
import { items } from "../data/store.js";
import { dailyUsage, todayISO } from "../utils/usage.js";
import {
  getFormulas, saveFormula, removeFormula, formulaById,
  getRanges, saveRange, removeRange, getCfg, saveCfg, backtest, TERM_LABEL,
} from "../forecast/formulaLibrary.js";

const bold = (t) => h("b", null, t);
const fst = { ctx: null, adding: false };
const inp = (v, attrs = {}) => h("input", { class: "input", value: v != null ? String(v) : "", ...attrs });
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// บังคับผลรวมน้ำหนัก = 1.0 — "ตัวสุดท้าย" เป็นตัวปรับอัตโนมัติ (1 − ผลรวมตัวอื่น)
function autoLastWeight(formula) {
  const terms = formula.terms || [];
  if (!terms.length) return;
  const others = terms.slice(0, -1).reduce((s, t) => s + (parseFloat(t.weight) || 0), 0);
  terms[terms.length - 1].weight = Math.max(0, round2(1 - others));
}
// ผลรวมน้ำหนักของตัวที่ "กรอกเอง" (ทุกตัวยกเว้นตัวสุดท้าย) — โชว์เตือนถ้าเกิน 1
function manualWeightSum(formula) {
  return round2((formula.terms || []).slice(0, -1).reduce((s, t) => s + (parseFloat(t.weight) || 0), 0));
}

// จานสีต่อสูตร (วนตาม index) — ให้แต่ละสูตรมีเอกลักษณ์เหมือน reference
const FPAL = [
  { c: "#46B47A", soft: "#E8F8EF", ink: "#2E8C5A" }, // green
  { c: "#AB90E2", soft: "#F1EAFD", ink: "#7E59C9" }, // violet
  { c: "#F4A64C", soft: "#FFF3DC", ink: "#B5781A" }, // amber
  { c: "#72A8E8", soft: "#E6F1FE", ink: "#3F73B8" }, // blue
  { c: "#F76CA0", soft: "#FFE2EE", ink: "#C8396A" }, // pink
];
const palOf = (i) => FPAL[i % FPAL.length];

export function formulaSettingsScreen(ctx) {
  fst.ctx = ctx; fst.adding = false;
  const root = h("div", { class: "page-wrap", "data-screen-label": "formulasettings" });
  paint(root);
  return root;
}

// สรุป error ของสูตร default เฉลี่ยทั้งร้าน (weighted ด้วยจำนวนจุด)
function aggError(formula) {
  let mapeW = 0, wmapeW = 0, nW = 0;
  for (const it of (items() || []).filter((x) => x.isActive !== false)) {
    const bt = backtest(formula, dailyUsage(it.id));
    if (bt) { mapeW += bt.mape * bt.n; wmapeW += bt.wmape * bt.n; nW += bt.n; }
  }
  if (!nW) return null;
  return { mape: Math.round(mapeW / nW * 100) / 100, wmape: Math.round(wmapeW / nW * 100) / 100, n: nW };
}
const moodOf = (pct) => pct == null ? "" : pct <= 12 ? "ดีมาก 😊" : pct <= 20 ? "ดี 🙂" : pct <= 30 ? "พอใช้ 😐" : "ต้องปรับ 😣";

/* ---- สมการสูตร (อ่านจาก terms จริง) ---- */
function exprNodes(formula, pal) {
  if (formula.type === "average") {
    return [h("div", { class: "fs2-expr-line" }, h("b", { style: { color: pal.ink } }, "average"), " × ", h("b", { style: { color: pal.ink } }, String(formula.days)), " วัน")];
  }
  return (formula.terms || []).map((t, i) =>
    h("div", { class: "fs2-expr-line" },
      i > 0 ? h("span", { class: "fs2-plus" }, "+ ") : null,
      h("b", { style: { color: pal.ink } }, String(t.weight)), " × ",
      h("span", { class: "fs2-term" }, (TERM_LABEL[t.kind] ? TERM_LABEL[t.kind](t) : t.kind))));
}

/* ---- แถวปรับน้ำหนัก/วัน ของแต่ละ term ---- */
//  isLast = ตัวสุดท้าย → น้ำหนักถูกล็อกให้ระบบคิดเอง (บังคับผลรวม = 1.0)
function termEditRow(formula, t, root, pal, isLast) {
  // วันย้อนหลัง — dropdown (รวมค่าปัจจุบันเสมอ)
  const opts = Array.from(new Set([3, 7, 14, 28, t.days])).sort((a, b) => a - b);
  const dEl = h("select", { class: "fs2-sel" }, opts.map((o) => h("option", { value: o, selected: o === t.days }, o + " วัน")));
  dEl.addEventListener("change", () => { t.days = Math.max(1, parseInt(dEl.value) || 1); autoLastWeight(formula); saveFormula(formula); paint(root); });

  let wField;
  if (isLast) {
    // ตัวปรับอัตโนมัติ — แสดงค่าอย่างเดียว แก้ไม่ได้
    wField = h("div", { class: "fs2-fld" },
      h("span", null, "น้ำหนัก (อัตโนมัติ)"),
      h("div", { class: "fs2-num", style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", background: pal.soft, color: pal.ink, fontWeight: 800, cursor: "default" } },
        pi("lock", 12), String(round2(t.weight))),
    );
  } else {
    const wEl = inp(t.weight, { type: "text", inputMode: "decimal", class: "fs2-num" });
    wEl.addEventListener("change", () => {
      let v = parseFloat(wEl.value); if (!Number.isFinite(v) || v < 0) v = 0; if (v > 1) v = 1;
      t.weight = round2(v); autoLastWeight(formula); saveFormula(formula); paint(root);
    });
    wField = h("div", { class: "fs2-fld" }, h("span", null, "น้ำหนัก"), wEl);
  }
  return h("div", { class: "fs2-trow" },
    wField,
    h("div", { class: "fs2-fld grow" }, h("span", null, "วันย้อนหลัง"), dEl),
  );
}

function formulaCard(formula, root, cfg, i) {
  const pal = palOf(i);
  const active = cfg.defaultFormulaId === formula.id;
  const nameEl = h("input", { class: "fs2-name", value: formula.name });
  nameEl.addEventListener("change", () => { if (nameEl.value.trim()) { formula.name = nameEl.value.trim(); saveFormula(formula); } });

  // บังคับผลรวมน้ำหนัก = 1.0 ก่อนแสดงผล (ตัวสุดท้ายคิดอัตโนมัติ)
  if (formula.type !== "average") autoLastWeight(formula);
  const nTerms = (formula.terms || []).length;

  const terms = formula.type === "average"
    ? (() => {
        const dEl = inp(formula.days, { type: "text", inputMode: "numeric", class: "fs2-num wide" });
        dEl.addEventListener("change", () => { formula.days = Math.max(1, parseInt(dEl.value) || 1); saveFormula(formula); paint(root); });
        return [h("div", { class: "fs2-trow" }, h("div", { class: "fs2-fld grow" }, h("span", null, "จำนวนวัน (เฉลี่ย)"), dEl))];
      })()
    : (formula.terms || []).map((t, ti) => termEditRow(formula, t, root, pal, ti === nTerms - 1));

  const overWeight = formula.type !== "average" && nTerms > 1 && manualWeightSum(formula) > 1;

  return h("div", { class: "fs2-card" + (active ? " on" : ""), style: { "--fc": pal.c, "--fcsoft": pal.soft, "--fcink": pal.ink } },
    h("div", { class: "fs2-card-h" },
      h("span", { class: "fs2-numbadge" }, String(i + 1)),
      nameEl,
      formula.builtin ? h("span", { class: "fs2-tag std" }, "มาตรฐาน") : h("span", { class: "fs2-tag custom" }, "กำหนดเอง"),
    ),
    h("div", { class: "fs2-expr" }, ...exprNodes(formula, pal)),
    h("div", { class: "fs2-terms" }, ...terms),
    formula.type !== "average" && nTerms > 1
      ? h("div", { class: "fs2-note", style: overWeight ? { background: "var(--tint-rose)", color: "var(--danger-ink)" } : null },
          h("span", null, overWeight ? "⚠" : "∑"),
          h("span", null, overWeight
            ? "น้ำหนักที่กรอกรวมเกิน 1.0 — ตัวสุดท้ายถูกตั้งเป็น 0 · ลดค่าตัวอื่นลง"
            : "ระบบบังคับผลรวม = 1.0 · ตัวสุดท้ายคิดให้อัตโนมัติ (🔒) — กรอกเฉพาะตัวบน"))
      : null,
    formula.note ? h("div", { class: "fs2-note" }, h("span", null, "ⓘ"), h("span", null, formula.note)) : null,
    h("div", { class: "fs2-card-foot" },
      h("span", { class: "fs2-open" }, pi("check", 12), "ใช้เฉพาะวันร้านเปิด"),
      active
        ? h("span", { class: "fs2-active-chip" }, pi("check", 13), "ใช้งานอยู่")
        : h("button", { type: "button", class: "fs2-usebtn", onClick: () => { saveCfg({ defaultFormulaId: formula.id }); fst.ctx.toast("ตั้งเป็นสูตรหลัก"); paint(root); } }, "เลือกใช้"),
      !formula.builtin
        ? h("button", { type: "button", class: "fs2-del", "aria-label": "ลบสูตร", onClick: () => { removeFormula(formula.id); fst.ctx.toast("ลบสูตรแล้ว"); paint(root); } }, pi("trash", 14))
        : null,
    ),
  );
}

function rangeRow(rg, root) {
  const f = formulaById(rg.formulaId);
  const i = getFormulas().findIndex((x) => x.id === rg.formulaId);
  const pal = palOf(i < 0 ? 0 : i);
  return h("div", { class: "fs2-rng" },
    h("span", { class: "fs2-rng-d" }, (rg.start || "—") + " → " + (rg.end || "ต่อไป")),
    h("span", { class: "fs2-rng-arrow" }, pi("chev", 14)),
    h("span", { class: "fs2-rng-f", style: { background: pal.soft, color: pal.ink } }, f ? f.name : rg.formulaId),
    h("button", { type: "button", class: "fs2-del", "aria-label": "ลบช่วง", onClick: () => { removeRange(rg.id); paint(root); } }, pi("trash", 14)),
  );
}

function addRangeForm(root) {
  const forms = getFormulas();
  const startEl = inp("", { type: "date" });
  const endEl = inp("", { type: "date" });
  const selEl = h("select", { class: "input" }, forms.map((f) => h("option", { value: f.id }, f.name)));
  return h("div", { class: "fs2-addrng" },
    h("div", { class: "rowflex", style: { gap: "8px" } },
      h("label", { class: "stack", style: { gap: "3px", flex: 1 } }, h("span", { class: "fs2-mini-lbl" }, "ตั้งแต่"), startEl),
      h("label", { class: "stack", style: { gap: "3px", flex: 1 } }, h("span", { class: "fs2-mini-lbl" }, "ถึง (เว้น=ต่อไป)"), endEl)),
    h("div", { class: "rowflex", style: { gap: "8px", marginTop: "8px" } },
      h("label", { class: "stack", style: { gap: "3px", flex: 1 } }, h("span", { class: "fs2-mini-lbl" }, "ใช้สูตร"), selEl),
      h("button", { type: "button", class: "btn btn-primary", style: { flex: "none", alignSelf: "flex-end" }, onClick: () => {
        if (!startEl.value) { fst.ctx.toast("เลือกวันเริ่ม"); return; }
        saveRange({ id: "rg-" + Date.now(), start: startEl.value, end: endEl.value || null, formulaId: selEl.value });
        fst.adding = false; fst.ctx.toast("เพิ่มช่วงวันแล้ว"); paint(root);
      } }, pi("check", 15), "เพิ่ม")),
  );
}

function paint(root) {
  const { back, toast } = fst.ctx;
  const cfg = getCfg();
  const forms = getFormulas();
  const defFormula = formulaById(cfg.defaultFormulaId);
  const ranges = getRanges();
  const err = aggError(defFormula);

  const defSel = h("select", { class: "fs2-defsel" }, forms.map((f) => h("option", { value: f.id, selected: f.id === cfg.defaultFormulaId }, f.name)));
  defSel.addEventListener("change", () => { saveCfg({ defaultFormulaId: defSel.value }); paint(root); });

  const factorEl = inp(cfg.riceFactor, { type: "text", inputMode: "decimal", class: "fs2-num wide" });
  factorEl.addEventListener("change", () => { saveCfg({ riceFactor: Math.max(1, parseFloat(factorEl.value) || 1.5) }); toast("บันทึกอัตราส่วนข้าว"); });
  const bbEl = inp(cfg.riceberryPct, { type: "text", inputMode: "numeric", class: "fs2-num wide" });
  bbEl.addEventListener("change", () => { const v = Math.max(0, Math.min(100, parseInt(bbEl.value) || 0)); saveCfg({ riceberryPct: v }); paint(root); });

  const defPal = palOf(Math.max(0, forms.findIndex((f) => f.id === cfg.defaultFormulaId)));

  root.replaceChildren(
    hdr({ title: "สูตรพยากรณ์", sub: "เลือก · ปรับ · กำหนดช่วงวัน · เพิ่มสูตร", onBack: back, right: h("span", { class: "catic violet" }, cic("recipe", 20)) }),
    h("div", { class: "page stack fs2" },

      // ---- hero ----
      h("div", { class: "fs2-hero" },
        h("div", { class: "fs2-spark s1" }, "✦"), h("div", { class: "fs2-spark s2" }, "✧"),
        chick(76, "calc", { float: true }),
        h("div", { style: { flex: 1, minWidth: 0 } },
          h("div", { class: "fs2-hero-t" }, "ไลบรารีสูตรพยากรณ์"),
          h("div", { class: "fs2-hero-s" }, "เลือกสูตรตามสถานการณ์ — ช่วงปกติ/ช่วงยอดพุ่ง · ปรับค่าได้ทุกตัว"),
          h("div", { class: "fs2-hero-pills" },
            h("span", { class: "fs2-pill", style: { background: defPal.soft, color: defPal.ink } }, "ใช้งานอยู่: " + defFormula.name))),
      ),

      // ---- สูตรที่ใช้งาน + default ----
      h("div", { class: "fs2-block" },
        h("div", { class: "fs2-block-h" }, cic("target", 22), h("span", null, "สูตรที่ใช้งานอยู่")),
        h("div", { class: "fs2-active2" },
          h("label", { class: "fs2-af" }, h("span", null, "สูตร Default (เมื่อไม่กำหนดช่วง)"), defSel),
          h("div", { class: "fs2-af" }, h("span", null, "กำลังใช้งาน"),
            h("div", { class: "fs2-active-now", style: { background: defPal.soft, color: defPal.ink } }, h("b", null, defFormula.name), pi("check", 16))))),

      // ---- กำหนดช่วงวัน ----
      h("div", { class: "fs2-block" },
        h("div", { class: "fs2-block-h" }, cic("calendar", 22), h("span", null, "กำหนดช่วงวัน → สูตร"),
          h("button", { type: "button", class: "fs2-addbtn", onClick: () => { fst.adding = !fst.adding; paint(root); } }, pi(fst.adding ? "x" : "plus", 13), fst.adding ? "ปิด" : "เพิ่มช่วงวัน")),
        fst.adding ? addRangeForm(root) : null,
        ranges.length
          ? h("div", { class: "stack", style: { gap: "7px" } }, ranges.map((rg) => rangeRow(rg, root)))
          : h("div", { class: "fs2-emptyrng" }, "ยังไม่กำหนดช่วง — ทุกวันใช้ ", bold(defFormula.name), " (Default)"),
        h("div", { class: "fs2-hint" }, "💡 เช่น ช่วงคนละครึ่ง/เทศกาล ยอดพุ่ง → ตั้งเป็นสูตร Event ให้จับ spike ทัน"),
      ),

      // ---- ไลบรารีสูตร ----
      h("div", { class: "fs2-libtitle" }, cic("recipe", 20), h("span", null, "ไลบรารีสูตร — แตะเลือกใช้ / ปรับค่าได้"),
        h("span", { class: "fs2-count" }, forms.length + " สูตร")),
      h("div", { class: "stack", style: { gap: "11px" } }, forms.map((f, i) => formulaCard(f, root, cfg, i))),

      h("div", { class: "rowflex", style: { gap: "8px", marginTop: "2px" } },
        h("button", { type: "button", class: "btn", style: { flex: 1 }, onClick: () => {
          const base = formulaById(cfg.defaultFormulaId);
          const copy = JSON.parse(JSON.stringify(base));
          copy.id = "f-" + Date.now(); copy.name = base.name + " (สำเนา)"; copy.builtin = false;
          saveFormula(copy); toast("คัดลอกสูตรแล้ว"); paint(root);
        } }, pi("edit", 15), "คัดลอก"),
        h("button", { type: "button", class: "btn btn-primary", style: { flex: 1.4 }, onClick: () => {
          const id = "f-" + Date.now();
          saveFormula({ id, name: "สูตรใหม่", type: "weighted", terms: [{ kind: "avg_open", days: 7, weight: 0.5 }, { kind: "same_weekday", days: 28, weight: 0.5 }] });
          toast("เพิ่มสูตรใหม่ — ปรับชื่อ/ค่าได้เลย"); paint(root);
        } }, pi("plus", 16), "เพิ่มสูตรใหม่")),

      // ---- error & learning ----
      h("div", { class: "fs2-libtitle" }, cic("growth", 20), h("span", null, "Error & การเรียนรู้ของโมเดล")),
      h("div", { class: "fs2-errcard" },
        err
          ? h("div", { class: "fs2-errgrid" },
              h("div", { class: "fs2-errbox mape" }, h("div", { class: "fs2-errk" }, "MAPE"), h("div", { class: "fs2-errv" }, err.mape + "%"), h("div", { class: "fs2-errmood" }, moodOf(err.mape))),
              h("div", { class: "fs2-errbox wmape" }, h("div", { class: "fs2-errk" }, "WMAPE"), h("div", { class: "fs2-errv" }, err.wmape + "%"), h("div", { class: "fs2-errmood" }, moodOf(err.wmape))),
              h("div", { class: "fs2-errbox base" }, h("div", { class: "fs2-errk" }, "ฐานข้อมูล"), h("div", { class: "fs2-errv sm" }, err.n), h("div", { class: "fs2-errmood" }, "จุด backtest")))
          : h("div", { class: "fs2-learning" }, chick(56, "sprout", {}), h("div", null, h("b", null, "กำลังเรียนรู้"), h("div", { style: { fontSize: "12px", color: "var(--muted)" } }, "ข้อมูลยังไม่พอทำ backtest — เก็บยอดอีกสักระยะ"))),
        h("div", { class: "fs2-auto" },
          h("div", null, h("div", { class: "fs2-auto-t" }, "ปรับ model อัตโนมัติ"), h("div", { class: "fs2-auto-s" }, "ดึง bias กลับทีละน้อย (cap ±" + Math.round(cfg.maxNudge * 100) + "%) กัน overfit")),
          toggle(cfg.autoImprove, (v) => { saveCfg({ autoImprove: v }); toast(v ? "เปิดปรับ model อัตโนมัติ" : "ปิด"); })),
      ),

      // ---- rice ----
      h("div", { class: "fs2-libtitle" }, cic("rice-white", 20), h("span", null, "ตั้งค่าข้าว")),
      h("div", { class: "fs2-block" },
        h("div", { class: "fs2-ricerow" }, h("span", null, "อัตราส่วน อาหารขาย → ข้าวดิบ (×)"), factorEl),
        h("div", { class: "fs2-ricerow" }, h("span", null, "ไรซ์เบอรี่ (%) · ที่เหลือ = หอมมะลิ"), bbEl),
        h("div", { class: "fs2-hint" }, "ตอนนี้: อาหารขาย × ", bold(String(cfg.riceFactor)), " = ข้าวดิบ · ไรซ์เบอรี่ ", bold(cfg.riceberryPct + "%"), " / หอมมะลิ ", bold((100 - cfg.riceberryPct) + "%")),
      ),
    ),
  );
}
