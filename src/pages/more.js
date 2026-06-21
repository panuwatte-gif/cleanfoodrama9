// ============================================================
// pages/more.js — แท็บ "เพิ่มเติม" (เจ้าของ) + "บัญชี" (พนักงาน)
// พอร์ตจาก prototype2 MoreScreen / AccountScreen
// ctx = { go, role, toast, onLogout, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag } from "../components/components.js";
import { cuteIcons } from "../components/components.js";
import { mascot } from "../components/mascot.js";
import { teamCard } from "./users.js";
import { isPlaceholderName } from "../services/authService.js";
import { actionCount } from "../utils/messages.js";

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

export function moreScreen(ctx = {}) {
  const { go, onLogout, user } = ctx;
  const mailCount = actionCount(user || { level: "owner" });
  return h("div", { class: "page-wrap", "data-screen-label": "more" },
    h("div", { class: "page stack", style: { paddingTop: "14px" } },
      moreHero({ title: "เพิ่มเติม", sub: "ส่วนของเจ้าของทั้งหมด · จัดการร้านได้ครบ" }),

      teamCard(ctx),

      h("div", { class: "overline ov-violet" }, "งานและทีม"),
      h("div", { class: "card more-card soft-violet" },
        moreRow({ ic: "mail", emoji: "💌", c: "violet", t: "งานและข้อความ", s: "ส่งข้อความ · มอบหมายงานให้หัวหน้า/พนักงาน · ติดตามผล", badge: mailCount, onClick: () => go({ name: "messages" }) }),
      ),

      h("div", { class: "overline ov-blue" }, "ข้อมูล & สูตร"),
      h("div", { class: "card more-card soft-blue" },
        moreRow({ ic: "db", emoji: "🗄️", c: "blue", t: "ข้อมูลกลาง", s: "เพิ่ม/ลบ/แก้/เลื่อนสลับ/ย้ายหมวด — ทุกหน้าเปลี่ยนตาม", onClick: () => go({ name: "master" }) }),
        moreRow({ ic: "users", emoji: "👥", c: "orange", t: "ค่าแรงพนักงาน", s: "รายวัน / เงินเดือน + OT — กรอกและดูสรุปค่าแรงทั้งร้าน", onClick: () => go({ name: "payroll" }) }),
        moreRow({ ic: "settings", emoji: "⚙️", c: "green", t: "ปรับค่า assumption", s: "GP% · ค่าการตลาด · ไข่/แผง · เกณฑ์สต๊อกต่ำ · เผื่อสั่งของ · ภาษี", onClick: () => go({ name: "assumptions" }) }),
        moreRow({ ic: "swap", emoji: "🔄", c: "teal", t: "แปลงหน่วย", s: "ความหมายหน่วยนับ + การเทียบ/แปลงหน่วยอัตโนมัติในระบบ", onClick: () => go({ name: "unitconvert" }) }),
        moreRow({ ic: "chefhat", emoji: "👩‍🍳", c: "violet", t: "แก้สูตรอาหาร", s: "สัดส่วน · ขั้นตอน · ล็อค/ปลดล็อคให้พนักงานดู", onClick: () => go({ name: "recipes" }) }),
      ),

      h("div", { class: "overline ov-amber" }, "รายงานเจ้าของ"),
      h("div", { class: "card more-card soft-amber" },
        moreRow({ ic: "doc", emoji: "📊", c: "blue", t: "สรุปผู้บริหาร (พร้อมปริ้น)", s: "KPI · รายได้/จ่าย · ของเสีย · พยากรณ์", onClick: () => go({ name: "execsummary" }) }),
        moreRow({ ic: "cart", emoji: "🛒", c: "amber", t: "ค่าใช้จ่ายสั่งอาหาร", s: "ปฏิทินต้นทุนรับของ · รายเมนู + ค่าส่ง · คิดจากยืนยันรับของ", onClick: () => go({ name: "orderexpense" }) }),
        moreRow({ ic: "cal", emoji: "📅", c: "green", t: "รายรับ-จ่าย รายเดือน", s: "ปฏิทิน · ยอดสุทธิ · แก้ย้อนหลัง", onClick: () => go({ name: "money" }) }),
        moreRow({ ic: "file", emoji: "🧾", c: "violet", t: "คำนวณภาษี", s: "ประมาณภาษีทั้งปี + เช็คเกณฑ์ VAT", onClick: () => go({ name: "tax" }) }),
      ),

      h("div", { class: "overline ov-rose" }, "หน้าตา"),
      h("div", { class: "card more-card soft-rose" },
        moreRow({ ic: "image", emoji: "🎨", c: "pink", t: "ปรับสี / ธีม", s: "ธีมสำเร็จรูป · ปรับสีเองตามส่วน (ปุ่มกลาง · คำเตือน · ฯลฯ)", onClick: () => go({ name: "colorsettings" }) }),
      ),

      h("div", { class: "overline ov-teal" }, "ระบบ"),
      h("div", { class: "card more-card soft-teal" },
        moreRow({ ic: "history", emoji: "🕒", c: "amber", t: "ประวัติ + แก้ย้อนหลัง", s: "ทุกการบันทึก · audit log ลบไม่ได้", onClick: () => go({ name: "history" }) }),
        moreRow({ ic: "cloud", emoji: "☁️", c: "teal", t: "ส่งออก & สำรอง", s: "Backup · ดาวน์โหลด Excel/CSV/PDF", onClick: () => go({ name: "export" }) }),
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

      h("div", { class: "card more-card soft-green rowflex", style: { gap: "13px" } },
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

      h("div", { class: "overline ov-violet" }, "งานและข้อความ"),
      h("div", { class: "card more-card soft-violet" },
        moreRow({ ic: "mail", emoji: "💌", c: "violet", t: "งานและข้อความ", s: "ข้อความและงานที่ได้รับ · รับทราบ · กดทำเสร็จ", badge: mailCount, onClick: () => go({ name: "messages" }) }),
      ),

      h("div", { class: "overline ov-blue" }, "ทางลัดของฉัน"),
      h("div", { class: "card more-card soft-blue" },
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
