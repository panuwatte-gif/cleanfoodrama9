// ============================================================
// utils/formulas.js — สูตร/ตัวช่วยที่เป็น JS ล้วน (พอร์ตจาก data.jsx)
// อ่านข้อมูลปัจจุบันผ่าน sync getter ของ data/store.js
// ทุกฟังก์ชันบริสุทธิ์ (pure) — รับเข้า → คืนออก ไม่มี side-effect
// ============================================================

import { cats, items, assumptions, assume, stockRows, salesRows } from "../data/store.js";
import {
  TODAY, FC_BASE, DOW_SALES, STOCK_SEED, SHOP_ONLY, ORDER_CAT_IDS,
  ICON_EMOJI, ITEM_EMOJI, SUB_TINT, CAT_TINT, SECTION_TINT, UNIT_CHOICES,
  RECV_LOG, MONEY, COST_MODEL,
} from "../data/seed.js";

/* ---------- พื้นฐาน ---------- */
export const fmt = (n) => Number(n).toLocaleString("th-TH");
export const itemById = (id) => items().find((i) => i.id === id);
export const catById = (id) => cats().find((c) => c.id === id);
export const subById = (catId, subId) => { const c = catById(catId); return c && c.subs ? c.subs.find((s) => s.id === subId) : null; };
export const unitOf = (it) => it.unit || catById(it.cat).unit;

/* ลำดับมาตรฐาน: รายการของหมวด เรียงตามหมวดย่อย */
export const itemsOf = (catId) => {
  const c = catById(catId);
  const list = items().filter((i) => i.cat === catId && i.isActive !== false);
  if (!c.subs) return list;
  return c.subs.flatMap((s) => list.filter((i) => i.sub === s.id)).concat(list.filter((i) => !i.sub));
};
export const itemIcon = (it) => it.icon || (it.sub && subById(it.cat, it.sub) ? subById(it.cat, it.sub).icon : catById(it.cat).icon);
export const itemTint = (it) => (it.sub && SUB_TINT[it.sub]) || CAT_TINT[it.cat] || catById(it.cat).tint;

/* ---------- อิโมจิ ---------- */
export const emojiByIcon = (name) => ICON_EMOJI[name] || null;
export const catEmoji = (catId) => { const c = catById(catId); return c ? ICON_EMOJI[c.icon] || null : null; };
export const itemEmoji = (it) => {
  if (!it) return null;
  if (typeof it === "string") it = itemById(it);
  if (!it) return null;
  return ITEM_EMOJI[it.id] || ICON_EMOJI[itemIcon(it)] || null;
};

/* ---------- หน่วยนับ ---------- */
export const unitOptions = (it) => {
  const u = unitOf(it);
  return [u, ...UNIT_CHOICES.filter((x) => x !== u)];
};

/* ---------- sections (เมนูกับข้าวแตกตามชนิด) ---------- */
export const sectionsFor = (cs) => {
  const out = [];
  cs.forEach((c) => {
    if (c.id === "protein" && c.subs) {
      c.subs.forEach((sb) => {
        const list = items().filter((i) => i.cat === "protein" && i.sub === sb.id && i.isActive !== false);
        if (list.length) out.push({ id: sb.id, name: sb.name, icon: sb.icon, tint: SECTION_TINT[sb.id] || "rose", items: list });
      });
    } else {
      out.push({ id: c.id, name: c.name, icon: c.icon, tint: SECTION_TINT[c.id] || c.tint, items: itemsOf(c.id), subs: c.subs });
    }
  });
  return out;
};

/* ---------- ตัวกรองหมวดแบบรวม "อาหาร" (protein parent) ----------
   ทุกหน้าใช้โครงเดียวกัน: tab "อาหาร" ครอบ เนื้อ/หมู/เป็ด/ไก่/ปลา/กุ้ง
   value: "all" ทุกอย่าง · "protein" อาหารทั้งหมด · sub-id เฉพาะหมวดย่อย · cat-id หมวดนั้น */
export const proteinSubIds = (cs = cats()) => {
  const p = cs.find((c) => c.id === "protein");
  return p && p.subs ? p.subs.map((s) => s.id) : [];
};
export const matchCat = (it, value, cs = cats()) => {
  if (!it || value === "all" || value == null) return true;
  if (value === "protein") return it.cat === "protein";
  if (proteinSubIds(cs).includes(value)) return it.cat === "protein" && it.sub === value;
  return it.cat === value;
};

export const orderCats = () => cats().filter((c) => ORDER_CAT_IDS.includes(c.id));
export const orderItems = () => items().filter((it) => ORDER_CAT_IDS.includes(it.cat) && it.isActive !== false);

// จัดลำดับเมนูให้เหมือนกันทุกหน้า (หน้าเมนู + โภชนาการ): ตามหมวด → หมวดย่อย → ชื่อ
export function menuSortIndex(m) {
  const it = itemById(m.item);
  const cs = cats();
  const ci = it ? cs.findIndex((c) => c.id === it.cat) : -1;
  const cat = ci >= 0 ? cs[ci] : null;
  const subs = (cat && cat.subs) || [];
  const si = it && it.sub ? subs.findIndex((s) => s.id === it.sub) : -1;
  return { ci: ci < 0 ? 999 : ci, si: si < 0 ? 998 : si };
}
export function sortMenus(list) {
  return (list || []).slice().sort((a, b) => {
    const ka = menuSortIndex(a), kb = menuSortIndex(b);
    if (ka.ci !== kb.ci) return ka.ci - kb.ci;
    if (ka.si !== kb.si) return ka.si - kb.si;
    return (a.name || "").localeCompare(b.name || "", "th");
  });
}

/* ====================================================================
   พยากรณ์ยอดขาย — hash → base → ช่วง
==================================================================== */
const _hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; };
const _round = (n, u) => (u === "kg" ? Math.round(n * 10) / 10 : Math.max(1, Math.round(n)));
export const baseFor = (it) => {
  if (FC_BASE[it.id] != null) return FC_BASE[it.id];
  const u = unitOf(it);
  const scale = u === "kg" ? 0.8 : u === "ซอง" ? 55 : u === "ขวด" ? 9 : u === "ฟอง" ? 18 : u === "แผง" ? 1.5 : 6;
  return scale * (0.55 + (_hash(it.id) % 100) / 100);
};
export const salesStat = (id) => {
  const it = itemById(id); if (!it) return null;
  const u = unitOf(it);
  const b = baseFor(it);
  const spread = 0.12 + (_hash(it.id) % 7) / 100;
  const tmrF = 1.06 + (_hash(it.id) % 5) / 100;
  const conf = spread < 0.15 ? "ดี" : "ปานกลาง";
  return {
    u,
    today: [_round(b * (1 - spread), u), _round(b * (1 + spread), u)],
    tmr: [_round(b * tmrF * (1 - spread), u), _round(b * tmrF * (1 + spread), u)],
    min4: _round(b * 0.42, u),
    max4: _round(b * 1.85, u),
    conf,
  };
};

/* ====================================================================
   สต๊อกต่อรายการ — ของจริง 7 ตัวใน STOCK, ที่เหลือ derive · FIFO
==================================================================== */
const _lotDate = (age) => { const d = TODAY.d - age; return (d > 0 ? d : 30 + d) + " มิ.ย."; };

// สถานะคงเหลือ (ok / mid / lo) คิดจาก "ใช้ได้อีกกี่วัน" เทียบเกณฑ์ของต่ำ (assumption)
// ถ้ารายการมี threshold รายตัว (qty) ที่เจ้าของตั้งไว้ → ใช้ qty เป็นเกณฑ์แทน
export const stStatus = (qty, use, threshold) => {
  if (threshold != null && threshold !== "" && Number(threshold) > 0) {
    const t = Number(threshold);
    return qty <= t ? "lo" : qty <= t * 1.5 ? "mid" : "ok";
  }
  const lowDays = Math.max(0.5, assume("low-days", 2));
  const days = use ? qty / use : 99;
  return days < lowDays * 0.5 ? "lo" : days < lowDays ? "mid" : "ok";
};

// เกณฑ์แจ้งเตือนรายตัว (qty) — รายการที่ตั้งเอง > ค่า default (use × low-days)
export const threshOf = (id) => {
  const row = stockRows().find((s) => s.id === id);
  if (row && row.threshold != null && row.threshold !== "") return Number(row.threshold);
  const inf = deriveStock(id);
  return Math.round(inf.use * Math.max(0.5, assume("low-days", 2)) * 10) / 10;
};

// derive: ค่าคงเหลือประมาณการสำหรับรายการที่ "ยังไม่มีแถวสต๊อกจริง" (hash-based)
export const deriveStock = (id) => {
  const it = itemById(id);
  const u = it ? unitOf(it) : "";
  // ไม่มีแถวสต๊อกจริง = ยังไม่ได้นับ/รับเข้า → คืนค่าว่าง (ไม่ปั้นตัวเลขเดโม)
  // คงเหลือ/อัตราใช้จริงมาจากการนับ-รับของจริงเท่านั้น (sync Supabase)
  return { id, qty: 0, use: 0, days: 0, lots: [], st: "ok", u };
};

// stockOf: อ่าน "แถวสต๊อกจริง" จากชั้นข้อมูลกลางก่อน (รับ/นับ/ทิ้ง → persist + sync)
// ไม่มีแถวจริง → derive (เหมือนเดิม) · status คิดสดจาก qty/use/threshold
// use (อัตราใช้/วัน): ถ้าแถวไม่ได้ตั้งไว้ → ใช้ยอดขายเฉลี่ย/วันจาก ledger (avgDailyUse) → "อยู่ได้อีกกี่วัน" คำนวณได้
export const stockOf = (id) => {
  const row = stockRows().find((s) => s.id === id);
  if (!row) return deriveStock(id);
  const it = itemById(id);
  const u = it ? unitOf(it) : "";
  const use = (row.use != null && row.use > 0) ? row.use : avgDailyUse(id);
  const qty = Math.round((Number(row.qty) || 0) * 100) / 100;
  const days = use ? Math.round((qty / use) * 10) / 10 : 0;
  const lots = (row.lots || []).map((l) => ({ d: l.d, age: l.age, qty: l.qty }));
  return { id, qty, use, days, lots, st: stStatus(qty, use, row.threshold), threshold: row.threshold, u };
};

// อัตราใช้เฉลี่ย/วัน จาก ledger ยอดขายรายวัน (flat baseline) — ใช้คิด "อยู่ได้กี่วัน"
// เฉลี่ยยอดขายต่อวันที่มีบันทึก · ไม่มีข้อมูล = 0
// ⚠ ใช้เฉพาะ "ช่วง 30 วันล่าสุด" ของข้อมูลที่มี (ไม่เอาของเก่ามาเฉลี่ยรวม → อัตราเพี้ยน)
const _USE_WINDOW = 30;
export const avgDailyUse = (id) => {
  const rows = salesRows().filter((r) => r.item === id && r.sold != null && r.date);
  if (!rows.length) return 0;
  // กรอบ 30 วันล่าสุดเทียบกับวันที่ใหม่สุดที่มีบันทึกของรายการนี้
  const latest = rows.reduce((mx, r) => (r.date > mx ? r.date : mx), rows[0].date);
  const cut = new Date(new Date(latest + "T00:00:00").getTime() - _USE_WINDOW * 86400000);
  const cutIso = cut.getFullYear() + "-" + String(cut.getMonth() + 1).padStart(2, "0") + "-" + String(cut.getDate()).padStart(2, "0");
  let sum = 0, n = 0;
  for (const r of rows) { if (r.date >= cutIso) { sum += Number(r.sold) || 0; n++; } }
  return n ? Math.round((sum / n) * 1000) / 1000 : 0;
};

/* ====================================================================
   การแสดงผลคงเหลือ/อัตราใช้/อยู่ได้กี่วัน — ให้ตรงหน่วย + ไม่โชว์เลขเพี้ยน
   • ของนับเป็นชิ้น (ขวด/ฟอง/ซอง/แผง/แพ็ค…) = จำนวนเต็มเสมอ
   • ชั่งน้ำหนัก (kg/g) = ทศนิยม 1 ตำแหน่ง
==================================================================== */
export const isCountUnit = (u) => !(u === "kg" || u === "g");
export const fmtQty = (qty, u) => {
  const n = Number(qty) || 0;
  return isCountUnit(u) ? fmt(Math.round(n)) : fmt(Math.round(n * 10) / 10);
};
// อัตราใช้/วัน (โชว์ละเอียดพอ — อัตราอาจ < 1/วัน) · kg = 2 ตำแหน่ง · นับชิ้น = 1 ตำแหน่ง
export const fmtRate = (r, u) => {
  const n = Number(r) || 0;
  return String((u === "kg" || u === "g") ? Math.round(n * 100) / 100 : Math.round(n * 10) / 10);
};
// เพดาน "อยู่ได้กี่วัน" — เกินนี้ถือว่าสต๊อกเกิน/ของเตรียมส่งสาขาอื่น (ไม่ใช่ขายช้า)
export const DAYS_CAP = 30;
// อยู่ได้อีกกี่วัน = คงเหลือ ÷ อัตราใช้/วัน · cap ที่ DAYS_CAP (over=true → แสดง "30+")
export const coverDays = (id) => {
  const inf = stockOf(id);
  if (!inf.use || inf.use <= 0 || !inf.qty) return { days: null, raw: null, over: false, use: inf.use || 0, qty: inf.qty || 0, u: inf.u };
  const raw = Math.round((inf.qty / inf.use) * 10) / 10;
  return { days: raw > DAYS_CAP ? DAYS_CAP : raw, raw, over: raw > DAYS_CAP, use: inf.use, qty: inf.qty, u: inf.u };
};
// จุดสั่งซื้อ (reorder point) เป็น "หน่วยจริง" = อัตราใช้/วัน × เกณฑ์ของต่ำ (low-days)
//   ของนับชิ้น → ปัดขึ้นเต็มหน่วย (อย่างน้อย 1) · kg → ทศนิยม 1 ตำแหน่ง · ไม่มีอัตราใช้ = null
export const reorderPoint = (id) => {
  const inf = stockOf(id);
  const lead = Math.max(0.5, assume("low-days", 2));
  const raw = (inf.use || 0) * lead;
  if (raw <= 0) return null;
  return isCountUnit(inf.u) ? Math.max(1, Math.ceil(raw)) : Math.round(raw * 10) / 10;
};

/* แยกสต๊อกเมนูอาหารเป็น เผ็ด/ไม่เผ็ด */
export const hotRatio = (id) => 0.52 + (_hash(id + "hot") % 19) / 100;
export const stockVariants = (id, qtyOverride) => {
  const it = itemById(id);
  const u = unitOf(it);
  const inf = stockOf(id);
  const q0 = (qtyOverride != null && qtyOverride !== "") ? (parseFloat(qtyOverride) || 0) : inf.qty;
  const scale = inf.qty ? q0 / inf.qty : 1;
  const lots = inf.lots.map((l) => ({ ...l, qty: _round(l.qty * scale, u) }));
  const use = inf.use;
  const mkSt = (d) => (d < 1 ? "lo" : d < 2 ? "mid" : "ok");
  const days = use ? Math.round((q0 / use) * 10) / 10 : 0;
  if (!it.spicy) {
    return [{ key: "plain", label: it.name, tag: null, qty: q0, use, days, lots, st: mkSt(days), u }];
  }
  const r = hotRatio(id);
  const hotQty = _round(q0 * r, u);
  const mildQty = Math.round((q0 - hotQty) * 100) / 100;
  const hotUse = _round(use * r, u);
  const mildUse = Math.round((use - hotUse) * 100) / 100;
  const hotDays = hotUse ? Math.round((hotQty / hotUse) * 10) / 10 : 0;
  const mildDays = mildUse ? Math.round((mildQty / mildUse) * 10) / 10 : 0;
  const hotLots = lots.map((l) => ({ ...l, qty: _round(l.qty * r, u) })).filter((l) => l.qty > 0);
  const mildLots = lots.map((l) => ({ ...l, qty: Math.round((l.qty - _round(l.qty * r, u)) * 100) / 100 })).filter((l) => l.qty > 0);
  return [
    { key: "total", label: it.name + " (ทั้งเผ็ด+ไม่เผ็ด)", tag: null,   qty: q0,      use,      days,     lots,     st: mkSt(days),     u },
    { key: "hot",   label: it.name + " (เผ็ด)",            tag: "hot",  qty: hotQty,  use: hotUse,  days: hotDays,  lots: hotLots,  st: mkSt(hotDays),  u },
    { key: "mild",  label: it.name + " (ไม่เผ็ด)",         tag: "mild", qty: mildQty, use: mildUse, days: mildDays, lots: mildLots, st: mkSt(mildDays), u },
  ];
};

/* ====================================================================
   พยากรณ์ 7 วัน — ทุกเมนู · ช่วง + min/max + เฉลี่ยถ่วงน้ำหนัก
==================================================================== */
const _dowMean = DOW_SALES.reduce((a, d) => a + d.v, 0) / DOW_SALES.length;
export const DOW_FACTOR = Object.fromEntries(DOW_SALES.map((d) => [d.d, d.v / _dowMean]));
const _DOW_SEQ = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
const _DOW_ABBR = { "จันทร์": "จ.", "อังคาร": "อ.", "พุธ": "พ.", "พฤหัสบดี": "พฤ.", "ศุกร์": "ศ.", "เสาร์": "ส.", "อาทิตย์": "อา." };
export const WEEK7 = (() => {
  const start = _DOW_SEQ.indexOf("พฤหัสบดี");
  const out = [];
  for (let i = 0; i < 7; i++) { const full = _DOW_SEQ[(start + i) % 7]; out.push({ i, full, abbr: _DOW_ABBR[full], d: TODAY.d + i, today: i === 0 }); }
  return out;
})();
export const fc7 = (id) => {
  const it = itemById(id); if (!it) return null;
  const u = unitOf(it);
  // ★ ฐานพยากรณ์ = "ยอดขายจริง" เฉลี่ย/วัน (จาก ledger salesRows · หน้าต่าง 30 วันล่าสุด)
  //   ไม่มีข้อมูลขายจริง = ไม่พยากรณ์ (คืน null) — กันตัวเลขมั่วของรายการที่ไม่เคยขาย
  const b = avgDailyUse(id);
  if (!(b > 0)) return null;
  // assumption ที่ผูกกับสูตรพยากรณ์ (แก้ในหน้า "ปรับค่า assumption")
  //  • fc-window = ใช้ข้อมูลย้อนหลังกี่เดือน → ยิ่งมาก ช่วงคาดการณ์ยิ่งแคบ (มั่นใจขึ้น)
  //  • order-buf = เผื่อความปลอดภัยใบสั่งของ (%) → ใช้คำนวณ "แนะนำสั่ง"
  const win = Math.max(1, assume("fc-window", 3));
  const winF = Math.min(1.6, Math.max(0.6, 3 / win));
  const buf = Math.max(0, assume("order-buf", 10)) / 100;
  const spread = (0.12 + (_hash(it.id) % 7) / 100) * winF;
  // ★ ปัดแบบ "ตรงจริง" — เก็บ 2 ตำแหน่ง ไม่ปัดขึ้นขั้นต่ำเป็น 1 (ของขายน้อย <1/วัน จะได้ไม่โป่งเป็น 1)
  const rq = (n) => Math.round(n * 100) / 100;
  const days = WEEK7.map((wd) => {
    const f = DOW_FACTOR[wd.full] || 1;
    const center = b * f;
    const lo = rq(center * (1 - spread));
    const hi = rq(center * (1 + spread));
    const mid = Math.round(((lo + hi) / 2) * 100) / 100;
    const conf = Math.max(70, Math.round((spread < 0.15 ? 89 : 84) - wd.i * 1.5 + (_hash(it.id + wd.full) % 3)));
    return { ...wd, lo, hi, mid, conf };
  });
  const min = Math.min(...days.map((d) => d.lo));
  const max = Math.max(...days.map((d) => d.hi));
  const wsum = days.reduce((a, d) => a + d.conf, 0);
  const wavgRaw = days.reduce((a, d) => a + d.mid * d.conf, 0) / wsum;
  const wavg = Math.round(wavgRaw * 100) / 100;
  // แนะนำสั่ง/วัน = ค่าเฉลี่ยถ่วง + เผื่อความปลอดภัย (order-buf) · ของนับชิ้น ปัดขึ้นอย่างน้อย 1 (สั่งเป็นชิ้น)
  const recRaw = wavg * (1 + buf);
  const rec = u === "kg" ? Math.round(recRaw * 100) / 100 : (recRaw > 0 ? Math.max(1, Math.round(recRaw)) : 0);
  const prob = Math.round(wsum / days.length);
  return { u, days, min, max, wavg, rec, bufPct: Math.round(buf * 100), prob, conf: prob >= 85 ? "สูง" : prob >= 78 ? "กลาง" : "พอใช้" };
};
export const fc7DayTotals = (its) => WEEK7.map((wd) => {
  let lo = 0, hi = 0;
  its.forEach((it) => { const s = fc7(it.id); if (s) { lo += s.days[wd.i].lo; hi += s.days[wd.i].hi; } });
  return { ...wd, lo: Math.round(lo * 10) / 10, hi: Math.round(hi * 10) / 10 };
});

/* ====================================================================
   ค่าใช้จ่ายรับของ — ดึงต้นทุน/หน่วยจากข้อมูลกลาง (ITEMS.cost)
==================================================================== */
const SHIP_OVERRIDE = {};
export const shipOf = (day) => (SHIP_OVERRIDE[day] !== undefined ? SHIP_OVERRIDE[day] : (RECV_LOG[day] ? RECV_LOG[day].ship : null));
export const setShipOf = (day, v) => { SHIP_OVERRIDE[day] = v; };
export const recvOf = (day) => {
  const r = RECV_LOG[day];
  if (!r) return null;
  const lines = r.items.map(({ id, qty }) => {
    const it = itemById(id);
    const cost = it ? it.cost : 0;
    return { id, qty, cost, unit: it ? unitOf(it) : "", name: it ? it.name : id, sub: Math.round(qty * cost * 100) / 100 };
  }).sort((a, b) => b.sub - a.sub);
  const menuTotal = Math.round(lines.reduce((s, l) => s + l.sub, 0));
  const ship = shipOf(day);
  return { time: r.time, count: lines.length, lines, menuTotal, ship, total: menuTotal + (ship || 0) };
};
export const RECV_DAYS = Object.keys(RECV_LOG).map(Number).sort((a, b) => a - b);
export const recvMonth = () => {
  let menu = 0, ship = 0, batches = 0, count = 0, pending = 0;
  RECV_DAYS.forEach((d) => { const r = recvOf(d); menu += r.menuTotal; ship += (r.ship || 0); batches++; count += r.count; if (r.ship == null) pending++; });
  return { menu, ship, total: menu + ship, batches, items: count, pending };
};

/* ====================================================================
   รายงานเงิน — สะสม · จุดคุ้มทุน · รับ/จ่ายรายวัน
==================================================================== */
export const fixedMonthTotal = Object.values(COST_MODEL.fixedMonth).reduce((a, b) => a + b, 0);
export const breakevenPerDay = Math.round((fixedMonthTotal / 30) / (1 - COST_MODEL.varRatio));

/* จุดคุ้มทุน "ปรับได้จริง" — เจ้าของกรอกต้นทุนคงที่ + % ต้นทุนวัตถุดิบ + วันเปิด/เดือน
   เก็บใน localStorage · ค่าเริ่มต้นดึงจาก COST_MODEL · คำนวณ auto = (คงที่/วัน) ÷ (1 − var%) */
const BE_KEY = "be:v1";
const _beNum = (v, dflt) => { const n = parseFloat(String(v).replace(/,/g, "")); return Number.isFinite(n) ? n : dflt; };
export function beParams() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(BE_KEY) || "{}"); } catch (_) { s = {}; }
  const fm = COST_MODEL.fixedMonth;
  return {
    rent:  _beNum(s.rent,  fm["ค่าเช่า"]),
    labor: _beNum(s.labor, fm["ค่าแรงประจำ"]),
    util:  _beNum(s.util,  fm["ค่าไฟ/น้ำ/เน็ต"]),
    other: _beNum(s.other, fm["อื่นๆคงที่"]),
    varPct: _beNum(s.varPct, Math.round(COST_MODEL.varRatio * 100)),
    days:   _beNum(s.days, 30),
  };
}
export function setBeParams(patch) {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(BE_KEY) || "{}"); } catch (_) { s = {}; }
  try { localStorage.setItem(BE_KEY, JSON.stringify({ ...s, ...patch })); } catch (_) {}
}
export function beFixedMonth() { const p = beParams(); return p.rent + p.labor + p.util + p.other; }
export function breakevenDaily() {
  const p = beParams();
  const v = Math.min(95, Math.max(0, p.varPct)) / 100;
  return Math.round((beFixedMonth() / Math.max(1, p.days)) / (1 - v));
}
export const SALES_CUM = (() => {
  let acc = 0; const out = [];
  for (let d = 1; d <= TODAY.d; d++) { acc += (MONEY.days[d] ? MONEY.days[d].in : 0); out.push({ d, v: acc }); }
  return out;
})();
export const DAILY_INEX = (() => {
  const out = [];
  for (let d = 1; d <= TODAY.d; d++) { const m = MONEY.days[d] || { in: 0, ex: 0 }; out.push({ d, in: m.in, ex: m.ex || Math.round(m.in * COST_MODEL.varRatio + fixedMonthTotal / 30) }); }
  return out;
})();
export const STOCK_DAYS = () => stockRows().map((s) => {
  const inf = stockOf(s.id);
  const cur = inf.days;
  return { id: s.id, avg: cur, min: Math.max(0.2, Math.round(cur * 0.7 * 10) / 10), max: Math.round(cur * 1.45 * 10) / 10 };
}).sort((a, b) => a.avg - b.avg);

export const invGroupOf = (catId, groups) => (groups.find((g) => g.cats.includes(catId)) || groups[0]).id;

/* ====================================================================
   ภาษี (พอร์ตตรงจาก prototype) — บุคคลขั้นบันได (pit) · นิติบุคคล SME (cit)
   คืน { tax, parts:[{rate, base, amt}] }
==================================================================== */
const PIT_BRACKETS = [[150000, 0], [150000, .05], [200000, .10], [250000, .15], [250000, .20], [1000000, .25], [3000000, .30], [Infinity, .35]];
export const pit = (taxable) => {
  let rest = Math.max(0, taxable), tax = 0; const parts = [];
  for (const [cap, rate] of PIT_BRACKETS) { const a = Math.min(rest, cap); if (a > 0 && rate > 0) { tax += a * rate; parts.push({ rate, base: a, amt: a * rate }); } rest -= a; if (rest <= 0) break; }
  return { tax, parts };
};
/* นิติบุคคล SME — 0-3แสน ยกเว้น · 3แสน-3ล้าน 15% · เกิน 20% */
export const cit = (profit) => {
  const p = Math.max(0, profit); const parts = []; let tax = 0;
  if (p > 300000) { const a = Math.min(p - 300000, 2700000); tax += a * .15; parts.push({ rate: .15, base: a, amt: a * .15 }); }
  if (p > 3000000) { const a = p - 3000000; tax += a * .20; parts.push({ rate: .20, base: a, amt: a * .20 }); }
  return { tax, parts };
};
