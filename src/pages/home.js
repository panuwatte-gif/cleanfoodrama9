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
import { branchCombo, pieChart, barChart, lineChart, revenueYtdCombo } from "../components/charts.js";
import { itemById, unitOf, fmt, fmtQty, stockOf, fc7, breakevenDaily } from "../utils/formulas.js";
import { isPlaceholderName } from "../services/authService.js";
import { menuThumb } from "../data/menuImages.js";
import {
  actionCount, homeCardSummary, inboxFor, pendingReviewFor, overdueAssignedBy,
  nameOf, isNotice, isOverdue, isDueToday,
} from "../utils/messages.js";
import { TODAY, BRANCH_COLORS } from "../data/seed.js";
import { incomeRows, expenseRows, items as allItems } from "../data/store.js";
import { load, save } from "../utils/storage.js";
import { PEAK_DAILY } from "../data/peakhours.js";
import { GRAB_DAILY, grabMonth, menuShare } from "../data/grabData.js";
import { menuDaily as gMenuDaily, menuItems as gMenuItems } from "../data/grabStore.js";
import { breakevenScenarios, breakevenNetSalesPerDay, prepTable, segments, DOW_TH } from "../services/grabReportService.js";

const MONTH_ABBR = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const WD_FULL = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"];
const wdIdx = (iso) => { const [y, m, d] = iso.split("-").map(Number); return (new Date(y, m - 1, d).getDay() + 6) % 7; };

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
    shopCtx.shops.map((s) => chip(s.name, s.name, false, () => { save("homeStoreTab", s.name); shopCtx.setShop(s.name); })),
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

      // ── พนักงาน: คาดว่าจะขายวันนี้ + ช่วงขายดี/เมนูขายดี (เอาไว้เตรียมของ) ──
      !isOwner && h("div", { class: "dash-h" }, pi("trend", 14), "คาดว่าจะขายวันนี้ (ต่อเมนู)"),
      !isOwner && dailyMenuForecastCard(go),
      !isOwner && h("div", { class: "dash-h" }, pi("clock", 14), "ช่วงขายดี · วันขายดี · เมนูขายดี"),
      !isOwner && salesInsightBlock(go, shopCtx),
      !isOwner && h("div", { class: "dash-h" }, pi("clipboard", 14), "เตรียมวัตถุดิบสัปดาห์นี้ (จ.–อา.)"),
      !isOwner && dashboardPrepCard(shopCtx),
      !isOwner && h("button", { type: "button", class: "orderplan-cta alt", onClick: () => go({ name: "grabreports" }) },
        cic("doc-report", 30),
        h("div", { style: { flex: 1, textAlign: "left" } },
          h("div", { style: { fontWeight: 800, fontSize: "14px" } }, "ดูรายงานขายเต็ม (ชั่วโมง · วัน · เมนู)"),
          h("div", { style: { fontSize: "11.5px", opacity: .85 } }, "ช่วงพีค · วันขายดี · ตารางเตรียมวัตถุดิบ")),
        pi("chev", 18)),

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
  const _act = (allItems() || []).filter((it) => it.isActive !== false);
  const readyPct = _act.length ? Math.round(_act.filter((it) => (stockOf(it.id).qty || 0) > 0).length / _act.length * 100) : 0;

  // ---- ข้อมูลจริงจาก Grab (เดือนล่าสุดที่มีข้อมูล) ----
  const latest = GRAB_DAILY.length ? GRAB_DAILY[GRAB_DAILY.length - 1].d : null;
  const ym = latest ? latest.slice(0, 7) : "";
  const md = grabMonth(ym);
  const mNet = md.reduce((s, x) => s + x.n, 0);
  const mGross = md.reduce((s, x) => s + x.g, 0);
  const mOrders = md.reduce((s, x) => s + x.o, 0);
  const mAds = md.reduce((s, x) => s + x.a, 0);
  const mLabel = ym ? ("เดือน " + MONTH_ABBR[+ym.slice(5, 7) - 1]) : "—";

  // ---- การ์ดสถิติ 4 ใบ (ข้อมูลจริง · ไม่มีเดโม) ----
  const stat = (tone, ic, label, num, sub, route, numColor) =>
    h("button", { type: "button", class: "st4 st4-" + tone + " list-press", onClick: () => go({ name: route }) },
      h("span", { class: "st4-ic" }, cic(ic, 26)),
      h("div", { class: "st4-label" }, label),
      h("div", { class: "st4-num tnum", style: { color: numColor } }, num),
      h("div", { class: "st4-sub" }, sub),
    );
  const statRow = h("div", { class: "stat-grid4" },
    stat("green", "wallet-in", "รายได้สุทธิ", mNet ? "฿" + fmt(mNet) : "—", mLabel, "salesanalytics", "#1F8F6E"),
    stat("amber", "clipboard", "ออเดอร์", mOrders ? fmt(mOrders) : "—", "Grab · " + mLabel, "salesanalytics", "#B5781A"),
    stat("violet", "wallet-out", "ค่าโฆษณา", mAds ? "฿" + fmt(mAds) : "—", "การตลาด", "salesanalytics", "#7E59C9"),
    stat("blue", "box", "พร้อมสต๊อก", readyPct + "%", "พร้อมขาย", "stocklist", "#3F73B8"),
  );

  // ---- คาดการณ์การขายแต่ละเมนู · วันนี้ (ข้อมูลพยากรณ์ชุดเดียวกับ "คำแนะนำการเตรียมของ") ----
  const fcMenuCard = dailyMenuForecastCard(go);

  // ---- โครงสร้างรายได้ "ตามร้าน" (เดือนนี้) — วงใหญ่ = ร้าน · ด้านใน % แพลตฟอร์มต่อร้าน ----
  // เพิ่มร้าน/แพลตฟอร์มใหม่ → ชาร์ตปรับเองอัตโนมัติ (อิงรายชื่อร้านจาก shopCtx)
  const STORE_COLORS = ["#5FBE7D", "#7FB5E3", "#B9A7E6", "#F2C46B", "#F0A8C4"];
  const platRev = names.map((nm, i) => ({
    store: nm, color: STORE_COLORS[i % STORE_COLORS.length],
    // ตอนนี้มีข้อมูลจริงเฉพาะ พระราม9×Grab — ร้าน/แพลตฟอร์มใหม่เข้าระบบเมื่อไหร่ เติมยอดที่นี่ผ่านชั้นข้อมูล
    platforms: i === 0 ? { "Grab": mNet, "LINE MAN": 0 } : { "Grab": 0, "LINE MAN": 0 },
  }));
  const storeSegs = platRev.map((s) => ({ label: s.store, value: Object.values(s.platforms).reduce((a, b) => a + b, 0), color: s.color }));
  const liveSegs = storeSegs.filter((s) => s.value > 0);
  const totalRev = storeSegs.reduce((a, s) => a + s.value, 0) || 1;
  // จำกัดความยาว: โชว์ไม่เกิน 4 ร้าน · ที่เหลือยุบเป็น "+N ร้านอื่น"
  const MAX_LEG = 4;
  const legRows = platRev.map((s) => {
    const tot = Object.values(s.platforms).reduce((a, b) => a + b, 0);
    return { name: s.store, color: s.color, pct: Math.round(tot / totalRev * 100) };
  });
  const shownLeg = legRows.slice(0, MAX_LEG), restLeg = legRows.slice(MAX_LEG);
  const restPct = restLeg.reduce((a, r) => a + r.pct, 0);
  const legItem = (dot, name, pct, muted) => h("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
    h("span", { class: "pie-dot", style: { background: dot, width: "8px", height: "8px", flex: "none" } }),
    h("span", { style: { flex: 1, minWidth: 0, fontSize: "11px", fontWeight: 700, color: muted ? "var(--muted)" : "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, name),
    h("span", { class: "pie-leg-pct tnum", style: { fontSize: "11px" } }, pct + "%"));
  const donutCard = h("div", { class: "card dash-card", style: { background: "linear-gradient(150deg,#FBF2FB 0%,#F1F0FE 100%)", borderColor: "#ECE0F3", padding: "13px 12px" } },
    h("div", { class: "dash-card-h", style: { fontSize: "12.5px", marginBottom: "10px" } }, "โครงสร้างรายได้"),
    liveSegs.length
      ? h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "11px" } },
          pieChart(liveSegs, { size: 82, thickness: 16 }),
          h("div", { style: { width: "100%", display: "flex", flexDirection: "column", gap: "6px" } },
            shownLeg.map((r) => legItem(r.color, r.name, r.pct, false)),
            restLeg.length ? legItem("#CBD3DE", "+" + restLeg.length + " ร้านอื่น", restPct, true) : null))
      : h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "7px", padding: "8px 0" } },
          chick(58, "happy"),
          h("div", { style: { fontSize: "11.5px", color: "var(--muted)", fontWeight: 600, textAlign: "center" } }, "ยังไม่มียอดขายเดือนนี้")),
  );
  // ---- รายได้แต่ละร้าน (YTD สะสมทั้งปี) — การ์ดครึ่งซ้าย/ขวาคู่กับโดนัท (compact) ----
  const storeYtdCard = (() => {
    let acc = 0; const cumSeries = GRAB_DAILY.map((r) => ({ label: "", v: (acc += r.n) }));
    const every = Math.max(2, Math.round(cumSeries.length / 6) * 2);
    cumSeries.forEach((p, i) => { if (i % every === 0 || i === cumSeries.length - 1) p.label = +GRAB_DAILY[i].d.slice(8) + "/" + +GRAB_DAILY[i].d.slice(5, 7); });
    const storeTotals = platRev.map((s, i) => ({ name: s.store, color: s.color, tot: i === 0 ? acc : 0 }));
    return h("div", { class: "card dash-card", style: { background: "linear-gradient(150deg,#EDF6FD 0%,#E9F6F1 100%)", borderColor: "#D8EAF2", padding: "13px 12px" } },
      h("div", { class: "dash-card-h", style: { fontSize: "12.5px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1px", marginBottom: "8px" } },
        h("span", null, "รายได้แต่ละร้าน"),
        h("b", { class: "tnum", style: { fontSize: "16px", color: "#2E7CB8" } }, "฿" + fmt(acc))),
      acc > 0 ? lineChart(cumSeries, { color: "#2E96C9", h: 60 }) : null,
      h("div", { class: "stack", style: { gap: "0", marginTop: acc > 0 ? "6px" : "2px" } }, storeTotals.map((s, i) =>
        h("div", { style: { display: "flex", alignItems: "center", gap: "6px", padding: "5px 0", borderTop: i ? "1px solid var(--border-soft)" : "none" } },
          h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: s.color, flex: "none" } }),
          h("span", { style: { flex: 1, minWidth: 0, fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, s.name),
          h("b", { class: "tnum", style: { fontSize: "11.5px", color: s.tot > 0 ? "#2E7CB8" : "var(--faint)" } }, "฿" + fmt(s.tot))))),
    );
  })();
  // ---- สรุปการขาย (Grab · 30 วันล่าสุด) → กดเข้าหน้าวิเคราะห์ ----
  const salesInsightCard = salesInsightBlock(go, shopCtx);

  // ---- แนวโน้มรายได้รวมทุกร้าน·ทุกแพลตฟอร์ม (แท่ง=สุทธิรายวัน · เส้น=สะสมทั้งปี · เส้นประ=คุ้มทุนจริง) ----
  // จุดคุ้มทุน/วัน = ต้นทุนคงที่จริงเต็ม ÷ อัตรากำไรส่วนเพิ่มจริง (หน่วยยอดขายสุทธิ/วัน — แกนเดียวกับแท่ง)
  const be = breakevenNetSalesPerDay();
  let _run = 0; const _cum = {};
  for (const r of GRAB_DAILY) { _run += r.n; _cum[r.d] = _run; }
  const ytdTotal = _run;
  const trend30 = GRAB_DAILY.slice(-30).map((r) => ({ label: +r.d.slice(8, 10), net: r.n, cur: r.d.slice(0, 7) === ym, cum: _cum[r.d] }));
  const beStat = (label, val, color) => h("div", { style: { flex: 1, textAlign: "center", padding: "2px" } },
    h("div", { style: { fontSize: "10.5px", color: "var(--muted)", fontWeight: 700 } }, label),
    h("div", { class: "tnum", style: { fontSize: "16px", fontWeight: 800, color } }, val));
  const vdiv = () => h("span", { style: { width: "1px", background: "var(--border-soft)", alignSelf: "stretch" } });
  const trendCard = h("div", { class: "card dash-card", style: { background: "linear-gradient(150deg,#FFF8EE 0%,#FEFCF6 100%)", borderColor: "#F0E4CE" } },
    h("div", { class: "dash-card-h" }, "แนวโน้มรายได้รวมทุกร้าน · ทุกแพลตฟอร์ม"),
    trend30.length
      ? h("div", { class: "chart-box" }, revenueYtdCombo({ days: trend30, breakeven: be, h: 210, fmt }))
      : h("div", { style: { padding: "24px 10px", textAlign: "center", color: "var(--faint)", fontSize: "12px" } }, "ยังไม่มีข้อมูล"),
    h("div", { class: "combo-legend", style: { marginTop: "8px" } },
      h("span", null, h("i", { style: { background: "#2E9B63" } }), "สุทธิ/วัน (เดือนนี้)"),
      h("span", null, h("i", { style: { background: "#BEE3CE" } }), "เดือนก่อน"),
      h("span", null, h("i", { style: { background: "#3F86D6" } }), "สะสมทั้งปี"),
      h("span", { style: { color: "#E8734E" } }, h("i", { class: "dash" }), "จุดคุ้มทุน"),
    ),
    h("div", { class: "rowflex", style: { gap: "6px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border-soft)", alignItems: "stretch" } },
      beStat("YTD · ทั้งปี", "฿" + fmt(ytdTotal), "#2E6BB0"), vdiv(),
      beStat("MTD · " + mLabel.replace("เดือน ", ""), "฿" + fmt(mNet), "#2E9B63"), vdiv(),
      beStat("คุ้มทุน/วัน", "฿" + fmt(be), "#B5781A"),
    ),
  );

  return [
    statRow,
    h("div", { class: "dash-h" }, pi("trend", 14), "คาดว่าจะขายวันนี้ (ต่อเมนู)"),
    fcMenuCard,
    h("div", { class: "dash-h" }, pi("clipboard", 14), "เตรียมวัตถุดิบสัปดาห์นี้ (จ.–อา.)"),
    dashboardPrepCard(shopCtx),
    h("div", { class: "dash-h" }, pi("clock", 14), "สรุปการขาย · Grab"),
    salesInsightCard,
    h("div", { class: "dash-h", style: { justifyContent: "space-between" } },
      h("span", { style: { display: "flex", alignItems: "center", gap: "6px" } }, pi("trend", 14), "การเงินภาพรวม · รายได้"),
      chick(38, "cheer")),
    h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px", alignItems: "stretch" } }, donutCard, storeYtdCard),
    trendCard,
  ];
}
const _hh = (i) => String(i).padStart(2, "0") + ":00";
const _cleanMenu = (n) => n.replace(/\[[^\]]*\]/g, "").replace(/\|.*/, "").replace(/\d+\s*kcal/gi, "").replace(/\s+/g, " ").trim();

// คอลัมน์อันดับ (1-3) — หัวข้อสี + รายการ name/value
function rankCol(label, color, entries) {
  return h("div", { style: { flex: 1, minWidth: 0 } },
    h("div", { style: { fontSize: "11.5px", fontWeight: 800, color, marginBottom: "6px" } }, label),
    h("div", { class: "stack", style: { gap: "5px" } },
      entries.length ? entries.map((e, i) => { const th = menuThumb(e.imgName || e.name, 22, { borderRadius: "7px" }); return h("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
        h("span", { class: "tnum", style: { flex: "none", width: "13px", fontSize: "11.5px", fontWeight: 800, color } }, (i + 1) + "."),
        th,
        h("span", { style: { flex: 1, minWidth: 0, fontSize: "13px", fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, e.name),
        h("span", { class: "tnum", style: { flex: "none", fontSize: "12px", fontWeight: 700, color: "var(--muted)" } }, e.val),
      ); }) : h("div", { style: { fontSize: "12px", color: "var(--faint)" } }, "—")),
  );
}
function insightSection(head, dotColor, left, right) {
  return h("div", { style: { paddingTop: "11px", marginTop: "11px", borderTop: "1px solid var(--border-soft)" } },
    h("div", { style: { display: "flex", alignItems: "center", gap: "7px", marginBottom: "9px" } },
      h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: dotColor, flex: "none" } }),
      h("div", { style: { fontSize: "13px", fontWeight: 800, color: "var(--text)" } }, head)),
    right ? h("div", { style: { display: "flex", gap: "14px" } }, left, right) : left);
}

// store tabs ครอบการ์ด วันขายดี/เมนูขายดี (default รวมทุกร้าน + เลือกรายร้าน)
function salesInsightBlock(go, shopCtx) {
  const shops = (shopCtx && shopCtx.shops) ? shopCtx.shops : [{ name: "ร้าน" }];
  const primary = shops[0] ? shops[0].name : "";
  const wrap = h("div", { class: "stack", style: { gap: "8px" } });
  let store = "all";
  function paint() {
    const chips = h("div", { class: "chip-tabs", style: { flexWrap: "wrap" } },
      [{ k: "all", n: "รวมทุกร้าน" }, ...shops.map((s) => ({ k: s.name, n: s.name }))].map((t) =>
        h("button", { type: "button", class: "chip" + (store === t.k ? " active" : ""), style: { whiteSpace: "nowrap" }, onClick: () => { store = t.k; paint(); } }, t.n)));
    const has = (store === "all" || store === primary);
    wrap.replaceChildren(chips, has
      ? salesSummaryCard(go)
      : h("div", { class: "card", style: { padding: "22px 10px", textAlign: "center", color: "var(--faint)", fontSize: "12.5px", lineHeight: 1.5 } }, "ยังไม่มียอดขายของ “" + store + "” — เมื่อร้านนี้เริ่มขาย/อัปโหลดข้อมูล ระบบจะแยกวันขายดี·เมนูขายดีให้"));
  }
  paint();
  return wrap;
}

function salesSummaryCard(go) {
  const gd = GRAB_DAILY.slice(-30);
  const pd = PEAK_DAILY.slice(-30);
  const GOOD = "#2E8C5A", DOWN = "#C86A8F", BLUE = "#3F73B8", QUIET = "#7C93AE", AMBER = "#B5781A";

  // ── ขายดี/น้อย รายวันในสัปดาห์ (เฉลี่ยออเดอร์/วัน) ──
  const wsum = new Array(7).fill(0), wc = new Array(7).fill(0);
  gd.forEach((r) => { const i = wdIdx(r.d); wsum[i] += r.o; wc[i]++; });
  const wd = wsum.map((s, i) => ({ i, v: wc[i] ? s / wc[i] : null })).filter((x) => x.v != null);
  const bestDays = wd.slice().sort((a, b) => b.v - a.v).slice(0, 3)
    .map((x) => ({ name: WD_FULL[x.i], val: Math.round(x.v) + "/วัน" }));
  const worstDays = wd.slice().sort((a, b) => a.v - b.v).slice(0, 3)
    .map((x) => ({ name: WD_FULL[x.i], val: Math.round(x.v) + "/วัน" }));

  // ── ชั่วโมงพีค/เงียบ (เฉพาะช่วงที่ร้านเปิด) ──
  const days = pd.length || 1;
  const h24 = new Array(24).fill(0);
  pd.forEach((r) => r.h.forEach((v, i) => { h24[i] += v; }));
  const avgH = h24.map((v) => v / days);
  const maxH = Math.max(...avgH, 0.1);
  const busy = avgH.map((v, i) => ({ v, i })).filter((x) => x.v >= maxH * 0.12);
  const openH = busy.length ? busy[0].i : 10, closeH = busy.length ? busy[busy.length - 1].i : 20;
  const hv = (v) => (Math.round(v * 10) / 10) + "/ชม.";
  const openHours = avgH.map((v, i) => ({ i, v })).filter((x) => x.i >= openH && x.i <= closeH && x.v > 0.02);
  const peakHours = openHours.slice().sort((a, b) => b.v - a.v).slice(0, 3)
    .map((x) => ({ name: _hh(x.i), val: hv(x.v) }));
  const quietHours = openHours.slice().sort((a, b) => a.v - b.v).slice(0, 3)
    .map((x) => ({ name: _hh(x.i), val: hv(x.v) }));

  // ── เมนูขายดี 3 อันดับ + สัดส่วน % ของทั้งหมด ──
  const topMenus = menuShare(3).map((m) => ({ name: _cleanMenu(m.name).slice(0, 30), imgName: m.name, val: Math.round(m.pct) + "%" }));

  return h("button", { type: "button", class: "card list-press", style: { width: "100%", textAlign: "left", border: "1.5px solid #CFE6F5", padding: "14px", background: "linear-gradient(140deg, #E9F4FF 0%, #EAF8F0 42%, #F4EEFC 78%, #FFF1F4 100%)" }, onClick: () => go({ name: "salesanalytics" }) },
    h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" } },
      h("div", { style: { fontSize: "14.5px", fontWeight: 800, color: "var(--text)" } }, "สรุปการขาย"),
      h("span", { style: { fontSize: "11px", fontWeight: 700, color: "var(--muted)" } }, "30 วันล่าสุด")),
    insightSection("วันขายดี / ขายน้อย (เฉลี่ยออเดอร์)", GOOD,
      rankCol("ขายดีสุด", GOOD, bestDays), rankCol("ขายน้อยสุด", DOWN, worstDays)),
    insightSection("ชั่วโมงพีค / เงียบ (ช่วงเปิดร้าน " + _hh(openH) + "–" + _hh(closeH) + ")", BLUE,
      rankCol("พีคสุด", BLUE, peakHours), rankCol("เงียบสุด", QUIET, quietHours)),
    insightSection("เมนูขายดี 3 อันดับ · สัดส่วน", AMBER,
      rankCol("จากยอดขายทั้งหมด", AMBER, topMenus), null),
    h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginTop: "12px", paddingTop: "11px", borderTop: "1px solid var(--border-soft)", fontSize: "12.5px", color: "var(--primary-dark)", fontWeight: 700 } },
      "ดูวิเคราะห์การขายเต็ม (รายวัน · รายชั่วโมง · เมนู)", pi("chev", 14)),
  );
}

// ---- การ์ด: ตารางเตรียมวัตถุดิบ (จ.–อา.) บนแดชบอร์ด — รูปแบบเดียวกันทั้งแอป
//   • default = "รวมทุกร้าน" · มี tab เลือกดูรายร้าน (ครอบทั้งภาพรวม + รายร้าน)
//   • ตัวเลข = กรัมสุก/วัน จากยอดขายจริง (ชุดเดียวกับตารางในรายงาน Grab → ตรงกัน)
function dashboardPrepCard(shopCtx) {
  const shops = (shopCtx && shopCtx.shops) ? shopCtx.shops : [{ name: "ร้าน" }];
  const segs = segments();
  const segId = segs.length ? segs[segs.length - 1].id : null;
  const primary = shops[0] ? shops[0].name : "";
  const wrap = h("div", { class: "card dash-card" });
  let store = "all";
  const cellS = { padding: "5px 3px", fontSize: "11px", textAlign: "right", fontVariantNumeric: "tabular-nums" };
  function paint() {
    // ปัจจุบันมีข้อมูลจริงเฉพาะร้านแรก (Grab) → "รวมทุกร้าน" = ร้านแรก · ร้านอื่นยังไม่มีข้อมูล
    const hasData = segId && (store === "all" || store === primary);
    const prep = hasData ? prepTable(segId) : null;
    const chips = h("div", { class: "chip-tabs", style: { flexWrap: "wrap", marginBottom: "10px" } },
      [{ k: "all", n: "รวมทุกร้าน" }, ...shops.map((s) => ({ k: s.name, n: s.name }))].map((t) =>
        h("button", { type: "button", class: "chip" + (store === t.k ? " active" : ""), style: { whiteSpace: "nowrap" }, onClick: () => { store = t.k; paint(); } }, t.n)));
    const head = h("div", { class: "dash-card-h", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" } },
      h("span", null, "ตารางเตรียมวัตถุดิบ (จ.–อา.)"),
      h("span", { class: "badge badge-green", style: { fontSize: "10px" } }, "กรัมสุก/วัน"));
    if (!prep || !prep.proteins.length) {
      wrap.replaceChildren(head, chips,
        h("div", { style: { padding: "22px 8px", textAlign: "center", color: "var(--faint)", fontSize: "12px", lineHeight: 1.5 } },
          "ยังไม่มีข้อมูลยอดขายของ" + (store === "all" ? "ร้าน" : "“" + store + "”") + " — กรอก/อัปโหลดยอดขายก่อน แล้วระบบจะคำนวณการเตรียมของให้อัตโนมัติ"));
      return;
    }
    const grid = (children) => h("div", { style: { display: "grid", gridTemplateColumns: "58px repeat(7,1fr) 46px", alignItems: "center" } }, ...children);
    const table = h("div", { style: { overflowX: "auto" } }, h("div", { style: { minWidth: "410px" } },
      grid([
        h("div", { style: { ...cellS, textAlign: "left", fontWeight: 700 } }, "วัตถุดิบ"),
        ...DOW_TH.map((d) => h("div", { style: { ...cellS, textAlign: "center", fontWeight: 700 } }, d)),
        h("div", { style: { ...cellS, fontWeight: 800, color: "var(--primary-dark)" } }, "เฉลี่ย"),
      ]),
      ...prep.proteins.map((p) => grid([
        h("div", { style: { ...cellS, textAlign: "left", fontWeight: 700, borderBottom: "1px solid var(--border-soft)" } }, p.name),
        ...p.byDow.map((v) => h("div", { style: { ...cellS, textAlign: "center", color: "var(--muted)", borderBottom: "1px solid var(--border-soft)" } }, fmt(v))),
        h("div", { style: { ...cellS, fontWeight: 800, color: "var(--primary-dark)", borderBottom: "1px solid var(--border-soft)" } }, fmt(p.avg)),
      ])),
    ));
    const riceCards = prep.rice.filter((r) => r.cooked > 0);
    const riceRow = riceCards.length ? h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" } },
      riceCards.map((rr) => h("div", { style: { borderRadius: "12px", background: "#FFF7E8", padding: "9px 11px" } },
        h("div", { style: { fontSize: "11.5px", fontWeight: 700 } }, "🍚 " + rr.name),
        h("div", { class: "tnum", style: { fontSize: "15px", fontWeight: 800, marginTop: "2px" } }, fmt(rr.cooked) + " ก.สุก/วัน"),
        h("div", { style: { fontSize: "10.5px", color: "var(--muted)" } }, "≈ ข้าวสาร " + fmt(rr.raw) + " ก.")))) : null;
    wrap.replaceChildren(head, chips, table,
      h("div", { style: { fontSize: "10.5px", color: "var(--faint)", marginTop: "7px" } }, "เฉลี่ยจากยอดขายจริง แยกวันจันทร์–อาทิตย์ · หน่วยกรัมสุก/วัน"),
      riceRow);
  }
  paint();
  return wrap;
}

// ---- การ์ด: คาดว่าจะขายวันนี้ (ต่อเมนู) — จาก "ยอดขายจริง" Grab: เฉลี่ยเฉพาะวันเดียวกันของสัปดาห์ 4 ครั้งล่าสุด
// (แก้ตามฟีดแบ็ก: ก่อนหน้านี้ใช้ตัวเลขพยากรณ์จาก seed → เมนูที่ไม่เคยขายโผล่มา · ตอนนี้โชว์เฉพาะเมนูที่ขายจริง)
function dailyMenuForecastCard(go) {
  const namesArr = gMenuItems(); const M = gMenuDaily();
  const nowDow = (new Date().getDay() + 6) % 7;
  const sameDow = Object.keys(M).sort().filter((d) => wdIdx(d) === nowDow).slice(-4);
  const sum = {};
  for (const d of sameDow) for (const [ix, u] of M[d]) sum[ix] = (sum[ix] || 0) + u;
  const rows = Object.keys(sum)
    .map((ix) => ({ name: namesArr[ix], avg: sum[ix] / (sameDow.length || 1) }))
    .filter((r) => r.name && r.avg >= 0.5)
    .sort((a, b) => b.avg - a.avg);
  const top = rows.slice(0, 6);
  const max = Math.max(...top.map((r) => r.avg), 1);
  const total = Math.round(rows.reduce((a, r) => a + r.avg, 0));
  const v1 = (x) => Math.round(x * 10) / 10;

  const row = (r) => h("button", {
    type: "button", class: "list-press", onClick: () => go({ name: "salesanalytics" }),
    style: { display: "flex", alignItems: "center", gap: "10px", width: "100%", border: 0, background: "transparent", padding: "5px 0", cursor: "pointer" },
  },
    (menuThumb(r.name, 34) || h("span", { style: { width: "34px", height: "34px", borderRadius: "10px", background: "#F4F0E8", display: "grid", placeItems: "center", flex: "none" } }, "🍛")),
    h("span", { style: { flex: "none", width: "31%", minWidth: 0, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" } }, _cleanMenu(r.name)),
    h("span", { style: { flex: 1, height: "9px", background: "var(--surface-soft, var(--bg))", border: "1px solid var(--border-soft)", borderRadius: "999px", overflow: "hidden" } },
      h("span", { style: { display: "block", height: "100%", width: Math.round(r.avg / max * 100) + "%", background: "#7BC8A0", borderRadius: "999px" } })),
    h("span", { class: "tnum", style: { flex: "none", width: "72px", textAlign: "right", fontSize: "12.5px", fontWeight: 700, color: "var(--primary-dark)" } }, v1(r.avg) + " จาน"),
  );

  return h("div", { class: "card dash-card" },
    h("div", { class: "dash-card-h", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" } },
      h("span", null, "คาดว่าจะขายวันนี้ (ต่อเมนู)"),
      h("span", { class: "badge badge-green", style: { fontSize: "10px" } }, "จากยอดขายจริง"),
    ),
    top.length
      ? h("div", { class: "stack", style: { gap: "7px", marginTop: "4px" } }, top.map(row))
      : h("div", { style: { fontSize: "12.5px", color: "var(--faint)", padding: "16px 2px", textAlign: "center" } }, "ยังไม่มีข้อมูลยอดขายวัน" + WD_FULL[nowDow] + " — อัปไฟล์ Menu Sales เพิ่มได้ที่หน้าอัปโหลด"),
    top.length ? h("div", { style: { display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", paddingTop: "9px", borderTop: "1px solid var(--border-soft)", fontSize: "12px", color: "var(--muted)" } },
      pi("trend", 13), h("span", null, "เฉลี่ยวัน" + WD_FULL[nowDow] + " (4 สัปดาห์ล่าสุด) รวม "), h("b", { class: "tnum", style: { color: "var(--primary-dark)" } }, fmt(total) + " จาน"),
      h("span", { style: { marginLeft: "auto" } }, "Grab · ข้อมูลจริง")) : null,
  );
}

// ---- การ์ด: ออเดอร์รายวัน (Grab peak hour) — กราฟแท่งต่อวัน + เลือกช่วงวันเอง (ตั้งต้น 30 วันล่าสุด)
function peakOrdersCard(go) {
  const wrap = h("div", { class: "card dash-card" });
  const all = PEAK_DAILY || [];
  const minD = all.length ? all[0].d : "";
  const maxD = all.length ? all[all.length - 1].d : "";
  const addDays = (iso, n) => { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };
  const clampFrom = (iso) => (iso < minD ? minD : iso > maxD ? maxD : iso);
  let st = load("peakRange", null);
  if (!st || !st.from || !st.to) st = { from: maxD ? clampFrom(addDays(maxD, -29)) : "", to: maxD };

  function render() {
    save("peakRange", st);
    const rows = all.filter((r) => (!st.from || r.d >= st.from) && (!st.to || r.d <= st.to));
    const total = rows.reduce((a, r) => a + r.t, 0);
    const avg = rows.length ? total / rows.length : 0;
    const peak = rows.reduce((m, r) => (r.t > (m ? m.t : -1) ? r : m), null);
    const lbl = (iso) => { const p = iso.split("-"); return (+p[2]) + "/" + (+p[1]); };
    const data = rows.map((r) => ({ v: r.t, label: lbl(r.d) }));

    const dateInput = (val, on) => { const i = h("input", { type: "date", value: val, min: minD, max: maxD, class: "input", style: { fontSize: "12px", padding: "6px 8px", flex: 1, minWidth: 0 } }); i.addEventListener("change", () => on(i.value)); return i; };
    const preset = (n, label) => h("button", { type: "button", class: "chip" + (isPreset(n) ? " active" : ""), style: { padding: "4px 10px", fontSize: "11.5px" }, onClick: () => { st = { from: n === "all" ? minD : clampFrom(addDays(maxD, -(n - 1))), to: maxD }; render(); } }, label);
    const isPreset = (n) => st.to === maxD && (n === "all" ? st.from === minD : st.from === clampFrom(addDays(maxD, -(n - 1))));

    wrap.replaceChildren(
      h("div", { class: "dash-card-h", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" } },
        h("span", null, "ออเดอร์ต่อวัน"),
        h("span", { style: { fontSize: "11px", color: "var(--muted)", fontWeight: 600 } }, rows.length + " วัน"),
      ),
      h("div", { class: "rowflex", style: { gap: "6px", flexWrap: "wrap", marginBottom: "8px" } },
        preset(7, "7 วัน"), preset(30, "30 วัน"), preset(90, "90 วัน"), preset("all", "ทั้งหมด")),
      h("div", { class: "rowflex", style: { gap: "6px", alignItems: "center", marginBottom: "10px" } },
        dateInput(st.from, (v) => { st.from = v; if (st.from > st.to) st.to = st.from; render(); }),
        h("span", { style: { fontSize: "12px", color: "var(--faint)", flex: "none" } }, "→"),
        dateInput(st.to, (v) => { st.to = v; if (st.to < st.from) st.from = st.to; render(); })),
      data.length ? barChart(data, { h: 150, color: "#46B47A" }) : h("div", { style: { padding: "24px", textAlign: "center", color: "var(--faint)", fontSize: "12.5px" } }, "ไม่มีข้อมูลในช่วงนี้"),
      h("div", { class: "rowflex", style: { gap: "8px", marginTop: "10px", paddingTop: "9px", borderTop: "1px solid var(--border-soft)" } },
        h("div", { style: { flex: 1 } }, h("div", { style: { fontSize: "10.5px", color: "var(--faint)" } }, "ออเดอร์รวม"), h("div", { class: "tnum", style: { fontSize: "16px", fontWeight: 800, color: "var(--primary-dark)" } }, fmt(total))),
        h("div", { style: { flex: 1 } }, h("div", { style: { fontSize: "10.5px", color: "var(--faint)" } }, "เฉลี่ย/วัน"), h("div", { class: "tnum", style: { fontSize: "16px", fontWeight: 800 } }, (Math.round(avg * 10) / 10))),
        peak ? h("div", { style: { flex: 1.3 } }, h("div", { style: { fontSize: "10.5px", color: "var(--faint)" } }, "วันพีค"), h("div", { class: "tnum", style: { fontSize: "13px", fontWeight: 700, color: "var(--warning-ink)" } }, lbl(peak.d) + " · " + peak.t + " ออเดอร์")) : null,
      ),
    );
  }
  render();
  return wrap;
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
