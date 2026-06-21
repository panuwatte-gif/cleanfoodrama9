// ============================================================
// utils/id.js — id / time helpers. No state, no DOM.
// ============================================================

// Short unique-ish id for client-side records (mock + draft keys).
// Real DB ids come from Supabase in a later round.
export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function nowISO() {
  return new Date().toISOString();
}
