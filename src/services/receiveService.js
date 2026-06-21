// ============================================================
// services/receiveService.js — actual goods received (this branch is
// an INDEPENDENT entry; does NOT sync to other branches). On confirm,
// quantities ADD into stock_items (stubbed this round).
// ------------------------------------------------------------
// listReceipts()                   → Promise<receipt[]>
// confirmReceipt(header, lines, by)→ Promise<receipt>  (stub; logs)
//   TODO(next round): for each line add qty into stock_items.qtyTotal
//   and record costPrice (OWNER-ONLY) on receipt_lines.
// wires: api/apiClient, services/stockService, services/editLogService
// ============================================================

import * as api from "../api/apiClient.js";
import { CONFIG } from "../config/config.js";
import { logEdit } from "./editLogService.js";
import { nowISO } from "../utils/id.js";

export async function listReceipts() {
  return api.select("receipts", { where: { branchCode: CONFIG.DEFAULT_BRANCH_CODE } });
}

export async function confirmReceipt(header, lines, by) {
  const receipt = await api.insert("receipts", {
    branchCode: CONFIG.DEFAULT_BRANCH_CODE,
    receivedBy: by, receivedAt: nowISO(), status: "confirmed", ...header,
  });
  // TODO: persist receipt_lines + add quantities into stock_items.
  await logEdit({ targetTable: "receipts", targetId: receipt.id, before: null, after: { lineCount: lines?.length || 0 }, editedBy: by });
  return receipt;
}
