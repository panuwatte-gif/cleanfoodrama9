// ============================================================
// services/linemanService.js — สรุปยอดขาย LINE MAN
// ตอนนี้ LINE MAN ยังไม่มีไฟล์ให้โหลด → ใช้ "ยอดรวมรายวัน" จากบันทึกรายได้
// (income record ที่ ch === "Lineman") · แยกตามร้านได้ (shop)
// คำนวณได้: ยอดขายรวม · เฉลี่ย/วัน · วันขายดี-ขายน้อย (จ-อา)
// เมนูขายดี/เตรียมของ = รอไฟล์รายเมนูในอนาคต
// ============================================================
import { incomeRows } from "../data/store.js";
import { dowOf, DOW_TH } from "./grabReportService.js";

const r0 = (v) => Math.round(v);

// ยอดสุทธิ LINE MAN รายวัน (กรองร้านได้ · "all" = รวมทุกร้าน)
export function linemanDaily(shop = "all") {
  const rows = incomeRows().filter((r) => r && r.ch === "Lineman" && r.date && (shop === "all" || !shop || r.shop === shop));
  const byDate = {};
  for (const r of rows) byDate[r.date] = (byDate[r.date] || 0) + (Number(r.net) || 0);
  return Object.keys(byDate).sort().map((d) => ({ d, net: byDate[d] }));
}

export function linemanStats(shop = "all") {
  const daily = linemanDaily(shop);
  if (!daily.length) return { hasData: false };
  const total = daily.reduce((a, x) => a + x.net, 0);
  const sum = [0, 0, 0, 0, 0, 0, 0], n = [0, 0, 0, 0, 0, 0, 0];
  for (const x of daily) { const w = dowOf(x.d); sum[w] += x.net; n[w]++; }
  const byDow = sum.map((v, w) => ({ dow: DOW_TH[w], avg: n[w] ? r0(v / n[w]) : 0, has: n[w] > 0 }));
  return { hasData: true, total: r0(total), days: daily.length, avgPerDay: r0(total / daily.length), byDow, daily };
}
