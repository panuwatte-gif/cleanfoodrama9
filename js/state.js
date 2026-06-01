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
   0) SCHEMA VERSION — bump เมื่อเปลี่ยนโครง db/config
   ทำให้ข้อมูลเก่าใน localStorage ที่คนละโครงถูกทิ้งอัตโนมัติ
   (ช่วงนี้ยังเป็น mock — ข้อมูลจริงจะย้ายไป Supabase ภายหลัง)
   ------------------------------------------------------------ */
export const SCHEMA_VERSION = 10;

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
    // ลำดับกลุ่มโปรตีน — ใช้เรียงเมนูให้เหมือนกันทั้งแอป (Owner ปรับ/เพิ่ม/สลับได้)
    proteinGroups: [
      { id: 'beef',    label: 'เนื้อ',     order: 1 },
      { id: 'pork',    label: 'หมู',      order: 2 },
      { id: 'chicken', label: 'ไก่',      order: 3 },
      { id: 'duck',    label: 'เป็ด',     order: 4 },
      { id: 'fish',    label: 'ปลา',      order: 5 },
      { id: 'seafood', label: 'ทะเล/กุ้ง', order: 6 },
      { id: 'other',   label: 'อื่น ๆ',   order: 7 },
    ],
    // ชนิดข้าว/แป้ง ให้เลือกในการ์ดเมนู (Owner เพิ่มเองได้)
    baseChoices: [
      { id: 'jasmine',    label: 'ข้าวหอมมะลิ' },
      { id: 'riceberry',  label: 'ข้าวไรซ์เบอร์รี่' },
      { id: 'mixed',      label: 'ข้าวหอมมะลิ + ไรซ์เบอร์รี่' },
      { id: 'glass',      label: 'เส้นแก้ว' },
      { id: 'other',      label: 'อื่น ๆ' },
    ],
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

// ---- สต็อก: หมวดหมู่ (Owner เพิ่ม/แก้/ลบ/สลับลำดับได้) ----
// order = ลำดับการแสดง · layout: 'spice' (เผ็ด/ไม่เผ็ด) | 'subcat' (หมวดย่อย) | 'flat'
const stockCategories = [
  { id: 'cat_food',    name: 'อาหารปรุงสำเร็จ',       icon: 'utensils', unit: 'kg',   color: 'var(--basil-600)', order: 1, layout: 'spice', editScope: 'champ', fromCentral: true },
  { id: 'cat_drink',   name: 'เครื่องดื่ม',           icon: 'cup',      unit: 'แก้ว', color: 'var(--info)',      order: 2, layout: 'subcat', editScope: 'champ', fromCentral: true,
    subCategories: [
      { id: 'sub_lowcal', name: 'เครื่องดื่มแคลอรี่ต่ำ', order: 1 },
      { id: 'sub_zero',   name: 'เครื่องดื่ม 0 kcal',    order: 2 },
    ] },
  { id: 'cat_raw',     name: 'วัตถุดิบ',              icon: 'beef',     unit: 'kg',   color: 'var(--chili)',     order: 3, layout: 'flat', editScope: 'staff', fromCentral: false },
  { id: 'cat_produce', name: 'ผัก & ผลไม้',           icon: 'leaf',     unit: 'kg',   color: 'var(--basil-500)', order: 4, layout: 'flat', editScope: 'staff', fromCentral: false },
  { id: 'cat_season',  name: 'เครื่องปรุง / ซอสสำเร็จ', icon: 'flask',  unit: 'แพ็ค', color: 'var(--riceberry)', order: 5, layout: 'flat', editScope: 'staff', fromCentral: false },
  { id: 'cat_pkg',     name: 'บรรจุภัณฑ์',         icon: 'box',      unit: 'ใบ',   color: 'var(--carrot)',    order: 6, layout: 'flat', editScope: 'staff', fromCentral: false },
  { id: 'cat_other',   name: 'อื่น ๆ',               icon: 'box',      unit: 'หน่วย', color: 'var(--ink-3)',    order: 7, layout: 'flat', editScope: 'staff', fromCentral: false },
];

// ---- รายการสต็อก = ทะเบียนกลาง (Single Source) ----
// อาหาร: protein = กลุ่ม · spicy/noSpice = มีสูตรไหนบ้าง · order = ลำดับในกลุ่ม
// เครื่องดื่ม: sub = หมวดย่อย
// madeInHouse + recipeId = ทำเอง → เผื่ออนาคต link สูตรมาตัดสต็อก
const stockItems = [
  // ===== อาหารปรุงสำเร็จ — เรียงตามกลุ่มโปรตีน (เนื้อ→หมู→ไก่→เป็ด→ปลา→ทะเล) =====
  { id: 'it_kp_beef',    cat: 'cat_food', name: 'กะเพราเนื้อสับ',      unit: 'kg', protein: 'beef',    spicy: true,  noSpice: true,  order: 1 },
  { id: 'it_beef_chili', cat: 'cat_food', name: 'เนื้อคั่วพริกเกลือ',  unit: 'kg', protein: 'beef',    spicy: true,  noSpice: false, order: 2 },
  { id: 'it_kp_pork',    cat: 'cat_food', name: 'กะเพราหมูนุ่ม',       unit: 'kg', protein: 'pork',    spicy: true,  noSpice: true,  order: 1 },
  { id: 'it_kp_chick',   cat: 'cat_food', name: 'กะเพราอกไก่สับ',      unit: 'kg', protein: 'chicken', spicy: true,  noSpice: true,  order: 1 },
  { id: 'it_kp_softc',   cat: 'cat_food', name: 'กะเพราไก่นุ่ม',       unit: 'kg', protein: 'chicken', spicy: true,  noSpice: true,  order: 2 },
  { id: 'it_kp_softbr',  cat: 'cat_food', name: 'อกไก่นุ่ม',          unit: 'kg', protein: 'chicken', spicy: false, noSpice: true,  order: 3 },
  { id: 'it_kp_duck',    cat: 'cat_food', name: 'กะเพราเป็ดสับไร้มัน', unit: 'kg', protein: 'duck',    spicy: false, noSpice: true,  order: 1 },
  { id: 'it_kp_salmon',  cat: 'cat_food', name: 'กะเพราแซลมอน',        unit: 'kg', protein: 'fish',    spicy: true,  noSpice: true,  order: 1 },
  { id: 'it_kp_shrimp',  cat: 'cat_food', name: 'กะเพรากุ้ง',          unit: 'kg', protein: 'seafood', spicy: true,  noSpice: true,  order: 1 },
  { id: 'it_shrimp_gl',  cat: 'cat_food', name: 'กุ้งผัดกระเทียม',     unit: 'kg', protein: 'seafood', spicy: false, noSpice: true,  order: 2 },
  // ===== เครื่องดื่ม — แคลอรี่ต่ำ =====
  { id: 'it_dr_thaipis',  cat: 'cat_drink', sub: 'sub_lowcal', name: 'ชาไทยพิสทาชิโอ', unit: 'แก้ว', order: 1 },
  { id: 'it_dr_thaicoco', cat: 'cat_drink', sub: 'sub_lowcal', name: 'ชาไทยมะพร้าว',   unit: 'แก้ว', order: 2 },
  { id: 'it_dr_matchapis',cat: 'cat_drink', sub: 'sub_lowcal', name: 'มัทฉะพิสทาชิโอ', unit: 'แก้ว', order: 3 },
  { id: 'it_dr_matchacoco',cat:'cat_drink', sub: 'sub_lowcal', name: 'มัทฉะมะพร้าว',   unit: 'แก้ว', order: 4 },
  { id: 'it_dr_matchaoat',cat: 'cat_drink', sub: 'sub_lowcal', name: 'มัทฉะนมโอ๊ต',    unit: 'แก้ว', order: 5 },
  { id: 'it_dr_orange',   cat: 'cat_drink', sub: 'sub_lowcal', name: 'น้ำส้มจี๊ด',     unit: 'แก้ว', order: 6 },
  { id: 'it_dr_orgginger',cat: 'cat_drink', sub: 'sub_lowcal', name: 'น้ำส้มจี๊ดขิง',  unit: 'แก้ว', order: 7 },
  // ===== เครื่องดื่ม — 0 kcal =====
  { id: 'it_dr_longan',  cat: 'cat_drink', sub: 'sub_zero', name: 'น้ำลำไย',           unit: 'แก้ว', order: 1 },
  { id: 'it_dr_pandan',  cat: 'cat_drink', sub: 'sub_zero', name: 'น้ำใบเตย',          unit: 'แก้ว', order: 2 },
  { id: 'it_dr_coco',    cat: 'cat_drink', sub: 'sub_zero', name: 'น้ำตาลสด',          unit: 'แก้ว', order: 3 },
  { id: 'it_dr_apmel',   cat: 'cat_drink', sub: 'sub_zero', name: 'น้ำแอปเปิ้ลเมลล่อน', unit: 'แก้ว', order: 4 },
  { id: 'it_dr_grape',   cat: 'cat_drink', sub: 'sub_zero', name: 'ชาองุ่น',           unit: 'แก้ว', order: 5 },
  // ===== วัตถุดิบ (ปัจจุบันใช้จริงแค่ ไข่ + ข้าว) =====
  { id: 'it_egg_chick', cat: 'cat_raw', name: 'ไข่ไก่',  unit: 'ฟอง', sub: 'ไข่',  note: '1 แผง = 30 ฟอง', order: 1 },
  { id: 'it_egg_duck',  cat: 'cat_raw', name: 'ไข่เป็ด', unit: 'ฟอง', sub: 'ไข่',  note: '1 แผง = 30 ฟอง', order: 2 },
  { id: 'it_rice_new',  cat: 'cat_raw', name: 'ข้าวต้นฤดู',       unit: 'kg', sub: 'ข้าว', note: '1 ถุง = 5 กก.', order: 1 },
  { id: 'it_rice_mid',  cat: 'cat_raw', name: 'ข้าวกลางปี',       unit: 'kg', sub: 'ข้าว', note: '1 ถุง = 5 กก.', order: 2 },
  { id: 'it_rice_old',  cat: 'cat_raw', name: 'ข้าวเก่า',         unit: 'kg', sub: 'ข้าว', note: '1 ถุง = 5 กก.', order: 3 },
  { id: 'it_rice_rb',   cat: 'cat_raw', name: 'ข้าวไรซ์เบอร์รี่', unit: 'kg', sub: 'ข้าว', note: '1 ถุง = 5 กก.', order: 4 },
  // ===== ผัก & ผลไม้ =====
  { id: 'it_pr_chili',  cat: 'cat_produce', name: 'พริกขี้หนู', unit: 'kg', order: 1 },
  { id: 'it_pr_garlic', cat: 'cat_produce', name: 'กระเทียม',   unit: 'kg', order: 2 },
  { id: 'it_pr_carrot', cat: 'cat_produce', name: 'แครอท',      unit: 'kg', order: 3 },
  // ===== เครื่องปรุง / ซอสสำเร็จ (พริกน้ำปลา + น้ำดองไข่ = ทำเอง) =====
  { id: 'it_sc_prik',   cat: 'cat_season', name: 'พริกน้ำปลา',      unit: 'แพ็ค', madeInHouse: true, recipeId: 'rcp_prik',    order: 1 },
  { id: 'it_egg_brine', cat: 'cat_season', name: 'น้ำดองไข่',       unit: 'kg',   madeInHouse: true, recipeId: 'rcp_eggbrine', order: 2 },
  { id: 'it_sc_jaew',   cat: 'cat_season', name: 'น้ำจิ้มแจ่ว',     unit: 'แพ็ค', order: 3 },
  { id: 'it_sc_teri',   cat: 'cat_season', name: 'น้ำจิ้มเทอริยากิ', unit: 'แพ็ค', order: 4 },
  { id: 'it_sc_sea',    cat: 'cat_season', name: 'น้ำจิ้มซีฟู้ด',   unit: 'แพ็ค', order: 5 },
  { id: 'it_riceoil',   cat: 'cat_season', name: 'น้ำมันรำข้าว',     unit: 'ขวด', order: 6 },
  { id: 'it_sesame',    cat: 'cat_season', name: 'งาขาว',           unit: 'ถุง', order: 7 },
  { id: 'it_khaokua',   cat: 'cat_season', name: 'ข้าวคั่ว',         unit: 'ถุง', order: 8 },
  { id: 'it_sake',      cat: 'cat_season', name: 'สาเกปรุงอาหาร',    unit: 'ขวด', order: 9 },
  { id: 'it_takumi',    cat: 'cat_season', name: 'ทาคุมิ',          unit: 'ขวด', order: 10 },
  // ===== บรรจุภัณฑ์ =====
  { id: 'it_pk_bag47',  cat: 'cat_pkg', name: 'ถุงร้อน 4×7',        unit: 'แพ็ค', order: 1 },
  { id: 'it_pk_box1',   cat: 'cat_pkg', name: 'กล่องอาหาร 1 ช่อง',  unit: 'ใบ', order: 2 },
  { id: 'it_pk_box2',   cat: 'cat_pkg', name: 'กล่องอาหาร 2 ช่อง',  unit: 'ใบ', order: 3 },
  { id: 'it_pk_box4',   cat: 'cat_pkg', name: 'กล่องอาหาร 4 ช่อง',  unit: 'ใบ', order: 4 },
  { id: 'it_pk_spoon',  cat: 'cat_pkg', name: 'ช้อนส้อม',           unit: 'ชุด', order: 5 },
  { id: 'it_pk_tc4',    cat: 'cat_pkg', name: 'ถ้วยท็อปปิ้ง 4oz',   unit: 'ใบ', order: 6 },
  { id: 'it_pk_tc4l',   cat: 'cat_pkg', name: 'ฝาถ้วยท็อปปิ้ง 4oz', unit: 'ใบ', order: 7 },
  { id: 'it_pk_tc6',    cat: 'cat_pkg', name: 'ถ้วยท็อปปิ้ง 6oz',   unit: 'ใบ', order: 8 },
  { id: 'it_pk_tc6l',   cat: 'cat_pkg', name: 'ฝาถ้วยท็อปปิ้ง 6oz', unit: 'ใบ', order: 9 },
  { id: 'it_pk_cup12',  cat: 'cat_pkg', name: 'แก้วน้ำ 12oz',       unit: 'ใบ', order: 10 },
  { id: 'it_pk_cup12l', cat: 'cat_pkg', name: 'ฝาแก้วน้ำ',          unit: 'ใบ', order: 11 },
  // ===== อื่น ๆ =====
  { id: 'it_ot_trash',  cat: 'cat_other', name: 'ถุงขยะ',          unit: 'แพ็ค', order: 1 },
  { id: 'it_ot_gas',    cat: 'cat_other', name: 'แก๊สกระป๋อง',     unit: 'กระป๋อง', order: 2 },
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

// ---- ค่าใช้จ่าย (ฟังก์ชันใหม่) ----
// owner:true = เฉพาะเจ้าของ (แชมป์+เหมยลี่)
// type: manual(กรอกยอด) · recurring(รายเดือนคงที่) · wage(รายคน) · itemized(จำนวน×ราคา/หน่วย)
const expenseCategories = [
  { id: 'exp_food',  name: 'ต้นทุนรับอาหาร (สาขาหลัก)', icon: 'truck',   owner: true,  color: 'var(--riceberry)', type: 'foodcost' },
  { id: 'exp_wage',  name: 'ค่าแรง',          icon: 'users',   owner: true,  color: 'var(--basil-600)', type: 'wage' },
  { id: 'exp_rent',  name: 'ค่าเช่า',         icon: 'home',    owner: true,  color: 'var(--carrot)',    type: 'recurring', monthly: 25000 },
  { id: 'exp_water', name: 'ค่าน้ำ',          icon: 'water',   owner: false, color: 'var(--info)',      type: 'recurring', monthly: 820 },
  { id: 'exp_elec',  name: 'ค่าไฟ',           icon: 'bolt',    owner: false, color: 'var(--yolk)',      type: 'recurring', monthly: 3450 },
  { id: 'exp_net',   name: 'ค่าอินเทอร์เน็ต',  icon: 'sliders', owner: false, color: 'var(--info)',      type: 'recurring', monthly: 799 },
  { id: 'exp_phone', name: 'ค่าโทรศัพท์',      icon: 'bell',    owner: false, color: 'var(--basil-500)', type: 'recurring', monthly: 399 },
  { id: 'exp_pkg',   name: 'บรรจุภัณฑ์',      icon: 'box',     owner: false, color: 'var(--carrot)',    type: 'itemized', linksStock: true },
  { id: 'exp_mat',   name: 'วัตถุดิบ',        icon: 'beef',    owner: false, color: 'var(--chili)',     type: 'itemized', linksStock: true },
  { id: 'exp_other', name: 'อื่น ๆ',          icon: 'box',     owner: false, color: 'var(--ink-3)',     type: 'itemized', custom: true, linksStock: true },
];

// ต้นทุน/หน่วยของอาหารที่รับจากครัวกลาง (ค้างเป็น default · เจ้าของแก้ได้)
// เป็นเงิน = ยอดที่ "ฝั่งรับ" คอนเฟิร์ม × ต้นทุน/หน่วย
const foodCosts = {
  it_kp_beef: 240, it_beef_chili: 250, it_kp_pork: 180, it_kp_chick: 160,
  it_kp_softc: 170, it_kp_softbr: 165, it_kp_duck: 200, it_kp_salmon: 320, it_kp_shrimp: 280, it_shrimp_gl: 280,
};

// ค่าแรงรายคน — เงินเดือน(คิดทุกเดือน) หรือ รายวัน(ไม่คิดวันลา/ร้านหยุด · ลาออก=หยุดจ่าย)
const payroll = [
  { id: 'pr_oam', name: 'ออม',   type: 'monthly', amount: 15000, active: true },
  { id: 'pr_su',  name: 'ซู',    type: 'monthly', amount: 18000, active: true },
  { id: 'pr_u1',  name: 'User1', type: 'daily',   amount: 480,   active: true },
  { id: 'pr_u2',  name: 'User2', type: 'daily',   amount: 480,   active: true },
];

// แค็ตตาล็อกของซื้อ (itemized) — unitPrice = ราคา/หน่วย มาตรฐาน · กรอกแค่จำนวน
// stockItemId = ผูกกับสต็อก (ซื้อแล้วบวกเข้าสต็อก) · null = ยังไม่มีในสต็อก (ระบบจะเพิ่มให้)
const expenseItems = [
  // บรรจุภัณฑ์ (เชื่อมสต็อก cat_pkg)
  { id: 'pk_bag47',  catId: 'exp_pkg', name: 'ถุงร้อน 4×7',        unitPrice: 45,  unit: 'แพ็ค', vat: false, stockItemId: 'it_pk_bag47' },
  { id: 'pk_box1',   catId: 'exp_pkg', name: 'กล่องอาหาร 1 ช่อง',  unitPrice: 1.8, unit: 'ใบ',  vat: true, stockItemId: 'it_pk_box1' },
  { id: 'pk_box2',   catId: 'exp_pkg', name: 'กล่องอาหาร 2 ช่อง',  unitPrice: 2.2, unit: 'ใบ',  vat: true, stockItemId: 'it_pk_box2' },
  { id: 'pk_box4',   catId: 'exp_pkg', name: 'กล่องอาหาร 4 ช่อง',  unitPrice: 3.0, unit: 'ใบ',  vat: true, stockItemId: 'it_pk_box4' },
  { id: 'pk_spoon',  catId: 'exp_pkg', name: 'ช้อนส้อม',           unitPrice: 0.8, unit: 'ชุด', vat: false, stockItemId: 'it_pk_spoon' },
  { id: 'pk_tc4',    catId: 'exp_pkg', name: 'ถ้วยท็อปปิ้ง 4oz',   unitPrice: 0.9, unit: 'ใบ',  vat: false, stockItemId: 'it_pk_tc4' },
  { id: 'pk_tc4l',   catId: 'exp_pkg', name: 'ฝาถ้วยท็อปปิ้ง 4oz', unitPrice: 0.6, unit: 'ใบ',  vat: false, stockItemId: 'it_pk_tc4l' },
  { id: 'pk_tc6',    catId: 'exp_pkg', name: 'ถ้วยท็อปปิ้ง 6oz',   unitPrice: 1.1, unit: 'ใบ',  vat: false, stockItemId: 'it_pk_tc6' },
  { id: 'pk_tc6l',   catId: 'exp_pkg', name: 'ฝาถ้วยท็อปปิ้ง 6oz', unitPrice: 0.7, unit: 'ใบ',  vat: false, stockItemId: 'it_pk_tc6l' },
  { id: 'pk_cup12',  catId: 'exp_pkg', name: 'แก้วน้ำ 12oz',       unitPrice: 1.5, unit: 'ใบ',  vat: false, stockItemId: 'it_pk_cup12' },
  { id: 'pk_cup12l', catId: 'exp_pkg', name: 'ฝาแก้วน้ำ',          unitPrice: 0.7, unit: 'ใบ',  vat: false, stockItemId: 'it_pk_cup12l' },
  // วัตถุดิบ — กลุ่ม ข้าว
  { id: 'mt_rice_new', catId: 'exp_mat', group: 'ข้าว', name: 'ข้าวต้นฤดู',     unitPrice: 160, unit: 'ถุง 5กก.', vat: false, stockItemId: 'it_rice_new' },
  { id: 'mt_rice_mid', catId: 'exp_mat', group: 'ข้าว', name: 'ข้าวกลางปี',     unitPrice: 150, unit: 'ถุง 5กก.', vat: false, stockItemId: 'it_rice_mid' },
  { id: 'mt_rice_old', catId: 'exp_mat', group: 'ข้าว', name: 'ข้าวเก่า',       unitPrice: 145, unit: 'ถุง 5กก.', vat: false, stockItemId: 'it_rice_old' },
  { id: 'mt_rice_rb',  catId: 'exp_mat', group: 'ข้าว', name: 'ข้าวไรซ์เบอร์รี่', unitPrice: 220, unit: 'ถุง 5กก.', vat: false, stockItemId: 'it_rice_rb' },
  // วัตถุดิบ — กลุ่ม ไข่
  { id: 'mt_egg_ck', catId: 'exp_mat', group: 'ไข่', name: 'ไข่ไก่ เบอร์ 3-4', unitPrice: 110, unit: 'แผง 30', vat: false, stockItemId: 'it_egg_chick' },
  { id: 'mt_egg_dk', catId: 'exp_mat', group: 'ไข่', name: 'ไข่เป็ด',          unitPrice: 130, unit: 'แผง 30', vat: false, stockItemId: 'it_egg_duck' },
  // วัตถุดิบ — กลุ่ม ผัก & ผลไม้
  { id: 'mt_carrot', catId: 'exp_mat', group: 'ผัก & ผลไม้', name: 'แครอทจีน', unitPrice: 35, unit: 'กก.', vat: false, stockItemId: 'it_pr_carrot' },
  { id: 'mt_chili',  catId: 'exp_mat', group: 'ผัก & ผลไม้', name: 'พริก',     unitPrice: 80, unit: 'กก.', vat: false, stockItemId: 'it_pr_chili' },
  // วัตถุดิบ — กลุ่ม เครื่องปรุง (รวมน้ำมันรำข้าว + งาขาว)
  { id: 'mt_riceoil',  catId: 'exp_mat', group: 'เครื่องปรุง', name: 'น้ำมันรำข้าว',    unitPrice: 95,  unit: 'ขวด', vat: true,  stockItemId: 'it_riceoil' },
  { id: 'mt_sesame',   catId: 'exp_mat', group: 'เครื่องปรุง', name: 'งาขาว',            unitPrice: 60,  unit: 'ถุง', vat: false, stockItemId: 'it_sesame' },
  { id: 'mt_khao_kua', catId: 'exp_mat', group: 'เครื่องปรุง', name: 'ข้าวคั่ว',       unitPrice: 45,  unit: 'ถุง', vat: false, stockItemId: 'it_khaokua' },
  { id: 'mt_sake',     catId: 'exp_mat', group: 'เครื่องปรุง', name: 'สาเกปรุงอาหาร',  unitPrice: 85,  unit: 'ขวด', vat: true,  stockItemId: 'it_sake' },
  { id: 'mt_takumi',   catId: 'exp_mat', group: 'เครื่องปรุง', name: 'ทาคุมิ',         unitPrice: 120, unit: 'ขวด', vat: true,  stockItemId: 'it_takumi' },
  // อื่น ๆ (ย้ายถุงขยะ + แก๊สมาจากบรรจุภัณฑ์)
  { id: 'pk_trash',  catId: 'exp_other', name: 'ถุงขยะ',             unitPrice: 60,  unit: 'แพ็ค', vat: false, stockItemId: 'it_ot_trash' },
  { id: 'pk_gas',    catId: 'exp_other', name: 'แก๊สกระป๋อง',        unitPrice: 28,  unit: 'กระป๋อง', vat: false, stockItemId: 'it_ot_gas' },
];

const expenses = [
  { id: 'ex1', catId: 'exp_food',  date: '2026-05-31', amount: 5550, note: 'รับของรอบเช้า', by: 'u_champ' },
  { id: 'ex2', catId: 'exp_food',  date: '2026-05-30', amount: 4980, note: '', by: 'u_champ' },
  { id: 'ex3', catId: 'exp_pkg',   date: '2026-05-29', amount: 1240, note: 'เติมกล่อง+แก้ว', by: 'u_oam' },
  { id: 'ex4', catId: 'exp_mat',   date: '2026-05-29', amount: 980,  note: 'ข้าว+ไข่', by: 'u_oam' },
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

// ---- สูตรอาหาร (ฟังก์ชัน 7) · producesItemId = ทำแล้วเข้าสต็อกตัวไหน (เผื่อตัดสต็อกอนาคต) ----
const recipes = [
  {
    id: 'rcp_prik', name: 'พริกน้ำปลา (สูตรต้นแบบ)', baseIngredientId: 'ing_fishsauce', baseGram: 100,
    producesItemId: 'it_sc_prik', madeInHouse: true,
    ingredients: [
      { id: 'ing_fishsauce', name: 'น้ำปลา',   ratio: 100 },
      { id: 'ing_chili',     name: 'พริก',     ratio: 25 },
      { id: 'ing_lime',      name: 'มะนาว',    ratio: 40 },
      { id: 'ing_garlic',    name: 'กระเทียม', ratio: 15 },
    ],
  },
  {
    id: 'rcp_eggbrine', name: 'น้ำดองไข่ (สูตรต้นแบบ)', baseIngredientId: 'ing_water', baseGram: 1000,
    producesItemId: 'it_egg_brine', madeInHouse: true,
    ingredients: [
      { id: 'ing_water', name: 'น้ำ',       ratio: 1000 },
      { id: 'ing_salt',  name: 'เกลือ',     ratio: 120 },
      { id: 'ing_sugar', name: 'น้ำตาล',    ratio: 60 },
      { id: 'ing_soy',   name: 'ซีอิ๊วขาว', ratio: 80 },
    ],
  },
  {
    id: 'rcp_rice', name: 'หุงข้าวผสม', baseIngredientId: 'ing_rice', baseGram: 1000,
    producesItemId: null, madeInHouse: true,
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

// ---- ส่งของ / รับของ — บันทึก 2 ฝั่ง + FIFO ----
// sent = ครัวกลางส่ง (จำนวน + ค่าส่ง + วันเวลา) · received = สาขารับ+เช็ค (ยึดเป็นหลัก)
// remaining = คงเหลือของล็อตนั้น (คิดจากจำนวนที่ "รับจริง") เพื่อทำ FIFO
const receivings = [
  { id: 'rc1', itemId: 'it_kp_beef',   unit: 'kg',
    sent:     { qty: 10, by: 'u_champ', at: '2026-05-26T07:10', shippingCost: 80 },
    received: { qty: 10, by: 'u_oam',   at: '2026-05-26T09:30', ok: true },
    remaining: 4, note: 'ครบ สภาพดี' },
  { id: 'rc2', itemId: 'it_kp_beef',   unit: 'kg',
    sent:     { qty: 8,  by: 'u_champ', at: '2026-05-31T07:05', shippingCost: 80 },
    received: { qty: 8,  by: 'u_oam',   at: '2026-05-31T09:15', ok: true },
    remaining: 8, note: '' },
  { id: 'rc3', itemId: 'it_rice_new',  unit: 'kg',
    sent:     { qty: 50, by: 'u_champ', at: '2026-05-28T07:00', shippingCost: 120 },
    received: { qty: 50, by: 'u_su',    at: '2026-05-28T08:50', ok: true },
    remaining: 32, note: '10 ถุง' },
  { id: 'rc4', itemId: 'it_kp_salmon', unit: 'kg',
    sent:     { qty: 6,  by: 'u_champ', at: '2026-05-31T07:05', shippingCost: 80 },
    received: { qty: 5,  by: 'u_oam',   at: '2026-05-31T09:20', ok: false },
    remaining: 5, note: 'ส่ง 6 รับจริง 5 — ขาด 1 กก. (ยึดยอดรับ)' },
];

// ---- คู่มือพนักงาน (ใครก็เพิ่มได้) — แคล/สารอาหาร, FAQ, ปัญหา&วิธีแก้, ปริมาณ ----
// ---- คู่มือพนักงาน ----
// แยกเป็นหลายส่วน: เมนู&โภชนาการ (ตาราง) · อุปกรณ์ · การแพ็ค · FAQ · ปัญหา
// ทุกคนเพิ่ม/แก้ได้

// โภชนาการ + ปริมาณรายเมนู แยกตามร้าน — menuNutrition[storeId][itemId]
// base = ชนิดข้าว/แป้ง · baseGram (default 150) · proteinGram (default 100) · kcal/p/f/c
const menuNutrition = {
  store_rama9: {
    it_kp_beef:    { base: 'riceberry', baseGram: 150, proteinGram: 100, kcal: 520, protein: 32, fat: 18, carb: 55 },
    it_beef_chili: { base: 'riceberry', baseGram: 150, proteinGram: 100, kcal: 530, protein: 31, fat: 19, carb: 54 },
    it_kp_pork:    { base: 'riceberry', baseGram: 150, proteinGram: 100, kcal: 500, protein: 30, fat: 17, carb: 54 },
    it_kp_chick:   { base: 'riceberry', baseGram: 150, proteinGram: 100, kcal: 430, protein: 38, fat: 9,  carb: 52 },
    it_kp_softc:   { base: 'riceberry', baseGram: 150, proteinGram: 100, kcal: 460, protein: 34, fat: 12, carb: 53 },
    it_kp_duck:    { base: 'riceberry', baseGram: 150, proteinGram: 100, kcal: 470, protein: 33, fat: 13, carb: 53 },
    it_kp_salmon:  { base: 'riceberry', baseGram: 150, proteinGram: 100, kcal: 540, protein: 30, fat: 22, carb: 52 },
    it_kp_shrimp:  { base: 'riceberry', baseGram: 150, proteinGram: 100, kcal: 410, protein: 28, fat: 7,  carb: 53 },
    it_shrimp_gl:  { base: 'riceberry', baseGram: 150, proteinGram: 100, kcal: 420, protein: 27, fat: 9,  carb: 54 },
    // เครื่องดื่ม — ชาไทย/มัทฉะ 220ml · ที่เหลือ 250ml
    it_dr_thaipis:  { ml: 220, kcal: 120, protein: 2, fat: 4, carb: 18 },
    it_dr_thaicoco: { ml: 220, kcal: 110, protein: 2, fat: 4, carb: 16 },
    it_dr_matchapis:{ ml: 220, kcal: 130, protein: 3, fat: 5, carb: 17 },
    it_dr_matchacoco:{ ml: 220, kcal: 120, protein: 3, fat: 5, carb: 16 },
    it_dr_matchaoat:{ ml: 220, kcal: 140, protein: 3, fat: 5, carb: 19 },
    it_dr_orange:   { ml: 250, kcal: 90,  protein: 1, fat: 0, carb: 22 },
    it_dr_orgginger:{ ml: 250, kcal: 95,  protein: 1, fat: 0, carb: 23 },
    it_dr_longan:   { ml: 250, kcal: 0, protein: 0, fat: 0, carb: 0 },
    it_dr_pandan:   { ml: 250, kcal: 0, protein: 0, fat: 0, carb: 0 },
    it_dr_coco:     { ml: 250, kcal: 0, protein: 0, fat: 0, carb: 0 },
    it_dr_apmel:    { ml: 250, kcal: 0, protein: 0, fat: 0, carb: 0 },
    it_dr_grape:    { ml: 250, kcal: 0, protein: 0, fat: 0, carb: 0 },
  },
};

// คู่มืออุปกรณ์ — fields เก็บ user/pass หรือค่าที่ต้องจำ (secret = ปิดบังไว้)
const equipmentGuides = [
  { id: 'eq1', title: 'แอป Grab Merchant (ร้านกะเพราโคตรคลีน)', body: 'ใช้แก้เมนู/ราคา/เปิด-ปิดร้าน บนแอป Grab Merchant',
    fields: [{ label: 'User', value: 'kaphrao_rama9', secret: false }, { label: 'Password', value: 'gx••••••', secret: true }] },
  { id: 'eq2', title: 'ตาชั่งดิจิทัล', body: 'กด TARE เพื่อตัดน้ำหนักกล่อง/ภาชนะก่อนชั่งทุกครั้ง · หน่วยเป็นกรัม', fields: [] },
  { id: 'eq3', title: 'เครื่องซีล / แรปกล่อง', body: 'ใช้กับเมนูที่มีน้ำขลุกขลิก ป้องกันหกระหว่างขนส่ง', fields: [] },
];

// คู่มือการแพ็ค — เป็นสเต็ป มีรูปประกอบได้ (hasImage → ช่องวางรูป)
const packingGuides = [
  { id: 'pk1', step: 1, title: 'ตรวจออเดอร์ลูกค้า', hasImage: false, points: [
    'จำนวนที่ลูกค้าสั่ง มี x2 / x3 หรือไม่', 'ชนิดของข้าว', 'ชนิดของอาหาร',
    'เพิ่มเนื้อสัตว์ / เพิ่มข้าว / เพิ่มเครื่องดื่ม หรือไม่', 'น้ำจิ้ม/ซอส ที่คู่กับเมนูเฉพาะ',
    'มีสั่งเครื่องดื่มหรือไม่', 'ผักเคียง และ ช้อนส้อม', 'คำสั่งพิเศษ เช่น ไม่เผ็ด / ลดข้าว / แยกกล่อง' ] },
  { id: 'pk2', step: 2, title: 'การจัดอาหารลงกล่อง', hasImage: true, points: [
    'วางกล่องข้าวบนตาชั่ง กด TARE ตัดน้ำหนัก', 'ตักข้าว 150 กรัม', 'กด TARE ตัดน้ำหนักทั้งหมดอีกครั้ง',
    'ตักเนื้อสัตว์/กับข้าว 100 กรัม (ไม่รวมน้ำ หักผักออก) — บนตาชั่งต้องไม่ต่ำกว่า 100 กรัม',
    'ถ่ายรูปอาหารบนตาชั่ง เน้นเนื้อสัตว์ไม่ต่ำกว่า 100 กรัม',
    'ปิดกล่องให้แน่น ถ้ามีน้ำขลุกขลิกต้องแรปกล่อง หรือใส่ถุงร้อนก่อน' ] },
  { id: 'pk3', step: 3, title: 'บรรจุลงถุง', hasImage: true, points: [
    'เลือกถุงขนาดเหมาะกับจำนวนกล่อง', 'ถุงใหญ่เกินไปอาหารจะหก เพราะมีพื้นที่เหวี่ยงตอนขนส่ง' ] },
];

const handbook = [
  { id: 'hb3', section: 'faq', title: 'ลูกค้าถาม: เผ็ดน้อยได้ไหม?', body: 'ได้ — ทุกเมนูมีสูตร "ไม่เผ็ด" (ไม่ใส่พริกและกระเทียม) แจ้งในหมายเหตุออเดอร์', author: 'u_su', updated: '2026-05-22' },
  { id: 'hb4', section: 'faq', title: 'ใช้น้ำมันอะไร / คลีนจริงไหม?', body: 'ผัดน้ำมันรำข้าว ปริมาณน้อย เน้นผักและโปรตีนไม่ติดมัน', author: 'u_su', updated: '2026-05-22' },
  { id: 'hb5', section: 'problem', title: 'ปัญหา: ข้าวแฉะ', body: 'ลดน้ำตามสูตรหุง · เช็กชนิดข้าว (ข้าวใหม่ใช้น้ำน้อยกว่า)', author: 'u_oam', updated: '2026-05-25' },
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
  session: { currentUserId: null, activeStoreId: 'store_rama9' },
  ui: { activePage: 'dashboard', sidebarCollapsed: false },
  db: {
    stores, users, stockCategories, stockItems, stockCounts, stockPerish,
    revenue, captures, attendance, recipes, tasks, notes, announcements,
    receivings, handbook, menuNutrition, equipmentGuides, packingGuides, music,
    expenseCategories, expenses,
    payroll, expenseItems, foodCosts,
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
