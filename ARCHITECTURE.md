# CleanFoodRama9 Stock App — ARCHITECTURE

ระบบจัดการสต๊อก/รับของ ร้าน CleanFoodRama9 สาขาพระราม 9
**โครงรอบนี้ = skeleton + contract เท่านั้น** (ยังไม่ใส่ business logic จริง)

> อ่านไฟล์นี้ + contract ของ service ที่เกี่ยวข้อง ก็ทำงานต่อได้โดยไม่ต้องไล่อ่านทั้งระบบ

---

## Stack & ข้อบังคับ
- **HTML5 + CSS3 + Vanilla JS (ES Modules)** เท่านั้น — ไม่มี React/Vue/framework, ไม่มี build tool, ไม่มี TypeScript
- ทุก import ใส่นามสกุล `.js`
- **Mobile-first version เดียว** (ไม่มี PC version แยก) — shell กว้าง 480px จัดกลาง, ได้ border บนจอกว้าง
- Deploy: unzip โฟลเดอร์ `app/` แล้วอัปขึ้น Cloudflare Pages / Netlify ได้ตรงๆ (root = `app/`)
- Visual: ใช้ design tokens จาก `_ds/colors_and_type.css` (KodKlean House) — สี/ฟอนต์/spacing ผ่าน `var(--*)`

## โครงไฟล์
```
app/
  index.html              โหลด tokens + css 4 ไฟล์ + src/app.js (type=module)
  _ds/colors_and_type.css  design tokens (คัดมาจาก design system)
  css/  layout | components | pages | mobile     (mobile-first, scoped ต่อหน้า)
  src/
    config/config.js      ⭐ SINGLE SOURCE OF TRUTH (ค่าที่เปลี่ยนบ่อยทั้งหมด)
    state/store.js        ⭐ state กลางไฟล์เดียว
    router/router.js      route id → page module
    api/                  apiClient (gateway) · mockApi (mock+schema) · supabaseClient (stub)
    services/             business contract ทั้งหมด (รอบนี้เป็น stub)
    liff/                 liffService · liffAdapter
    components/           dom · icons · components · layout · login
    pages/                9 หน้า + _pageBase
    utils/                dom · format · storage · id
    app.js                ⭐ bootstrap + render orchestration
  ARCHITECTURE.md
```

## ชั้นของระบบ (แยกหน้าที่ ห้ามปน)
`config → state → services → api → (mock|supabase)` ; `router → pages → components` ; `liff` แยกเดี่ยว
**กฎเหล็ก:** page ไม่เรียก api ตรง — เรียกผ่าน **services**; service คุยกับ DB ผ่าน **api/apiClient** เท่านั้น; ชื่อตาราง/endpoint อยู่ที่ **config.js** ที่เดียว

---

## State (`state/store.js`)
state เดียว: `{ config, user, role, currentPage, loading, error, toast, draft, data, liff }`
- `getState()` · `setState(patch, {silent})` · `updateState(fn)` · `subscribe(fn)→unsub` · `notify()`
- **Draft (สำคัญ):** `getDraft(key,fallback)` · `setDraft(key,val)` (เขียน state.draft + localStorage **แบบเงียบ ไม่ notify**) · `dropDraft(key)`
- **กันค่าที่กรอกหาย:** ช่อง number ในหน้านับ/รับของ เขียนค่าผ่าน `setDraft` → ไม่ re-render → ไม่เสีย focus/caret ; refresh แล้วค่ายังอยู่ (localStorage)

## Render strategy (`app.js`)
- `#chrome-layer` (login หรือ shell) re-render **เฉพาะตอน session(user/role) หรือ currentPage เปลี่ยน**
- `#page-root` = body ของหน้า active ; `ctx.rerender()` วาดเฉพาะหน้านี้ใหม่
- `#toast-layer` / `#overlay-layer` อัปเดตทุก notify ใน node แยก → toast/loading ไม่กวน input ที่กำลังกรอก
- **ctx ที่ส่งให้ทุก page:** `{ state, navigate, rerender, toast(msg,type), getDraft, setDraft }`
- ปุ่มกลาง navbar = **no-op placeholder** (ตามสเปครอบนี้)

## Config (`config/config.js`)
`CONFIG` = APP_NAME, DEFAULT_BRANCH_CODE, SUPABASE_*, REPORT_WEBHOOK_URL, LIFF{}, **TABLES{}**, **FEATURE_FLAGS{}**, CATEGORY_SEED, INCOME_CHANNELS
- `tableName(key)` resolve logical key → physical table name (ใช้เสมอ ห้าม hardcode ที่อื่น)
- frontend ใส่ได้แค่ **public config** — ห้ามมี secret/service key/channel secret

---

## API layer
| ไฟล์ | ทำอะไร | รับ | คืน | ต่อกับ |
|---|---|---|---|---|
| `api/apiClient.js` | **gateway เดียว** เลือก backend (mock เดิม / supabase รอบหน้า) | `select(key,{where})` `insert(key,row)` `update(key,id,patch)` `remove(key,id)` | Promise<row(s)> | services ทั้งหมด, mockApi, supabaseClient |
| `api/mockApi.js` | mock backend (in-memory + localStorage) + **เอกสาร DATA MODEL ของทุกตาราง** | logical table key | Promise | utils/storage |
| `api/supabaseClient.js` | **stub** — รอบหน้าสร้าง client จริงจาก CONFIG, คืน contract เดียวกับ mock | – | – | config |

## Services (รอบนี้ = stub: หัวฟังก์ชัน + comment + return mock)
| service | ฟังก์ชันหลัก (in → out) | ต่อกับ |
|---|---|---|
| `authService` | `initSession()` · `loginWithRole(role,pin)` · `logout()` · `currentUser()` | store, liffService, liffAdapter |
| `masterDataService` | `listItems({category,activeOnly})` · `getItem(id)` · `upsertItem(item,by)` · `deleteItem(id,by)`*(soft-delete + TODO)* · `listCategories/Units/Menus/Recipes` | apiClient, editLogService, config |
| `stockService` | `listStock()` · `resolveQty({spicy,nonSpicy,total})`*(กฎ เผ็ด/รวม, pure)* · `saveCount(h,lines,by)` · `logWaste(rec,by)` | apiClient, editLogService, config |
| `receiveService` | `listReceipts()` · `confirmReceipt(h,lines,by)` *(TODO: บวกเข้า stock_items)* | apiClient, stockService, editLogService |
| `orderService` | `listOrders()` · `saveDraftOrder(lines,by)` · `sendOrder(id,by)` *(→ LINE report)* | apiClient, reportService, editLogService |
| `financeService` | `listIncome/Expense()` · `addIncome(rec,by)` · `addExpense(rec,by)` · `summary({from,to})` | apiClient, editLogService |
| `forecastService` | `getForecast({horizonDays})` → `{results:[{itemId,low,expected,high}]}` **ยังไม่ใส่สูตร** | config (flag) |
| `historyService` | `listActivity({limit})` · `listEditLogs(where)` | apiClient, editLogService |
| `editLogService` | `logEdit({targetTable,targetId,before,after,editedBy})` · `listEditLogs(where)` — **audit trail** | apiClient, store |
| `reportService` | `sendOrderReport(order)` · `sendDailySummary(summary)` — POST webhook (stub, ไม่มี secret) | config |

## LIFF (`liff/`)
- `liffService.js`: `init()` `login()` `getProfile()` `isInClient()` — ถ้า `CONFIG.LIFF.ENABLED=false` ทำงานเป็นเว็บปกติ ไม่ error
- `liffAdapter.js`: `toAppUser(lineProfile)` → app user (default role `staff`)
- ห้ามเขียน LIFF logic ใน page

## Pages (`pages/`, ทุกหน้ามี loading/error/empty/toast/draft)
`dashboard` ภาพรวม · `stockCount` ตรวจนับ(แท็บ นับ/ทิ้ง, หมวด, ช่อง เผ็ด/ไม่เผ็ด/รวม) · `receive` รับของ · `order` สั่งของ(progress + ส่งใบสั่ง) · `income` รายได้ · `expense` ค่าใช้จ่าย · `history` ประวัติ+แก้ย้อนหลัง · `forecast` พยากรณ์(ช่วง ต่ำ/คาด/สูง) · `settings` เพิ่มเติม(owner: master data, สูตร, สลับ role, export)
- `_pageBase.js`: `pageHeader` · `pageShell` · `makeCache` · `ensureLoaded(cache,ctx,loader)` · `asyncSection(cache,ctx,{content,empty,isEmpty,retry})`
- owner-only route: `settings` (staff โดน redirect ไป dashboard)

---

## DATA MODEL (ฟิลด์หลัก — ดูเต็มใน `api/mockApi.js`)
- **item_master** `id,name,category,unit,costPrice(OWNER),supportsSpicySplit,staffEditable,isActive`
- **stock_items** `itemId,branchCode,qtySpicy?,qtyNonSpicy?,qtyTotal(SOURCE OF TRUTH),updatedAt`
  → กฎ: `qtySpicy + qtyNonSpicy = qtyTotal` ถ้ากรอกแยก ; ไม่งั้นกรอก `qtyTotal` ช่องเดียว (สองช่องแรก optional)
- **stock_counts / stock_count_lines** · **waste_logs** · **orders / order_lines** · **receipts / receipt_lines**
- **income_records** `channel,grossAmount,gpFee,marketingFee,netAmount,date`
- **expense_records** `category,amount,note,date` *(ไม่รวมต้นทุนรับของ — owner เห็นแยก)*
- **menu_prices · recipes · forecast_results · settings · users**
- **edit_logs** `targetTable,targetId,editedBy,editedAt,before,after` — ทุกการแก้ย้อนหลังต้อง logEdit()

### กฎ data สำคัญ
- เผ็ด/ไม่เผ็ด: `resolveQty()` ใน stockService เป็น single source ของกฎรวมยอด
- ข้อมูลกลางชุดเดียว (item_master) + `staffEditable` คุมว่าฟิลด์ไหน staff แก้ได้ ; `costPrice` owner เท่านั้น
- รับของสาขานี้เป็น entry อิสระ ไม่ sync ร้านอื่น

---

## TODO รอบถัดไป (ทำทีละกลุ่ม ไม่ต้องรื้อโครง)
1. **api**: ต่อ Supabase จริงใน `supabaseClient.js` (contract เดิม) แล้วเปิดใน `apiClient.backend()`
2. **stock/receive**: บันทึก lines จริง + apply เข้า `stock_items` (count = set, receive = add)
3. **forecast**: ใส่สูตรใน `forecastService.getForecast` → low/expected/high
4. **master data**: หน้าจัดการใน settings (เพิ่ม-แก้-ลบ items/หมวด/หน่วย/เมนู/สูตร) — เรียก `logEdit` ทุกการแก้
5. **delete master ที่มีของอ้างถึง**: ตัดสินใจ soft-delete (แนะนำ) vs ห้ามลบ — ดู TODO ใน `masterDataService.deleteItem`
6. **LIFF**: โหลด SDK + `liff.init` จริงใน `liffService`
7. **report**: POST จริงไป `REPORT_WEBHOOK_URL` ใน `reportService`
8. **finance**: คำนวณ netAmount + summary ช่วงวันที่
