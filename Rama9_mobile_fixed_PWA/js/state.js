/* ============================================================
   Rama9 Web App — state.js
   ------------------------------------------------------------
   ศูนย์กลางข้อมูลทั้งระบบ (Single Source of Truth)

   กฎเหล็ก:
   - ข้อมูล + config ทุกอย่างอยู่ในนี้ที่เดียว
   - UI วาดจาก state เสมอ (ผ่าน template literals)
   - "ห้าม hardcode ตัวเลขธุรกิจ" — ทุกสูตร/เงื่อนไขดึงจาก state.config
   - บันทึกลง localStorage อัตโนมัติ (ดู storage.js)

   โครงนี้เผื่อครบทั้ง 10 ฟังก์ชันแล้ว ฟังก์ชันถัดไปแค่มาเสียบ
   logic ต่อ ไม่ต้องรื้อโครง
   ============================================================ */

/* ------------------------------------------------------------
   1) CONFIG — ค่าตั้งทั้งหมดที่ Owner ปรับได้จากหน้า Control Panel
   ------------------------------------------------------------ */
export const defaultConfig = {
  brand: {
    appName: 'Rama9 Ops',
    companyName: 'กะเพราโคตรคลีน',
  },

  // ฟังก์ชัน 2 — สูตรพยากรณ์ยอดขาย (Weighted Average)
  forecast: {
    // น้ำหนักถ่วง: วันใกล้ปัจจุบันน้ำหนักมากกว่า (index 0 = ล่าสุด)
    weights: [5, 4, 3, 2, 1],
    compareSameWeekday: true,   // เทียบเฉพาะวันเดียวกัน (จันทร์-จันทร์)
    lookbackDays: 60,           // มองย้อนหลังกี่วัน
    lowStockThresholdPct: 20,   // เตือนเมื่อสต็อกเหลือ < % ของยอดพยากรณ์
  },

  // ฟังก์ชัน 4 — รายได้ + ค่าธรรมเนียม
  finance: {
    gpPercent: 30,              // ค่า GP (%)
    vatPercent: 7,              // VAT (%)
    includeVatInGp: true,       // รวม VAT ใน GP? (30% -> 32.5%)
    utilities: { water: 0, electricity: 0 }, // ค่าน้ำ/ค่าไฟ (กรอกรายเดือน)
  },

  // ฟังก์ชัน 6 — คะแนนวันลาแปรผันตามยอดขาย
  scoring: {
    baseScore: 100,
    leavePenaltyFactor: 1.0,    // ตัวคูณบทลงโทษการลา
    extraScorePerCover: 5,      // คะแนนพิเศษเมื่อมาแทนเพื่อน
    salesWeightHigh: 1.5,       // ลาในวันยอดสูง = หนักกว่า
    salesWeightLow: 0.5,
  },

  // ฟังก์ชัน 8 — จำลองค่าธรรมเนียมแพลตฟอร์ม (Platform fees)
  platforms: [
    { id: 'grab',   name: 'GrabFood',   feePct: 32, prefix: 'GF', color: '#00b14f', enabled: true },
    { id: 'lineman',name: 'LINE MAN',   feePct: 30, prefix: 'LM', color: '#06c755', enabled: true },
    { id: 'shopee', name: 'ShopeeFood', feePct: 30, prefix: 'SP', color: '#ee4d2d', enabled: true },
  ],

  // มาตรฐานปริมาณต่อจาน (Owner ปรับได้ + override รายเมนู)
  menu: {
    portionStd: { rice: 150, protein: 100 }, // ข้าว 150g / เนื้อสัตว์ 100g (มาตรฐาน)
    // override เฉพาะเมนูที่ไม่เท่ามาตรฐาน เช่น XL, เมนูเส้น
    portionOverrides: {
      it_kp_xl:        { rice: 220, protein: 150 },          // เมนู XL
      it_shrimp_glass: { noodle: 200, protein: 100 },        // (อนาคต) กุ้งอบเส้นแก้ว
    },
    spiceNote: 'ทุกเมนูกะเพรามีสูตร "ไม่เผ็ด" = ไม่ใส่ทั้งพริกและกระเทียม',
  },

  // เครื่องหมายระดับความเสียง่าย (Owner ปรับ label/สี/วันได้เอง)
  perishLevels: [
    { level: 1, label: 'เก็บได้นาน', shelfDays: 30, color: 'var(--basil-600)' },
    { level: 2, label: 'ปานกลาง',    shelfDays: 7,  color: 'var(--carrot)' },
    { level: 3, label: 'เสียง่าย — ระวัง', shelfDays: 2, color: 'var(--chili)' },
  ],

  // ฟังก์ชัน 5 — endpoint สำหรับ stub (ยังไม่ต่อจริง)
  integrations: {
    appsScriptUrl: '',          // Google Apps Script Web App
    supabaseUrl: '',
    supabaseAnonKey: '',
    lineOaToken: '',
    notifyEmail: '',
    driveFolderId: '19SDvdSLnF2cJvgpBg-S4I44RH2qGy3p4',
    sheetId: '1ZZnkVbzblde0v4SSNi6n9Za7pRZTknxj97H6bw7Ls_A',
  },
};

/* ------------------------------------------------------------
   2) ROLES — นิยามตำแหน่งและลำดับชั้นอำนาจ
   ------------------------------------------------------------ */
export const ROLES = {
  owner:      { id: 'owner',      label: 'เจ้าของ',   level: 3, color: 'var(--riceberry)' },
  supervisor: { id: 'supervisor', label: 'หัวหน้างาน', level: 2, color: 'var(--carrot)' },
  employee:   { id: 'employee',   label: 'พนักงาน',   level: 1, color: 'var(--basil-600)' },
};

/* ------------------------------------------------------------
   3) MOCK DATABASE — ฐานข้อมูลจำลอง (จะถูกแทนด้วย Supabase ภายหลัง)
   ------------------------------------------------------------ */

// ---- ร้าน (entity กลาง — ฟังก์ชัน 4,5,8 อ้างอิงด้วย storeId เสมอ) ----
const stores = [
  { id: 'store_rama9', name: 'กะเพราโคตรคลีน — สาขาพระราม 9', short: 'กะเพราโคตรคลีน', status: 'active', platforms: ['grab', 'lineman', 'shopee'] },
  { id: 'store_b',     name: 'ร้านที่ 2 (เตรียมเปิด)',        short: 'ร้านที่ 2',         status: 'planned', platforms: ['grab'] },
];

// ---- ผู้ใช้ (ฟังก์ชัน 1) ----
// canChangeOwnPassword: พนักงานบางคนเปลี่ยนเองไม่ได้ ต้องให้หัวหน้าเปลี่ยน
const users = [
  { id: 'u_champ',  name: 'แชมป์',  role: 'owner',      pin: '2425', canChangeOwnPassword: true,  isSuperOwner: true,  blocked: false, avatar: '🦁', joined: '2024-01-01' },
  { id: 'u_meili',  name: 'เหมยลี่', role: 'owner',      pin: '9596', canChangeOwnPassword: true,  isSuperOwner: false, blocked: false, avatar: '🌸', joined: '2024-01-01' },
  { id: 'u_su',     name: 'ซู',     role: 'supervisor', pin: '1234', canChangeOwnPassword: true,  isSuperOwner: false, blocked: false, avatar: '⭐', joined: '2024-03-15' },
  { id: 'u_oam',    name: 'ออม',    role: 'employee',   pin: '9999', canChangeOwnPassword: true,  isSuperOwner: false, blocked: false, avatar: '🌿', joined: '2024-06-01' },
  { id: 'u_user1',  name: 'User1',  role: 'employee',   pin: '1111', canChangeOwnPassword: false, isSuperOwner: false, blocked: false, avatar: '🍳', joined: '2024-08-10' },
  { id: 'u_user2',  name: 'User2',  role: 'employee',   pin: '2222', canChangeOwnPassword: false, isSuperOwner: false, blocked: false, avatar: '🍚', joined: '2024-09-05' },
];

// ---- สต็อก: หมวดหมู่ + รายการ (ฟังก์ชัน 2) ----
// แชมป์เพิ่ม/แก้/ลบหมวดและรายการได้เอง
const stockCategories = [
  { id: 'cat_food',    name: 'อาหารปรุงสำเร็จ',   icon: 'utensils', unit: 'kg',  color: 'var(--basil-600)' },
  { id: 'cat_drink',   name: 'เครื่องดื่ม',        icon: 'cup',      unit: 'cup', color: 'var(--info)' },
  { id: 'cat_sauce',   name: 'ซอส/น้ำจิ้ม',        icon: 'droplet',  unit: 'pack',color: 'var(--carrot)' },
  { id: 'cat_raw',     name: 'วัตถุดิบ',           icon: 'beef',     unit: 'kg',  color: 'var(--chili)' },
  { id: 'cat_produce', name: 'ผัก & ผลไม้',        icon: 'leaf',     unit: 'kg',  color: 'var(--basil-500)' },
  { id: 'cat_season',  name: 'เครื่องปรุง/ซอสสำเร็จ', icon: 'flask', unit: 'kg', color: 'var(--riceberry)' },
  { id: 'cat_other',   name: 'อื่น ๆ',             icon: 'box',      unit: 'unit',color: 'var(--ink-3)' },
];

const stockItems = [
  // อาหารปรุงสำเร็จ (กก.)
  { id: 'it_kp_beef',   cat: 'cat_food', name: 'กะเพราเนื้อสับ',       unit: 'kg' },
  { id: 'it_kp_chick',  cat: 'cat_food', name: 'กะเพราอกไก่สับ',       unit: 'kg' },
  { id: 'it_kp_softc',  cat: 'cat_food', name: 'กะเพราไก่นุ่ม',        unit: 'kg' },
  { id: 'it_kp_salmon', cat: 'cat_food', name: 'กะเพราแซลมอน',         unit: 'kg' },
  { id: 'it_kp_duck',   cat: 'cat_food', name: 'กะเพราเป็ดสับไร้มัน',  unit: 'kg' },
  { id: 'it_kp_pork',   cat: 'cat_food', name: 'กะเพราหมูนุ่ม',        unit: 'kg' },
  { id: 'it_kp_shrimp', cat: 'cat_food', name: 'กะเพรากุ้ง',           unit: 'kg' },
  { id: 'it_beef_chili',cat: 'cat_food', name: 'เนื้อคั่วพริกเกลือ',   unit: 'kg' },
  { id: 'it_shrimp_gl', cat: 'cat_food', name: 'กุ้งผัดกระเทียม',      unit: 'kg' },
  // เครื่องดื่ม
  { id: 'it_dr_longan', cat: 'cat_drink', name: 'น้ำลำไย',             unit: 'cup' },
  { id: 'it_dr_pandan', cat: 'cat_drink', name: 'น้ำใบเตย',            unit: 'cup' },
  { id: 'it_dr_coco',   cat: 'cat_drink', name: 'น้ำตาลสดมะพร้าวอ่อน', unit: 'cup' },
  { id: 'it_dr_apmel',  cat: 'cat_drink', name: 'น้ำแอปเปิลเมลล่อน',   unit: 'cup' },
  { id: 'it_dr_grape',  cat: 'cat_drink', name: 'น้ำชาองุ่น',          unit: 'cup' },
  { id: 'it_dr_yuzu',   cat: 'cat_drink', name: 'น้ำชาส้มยูสุ',        unit: 'cup' },
  { id: 'it_dr_mapid',  cat: 'cat_drink', name: 'น้ำส้มมะปี๊ด',        unit: 'cup' },
  // ซอส/น้ำจิ้ม
  { id: 'it_sc_prik',   cat: 'cat_sauce', name: 'พริกน้ำปลา',          unit: 'pack' },
  { id: 'it_sc_jaew',   cat: 'cat_sauce', name: 'น้ำจิ้มแจ่ว',         unit: 'pack' },
  { id: 'it_sc_teri',   cat: 'cat_sauce', name: 'น้ำจิ้มเทอริยากิ',    unit: 'pack' },
  { id: 'it_sc_sea',    cat: 'cat_sauce', name: 'น้ำจิ้มซีฟู้ด',       unit: 'pack' },
  // วัตถุดิบ (ปัจจุบันใช้จริงแค่ ไข่ + ข้าว — ที่เหลือ standby)
  { id: 'it_egg_chick', cat: 'cat_raw', name: 'ไข่ไก่',  unit: 'egg', sub: 'ไข่', note: '1 แผง = 30 ฟอง' },
  { id: 'it_egg_duck',  cat: 'cat_raw', name: 'ไข่เป็ด', unit: 'egg', sub: 'ไข่', note: '1 แผง = 30 ฟอง' },
  { id: 'it_rice_new',  cat: 'cat_raw', name: 'ข้าวต้นฤดู',   unit: 'kg', sub: 'ข้าว', note: '1 ถุง = 5 กก.' },
  { id: 'it_rice_mid',  cat: 'cat_raw', name: 'ข้าวกลางปี',   unit: 'kg', sub: 'ข้าว', note: '1 ถุง = 5 กก.' },
  { id: 'it_rice_old',  cat: 'cat_raw', name: 'ข้าวเก่า',     unit: 'kg', sub: 'ข้าว', note: '1 ถุง = 5 กก.' },
  { id: 'it_rice_rb',   cat: 'cat_raw', name: 'ข้าวไรซ์เบอร์รี่', unit: 'kg', sub: 'ข้าว', note: '1 ถุง = 5 กก.' },
  // ผัก & ผลไม้
  { id: 'it_pr_chili',  cat: 'cat_produce', name: 'พริกขี้หนู', unit: 'kg' },
  { id: 'it_pr_garlic', cat: 'cat_produce', name: 'กระเทียม',   unit: 'kg' },
  { id: 'it_pr_carrot', cat: 'cat_produce', name: 'แครอท',      unit: 'kg' },
];

// ---- บันทึกนับสต็อกรายวัน (ฟังก์ชัน 2) ----
// counts[date][itemId] = ปริมาณคงเหลือ ณ วันนั้น
const stockCounts = {
  '2026-05-30': { it_kp_beef: 12, it_kp_chick: 9,  it_rice_new: 40, it_egg_chick: 180 },
  '2026-05-31': { it_kp_beef: 8,  it_kp_chick: 5,  it_rice_new: 32, it_egg_chick: 132 },
};

// ---- รายได้รายวันต่อร้าน (ฟังก์ชัน 4) ----
const revenue = [
  { id: 'rev1', date: '2026-05-31', storeId: 'store_rama9', gross: 18500, fees: 5920, net: 12580, byPlatform: { grab: 11000, lineman: 5000, shopee: 2500 } },
  { id: 'rev2', date: '2026-05-30', storeId: 'store_rama9', gross: 16200, fees: 5180, net: 11020, byPlatform: { grab: 9800, lineman: 4400, shopee: 2000 } },
];

// ---- ออเดอร์ที่ถ่ายภาพไว้ (ฟังก์ชัน 5) ----
const captures = [
  { id: 'cap1', date: '2026-05-31T11:24:00', storeId: 'store_rama9', platform: 'grab',   orderNo: 'GF-987', imageUrl: '', synced: true },
  { id: 'cap2', date: '2026-05-31T12:05:00', storeId: 'store_rama9', platform: 'lineman', orderNo: 'LM-441', imageUrl: '', synced: true },
  { id: 'cap3', date: '2026-05-31T12:48:00', storeId: 'store_rama9', platform: 'grab',   orderNo: 'GF-992', imageUrl: '', synced: false },
];

// ---- วันลา + คะแนน (ฟังก์ชัน 6) ----
const attendance = [
  { id: 'lv1', userId: 'u_oam',   date: '2026-05-28', type: 'ลากิจ',  note: '' },
  { id: 'lv2', userId: 'u_user1', date: '2026-05-29', type: 'ลาป่วย', note: 'ไข้หวัด' },
];

// ---- สูตรอาหาร (ฟังก์ชัน 7) ----
const recipes = [
  {
    id: 'rcp_prik', name: 'พริกน้ำปลา (สูตรต้นแบบ)', baseIngredientId: 'ing_fishsauce', baseGram: 100,
    ingredients: [
      { id: 'ing_fishsauce', name: 'น้ำปลา',   ratio: 100 },
      { id: 'ing_chili',     name: 'พริก',     ratio: 25 },
      { id: 'ing_lime',      name: 'มะนาว',    ratio: 40 },
      { id: 'ing_garlic',    name: 'กระเทียม', ratio: 15 },
    ],
  },
  {
    id: 'rcp_rice', name: 'หุงข้าวผสม', baseIngredientId: 'ing_rice', baseGram: 1000,
    ingredients: [
      { id: 'ing_rice',  name: 'ข้าวสาร', ratio: 1000 },
      { id: 'ing_water', name: 'น้ำ',     ratio: 1300 },
    ],
  },
];

// ---- การ์ดงานที่มอบหมาย (ฟังก์ชัน 1/พนักงาน) ----
const tasks = [
  { id: 't1', assignedTo: 'u_oam',   assignedBy: 'u_su', title: 'เช็คสต็อกตอนเช้า', detail: 'นับกะเพราทุกชนิด + ข้าว ก่อน 09:00', done: false, due: '2026-06-02' },
  { id: 't2', assignedTo: 'u_oam',   assignedBy: 'u_su', title: 'เตรียมพริกน้ำปลา', detail: 'ใช้สูตรต้นแบบ ทำ 2 กก.', done: true, due: '2026-06-01' },
  { id: 't3', assignedTo: 'u_user1', assignedBy: 'u_su', title: 'ถ่ายภาพออเดอร์ทุกบิล', detail: 'อย่าลืมบิล Grab ช่วงพีค', done: false, due: '2026-06-01' },
];

// ---- สมุดโน้ตพนักงาน (ฟังก์ชัน 1/พนักงาน) ----
const notes = [
  { id: 'n1', userId: 'u_oam', title: 'สูตรลับซอส', body: 'เพิ่มกระเทียมเจียว 1 ช้อน → หอมขึ้นมาก', pinned: true, updated: '2026-05-30' },
];

// ---- ประกาศ (ฟังก์ชัน 1/หัวหน้า — ข้อความวิ่ง) ----
const announcements = [
  { id: 'a1', text: 'ยอดเดือนพฤษภาคมทะลุเป้า 12% — ขอบคุณทุกคนครับ! 🌿', active: true, by: 'u_su', created: '2026-05-31' },
];

// ---- ระดับความเสียง่ายต่อรายการ (Owner ปรับได้ · 1=นาน 3=เสียง่าย) ----
// fallback: ไม่มีในนี้ = level 1
const stockPerish = {
  it_kp_salmon: 3, it_kp_shrimp: 3, it_shrimp_gl: 3,   // ทะเล/สด → เสียง่ายสุด
  it_kp_beef: 2, it_kp_chick: 2, it_kp_softc: 2, it_kp_duck: 2, it_kp_pork: 2, it_beef_chili: 2,
  it_egg_chick: 2, it_egg_duck: 2, it_pr_chili: 2, it_pr_garlic: 2, it_pr_carrot: 2,
  it_rice_new: 1, it_rice_mid: 1, it_rice_old: 1, it_rice_rb: 1,
};

// ---- เมนูที่มีสูตร "ไม่เผ็ด" (ไม่ใส่พริก+กระเทียม) ----
const noSpiceItems = ['it_kp_beef', 'it_kp_chick', 'it_kp_softc', 'it_kp_salmon', 'it_kp_duck', 'it_kp_pork', 'it_kp_shrimp'];

// ---- รับของ — ล็อต FIFO (ฟังก์ชันใหม่: รับของจากแชมป์เข้าสาขา) ----
// แต่ละครั้งที่รับ = 1 ล็อต บันทึกวันรับ + คงเหลือ เพื่อคิด FIFO (ของเก่าใช้ก่อน)
const receivings = [
  { id: 'rc1', itemId: 'it_kp_beef', qty: 10, remaining: 4,  unit: 'kg', receivedDate: '2026-05-26', fromUserId: 'u_champ', checkedBy: 'u_oam', note: 'ครบ สภาพดี' },
  { id: 'rc2', itemId: 'it_kp_beef', qty: 8,  remaining: 8,  unit: 'kg', receivedDate: '2026-05-31', fromUserId: 'u_champ', checkedBy: 'u_oam', note: '' },
  { id: 'rc3', itemId: 'it_rice_new', qty: 50, remaining: 32, unit: 'kg', receivedDate: '2026-05-28', fromUserId: 'u_champ', checkedBy: 'u_su', note: '10 ถุง' },
  { id: 'rc4', itemId: 'it_kp_salmon', qty: 6, remaining: 6, unit: 'kg', receivedDate: '2026-05-31', fromUserId: 'u_champ', checkedBy: 'u_oam', note: 'แช่เย็นทันที' },
];

// ---- คู่มือพนักงาน (ใครก็เพิ่มได้) — แคล/สารอาหาร, FAQ, ปัญหา&วิธีแก้, ปริมาณ ----
const handbook = [
  { id: 'hb1', section: 'nutrition', title: 'กะเพราเนื้อสับ + ข้าวไรซ์เบอร์รี่', body: 'พลังงาน ~520 kcal · โปรตีน 32g · ไขมัน 18g · คาร์บ 55g', author: 'u_champ', updated: '2026-05-20' },
  { id: 'hb2', section: 'nutrition', title: 'กะเพราอกไก่สับ', body: 'พลังงาน ~430 kcal · โปรตีน 38g · ไขมัน 9g', author: 'u_champ', updated: '2026-05-20' },
  { id: 'hb3', section: 'faq', title: 'ลูกค้าถาม: เผ็ดน้อยได้ไหม?', body: 'ได้ — ทุกเมนูมีสูตร "ไม่เผ็ด" (ไม่ใส่พริกและกระเทียม) แจ้งในหมายเหตุออเดอร์', author: 'u_su', updated: '2026-05-22' },
  { id: 'hb4', section: 'faq', title: 'ใช้น้ำมันอะไร / คลีนจริงไหม?', body: 'ผัดน้ำมันรำข้าว ปริมาณน้อย เน้นผักและโปรตีนไม่ติดมัน', author: 'u_su', updated: '2026-05-22' },
  { id: 'hb5', section: 'problem', title: 'ปัญหา: ข้าวแฉะ', body: 'ลดน้ำตามสูตรหุง 5% · เช็กชนิดข้าว (ข้าวใหม่ใช้น้ำน้อยกว่า)', author: 'u_oam', updated: '2026-05-25' },
  { id: 'hb6', section: 'portion', title: 'มาตรฐานปริมาณ', body: 'มาตรฐาน: ข้าว 150g · เนื้อสัตว์ 100g | XL: ข้าว 220g · เนื้อ 150g | (อนาคต) กุ้งอบเส้นแก้ว: เส้น 200g · กุ้ง 100g', author: 'u_champ', updated: '2026-05-26' },
];

// ---- เพลงร้าน (ลิงก์ Google Drive) + ตัดทำเสียงเรียกเข้า ----
const music = {
  playlist: [
    { id: 'm1', title: 'Morning Clean Vibes', artist: 'Café Mix', driveId: '1aB_stub', duration: 184, current: true },
    { id: 'm2', title: 'Thai Chill Lo-Fi',    artist: 'Bkk Beats', driveId: '1cD_stub', duration: 201, current: false },
    { id: 'm3', title: 'Lunch Rush Energy',   artist: 'Upbeat Co', driveId: '1eF_stub', duration: 167, current: false },
  ],
  ringtones: [
    { id: 'rt1', title: 'เสียงเรียกออเดอร์ใหม่', sourceId: 'm1', start: 12, end: 18 },
  ],
};

/* ------------------------------------------------------------
   4) STATE — รวมทุกอย่าง
   ------------------------------------------------------------ */
export const initialState = {
  config: defaultConfig,
  session: { currentUserId: null },
  ui: { activePage: 'dashboard', sidebarCollapsed: false },
  db: {
    stores, users, stockCategories, stockItems, stockCounts, stockPerish, noSpiceItems,
    revenue, captures, attendance, recipes, tasks, notes, announcements,
    receivings, handbook, music,
  },
};

// state ที่ใช้งานจริง (จะถูก hydrate จาก localStorage ใน storage.js)
export const state = structuredClone(initialState);

/* ------------------------------------------------------------
   5) Pub/Sub เล็ก ๆ — ให้ UI re-render เมื่อ state เปลี่ยน
   ------------------------------------------------------------ */
const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function notify() { listeners.forEach((fn) => fn(state)); }
