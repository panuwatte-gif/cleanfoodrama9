// ============================================================
// services/stockService.js — on-hand stock, counts, and waste.
// Spicy/non-spicy rule lives here: qtySpicy + qtyNonSpicy = qtyTotal
// when split is used; otherwise qtyTotal is entered directly.
// ------------------------------------------------------------
// listStock()                          → Promise<stockItem[]>
// resolveQty({qtySpicy,qtyNonSpicy,qtyTotal}) → {qtySpicy,qtyNonSpicy,qtyTotal}
//                                         normalises a line (pure, no IO)
// saveCount(header, lines, by)         → Promise<count>  (stub; logs)
// logWaste({itemId, qty, reason}, by)  → Promise<wasteLog>
// wires: api/apiClient, services/editLogService, config.FEATURE_FLAGS
// ============================================================

import * as api from "../api/apiClient.js";
import { CONFIG } from "../config/config.js";
import { logEdit } from "./editLogService.js";
import { nowISO } from "../utils/id.js";

export async function listStock() {
  return api.select("stockItems", { where: { branchCode: CONFIG.DEFAULT_BRANCH_CODE } });
}

// Pure helper — single source of the spicy/total rule (no business
// forecast logic, just arithmetic the UI also uses live).
export function resolveQty({ qtySpicy = null, qtyNonSpicy = null, qtyTotal = null } = {}) {
  const hasSplit = qtySpicy != null || qtyNonSpicy != null;
  if (hasSplit && CONFIG.FEATURE_FLAGS.enableSpicySplit) {
    const total = (Number(qtySpicy) || 0) + (Number(qtyNonSpicy) || 0);
    return { qtySpicy, qtyNonSpicy, qtyTotal: total };
  }
  return { qtySpicy: null, qtyNonSpicy: null, qtyTotal };
}

export async function saveCount(header, lines, by) {
  // STUB: real round writes a stock_counts header + stock_count_lines,
  // then updates stock_items.qtyTotal as the new source of truth.
  const count = await api.insert("stockCounts", {
    branchCode: CONFIG.DEFAULT_BRANCH_CODE,
    countedBy: by, countedAt: nowISO(), ...header,
  });
  // TODO: persist lines + apply to stockItems
  await logEdit({ targetTable: "stockCounts", targetId: count.id, before: null, after: { lineCount: lines?.length || 0 }, editedBy: by });
  return count;
}

export async function logWaste({ itemId, qty, reason }, by) {
  // STUB: real round subtracts qty from stock_items on confirm.
  return api.insert("wasteLogs", { itemId, qty, reason, loggedBy: by, loggedAt: nowISO() });
}
