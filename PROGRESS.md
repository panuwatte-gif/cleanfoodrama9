# PROGRESS — CleanFoodRama9 (vanilla app)

> อ่านไฟล์นี้ + `ARCHITECTURE.md` ก่อนทำเฟสถัดไป
> พิมพ์เขียว = `prototype2/` (React) · output = vanilla ใน `app/`

---

## ✅ เฟส 0 — รากฐาน vanilla + ภาษาการออกแบบ + ข้อมูล/สูตร  (เสร็จแล้ว)

ผลลัพธ์: เปิด `app/index.html` แล้วได้เปลือกแอป vanilla หน้าตาเหมือน prototype v2
+ ข้อมูลกลาง + สูตรครบ พร้อมเติมหน้าจอเฟสถัดไป

### 1) ภาษาการออกแบบ (CSS) — ดึงเข้ามาแล้ว
- `_ds/colors_and_type.css` (tokens) → `css/cookbook.css` (cookbook kit, ตัด `@import` ออก
  เพราะโหลด tokens แยกแล้ว) → `css/proto.css` (สไตล์ prototype ครบทุกบรรทัด)
- โหลดตามลำดับนี้ใน `index.html` เสมอ — DOM สร้างด้วย **class เดิม** (`.shell .nav .fc .hero2
  .ent2-row .catic .sec-chip` ฯลฯ) จึงหน้าตาตรงต้นแบบ
- ลบ css เก่าของ skeleton (layout/components/pages/mobile) ทิ้งแล้ว — ใช้ cookbook+proto แทน

### 2) ข้อมูลกลาง + สูตร (พอร์ตจาก `prototype2/data.jsx`)
- `src/data/seed.js` — ค่าตั้งต้นทั้งหมด (CATS · ITEMS · MENUS · ASSUMPTIONS · STOCK
  + เดโม: MONEY · RECV_LOG · RECIPES · PAYROLL · TOP_FOOD ฯลฯ + อิโมจิ/สี)
- `src/data/store.js` — **ชั้นข้อมูลกลางแบบ async** (สำคัญ):
  - โหลด cats/items/menus/assumptions/stock จาก localStorage (`cfr9:data:v1`) ไม่งั้นใช้ seed
  - **อ่าน/เขียนทุกตัวคืน Promise**: `await getItems()` `await saveItem()` `await saveAssumption()` ฯลฯ
    (เฟส 4 สลับเป็น Supabase ได้โดยไม่ต้องแก้หน้าจอ)
  - sync getter สำหรับสูตร: `cats()` `items()` `menus()` `assumptions()` `stockRows()` `assume(id)`
  - `subscribeData(fn)` / `bumpData()` — แก้ข้อมูลกลาง → ทุกหน้า re-render ตาม (app.js subscribe ไว้)
  - soft-delete: `removeItem()` ตั้ง `isActive=false` (กันของที่อ้างถึงพัง)
- `src/utils/formulas.js` — สูตร JS ล้วน พอร์ตตรง: `fmt · itemById · catById · unitOf · itemsOf ·
  sectionsFor · stockOf · stockVariants(เผ็ด/ไม่เผ็ด) · fc7 + fc7DayTotals · salesStat · baseFor ·
  hotRatio · recvOf + recvMonth · breakevenPerDay · SALES_CUM · DAILY_INEX · STOCK_DAYS · WEEK7`
  (ทดสอบแล้ว: 55 รายการ · 7 หมวด · sections/variants/fc7/recvOf คืนค่าถูก)

### 3) UI atoms vanilla (`src/components/`) — ตรง prototype
- `icons.js` — `PI_PATHS` ครบ + `pi(name,size,w)` คืน `<svg>`
- `mascot.js` — `mascot()` (ต้นกล้าหน้ายิ้ม) + `cloudPal()`
- `components.js` — `catIc · itemIc · emo · tag · note · toggle · seg · catTabs · sectionTabs ·
  menuTabs · searchBox · stepper · qtyInput · miniStep(เผ็ด/ไม่เผ็ด/รวม) · unitSelect · meter ·
  hdr · emptyState` + `cuteIcons()` (สลับ อิโมจิ/ไอคอนเส้น ผ่าน `window.__kkIcons`)
- `sheet.js` — `sheet()` (bottom sheet) · `toastNode()` · `dashSheetBody()` (เกมส์ ปุ่มกลาง)
- `layout.js` — `navBar()` (5 ช่อง + FAB) · `storeChip()` (dropdown เลือกร้าน)
- `login.js` — `loginScreen()` (รหัส 4 หลัก · 2 บทบาท)
- `src/lib/image-slot.js` — web component `<image-slot>` (อัปรูปเอง) + `window.kkSlots`

### 4) เปลือกแอป (`src/app.js`)
- login (รหัส 4 หลัก เดโม) → shell · session เก็บ localStorage (`cfr9:session`)
- 3 เลเยอร์แยก: `#chrome-layer` (login/shell) · `#toast-layer` · `#overlay-layer` (sheet)
  → toast/sheet ไม่รีเรนเดอร์ chrome (กัน input หลุดโฟกัสในเฟสถัดไป)
- bottom nav 5 ช่อง + ปุ่มกลาง FAB เปิด Dash sheet · สลับ role (เจ้าของ=เพิ่มเติม / พนักงาน=บัญชี)
  สลับ role แล้วเด้งกลับหน้าหลักถ้าอยู่แท็บที่อีกฝ่ายไม่มี
- ธีมสี `src/utils/theme.js` — `themeToVars` ทาตัวแปร CSS บน `.shell` (ดีฟอลต์เขียวพาสเทล #62B98C
  เหมือน prototype) + เก็บ localStorage (`cfr9:theme:v1`)
- ระบบ draft กันค่าหาย (`getDraft/setDraft` ใน `state/store.js`) **คงไว้** ใช้เฟส 1+

### หน้าจอที่ทำแล้ว (vanilla)
- ✅ `pages/home.js` — หน้าหลัก (ฮีโร่ · การ์ดสั่ง/นับ · บันทึกรายได้/จ่าย · ส่ง LINE · สต๊อกต่ำ ·
  ตัวช่วย 4 ไทล์ · ยอดสุทธิเจ้าของ) — ตรงต้นแบบ
- ✅ `pages/more.js` — แท็บ เพิ่มเติม (เจ้าของ) + บัญชี (พนักงาน)
- ✅ `components/sheet.js` DashSheetBody (เกมส์)
- 🔲 `pages/placeholder.js` — จอที่ push (สั่ง/รับ · นับ · เงิน · master ฯลฯ) + แท็บ ข้อมูล/รายงาน
  แสดง "พร้อมต่อในเฟสถัดไป" ระบุเฟส — **เป็นที่ที่เฟส 1–3 จะมาเติม**

---

## 🔲 เฟสถัดไป (ยังไม่ทำ)

- **เฟส 1** — ✅ เสร็จแล้ว (ดูด้านล่าง)
- **เฟส 2** — ✅ เสร็จแล้ว (ดูด้านล่าง)
- **เฟส 3** — ✅ เสร็จแล้ว (ดูด้านล่าง)
- **เฟส 4** — ต่อ Supabase จริง (`ops_*`) · login จริง (PIN/LIFF) · ส่ง LINE · deploy Cloudflare Pages

### วิธีเติมจอใหม่ (เฟส 1+)
1. เขียน `src/pages/<ชื่อ>.js` คืน DOM node (ใช้ atoms จาก `components/` + สูตรจาก `utils/formulas.js`)
2. อ่าน/เขียนข้อมูลผ่าน `data/store.js` แบบ **await** เสมอ · ฟอร์มกรอกเลขใช้ `setDraft` กันค่าหาย
3. ใน `app.js` `renderContent()` แทน `placeholderScreen` ด้วยจอจริงตาม `route.name`
4. แก้ข้อมูลกลางทุกครั้งให้ผ่าน `saveItem/saveAssumption/...` (จะ `bumpData()` ให้ทุกหน้าตามเอง)

### หมายเหตุสถาปัตยกรรม
- `src/services/` + `src/api/` (skeleton เดิม) ยังอยู่ — เป็น contract สำหรับเฟส 4 (ต่อ Supabase)
  เฟส 0 ยังไม่ได้ผูกเข้า data layer ใหม่ · เฟส 4 ค่อยเชื่อม `data/store.js` → `apiClient`
- nav model เปลี่ยนตามต้นแบบ prototype (แท็บ + stack) จึงลบ `router/` + `pages/*` เก่าของ skeleton ทิ้ง

---

## ✅ เฟส 1 — จอพนักงานหลัก (vanilla ตรง prototype)  (เสร็จแล้ว)

ผลลัพธ์: จาก placeholder → จอจริง 5 จอ ใช้งานได้เต็มเหมือน prototype (ข้อมูลยัง localStorage)
อ้างอิง: `prototype2/screens-entry.jsx · screens-stock.jsx`

### ส่วนกลาง — `pages/_entry.js`
- `entryList()` — การ์ดหมวดพับได้ + ตารางกรอก เผ็ด/ไม่เผ็ด/รวม(อัตโนมัติ) + หน่วยนับ ·
  โหมดค้นหาแบบแบน · เพิ่ม/ลบรายการกลางคัน (ผ่าน `onAdd/onRemove`)
  **กันค่าหาย/ไม่เสีย focus:** ช่องกรอก (miniStep) อัปเดต `value` + ช่อง "รวม" + done badge
  ตรงๆ ใน DOM — ไม่ rerender ทั้งหน้าตอนพิมพ์ (paint() เรียกเฉพาะตอนสลับแท็บ/กรอง/พับ/เพิ่ม-ลบ)
- `entryFoot()` — progress (กรอกแล้ว x/y) + ปุ่มบันทึก · คืน `{ node, update }` (อัปเดต live)
- `confirmSheet()` — sheet ยืนยัน (สรุปรายการที่กรอก) กันบันทึกซ้ำ/ผิด

### จอที่ทำแล้ว
- ✅ `pages/count.js` — ตรวจนับ: แท็บ นับ/ทิ้ง · เพิ่ม-ลบรายการ (เพิ่ม→ `saveItem` เข้าข้อมูลกลาง) ·
  sheet ยืนยัน → ไป `waste` · **autosave draft** (`cfr9:draft:count` / `:countWaste`)
- ✅ `pages/orderrecv.js` — สั่งของ/รับของ (seg 2 โหมด) · หมวดสั่งของ (protein/sauce/rice/dry) ·
  progress + sheet ยืนยัน · draft (`:order` / `:recv`)
- ✅ `pages/waste.js` — แยกทิ้ง/เสีย: logic **หายไป − ทิ้ง = ขายจริง** (อัปเดต live) · สาเหตุ ·
  มูลค่าทิ้งเฉพาะเจ้าของ
- ✅ `pages/stocklist.js` — สินค้าคงเหลือ: กรองของใกล้หมด · menutabs · แยก เผ็ด/ไม่เผ็ด ·
  กาง FIFO ละเอียด (ล็อต/อายุ) · sheet แก้คงเหลือ · sheet ตั้งเกณฑ์แจ้งเตือน LINE
- ✅ `pages/stockdetail.js` — รายละเอียด: คงเหลือรวม · แยกของหายไป→ขายจริง · ล็อต FIFO · มูลค่าทิ้ง(เจ้าของ)

### wiring
- `app.js` `renderContent()` route → จอจริง (`count · orderrecv · waste · stocklist · stockdetail`)
  ส่ง ctx `{ go, back, role, toast, shopCtx }` (+ `mode` ให้ orderrecv, `low/id` ให้ stock)
- `placeholder.js` เพิ่ม `dailyreport`(เฟส 3) · `menulist`(เฟส 2) สำหรับ route ที่ยังไม่ทำ

### หมายเหตุ (เฟส 1 = ลอกหน้าตา+พฤติกรรม · ยังไม่ persist จริง)
- บันทึกนับ/สั่ง/รับ/ทิ้ง = toast + นำทาง (เดโม) เหมือน prototype — **การ apply เข้า `stock_items` จริง
  (count=set, receive=add) อยู่เฟสถัดไป** (ตาม ARCHITECTURE TODO #2) · แก้คงเหลือใน stocklist
  เป็น override ใน-รอบ (เดโม)
- เพิ่มรายการในหน้านับ = เขียนข้อมูลกลางจริงผ่าน `saveItem()` → `bumpData()` → app rerender
  (state ของจอเก็บใน module + draft ใน localStorage จึงคงอยู่ข้าม rerender)
- `stockOf/stockVariants` อ่านจาก `STOCK_SEED` (เหมือน prototype) — เฟส 4 ค่อยต่อ stock จริงใน store

---

## ✅ เฟส 2 — จอเจ้าของ: ข้อมูลกลาง + ตั้งค่า (vanilla ตรง prototype)  (เสร็จแล้ว)

ผลลัพธ์: จาก placeholder → จอจริง 9 จอ เจ้าของจัดการข้อมูลกลาง + ปรับค่าระบบเองได้ครบ
ทุกการแก้เก็บ audit จริง (localStorage) · ตรวจแล้วเรนเดอร์ครบ ไม่มี console error
อ้างอิง: `screens-master.jsx · screens-more.jsx · screens-extras.jsx`

### ส่วนกลางใหม่ (infra)
- `src/data/editlog.js` — **audit trail จริง** (`logEdit({txt,kind,by})` · `getEditLogs()`) เก็บ
  `cfr9:editlog:v1` (ลบไม่ได้ · ใหม่สุดบน · seed ครั้งแรกด้วย AUDIT เดิม) — แยกจาก store กัน import วน
- `src/data/store.js` — เพิ่ม `persistData()` (บันทึกเงียบ ไม่ bump) ใช้ตอนพิมพ์ช่อง ต้นทุน/คงเหลือ
  → ไม่ re-render ทั้งแอป ช่องที่พิมพ์ไม่เสีย focus
- `src/utils/formulas.js` — `itemsOf/sectionsFor/orderItems` กรอง `isActive!==false` → soft-delete
  ซ่อนรายการจากทุกหน้าจริง (itemById ยังคืนของที่ลบ เพื่อ resolve ชื่อใน log/recv) · `_entry.js` ค้นหากรองด้วย
- `components.js` — เพิ่ม `iconPicker()` (อัปรูปเอง `<image-slot>` + เลือกไอคอนสำเร็จรูป) + `ICON_CHOICES`

### จอที่ทำแล้ว (vanilla)
- ✅ `pages/master.js` — **ข้อมูลกลาง CRUD เต็ม** 6 แท็บ (ทั้งหมด/สั่ง/รับ/นับ/ทิ้ง/คงเหลือ) ·
  เพิ่ม/ลบ(soft-delete)/แก้ชื่อ-ราคา/เปลี่ยนไอคอน/สลับลำดับ/ย้ายหมวด + แก้คงเหลือย้อนหลัง (DateBar) ·
  sheet แก้รายการ (IconPicker) + sheet แก้หมวด · นับ/ทิ้ง reuse `entryList` · ทุกแก้ → `logEdit`
- ✅ `pages/assumptions.js` — ปรับค่ากลาง persist จริง (mutate + `persistData` + `logEdit`)
- ✅ `pages/colorsettings.js` — ธีมสำเร็จรูป 6 ชุด + ปรับเองทีละส่วน · `ctx.setTheme` (app.js) persist `cfr9:theme:v1`
- ✅ `pages/recipes.js` — เครื่องคิดสัดส่วนสูตร (แก้ช่องไหนก็ปรับช่องอื่นตามสัดส่วน · ในที่ ไม่เสีย focus)
- ✅ `pages/manual.js` — คู่มือพนักงาน (accordion + เพิ่มหัวข้อ เจ้าของ)
- ✅ `pages/music.js` — เพลงร้าน (now-playing · playlist · sheet ตัดเพลง/ส่งออก · เพิ่ม playlist)
- ✅ `pages/history.js` — ประวัติ + **audit จาก editlog จริง** (RECORDS เดโม + ประวัติแก้ไขจริง)
- ✅ `pages/payroll.js` — ค่าแรง รายวัน/เงินเดือน + OT (รวมในที่ ไม่เสีย focus · เพิ่ม/ลบ → paint)
- ✅ `pages/unitconvert.js` — แปลงหน่วย + ตัวลองคำนวณไข่ (ดึง `egg-tray` จาก assumption)

### wiring
- `app.js` `renderContent()` route → จอจริง 9 จอ · เพิ่ม `setTheme(patch)` (merge + saveTheme + renderChrome)
  ส่ง `theme/setTheme` ใน sctx ให้ colorsettings
- หน้าค้นหา (master/recipes) refocus ช่องค้นหาหลัง paint (กัน focus หลุดตอนพิมพ์)

### หมายเหตุ
- ลอกหน้าตา+พฤติกรรมตรง prototype · ข้อมูลยัง localStorage (assumption/ธีม/ข้อมูลกลาง persist จริง)
- แก้คงเหลือ (แท็บ stock) เขียน `stock` ใน store (วันนี้) — หน้า stocklist เฟส 1 ยังอ่าน `STOCK_SEED`
  (sync stock จริงทุกหน้า = เฟส 4 ตาม ARCHITECTURE TODO #2) · ย้อนหลังเก็บใน qtyMap ในรอบ
- `tax · execsummary · money · forecast · export · income · expense` = เฟส 3 (ยังเป็น placeholder)

---

## ✅ เฟส 3 — เงิน + รายงาน + พยากรณ์ + ภาษี (vanilla ตรง prototype)  (เสร็จแล้ว)

ผลลัพธ์: จาก placeholder → จอจริงครบ ส่วนตัวเลข/วิเคราะห์ใช้งานได้เต็ม (ข้อมูลยัง localStorage)
ตรวจแล้วเรนเดอร์ครบทุกจอ ไม่มี console error
อ้างอิง: `screens-money.jsx · screens-reports.jsx · screens-forecast.jsx · screens-orderexp.jsx` +
`TaxScreen`/`ExecSummaryScreen`/`LineSendScreen` (ใน screens-master/reports)

### ส่วนกลางใหม่ (infra)
- `src/data/seed.js` — เพิ่ม `FC_HISTORY` (back-test) · ที่เหลือ (MONEY · INCOME_LOG · GP_PCT · COUNT_RESULT ·
  TOP/BOTTOM · DOW_SALES · INV_GROUPS · STOCKVAL_CUM · RECV_LOG ฯลฯ) พอร์ตไว้ตั้งแต่เฟส 0
- `src/utils/formulas.js` — เพิ่มสูตรภาษี `pit()` (PIT ขั้นบันได) · `cit()` (นิติบุคคล SME) ·
  พอร์ตจาก prototype ตรงๆ · ที่เหลือ (`SALES_CUM · DAILY_INEX · breakevenPerDay · STOCK_DAYS · fc7 ·
  recvOf · shipOf/setShipOf ฯลฯ`) มีตั้งแต่เฟส 0
- `src/components/components.js` — เพิ่ม `dateBar({day,onChange})` (เลือกวัน ดู/แก้ย้อนหลัง)
- `src/components/charts.js` — `lineChart()` (เส้นสะสม) + `comboChart()` (แท่งรับ/จ่าย + เส้นสะสม +
  เส้นประเป้า/คุ้มทุน) สร้าง SVG ด้วย namespace (class ตรง proto.css `.linechart .combo`)

### จอที่ทำแล้ว (vanilla)
- ✅ `pages/money.js` — ปฏิทินรายรับ-จ่าย · ยอดสุทธิเดือน (เจ้าของ) · แตะวัน → ดู/แก้
- ✅ `pages/income.js` — บันทึกรายได้ 5 ช่องทาง · `net = gross − (GP + Marketing)` · ปุ่มช่วยคิด GP%+VAT7% ·
  กันคีย์ซ้ำ (ดึงค่าเดิมมาแก้ทับ) · ช่องเลขอัปเดต cut/net live ไม่เสีย focus
- ✅ `pages/expense.js` — บันทึกค่าใช้จ่าย · หมวด pack/rice/sauce/dry กรอกเป็นรายการ (link ข้อมูลกลาง · แก้ ฿/หน่วยได้) ·
  หมวดอื่นกรอกยอดรวม · รวมยอด live
- ✅ `pages/reports.js` — แท็บ **รายงาน** + จอย่อย: `incExpReportScreen` (กราฟผสม + จุดคุ้มทุน) ·
  `topSellersScreen` · `lowSellersScreen` (อันดับ + ขายตามวัน) · `stockReportScreen` (Inventory Analysis:
  ใช้ได้กี่วัน · มูลค่าสะสม · ขายจริง)
- ✅ `pages/forecast.js` — พยากรณ์ 7 วันทุกเมนู (ช่วง ต่ำ/สูง · เฉลี่ยถ่วง · ความน่าจะเป็น) + รวมต่อวัน +
  ค้นหา/กรองหมวด (refocus กัน focus หลุด) · `fcHistoryScreen` (back-test)
- ✅ `pages/tax.js` — แท็บ คำนวณภาษี (PIT) + วางแผนภาษี (บุคคล/หสม./นิติบุคคล + VAT) · ดึง default จากระบบ ·
  ช่องเลขอัปเดต result card live ไม่เสีย focus
- ✅ `pages/orderexpense.js` — ปฏิทินต้นทุนรับของ · แตะวัน → รายละเอียด + กรอกค่าส่ง (live) · ต้นทุนดึงจากข้อมูลกลาง
- ✅ `pages/linesend.js` — ส่งเข้ากลุ่ม LINE: เลือกหัวข้อ → ระบบแต่งข้อความ → ส่งทีเดียว (UI ครบ · ยิงจริงเฟส 4)
- ✅ `pages/execsummary.js` — สรุปผู้บริหาร (พร้อมปริ้น) · KPI · รายได้/จ่ายตามหมวด · พยากรณ์

### wiring
- `app.js` `renderContent()` route → จอจริง: `money · income · expense · forecast · fchistory · tax ·
  execsummary · orderexpense · linesend · dailyreport · incexpreport · topsellers · lowsellers · stockreport`
- แท็บ `reports` → `reportsScreen(ctx)` (เลิกใช้ `tabPlaceholder("reports")`)

### หมายเหตุ
- ลอกหน้าตา+พฤติกรรมตรง prototype · ข้อมูลยัง localStorage · บันทึก = toast + นำทาง (เดโม)
- โมดูลแยกบัญชี/ภาษี: `pit`/`cit` แยกเป็นสูตรใน `formulas.js` (ขยายเป็น financeService/ผังบัญชีได้ภายหลัง)
- ยังเป็น placeholder: `export` (ส่งออก & สำรอง) · `dailyreport` map ไป `linesend` (ตามต้นแบบ)

---

## ✅ เฟส 2.5 — แท็บ "ข้อมูล" + โภชนาการ + กันลบด้วยรหัส + พยากรณ์ผูก assumption (เสร็จแล้ว)

ผลลัพธ์: แท็บ `data` จาก placeholder → จอจริง (hub) + หน้าใหม่ + แก้ตามที่เจ้าของสั่ง 6 ข้อ
ตรวจแล้วทุก flow ผ่าน (DOM + unit) ไม่มี console error

### จอ/ไฟล์ใหม่
- ✅ `pages/data.js` — แท็บ "ข้อมูล" (hub) link ข้อมูลกลาง: การ์ด **"ระยะเวลาสินค้าคงเหลือ & อายุสินค้าเก่า"**
  (เปลี่ยนชื่อจาก "สินค้าคงเหลือ") + **legend อธิบายตัวเลข**: เลขใหญ่ = ใช้ได้กี่วัน (คงเหลือ÷ยอดใช้/วัน) ·
  ล็อต = FIFO เข้าก่อน-ออกก่อน (อายุแต่ละล็อต) — แก้ปัญหา "เลขข้างหลังคืออะไร / FIFO ดูยังไง" ·
  + การ์ดโภชนาการ · เมนู·ราคา · รายรับ-จ่าย
- ✅ `pages/nutrition.js` — **โภชนาการและสารอาหาร**: seg ต่อเมนู / ต่อวัตถุดิบ · พลังงาน·โปรตีน·คาร์บ·ไขมัน
  (เช่น อกไก่ 100 ก. = 120 kcal · โปรตีน 22.5) · ค่าจาก `seed.js` (`MENU_NUTRI` · `INGR_NUTRI`) เดโม
- ✅ `pages/menulist.js` — เมนู·ราคาขาย (ราคา − ส่วนลด = สุทธิ) อ่าน MENUS

### แก้ไขตามที่สั่ง
- ✅ (#5) เพิ่มหมวด/รายการเอง — **มีอยู่แล้ว** ใน `master.js` (`addCat` · `openAddItem`) propagate ทุกหน้า (bumpData)
- ✅ (#6) **กันลบด้วยรหัส 9999** — `sheet.js` `pinSheetBody()` (คีย์แพด · ผิด=สั่น/ล้าง · ถูก=ลบ) ·
  ผูกที่ `master.js` ลบรายการ/ลบหมวด และ `assumptions.js` ลบค่าที่เพิ่มเอง · CSS `.pin-*` ใน proto.css
- ✅ (#4) **assumptions เพิ่ม/ลบเองได้ทุกกลุ่ม** (`assumptions.js`): ปุ่ม "เพิ่มค่าในกลุ่มนี้" ทุกกลุ่ม ·
  ค่าที่เพิ่มเองแก้ชื่อ/หน่วยได้ + ลบได้ (ผ่าน PIN) · กันค่าที่พิมพ์ค้างหาย (flushVals ก่อน add/del)
- ✅ (#3/#4) **พยากรณ์ผูก assumption จริง** (`formulas.js fc7`): เดิม fc7 **ไม่ได้อ่าน assumption เลย** →
  ตอนนี้ `order-buf` (เผื่อความปลอดภัย %) → คำนวณ **"แนะนำสั่ง/วัน"** (แสดงแถบเขียวในการ์ด) ·
  `fc-window` (เดือนย้อนหลัง) → ยิ่งมาก ช่วงคาดการณ์ยิ่งแคบ (มั่นใจขึ้น) · ทดสอบ: buf 10→25% ทำ rec 2.43→2.74 ✓

### wiring
- `app.js` route: แท็บ `data` → `dataScreen` · route `nutrition` · `menulist`
- ⚠️ พยากรณ์ยังเป็น **เดโม** (ฐาน hash + วันในสัปดาห์) — สูตรจริงจากข้อมูลขายจริงรอเฟส 4 (Supabase) ·
  แต่ assumption เชื่อมกับผลแล้ว (ปรับค่า → ตัวเลขเปลี่ยนจริง)
- โภชนาการเป็นค่าประมาณเดโม — เจ้าของใส่ค่าจริงต่อเมนู/วัตถุดิบได้รอบถัดไป

---

## ✅ เฟส 4a — ต่อ Supabase จริง + เชื่อม data layer ผ่าน gateway  (เสร็จแล้ว)

ผลลัพธ์: เปิดแอป → ข้อมูลมาจาก **Supabase จริง** · ปิดเน็ต/ยังไม่ config → ยังกรอก/ดูได้ (localStorage)
หน้าจอ **ไม่ต้องแก้เลย** (store ยังคืน Promise เหมือนเดิม) · ตรวจแล้ว round-trip ครบ ไม่มี console error

### 1) config.js
- กรอก `SUPABASE_URL` + `SUPABASE_ANON_KEY` (**public anon เท่านั้น** — ไม่มี secret) · เพิ่ม `RECEIPTS_BUCKET`
- `TABLES` ทุกตัวเป็น prefix **`rama9_`** (`item_master → rama9_item_master`, `stock_items_rama9 → rama9_stock_items` ฯลฯ)
  + key ใหม่: `shops → rama9_shops` · และ key ของ store collections: `categories · assumptions ·
  nutritionMenu · nutritionIngredient` (เดิมมี itemMaster/stockItems/menuPrices แล้ว)
- ชื่อตามที่สั่ง: `incomeRecords → rama9_income` · `expenseRecords → rama9_expenses` · `menuPrices → rama9_menus`
- ทุกที่ resolve ผ่าน `tableName(key)` — **ไม่มี hardcode ชื่อตารางนอก config.js**

### 2) ตาราง Supabase (Claude สร้างให้ผ่านเครื่องมือ — เจ้าของไม่ต้องรัน SQL)
- project เดิม: **Stock Tracker** (`qxhvmrxbrrweundfspzp`, ap-northeast-1) · schema `public`
- สร้าง `rama9_*` ครบทุก key ใน TABLES:
  - **store collections** เก็บเป็น `(id text pk, data jsonb, updated_at)` — รองรับรูปทรงซับซ้อน
    (cats.subs / stock.lots / nutri เป็น map) โดยไม่ต้อง map คอลัมน์ทีละช่อง
  - `rama9_item_master` เพิ่มคอลัมน์ **`cost`** (generated จาก data) แยกไว้ ให้ซ่อนต้นทุนได้ในอนาคต
  - `rama9_menus` มีคอลัมน์ **`shops text[]`** (tag ว่าเมนูอยู่ร้านไหน · default `{rama9}`)
  - `rama9_shops` (relational, seed แถว `rama9` = สาขาพระราม 9)
  - `rama9_income` มีคอลัมน์ **`shop`** (FK → rama9_shops) · `rama9_expenses` มี **`receipt_url`** (แนบใบเสร็จ)
  - bucket Storage **`rama9-receipts`** (private) สำหรับรูปใบเสร็จ (วิสัยทัศน์บัญชี)
- **RLS:** เปิดทุกตาราง + policy ให้ role `anon`/`authenticated` (คีย์ที่แอปใช้) ทำงานได้
  - มี `rama9_is_owner()` (อ่าน JWT claim `app_role`) + view **`rama9_item_master_staff`** (ตัด `cost` ออก)
    เตรียมไว้ — พอผูก PIN เข้า Supabase Auth จริง (เฟส 4b) ค่อยเปิดแยกสิทธิ์ owner/staff ระดับ DB
  - ⚠️ ตอนนี้ยัง**ไม่มี auth จริง** (login = รหัส 4 หลักเดโม) → การซ่อนต้นทุนจาก staff ยัง**บังคับฝั่ง client**
    (role + `FEATURE_FLAGS.enableAdminCost`) · แยกสิทธิ์ระดับ DB = เฟส 4b
- รัน advisor security+performance หลังสร้าง: error ทั้งหมดเป็นของตารางแอปอื่น (ไม่ใช่ rama9_) · ของเรา
  แก้แล้ว — รวม policy ซ้ำ (multiple_permissive_policies) + เพิ่ม index FK (`rama9_income/expenses.shop`) ·
  เหลือ `rls_policy_always_true` (ตั้งใจ — anon app ยังไม่มี auth)

### 3) เชื่อม data layer ผ่าน gateway (สำคัญ — เดิมยังไม่ต่อกัน)
- `api/supabaseClient.js` — **client จริง**: dynamic import `@supabase/supabase-js@2` ผ่าน CDN (esm.sh)
  คืน contract เดียวกับ mock: `select/insert/update/remove` + `upsertMany` (batch) · error → throw
- `api/apiClient.js` — gateway: ลอง Supabase ก่อน · พลาด (เน็ตล่ม) → **fallback เป็น mock (localStorage)**
  อัตโนมัติ + ติดสถานะ online/offline (`isOnline()` · `onStatus()`)
- `data/backend.js` (ใหม่) — sync ระหว่าง `data/store.js` ↔ Supabase ผ่าน gateway:
  - `hydrateData()` (boot): ดึงทุก collection · มีบนคลาวด์ → adopt · คลาวด์ว่างแต่ออนไลน์ → **seed
    คลาวด์จาก local** · เสร็จ `bumpData()` ให้ทุกหน้าวาดใหม่
  - `scheduleSync()` (debounce 1.2s): เรียกจาก `store.persist()` ทุกการเขียน → push ทุก collection ขึ้น
    คลาวด์ + ลบแถวที่ถูกลบในเครื่อง (เทียบ id) · หน้าจอไม่รู้ตัว
- `data/store.js` — `persist()` ยิง `scheduleSync()` · เพิ่ม `__adoptRemote()` (รับค่าจากคลาวด์โดยไม่ push กลับ) ·
  re-export `hydrateData` · **getter/writer signatures เดิมทั้งหมด → หน้าจอไม่ต้องแก้**
- `app.js` — boot เรียก `hydrateData()` · แถบสถานะบนสุดบอก online (ข้อมูลจริง) / offline (ใช้ในเครื่อง) /
  ยังไม่ config (เดโม) แทนข้อความเดิม

### ตรวจแล้ว
- เปิดแอปครั้งแรก → seed ขึ้น Supabase สำเร็จ: items 55 · cats 7 · menus 13 · assumptions 11 · stock 7 ·
  nutri_menu 13 · nutri_ingr 22 (ตรง seed) · `cost` owner = 320 / staff view ไม่มี cost · `menus.shops = {rama9}`

### เหลือทำ (เฟส 4b+)
- **auth จริง**: ผูก PIN/LIFF เข้า Supabase Auth → เปิดแยกสิทธิ์ owner/staff ระดับ DB (เลิกพึ่ง client) ·
  ชี้ data path ของ staff ไป `rama9_item_master_staff`
- ผูกหน้าจอ income/expense/orders/receipts เข้าตาราง relational จริง (ตอนนี้ยังเป็นเดโม localStorage) +
  อัปโหลดใบเสร็จเข้า bucket · ส่ง LINE จริง (`reportService` + webhook) · deploy Cloudflare Pages

---

## ✅ เฟส 4b — Login จริง (PIN) + LIFF (ออปชัน) + PWA  (เสร็จแล้ว)

ผลลัพธ์: เข้าระบบจริงด้วยรหัสผ่าน 4 หลัก (เลิก stub ที่รับทุกรหัส) · หน้าแรกทักทายตามชื่อ ·
เจ้าของ/พนักงานจัดการรหัสผ่านได้ตามสิทธิ์ · กด "เพิ่มไปหน้าจอโฮม" บนมือถือได้ เปิดเต็มจอเหมือนแอป
ตรวจแล้ว: login ทั้ง 3 ระดับ + การ์ดผู้ใช้ทั้งสองฝั่ง เรนเดอร์ครบ ไม่มี console error

### 1) ผู้ใช้ + รหัสผ่าน (ข้อมูล)
- `data/seed.js` — `USERS_SEED` 7 คน (เหมยลี่/แชมป์ = เจ้าของ · แก้ว/ซู = หัวหน้า · ออม/user2/user3 = พนักงาน)
  ชื่อขึ้นต้น "user<เลข>" = ยังไม่ตั้งชื่อ → ถือว่า login นั้นยังไม่มีผู้ใช้งาน
- `data/store.js` — เพิ่ม collection **`users`** (async เต็มรูปแบบ): `getUsers · findUserByPin · saveUser ·
  removeUser` + sync getter `users() · userById() · userByPin()` · seed/migrate ใน initData
- `data/backend.js` — เพิ่ม `users` เข้า COLLECTIONS → sync ขึ้น **`rama9_users`** ผ่าน gateway (debounce)
- ทุกอย่างผ่าน store/service layer · ไม่ hardcode รหัส/ตารางนอก config+seed

### 2) Login จริง (ทางหลัก = webapp ปกติ)
- `services/authService.js` — เขียนใหม่: `login(pin)` ตรวจ PIN เทียบ `rama9_users` จริง →
  `{ ok, user }` หรือ `{ ok:false, reason:"notfound"|"blocked" }` · `LEVELS` (เจ้าของ>หัวหน้า>พนักงาน)
  + `appRoleOf/rankOf/isPlaceholderName` · `initSession()` สำหรับ LIFF (คืน user หรือ null)
- `components/login.js` — **ไม่มีการ์ดแบ่งระดับแล้ว** · กรอกรหัส 4 หลักอย่างเดียว → ระบบคัดแยกสิทธิ์เอง ·
  รหัสผิด/ถูกบล็อก = สั่น + ล้าง + ข้อความ (`.login-err`)
- `app.js` — `onLoginSubmit` ยิง `authService.login` · session เก็บ user เต็ม (`cfr9:session`) ·
  **`liveUser()`** อ่าน user สดจาก store ตาม id ทุกครั้ง → แก้ชื่อ/ระดับ/บล็อก เห็นผลทันที (fallback = snapshot)
  · `role()` = appRole ของ user สด · logout เคลียร์เหมือนเดิม
- `pages/home.js` — ฮีโร่ทักทาย **"สวัสดี <ชื่อ>!"** · ถ้าชื่อยังเป็น user<เลข> → "login นี้ยังไม่ได้ตั้งชื่อผู้ใช้"

### 3) การ์ด "ผู้ใช้ & รหัสผ่าน" (`pages/users.js`)
- **เจ้าของ** (ใน `more.js` แท็บเพิ่มเติม) `ownerUsersCard` — เห็น Password+ระดับ+ชื่อ ของทุกคน
  (เรียงสูง→ต่ำ) · เพิ่มผู้ใช้ · แก้ชื่อ/รหัส/ระดับ/บล็อก/ลบ ได้ทุกคน **ยกเว้นบัญชีเจ้าของ** (แถวเจ้าของล็อก 🔒) ·
  validate รหัส 4 หลัก + ห้ามซ้ำ
- **พนักงาน** (ใน `more.js` แท็บบัญชี) `staffUsersCard` — เห็น Password+ชื่อ **เฉพาะตัวเอง + ระดับที่ต่ำกว่า**
  (ไม่โชว์ระดับ — รับรู้สิทธิ์รายบุคคล) · แก้ชื่อ/เปลี่ยนรหัสได้ · การ์ดโปรไฟล์โชว์ชื่อจริงของผู้ล็อกอิน
- งดบอกสิทธิ์/ระดับในพื้นที่ส่วนกลางที่ทุกคนเห็น (ตามที่สั่ง) · CSS `.user-row .pw-chip .lvl-badge` ใน proto.css

### 4) LIFF (LINE) = ออปชันเสริม
- คง `CONFIG.LIFF.ENABLED=false` เป็น default → webapp ปกติ ไม่ error
- `liff/liffService.js` — โหลด LIFF SDK + `liff.init({liffId})` + `getProfile` จริง **เฉพาะตอน ENABLED=true** ·
  try/catch ถอยกลับเป็น webapp ถ้าโหลด/init ไม่ได้ · `app.js` boot auto-login ผ่าน `initSession()` เมื่อเปิด LIFF
- เปิดทีหลังได้แค่ใส่ `LIFF_ID` + flip flag → flow webapp ไม่พัง

### 5) PWA (ติดไอคอนหน้าจอเหมือนแอปจริง)
- `manifest.webmanifest` — name/short_name/start_url "."/display standalone/theme_color #0F7A35/
  background_color/icons 192·512·maskable
- `index.html` — `<link rel=manifest>` + apple-touch-icon 180 + meta `apple-mobile-web-app-capable` /
  `mobile-web-app-capable` / `apple-mobile-web-app-title="โคตรคลีน"` + register `sw.js` (try/catch)
- `sw.js` — service worker · **network-first** สำหรับ app shell (html/css/js) + fallback cache (ออฟไลน์เปิดได้) ·
  static (icon/รูป/ฟอนต์) = cache-first · ข้ามคำขอข้ามโดเมน (Supabase/esm.sh/LIFF) · activate เคลียร์แคชเก่า
  > หมายเหตุ: เปลี่ยนจาก cache-first เป็น **network-first** (bump `cfr9-shell-v2`) เพื่อให้เจ้าของแก้โค้ดกับ AI
  > แล้วเห็นผลทันทีหลังรีเฟรช (cache-first เดิมล็อกโค้ดเก่าไว้จนกว่าจะ bump เวอร์ชันเอง) · ยังออฟไลน์ได้เหมือนเดิม
- `icons/` — icon-192/512/maskable-512/apple-touch-180 (placeholder สปราวต์เขียว — เปลี่ยนเป็นโลโก้จริงทีหลังได้)

### เหลือทำ (เฟสถัดไป)
- ผูก PIN เข้า Supabase Auth จริง → เปิดแยกสิทธิ์ owner/staff ระดับ DB (ตอนนี้คัดสิทธิ์ฝั่ง client) ·
  แยกสิทธิ์ หัวหน้า/พนักงาน (ตอนนี้เท่ากัน) · ไอคอน PWA ตัวจริง · ส่ง LINE จริง · deploy Cloudflare Pages

---

## ✅ เฟส 5 — งานที่มอบหมาย + โน้ต บนหน้าแรก (per user) + ย้ายการ์ดทีมงานเป็นพับได้  (เสร็จแล้ว)

ผลลัพธ์: หน้าแรกของแต่ละคนมี "สิ่งที่ต้องทำของฉัน" · คนระดับสูงมอบงานให้คนต่ำกว่าได้ · งานลิงก์คู่มือได้ ·
การ์ด "ผู้ใช้ & รหัสผ่าน" ย้ายเข้าการ์ดพับได้ใต้ overline "ทีมงาน" + ปรับกฎมองเห็น/แก้ไขใหม่
ตรวจแล้ว (DOM/eval): login ทุกระดับ · ติ๊กเสร็จ · ลิงก์คู่มือ · มอบหมายงาน insert+persist ครบ ไม่มี console error

### 1) data — rama9_tasks
- `config.js` — เพิ่ม key `tasks → "rama9_tasks"` (ผ่าน `tableName()` เท่านั้น)
- `data/seed.js` — `TASKS_SEED` (เดโม 3 งานให้ ออม: task×2 ผูกคู่มือ + notice×1)
  ฟิลด์: id · assignee_id · assigner_id · title · detail · kind('task'|'notice') · manual_ref · status('open'|'done') · created_at · done_at
- `data/store.js` — collection `tasks` (async): `getTasks · getTasksFor · getTasksAssignedBy · addTask ·
  setTaskStatus · saveTask · removeTask` + getter `tasksRows()` · seed/migrate ใน initData
- `data/backend.js` — เพิ่ม `tasks` เข้า COLLECTIONS → sync `rama9_tasks` ผ่าน gateway (debounce)
  > ⚠️ ตาราง `rama9_tasks` ฝั่ง Supabase ยัง **ไม่ได้สร้าง** (ไม่มีเครื่องมือ SQL รอบนี้) — apiClient fallback
  > เป็น localStorage อัตโนมัติ จึงใช้งานได้ครบ · สร้างตารางจริง (+RLS) ในเฟส auth ตามสเปกที่แนบ

### 2) หน้าแรก (`pages/home.js`)
- การ์ด **"สิ่งที่ต้องทำของฉัน"** ใต้ hero ก่อนการ์ดงานหลัก · โหลดเฉพาะ assignee = ผู้ login
- แต่ละรายการ: checkbox ติ๊กเสร็จ (ขีดฆ่า · `setTaskStatus`) · notice มี badge "ประกาศ" ·
  ถ้ามี `manual_ref` โชว์ปุ่ม "เปิดคู่มือ" → `go({name:"manual", ref})`
- ไม่มีงาน → empty state (มาสคอต + "วันนี้ไม่มีงานค้าง 🎉")
- จำนวนงานค้าง **ผูกกับ bell dot** (เลิก hardcode "3" · ซ่อนเมื่อ 0)

### 3) มอบหมายงาน (ในชีตจัดการผู้ใช้ · `pages/users.js`)
- เปิดคนที่ระดับต่ำกว่า → section "งานที่มอบหมาย": รายการงานที่ฉันมอบ (สถานะ ค้าง/เสร็จ · ติ๊ก/ลบได้) +
  ฟอร์มมอบงานใหม่ (title + detail + เลือกหัวข้อคู่มือออปชัน) → `addTask`
- คนมอบเห็นสถานะ (open/done) ของงานที่ตัวเองมอบ · รับพนักงานใหม่ = เพิ่มบัญชี (เจ้าของ) แล้วเปิดมอบงานได้ในที่เดียว
- `manual.js` รับ `ref` → กางหัวข้อนั้นทันที (deep-link) · `app.js` ส่ง `r.ref` เข้า manualScreen

### 4) ย้ายการ์ดทีมงาน → พับได้ + กฎใหม่ (`pages/users.js` เขียนใหม่เป็น `teamCard` เดียว)
- **acc-card พับได้** (default พับ) ใต้ overline **"ทีมงาน"** · หัวการ์ดสรุปนับ (เจ้าของเห็น breakdown ระดับ ·
  คนอื่นเห็น "คุณ + ทีมที่ดูแล N คน") · toggle เฉพาะตัวการ์ด ไม่ re-render ทั้งแท็บ
- ใช้ component เดียวทั้งแท็บเพิ่มเติม (เจ้าของ) และบัญชี (ไม่ใช่เจ้าของ) — กฎคิดจากระดับผู้ดู:
  - **เห็น**: เจ้าของเห็นทุกคน · คนอื่นเห็นตัวเอง + ระดับที่ต่ำกว่า (ระดับเดียวกันไม่เห็นกัน)
  - **แก้**: ระดับสูงกว่าจัดการคนต่ำกว่าได้เต็ม (ชื่อ/รหัส/บล็อก/ลบ/มอบงาน) · ทุกคนแก้ชื่อ/รหัสตัวเอง ·
    บัญชีเจ้าของคนอื่น = ล็อก · เปลี่ยน "ระดับ" + เพิ่มผู้ใช้ = เฉพาะเจ้าของ
  - ไม่ broadcast ระดับ: โชว์ badge ระดับเฉพาะมุมมองเจ้าของ
- CSS เพิ่ม `.task-card .task-row .task-check .task-manual .assign-task` ใน proto.css
- ลำดับชั้นบังคับฝั่ง client · เขียนให้ย้ายเป็น RLS ได้ตรงตอนเฟส auth

### เหลือทำ (เฟสถัดไป)
- สร้างตาราง `rama9_tasks` จริง + RLS (SELECT/INSERT/UPDATE ตามระดับ) ตอนลง Supabase Auth ·
  กำหนดส่ง/ครบกำหนด · งานประจำ(recurring) · push noti · โน้ต-ถึงตัวเอง (data model รองรับแล้ว)

---

## ✅ เฟส 6 — งานและข้อความ (per role) + ยอดขายทุกสาขา + เพิ่มเติม/บัญชีสีสัน  (เสร็จแล้ว)

ผลลัพธ์: การ์ด "งานและข้อความ" บนหน้าแรกแสดงตามระดับผู้ใช้ · เลือกผู้รับได้เฉพาะคนที่ต่ำกว่า ·
เจ้าของเห็นยอดขายทุกสาขาแทนการ์ดงาน · หน้าเพิ่มเติม/บัญชีปรับเป็นพาสเทลหลากสีเข้าชุดหน้าแรก
ตรวจแล้วทั้ง 3 ระดับ (เจ้าของ/หัวหน้า/พนักงาน) เรนเดอร์ครบ ไม่มี console error

### 1) data model (ขยาย rama9_tasks — ไม่รื้อของเดิม)
- `seed.js` `TASKS_SEED` เขียนใหม่ครบทุกซีนาริโอ · ฟิลด์เพิ่ม: `kind:'task'|'notice'|'note'` ·
  `status:'open'|'submitted'|'done'` (submitted = พนักงานกดเสร็จ รอตรวจ) · `due` (เลขวันในเดือน) ·
  `urgent` · `acked` (รับทราบประกาศ) · `bounced` (งานที่ถูกตีกลับ)
- `seed.js` เพิ่ม `SALES_BRANCHES · SALES_30D · SALES_YTD` (เดโมยอดขายทุกสาขา)
- `store.js` เพิ่ม writer: `submitTask · approveTask · reopenTask · ackTask` + migration:
  ถ้าเจอ seed เก่า (`t-seed*`) → แทนด้วยชุดใหม่ทั้งก้อน (กันข้อมูลเก่าค้างใน localStorage)
- `components/icons.js` เพิ่ม `mail · inbox · megaphone · clock · reply`
- `components/charts.js` เพิ่ม `miniBars()` (แท่ง 30 วัน · วันนี้ทึบ · ย้อนหลังพาสเทล)

### 2) ตรรกะกลาง — `utils/messages.js` (ใหม่, pure)
- `canCompose(me)` (owner/lead เท่านั้น) · `recipientsFor(me)` (เฉพาะคนที่ rank ต่ำกว่า:
  owner→หัวหน้า+พนักงาน · lead→พนักงาน · staff→[]) · `recipientGroups` (หัวหน้าทุกคน/พนักงานทุกคน)
- bucket: `inboxFor · notesFor · sentBy · pendingReviewFor (owner=ทุก submitted · lead=ของตัวเอง) ·
  overdueAssignedBy` · `actionCount(me)` (badge ไอคอนจดหมาย = เฉพาะเรื่องที่ต้องจัดการ) ·
  `homeCardSummary(me)` (เลือกหัวข้อเด่นตาม priority + count line สำหรับการ์ดหน้าแรก)

### 3) หน้า งานและข้อความ — `pages/messages.js` (ใหม่ · route `messages`)
- owner/lead: ปุ่ม "สร้างรายการใหม่" + แท็บ กล่องเข้า/งานรอตรวจ/ที่ฉันส่ง ·
  compose sheet: เลือกประเภท (แจ้งให้ทราบ/คำสั่งติดตามผล) · เลือกผู้รับเป็น chip **เฉพาะที่ส่งได้จริง** +
  กลุ่มลัด · ครบกำหนด (ไม่กำหนด/วันนี้/พรุ่งนี้) · งานด่วน · ผูกคู่มือ
- staff: ไม่มีปุ่มสร้าง · เห็นเฉพาะกล่องเข้า + โน้ตส่วนตัว · action: รับทราบ (notice) · ทำเสร็จแล้ว (task→submitted)
- งานรอตรวจ: ปุ่ม อนุมัติ/ตีกลับ · ที่ฉันส่ง: สถานะ ค้าง/รอตรวจ/เสร็จ/เกินกำหนด + ลบ
- `app.js` route `messages` → `messagesScreen(sctx)`

### 4) หน้าแรก — `pages/home.js` (เขียนใหม่ตามระดับ)
- ไอคอนจดหมายบนหัว (ทุกคน) ข้างกระดิ่ง → เข้า `messages` · badge = `actionCount` (เฉพาะเรื่องต้องจัดการ)
- **เจ้าของ**: ไม่มีการ์ดงานถาวร → การ์ด **"ยอดขายทุกสาขาวันนี้"** (รวม + chip แยกสาขา + เส้นสะสมทั้งปี +
  แท่ง 30 วัน + ปุ่ม "ดูรายงานทั้งหมด") · compact card "งานรอตรวจ/เกินกำหนด" **เฉพาะเมื่อมี**
- **หัวหน้า/พนักงาน**: การ์ดสรุป "งานและข้อความ" (preview หัวข้อเด่น + count line) · ถ้าไม่มีเรื่อง → shortcut เล็ก
- เลิกใช้การ์ด checklist เดิม ("สิ่งที่ต้องทำของฉัน") — หน้า Home ไม่รกแล้ว

### 5) เพิ่มเติม / บัญชี — โทนสีสันพาสเทล (เข้าชุดหน้าแรก) — `pages/more.js`
- หัว `moreHero` (มาสคอต + ทักทาย + ประกายดาว) แทน hdr ธรรมดา ·
  การ์ดกลุ่มเป็น `more-card soft-*` (เขียว/ฟ้า/ม่วง/เหลือง/ชมพู/เทอร์ควอยซ์) + overline สีตามกลุ่ม
- เพิ่มแถว "งานและข้อความ" (badge) ทั้งสองแท็บ · บัญชีทักทายด้วยชื่อจริง
- `proto.css` เพิ่ม: badge-blue/violet · mail-btn · sales-card/sb-chip/minibars · review-card ·
  msg-home-card/msg-preview/msg-shortcut · msg-row/msg-act/recip-chip/recip-group · more-hero/more-card/ov-*

### เหลือทำ (เฟสถัดไป)
- แยกทีม/สาขา จริง (ตอนนี้ branch เดียว lead→staff ทั้งหมด) · กรองผู้รับตามทีมเมื่อมีหลายสาขา ·
  สร้าง `rama9_tasks` จริง + RLS ให้ตรงกฎลำดับชั้น (compose/review/ack) ตอนลง Supabase Auth ·
  ผูกยอดขายทุกสาขาเข้าข้อมูลจริงเมื่อมีหลายสาขา (ตอนนี้ SALES_* เป็นเดโม)

---

## ✅ เฟส 6.2 — หน้า export จริง + แก้/เปลี่ยนชื่อร้าน + แถบข้อความวิ่ง + กราฟยอดขายตามแบบ (เสร็จแล้ว)

ผลลัพธ์: ปิด gap UI สุดท้าย (หน้า export) · เจ้าของแก้ชื่อร้านได้ · หน้าแรกพนักงานสะอาดขึ้น (แถบข้อความวิ่งแทนการ์ด) ·
การ์ดกราฟเจ้าของเล็กลง/อ่านง่ายตามแบบที่ส่งมา · ตรวจแล้วทุกบทบาท ไม่มี console error

### 1) หน้า "ส่งออก & สำรอง" — `pages/export.js` (ใหม่ · route `export`)
- **สำรอง (.json) จริง**: อ่านทุก key `cfr9:*` ใน localStorage → ดาวน์โหลดไฟล์ · ปุ่ม "สำรองตอนนี้" + toggle อัตโนมัติ
- **ดาวน์โหลดรายงานจริง**: เลือกรูปแบบ Excel(.xls)/CSV (BOM ไทยอ่านได้) หรือ PDF (เปิดหน้าต่าง print) ·
  เลือกช่วง (เดือนนี้/7วัน/ทั้งหมด) · เลือกชุดข้อมูลหลายชุด (สต๊อก/รายรับ-จ่าย/เมนู/ข้อมูลกลาง/ประวัติ) ดึงจาก store จริง
- **กู้คืน (.json)**: เลือกไฟล์ → เขียนทับ key `cfr9:*` → reload
- `app.js` route `export` → `exportScreen` · `proto.css` เพิ่ม `.ds-row/.ds-check`

### 2) แก้/เปลี่ยนชื่อร้าน (เจ้าของ) — `layout.js storeChip` + `app.js shopCtx`
- เพิ่ม `shopCtx.canEdit` (owner) · `renameShop(old,new)` (กันชื่อว่าง/ซ้ำ · sync `S.shop` ถ้าแก้ร้านปัจจุบัน) ·
  **persist `shops` ใน localStorage** (`cfr9:shops`) เดิมไม่เซฟ
- ใน dropdown เลือกร้าน: เจ้าของเห็นปุ่มดินสอ → แก้ชื่ออินไลน์ (Enter=บันทึก · Esc/✕=ยกเลิก) · `.store-edit-btn/.store-rename-*`
- เปลี่ยนชื่อร้านดีฟอลต์ "ร้านที่ 2" → **"365แคล"** · ชื่อร้านในกราฟ/ทุกที่ดึงจาก `shopCtx.shops` ชุดเดียว

### 3) หน้าแรกพนักงาน/หัวหน้า — แถบข้อความวิ่ง (`home.js msgMarquee`)
- **ลบการ์ด "งานและข้อความ" + "โน้ตของฉัน"** ออก (ซ้ำกับไอคอนจดหมาย) → แทนด้วย **แถบข้อความวิ่งซ้าย→ขวา**
  โชว์เฉพาะเมื่อมีข้อความ/งานต้องจัดการ (เช่น 'ออม : "ฝากเช็คสต๊อก"') วิ่งวนไม่หยุดจนกดปุ่ม "อ่าน" → เข้าศูนย์ข้อความ
- `proto.css` `.msg-ticker/.ticker-*` + `@keyframes tickerLTR` (left:-100%→100%) · pause ตอน hover/active · เคารพ reduced-motion

### 4) การ์ดกราฟยอดขาย (เจ้าของ) — ปรับตามภาพอ้างอิง
- สถิติคู่: เพิ่มปุ่มวงกลม → · เลขไม่ตัดบรรทัด (`home.js statCard`)
- กราฟ (`charts.js branchCombo` เขียนใหม่): กะทัดรัดลง (h168) · **แกนขวามีเส้นกริด + ป้าย K (0/80K/160K/240K)** ·
  เส้นยอดสะสมจุดขาวทุกจุด + ป้ายยอดสะสมจริงปลายเส้น · caption "ยอดสะสม" บนซ้าย ·
  **แท่งวันในเดือนนี้สีสด · วันที่เกิน (พยากรณ์) โปร่งใส** (`day.actual = d<=TODAY.d` · fill-opacity 0.32) ·
  หัวการ์ดมี dropdown ช่วง (ตามวันที่บันทึกจริง / 7 วันล่าสุด) รีเฟรชเฉพาะการ์ด

### เหลือทำ (เฟสถัดไป)
- ยอดขายสาขา 2-3 ยังเป็นเดโม (สาขาหลักลิงก์รายได้จริง) · auto-backup/PDF ยังเป็น client-side ·
  ที่เหลือคงเดิม: Supabase Auth + RLS · ผูก income/expense/orders เข้าตาราง relational · ส่ง LINE จริง · deploy

---

## ✅ เฟส 4c — ส่ง LINE จริง + Export CSV/JSON + DEPLOY.md  (เสร็จแล้ว)

ผลลัพธ์: ปุ่ม "ส่งเข้ากลุ่ม LINE" + "ส่งใบสั่ง" POST จริงไป webhook (ไม่มี secret ใน frontend) ·
มี success/fail toast · export/สำรองครบ · เอกสาร deploy พร้อมขึ้น Cloudflare Pages
ตรวจแล้วทุก flow เรนเดอร์ครบ ไม่มี console error

### 1) ส่ง LINE จริง (`services/reportService.js` — เลิก stub)
- `postWebhook(payload)` — **network call เดียวของโมดูล**: `fetch POST` ไป `CONFIG.REPORT_WEBHOOK_URL`
  body JSON `{app,branch,sentAt,type,title,text,topics,asImage,shop,by}` · **ไม่มี token/secret** —
  webhook ฝั่ง server ถือ channel access token แล้ว push เข้ากลุ่มเอง
- result contract (resolve เสมอ ไม่ throw): `{ok:true}` · `{ok:false,skipped:true}` (ยังไม่ตั้ง webhook) ·
  `{ok:false,error}` (เน็ต/HTTP) · guard ด้วย `FEATURE_FLAGS.enableLineReport` + มี URL
- `sendLineReport({title,text,topics,asImage,shop,by})` (รายงานประจำวัน) · `sendOrderReport(order)`
  (ใบสั่ง — `formatOrderText` แต่งข้อความจาก `{lines:[{name,qty,unit}],shop,date}`) · `sendDailySummary`
- `pages/linesend.js` — `composeText()` แต่งข้อความ plain-text **ตรงกับ preview** (หัวข้อที่ติ๊ก) →
  ปุ่มส่ง = async: กำลังส่ง→toast สำเร็จ/เดโม(skipped)/ล้มเหลว(err) · ล้มเหลวคืนปุ่มให้กดซ้ำ ไม่นำทางออก
- `pages/orderrecv.js` — โหมด "สั่งของ" ยืนยัน → สร้าง lines จาก `valsO` (itemById/unitOf) →
  `sendOrderReport` · toast สำเร็จ/เดโม/ล้มเหลว (รับของ = ยังเป็น local toast เหมือนเดิม)
- `services/orderService.js` เดิมเรียก `sendOrderReport(after)` อยู่แล้ว → ตอนนี้ยิงจริงผ่าน webhook

### 2) toast แจ้งล้มเหลว (`components/sheet.js` + `app.js`)
- `toastNode(message,type)` — `type==="err"` = ไอคอน `alert` + สีแดง (`--danger`) · default = check เขียว
- `showToast/renderToast` รับ `type` ส่งต่อ — page เรียก `ctx.toast(msg,"err")` ได้

### 3) Export CSV/JSON (มีตั้งแต่เฟส 6.2 · ครอบคลุมสเปก 4c)
- `pages/export.js` — สำรอง **.json** จริง (อ่านทุก key `cfr9:*`) + กู้คืน (เขียนทับ→reload) ·
  ดาวน์โหลดรายงาน **Excel(.xls)/CSV** (BOM ไทย) หรือ **PDF** (print) · ชุดข้อมูล:
  สต๊อก / รายรับ-จ่าย / เมนู / ข้อมูลกลาง / ประวัติ — ดึงจาก store จริง ✅ ครบตามสเปก (stock/income/expense/master)

### 4) `app/DEPLOY.md` (ใหม่)
- GitHub → Cloudflare Pages (no build · root = `app/`) · ตั้ง `config.js` (Supabase/webhook/LIFF) ·
  RLS checklist · ตั้ง LINE webhook (payload spec) · รัน advisor · PWA · checklist ก่อนส่งมอบ

### หมายเหตุ / เหลือทำ
- ✅ **Supabase advisor รันแล้ว** (security + performance) เฟส 4c · แก้ `multiple_permissive_policies`
  ของ `rama9_delivery` + `rama9_menu` (ตัด policy ซ้ำ `allow_all_*` เหลือ `rama9_all_write`) ผ่าน migration
  `rama9_dedupe_permissive_policies` · re-run ยืนยันหายแล้ว · `rls_policy_always_true` คงไว้ (ตั้งใจ — ยังไม่มี auth)
  · `unused_index` shop FK เก็บไว้ (ได้ใช้เมื่อมีหลายสาขา) · ERROR `rls_disabled_in_public` 3 ตัว = ตารางระบบอื่น (ไม่ใช่ rama9)
- ข้อความ LINE ยังใช้ตัวเลขเดโม (mirror prototype) — ผูกข้อมูลจริงจาก store ตอนต่อ income/expense relational
- `REPORT_WEBHOOK_URL` default ว่าง = โหมดเดโม (ส่งแล้วไม่ยิงจริง) · ใส่ URL ใน config → ยิงจริงทันที

---

## ✅ เฟส 7 — สต๊อกจริง (ledger) + แยกข้าวจากเมนู + ค่าแรง persist  (เสร็จแล้ว · รอบนี้)

ผลลัพธ์: ปุ่ม "เด้ง toast แต่ไม่เซฟ" หลักของสต๊อกกลายเป็น **บันทึกจริง → sync Supabase** ·
เมนูแยกข้าวออกจากชื่อ + ติ๊กเลือกข้าว · ค่าแรงพนักงานเก็บถาวร
ตรวจแล้ว (import test + UI): receive/count/waste/adjust round-trip ครบ ไม่มี console error

### 1) สต๊อกจริง (rama9_stock_items) — เลิกอ่าน STOCK_SEED คงที่
- `utils/formulas.js` — `stockOf(id)` อ่าน **แถวสต๊อกสด** จาก `stockRows()` ก่อน (ไม่มี → derive เหมือนเดิม) ·
  เพิ่ม `deriveStock(id)` (hash-based, รายการที่ยังไม่มีแถว) · `stStatus(qty,use,threshold)` · `threshOf(id)` ·
  `STOCK_DAYS()` อ่านสต๊อกสดแล้ว · status (ต่ำ/ใกล้หมด/พอ) คิดสดจาก qty÷use เทียบ `low-days` หรือ threshold รายตัว
- `data/store.js` — เครื่องมือสต๊อกจริง (persist + bumpData + scheduleSync + logEdit):
  - `applyReceive(lines,by)` — บวกเข้าคงเหลือ + เพิ่มล็อตวันนี้ (age 0)
  - `applyCount(lines,by)`   — ตั้งคงเหลือ = ยอดที่นับ (set) + ปรับล็อตตามสัดส่วน
  - `applyWaste(lines,by)`   — ตัดออกแบบ FIFO (เก่าก่อน)
  - `editStockQty(id,qty,by)` · `setStockThreshold(id,v)` · `ensureStockRow` (สร้างแถวจาก derive ถ้ายังไม่มี)
- หน้าจอเรียกของจริงแล้ว:
  - `pages/orderrecv.js` รับของ → `applyReceive` (เคลียร์ draft) · แก้บั๊กเดิม: ข้อความใบสั่ง LINE เคยอ่าน key `id:m` ผิด → ใช้ `sumOf` แล้ว
  - `pages/count.js` ยืนยันนับ → `applyCount` แล้วไปหน้าทิ้ง
  - `pages/waste.js` บันทึกของทิ้ง → `applyWaste` (FIFO)
  - `pages/stocklist.js` แก้คงเหลือ → `editStockQty` · ตั้งเกณฑ์รายตัว → `setStockThreshold` (รายการดึงจาก stock สด + `threshOf`)

### 2) แยกข้าวออกจากชื่อเมนู + ติ๊กเลือกข้าว
- `data/seed.js` — `MENUS_SEED` ลบ "+ ข้าว" จากชื่อ + เพิ่ม `rice:bool` · `riceItem` (ชนิดข้าว)
- `data/store.js` — `migMenu()` (idempotent) แยก "+ ข้าว" ออกจากชื่อที่เก็บไว้เดิม + ตั้ง rice/riceItem ·
  รันใน `initData` และ `__adoptRemote('menus')` (กันข้อมูลคลาวด์ที่ชื่อยังมี "+ ข้าว")
- `pages/menulist.js` — แถวเมนูโชว์ป้าย "+ ข้าว · <ชนิดข้าว>" แยกจากชื่อ · ชีตแก้เมนูมี toggle "เสิร์ฟพร้อมข้าว" + เลือกชนิดข้าว ·
  เลือกของโปรตีนตั้งค่าเริ่ม rice=true ให้
- คลาวด์ `rama9_menus` อัปเดตชื่อ+rice ที่ source แล้ว (SQL)

### 3) ค่าแรงพนักงานเก็บถาวร (rama9_payroll — ตารางใหม่)
- สร้างตาราง `rama9_payroll` (id/data jsonb) + RLS `rama9_all_write` (anon/auth) เหมือนตารางอื่น
- `config.js` เพิ่ม key `payroll` · `store.js` collection `payroll` (`getPayroll/setPayroll` · seed PAYROLL) ·
  `backend.js` sync ขึ้นคลาวด์ · `pages/payroll.js` โหลดจาก store + กดบันทึก → `setPayroll` (เคยแค่ toast)

### หมายเหตุ / เหลือทำ (รอบหน้า)
- ของทิ้งในหน้า waste ยังโชว์ "หายไป" เป็นเดโม (แต่การหักสต๊อกจริงแล้ว) · แก้/เพิ่มล็อตทีละล็อตยังไม่มี UI (รับของ=เพิ่มล็อต)
- หน้า reports/forecast/recipes ส่วนวิเคราะห์ยังเดโม (ต้องมีประวัติยอดขายจริงก่อน) · ประวัติแก้ไข (edit history) ยังไม่ persist รายการ
- ถ่ายรูปบิล/สลิป: `<image-slot>` ย่อรูปอัตโนมัติอยู่แล้ว (1200px WebP q0.85) — เหลือผูกหน้า expense/order เข้าถ่าย+อัปจริง
- 🔒 ปิด RLS รอบสุดท้าย (เจ้าของกั๊กไว้ทำหลังเทสต์ครบ) — ตารางใหม่ `rama9_payroll` ใช้ policy หลวมเดียวกัน รอปิดพร้อมกัน

---

## ✅ เฟส 8 — แก้บั๊ก persist รายรับ-จ่าย + audit ขึ้นคลาวด์ + รูปใบเสร็จ + ล็อตจริง  (เสร็จแล้ว · รอบนี้)

ผลลัพธ์: ปิดช่องโหว่ "กดบันทึกแล้วขึ้นว่าเซฟคลาวด์ แต่จริงๆ ไม่ขึ้น" ของรายรับ/รายจ่าย ·
ประวัติการแก้ (audit) ขึ้นคลาวด์แล้ว · แนบรูปใบเสร็จ/สลิปในหน้าค่าใช้จ่าย (บีบอัตโนมัติ) ·
แก้/เพิ่ม/ลบล็อต FIFO ได้จริง (เคยเป็น toast เดโม) · ตรวจ round-trip กับ Supabase จริงผ่านทุกจุด

### 1) 🐞 บั๊กใหญ่: รายรับ/รายจ่าย ไม่ขึ้นคลาวด์จริง (แก้แล้ว)
- ตาราง `rama9_income` / `rama9_expenses` ถูกสร้างแบบ **relational** (ไม่มีคอลัมน์ `data jsonb`)
  แต่ `data/backend.js` sync ทุก collection เป็นรูป `{ id, data }` เหมือนตารางอื่น →
  upsert **ล้มเงียบ** (apiClient fallback เป็น localStorage) ทุกครั้ง · เปิดเครื่องอื่นไม่เห็นข้อมูล
- แก้ที่ DB (migration `rama9_income_expense_jsonb`): เพิ่ม `data jsonb` + `updated_at` ·
  คอลัมน์ relational เดิม (shop/channel/gross_amount/.../category/amount/note/receipt_url)
  เปลี่ยนเป็น **generated column** ดึงค่าจาก `data->>...` (ยังทำรายงาน SQL ได้ · แอป sync ผ่าน jsonb ตามปกติ)
- ทดสอบ: upsert + select + remove ครบทั้ง income/expenses → ขึ้น Supabase จริง (online:true, backend:supabase) ✓
- โค้ดหน้า income.js/expense.js **ไม่ต้องแก้** (เรียก saveIncomeRecord/saveExpenseRecord อยู่แล้ว)

### 2) ประวัติแก้ไข (audit / edit log) ขึ้นคลาวด์
- เดิม `data/editlog.js` เก็บ localStorage อย่างเดียว · `editLogs` ไม่อยู่ใน COLLECTIONS ของ backend → ไม่ sync
- เพิ่ม `editLogs` เข้า COLLECTIONS (sync ขึ้น `rama9_edit_logs`) · `adoptEditLogs()` (merge cloud+local
  dedupe ตาม id เรียงใหม่สุดบน) · `logEdit()` ยิง `scheduleSync()` ผ่าน late-import (กัน import วน)
- ทดสอบ upsert/select/remove บน `rama9_edit_logs` → ผ่าน ✓

### 3) รูปใบเสร็จ / สลิป ในหน้าค่าใช้จ่าย (งาน B)
- `pages/expense.js` เพิ่ม `<image-slot>` ("ถ่าย/แนบรูปใบเสร็จ-สลิป") ทั้งโหมดรายการ + โหมดยอดรวม ·
  slot id = `rcpt-<วัน>-<หมวด>` (คงที่ · โหลดกลับได้) · ระบบบีบรูปอัตโนมัติ (1200px WebP q0.85) ·
  `lib/image-sync.js` อัปขึ้น Supabase Storage + โหลดกลับทุกเครื่อง · เก็บ `receipt_slot`/`receipt_url` ในเรคคอร์ด

### 4) ล็อต FIFO จริง (`pages/stockdetail.js` เขียนใหม่)
- เลิกอ่าน `STOCK_SEED` คงที่ → อ่านสต๊อกสดผ่าน `stockOf(id)` · ปุ่ม "เพิ่มล็อต"/"แก้ล็อต" เปิดชีตจริง
- `data/store.js` เพิ่ม `addLot / editLot / removeLot` — คงเหลือรวมคิดใหม่จากผลรวมล็อตเสมอ + เก็บ audit
  (ตั้งล็อต = 0 → ลบล็อต) · ทดสอบ add/edit/remove ปรับ qty ถูกต้อง ✓

### หมายเหตุ / เหลือทำ
- 🔒 **RLS ยังเปิดเขียนหลวม (anon) ตามเดิม — ตั้งใจ** · มี edge function `rama9-auth` (loginWithPin) เตรียมไว้
  แต่ flow login ฝั่ง client ยังคัดสิทธิ์เอง → ปิด RLS เป็น authenticated ตอนนี้จะทำให้แอปเขียนข้อมูลไม่ได้
  ทั้งหมด · คงไว้ปิดรอบสุดท้ายพร้อมผูก Supabase Auth จริง (ตามที่เจ้าของกั๊กไว้)
- หน้า reports / forecast / recipes / music ส่วน **วิเคราะห์ยังเป็นเดโม** — ต้องสะสมประวัติยอดขาย/รายรับ-จ่าย
  จริงก่อน (ชั้นบันทึก+persist พร้อมแล้วรอบนี้) · music เป็นฟีเจอร์เสริม (เดโมตามดีไซน์)

---

## ✅ เฟส 9 — เดินสายรายงานให้อ่านข้อมูลจริง + กราฟหน้าแรกใหม่ + เพลงใช้งานจริง + แก้ UI หัวหน้า (เสร็จแล้ว · รอบนี้)

### 1) UI ตามที่สั่ง
- **แถบข้อความวิ่ง** หน้าแรก (พนักงาน/หัวหน้า) → เปลี่ยนทิศเป็น **ขวา→ซ้าย** (`@keyframes tickerLTR`)
- **แถบบนสุดหน้าแรก** → ข้อความ **"CleanFoodRama9"** · ดึง dropdown ร้าน + จดหมาย + กระดิ่ง มาอยู่
  **แถวเดียวกันบนสุด** ย่อขนาดไม่ให้ล้นขอบ (`.home-top` เป็น nowrap · chip/bell เล็กลง)
- **กราฟหน้าแรกเจ้าของ** → แยกเป็น **3 กราฟในการ์ดเดียว สเกลแยกกัน**: โดนัท %รายได้ตามช่องทาง +
  แท่งยอดขายรวมรายวัน + เส้นรายได้สะสม — คุมอยู่ในกรอบ ขนาดเหมาะสม (`charts.js` เพิ่ม `pieChart`/`barChart`)

### 2) เดินสายรายงานให้อ่าน "ข้อมูลจริง" (income/expense/stock)
- `pages/home.js` ownerSalesBlock → อ่าน income/expense จริง 100% (โดนัทช่องทาง · แท่งรายวัน · เส้นสะสม)
- `pages/reports.js` — `realDaily()/realCum()/realStockValue()` จาก `incomeRows/expenseRows/stockOf`:
  - การ์ด "รายรับ-รายจ่าย" + `incExpReportScreen` (กราฟผสม + คุ้มทุน) = **ยอดจริง** (ว่าง→empty state)
  - `stockReport` มูลค่าสต๊อก = **คงเหลือจริง × ต้นทุน** · day-bars อ่าน `stockOf` (สดอยู่แล้ว)
- `pages/execsummary.js` อ่าน income/expense จริงอยู่แล้ว (ยืนยัน)
- ⚠️ **ยังเดโม** (ติดข้อมูลต้นทาง): top/low sellers + forecast ต่อเมนู + ตารางผลนับ stockReport —
  ทั้งหมดต้องมี **การบันทึกยอดขายต่อเมนู (POS-style)** ซึ่งแอปยังไม่เก็บ (income เก็บรวมต่อช่องทาง ไม่ใช่ต่อเมนู)
  → งานถัดไป: เพิ่มหน้าบันทึกยอดขายต่อเมนู แล้ว top/low/forecast จะจริงทันที

### 3) เพลงร้าน — ใช้งานจริง (`pages/music.js` เขียนใหม่ + `lib/audio.js` ใหม่)
- **อัปโหลดไฟล์เสียง** (mp3/wav/m4a/ogg) → **Supabase Storage** (bucket `item-images` prefix `audio/`) →
  public URL · เล่นได้ทุกเครื่อง (ทดสอบ upload→decode→เล่นจริงผ่าน)
- **เล่น/หยุด/เลื่อนเวลา** ด้วย `<audio>` จริง (progress bar คลิกเลื่อนได้ · เวลาเดินจริง)
- **ตัดเพลง**: เลือกช่วงด้วยสไลเดอร์ → "ฟัง" เล่นเฉพาะช่วง (loop) · "บันทึกท่อน" = เพลงใหม่เล่นเฉพาะช่วง ·
  **"ดาวน์โหลด .wav"** = ตัดจริงด้วย Web Audio (`bufferToWav`) ดาวน์โหลดไฟล์ได้ (ทดสอบผ่าน)
- เพิ่ม collection `songs` (store + backend sync) · seed เดิม = "ตัวอย่าง" (ไม่มีไฟล์ · อัปจริงเพื่อเล่น)

### เหลือทำ / ติดเครื่องมือ
- ⚠️ ตาราง `rama9_songs` **ยังสร้างไม่ได้รอบนี้** (เครื่องมือ migration ของ Supabase ล่มชั่วคราว) →
  metadata เพลง fallback เป็น localStorage อัตโนมัติ (ไม่พัง) · **ไฟล์เสียงขึ้นคลาวด์แล้ว** ·
  สร้างตารางเมื่อเครื่องมือกลับมา: `create table rama9_songs (id text pk, data jsonb, updated_at timestamptz default now())` + RLS `rama9_all_write`
- เพิ่มหน้าบันทึกยอดขายต่อเมนู → ปลดล็อก top/low sellers + forecast ให้เป็นข้อมูลจริง

