// ============================================================
// api/supabaseClient.js — REAL Supabase backend (Phase 4a).
// Exposes the SAME contract as mockApi so apiClient can swap
// between them transparently:
//   select(tableKey, { where }) → Promise<row[]>
//   insert(tableKey, row)       → Promise<row>   (upsert by id)
//   update(tableKey, id, patch) → Promise<row|null>
//   remove(tableKey, id)        → Promise<boolean>
//
// The client (@supabase/supabase-js v2) is loaded lazily from a CDN
// via dynamic import on first use, so nothing is fetched while the app
// runs offline / unconfigured. Table names are resolved ONLY through
// config.tableName(key) — never hardcoded here.
//
// On any network/HTTP error these methods THROW; apiClient catches and
// falls back to the localStorage mock so the app keeps working offline.
// ============================================================

import { CONFIG, tableName } from "../config/config.js";

// pinned ESM build of supabase-js v2
const SUPABASE_ESM = "https://esm.sh/@supabase/supabase-js@2.45.4";

export function isConfigured() {
  return Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
}

// ---- lazy singleton client ----
let _clientPromise = null;
export function getClient() {
  if (!isConfigured()) {
    throw new Error("[supabaseClient] not configured — set CONFIG.SUPABASE_URL / SUPABASE_ANON_KEY");
  }
  if (!_clientPromise) {
    _clientPromise = import(/* @vite-ignore */ SUPABASE_ESM)
      .then(({ createClient }) =>
        createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
          // เก็บ session ของผู้ที่ล็อกอินจริง (ผ่าน edge function) ไว้ข้ามรีเฟรช
          auth: { persistSession: true, autoRefreshToken: true, storageKey: "cfr9:sb-auth" },
        })
      )
      .catch((e) => {
        _clientPromise = null; // allow a later retry
        throw e;
      });
  }
  return _clientPromise;
}

function fail(op, error) {
  const msg = error && error.message ? error.message : String(error);
  throw new Error(`[supabase:${op}] ${msg}`);
}

// ------------------------------------------------------------
// CONTRACT (mirrors mockApi)
// ------------------------------------------------------------
export async function select(tableKey, { where } = {}) {
  const sb = await getClient();
  let q = sb.from(tableName(tableKey)).select("*");
  if (where && typeof where === "object") {
    for (const [k, v] of Object.entries(where)) q = q.eq(k, v);
  }
  const { data, error } = await q;
  if (error) fail("select", error);
  return data || [];
}

export async function insert(tableKey, row) {
  const sb = await getClient();
  // upsert by primary key so re-seeding / re-saving the same id is idempotent
  const { data, error } = await sb
    .from(tableName(tableKey))
    .upsert(row, { onConflict: "id" })
    .select()
    .maybeSingle();
  if (error) fail("insert", error);
  return data || row;
}

export async function update(tableKey, id, patch) {
  const sb = await getClient();
  const { data, error } = await sb
    .from(tableName(tableKey))
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) fail("update", error);
  return data || null;
}

// batch upsert (used by the data-layer background sync) — one round-trip
export async function upsertMany(tableKey, rows) {
  if (!rows || !rows.length) return [];
  const sb = await getClient();
  const { data, error } = await sb
    .from(tableName(tableKey))
    .upsert(rows, { onConflict: "id" })
    .select();
  if (error) fail("upsertMany", error);
  return data || [];
}

export async function remove(tableKey, id) {
  const sb = await getClient();
  const { error } = await sb.from(tableName(tableKey)).delete().eq("id", id);
  if (error) fail("remove", error);
  return true;
}

// ============================================================
// ระบบล็อกอินที่ปลอดภัย + จัดการผู้ใช้ — คุยกับ edge function "rama9-auth"
// (ตรวจรหัสฝั่งเซิร์ฟเวอร์ · รหัสไม่หลุดมา client · ออก session จริง)
// ============================================================
const AUTH_FN_URL = () => `${CONFIG.SUPABASE_URL}/functions/v1/rama9-auth`;

// เรียกฟังก์ชัน · useUserToken=true → แนบ token ของผู้ที่ล็อกอิน (สำหรับงานเจ้าของ)
async function callAuthFn(payload, useUserToken = false) {
  let token = CONFIG.SUPABASE_ANON_KEY;
  if (useUserToken) {
    try {
      const sb = await getClient();
      const { data } = await sb.auth.getSession();
      if (data && data.session && data.session.access_token) token = data.session.access_token;
    } catch (_) { /* ใช้ anon */ }
  }
  const res = await fetch(AUTH_FN_URL(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ล็อกอินด้วย PIN → ตรวจที่เซิร์ฟเวอร์ → ตั้ง session ให้ client → คืน { ok, user }
export async function loginWithPin(pin) {
  const out = await callAuthFn({ action: "login", pin });
  if (out && out.ok && out.session) {
    const sb = await getClient();
    await sb.auth.setSession({
      access_token: out.session.access_token,
      refresh_token: out.session.refresh_token,
    });
  }
  return out;
}

// งานเจ้าของ (เซิร์ฟเวอร์บังคับสิทธิ์เอง — client เรียกได้แต่ถ้าไม่ใช่เจ้าของจะถูกปฏิเสธ)
export const resetUserPin   = (target_id, new_pin) => callAuthFn({ action: "reset_pin", target_id, new_pin }, true);
export const addUser        = (name, level, pin)   => callAuthFn({ action: "add_user", name, level, pin }, true);
export const setUser        = (target_id, patch)   => callAuthFn({ action: "set_user", target_id, ...patch }, true);
export const deleteUser     = (target_id)          => callAuthFn({ action: "delete_user", target_id }, true);
export const changeOwnPin   = (old_pin, new_pin)   => callAuthFn({ action: "change_own_pin", old_pin, new_pin }, true);

export async function currentSession() {
  try { const sb = await getClient(); const { data } = await sb.auth.getSession(); return (data && data.session) || null; }
  catch (_) { return null; }
}
export async function signOut() {
  try { const sb = await getClient(); await sb.auth.signOut(); } catch (_) { /* ignore */ }
}
