// ============================================================
// app.js — bootstrap + render orchestration (เปลือกแอป vanilla)
// โครงตามต้นแบบ prototype v2:
//   • login (รหัส 4 หลัก) → shell
//   • shell = demo-strip + เนื้อหา (แท็บ หรือ route ที่ push) + bottom nav
//   • ปุ่มกลาง (FAB) เปิด Dash sheet (เกมส์)
//   • สลับ role เจ้าของ/พนักงาน — แท็บที่ 5 เปลี่ยน (เพิ่มเติม/บัญชี)
//
// เลเยอร์แยกกัน: #chrome (login/shell) · #toast · #overlay (sheet)
// → toast/sheet ไม่รีเรนเดอร์ chrome (กัน input หลุดโฟกัสในเฟสถัดไป)
//
// draft ของฟอร์ม (กันค่าหาย) อยู่ที่ state/store.js — ยังคงไว้ใช้เฟส 1+
// ============================================================

import { h } from "./utils/dom.js";
import { load, save } from "./utils/storage.js";
import { initData, subscribeData, hydrateData } from "./data/store.js";
import { isConfigured as backendConfigured, isOnline as backendOnline, onStatus as onBackendStatus } from "./api/apiClient.js";
import { loadTheme, applyTheme, saveTheme } from "./utils/theme.js";
import { loginScreen } from "./components/login.js";
import * as authService from "./services/authService.js";
import { appRoleOf } from "./services/authService.js";
import { userById } from "./data/store.js";
import { CONFIG } from "./config/config.js";
import { navBar } from "./components/layout.js";
import { sheet, toastNode, dashSheetBody } from "./components/sheet.js";
import { homeScreen } from "./pages/home.js";
import { moreScreen, accountScreen } from "./pages/more.js";
import { placeholderScreen, tabPlaceholder } from "./pages/placeholder.js";
import { countScreen } from "./pages/count.js";
import { orderRecvScreen } from "./pages/orderrecv.js";
import { wasteScreen } from "./pages/waste.js";
import { stockListScreen } from "./pages/stocklist.js";
import { stockDetailScreen } from "./pages/stockdetail.js";
import { masterScreen } from "./pages/master.js";
import { assumptionsScreen } from "./pages/assumptions.js";
import { colorSettingsScreen } from "./pages/colorsettings.js";
import { recipesScreen } from "./pages/recipes.js";
import { manualScreen } from "./pages/manual.js";
import { musicScreen } from "./pages/music.js";
import { historyScreen } from "./pages/history.js";
import { payrollScreen } from "./pages/payroll.js";
import { unitConvertScreen } from "./pages/unitconvert.js";
import { moneyScreen } from "./pages/money.js";
import { incomeScreen } from "./pages/income.js";
import { expenseScreen } from "./pages/expense.js";
import { forecastScreen, fcHistoryScreen } from "./pages/forecast.js";
import { taxScreen } from "./pages/tax.js";
import { execSummaryScreen } from "./pages/execsummary.js";
import { orderExpenseScreen } from "./pages/orderexpense.js";
import { lineSendScreen } from "./pages/linesend.js";
import { reportsScreen, incExpReportScreen, topSellersScreen, lowSellersScreen, stockReportScreen } from "./pages/reports.js";
import { dataScreen } from "./pages/data.js";
import { nutritionScreen } from "./pages/nutrition.js";
import { menuListScreen } from "./pages/menulist.js";
import { messagesScreen } from "./pages/messages.js";
import { exportScreen } from "./pages/export.js";
import "./lib/image-slot.js"; // ลงทะเบียน <image-slot> + window.kkSlots

// ---- เปลือกสถานะแอป (single source สำหรับ navigation) ----
const S = {
  user: load("session", null),      // { role } | null  (null = หน้า login)
  tab: "home",                      // home | data | reports | more | account
  stack: [],                        // route ที่ push ทับ (จอลึก)
  dash: false,                      // เปิด Dash sheet?
  theme: loadTheme(),
  iconStyle: load("iconStyle", "emoji"),  // emoji | line
  shop: load("shop", "กะเพราโคตรคลีน"),
  shops: load("shops", [{ name: "กะเพราโคตรคลีน" }, { name: "365แคล", soon: true }, { name: "ร้านที่ 3", soon: true }]),
};
window.__kkIcons = S.iconStyle;

let chromeLayer, toastLayer, overlayLayer, toastTimer;

// ผู้ใช้ปัจจุบัน: อ่านสด ๆ จากชั้นข้อมูล (ตาม id) → ชื่อ/ระดับอัปเดตทันทีหลังแก้
// fallback = snapshot ใน session (รองรับ session เก่าก่อนเฟส 4b ที่ไม่มี id)
function liveUser() {
  if (!S.user) return null;
  const fromStore = S.user.id ? userById(S.user.id) : null;
  return fromStore ? { ...fromStore, role: appRoleOf(fromStore) } : S.user;
}

const role = () => { const u = liveUser(); return u ? (u.role || "owner") : "owner"; };

// ---- navigation ----
function go(route) {
  S.stack = route && route.replace ? [...S.stack.slice(0, -1), route] : [...S.stack, route];
  renderChrome();
}
function back() { S.stack = S.stack.slice(0, -1); renderChrome(); }
function onTab(id) { S.tab = id; S.stack = []; renderChrome(); }
function openDash() { S.dash = true; renderOverlay(); }
function closeDash() { S.dash = false; renderOverlay(); }

// ปรับธีมสี (จากหน้า colorsettings) — merge + persist + re-render (ทาตัวแปร CSS ใหม่)
function setTheme(patch) {
  S.theme = { ...S.theme, ...patch };
  saveTheme(S.theme);
  renderChrome();
}

function showToast(message, type) {
  renderToast(message, type);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => renderToast(null), 2400);
}

function doLoginUser(user) {
  S.user = { ...user, role: user.role || appRoleOf(user) };
  S.tab = "home"; S.stack = [];
  save("session", S.user);
  renderChrome();
}
// login จริง: ตรวจ PIN ผ่าน authService → คืนผลให้หน้า login จัดการ feedback
async function onLoginSubmit(pin) {
  const res = await authService.login(pin);
  if (res.ok) { doLoginUser(res.user); return { ok: true }; }
  return { ok: false, reason: res.reason };
}
function doLogout() {
  S.user = null; S.tab = "home"; S.stack = []; S.dash = false;
  save("session", null);
  renderOverlay();
  renderChrome();
}

// shopCtx (ส่งให้ StoreChip + หน้าจอ) · เจ้าของแก้ชื่อร้านได้ (canEdit)
const shopCtx = {
  get shop() { return S.shop; },
  get shops() { return S.shops; },
  get canEdit() { return role() === "owner"; },
  setShop(name) { S.shop = name; save("shop", name); renderChrome(); },
  addShop() {
    S.shops = [...S.shops, { name: "สาขาใหม่ " + (S.shops.length + 1), soon: true }];
    save("shops", S.shops); renderChrome();
  },
  renameShop(oldName, newName) {
    const nm = (newName || "").trim();
    if (!nm) return false;
    if (S.shops.some((s) => s.name === nm && s.name !== oldName)) return false; // กันชื่อซ้ำ
    S.shops = S.shops.map((s) => (s.name === oldName ? { ...s, name: nm } : s));
    if (S.shop === oldName) { S.shop = nm; save("shop", nm); }
    save("shops", S.shops);
    renderChrome();
    return true;
  },
};

// ---- เนื้อหา (แท็บ หรือ route) ----
function renderContent() {
  const r = S.stack[S.stack.length - 1];
  if (r) {
    // จอจริงเฟส 1 (พนักงานหลัก) + เฟส 2 (เจ้าของ: ข้อมูลกลาง/ตั้งค่า/สูตร/ประวัติ)
  const sctx = { go, back, role: role(), toast: showToast, shopCtx, theme: S.theme, setTheme, user: liveUser() };
    switch (r.name) {
      case "count":         return countScreen(sctx);
      case "orderrecv":     return orderRecvScreen({ ...sctx, mode: r.mode });
      case "waste":         return wasteScreen(sctx);
      case "stocklist":     return stockListScreen({ ...sctx, low: r.low });
      case "stockdetail":   return stockDetailScreen({ ...sctx, id: r.id });
      case "master":        return masterScreen(sctx);
      case "assumptions":   return assumptionsScreen(sctx);
      case "colorsettings": return colorSettingsScreen(sctx);
      case "recipes":       return recipesScreen(sctx);
      case "manual":        return manualScreen({ ...sctx, ref: r.ref });
      case "music":         return musicScreen(sctx);
      case "history":       return historyScreen(sctx);
      case "payroll":       return payrollScreen(sctx);
      case "unitconvert":   return unitConvertScreen(sctx);
      // ---- เฟส 3: เงิน · รายงาน · พยากรณ์ · ภาษี ----
      case "money":         return moneyScreen(sctx);
      case "income":        return incomeScreen({ ...sctx, day: r.day });
      case "expense":       return expenseScreen({ ...sctx, day: r.day });
      case "forecast":      return forecastScreen(sctx);
      case "fchistory":     return fcHistoryScreen(sctx);
      case "tax":           return taxScreen(sctx);
      case "execsummary":   return execSummaryScreen(sctx);
      case "orderexpense":  return orderExpenseScreen(sctx);
      case "linesend":      return lineSendScreen(sctx);
      case "dailyreport":   return lineSendScreen(sctx);
      case "incexpreport":  return incExpReportScreen(sctx);
      case "topsellers":    return topSellersScreen(sctx);
      case "lowsellers":    return lowSellersScreen(sctx);
      case "stockreport":   return stockReportScreen(sctx);
      case "nutrition":     return nutritionScreen(sctx);
      case "menulist":      return menuListScreen(sctx);
      case "messages":      return messagesScreen(sctx);
      case "export":        return exportScreen(sctx);
      default:              return placeholderScreen(r, { onBack: back });
    }
  }

  const ctx = { go, role: role(), toast: showToast, onLogout: doLogout, shopCtx, user: liveUser() };
  switch (S.tab) {
    case "data": return dataScreen(ctx);
    case "reports": return reportsScreen(ctx);
    case "account": return accountScreen(ctx);
    case "more": return role() === "owner" ? moreScreen(ctx) : homeScreen(ctx);
    default: return homeScreen(ctx);
  }
}

// ---- demo / backend status strip ----
function backendStripText() {
  if (!backendConfigured()) return "เดโม · ข้อมูลตัวอย่าง — ยังไม่เชื่อมฐานข้อมูลจริง";
  return backendOnline()
    ? "เชื่อมฐานข้อมูล Supabase แล้ว · ข้อมูลจริง สาขาพระราม 9"
    : "ออฟไลน์ · ใช้ข้อมูลในเครื่องชั่วคราว — จะ sync เมื่อกลับมาออนไลน์";
}

// ---- chrome (login vs shell) ----
function renderChrome() {
  // กันแท็บที่อีกบทบาทไม่มี
  if (role() !== "owner" && S.tab === "more") { S.tab = "home"; }
  if (role() === "owner" && S.tab === "account") { S.tab = "home"; }

  chromeLayer.replaceChildren();
  if (!S.user) {
    const stage = loginScreen({ onSubmit: onLoginSubmit });
    applyTheme(stage, S.theme); // เผื่อปรับธีมในอนาคต
    chromeLayer.appendChild(stage);
    return;
  }

  const r = S.stack[S.stack.length - 1];
  const shell = h("div", { class: "shell" + (r ? " no-pad" : ""), "data-screen-label": r ? r.name : S.tab },
    h("div", { class: "demo-strip" }, backendStripText()),
    renderContent(),
    !r && navBar({ active: S.tab, role: role(), onTab, onFab: openDash }),
  );
  applyTheme(shell, S.theme);
  chromeLayer.appendChild(shell);

  // dash sheet ผูกกับ shell theme เช่นกัน — รีเฟรช overlay ให้ตรง role
  renderOverlay();
}

// ---- toast layer ----
function renderToast(message, type) {
  toastLayer.replaceChildren();
  if (message) {
    const t = toastNode(message, type);
    applyTheme(t, S.theme);
    toastLayer.appendChild(t);
  }
}

// ---- overlay layer (dash sheet) ----
function renderOverlay() {
  overlayLayer.replaceChildren();
  if (S.user && S.dash) {
    const wrap = sheet({ onClose: closeDash, children: dashSheetBody({ toast: showToast }) });
    applyTheme(wrap, S.theme);
    overlayLayer.appendChild(wrap);
  }
}

// ---- boot ----
function boot() {
  initData();
  const app = document.getElementById("app");
  chromeLayer = h("div", { id: "chrome-layer" });
  toastLayer = h("div", { id: "toast-layer" });
  overlayLayer = h("div", { id: "overlay-layer" });
  app.replaceChildren(chromeLayer, toastLayer, overlayLayer);

  // ข้อมูลกลางแก้ → รีเรนเดอร์เปลือก (ทุกหน้า link ข้อมูลชุดเดียว)
  subscribeData(() => renderChrome());

  renderChrome();

  // LIFF (LINE) = ออปชันเสริม — ทำงานเฉพาะตอน ENABLED=true เท่านั้น
  // default ENABLED=false → เป็น webapp ปกติ ไม่ error
  if (CONFIG.LIFF.ENABLED && !S.user) {
    authService.initSession().then((u) => { if (u && !S.user) doLoginUser(u); }).catch(() => {});
  }

  // ดึงข้อมูลจริงจาก Supabase (ถ้า config ไว้) มาแทนที่แคช localStorage แล้ว
  // bumpData() ให้ทุกหน้าวาดใหม่ · ออฟไลน์ → คงใช้ข้อมูลในเครื่อง
  hydrateData();
  // อัปเดตแถบสถานะเมื่อ online/offline สลับ (ไม่ rerender ทั้งหน้า กัน focus หลุด)
  onBackendStatus(() => {
    const strip = document.querySelector(".demo-strip");
    if (strip) strip.textContent = backendStripText();
  });
}

boot();
