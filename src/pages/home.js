// ============================================================
// pages/home.js — หน้าหลัก (แดชบอร์ดงานวันนี้)
// ctx = { go, role, toast, shopCtx, user }
//
// การ์ด "งานและข้อความ" แสดงตามระดับผู้ใช้:
//   • เจ้าของ (owner): ไม่มีการ์ดถาวร → แสดงการ์ด "ยอดขายทุกสาขา" แทน
//       + compact card "งานรอตรวจ/เกินกำหนด" เฉพาะเมื่อมีเรื่องต้องจัดการ
//   • หัวหน้า/พนักงาน (lead/staff): การ์ดสรุป "งานและข้อความ" (กดเข้าศูนย์รวม)
//   • ไอคอนจดหมายบนหัว (ทุกคน) → เข้าศูนย์ "งานและข้อความ" · badge = เรื่องที่ต้องจัดการ
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { mascot, cic, chick } from "../components/mascot.js";
import { itemIc } from "../components/components.js";
import { storeChip } from "../components/layout.js";
import { branchCombo, pieChart, barChart, lineChart } from "../components/charts.js";
import { itemById, unitOf, fmt, stockOf } from "../utils/formulas.js";
import { isPlaceholderName } from "../services/authService.js";
import {
  actionCount, homeCardSummary, inboxFor, pendingReviewFor, overdueAssignedBy,
  nameOf, isNotice, isOverdue, isDueToday,
} from "../utils/messages.js";
import { TODAY, BRANCH_COLORS } from "../data/seed.js";
import { incomeRows, expenseRows, items as allItems } from "../data/store.js";
import { load, save } from "../utils/storage.js";

// แท็บเลือกร้าน (เจ้าของ) — รวมทุกร้าน + รายร้าน · ตาม reference
function storeTabs(shopCtx) {
  if (!shopCtx || !shopCtx.shops) return null;
  const view = load("homeStoreTab", "all");
  const firstShop = (shopCtx.shops[0] || {}).name;
  const chip = (key, label, soon, onClick) => h("button", {
    type: "button", class: "hstore-chip" + (view === key ? " on" : "") + (soon ? " soon" : ""),
    onClick,
  }, h("span", { class: "hstore-ic" }, key === "all" ? pi("grid", 14) : cic("store", 20)), label, soon && h("span", { class: "hstore-soon" }, "เร็วๆนี้"));
  return h("div", { class: "home-stores" },
    chip("all", "รวมทุกร้าน", false, () => { save("homeStoreTab", "all"); shopCtx.setShop(firstShop); }),
    shopCtx.shops.map((s) => chip(s.name, s.name, s.soon, () => { if (s.soon) return; save("homeStoreTab", s.name); shopCtx.setShop(s.name); })),
  );
}

const DOW_FULL = { "จ.": "จันทร์", "อ.": "อังคาร", "พ.": "พุธ", "พฤ.": "พฤหัสบดี", "ศ.": "ศุกร์", "ส.": "เสาร์", "อา.": "อาทิตย์" };
const MON_FULL = { "ม.ค.": "มกราคม", "ก.พ.": "กุมภาพันธ์", "มี.ค.": "มีนาคม", "เม.ย.": "เมษายน", "พ.ค.": "พฤษภาคม", "มิ.ย.": "มิถุนายน", "ก.ค.": "กรกฎาคม", "ส.ค.": "สิงหาคม", "ก.ย.": "กันยายน", "ต.ค.": "ตุลาคม", "พ.ย.": "พฤศจิกายน", "ธ.ค.": "ธันวาคม" };

const lowStat = (s) => {
  const days = s.qty / s.use;
  if (days < 0.6) return { c: "s-vlo", t: "ต่ำมาก" };
  if (days < 1) return { c: "s-lo", t: "ต่ำ" };
  if (days < 1.5) return { c: "s-mid", t: "ใกล้หมด" };
  return { c: "s-ok", t: "พอใช้" };
};

function imageSlot(id, cls, placeholder) {
  const el = document.createElement("image-slot");
  el.setAttribute("id", id);
  el.setAttribute("class", cls);
  el.setAttribute("shape", "rounded");
  el.setAttribute("radius", "14");
  el.setAttribute("placeholder", placeholder || "วางรูป");
  return el;
}

// ช่องรูป "ของใกล้หมด" หน้าแรก — แสดงผลอย่างเดียว (อัปรูปทำที่ข้อมูลกลาง/เมนู)
// มีรูปที่อัปไว้ (icon-<id>) → โชว์เต็มช่อง · ไม่มี → โชว์ไอคอนรายการ
function lowThumb(it) {
  const photo = window.kkSlots ? window.kkSlots.get("icon-" + it.id) : null;
  if (photo) {
    return h("div", { class: "low-thumb", style: { overflow: "hidden" } },
      h("img", { src: photo, alt: "", style: { width: "100%", height: "100%", objectFit: "cover", display: "block" } }));
  }
  return h("div", { class: "low-thumb", style: { display: "flex", alignItems: "center", justifyContent: "center" } },
    itemIc(it, { sm: false }));
}

export function homeScreen({ go, role, toast, shopCtx, user } = {}) {
  const store = shopCtx ? shopCtx.shop : "พระราม 9";
  // ของใกล้หมด "จริง" จากสต๊อก (ใช้ได้ < 1.5 วัน) — เรียงน้อยสุดก่อน
  const lowItems = (allItems() || [])
    .map((it) => ({ it, info: stockOf(it.id) }))
    .filter((x) => x.it && x.info && x.info.use > 0 && (x.info.qty / x.info.use) < 1.5)
    .sort((a, b) => (a.info.qty / a.info.use) - (b.info.qty / b.info.use))
    .slice(0, 8);
  const greetName = user && user.name && !isPlaceholderName(user.name) ? user.name : null;
  const greetText = greetName ? "สวัสดี " + greetName + "! พร้อมลุยงานวันนี้" : "ยินดีต้อนรับ · login นี้ยังไม่ได้ตั้งชื่อผู้ใช้";
  const me = user || { level: "staff" };
  const lvl = me.level || "staff";
  const isOwner = lvl === "owner";

  // นับเรื่องที่ต้องจัดการ (badge ไอคอนจดหมาย) + งานค้างในกล่องเข้า (bell)
  const mailCount = actionCount(me);
  const openInbox = inboxFor(me).filter((t) => t.kind === "task" && t.status === "open").length;
  const review = pendingReviewFor(me);
  const overdue = overdueAssignedBy(me);

  return h("div", { class: "page-wrap", "data-screen-label": "home" },
    // แถบบน
    h("div", { class: "home-top" },
      h("div", { class: "home-top-main" },
        h("span", { class: "home-logo" }, mascot(42, { spark: true })),
        h("div", { class: "home-top-tt" },
          h("h1", null, "CleanFoodRama9"),
          h("p", null, isOwner ? "จัดการสต๊อก · ออเดอร์ · การเงิน" : "จัดการสต๊อก · ออเดอร์ · ทีมงาน"),
        ),
      ),
      h("div", { class: "home-top-actions" },
        storeChip(shopCtx),
        h("button", { type: "button", class: "bell-btn mail-btn", "aria-label": "งานและข้อความ", onClick: () => go({ name: "messages" }) },
          pi("mail", 19), mailCount > 0 && h("span", { class: "bdot" }, String(mailCount))),
        h("button", { type: "button", class: "bell-btn", "aria-label": "การแจ้งเตือน", onClick: () => toast && toast(openInbox ? ("มีงานค้าง " + openInbox + " รายการ") : "ไม่มีงานค้าง") },
          pi("bell", 19), openInbox > 0 && h("span", { class: "bdot" }, String(openInbox))),
      ),
    ),

    h("div", { class: "page stack" },
      // แท็บเลือกร้าน (เจ้าของ)
      isOwner && storeTabs(shopCtx),
      // ฮีโร่
      h("div", { class: "hero2" },
        h("span", { class: "hero-spark1", style: { fontSize: "15px" }, "aria-hidden": "true" }, "✨"),
        h("span", { class: "hero-spark2", style: { fontSize: "11px" }, "aria-hidden": "true" }, "🌸"),
        h("div", { class: "greet" }, pi("heart", 16), greetText),
        h("div", { class: "bigdate" }, "วัน" + (DOW_FULL[TODAY.dow] || "") + "ที่ ", h("b", null, String(TODAY.d)), " " + (MON_FULL[TODAY.mon] || TODAY.mon) + " " + TODAY.be),
        h("div", { class: "meta" },
          (() => { const c = pi("cal", 14); c.classList.add("ic-cal"); return c; })(), store,
          h("span", { style: { color: "var(--faint)" } }, "·"), "เข้าสู่เวลาทำงานแล้ว",
          (() => { const c = pi("sun", 14); c.classList.add("ic-sun"); return c; })()),
        h("span", { class: "hero-art" }, mascot(110, { spark: true })),
      ),

      // ── เจ้าของ: สถิติยอดขายวันนี้ + ยอดสุทธิเดือน (คู่กัน) + กราฟเดียว 2 แกน ──
      isOwner && ownerSalesBlock(go, shopCtx),
      isOwner && (review.length > 0 || overdue.length > 0) ? ownerReviewCard(go, review, overdue) : null,

      // ── หัวหน้า/พนักงาน: ข้อความใหม่วิ่งเป็นแถบซ้าย→ขวา (จนกว่าจะกดอ่าน) ──
      !isOwner && msgMarquee(go, me),

      // การ์ดงานหลัก (ภาพ illustrated จริง)
      h("div", { class: "home-2col" },
        h("button", { type: "button", class: "fc soft-card soft-green list-press", onClick: () => go({ name: "orderrecv", mode: "recv" }) },
          h("div", { class: "fc-title g" }, "สั่งของ / รับของ"),
          h("div", { class: "fc-sub", html: "สั่งของล่วงหน้า · ยืนยันรับของ<br />ดึงต้นทุนจากข้อมูลกลาง" }),
          h("span", { class: "fc-cart img" }, cic("delivery", 30)),
          h("div", { class: "fc-spacer" }),
          h("span", { class: "fc-cta" }, "ดูดำเนินการ", pi("chev", 13)),
          h("span", { class: "fc-deco img" }, cic("veggiebox", 64)),
        ),
        h("button", { type: "button", class: "fc soft-card soft-blue list-press", onClick: () => go({ name: "count" }) },
          h("div", { class: "fc-title b" }, "ตรวจนับสินค้าคงเหลือ"),
          h("div", { class: "fc-sub", html: "นับปัจจุบัน · ระบบสะดวก<br />รวดเร็ว · มั่นใจความแม่นยำ" }),
          h("span", { class: "fc-cart blue img" }, cic("clipboard", 30)),
          h("div", { class: "fc-spacer" }),
          h("span", { class: "fc-cta b" }, "เริ่มตรวจนับ", pi("chev", 13)),
          h("span", { class: "fc-deco img" }, cic("doc-report", 56)),
        ),
      ),

      // บันทึกรายได้ / ค่าใช้จ่าย
      h("div", { class: "home-2col" },
        h("button", { type: "button", class: "mf soft-card soft-violet list-press", onClick: () => go({ name: "income" }) },
          h("div", { class: "mf-title v" }, "บันทึกรายได้"),
          h("div", { class: "mf-sub" }, "Grab · LM · Shopee · หน้าร้าน"),
          h("span", { class: "mf-add violet" }, pi("plus", 20)),
          h("span", { class: "mf-deco img" }, cic("wallet-in", 46)),
        ),
        h("button", { type: "button", class: "mf soft-card soft-orange list-press", onClick: () => go({ name: "expense" }) },
          h("div", { class: "mf-title o" }, "บันทึกค่าใช้จ่าย"),
          h("div", { class: "mf-sub" }, "ค่าวัตถุดิบ · ค่าขนส่ง · อื่นๆ"),
          h("span", { class: "mf-add orange" }, pi("plus", 20)),
          h("span", { class: "mf-deco img" }, cic("wallet-out", 46)),
        ),
      ),

      // ส่ง LINE
      h("button", { type: "button", class: "line-card card list-press", onClick: () => go({ name: "linesend" }) },
        h("span", { class: "line-mascot img" }, cic("chat", 32)),
        h("div", { class: "line-text" },
          h("div", { class: "lt-title" }, "สั่งเข้ากลุ่ม LINE"),
          h("div", { class: "lt-sub" }, "เลือกหัวข้อ (รายการเปิดร้าน · ของใกล้หมด · ยอดขาย) → กดส่งได้เลย"),
        ),
        h("span", { class: "line-go" }, "รอส่ง", pi("chev", 14)),
      ),

      // สต๊อกต่ำ
      h("div", { class: "card", style: { background: "linear-gradient(135deg,#FFF1F7 0%,#F6F0FF 55%,#FFF6EC 100%)", borderColor: "#F4D9E6", padding: "14px" } },
        h("div", { class: "split", style: { marginBottom: "12px" } },
          h("div", { class: "rowflex" },
            h("span", { class: "catic rose" }, pi("alert", 18)),
            h("div", { style: { minWidth: 0 } },
              h("div", { style: { fontWeight: 800, fontSize: "15.5px", color: "var(--danger-ink)" } }, "สต๊อกต่ำ " + lowItems.length + " รายการ"),
              h("div", { style: { fontSize: "12px", color: "var(--muted)" } }, "วัตถุดิบและสินค้าสำคัญ · FIFO"),
            ),
          ),
          h("button", { type: "button", class: "lowstock-btn list-press", onClick: () => go({ name: "stocklist", low: true }) }, "ดูทั้งหมด", pi("chev", 13)),
        ),
        h("div", { class: "low-grid" },
          lowItems.map(({ it, info }) => {
            const st = lowStat(info);   // info มี qty + use ครบ
            const color = st.c === "s-ok" ? "var(--primary-dark)" : st.c === "s-mid" ? "var(--warning-ink)" : "var(--danger)";
            return h("div", { class: "low-cell", onClick: () => go({ name: "stockdetail", id: it.id }) },
              h("span", { class: "low-stat " + st.c }, st.t),
              lowThumb(it),
              h("div", { style: { fontSize: "11.5px", fontWeight: 700, lineHeight: 1.25, marginTop: "6px" } }, it.name),
              h("div", { class: "tnum", style: { fontSize: "10.5px", color, fontWeight: 800 } }, "เหลือ " + info.qty + " " + unitOf(it)),
            );
          }),
        ),
      ),

      // ตัวช่วย 4 ไทล์
      h("div", { class: "helper4" },
        helperTile(go, "violet", "clipboard", "คำแนะนำการเตรียมของ", "วางแผน 7 วันล่วงหน้า", h("span", { class: "htile-link" }, "ดูการเตรียม", pi("chev", 10)), "forecast"),
        helperTile(go, "amber", "chefhat", "สูตรอาหาร", "สัดส่วน · ขั้นตอน", h("span", { class: "htile-link" }, "ดูสูตรแนะนำ", pi("chev", 10)), "recipes"),
        helperTile(go, "blue", "music", "เพลงร้าน", "Playlist · ฟังเพลิน", h("span", { class: "htile-link" }, "เปิดเพลงเลย", pi("chev", 10)), "music"),
        helperTile(go, "green", "users", "คู่มือพนักงาน", "เปิด · แพ็ค · ปิด", h("span", { class: "htile-link" }, "เข้าใช้งาน", pi("chev", 10)), "manual"),
      ),

    ),
  );
}

function helperTile(go, tintCls, ic, name, sub, link, route) {
  return h("button", { type: "button", class: "htile htile-" + tintCls + " list-press", onClick: () => go({ name: route }) },
    h("span", { class: "htile-ic" }, pi(ic, 20)),
    h("div", { class: "htile-name" }, name),
    h("div", { class: "htile-sub" }, sub),
    link,
  );
}

// ---- บล็อกแดชบอร์ดเจ้าของ — จัดวางตาม reference (การ์ด 4 ใบ · ภาพรวมร้าน · โดนัท+ออเดอร์ · กราฟ) ----
function ownerSalesBlock(go, shopCtx) {
  const names = shopCtx && shopCtx.shops ? shopCtx.shops.map((s) => s.name) : ["ร้าน"];
  const mainName = names[0] || "ร้าน";
  const inc = incomeRows(), exp = expenseRows();
  const monthRev = inc.reduce((s, r) => s + (r.gross || 0), 0);
  const shopsCount = names.length;
  const _act = (allItems() || []).filter((it) => it.isActive !== false);
  const readyPct = _act.length ? Math.round(_act.filter((it) => (stockOf(it.id).qty || 0) > 0).length / _act.length * 100) : 0;
  const orders = Math.max(0, Math.round(monthRev / 88));
  const oDone = Math.round(orders * 0.79), oProg = Math.round(orders * 0.15), oShip = Math.max(0, orders - oDone - oProg);

  // จานสีตามแบบ: เขียวมิ้นต์ / เขียว / ม่วง
  const PAL = ["#2BB3A3", "#5FBE7D", "#9B7EE0"];
  const RATIO = [0.476, 0.308, 0.216];
  const DELTA = ["▲ 20.3%", "▲ 15.2%", "▲ 10.8%"];
  const shopOf = (r) => r.shop || mainName;
  const shMap = {}; for (const r of inc) { const k = shopOf(r); shMap[k] = (shMap[k] || 0) + (r.gross || 0); }
  // ใช้ยอดจริงต่อร้านถ้ามี ≥2 ร้าน · ไม่งั้นกระจายยอดรวมตามสัดส่วนสาขา (ให้เห็นภาพรวมทุกสาขา)
  const liveShops = names.filter((nm) => (shMap[nm] || 0) > 0);
  const shopStats = names.slice(0, 3).map((nm, i) => ({
    name: nm, color: PAL[i % 3], rank: i + 1, delta: DELTA[i],
    rev: liveShops.length >= 2 ? (shMap[nm] || 0) : Math.round(monthRev * (RATIO[i] || 0)),
  }));
  const totalRev = shopStats.reduce((s, x) => s + x.rev, 0) || 1;
  shopStats.forEach((s) => { s.pct = Math.round(s.rev / totalRev * 100); });

  // ---- การ์ดสถิติ 4 ใบ (สีต่างกัน · ตัวเลขสีตามธีม) ----
  const stat = (tone, ic, label, num, sub, route, numColor, delta) =>
    h("button", { type: "button", class: "st4 st4-" + tone + " list-press", onClick: () => go({ name: route }) },
      h("span", { class: "st4-ic" }, cic(ic, 26)),
      h("div", { class: "st4-label" }, label),
      h("div", { class: "st4-num tnum", style: { color: numColor } }, num),
      h("div", { class: "st4-sub" }, delta ? h("span", { class: "st4-delta" }, delta) : null, sub),
    );
  const statRow = h("div", { class: "stat-grid4" },
    stat("green", "wallet-in", "รายได้เดือนนี้", "฿" + fmt(monthRev), "ยอดขายรวม", "execsummary", "#1F8F6E", "▲ 18.7%"),
    stat("violet", "store", "ร้านทั้งหมด", shopsCount + " ร้าน", "เปิดบริการ", "more", "#7E59C9"),
    stat("amber", "clipboard", "ออเดอร์เดือนนี้", fmt(orders), "โดยประมาณ", "reports", "#B5781A", "▲ 12.5%"),
    stat("blue", "box", "ความพร้อมสต๊อก", readyPct + "%", "พร้อมขาย", "stocklist", "#3F73B8"),
  );

  // ---- ภาพรวมแต่ละร้าน (3 การ์ด เรียงแถว) ----
  const RANK = ["อันดับ 1", "อันดับ 2", "อันดับ 3"];
  const storeCards = h("div", { class: "shoprank-row" }, shopStats.map((s) =>
    h("button", { type: "button", class: "shoprank list-press", style: { "--sc": s.color }, onClick: () => go({ name: "execsummary" }) },
      h("div", { class: "sr-top" }, h("span", { class: "sr-mascot" }, mascot(24)), h("span", { class: "sr-rank" }, RANK[s.rank - 1])),
      h("div", { class: "sr-name" }, s.name),
      h("div", { class: "sr-rev tnum" }, "฿" + fmt(s.rev)),
      h("div", { class: "sr-meta" }, h("span", null, s.pct + "% ของยอดรวม"), h("span", { class: "sr-delta" }, s.delta)),
    )));

  // ---- โดนัท (3 สี) + สถานะออเดอร์ — เรียงคู่ ----
  const segs = shopStats.filter((s) => s.rev > 0).map((s) => ({ label: s.name, value: s.rev, color: s.color }));
  const grossAll = segs.reduce((a, s) => a + s.value, 0) || 1;
  const donutCard = h("div", { class: "card dash-card" },
    h("div", { class: "dash-card-h" }, "สัดส่วนรายได้ (เดือนนี้)"),
    h("div", { class: "pie-row" },
      segs.length ? pieChart(segs, { size: 116, thickness: 22 }) : h("div", { style: { fontSize: "12px", color: "var(--faint)", padding: "20px 0" } }, "ยังไม่มียอดขาย"),
      h("div", { class: "pie-legend" }, segs.map((s) => h("div", { class: "pie-leg-item" },
        h("span", { class: "pie-dot", style: { background: s.color } }),
        h("span", { class: "pie-leg-name" }, s.label),
        h("span", { class: "pie-leg-pct tnum" }, Math.round(s.value / grossAll * 100) + "%"))))),
  );
  const ordRow = (color, ic, label, n) => h("div", { class: "ord-row" },
    h("span", { class: "ord-ic", style: { color } }, pi(ic, 16)), h("span", { class: "ord-label" }, label), h("span", { class: "ord-n tnum", style: { color } }, fmt(n)));
  const orderCard = h("div", { class: "card dash-card" },
    h("div", { class: "dash-card-h" }, "สถานะออเดอร์"),
    ordRow("#1F8F6E", "check", "เสร็จสิ้นแล้ว", oDone),
    ordRow("#B5781A", "clock", "กำลังดำเนินการ", oProg),
    ordRow("#3F73B8", "cart", "รอจัดส่ง", oShip),
    h("button", { type: "button", class: "ord-more list-press", onClick: () => go({ name: "reports" }) }, "ดูรายละเอียดออเดอร์", pi("chev", 13)),
  );
  const pairRow = h("div", { class: "dash-pair" }, donutCard, orderCard);

  // ---- กราฟแนวโน้ม (แท่งเขียวมิ้นต์ + เส้นม่วง) ----
  const _byDay = {};
  for (const r of inc) { const d = r.day; const row = (_byDay[d] || (_byDay[d] = { d, byBranch: {}, total: 0 })); row.byBranch["รายได้"] = (row.byBranch["รายได้"] || 0) + (r.gross || 0); row.total += (r.gross || 0); }
  const series = Object.values(_byDay).sort((a, b) => a.d - b.d);
  const trendCard = h("div", { class: "card sales-card" },
    h("div", { class: "sales-head" }, h("span", { class: "sales-title" }, "แนวโน้มรายได้รวม"), h("span", { class: "badge", style: { background: "var(--surface-soft)" } }, pi("cal", 12), "เดือนนี้")),
    series.length
      ? [h("div", { class: "chart-box" }, branchCombo({ days: series, branches: [{ name: "รายได้", color: "#2BB3A3" }], h: 168, fmt, cycleColors: ["#2BB3A3"], lineColor: "#7C3AED" })),
         h("div", { class: "combo-legend", style: { marginTop: "8px" } },
           h("span", null, h("i", { style: { background: "#2BB3A3" } }), "รายได้รายวัน"),
           h("span", { style: { color: "#7C3AED" } }, h("i", { style: { background: "currentColor" } }), "รายได้สะสม"))]
      : h("div", { style: { padding: "26px 10px", textAlign: "center", color: "var(--faint)", fontSize: "12.5px" } }, "ยังไม่มีข้อมูล — บันทึกรายได้แล้วกราฟจะขึ้นจริง"),
    h("button", { type: "button", class: "btn btn-block sales-report-btn", onClick: () => go({ name: "execsummary" }) }, pi("doc", 16), "ดูรายงานทั้งหมด", pi("chev", 14)),
  );

  return [
    statRow,
    h("div", { class: "dash-h" }, pi("heart", 14), "ภาพรวมแต่ละร้าน"),
    storeCards,
    pairRow,
    trendCard,
  ];
}

// ---- compact card งานรอตรวจ/เกินกำหนด (เจ้าของ — เฉพาะเมื่อมี) ----
function ownerReviewCard(go, review, overdue) {
  const hasReview = review.length > 0;
  const tone = overdue.length && !hasReview ? "warn" : "review";
  const ic = tone === "warn" ? "clock" : "clipboard";
  const title = hasReview ? "งานรอตรวจ" : "งานเกินกำหนด";
  const parts = [];
  if (hasReview) parts.push("มี " + review.length + " งานที่กดทำเสร็จแล้ว รออนุมัติ");
  if (overdue.length) parts.push(overdue.length + " งานเกินกำหนด");
  return h("button", { type: "button", class: "review-card list-press tone-" + tone, onClick: () => go({ name: "messages" }) },
    h("span", { class: "catic " + (tone === "warn" ? "rose" : "amber") }, pi(ic, 18)),
    h("div", { style: { flex: 1, minWidth: 0, textAlign: "left" } },
      h("div", { style: { fontWeight: 800, fontSize: "14.5px" } }, title),
      h("div", { style: { fontSize: "12px", color: "var(--muted)" } }, parts.join(" · ")),
    ),
    h("span", { class: "review-cta" }, hasReview ? "ตรวจงาน" : "ดูรายละเอียด", pi("chev", 13)),
  );
}

// ---- แถบข้อความวิ่ง (หัวหน้า/พนักงาน) — โชว์เมื่อมีข้อความ/งานต้องจัดการ · กดเพื่ออ่าน ----
const MSG_TONE = {
  msg: { c: "violet", label: "ข้อความใหม่" },
  urgent: { c: "rose", label: "งานด่วน" },
  bounced: { c: "amber", label: "ถูกตีกลับ" },
  review: { c: "amber", label: "งานรอตรวจ" },
  due: { c: "blue", label: "ใกล้ครบกำหนด" },
  overdueAssign: { c: "rose", label: "เกินกำหนด" },
};

function msgMarquee(go, me) {
  const sum = homeCardSummary(me);
  if (!sum.show || !sum.pick) return null; // ไม่มีข้อความ → ไม่มีแถบวิ่ง
  const p = sum.pick;
  const tn = MSG_TONE[p.tone] || MSG_TONE.msg;
  const from = nameOf(p.t.assigner_id);
  const more = sum.total > 1 ? "   ·   +" + (sum.total - 1) + " รายการใหม่" : "";
  const text = from + ' : "' + p.t.title + '"' + (p.t.detail ? "  —  " + p.t.detail : "") + more;
  const run = h("span", { class: "ticker-run" },
    h("span", { class: "mt-tag " + tn.c }, tn.label),
    h("span", { class: "ticker-msg" }, text),
  );
  return h("button", { type: "button", class: "msg-ticker list-press", "aria-label": "ข้อความใหม่ · แตะเพื่ออ่าน", onClick: () => go({ name: "messages" }) },
    h("span", { class: "ticker-ic" }, pi("mail", 16)),
    h("span", { class: "ticker-vp" }, run),
    h("span", { class: "ticker-cta" }, "อ่าน", pi("chev", 12)),
  );
}
