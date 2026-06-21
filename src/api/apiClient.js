// ============================================================
// api/apiClient.js — THE ONLY GATEWAY to data.
// Decides which backend serves each call and provides offline
// resilience:
//   • CONFIG.SUPABASE_URL/ANON_KEY set → try Supabase first
//   • Supabase call fails (offline / not reachable) → fall back to
//     the localStorage mock so the app keeps working
//   • not configured → mock only
//
// Contract (logical table keys; see config.TABLES):
//   select(tableKey, { where })   → Promise<row[]>
//   insert(tableKey, row)         → Promise<row>
//   update(tableKey, id, patch)   → Promise<row|null>
//   remove(tableKey, id)          → Promise<boolean>
//
// No table names, endpoints, or SQL anywhere else in the codebase.
// ============================================================

import * as mock from "./mockApi.js";
import * as supa from "./supabaseClient.js";

// ---- connectivity state (so the UI can show online/offline) ----
let _online = supa.isConfigured(); // optimistic until proven otherwise
const _listeners = new Set();
export function isConfigured() { return supa.isConfigured(); }
export function isOnline() { return supa.isConfigured() && _online; }
export function onStatus(fn) { _listeners.add(fn); return () => _listeners.delete(fn); }
function setOnline(v) {
  if (_online === v) return;
  _online = v;
  _listeners.forEach((fn) => { try { fn(isOnline()); } catch (e) { console.error("[api] status listener", e); } });
}

// Try Supabase; on failure mark offline and fall back to the mock.
async function viaSupabaseOrMock(method, args) {
  if (!supa.isConfigured()) return mock[method](...args);
  try {
    const out = await supa[method](...args);
    setOnline(true);
    return out;
  } catch (e) {
    // network / HTTP error → degrade to localStorage so the app stays usable
    console.warn(`[api] supabase ${method} failed, using offline cache:`, e && e.message);
    setOnline(false);
    return mock[method](...args);
  }
}

export function select(tableKey, opts) { return viaSupabaseOrMock("select", [tableKey, opts]); }
export function insert(tableKey, row) { return viaSupabaseOrMock("insert", [tableKey, row]); }
export function update(tableKey, id, patch) { return viaSupabaseOrMock("update", [tableKey, id, patch]); }
export function remove(tableKey, id) { return viaSupabaseOrMock("remove", [tableKey, id]); }
export function upsertMany(tableKey, rows) { return viaSupabaseOrMock("upsertMany", [tableKey, rows]); }

// which backend is active right now (for the Settings/debug + demo strip)
export function activeBackend() { return isOnline() ? "supabase" : (supa.isConfigured() ? "supabase (offline)" : "mock"); }
