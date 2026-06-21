// ============================================================
// api/mockApi.js — in-memory + localStorage mock backend.
// Mirrors the contract the real Supabase client will expose so
// services don't care which is live. Persists to localStorage so
// data survives refresh during demos.
//
// ⚠️ This file also documents the DATA MODEL (field structure of
// every table). When the real DB is built, these comments are the
// spec. Keep them in sync with ARCHITECTURE.md.
//
// ------------------------------------------------------------
// DATA MODEL  (logical key → fields)
// ------------------------------------------------------------
// itemMaster        id, name, category, unit, costPrice(OWNER ONLY),
//                   supportsSpicySplit:bool, staffEditable:bool,
//                   isActive:bool (soft state — see delete TODO)
// stockItems        itemId, branchCode, qtySpicy?, qtyNonSpicy?,
//                   qtyTotal(SOURCE OF TRUTH), updatedAt
//                   RULE: qtySpicy + qtyNonSpicy = qtyTotal when split is
//                   used; otherwise qtyTotal is entered directly and the
//                   two split fields stay null.
// stockCounts       id, branchCode, countedBy, countedAt, note, status
// stockCountLines   id, countId, itemId, qtySpicy?, qtyNonSpicy?, qtyTotal
// wasteLogs         id, itemId, qty, reason, loggedBy, loggedAt
// orders            id, branchCode, status('draft'|'sent'|'received'),
//                   createdBy, sentAt
// orderLines        id, orderId, itemId, qty, note
// receipts          id, branchCode, receivedBy, receivedAt, status,
//                   linkedOrderId? (this branch is an INDEPENDENT entry —
//                   does NOT sync to other branches)
// receiptLines      id, receiptId, itemId, qty, costPrice?(OWNER ONLY)
//                   ON CONFIRM → adds qty into stockItems (stub this round)
// incomeRecords     id, channel(Grab/Lineman/Shopee/หน้าร้าน/อื่นๆ),
//                   grossAmount, gpFee, marketingFee, netAmount, date
// expenseRecords    id, category, amount, note, date
//                   (does NOT include goods-receiving cost — that is
//                    owner-only and tracked separately)
// menuPrices        id, name, price, isActive
// recipes           id, menuId, name, lines:[{itemId, qty}]
// forecastResults   id, generatedAt, horizonDays, results:[{itemId, low, expected, high}]
// settings          key, value (kv)
// editLogs          id, targetTable, targetId, editedBy, editedAt,
//                   before(json), after(json)   ← audit trail
// users             id, name, role('owner'|'staff'), pin?, lineUserId?
// ============================================================

import { tableName } from "../config/config.js";
import { load, save } from "../utils/storage.js";
import { uid, nowISO } from "../utils/id.js";

const STORE_KEY = "mockdb";

// Lazily-initialised in-memory db, backed by localStorage.
let db = null;

function ensureDb() {
  if (db) return db;
  db = load(STORE_KEY, null) || seed();
  return db;
}

function persist() { save(STORE_KEY, db); }

// Seed: ONLY bootstrap defaults that the app legitimately can't start
// without (a couple of master items + categories so screens aren't blank).
// Master data is fully editable in-app — this is not a hardcoded source.
function seed() {
  const fresh = {};
  // every table key starts empty
  for (const _ of []) { /* no-op */ }
  fresh.itemMaster = [];
  fresh.stockItems = [];
  fresh.stockCounts = [];
  fresh.stockCountLines = [];
  fresh.wasteLogs = [];
  fresh.orders = [];
  fresh.orderLines = [];
  fresh.receipts = [];
  fresh.receiptLines = [];
  fresh.incomeRecords = [];
  fresh.expenseRecords = [];
  fresh.menuPrices = [];
  fresh.recipes = [];
  fresh.forecastResults = [];
  fresh.settings = [];
  fresh.editLogs = [];
  fresh.users = [];
  db = fresh;
  persist();
  return fresh;
}

// ------------------------------------------------------------
// CONTRACT — services call ONLY these (never reach into db directly).
// Each takes a LOGICAL table key (e.g. "itemMaster"); tableName()
// resolves the physical name purely for parity/logging with the real
// client. Async to match the eventual network client.
// ------------------------------------------------------------

export async function select(tableKey, { where } = {}) {
  void tableName(tableKey); // validates the key exists in CONFIG
  ensureDb();
  let rows = (db[tableKey] || []).slice();
  if (where && typeof where === "object") {
    rows = rows.filter((r) => Object.entries(where).every(([k, v]) => r[k] === v));
  }
  return rows;
}

export async function insert(tableKey, row) {
  void tableName(tableKey);
  ensureDb();
  const rec = { id: row.id || uid(tableKey), ...row };
  (db[tableKey] ||= []).push(rec);
  persist();
  return rec;
}

export async function update(tableKey, id, patch) {
  void tableName(tableKey);
  ensureDb();
  const list = db[tableKey] || [];
  const i = list.findIndex((r) => r.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...patch };
  persist();
  return list[i];
}

// NOTE: hard delete. Master-data deletes that have referencing rows must
// be decided in the logic round → see masterDataService.deleteItem TODO.
export async function remove(tableKey, id) {
  void tableName(tableKey);
  ensureDb();
  const list = db[tableKey] || [];
  const i = list.findIndex((r) => r.id === id);
  if (i === -1) return false;
  list.splice(i, 1);
  persist();
  return true;
}

// Batch upsert by id (used by the data-layer background sync). Mirrors the
// real client's upsert-array path so apiClient can offer one method for both.
export async function upsertMany(tableKey, rows) {
  void tableName(tableKey);
  ensureDb();
  const list = (db[tableKey] ||= []);
  for (const row of rows || []) {
    const rec = { id: row.id || uid(tableKey), ...row };
    const i = list.findIndex((r) => r.id === rec.id);
    if (i >= 0) list[i] = { ...list[i], ...rec };
    else list.push(rec);
  }
  persist();
  return rows || [];
}

// Test/dev helper — reseed empty db.
export async function _resetMockDb() { seed(); return true; }

export { nowISO };
