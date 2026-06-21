// ============================================================
// services/authService.js — เข้าระบบจริง (PIN 4 หลัก) + LIFF (ออปชัน)
// ------------------------------------------------------------
// ตรวจ PIN เทียบ "ผู้ใช้" ในชั้นข้อมูลกลาง (data/store.js → rama9_users)
// ไม่มี stub ที่รับทุกรหัสอีกแล้ว
//
// LEVELS — ระดับสิทธิ์ (เรียงสูง→ต่ำ): เจ้าของ > หัวหน้า > พนักงาน
//   appRole = สิทธิ์ที่ "เปลือกแอป" ใช้คุมเมนู (owner เห็นแท็บเพิ่มเติม)
//   ตอนนี้ lead/staff ยัง appRole=staff เท่ากัน (ปรับแยกภายหลังได้)
//
// login(pin)        → { ok, user } | { ok:false, reason:"notfound"|"blocked" }
// initSession()     → Promise<user|null>  (LIFF auto-login เมื่อ ENABLED=true)
// logout()          → void  (เปลือกแอปเป็นคนเคลียร์ session cfr9:session)
// ============================================================

import { CONFIG } from "../config/config.js";
import { findUserByPin, getUsers } from "../data/store.js";
import * as supa from "../api/supabaseClient.js";
import * as liffService from "../liff/liffService.js";
import { toAppUser } from "../liff/liffAdapter.js";

// ระดับสิทธิ์ — single source ของ label/อันดับ/appRole
export const LEVELS = {
  owner: { key: "owner", label: "เจ้าของ", rank: 3, appRole: "owner" },
  lead:  { key: "lead",  label: "หัวหน้า", rank: 2, appRole: "staff" },
  staff: { key: "staff", label: "พนักงาน", rank: 1, appRole: "staff" },
};
// เรียงสูง→ต่ำ (ใช้ทำ dropdown/รายการ)
export const LEVEL_ORDER = ["owner", "lead", "staff"];

export const levelInfo = (level) => LEVELS[level] || LEVELS.staff;
export const appRoleOf = (u) => levelInfo(u && u.level).appRole;
export const rankOf = (u) => levelInfo(u && u.level).rank;

// ชื่อยังเป็น "user<เลข>" = ยังไม่ได้ตั้งชื่อ → ถือว่า login นี้ยังไม่มีผู้ใช้งาน
export const isPlaceholderName = (name) => /^user\s*\d+$/i.test(String(name || "").trim());

// ---- login ปกติผ่านเบราว์เซอร์ (PIN 4 หลัก) ----
export async function login(pin) {
  const code = String(pin || "").trim();
  if (!/^\d{4}$/.test(code)) return { ok: false, reason: "notfound" };

  // ทางหลัก: ตรวจรหัสที่ "เซิร์ฟเวอร์" (edge function rama9-auth) — รหัสไม่หลุดมาเครื่อง
  if (supa.isConfigured && supa.isConfigured()) {
    try {
      const out = await supa.loginWithPin(code);
      if (out && typeof out.ok === "boolean") {
        if (out.ok && out.user) {
          return { ok: true, user: { ...out.user, role: out.user.role || appRoleOf(out.user) } };
        }
        return { ok: false, reason: out.reason || "notfound" };
      }
    } catch (e) {
      console.warn("[auth] server login unavailable — fallback local", e && e.message);
    }
  }

  // ทางสำรอง (ออฟไลน์ / ฟังก์ชันยังไม่พร้อม)
  const user = await findUserByPin(code);
  if (!user) return { ok: false, reason: "notfound" };
  if (user.blocked) return { ok: false, reason: "blocked" };
  return { ok: true, user: { ...user, role: appRoleOf(user) } };
}

// ---- LIFF (LINE) = ออปชันเสริม ทำงาน "เฉพาะตอน ENABLED=true" ----
// คืน app user ที่ resolve role จาก rama9_users แล้ว (หรือ null ถ้าไม่เข้าเงื่อนไข)
export async function initSession() {
  if (!CONFIG.LIFF.ENABLED) return null;     // default: webapp ปกติ — ไม่แตะ LIFF
  try {
    await liffService.init();
    if (!liffService.isInClient()) return null;
    const profile = await liffService.getProfile();
    if (!profile) return null;
    const base = toAppUser(profile);          // role staff เป็น default
    // เทียบ lineUserId กับผู้ใช้ในระบบ → ใช้ระดับ/ชื่อจริงถ้าจับคู่ได้
    const all = await getUsers();
    const match = all.find((u) => u.lineUserId && u.lineUserId === base.lineUserId);
    const user = match || base;
    return { ...user, role: appRoleOf(user) };
  } catch (e) {
    console.warn("[auth] LIFF init failed — fallback webapp", e);
    return null;
  }
}

export function logout() { /* เปลือกแอปเคลียร์ cfr9:session เอง */ }
