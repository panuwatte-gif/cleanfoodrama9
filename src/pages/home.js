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
import { mascot } from "../components/mascot.js";
import { itemIc } from "../components/components.js";
import { storeChip } from "../components/layout.js";
import { branchCombo } from "../components/charts.js";
import { itemById, unitOf, fmt } from "../utils/formulas.js";
import { isPlaceholderName } from "../services/authService.js";
import {
  actionCount, homeCardSummary, inboxFor, pendingReviewFor, overdueAssignedBy,
  nameOf, isNotice, isOverdue, isDueToday,
} from "../utils/messages.js";
import { STOCK_SEED, MONEY, TODAY, branchDailySales } from "../data/seed.js";
import { incomeRows, expenseRows } from "../data/store.js";

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

export function homeScreen({ go, role, toast, shopCtx, user } = {}) {
  const store = shopCtx ? shopCtx.shop : "พระราม 9";
  const lowItems = STOCK_SEED.filter((s) => s.st !== "ok");
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
        h("span", { class: "home-logo" }, mascot(40, { spark: true })),
        h("div", { class: "home-top-tt" },
          h("h1", null, "คลัง & การดำเนินงาน"),
          h("p", null, "จัดการสต๊อก · ออเดอร์ · ทีมงาน"),
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
        h("span", { class: "hero-art" }, mascot(98, { spark: true })),
      ),

      // ── เจ้าของ: สถิติยอดขายวันนี้ + ยอดสุทธิเดือน (คู่กัน) + กราฟเดียว 2 แกน ──
      isOwner && ownerSalesBlock(go, shopCtx),
      isOwner && (review.length || overdue.length) && ownerReviewCard(go, review, overdue),

      // ── หัวหน้า/พนักงาน: ข้อความใหม่วิ่งเป็นแถบซ้าย→ขวา (จนกว่าจะกดอ่าน) ──
      !isOwner && msgMarquee(go, me),

      // การ์ดงานหลัก
      h("div", { class: "home-2col" },
        h("button", { type: "button", class: "fc soft-card soft-green list-press", onClick: () => go({ name: "orderrecv", mode: "recv" }) },
          h("div", { class: "fc-title g" }, "สั่งของ / รับของ"),
          h("div", { class: "fc-sub", html: "สถานะคำสั่งซื้อ 14 รายการ<br />แจ้งเตือน LINE แล้ว" }),
          h("span", { class: "fc-cart" }, pi("cart", 24), h("span", { class: "n" }, "14")),
          h("div", { class: "fc-spacer" }),
          h("span", { class: "fc-cta" }, "ดูดำเนินการ", pi("chev", 13)),
          h("span", { class: "fc-deco" }, mascot(58)),
        ),
        h("button", { type: "button", class: "fc soft-card soft-blue list-press", onClick: () => go({ name: "count" }) },
          h("div", { class: "fc-title b" }, "ตรวจนับสินค้าคงเหลือ"),
          h("div", { class: "fc-sub", html: "นับปัจจุบัน · ระบบสะดวก<br />รวดเร็ว · มั่นใจความแม่นยำ" }),
          h("span", { class: "fc-cart blue" }, pi("clipboard", 24)),
          h("div", { class: "fc-spacer" }),
          h("span", { class: "fc-cta b" }, "เริ่มตรวจนับ", pi("chev", 13)),
          h("span", { class: "fc-deco", style: { color: "#9BBEF6", opacity: .5 } }, pi("clipboard", 52, 1.6)),
        ),
      ),

      // บันทึกรายได้ / ค่าใช้จ่าย
      h("div", { class: "home-2col" },
        h("button", { type: "button", class: "mf soft-card soft-violet list-press", onClick: () => go({ name: "income" }) },
          h("div", { class: "mf-title v" }, "บันทึกรายได้"),
          h("div", { class: "mf-sub" }, "Grab · LM · Shopee · หน้าร้าน"),
          h("span", { class: "mf-add violet" }, pi("plus", 20)),
          h("span", { class: "mf-deco mf-deco-note" }, pi("notebook", 42, 1.7)),
        ),
        h("button", { type: "button", class: "mf soft-card soft-orange list-press", onClick: () => go({ name: "expense" }) },
          h("div", { class: "mf-title o" }, "บันทึกค่าใช้จ่าย"),
          h("div", { class: "mf-sub" }, "ค่าวัตถุดิบ · ค่าขนส่ง · อื่นๆ"),
          h("span", { class: "mf-add orange" }, pi("plus", 20)),
          h("span", { class: "mf-deco mf-deco-bill" },
            (() => { const c = pi("receipt", 40, 1.7); c.classList.add("d-bill"); return c; })(),
            (() => { const c = pi("coin", 22, 1.8); c.classList.add("d-coin"); return c; })()),
        ),
      ),

      // ส่ง LINE
      h("button", { type: "button", class: "line-card card list-press", onClick: () => go({ name: "linesend" }) },
        h("span", { class: "line-mascot" }, pi("chat", 27)),
        h("div", { class: "line-text" },
          h("div", { class: "lt-title" }, "สั่งเข้ากลุ่ม LINE"),
          h("div", { class: "lt-sub" }, "เลือกหัวข้อ (รายการเปิดร้าน · ของใกล้หมด · ยอดขาย) → กดส่งได้เลย"),
        ),
        h("span", { class: "line-go" }, "รอส่ง", pi("chev", 14)),
      ),

      // สต๊อกต่ำ
      h("div", { class: "card", style: { background: "var(--tint-rose)", borderColor: "#FECDD3", padding: "14px" } },
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
          lowItems.map((s) => {
            const it = itemById(s.id);
            const st = lowStat(s);
            const color = st.c === "s-ok" ? "var(--primary-dark)" : st.c === "s-mid" ? "var(--warning-ink)" : "var(--danger)";
            return h("div", { class: "low-cell", onClick: () => go({ name: "stockdetail", id: s.id }) },
              h("span", { class: "low-stat " + st.c }, st.t),
              imageSlot("low-" + s.id, "low-thumb", "วางรูป"),
              h("span", { class: "low-ic" }, itemIc(it)),
              h("div", { style: { fontSize: "11.5px", fontWeight: 700, lineHeight: 1.25, marginTop: "6px" } }, it.name),
              h("div", { class: "tnum", style: { fontSize: "10.5px", color, fontWeight: 800 } }, "เหลือ " + s.qty + " " + unitOf(it)),
            );
          }),
        ),
      ),

      // ตัวช่วย 4 ไทล์
      h("div", { class: "helper4" },
        helperTile(go, "violet", "trend", "พยากรณ์ยอดขาย", "เนื้อ 2.0–2.4 kg", h("span", { class: "htile-link" }, pi("up", 10), "+5.6%"), "forecast"),
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

// ---- บล็อกยอดขาย (เจ้าของ) = สถิติคู่ + กราฟเดียว 2 แกน (เลือกช่วงได้) ----
function ownerSalesBlock(go, shopCtx) {
  const names = shopCtx && shopCtx.shops ? shopCtx.shops.map((s) => s.name) : ["ร้าน"];
  const mainName = names[0] || "ร้าน";
  // อ่านจาก "รายการจริง" ที่บันทึกไว้เท่านั้น (income/expense → Supabase) · ยังไม่มี = 0
  const inc = incomeRows(), exp = expenseRows();
  const net = inc.reduce((s, r) => s + (r.net || 0), 0) - exp.reduce((s, r) => s + (r.amount || 0), 0);
  const netStr = (net >= 0 ? "+฿" : "−฿") + fmt(Math.abs(net));
  const todayTotal = inc.filter((r) => r.day === TODAY.d).reduce((s, r) => s + (r.gross || 0), 0);
  // กราฟจากยอดจริงรายวัน (รวมทุกช่องทางต่อวัน) · ยังไม่มีข้อมูล = กราฟว่าง (ไม่โชว์เดโม)
  const _byDay = {};
  for (const r of inc) _byDay[r.day] = (_byDay[r.day] || 0) + (r.gross || 0);
  const series = Object.keys(_byDay).map(Number).sort((a, b) => a - b)
    .map((d) => ({ d, byBranch: { [mainName]: _byDay[d] }, total: _byDay[d] }));
  const branches = [{ name: mainName, color: "#54AE7B" }];
  const todayChips = [{ name: mainName, color: "#54AE7B", today: todayTotal }];

  const statCard = (cls, icCls, ic, label, num, sub, route) =>
    h("button", { type: "button", class: "stat-card " + cls + " list-press", onClick: () => go({ name: route }) },
      h("div", { class: "sc-top" },
        h("span", { class: "sc-ic " + icCls }, pi(ic, 16)),
        h("span", { class: "sc-label" }, label),
      ),
      h("div", { class: "sc-row" },
        h("div", { class: "sc-num tnum" + (cls === "sc-net" ? " pos" : "") }, num),
        h("span", { class: "sc-go" }, pi("chev", 15)),
      ),
      h("div", { class: "sc-sub" }, sub),
    );

  // การ์ดกราฟ (รีเฟรชเฉพาะการ์ดเมื่อสลับช่วง — ไม่รีทั้งหน้า)
  const chartCard = h("div", { class: "card sales-card" });
  let range = "month";
  function paintChart() {
    const days = range === "week" ? series.slice(-7) : series;
    const sel = h("select", { class: "sales-range" },
      h("option", { value: "month" }, "ตามวันที่บันทึกจริง"),
      h("option", { value: "week" }, "7 วันล่าสุด"),
    );
    sel.value = range;
    sel.addEventListener("change", () => { range = sel.value; paintChart(); });
    chartCard.replaceChildren(
      h("div", { class: "sales-head" },
        h("span", { class: "sales-title" }, "ยอดขายรายวัน · ยอดขาย + สะสม"),
        sel,
      ),
      days.length
        ? branchCombo({ days, branches, h: 168, fmt })
        : h("div", { style: { padding: "26px 10px", textAlign: "center", color: "var(--faint)", fontSize: "12.5px", lineHeight: 1.6 } },
            "ยังไม่มีข้อมูลยอดขาย", h("br"), "เริ่มที่ ", h("b", null, "บันทึกรายได้"), " แล้วกราฟจะขึ้นจริง"),
      h("div", { class: "sales-branches" },
        todayChips.map((b) => h("div", { class: "sb-chip" },
          h("span", { class: "sb-top" },
            h("span", { class: "sb-dot", style: { background: b.color } }),
            h("span", { class: "sb-name" }, b.name),
          ),
          h("span", { class: "sb-val tnum" }, "฿" + fmt(b.today)),
        )),
      ),
      h("button", { type: "button", class: "btn btn-block sales-report-btn", onClick: () => go({ name: "execsummary" }) },
        pi("doc", 16), "ดูรายงานทั้งหมด", pi("chev", 14)),
    );
  }
  paintChart();

  return [
    h("div", { class: "stat-pair" },
      statCard("sc-sales", "", "trend", "ยอดขายวันนี้", "฿" + fmt(todayTotal), "วันนี้ · " + TODAY.d + " " + TODAY.mon, "execsummary"),
      statCard("sc-net", "net", "wallet", "ยอดสุทธิเดือนนี้", netStr, "รายได้ − ค่าใช้จ่าย = กำไร", "money"),
    ),
    chartCard,
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
