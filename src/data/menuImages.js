// ============================================================
// data/menuImages.js — ทะเบียนรูปเมนูกลาง (ใช้ร่วมกันทั้งแอป)
// รูปตัดจากชีตพาสเทล (assets/menus/*.png · พื้นหลังโปร่งใส)
// dishSlug(name) จับคู่ชื่อเมนู → slug ด้วยคีย์เวิร์ด (เมนู/รายการเดียวกัน = รูปเดียวกันทุกจุด)
// menuThumb(name,size) คืน element รูป (หรือ null ถ้าไม่มีรูปตรง)
// เพิ่มรูปใหม่: วางไฟล์ assets/menus/<slug>.png แล้วเพิ่มกติกาใน dishSlug()
// ============================================================

import { h } from "../utils/dom.js";

const BASE = "assets/menus/";
export const MENU_IMAGE_SLUGS = [
  "kaprao-nuea", "kaprao-okkai", "kaprao-sankai-num", "okkai-num",
  "kaprao-kung", "kung-kratiam", "kaprao-musly", "sankai-kratiam",
  "namprik-ong-salmon", "kung-op-woonsen", "kung-khua-prikklua", "musly-kratiam",
  "okkai-prikthaidam", "okkai-tonhom", "kung-khaikem", "sankai-khaikem", "kaprao-ped",
];

// จับคู่ชื่อ → slug · เรียงจาก "เฉพาะเจาะจงสุด" ไป "กว้างสุด"
export function dishSlug(raw) {
  const s = String(raw || "");
  const has = (...ks) => ks.every((k) => s.includes(k));
  const any = (...ks) => ks.some((k) => s.includes(k));
  // ข้าม add-on / ไข่เดี่ยว / เครื่องดื่ม (ไม่มีรูปตรง)
  if (any("ชาไทย", "มัทฉะ", "ลาเต้", "latte", "Tea", "Juice", "Cal", "kcal เครื่องดื่ม")) { /* เผื่อชนคำ */ }
  if (any("แก้วพร้อม", "น้ำแข็ง")) return null;
  if (/^น้ำ|เลมอน|ลำไย|องุ่น|แอปเ|มะพร้าว|มะปี๊ด|ส้มจี๊ด/.test(s) && !has("พริก")) return null;
  if (has("ไข่") && !any("ไข่เค็ม")) return null; // ไข่ข้น/ดาว/ต้ม/ดอง = add-on

  // กุ้ง (จำเพาะก่อน)
  if (has("อ่อง") || (has("น้ำพริก") && has("แซลมอน"))) return "namprik-ong-salmon";
  if (has("วุ้นเส้น")) return "kung-op-woonsen";
  if (has("กุ้ง") && has("ไข่เค็ม")) return "kung-khaikem";
  if (has("กุ้ง") && any("พริกเกลือ", "คั่ว")) return "kung-khua-prikklua";
  if (has("กุ้ง") && has("กระเทียม")) return "kung-kratiam";
  if (has("กะเพรา") && has("กุ้ง")) return "kaprao-kung";
  if (has("กุ้ง")) return "kaprao-kung";
  // เป็ด
  if (has("เป็ด")) return "kaprao-ped";
  // ไข่เค็ม (ไก่/สันใน)
  if (has("ไข่เค็ม")) return "sankai-khaikem";
  // อกไก่ ผัดต่างๆ
  if (has("พริกไทยดำ")) return "okkai-prikthaidam";
  if (has("ต้นหอม")) return "okkai-tonhom";
  if (has("สันใน") && has("กระเทียม")) return "sankai-kratiam";
  if (has("อกไก่") && has("กระเทียม")) return "sankai-kratiam";
  // หมูสไลด์
  if (has("หมูสไลด์") && has("กระเทียม")) return "musly-kratiam";
  if (has("หมู")) return "kaprao-musly";
  // กะเพรา ตามเนื้อสัตว์
  if (has("กะเพรา") && has("สันใน")) return "kaprao-sankai-num";
  if (has("กะเพรา") && any("อกไก่", "ไก่")) return "kaprao-okkai";
  if (has("แซลมอน")) return "namprik-ong-salmon"; // แซลมอนอื่นๆ → โชว์แซลมอน
  if (any("อกไก่", "สันในไก่", "ไก่")) return "okkai-num";
  if (has("เนื้อ")) return "kaprao-nuea";
  if (has("กะเพรา")) return "kaprao-nuea";
  return null;
}

export function dishImageUrl(raw) {
  const slug = dishSlug(raw);
  return slug ? BASE + slug + ".png" : null;
}

// element รูปสี่เหลี่ยมมนพื้นขาว (กลมกลืนบนการ์ดขาว) — คืน null ถ้าไม่มีรูปตรง
export function menuThumb(raw, size = 44, extra = {}) {
  const url = dishImageUrl(raw);
  if (!url) return null;
  return h("span", {
    class: "menu-thumb", "aria-hidden": "true",
    style: {
      width: size + "px", height: size + "px", flex: "none", display: "block",
      borderRadius: Math.round(size * 0.28) + "px",
      backgroundColor: "#fff", backgroundImage: 'url("' + url + '")',
      backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat",
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,.05)",
      ...extra,
    },
  });
}
