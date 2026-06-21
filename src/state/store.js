// ============================================================
// state/store.js — THE single central state. One object, one set
// of accessors. The whole UI renders from here; no page keeps its
// own private copy of shared data.
//
// API (exactly these):
//   getState()                  → current state (read-only use)
//   setState(patch, opts?)      → shallow-merge patch, then notify
//                                 unless opts.silent === true
//   updateState(updaterFn)      → updaterFn(state) returns a patch
//   subscribe(fn)               → fn(state) on every notify; returns
//                                 an unsubscribe()
//   notify()                    → manually fire subscribers
//
// DRAFT PRESERVATION (important):
//   Form inputs (stock count / receive — dozens of number fields)
//   must NOT trigger a re-render on every keystroke or focus is
//   lost. Use setDraft()/getDraft() — they write into state.draft
//   AND localStorage SILENTLY (no notify). Pages read drafts on
//   render; structural changes (tab/category switch) call the
//   page's own rerender via the app shell, not a full setState.
// ============================================================

import { CONFIG } from "../config/config.js";
import { loadDraft, saveDraft, clearDraft } from "../utils/storage.js";

const state = {
  config: CONFIG,

  // session
  user: null,                 // { id, name, avatar } | null  (null = show login)
  role: "owner",              // "owner" | "staff"

  // navigation
  currentPage: "dashboard",   // route id (see router/router.js)

  // ui status (rendered into dedicated overlay layers, never the page body,
  // so toggling them never disturbs in-progress form inputs)
  loading: false,             // boolean | string(message)
  error: null,                // null | string
  toast: null,                // null | { type:"success"|"error"|"info", message, _id }

  // form drafts / autosave — keyed by draftKey (see utils/storage)
  draft: {},                  // { "draft:stockCount": {...}, ... }

  // loaded data cache (filled by services via api layer). Empty arrays in
  // skeleton round; real fetches land here later.
  data: {
    items: [],          // item_master
    stock: [],          // stock_items
    orders: [],
    receipts: [],
    income: [],
    expense: [],
    editLogs: [],
    forecast: null,
  },

  // LIFF status (see liff/liffService.js). Safe defaults when disabled.
  liff: { ready: false, inClient: false, profile: null },
};

const subscribers = new Set();

export function getState() { return state; }

export function setState(patch, opts = {}) {
  Object.assign(state, patch);
  if (!opts.silent) notify();
}

export function updateState(updaterFn) {
  const patch = updaterFn(state) || {};
  setState(patch);
}

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function notify() {
  for (const fn of subscribers) {
    try { fn(state); } catch (e) { console.error("[store] subscriber error", e); }
  }
}

// ---- Draft accessors (SILENT — never notify) ----
export function getDraft(draftKey, fallback = {}) {
  if (!(draftKey in state.draft)) {
    state.draft[draftKey] = loadDraft(draftKey, fallback);
  }
  return state.draft[draftKey];
}

export function setDraft(draftKey, value) {
  state.draft[draftKey] = value;
  saveDraft(draftKey, value);   // persist immediately — survives refresh
  // intentionally NO notify(): keeps focus/caret in number inputs
}

export function dropDraft(draftKey) {
  delete state.draft[draftKey];
  clearDraft(draftKey);
}
