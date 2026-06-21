// ============================================================
// liff/liffAdapter.js — maps a raw LINE profile into the app's user
// shape. Keeps LINE-specific field names out of the rest of the app.
// ------------------------------------------------------------
// toAppUser(lineProfile) → { id, name, avatar, role, lineUserId }
//   in:  { userId, displayName, pictureUrl } | null
//   out: app user object (defaults to role "staff" — LINE users are staff)
// wires: services/authService (initSession)
// ============================================================

export function toAppUser(lineProfile) {
  if (!lineProfile) {
    return { id: "guest", name: "ผู้ใช้", avatar: null, role: "staff", lineUserId: null };
  }
  // TODO(next round): look up users table by lineUserId to resolve the
  // real role / display name instead of defaulting to staff.
  return {
    id: lineProfile.userId,
    name: lineProfile.displayName || "พนักงาน",
    avatar: lineProfile.pictureUrl || null,
    role: "staff",
    lineUserId: lineProfile.userId,
  };
}
