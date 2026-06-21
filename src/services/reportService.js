// ============================================================
// services/reportService.js — outbound messages to LINE / webhook
// (order slips, daily reports). Guarded by FEATURE_FLAGS.enableLineReport
// and CONFIG.REPORT_WEBHOOK_URL. NEVER holds a secret — it POSTs a JSON
// payload to a PUBLIC webhook URL (LINE Messaging API relay / make.com /
// n8n) that performs the authenticated push to the group SERVER-SIDE.
// ------------------------------------------------------------
// Result contract (always resolves, never throws):
//   { ok: true }                      sent (HTTP 2xx)
//   { ok: false, skipped: true }      no webhook configured (demo mode)
//   { ok: false, error: "<reason>" }  network / HTTP error
// ------------------------------------------------------------
// sendLineReport({ title, text, topics, asImage, shop, by })
// sendOrderReport(order)              order slip → LINE
// sendDailySummary(summary)           daily numbers → LINE
// ============================================================

import { CONFIG } from "../config/config.js";

// webhook is usable only when the feature is on AND a URL is set
function ready() {
  return Boolean(CONFIG.FEATURE_FLAGS.enableLineReport && CONFIG.REPORT_WEBHOOK_URL);
}

// the ONLY network call in this module. No token/secret travels with it —
// the receiving webhook owns the LINE channel access token server-side.
async function postWebhook(payload) {
  if (!ready()) return { ok: false, skipped: true, reason: "no-webhook" };
  try {
    const res = await fetch(CONFIG.REPORT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app: "CleanFoodRama9",
        branch: CONFIG.DEFAULT_BRANCH_CODE,
        sentAt: new Date().toISOString(),
        ...payload,
      }),
    });
    if (!res.ok) return { ok: false, error: "HTTP " + res.status };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) || "network" };
  }
}

// ---- daily store report (from pages/linesend.js) ----
// text = ข้อความที่ระบบแต่งให้ (mirror ของ preview) · topics = หัวข้อที่ติ๊ก
export async function sendLineReport({ title, text, topics, asImage, shop, by } = {}) {
  return postWebhook({
    type: "daily_report",
    title: title || "รายงานร้าน",
    text: text || "",
    topics: topics || [],
    asImage: Boolean(asImage),   // bot ฝั่ง server แปลงเป็นรูปถ้า true
    shop: shop || "",
    by: by || "",
  });
}

// ---- order slip (from pages/orderrecv.js · services/orderService.js) ----
export async function sendOrderReport(order) {
  return postWebhook({
    type: "order",
    title: "ใบสั่งของ",
    text: formatOrderText(order),
    shop: (order && order.shop) || "",
    by: (order && order.by) || "",
  });
}

// ---- daily numbers summary (kept for orderService / finance) ----
export async function sendDailySummary(summary) {
  return postWebhook({
    type: "daily_summary",
    title: "สรุปประจำวัน",
    text: (summary && summary.text) || "",
    summary: summary || {},
  });
}

// Build the LINE order-slip text from a generic order shape:
//   { lines:[{ name, qty, unit }], shop, date }  (page)  OR
//   { order_lines:[...] }                        (relational, future)
function formatOrderText(order) {
  if (!order) return "🧾 ใบสั่งของ";
  if (order.text) return order.text;
  const lines = order.lines || order.order_lines || [];
  const head = "🧾 ใบสั่งของ — " + (order.shop || "") + (order.date ? " · " + order.date : "");
  const body = lines.length
    ? lines.map((l) => "• " + (l.name || l.itemId || "") + " " + (l.qty ?? "") + (l.unit ? " " + l.unit : "")).join("\n")
    : "(ไม่มีรายการ)";
  return head + "\n" + body;
}
