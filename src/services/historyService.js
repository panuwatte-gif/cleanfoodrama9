// ============================================================
// services/historyService.js — activity & retroactive-edit history.
// Powers the History page (recent records + their edit logs).
// ------------------------------------------------------------
// listActivity({ limit? }) → Promise<activityItem[]>  (stub; merges
//                            recent counts/receipts/income/expense)
// listEditLogs(where)      → Promise<editLog[]>  (delegates to editLogService)
// wires: api/apiClient, services/editLogService
// ============================================================

import { listEditLogs } from "./editLogService.js";

export async function listActivity() {
  // STUB: real round merges + sorts recent rows across tables into one feed.
  return [];
}

export { listEditLogs };
