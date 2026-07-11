// ============================================================
// forecast/formulaLibrary.js — ไลบรารีสูตรพยากรณ์ (ผู้ใช้เลือก/ปรับ/เพิ่ม/กำหนดช่วงวัน)
//   อิง "ยอดใช้จริงรายวัน" จาก utils/usage.dailyUsage (ใช้เฉพาะวันที่ร้านเปิด = วันที่มีในซีรีส์)
//
//   • สูตรเป็น DATA ล้วน → เพิ่ม/แก้ได้โดยไม่ต้องแตะโค้ด
//   • แต่ละช่วงวันเลือกสูตรได้เอง · ช่วงที่ไม่กำหนด → ใช้สูตร default
//   • เก็บ error (MAPE/WMAPE) จาก backtest + ปรับ model ทีละน้อย (bias nudge, มี cap กัน overfit)
//
//   เก็บใน localStorage (ออฟไลน์ได้) — mirror ขึ้น Supabase rama9_settings ทีหลังได้
// ============================================================

import { load, save } from "../utils/storage.js";
import { dailyUsage, todayISO, addDaysISO, dowOf } from "../utils/usage.js";

const F_KEY = "forecast:formulas:v1";
const R_KEY = "forecast:ranges:v1";
const S_KEY = "forecast:cfg:v1";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

// ---- term kinds ----
//  avg_open      : ค่าเฉลี่ย N วันร้านเปิดล่าสุด
//  same_weekday  : ค่าเฉลี่ยวันเดียวกัน ภายใน withinDays วันล่าสุด
export const TERM_LABEL = {
  avg_open: (t) => "เฉลี่ย " + t.days + " วันเปิดล่าสุด",
  same_weekday: (t) => "วันเดียวกัน ย้อน " + t.days + " วัน",
};

// ---- สูตรตั้งต้น (แก้/เพิ่มได้) ----
const FORMULAS_SEED = [
  { id: "normal", name: "Normal", builtin: true, type: "weighted",
    terms: [{ kind: "avg_open", days: 7, weight: 0.5 }, { kind: "same_weekday", days: 28, weight: 0.5 }] },
  { id: "event", name: "Event", builtin: true, type: "weighted",
    terms: [{ kind: "avg_open", days: 3, weight: 0.5 }, { kind: "avg_open", days: 7, weight: 0.3 }, { kind: "same_weekday", days: 28, weight: 0.2 }] },
  { id: "average", name: "ค่าเฉลี่ย", builtin: true, type: "average", days: 14 },
  { id: "wsame", name: "ถ่วงน้ำหนักวันเดียวกัน", builtin: true, type: "weighted",
    terms: [{ kind: "same_weekday", days: 30, weight: 0.5 }, { kind: "same_weekday", days: 60, weight: 0.3 }, { kind: "same_weekday", days: 90, weight: 0.2 }] },
];

const CFG_SEED = {
  defaultFormulaId: "normal",
  autoImprove: true,        // ปรับ model ทีละน้อยจาก error (bias nudge)
  maxNudge: 0.08,           // เพดานการปรับต่อรอบ (กัน overfit)
  recentWindow: 7,          // ช่วงคำนวณ สูง/ต่ำ/เฉลี่ย ที่โชว์
  riceFactor: 1.5,          // อาหารขาย × 1.5 = ข้าวดิบที่ต้องเตรียม
  riceberryPct: 85,         // ไรซ์เบอรี่ %  (ที่เหลือ = หอมมะลิ)
  prepHidden: ["pack", "dry"], // หมวดที่ "ซ่อน" ในหน้าเตรียมของ (ตั้งใน "เพิ่มเติม") — ดูอาหาร/เครื่องดื่มเป็นหลัก
};

/* ---------- หมวดที่โชว์/ซ่อนในหน้าเตรียมของ (ตั้งจากหน้าเพิ่มเติม) ---------- */
export function getPrepHidden() { const c = getCfg(); return Array.isArray(c.prepHidden) ? c.prepHidden : []; }
export function isPrepCatOn(catId) { return !getPrepHidden().includes(catId); }
export function setPrepCatOn(catId, on) {
  const set = new Set(getPrepHidden());
  if (on) set.delete(catId); else set.add(catId);
  saveCfg({ prepHidden: [...set] });
  return [...set];
}

/* ---------- persistence ---------- */
export function getFormulas() { const f = load(F_KEY, null); return (f && f.length) ? f : FORMULAS_SEED.map((x) => ({ ...x })); }
export function saveFormulas(list) { save(F_KEY, list); }
export function saveFormula(f) {
  const list = getFormulas(); const i = list.findIndex((x) => x.id === f.id);
  if (i >= 0) list[i] = { ...list[i], ...f }; else list.push({ ...f });
  saveFormulas(list); return list;
}
export function removeFormula(id) {
  const list = getFormulas().filter((x) => x.id !== id || x.builtin);  // builtin ลบไม่ได้
  saveFormulas(list);
  const cfg = getCfg(); if (cfg.defaultFormulaId === id) saveCfg({ defaultFormulaId: "normal" });
  saveRanges(getRanges().filter((r) => r.formulaId !== id));
  return list;
}
export function formulaById(id) { return getFormulas().find((x) => x.id === id) || getFormulas()[0]; }

export function getRanges() { return load(R_KEY, []) || []; }
export function saveRanges(list) { save(R_KEY, list); }
export function saveRange(rg) {
  const list = getRanges(); const i = list.findIndex((x) => x.id === rg.id);
  if (i >= 0) list[i] = { ...list[i], ...rg }; else list.push({ ...rg });
  list.sort((a, b) => (a.start < b.start ? -1 : 1)); saveRanges(list); return list;
}
export function removeRange(id) { saveRanges(getRanges().filter((x) => x.id !== id)); }

export function getCfg() { return { ...CFG_SEED, ...(load(S_KEY, {}) || {}) }; }
export function saveCfg(patch) { const next = { ...getCfg(), ...patch }; save(S_KEY, next); return next; }

// สูตรที่ใช้กับวันเป้าหมาย: ช่วงที่ครอบ → สูตรนั้น, ไม่งั้น default
export function formulaForDate(iso) {
  for (const r of getRanges()) {
    if (r.start && iso >= r.start && (!r.end || iso <= r.end)) return formulaById(r.formulaId);
  }
  return formulaById(getCfg().defaultFormulaId);
}

/* ---------- term evaluation (ใช้เฉพาะวันร้านเปิด = entries ที่มีในซีรีส์) ---------- */
function evalTerm(t, hist, targetISO) {
  if (t.kind === "avg_open") return mean(hist.slice(-t.days).map((p) => p.sales));
  if (t.kind === "same_weekday") {
    const dow = dowOf(targetISO); const cutoff = addDaysISO(targetISO, -t.days);
    return mean(hist.filter((p) => p.dow === dow && p.date >= cutoff).map((p) => p.sales));
  }
  return null;
}

// คำนวณค่าพยากรณ์ดิบจากสูตร + ประวัติ (hist = วันก่อน target, เรียงเก่า→ใหม่)
export function evalFormula(formula, hist, targetISO) {
  if (!hist.length) return 0;
  const fallback = mean(hist.slice(-7).map((p) => p.sales)) || 0;
  if (formula.type === "average") { const v = mean(hist.slice(-(formula.days || 14)).map((p) => p.sales)); return Math.max(0, v == null ? fallback : v); }
  let sum = 0, wsum = 0;
  for (const t of formula.terms || []) {
    let v = evalTerm(t, hist, targetISO); if (v == null) v = fallback;   // term ข้อมูลขาด → ใช้ค่าฐานล่าสุด
    sum += (t.weight || 0) * v; wsum += (t.weight || 0);
  }
  const v = wsum > 0 ? sum / wsum : fallback;
  return Math.max(0, v);
}

/* ---------- backtest: error (MAPE/WMAPE) + bias สำหรับ nudge ---------- */
export function backtest(formula, series) {
  const minHist = 7; let apeSum = 0, apeN = 0, absSum = 0, actSum = 0, biasSum = 0, biasN = 0;
  for (let i = minHist; i < series.length; i++) {
    const hist = series.slice(0, i); const act = series[i].sales;
    const pred = evalFormula(formula, hist, series[i].date);
    if (act > 0) { apeSum += Math.abs(pred - act) / act; apeN++; biasSum += (pred - act) / act; biasN++; }
    absSum += Math.abs(pred - act); actSum += act;
  }
  if (apeN < 3) return null;
  return {
    n: apeN,
    mape: r2(100 * apeSum / apeN),
    wmape: r2(actSum > 0 ? 100 * absSum / actSum : 0),
    bias: biasN ? biasSum / biasN : 0,    // +ve = พยากรณ์สูงไป
  };
}

/* ---------- ผลพยากรณ์ต่อวัตถุดิบ (ใช้ในหน้าเตรียมของ) ---------- */
// คืน { predicted, max, min, avg, formulaId, formulaName, mape, wmape, learning, n } | null
export function forecastItem(itemId, targetISO = addDaysISO(todayISO(), 1)) {
  const series = dailyUsage(itemId);
  if (!series.length) return null;
  const formula = formulaForDate(targetISO);
  const cfg = getCfg();

  let predicted = evalFormula(formula, series, targetISO);
  const bt = backtest(formula, series);

  // ปรับ model ทีละน้อย: ถ้า bias สูง/ต่ำเป็นระบบ → ดึงกลับ (cap กัน overfit)
  if (cfg.autoImprove && bt) {
    const adj = clamp(-bt.bias, -cfg.maxNudge, cfg.maxNudge);
    predicted = predicted * (1 + adj);
  }

  const recent = series.slice(-(cfg.recentWindow || 7)).map((p) => p.sales);
  const round = (v) => r2(v);
  return {
    predicted: round(Math.max(0, predicted)),
    max: round(Math.max(...recent)),
    min: round(Math.min(...recent)),
    avg: round(mean(recent) || 0),
    formulaId: formula.id, formulaName: formula.name,
    mape: bt ? bt.mape : null, wmape: bt ? bt.wmape : null,
    learning: !bt,                    // ยังไม่มี error พอ → "กำลังเรียนรู้"
    n: series.length,
  };
}

/* ---------- ข้าว: อาหารขาย(ข้าวสุก) × factor = ข้าวดิบ, แบ่งไรซ์เบอรี่/หอมมะลิ ---------- */
// cookedKg = ผลรวมพยากรณ์ของรายการข้าว (กก.)
export function riceBreakdown(cookedKg) {
  const cfg = getCfg();
  const raw = r2(cookedKg * cfg.riceFactor);
  const bbPct = cfg.riceberryPct, jmPct = 100 - bbPct;
  return {
    cooked: r2(cookedKg), factor: cfg.riceFactor, raw,
    riceberry: r2(raw * bbPct / 100), jasmine: r2(raw * jmPct / 100),
    riceberryPct: bbPct, jasminePct: jmPct,
  };
}
