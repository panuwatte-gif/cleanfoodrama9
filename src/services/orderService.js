// ============================================================
// services/orderService.js — advance orders (staff → owner). The
// Order page shows a progress indicator and a "send order" button.
// ------------------------------------------------------------
// listOrders()                  → Promise<order[]>
// saveDraftOrder(lines, by)     → Promise<order>  status:"draft"
// sendOrder(orderId, by)        → Promise<order>  status:"sent" + LINE report
//   wires: api/apiClient, services/reportService (sendOrderReport),
//          services/editLogService
// ============================================================

import * as api from "../api/apiClient.js";
import { CONFIG } from "../config/config.js";
import { logEdit } from "./editLogService.js";
import { sendOrderReport } from "./reportService.js";
import { nowISO } from "../utils/id.js";

export async function listOrders() {
  return api.select("orders", { where: { branchCode: CONFIG.DEFAULT_BRANCH_CODE } });
}

export async function saveDraftOrder(lines, by) {
  // STUB: real round upserts an order + order_lines.
  const order = await api.insert("orders", {
    branchCode: CONFIG.DEFAULT_BRANCH_CODE, status: "draft", createdBy: by,
  });
  return order;
}

export async function sendOrder(orderId, by) {
  // STUB: mark sent, then fire the LINE report (stub).
  const before = (await api.select("orders", { where: { id: orderId } }))[0] || null;
  const after = await api.update("orders", orderId, { status: "sent", sentAt: nowISO() });
  await sendOrderReport(after);
  await logEdit({ targetTable: "orders", targetId: orderId, before, after, editedBy: by });
  return after;
}
