// ============================================================
// pages/placeholder.js — หน้าชั่วคราวสำหรับจอที่จะสร้างในเฟสถัดไป
// (เฟส 0 = เปลือกแอป · จอจริงมาเฟส 1–3)
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, emptyState, note } from "../components/components.js";

// ชื่อ + คำอธิบาย + เฟสที่จะทำ ของแต่ละ route
export const ROUTE_INFO = {
  orderrecv:    { t: "สั่งของ / รับของ", phase: 1, ic: "truck" },
  count:        { t: "ตรวจนับสินค้าคงเหลือ", phase: 1, ic: "clipboard" },
  waste:        { t: "แยกทิ้ง / ของเสีย", phase: 1, ic: "trash" },
  stocklist:    { t: "สินค้าคงเหลือ", phase: 1, ic: "box" },
  stockdetail:  { t: "รายละเอียดสต๊อก (FIFO)", phase: 1, ic: "box" },
  income:       { t: "บันทึกรายได้", phase: 3, ic: "wallet" },
  expense:      { t: "บันทึกค่าใช้จ่าย", phase: 3, ic: "receipt" },
  money:        { t: "รายรับ-จ่าย รายเดือน", phase: 3, ic: "cal" },
  master:       { t: "ข้อมูลกลาง", phase: 2, ic: "db" },
  payroll:      { t: "ค่าแรงพนักงาน", phase: 2, ic: "users" },
  assumptions:  { t: "ปรับค่า assumption", phase: 2, ic: "settings" },
  unitconvert:  { t: "แปลงหน่วย", phase: 2, ic: "swap" },
  recipes:      { t: "สูตรอาหาร", phase: 2, ic: "chefhat" },
  colorsettings:{ t: "ปรับสี / ธีม", phase: 2, ic: "image" },
  history:      { t: "ประวัติ + แก้ย้อนหลัง", phase: 2, ic: "history" },
  export:       { t: "ส่งออก & สำรอง", phase: 3, ic: "cloud" },
  forecast:     { t: "พยากรณ์ยอดขาย 7 วัน", phase: 3, ic: "trend" },
  tax:          { t: "คำนวณภาษี", phase: 3, ic: "file" },
  execsummary:  { t: "สรุปผู้บริหาร", phase: 3, ic: "doc" },
  orderexpense: { t: "ค่าใช้จ่ายสั่งอาหาร", phase: 3, ic: "cart" },
  linesend:     { t: "ส่งเข้ากลุ่ม LINE", phase: 3, ic: "chat" },
  dailyreport:  { t: "ส่งรายงานประจำวัน", phase: 3, ic: "doc" },
  menulist:     { t: "เมนู · ราคาขาย", phase: 2, ic: "tag" },
  music:        { t: "เพลงร้าน", phase: 2, ic: "music" },
  manual:       { t: "คู่มือพนักงาน", phase: 2, ic: "book" },
};

export function placeholderScreen(route, { onBack } = {}) {
  const info = ROUTE_INFO[route.name] || { t: "หน้าจอ", phase: "ถัดไป", ic: "leaf" };
  return h("div", { class: "page-wrap", "data-screen-label": route.name },
    hdr({ title: info.t, sub: "กำลังจะมาในเฟส " + info.phase, onBack }),
    h("div", { class: "page stack" },
      emptyState({
        iconName: info.ic,
        title: "หน้านี้พร้อมต่อในเฟสถัดไป",
        sub: 'เฟส 0 วางรากฐานเสร็จแล้ว (ภาษาการออกแบบ · ข้อมูลกลาง · สูตร · เปลือกแอป) — หน้า "' + info.t + '" จะถูกสร้างในเฟส ' + info.phase,
      }),
      note("ข้อมูลกลาง + สูตรทั้งหมดพร้อมใช้แล้ว · จอนี้แค่รอประกอบ UI ตามต้นแบบ prototype"),
    ),
  );
}

// แท็บ ข้อมูล / รายงาน — placeholder เฟส 0
export function tabPlaceholder(tabId) {
  const map = {
    data: { t: "ข้อมูล", sub: "เมนู · สูตร · สินค้าคงเหลือ", ic: "db", phase: 2 },
    reports: { t: "รายงาน", sub: "ขายดี · พยากรณ์ · รายรับ-จ่าย", ic: "doc", phase: 3 },
  };
  const info = map[tabId] || map.data;
  return h("div", { class: "page-wrap", "data-screen-label": tabId },
    hdr({ title: info.t, sub: info.sub }),
    h("div", { class: "page stack" },
      emptyState({ iconName: info.ic, title: "หน้านี้พร้อมต่อในเฟสถัดไป", sub: 'แท็บ "' + info.t + '" จะถูกสร้างในเฟส ' + info.phase }),
    ),
  );
}
