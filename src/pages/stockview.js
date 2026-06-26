// ============================================================
// pages/stockview.js — การ์ดแสดงผลในหน้ารายงาน (อ่านข้อมูลจริงล้วน)
//   stockNowScreen  — สินค้าคงเหลือปัจจุบัน: เหลือเท่าไหร่ · อยู่ได้กี่วัน · FIFO กี่ล็อต · ล็อตค้างกี่วัน
//   recvReportScreen — รายงานการรับของ: รับอะไรมาบ้าง ปริมาณเท่าไหร่ · เลือกวัน/เดือนย้อนหลังในปฏิทินได้
// ctx = { go, back, role, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag, itemIc, emptyState, dateBarFull, searchBox, seg, sectionTabs } from "../components/components.js";
import { fmt, itemById, unitOf, stockOf, sectionsFor, fmtQty, coverDays, matchCat } from "../utils/formulas.js";
import { cats, items as allItems, countsRows } from "../data/store.js";
import { TODAY } from "../data/seed.js";
import { recDate, thaiShort, monthLabel, parseIso, todayIso } from "../utils/dateutil.js";

const bold = (t) => h("b", null, t);

// อายุล็อต (ค้างกี่วัน) — คิดสดจากเลขวันของล็อต (lot.lot หรือ parse จากป้ายวัน "23 มิ.ย.") เทียบวันนี้
function lotAge(lot) {
  let day = (lot && lot.lot != null) ? lot.lot : null;
  if (day == null && lot && lot.d) { const m = /(\d+)/.exec(lot.d); if (m) day = Number(m[1]); }
  if (day != null) { const diff = TODAY.d - day; if (diff >= 0) return diff; }
  return (lot && lot.age) || 0;
}

/* ====================================================================
   สินค้าคงเหลือปัจจุบัน
==================================================================== */
/* ====================================================================
   รายงานสต๊อก — แท็บ "สินค้าคงเหลือ" + "ของทิ้ง" (แยกหมวด · เลือกวัน/เดือนย้อนหลัง)
==================================================================== */
const snSt = { tab: "stock", cat: "all", iso: null, wmode: "day", ctx: null };

export function stockNowScreen(ctx) {
  snSt.ctx = ctx;
  snSt.tab = "stock"; snSt.cat = "all"; snSt.wmode = "day";
  snSt.iso = todayIso();
  const root = h("div", { class: "page-wrap", "data-screen-label": "stocknow" });
  paintStockNow(root);
  return root;
}

// คงเหลือ ณ วันที่ → วันนี้ = สด · ย้อนหลัง = ยอดนับปิดล่าสุด (≤ วันที่เลือก)
function stockAsOf(iso, itemId) {
  if (iso === todayIso()) return stockOf(itemId).qty;
  let best = null, bestD = "";
  for (const r of countsRows()) { const d = recDate(r); if (r.item === itemId && r.qty != null && d <= iso && d > bestD) { best = r; bestD = d; } }
  return best ? best.qty : null;
}
// รวมของทิ้งตามช่วง (วัน/เดือน) → map itemId → qty
function wasteMap(iso, mode) {
  const { y, m } = parseIso(iso);
  const map = {};
  for (const r of countsRows()) {
    const w = Number(r.waste) || 0; if (w <= 0) continue;
    const d = recDate(r); const p = parseIso(d);
    const inRange = mode === "month" ? (p.y === y && p.m === m) : d === iso;
    if (inRange) map[r.item] = (map[r.item] || 0) + w;
  }
  return map;
}

// การ์ดสินค้าคงเหลือ (วันนี้ = โชว์ FIFO + อยู่ได้กี่วัน · ย้อนหลัง = ยอดที่นับ ณ วันนั้น)
function itemStockCard(it, qty, { live } = {}) {
  const u = unitOf(it);
  const inf = stockOf(it.id);
  const lots = live ? (inf.lots || []).filter((l) => (l.qty || 0) > 0) : [];
  const cov = live ? coverDays(it.id) : null;
  const dayTag = (cov && cov.days != null)
    ? tag("ขายได้อีก ~" + (cov.over ? "30+" : cov.days) + " วัน", { kind: cov.raw < 2 ? "dgr" : cov.raw < 4 ? "warn" : "ok", iconName: "cal" })
    : null;

  return h("div", { class: "card", style: { padding: "11px 14px" } },
    h("div", { class: "rowflex", style: { gap: "10px" } },
      itemIc(it, { sm: false }),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { style: { fontWeight: 700, fontSize: "14px" } }, it.name),
        h("div", { class: "rowflex", style: { gap: "6px", marginTop: "2px", flexWrap: "wrap" } },
          live ? h("span", { class: "tnum", style: { fontSize: "12px", color: "var(--muted)" } }, "FIFO " + lots.length + " ล็อต") : null,
          dayTag,
        ),
      ),
      h("div", { style: { textAlign: "right", flex: "none" } },
        h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "17px", color: qty > 0 ? "var(--primary-dark)" : "var(--faint)" } }, fmtQty(qty, u)),
        h("div", { style: { fontSize: "10.5px", color: "var(--muted)" } }, u),
      ),
    ),
    lots.length
      ? h("div", { style: { marginTop: "9px", borderTop: "1px solid var(--border-soft)", paddingTop: "7px" } },
          lots.map((l, i) => {
            const age = lotAge(l);
            return h("div", { class: "rowflex", style: { gap: "8px", padding: "3px 0", fontSize: "12px" } },
              h("span", { class: "tnum", style: { width: "20px", color: "var(--faint)", flex: "none" } }, "#" + (i + 1)),
              h("span", { style: { flex: 1, color: "var(--muted)" } }, "รับ " + (l.d || "—")),
              h("span", { class: "tnum", style: { fontWeight: 700, width: "70px", textAlign: "right" } }, fmtQty(l.qty, u) + " " + u),
              h("span", { style: { width: "78px", textAlign: "right", flex: "none", fontSize: "11px", color: age >= 3 ? "var(--warning-ink)" : "var(--faint)", fontWeight: 600 } }, "ค้าง " + age + " วัน"),
            );
          }),
        )
      : null,
  );
}

function paintStockNow(root) {
  const { back, role } = snSt.ctx;
  const owner = role === "owner";
  const iso = snSt.iso;
  const isToday = iso === todayIso();

  const tabSeg = seg({ value: snSt.tab, grow: true, options: [
    { v: "stock", t: "สินค้าคงเหลือ", ic: "box" },
    { v: "waste", t: "ของทิ้ง", ic: "trash" },
  ], onChange: (v) => { snSt.tab = v; paintStockNow(root); } });
  const catEl = sectionTabs({ cats: cats(), value: snSt.cat, allLabel: "ทั้งหมด", onChange: (v) => { snSt.cat = v; paintStockNow(root); } });
  const dateEl = dateBarFull({ iso, onChange: (v) => { snSt.iso = v; paintStockNow(root); } });

  const inCat = (it) => matchCat(it, snSt.cat);
  const list = (allItems() || []).filter((it) => it.isActive !== false && inCat(it));

  let body;
  if (snSt.tab === "stock") {
    const rows = []; let shown = 0, totalVal = 0;
    list.forEach((it) => {
      const qty = isToday ? stockOf(it.id).qty : stockAsOf(iso, it.id);
      if (qty == null || qty <= 0) return;
      rows.push(itemStockCard(it, qty, { live: isToday }));
      shown++; totalVal += qty * (it.cost || 0);
    });
    body = [
      h("div", { class: "card soft-card soft-blue split" },
        h("div", null, h("div", { class: "overline", style: { color: "#1D4ED8" } }, isToday ? "มูลค่าคงเหลือรวม (× ต้นทุน)" : "มูลค่าคงเหลือ ณ วันนั้น"), h("div", { class: "big-num tnum", style: { fontSize: "23px", color: "#1D4ED8" } }, "฿" + fmt(Math.round(totalVal)))),
        h("div", { style: { textAlign: "right" } }, h("div", { class: "overline" }, "รายการมีของ"), h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "18px" } }, String(shown))),
      ),
      note([bold(isToday ? "คงเหลือปัจจุบัน (สด)" : "คงเหลือ ณ สิ้นวันที่ " + thaiShort(iso)), " · ", bold("FIFO เข้าก่อน-ออกก่อน"), " — เลขใหญ่ = คงเหลือรวม · เลือกวัน/เดือนด้านบนเพื่อดูย้อนหลัง"], { iconName: "box" }),
      shown ? h("div", { class: "stack" }, rows)
        : emptyState({ iconName: "box", title: isToday ? "ยังไม่มีสินค้าคงเหลือ" : "ไม่มีคงเหลือบันทึกของวันนี้", sub: isToday ? 'บันทึกที่ "รับของ" แล้วคงเหลือจะขึ้นที่นี่' : "ลองเลือกวันอื่น หรือวันที่มีการนับ" }),
    ];
  } else {
    const wmodeSeg = seg({ value: snSt.wmode, grow: true, options: [{ v: "day", t: "รายวัน" }, { v: "month", t: "ทั้งเดือน" }], onChange: (v) => { snSt.wmode = v; paintStockNow(root); } });
    const wmap = wasteMap(iso, snSt.wmode);
    const rows = []; let cnt = 0, totVal = 0;
    list.forEach((it) => {
      const q = wmap[it.id]; if (!q) return;
      const u = unitOf(it); const val = q * (it.cost || 0);
      cnt++; totVal += val;
      rows.push(h("div", { class: "rowflex", style: { gap: "10px", padding: "11px 0", borderTop: "1px solid var(--border-soft)" } },
        itemIc(it, { sm: false }),
        h("div", { style: { flex: 1, minWidth: 0 } }, h("div", { style: { fontWeight: 700, fontSize: "13.5px" } }, it.name), owner ? h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, "มูลค่า ฿" + fmt(Math.round(val))) : null),
        h("div", { style: { textAlign: "right", flex: "none" } }, h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "16px", color: "var(--danger)" } }, fmtQty(q, u)), h("div", { style: { fontSize: "10.5px", color: "var(--muted)" } }, u)),
      ));
    });
    const periodLabel = snSt.wmode === "month" ? monthLabel(parseIso(iso).y, parseIso(iso).m) : (thaiShort(iso) + " " + (parseIso(iso).y + 543));
    body = [
      wmodeSeg,
      h("div", { class: "card", style: { background: "var(--tint-rose)", borderColor: "#FECDD3" } },
        h("div", { class: "split" },
          h("div", null, h("div", { class: "overline", style: { color: "var(--danger-ink)" } }, "ของทิ้ง · " + periodLabel), h("div", { class: "big-num tnum", style: { fontSize: "22px", color: "var(--danger)" } }, cnt + " รายการ")),
          owner ? h("div", { style: { textAlign: "right" } }, h("div", { class: "overline" }, "มูลค่าที่เสียไป"), h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "17px", color: "var(--danger)" } }, "฿" + fmt(Math.round(totVal)))) : null,
        ),
      ),
      note([bold("ของทิ้ง/ของเสีย"), " บันทึกจาก “ตรวจนับ → ทิ้ง” · เลือก ", bold("รายวัน/ทั้งเดือน"), " และวัน/เดือนด้านบนเพื่อดูย้อนหลังทุกช่วง"], { iconName: "trash" }),
      cnt ? h("div", { class: "card", style: { padding: "4px 16px" } }, rows)
        : emptyState({ iconName: "trash", title: "ไม่มีของทิ้งในช่วงนี้ 🎉", sub: "ลองเลือกวัน/เดือนอื่น หรือสลับรายวัน/ทั้งเดือน" }),
    ];
  }

  root.replaceChildren(
    hdr({ title: "รายงานสต๊อก", sub: "สินค้าคงเหลือ · ของทิ้ง · ดูย้อนหลังได้", onBack: back, right: h("span", { class: "catic blue" }, pi("box", 18)) }),
    h("div", { class: "page stack" },
      tabSeg,
      dateEl,
      catEl,
      ...body,
    ),
  );
}

/* ====================================================================
   รายงานการรับของ (ย้อนหลัง · เลือกวัน/เดือนในปฏิทิน)
==================================================================== */
const rrSt = { iso: null, cat: "all", ctx: null };

// รวมรายการรับของของวันนั้น (จาก ledger rama9_stock_counts · recv > 0)
function recvOfDate(iso) {
  const rows = countsRows().filter((r) => recDate(r) === iso && (r.recv || 0) > 0);
  if (!rows.length) return null;
  const lines = rows.map((r) => { const it = itemById(r.item) || {}; const cost = it.cost || 0; return { id: r.item, name: it.name || r.item, qty: r.recv, unit: it.unit || (it.id ? unitOf(it) : ""), cost, sub: Math.round(r.recv * cost) }; })
    .sort((a, b) => b.sub - a.sub);
  const total = lines.reduce((s, l) => s + l.sub, 0);
  return { iso, count: lines.length, lines, total };
}
function recvDates() {
  return [...new Set(countsRows().filter((r) => (r.recv || 0) > 0).map((r) => recDate(r)))].sort();
}

export function recvReportScreen(ctx) {
  rrSt.ctx = ctx;
  rrSt.cat = "all";
  const ds = recvDates();
  rrSt.iso = ds.length ? ds[ds.length - 1] : todayIso(); // เริ่มที่รอบรับล่าสุด
  const root = h("div", { class: "page-wrap", "data-screen-label": "recvreport" });
  paintRecv(root);
  return root;
}

function paintRecv(root) {
  const { back, role } = rrSt.ctx;
  const iso = rrSt.iso;
  const c = recvOfDate(iso);
  const dates = recvDates();
  const owner = role === "owner";
  const lines = c ? c.lines.filter((l) => matchCat(itemById(l.id), rrSt.cat)) : [];
  const catEl = c ? sectionTabs({ cats: cats(), value: rrSt.cat, allLabel: "ทั้งหมด", onChange: (v) => { rrSt.cat = v; paintRecv(root); } }) : null;

  const detail = c
    ? (lines.length ? h("div", { class: "card", style: { padding: "4px 14px 10px" } },
        h("table", { style: { width: "100%", borderCollapse: "collapse" } },
          h("thead", null, h("tr", { style: { color: "var(--muted)", fontSize: "10.5px" } },
            h("th", { style: { textAlign: "left", padding: "8px 0", fontWeight: 600 } }, "รายการที่รับ"),
            h("th", { style: { textAlign: "right", padding: "8px 0", fontWeight: 600 } }, "ปริมาณ"),
            owner ? h("th", { style: { textAlign: "right", padding: "8px 0", fontWeight: 600 } }, "มูลค่า") : null,
          )),
          h("tbody", null, lines.map((l) => {
            const it = itemById(l.id);
            return h("tr", { style: { borderTop: "1px solid var(--border-soft)" } },
              h("td", { style: { padding: "8px 0" } }, h("span", { class: "rowflex", style: { gap: "7px" } }, itemIc(it), h("span", { style: { fontSize: "12.5px" } }, l.name))),
              h("td", { class: "tnum", style: { textAlign: "right", padding: "8px 0", fontWeight: 700 } }, fmt(l.qty) + " ", h("span", { style: { color: "var(--faint)", fontSize: "10.5px" } }, l.unit)),
              owner ? h("td", { class: "tnum", style: { textAlign: "right", padding: "8px 0", color: "var(--muted)", fontSize: "12px" } }, "฿" + fmt(l.sub)) : null,
            );
          })),
        ),
      ) : emptyState({ compact: true, iconName: "search", title: "ไม่มีรายการในหมวดนี้", sub: "ลองเลือกหมวดอื่นด้านบน" }))
    : emptyState({ compact: true, iconName: "truck", title: "ไม่มีการรับของวันนี้", sub: "เลือกวันอื่นจากปฏิทินด้านบน หรือดูรอบที่มีของด้านล่าง" });

  // รายการรอบรับของทั้งหมด (กดเพื่อกระโดดไปวันนั้น)
  const jumpList = dates.length
    ? [...dates].reverse().map((d) => {
        const cc = recvOfDate(d);
        return h("button", { type: "button", class: "rowflex list-press", style: { width: "100%", border: 0, background: d === iso ? "var(--primary-tint)" : "transparent", textAlign: "left", padding: "11px 8px", borderRadius: "10px" }, onClick: () => { rrSt.iso = d; paintRecv(root); } },
          h("span", { class: "catic amber sm" }, pi("truck", 15)),
          h("span", { style: { flex: 1, minWidth: 0 } },
            h("span", { style: { display: "block", fontWeight: 700, fontSize: "13.5px" } }, thaiShort(d) + " " + (parseIso(d).y + 543)),
            h("span", { class: "tnum", style: { display: "block", fontSize: "11.5px", color: "var(--muted)" } }, cc.count + " รายการ"),
          ),
          owner ? h("span", { class: "tnum", style: { fontWeight: 700, fontSize: "13px", color: "var(--warning-ink)" } }, "฿" + fmt(cc.total)) : null,
          (() => { const x = pi("chev", 15); x.style.color = "var(--faint)"; return x; })(),
        );
      })
    : [emptyState({ compact: true, iconName: "truck", title: "ยังไม่มีการรับของ", sub: 'บันทึกที่ "รับของ" หน้าแรก' })];

  root.replaceChildren(
    hdr({ title: "รายงานการรับของ", sub: "รับอะไรมาบ้าง · ปริมาณ · ดูย้อนหลังได้ทุกเดือน", onBack: back, right: h("span", { class: "catic amber" }, pi("truck", 18)) }),
    h("div", { class: "page stack" },
      note([bold("เลือกวัน/เดือนในปฏิทิน"), " เพื่อดูว่ารับอะไรเข้ามาบ้างในวันนั้น — แตะไอคอนปฏิทินเพื่อกระโดดไปเดือนไหนก็ได้"], { iconName: "truck" }),
      dateBarFull({ iso, onChange: (v) => { rrSt.iso = v; paintRecv(root); } }),
      h("div", { class: "split" },
        h("span", { class: "overline" }, "รับของวันที่ " + thaiShort(iso) + " " + (parseIso(iso).y + 543)),
        c ? tag(c.count + " รายการ", { kind: "ok", iconName: "check" }) : tag("ไม่มี", { kind: "warn" }),
      ),
      catEl,
      detail,
      h("div", { class: "overline", style: { marginTop: "4px" } }, "รอบรับของทั้งหมด (" + dates.length + " รอบ)"),
      h("div", { class: "card", style: { padding: "4px 8px" } }, ...jumpList),
    ),
  );
}
