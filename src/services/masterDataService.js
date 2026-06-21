// ============================================================
// services/masterDataService.js — central master data (item_master,
// categories, units, menus, recipes). ALL editable in-app; nothing
// is a hardcoded array in page code. costPrice is OWNER-ONLY.
// ------------------------------------------------------------
// listItems({ category?, activeOnly? }) → Promise<item[]>
// getItem(id)                           → Promise<item|null>
// upsertItem(item, editedBy)            → Promise<item>   (logs edit)
// deleteItem(id, editedBy)              → Promise<boolean> (see TODO)
// listCategories()                      → Promise<string[]>
// listUnits()                           → Promise<string[]>
// listMenus() / listRecipes()           → Promise<row[]>
// wires: api/apiClient, services/editLogService, config (CATEGORY_SEED)
// ============================================================

import * as api from "../api/apiClient.js";
import { CONFIG } from "../config/config.js";
import { logEdit } from "./editLogService.js";

export async function listItems({ category, activeOnly = true } = {}) {
  let rows = await api.select("itemMaster");
  if (activeOnly) rows = rows.filter((r) => r.isActive !== false);
  if (category) rows = rows.filter((r) => r.category === category);
  return rows; // [] in skeleton round
}

export async function getItem(id) {
  const rows = await api.select("itemMaster", { where: { id } });
  return rows[0] || null;
}

export async function upsertItem(item, editedBy) {
  // STUB: real round validates required fields + owner-only costPrice.
  if (item.id) {
    const before = await getItem(item.id);
    const after = await api.update("itemMaster", item.id, item);
    await logEdit({ targetTable: "itemMaster", targetId: item.id, before, after, editedBy });
    return after;
  }
  const created = await api.insert("itemMaster", { isActive: true, ...item });
  await logEdit({ targetTable: "itemMaster", targetId: created.id, before: null, after: created, editedBy });
  return created;
}

export async function deleteItem(id, editedBy) {
  // TODO(next round / DECISION NEEDED): an item referenced by stock /
  // counts / recipes / orders must NOT be hard-deleted. Decide between
  //   (a) soft-delete  → set isActive:false (recommended), or
  //   (b) block delete  → if any referencing row exists.
  // For now: soft-delete + log.
  const before = await getItem(id);
  const after = await api.update("itemMaster", id, { isActive: false });
  await logEdit({ targetTable: "itemMaster", targetId: id, before, after, editedBy });
  return true;
}

export async function listCategories() {
  // STUB: merge seed defaults with any custom categories saved in settings.
  return CONFIG.CATEGORY_SEED.slice();
}

export async function listUnits() {
  // STUB: real round reads distinct units from item_master / settings.
  return ["กก.", "ขีด", "ชิ้น", "ฟอง", "ถุง", "กล่อง", "ขวด", "แพ็ค", "อื่นๆ"];
}

export async function listMenus() { return api.select("menuPrices"); }
export async function listRecipes() { return api.select("recipes"); }
