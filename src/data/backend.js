// ============================================================
// data/backend.js — background sync between the local data layer
// (data/store.js, the instant localStorage cache the screens read)
// and Supabase, THROUGH the api gateway (apiClient → supabase|mock).
//
// Why this shape: the screens read data SYNCHRONOUSLY (formulas call
// items(), cats(), ...). So we keep an in-memory cache hydrated from
// localStorage for instant first paint, then:
//   • hydrateData()  — on boot, pull each collection from Supabase and
//                      adopt it (or, if the cloud is empty but online,
//                      seed the cloud from local). bumpData() re-renders.
//   • scheduleSync() — on every local write (store.persist), debounce a
//                      push of all collections up to Supabase (+ deletes).
//
// Offline / unconfigured → apiClient quietly serves the localStorage
// mock, so nothing here throws and the app keeps working; changes sync
// the next time the cloud is reachable.
//
// Table names live ONLY in config.TABLES — every call uses a logical key.
// ============================================================

import * as api from "../api/apiClient.js";
import {
  initData, bumpData, __adoptRemote,
  cats, items, menus, assumptions, stockRows, nutriMenu, nutriIngr, users, tasksRows, recipesRows, manualRows, payrollRows, incomeRows, expenseRows, songsRows, priceRows, countsRows, salesRows,
} from "./store.js";
import { getEditLogs, adoptEditLogs } from "./editlog.js";

// logical store collection → { gateway table key, storage kind }
const COLLECTIONS = [
  { coll: "cats",        key: "categories",          kind: "array", get: cats },
  { coll: "items",       key: "itemMaster",          kind: "array", get: items },
  { coll: "menus",       key: "menuPrices",          kind: "array", get: menus },
  { coll: "assumptions", key: "assumptions",         kind: "array", get: assumptions },
  { coll: "stock",       key: "stockItems",          kind: "array", get: stockRows },
  { coll: "nutriMenu",   key: "nutritionMenu",       kind: "map",   get: nutriMenu },
  { coll: "nutriIngr",   key: "nutritionIngredient", kind: "map",   get: nutriIngr },
  { coll: "users",       key: "users",  readKey: "usersSafe", noPush: true, kind: "array", get: users },
  { coll: "tasks",       key: "tasks",               kind: "array", get: tasksRows },
  { coll: "recipes",     key: "recipes",             kind: "array", get: recipesRows },
  { coll: "payroll",     key: "payroll",             kind: "array", get: payrollRows },
  { coll: "songs",       key: "songs",               kind: "array", get: songsRows },
  { coll: "priceList",   key: "priceList",           kind: "array", get: priceRows },
  { coll: "counts",      key: "stockCounts",         kind: "array", get: countsRows },
  { coll: "salesDaily",  key: "salesDaily",          kind: "array", get: salesRows },
  { coll: "income",      key: "incomeRecords",       kind: "array", get: incomeRows },
  { coll: "expense",     key: "expenseRecords",      kind: "array", get: expenseRows },
  // audit trail lives in its OWN module (editlog.js, no store db) → adopt via callback
  { coll: "editLogs",    key: "editLogs",            kind: "array", get: getEditLogs, adopt: adoptEditLogs },
];

// Each row is stored as { id, data } — the whole object lives in the jsonb
// `data` column, so the irregular shapes (cats.subs, stock.lots, nutri maps)
// round-trip without a brittle column-per-field mapping.
function rowsFor(d) {
  const v = d.get();
  if (d.kind === "map") return Object.entries(v || {}).map(([id, data]) => ({ id, data }));
  return (v || []).map((el) => ({ id: el.id, data: el }));
}
function shapeFromRows(d, rows) {
  if (d.kind === "map") {
    const m = {};
    for (const r of rows) m[r.id] = r.data;
    return m;
  }
  return rows.map((r) => r.data).filter(Boolean);
}

// remember which ids we last had in the cloud, per collection, so a local
// hard-delete (e.g. removing a category) is mirrored as a remote delete.
const lastIds = {};

// ---- hydrate (boot): pull from cloud, adopt or seed ----
export async function hydrateData() {
  initData();
  if (!api.isConfigured()) return; // pure localStorage mode — nothing to do
  for (const d of COLLECTIONS) {
    let rows = null;
    try { rows = await api.select(d.readKey || d.key); } catch { rows = null; }
    if (rows && rows.length) {
      const shaped = shapeFromRows(d, rows);
      if (d.adopt) d.adopt(shaped); else __adoptRemote(d.coll, shaped); // cloud wins (editLogs merges)
      lastIds[d.coll] = new Set(rows.map((r) => r.id));
    } else if (api.isOnline() && !d.noPush) {
      const local = rowsFor(d);                            // cloud empty but online → seed it
      if (local.length) { try { await api.upsertMany(d.key, local); } catch { /* ignore */ } }
      lastIds[d.coll] = new Set(local.map((r) => r.id));
    }
  }
  bumpData(); // re-render every page with the now-authoritative data
}

// ---- push (debounced): mirror local → cloud on every write ----
let timer = null;
export function scheduleSync() {
  if (!api.isConfigured()) return;
  clearTimeout(timer);
  timer = setTimeout(syncNow, 1200);
}

async function syncNow() {
  if (!api.isConfigured()) return;
  for (const d of COLLECTIONS) {
    if (d.noPush) continue;            // users ไม่ push (จัดการผ่าน edge function)
    const rows = rowsFor(d);
    try {
      await api.upsertMany(d.key, rows);
      const curIds = new Set(rows.map((r) => r.id));
      const prev = lastIds[d.coll];
      if (prev) for (const id of prev) if (!curIds.has(id)) await api.remove(d.key, id);
      lastIds[d.coll] = curIds;
    } catch { /* offline — apiClient already fell back to cache; retry next write */ }
  }
}

// re-export connectivity for the UI (demo strip / settings)
export const isOnline = api.isOnline;
export const isConfigured = api.isConfigured;
export const activeBackend = api.activeBackend;
export const onStatus = api.onStatus;
