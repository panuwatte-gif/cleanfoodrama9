// ============================================================
// utils/storage.js — localStorage wrapper (namespaced + safe JSON).
// Two uses:
//   1. DRAFT / AUTOSAVE for forms (stock count, receive, etc.) so a
//      re-render or accidental refresh never loses dozens of typed
//      number inputs.
//   2. The mock data layer persists here too (see api/mockApi.js).
// Everything is prefixed with the app key so deploys don't collide.
// ============================================================

const PREFIX = "cfr9:"; // CleanFoodRama9

function key(k) { return PREFIX + k; }

export function load(k, fallback = null) {
  try {
    const raw = localStorage.getItem(key(k));
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(k, value) {
  try { localStorage.setItem(key(k), JSON.stringify(value)); } catch { /* quota / private mode */ }
}

export function remove(k) {
  try { localStorage.removeItem(key(k)); } catch { /* noop */ }
}

// ---- Draft helpers (per form) ----
// draftKey is a stable string per form, e.g. "draft:stockCount" or
// "draft:receive". Value is whatever the page wants (usually a map of
// itemId → typed value).
export function loadDraft(draftKey, fallback = {}) { return load(draftKey, fallback); }
export function saveDraft(draftKey, value) { save(draftKey, value); }
export function clearDraft(draftKey) { remove(draftKey); }
