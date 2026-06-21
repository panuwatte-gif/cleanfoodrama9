// ============================================================
// config.js — SINGLE SOURCE OF TRUTH for everything that changes
// often. If a table name / endpoint / flag changes, change it
// HERE and nowhere else. No other file may hardcode table names,
// endpoints, branch codes, or LIFF ids.
//
// FRONTEND RULE: only PUBLIC config lives here. Never put a
// Supabase service key, LINE Channel Secret, or any secret in the
// frontend. SUPABASE_ANON_KEY is the public anon key only.
// ============================================================

export const CONFIG = {
  APP_NAME: "CleanFoodRama9 Stock App",
  DEFAULT_BRANCH_CODE: "rama9",

  // รหัสยืนยันก่อน "ลบ" รายการ/หมวด/ค่ากลาง (กันลบพลาด) — แก้ที่นี่ที่เดียว
  // หมายเหตุ: ตั้งใจให้ไม่ซ้ำกับ PIN ล็อกอินของผู้ใช้คนใด
  DELETE_CONFIRM_PIN: "0000",

  // --- Backend (Supabase project "Stock Tracker") ---
  // PUBLIC anon key only — safe to ship to the browser. RLS guards the data.
  // Empty either field → app runs fully on localStorage (offline mode).
  SUPABASE_URL: "https://qxhvmrxbrrweundfspzp.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4aHZtcnhicnJ3ZXVuZGZzcHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTY1NjYsImV4cCI6MjA5MDczMjU2Nn0.OibDQzDrFvoV0-a7EH97ynBKCBfFwXXAyv6vlMtH0t0",
  REPORT_WEBHOOK_URL: "", // LINE / make.com webhook for sending order & report messages

  // --- LIFF (LINE Front-end Framework) ---
  // ENABLED=false → behaves as a normal webapp, must never error for a
  // missing LIFF_ID. ALLOW_NORMAL_BROWSER_MODE lets owner/testing open
  // it outside the LINE client.
  LIFF: { ENABLED: false, LIFF_ID: "", ALLOW_NORMAL_BROWSER_MODE: true },

  // --- Table names — ALL physical names use the `rama9_` prefix ---
  // The ONLY place table names live. api/apiClient.js + data/store.js resolve
  // a logical key (e.g. "itemMaster") to the physical name through this map.
  // Never hardcode a table name anywhere else — always go via tableName(key).
  TABLES: {
    // editable store collections (data/store.js round-trips these)
    categories: "rama9_categories",          // หมวด + หมวดย่อย (subs in jsonb)
    itemMaster: "rama9_item_master",         // central master list — every item (cost = owner-only column)
    menuPrices: "rama9_menus",               // เมนูขาย (carries a `shops` tag column)
    assumptions: "rama9_assumptions",        // ค่ากลางที่เจ้าของแก้ได้
    stockItems: "rama9_stock_items",         // คงเหลือปัจจุบัน + ล็อต FIFO (jsonb)
    nutritionMenu: "rama9_nutrition_menu",   // โภชนาการต่อเมนู
    nutritionIngredient: "rama9_nutrition_ingredient", // โภชนาการต่อวัตถุดิบ
    // forward financial / ops model (relational where the data model needs it)
    shops: "rama9_shops",                     // สาขา/ร้าน (rama9 = สาขาพระราม 9)
    incomeRecords: "rama9_income",            // รายได้ (มีคอลัมน์ shop)
    expenseRecords: "rama9_expenses",         // ค่าใช้จ่าย (มี receipt_url แนบใบเสร็จ)
    stockCounts: "rama9_stock_counts",
    stockCountLines: "rama9_stock_count_lines",
    wasteLogs: "rama9_waste_logs",            // discard / waste records
    orders: "rama9_orders",                   // advance orders (staff → owner)
    orderLines: "rama9_order_lines",
    receipts: "rama9_receipts",               // actual goods received
    receiptLines: "rama9_receipt_lines",
    recipes: "rama9_recipes",
    forecastResults: "rama9_forecast_results",
    settings: "rama9_settings",
    editLogs: "rama9_edit_logs",              // audit trail of every retroactive edit
    users: "rama9_users",
    tasks: "rama9_tasks",                     // งานที่มอบหมาย + โน้ต/ประกาศ (assignee/assigner)
  },

  // Storage bucket for expense receipt images (Supabase Storage, private).
  RECEIPTS_BUCKET: "rama9-receipts",

  // --- Feature flags — flip behaviour without touching page code ---
  FEATURE_FLAGS: {
    enableForecast: true,
    enableLineReport: true,
    enableAdminCost: true,          // owner can see/edit costPrice
    enableAlerts: true,
    enableLiffMode: false,
    enableSpicySplit: true,         // เผ็ด / ไม่เผ็ด split inputs in stock count
    enableAccounting: false,        // full accounting module (off in skeleton)
  },

  // --- Item categories (seed list; master data is editable in-app,
  //     this is only the bootstrap default — never the single source) ---
  CATEGORY_SEED: [
    "เนื้อ", "เป็ด", "ไก่", "ปลา", "กุ้ง", "ไข่",
    "เครื่องดื่ม", "ข้าว", "บรรจุภัณฑ์", "ซอส-น้ำจิ้ม", "อื่นๆ",
  ],

  // --- Income channels (seed) ---
  INCOME_CHANNELS: ["Grab", "Lineman", "Shopee", "หน้าร้าน", "อื่นๆ"],
};

// Convenience: resolve a logical table key → physical table name.
// Always go through this — never read CONFIG.TABLES[...] elsewhere.
export function tableName(key) {
  const name = CONFIG.TABLES[key];
  if (!name) throw new Error(`[config] unknown table key: "${key}"`);
  return name;
}
