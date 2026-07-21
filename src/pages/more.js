// ============================================================
// pages/more.js — แท็บ "เพิ่มเติม" (เจ้าของ) + "บัญชี" (พนักงาน)
// พอร์ตจาก prototype2 MoreScreen / AccountScreen
// ctx = { go, role, toast, onLogout, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag } from "../components/components.js";
import { cuteIcons } from "../components/components.js";
import { mascot, cic } from "../components/mascot.js";
import { teamCard } from "./users.js";
import { isPlaceholderName } from "../services/authService.js";
import { actionCount } from "../utils/messages.js";
import { getPrepHidden, setPrepCatOn } from "../forecast/formulaLibrary.js";
import { toggle } from "../components/components.js";
import { items, priceRows } from "../data/store.js";
import { fmt } from "../utils/formulas.js";
import { load, save } from "../utils/storage.js";

// หมวดพับ/กางได้ (จำสถานะต่อเครื่อง) — ลดการเลื่อนจอ หน้าเพิ่มเติมโล่งขึ้น
function foldSection(key, title, ovClass, ...nodes) {
  const open = load("moreFold_" + key, key === "grab" || key === "store"); // เปิดเฉพาะหมวดหลักเริ่มต้น
  const body = h("div", { class: "stack", style: { gap: "10px", display: open ? "flex" : "none", flexDirection: "column" } }, ...nodes);
  const chevIc = pi("chevd", 15); chevIc.style.transition = "transform .18s"; chevIc.style.transform = open ? "rotate(180deg)" : "none"; chevIc.style.color = "var(--faint)";
  const head = h("button", {
    type: "button", class: "overline " + ovClass + " list-press",
    style: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", border: 0, background: "transparent", cursor: "pointer", padding: "6px 2px" },
    onClick: () => { const on = body.style.display === "none"; body.style.display = on ? "flex" : "none"; chevIc.style.transform = on ? "rotate(180deg)" : "none"; save("moreFold_" + key, on); },
  }, h("span", null, title), chevIc);
  return h("div", { class: "stack", style: { gap: "8px" } }, head, body);
}

// หมวดในหน้า "คำแนะนำการเตรียมของ" (เปิด/ปิดการแสดงผล)
const PREP_CATS = [
  { id: "protein", name: "กับข้าว", emoji: "\uD83C\uDF73", c: "green" },
  { id: "drink", name: "เครื่องดื่ม", emoji: "\uD83E\uDD64", c: "blue" },
  { id: "egg", name: "ไข่", emoji: "\uD83E\uDD5A", c: "amber" },
  { id: "sauce", name: "ซอส / น้ำจิ้ม", emoji: "\uD83E\uDED9", c: "rose" },
  { id: "rice", name: "ข้าว", emoji: "\uD83C\uDF5A", c: "violet" },
  { id: "pack", name: "บรรจุภัณฑ์", emoji: "\uD83D\uDCE6", c: "amber" },
  { id: "dry", name: "อื่นๆ", emoji: "\uD83E\uDED9", c: "violet" },
];

// การ์ดตั้งค่า "คำแนะนำการเตรียมของ" — toggle เปิด/ปิดหมวดที่จะโชว์ในหน้าเตรียมของ
function prepCatCard(go) {
  const card = h("div", { class: "card more-card mc4", style: { padding: "4px 16px" } });
  function paint() {
    const hidden = getPrepHidden();
    const onCount = PREP_CATS.filter((c) => !hidden.includes(c.id)).length;
    card.replaceChildren(
      h("div", { class: "rowflex", style: { padding: "12px 2px 10px", borderBottom: "1px solid var(--border-soft)" } },
        h("span", { class: "catic emo more-ic green" }, h("span", { class: "emo-g" }, "\uD83D\uDCCB")),
        h("span", { style: { flex: 1, minWidth: 0 } },
          h("span", { style: { display: "block", fontWeight: 700, fontSize: "14.5px" } }, "หมวดที่แสดงในหน้าเตรียมของ"),
          h("span", { style: { display: "block", fontSize: "12px", color: "var(--muted)" } }, "ปิดหมวดที่ไม่ได้ดู ให้หน้าจอโล่ง · กำลังโชว์ " + onCount + "/" + PREP_CATS.length + " หมวด")),
        h("button", { type: "button", class: "mini-btn", onClick: () => go({ name: "forecast" }) }, pi("chev", 14)),
      ),
      ...PREP_CATS.map((c, i) => {
        const on = !hidden.includes(c.id);
        return h("div", { class: "rowflex", style: { padding: "11px 2px", borderBottom: i < PREP_CATS.length - 1 ? "1px solid var(--border-soft)" : "none" } },
          h("span", { class: "catic emo more-ic " + c.c }, h("span", { class: "emo-g" }, c.emoji)),
          h("span", { style: { flex: 1, fontWeight: 600, fontSize: "14px" } }, c.name),
          toggle(on, (v) => { setPrepCatOn(c.id, v); paint(); }),
        );
      }),
    );
  }
  paint();
  return card;
}

// หัวสีสันพาสเทล (เข้าชุดหน้าแรก) แทน hdr ปกติ
function moreHero({ title, sub, art }) {
  return h("div", { class: "more-hero" },
    h("span", { class: "hero-spark1", style: { fontSize: "13px" }, "aria-hidden": "true" }, "✨"),
    h("span", { class: "hero-spark2", style: { fontSize: "10px" }, "aria-hidden": "true" }, "🌸"),
    h("span", { class: "mh-art" }, art || mascot(38, { spark: true })),
    h("div", { class: "mh-tt" }, h("h1", null, title), h("p", null, sub)),
  );
}

function moreRow({ ic, emoji, c = "green", t, s, onClick, badge }) {
  const cute = cuteIcons();
  return h("button", {
    type: "button", class: "rowflex list-press",
    style: { width: "100%", border: 0, background: "transparent", textAlign: "left", padding: "13px 2px", borderBottom: "1px solid var(--border-soft)" },
    onClick,
  },
    h("span", { class: "catic emo more-ic " + c }, cute && emoji ? h("span", { class: "emo-g" }, emoji) : pi(ic, 20)),
    h("span", { style: { flex: 1, minWidth: 0 } },
      h("span", { style: { display: "block", fontWeight: 600, fontSize: "14.5px" } }, t),
      s && h("span", { style: { display: "block", fontSize: "12px", color: "var(--muted)" } }, s),
    ),
    badge > 0 && h("span", { class: "task-count tnum", style: { marginRight: "2px" } }, String(badge)),
    (() => { const c2 = pi("chev", 16); c2.style.color = "var(--faint)"; return c2; })(),
  );
}

// การ์ดข้อมูลกลางของ "ร้าน" — หัวข้อหลัก 1 ร้าน · ข้างในมี สั่งของ/รับของ + สินค้าคงเหลือ
function storeDataCard(go, store) {
  const inner = ({ tint, icon, t, s, route, mode }) =>
    h("button", {
      type: "button", class: "storedata-tile list-press soft-card soft-" + tint,
      onClick: () => go(mode ? { name: route, mode } : { name: route }),
    },
      h("span", { class: "catic " + tint }, cic(icon, 28)),
      h("div", { class: "storedata-tt" }, t),
      h("div", { class: "storedata-sub" }, s),
      h("span", { class: "storedata-go" }, "เปิด", pi("chev", 12)),
    );
  return h("div", { class: "card more-card storedata-card mc1" },
    // หัวการ์ด = ชื่อร้าน + ทางเข้าแก้ข้อมูลกลาง
    h("div", { class: "storedata-head" },
      h("span", { class: "storedata-mascot" }, mascot(34)),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { class: "storedata-name" }, store),
        h("div", { class: "storedata-meta" }, "ข้อมูลกลางของร้าน · สั่งของ · คงเหลือ"),
      ),
      h("button", { type: "button", class: "storedata-edit list-press", onClick: () => go({ name: "master" }) }, pi("db", 14), "แก้ข้อมูลกลาง"),
    ),
    // การ์ดด้านใน 2 ใบ
    h("div", { class: "storedata-grid" },
      inner({ tint: "blue", icon: "delivery", t: "สั่งของ / รับของ", s: "สั่งล่วงหน้า · ยืนยันรับของ", route: "orderrecv", mode: "recv" }),
      inner({ tint: "violet", icon: "box", t: "สินค้าคงเหลือ", s: "คงเหลือจริง · FIFO · มูลค่า", route: "stocklist" }),
    ),
  );
}

export function moreScreen(ctx = {}) {
  const { go, onLogout, user } = ctx;
  const store = ctx.shopCtx ? ctx.shopCtx.shop : "พระราม 9";
  const mailCount = actionCount(user || { level: "owner" });
  return h("div", { class: "page-wrap", "data-screen-label": "more" },
    h("div", { class: "page stack", style: { paddingTop: "14px" } },
      moreHero({ title: "เพิ่มเติม", sub: "ส่วนของเจ้าของทั้งหมด · จัดการร้านได้ครบ" }),

      teamCard(ctx),

      foldSection("store", "ข้อมูลกลาง · ร้าน", "ov-green",
        storeDataCard(go, store),
        h("div", { class: "card more-card mc5" },
          moreRow({ ic: "db", emoji: "🥩", c: "green", t: "ต้นทุนวัตถุดิบ (ข้อมูลกลาง)", s: "เนื้อสัตว์ · ซอส — ราคาซื้อ ÷ yield + ค่าส่ง + อื่นๆ = ต้นทุนสุทธิ/กก.", onClick: () => go({ name: "rawcost" }) }),
          moreRow({ ic: "tag", emoji: "🍲", c: "amber", t: "ต้นทุนอาหาร (ข้อมูลกลาง)", s: "เมนูที่รับมาขาย · ราคาตั้งขาย − ส่วนลด = สุทธิ · " + priceRows().length + " รายการ", onClick: () => go({ name: "menulist" }) }),
          moreRow({ ic: "chefhat", emoji: "🧑‍🍳", c: "violet", t: "สร้างเมนู (คิดต้นทุน + กำไร)", s: "เลือกวัตถุดิบ (กรัม/จาน) → ต้นทุน/จาน + GP·VAT·ค่าแรง·ค่าไฟ·Ads → กำไรต่อจาน", onClick: () => go({ name: "menucost" }) }),
        ),
      ),

      foldSection("grab", "รายงาน Grab · การเงิน (เห็นเฉพาะเจ้าของ)", "ov-blue",
        h("div", { class: "card more-card mc3" },
          moreRow({ ic: "trend", emoji: "📈", c: "blue", t: "รายงาน Grab", s: "ออเดอร์/ชั่วโมง · จ-อา · เมนู·เตรียมของ · Ads · ส่งvsใช้ · คุ้มทุน", onClick: () => go({ name: "grabreports" }) }),
          moreRow({ ic: "wallet", emoji: "💧", c: "green", t: "งบการเงิน & Cashflow", s: "P&L รายเดือน/ไตรมาส/ปี · ภาษีขั้นบันได · เงินค้างรับ", onClick: () => go({ name: "finstatement" }) }),
          moreRow({ ic: "cloud", emoji: "📂", c: "violet", t: "อัปโหลดข้อมูล Grab (CSV)", s: "ธุรกรรม · เมนู · เงินโอน · Ads · Peak Hour — ไฟล์เดียวหลายเดือนได้", onClick: () => go({ name: "grabimport" }) }),
          moreRow({ ic: "settings", emoji: "🎛️", c: "amber", t: "ตั้งค่ารายงาน Grab", s: "fix cost · ภาษี · ของหาย · segment · กติกาเมนู", onClick: () => go({ name: "grabassumptions" }) }),
        ),
      ),

      foldSection("team", "งานและทีม · เตรียมของ", "ov-violet",
        h("div", { class: "card more-card mc2" },
          moreRow({ ic: "mail", emoji: "💌", c: "violet", t: "งานและข้อความ", s: "ส่งข้อความ · มอบหมายงาน · ติดตามผล", badge: mailCount, onClick: () => go({ name: "messages" }) }),
        ),
        prepCatCard(go),
      ),

      foldSection("formula", "ข้อมูล & สูตร", "ov-blue",
        h("div", { class: "card more-card mc4" },
          moreRow({ ic: "settings", emoji: "📈", c: "blue", t: "สูตรพยากรณ์", s: "เลือก/ปรับสูตร · กำหนดช่วงวัน · ข้าว ×1.5", onClick: () => go({ name: "formulasettings" }) }),
          moreRow({ ic: "users", emoji: "👥", c: "orange", t: "ค่าแรงพนักงาน", s: "รายวัน / เงินเดือน + OT — กรอกและดูสรุปค่าแรงทั้งร้าน", onClick: () => go({ name: "payroll" }) }),
          moreRow({ ic: "settings", emoji: "⚙️", c: "green", t: "ปรับค่า assumption (สต๊อก/สั่งของ)", s: "ไข่/แผง · เกณฑ์สต๊อกต่ำ · เผื่อสั่งของ — ค่าฝั่งการเงินย้ายไป \"ตั้งค่ารายงาน Grab\" แล้ว", onClick: () => go({ name: "assumptions" }) }),
          moreRow({ ic: "bell", emoji: "🔔", c: "rose", t: "ตั้งค่าแจ้งเตือนสต๊อกต่ำ (LINE)", s: "ของเหลือถึงเกณฑ์ → บอทเตือนในกลุ่มร้าน · ตั้งเกณฑ์ได้ทุกรายการ", onClick: () => go({ name: "alerts" }) }),
          moreRow({ ic: "swap", emoji: "🔄", c: "teal", t: "แปลงหน่วย", s: "ความหมายหน่วยนับ + การเทียบ/แปลงหน่วยอัตโนมัติในระบบ", onClick: () => go({ name: "unitconvert" }) }),
          moreRow({ ic: "chefhat", emoji: "👩‍🍳", c: "violet", t: "แก้สูตรอาหาร", s: "สัดส่วน · ขั้นตอน · ล็อค/ปลดล็อคให้พนักงานดู", onClick: () => go({ name: "recipes" }) }),
        ),
      ),

      foldSection("reports", "รายงานเจ้าของ", "ov-amber",
        h("div", { class: "card more-card mc6" },
          moreRow({ ic: "doc", emoji: "📊", c: "blue", t: "สรุปผู้บริหาร (พร้อมปริ้น)", s: "KPI · รายได้/จ่าย · ของเสีย · พยากรณ์", onClick: () => go({ name: "execsummary" }) }),
          moreRow({ ic: "cart", emoji: "🛒", c: "amber", t: "ค่าใช้จ่ายสั่งอาหาร", s: "ปฏิทินต้นทุนรับของ · รายเมนู + ค่าส่ง · คิดจากยืนยันรับของ", onClick: () => go({ name: "orderexpense" }) }),
          moreRow({ ic: "cal", emoji: "📅", c: "green", t: "รายรับ-จ่าย รายเดือน", s: "ปฏิทิน · ยอดสุทธิ · แก้ย้อนหลัง", onClick: () => go({ name: "money" }) }),
          moreRow({ ic: "file", emoji: "🧾", c: "violet", t: "คำนวณภาษี", s: "ประมาณภาษีทั้งปี + เช็คเกณฑ์ VAT — ฉบับละเอียดอยู่ใน \"งบการเงิน\" (โหมดทั้งปี)", onClick: () => go({ name: "tax" }) }),
        ),
      ),

      foldSection("system", "หน้าตา · ระบบ", "ov-teal",
        h("div", { class: "card more-card mc3" },
          moreRow({ ic: "image", emoji: "🎨", c: "pink", t: "ปรับสี / ธีม", s: "ธีมสำเร็จรูป · ปรับสีเองตามส่วน", onClick: () => go({ name: "colorsettings" }) }),
        ),
        h("div", { class: "card more-card mc7" },
          moreRow({ ic: "history", emoji: "🕒", c: "amber", t: "ประวัติ + แก้ย้อนหลัง", s: "ทุกการบันทึก · audit log ลบไม่ได้", onClick: () => go({ name: "history" }) }),
          moreRow({ ic: "cloud", emoji: "☁️", c: "teal", t: "ส่งออก & สำรอง", s: "Backup · ดาวน์โหลด Excel/CSV/PDF", onClick: () => go({ name: "export" }) }),
        ),
      ),

      h("button", { type: "button", class: "btn btn-block", style: { marginTop: "4px", color: "var(--danger)" }, onClick: onLogout }, "ออกจากระบบ"),
      h("p", { style: { fontSize: "11px", color: "var(--faint)", textAlign: "center", margin: "12px 0 0" } }, "คลัง & การดำเนินงาน · สาขาพระราม 9"),
    ),
  );
}

export function accountScreen(ctx = {}) {
  const { go, onLogout, shopCtx, user } = ctx;
  const store = shopCtx ? shopCtx.shop : "พระราม 9";
  const myName = user && user.name && !isPlaceholderName(user.name) ? user.name : "ยังไม่ได้ตั้งชื่อ";
  const mailCount = actionCount(user || { level: "staff" });

  return h("div", { class: "page-wrap", "data-screen-label": "account" },
    h("div", { class: "page stack", style: { paddingTop: "14px" } },
      moreHero({ title: "สวัสดี " + myName, sub: "โปรไฟล์ & การใช้งานของฉัน" }),

      h("div", { class: "card more-card mc1 rowflex", style: { gap: "13px" } },
        h("span", { class: "catic fill", style: { width: "52px", height: "52px", borderRadius: "16px" } }, pi("user", 24)),
        h("div", { style: { flex: 1, minWidth: 0 } },
          h("div", { style: { fontWeight: 800, fontSize: "16px" } }, myName),
          h("div", { class: "rowflex", style: { gap: "6px", marginTop: "3px" } },
            h("span", { class: "badge badge-green" }, pi("store", 11), store),
            h("span", { class: "badge" }, "เข้าสู่ระบบแล้ว"),
          ),
        ),
      ),

      teamCard(ctx),

      h("div", { class: "overline ov-green" }, "รายงานขาย · เตรียมของ"),
      h("div", { class: "card more-card mc5" },
        moreRow({ ic: "trend", emoji: "📈", c: "green", t: "รายงานขาย Grab", s: "ช่วงพีค · วันขายดี · เมนูขายดี · ตารางเตรียมของ", onClick: () => go({ name: "grabreports" }) }),
        moreRow({ ic: "clipboard", emoji: "📋", c: "violet", t: "คำแนะนำการเตรียมของ", s: "พยากรณ์ 7 วัน · จ–อา", onClick: () => go({ name: "forecast" }) }),
      ),

      h("div", { class: "overline ov-violet" }, "งานและข้อความ"),
      h("div", { class: "card more-card mc2" },
        moreRow({ ic: "mail", emoji: "💌", c: "violet", t: "งานและข้อความ", s: "ข้อความและงานที่ได้รับ · รับทราบ · กดทำเสร็จ", badge: mailCount, onClick: () => go({ name: "messages" }) }),
      ),

      h("div", { class: "overline ov-blue" }, "ทางลัดของฉัน"),
      h("div", { class: "card more-card mc3" },
        moreRow({ ic: "book", emoji: "📖", c: "green", t: "คู่มือพนักงาน", s: "เปิดร้าน · แพ็ค · ปิดร้าน · ความสะอาด", onClick: () => go({ name: "manual" }) }),
        moreRow({ ic: "music", emoji: "🎵", c: "blue", t: "เพลงร้าน", s: "เปิด Playlist ระหว่างวัน", onClick: () => go({ name: "music" }) }),
        moreRow({ ic: "history", emoji: "🕒", c: "amber", t: "ประวัติการบันทึก", s: "ดู/แก้รายการที่กรอกย้อนหลัง", onClick: () => go({ name: "history" }) }),
      ),
      note([h("span", null, "ส่วนของ"), h("b", null, "เจ้าของ"), h("span", null, " (ข้อมูลกลาง · ต้นทุน · กำไร · ตั้งค่า) ต้องเข้าด้วยรหัสเจ้าของ — พนักงานมองไม่เห็น")], { iconName: "lock" }),
      h("button", { type: "button", class: "btn btn-block", style: { marginTop: "4px", color: "var(--danger)" }, onClick: onLogout }, pi("arrowl", 16), "ออกจากระบบ"),
      h("p", { style: { fontSize: "11px", color: "var(--faint)", textAlign: "center", margin: "12px 0 0" } }, "คลัง & การดำเนินงาน · สาขาพระราม 9"),
    ),
  );
}
