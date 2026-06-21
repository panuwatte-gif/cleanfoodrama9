// ============================================================
// liff/liffService.js — LINE Front-end Framework wrapper. ALL LIFF
// calls live here; pages never touch the LIFF SDK directly.
//
// Two modes:
//   - Normal Browser (default) → every method is a safe no-op
//   - LIFF (เปิดจาก LINE)        → โหลด SDK + liff.init จริง
//
// ทำงานจริง "เฉพาะตอน CONFIG.LIFF.ENABLED=true และมี LIFF_ID"
// ถ้าปิด (default) → app เป็น webapp ปกติ ต้องไม่ error
// ------------------------------------------------------------
// init()        → Promise<{ready, inClient}>
// login()       → Promise<void>
// getProfile()  → Promise<{ userId, displayName, pictureUrl } | null>
// isInClient()  → boolean  (true เฉพาะในแอป LINE)
// ============================================================

import { CONFIG } from "../config/config.js";
import { getState, setState } from "../state/store.js";

let _ready = false;
let _sdk = null;       // window.liff เมื่อโหลดสำเร็จ
let _loading = null;   // กันโหลด SDK ซ้ำ

const LIFF_SDK_URL = "https://static.line-scdn.net/liff/edge/2/sdk.js";

// โหลด LIFF SDK แบบ try/catch (กันพังบนเบราว์เซอร์เก่า/ออฟไลน์)
function loadSdk() {
  if (window.liff) return Promise.resolve(window.liff);
  if (_loading) return _loading;
  _loading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = LIFF_SDK_URL;
    s.async = true;
    s.onload = () => resolve(window.liff);
    s.onerror = () => reject(new Error("LIFF SDK load failed"));
    document.head.appendChild(s);
  });
  return _loading;
}

export async function init() {
  if (!CONFIG.LIFF.ENABLED || !CONFIG.LIFF.LIFF_ID) {
    // ปิดอยู่ → webapp ปกติ ไม่โหลด SDK ไม่ error
    setState({ liff: { ready: true, inClient: false, profile: null } });
    _ready = true;
    return { ready: true, inClient: false };
  }
  try {
    _sdk = await loadSdk();
    await _sdk.init({ liffId: CONFIG.LIFF.LIFF_ID });
    const inClient = _sdk.isInClient();
    _ready = true;
    setState({ liff: { ready: true, inClient, profile: null } });
    return { ready: true, inClient };
  } catch (e) {
    // โหลด/Init ไม่ได้ → ถอยกลับเป็น webapp ปกติ ไม่ทำให้ flow พัง
    console.warn("[liff] init failed — running as normal webapp", e);
    setState({ liff: { ready: true, inClient: false, profile: null } });
    _ready = true;
    return { ready: true, inClient: false };
  }
}

export async function login() {
  if (!_sdk || !CONFIG.LIFF.ENABLED) return;
  if (!_sdk.isLoggedIn()) _sdk.login();
}

export async function getProfile() {
  if (!_sdk || !CONFIG.LIFF.ENABLED) return null;
  try {
    if (!_sdk.isLoggedIn()) { _sdk.login(); return null; } // จะ redirect ไป LINE login
    const p = await _sdk.getProfile();
    setState({ liff: { ...getState().liff, profile: p } });
    return p; // { userId, displayName, pictureUrl }
  } catch (e) {
    console.warn("[liff] getProfile failed", e);
    return null;
  }
}

export function isInClient() {
  if (!_ready || !CONFIG.LIFF.ENABLED) return false;
  if (_sdk) return _sdk.isInClient();
  return Boolean(getState().liff && getState().liff.inClient);
}
