// ============================================================
// services/editLogService.js — audit trail. EVERY retroactive edit
// across the app must be recorded here (who / when / what before→after).
// Other services call logEdit() right after they mutate a record.
// ------------------------------------------------------------
// logEdit({ targetTable, targetId, before, after, editedBy }) → Promise<editLog>
//   in:  targetTable (logical key), targetId, before(obj), after(obj), editedBy(userId)
//   out: the stored edit_logs row
//   wires: api/apiClient.insert("editLogs", ...)
// listEditLogs({ targetTable?, targetId? }) → Promise<row[]>
// ============================================================

import * as api from "../api/apiClient.js";
import { getState } from "../state/store.js";
import { nowISO } from "../utils/id.js";

export async function logEdit({ targetTable, targetId, before = null, after = null, editedBy } = {}) {
  const by = editedBy || getState().user?.id || "unknown";
  // STUB: real round may also diff before/after to a compact change set.
  return api.insert("editLogs", {
    targetTable, targetId, before, after,
    editedBy: by, editedAt: nowISO(),
  });
}

export async function listEditLogs(where = {}) {
  return api.select("editLogs", { where });
}
