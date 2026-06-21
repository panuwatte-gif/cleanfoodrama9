// ============================================================
// data/seed.js — ข้อมูลกลางตั้งต้น (พอร์ตจาก prototype2/data.jsx)
// เป็น "เมล็ดพันธุ์" ของข้อมูลทั้งหมด: หมวด/รายการ/เมนู/assumption/สต๊อก
// + ข้อมูลเดโมประกอบ (เงิน · รับของ · พยากรณ์ ฯลฯ)
//
// ของที่ "แก้ได้" (cats/items/menus/assumptions/stock) จะถูกโหลดเข้า
// data/store.js แล้ว persist ลง localStorage — ไฟล์นี้เป็นแค่ค่าเริ่มต้น
// ของที่เป็น "เดโมคงที่" (MONEY · RECV_LOG ฯลฯ) import ตรงได้เลย
// วันที่อ้างอิง: พฤหัส 11 มิ.ย. 2569
// ============================================================

export const TODAY = { dow: 'พฤ.', d: 11, mon: 'มิ.ย.', full: 'พฤหัสบดี 11 มิ.ย. 2569' };
export const TOMORROW = { dow: 'ศ.', d: 12, mon: 'มิ.ย.', label: 'ศุกร์ 12 มิ.ย.' };

/* ---------- หมวด + หมวดย่อย (master — ทุกหน้าเรียงตามนี้) ---------- */
export const CATS_SEED = [
  { id: 'protein', name: 'เมนูกับข้าว', unit: 'kg', icon: 'pan', tint: 'green', subs: [
    { id: 'beef',    name: 'เนื้อ', icon: 'cow' },
    { id: 'pork',    name: 'หมู',  icon: 'pig' },
    { id: 'duck',    name: 'เป็ด', icon: 'duck' },
    { id: 'chicken', name: 'ไก่',  icon: 'chicken' },
    { id: 'fish',    name: 'ปลา',  icon: 'fish' },
    { id: 'shrimp',  name: 'กุ้ง',  icon: 'shrimp' },
  ] },
  { id: 'egg',   name: 'ไข่',          unit: 'ฟอง', icon: 'egg', tint: 'amber' },
  { id: 'drink', name: 'เครื่องดื่ม',  unit: 'ขวด', icon: 'cup2', tint: 'blue', subs: [
    { id: 'zero', name: 'เครื่องดื่ม 0 kcal',   icon: 'leaf' },
    { id: 'low',  name: 'เครื่องดื่ม low kcal', icon: 'flame' },
  ] },
  { id: 'sauce', name: 'ซอส / น้ำจิ้ม', unit: 'ซอง', icon: 'drop', tint: 'rose' },
  { id: 'rice',  name: 'ข้าว',          unit: 'kg', icon: 'rice', tint: 'violet' },
  { id: 'pack',  name: 'บรรจุภัณฑ์',   unit: 'แพ็ค', icon: 'box', tint: 'amber', subs: [
    { id: 'boxes', name: 'กล่องอาหาร',    icon: 'box' },
    { id: 'cups',  name: 'ถ้วย · แก้ว · ฝา', icon: 'cup' },
    { id: 'bags',  name: 'ถุง',           icon: 'bag' },
    { id: 'tools', name: 'อุปกรณ์อื่นๆ',  icon: 'utensil' },
  ] },
  { id: 'dry',   name: 'อื่นๆ', unit: '—', icon: 'jar', tint: 'violet' },
];

/* ลำดับใน array = ลำดับมาตรฐานทุกหน้า · spicy:true = มีช่อง เผ็ด/ไม่เผ็ด */
export const ITEMS_SEED = [
  { id: 'kp-beef',    cat: 'protein', sub: 'beef',    name: 'กระเพราเนื้อ',       unit: 'kg', spicy: true,  cost: 320 },
  { id: 'beef-salt',  cat: 'protein', sub: 'beef',    name: 'เนื้อคั่วพริกเกลือ', unit: 'kg', spicy: false, cost: 330 },
  { id: 'kp-duck',    cat: 'protein', sub: 'duck',    name: 'กระเพราเป็ด',        unit: 'kg', spicy: true,  cost: 260 },
  { id: 'kp-breast',  cat: 'protein', sub: 'chicken', name: 'กระเพราอกไก่',       unit: 'kg', spicy: true,  cost: 180 },
  { id: 'kp-soft',    cat: 'protein', sub: 'chicken', name: 'กระเพราไก่นุ่ม',     unit: 'kg', spicy: true,  cost: 195 },
  { id: 'breast',     cat: 'protein', sub: 'chicken', name: 'อกไก่',              unit: 'kg', spicy: false, cost: 150 },
  { id: 'kp-salmon',  cat: 'protein', sub: 'fish',    name: 'กระเพราแซลม่อน',    unit: 'kg', spicy: true,  cost: 520 },
  { id: 'kp-shrimp',  cat: 'protein', sub: 'shrimp',  name: 'กระเพรากุ้ง',         unit: 'kg', spicy: true,  cost: 410 },
  { id: 'shrimp-gar', cat: 'protein', sub: 'shrimp',  name: 'กุ้งกระเทียม',       unit: 'kg', spicy: false, cost: 410 },
  { id: 'egg-raw',   cat: 'egg', name: 'ไข่ไก่ดิบ',       unit: 'แผง', icon: 'eggtray', spicy: false, cost: 115, note: '1 แผง = 30 ฟอง' },
  { id: 'egg-boil',  cat: 'egg', name: 'ไข่ต้ม',           unit: 'ฟอง', icon: 'eggboil', spicy: false, cost: 6 },
  { id: 'egg-soft',  cat: 'egg', name: 'ไข่ต้มยางมะตูม',  unit: 'ฟอง', icon: 'eggsoft', spicy: false, cost: 7 },
  { id: 'egg-shoyu', cat: 'egg', name: 'ไข่ดองโชยุ',       unit: 'ฟอง', icon: 'eggshoyu', spicy: false, cost: 8 },
  { id: 'dr-orange',  cat: 'drink', sub: 'zero', name: 'น้ำส้มจี๊ด',            unit: 'ขวด', spicy: false, cost: 25 },
  { id: 'dr-ginger',  cat: 'drink', sub: 'zero', name: 'น้ำส้มขิง',             unit: 'ขวด', spicy: false, cost: 25 },
  { id: 'dr-pandan',  cat: 'drink', sub: 'zero', name: 'น้ำใบเตยมะพร้าวอ่อน',  unit: 'ขวด', spicy: false, cost: 27 },
  { id: 'dr-cocomat', cat: 'drink', sub: 'low', name: 'Coconut Matcha',        unit: 'ขวด', spicy: false, cost: 38 },
  { id: 'dr-thaipis', cat: 'drink', sub: 'low', name: 'ชาไทยมะพร้าวพิทาชิโอ้', unit: 'ขวด', spicy: false, cost: 42 },
  { id: 'dr-thaipi2', cat: 'drink', sub: 'low', name: 'ชาไทยพิทาชิโอ้',        unit: 'ขวด', spicy: false, cost: 40 },
  { id: 'dr-matchap', cat: 'drink', sub: 'low', name: 'Matcha Pistachio',      unit: 'ขวด', spicy: false, cost: 45 },
  { id: 'dr-grape',   cat: 'drink', sub: 'low', name: 'องุ่น',                  unit: 'ขวด', spicy: false, cost: 28 },
  { id: 'dr-honeylem',cat: 'drink', sub: 'low', name: 'น้ำผึ้งเลม่อน',          unit: 'ขวด', spicy: false, cost: 30 },
  { id: 'dr-longan',  cat: 'drink', sub: 'low', name: 'น้ำลำไย',                unit: 'ขวด', spicy: false, cost: 25 },
  { id: 'dr-cocosug', cat: 'drink', sub: 'low', name: 'น้ำตาลมะพร้าวอ่อน',     unit: 'ขวด', spicy: false, cost: 27 },
  { id: 'dr-applemel',cat: 'drink', sub: 'low', name: 'น้ำแอปเปิ้ลเมลอน',      unit: 'ขวด', spicy: false, cost: 28 },
  { id: 'sc-prik', cat: 'sauce', name: 'น้ำพริกน้ำปลา', unit: 'ซอง', spicy: false, cost: 4 },
  { id: 'sc-teri', cat: 'sauce', name: 'ซอสเทอริยากิ',  unit: 'ซอง', spicy: false, cost: 5 },
  { id: 'sc-jaew', cat: 'sauce', name: 'น้ำจิ้มแจ่ว',    unit: 'ซอง', spicy: false, cost: 4 },
  { id: 'rice-iraya', cat: 'rice', name: 'ข้าวหอมมะลิเก่าไอรยา',   unit: 'kg', spicy: false, cost: 52 },
  { id: 'rice-horm',  cat: 'rice', name: 'ข้าวหอมมะลิ',            unit: 'kg', spicy: false, cost: 45 },
  { id: 'rice-berry', cat: 'rice', name: 'ข้าวไรซ์เบอร์รี่ลุงยิ้ม', unit: 'kg', spicy: false, cost: 68 },
  { id: 'pk-box1', cat: 'pack', sub: 'boxes', name: 'กล่องอาหาร 1 ช่อง', unit: 'แพ็ค', spicy: false, cost: 95 },
  { id: 'pk-box2', cat: 'pack', sub: 'boxes', name: 'กล่องอาหาร 2 ช่อง', unit: 'แพ็ค', spicy: false, cost: 110 },
  { id: 'pk-box4', cat: 'pack', sub: 'boxes', name: 'กล่องอาหาร 4 ช่อง', unit: 'แพ็ค', spicy: false, cost: 130 },
  { id: 'pk-cup4',    cat: 'pack', sub: 'cups', name: 'ถ้วยท็อปปิ้ง 4 ออน',   unit: 'แถว', spicy: false, cost: 28 },
  { id: 'pk-lid4',    cat: 'pack', sub: 'cups', name: 'ฝาถ้วยท็อปปิ้ง 4 ออน', unit: 'แถว', spicy: false, cost: 22 },
  { id: 'pk-cup6',    cat: 'pack', sub: 'cups', name: 'ถ้วยท็อปปิ้ง 6 ออน',   unit: 'แถว', spicy: false, cost: 32 },
  { id: 'pk-lid6',    cat: 'pack', sub: 'cups', name: 'ฝาถ้วยท็อปปิ้ง 6 ออน', unit: 'แถว', spicy: false, cost: 24 },
  { id: 'pk-glass',   cat: 'pack', sub: 'cups', name: 'แก้วน้ำ',               unit: 'แถว', spicy: false, cost: 40 },
  { id: 'pk-glasslid',cat: 'pack', sub: 'cups', name: 'ฝาแก้วน้ำ',             unit: 'แถว', spicy: false, cost: 30 },
  { id: 'pk-straw',   cat: 'pack', sub: 'cups', name: 'หลอด',                  unit: 'แพ็ค', spicy: false, cost: 25 },
  { id: 'pk-hotbag',  cat: 'pack', sub: 'bags', name: 'ถุงร้อน 4×7', unit: 'แพ็ค', spicy: false, cost: 35 },
  { id: 'pk-bag816',  cat: 'pack', sub: 'bags', name: 'ถุง 8×16',    unit: 'แพ็ค', spicy: false, cost: 38 },
  { id: 'pk-bag1220', cat: 'pack', sub: 'bags', name: 'ถุง 12×20',   unit: 'แพ็ค', spicy: false, cost: 48 },
  { id: 'pk-trash',   cat: 'pack', sub: 'bags', name: 'ถุงขยะ',      unit: 'แพ็ค', spicy: false, cost: 45 },
  { id: 'pk-spoon', cat: 'pack', sub: 'tools', name: 'ช้อนส้อม',     unit: 'แพ็ค', spicy: false, cost: 60 },
  { id: 'pk-gas',   cat: 'pack', sub: 'tools', name: 'แก๊สกระป๋อง',  unit: 'กระป๋อง', spicy: false, cost: 30 },
  { id: 'dy-riceoil', cat: 'dry', name: 'น้ำมันรำข้าว',   unit: 'แกลอน', spicy: false, cost: 260 },
  { id: 'dy-chili',   cat: 'dry', name: 'พริก',           unit: 'ถุง', spicy: false, cost: 60 },
  { id: 'dy-chilipow',cat: 'dry', name: 'พริกป่น',        unit: 'ถุง', spicy: false, cost: 70 },
  { id: 'dy-sesame',  cat: 'dry', name: 'งาขาว 50 g',     unit: 'ขวด', spicy: false, cost: 35 },
  { id: 'dy-sake',    cat: 'dry', name: 'สาเกปรุงอาหาร',  unit: 'ขวด', spicy: false, cost: 120 },
  { id: 'dy-shoyu',   cat: 'dry', name: 'ทาคูมิ ซอสโชยุ', unit: 'ขวด', spicy: false, cost: 95 },
  { id: 'dy-carrot',  cat: 'dry', name: 'แครอทจีน',       unit: 'kg', spicy: false, cost: 45 },
  { id: 'dy-syrup',   cat: 'dry', name: 'น้ำเชื่อมสีสรร',  unit: 'kg', spicy: false, cost: 55 },
];

/* ---------- เมนูขาย ---------- */
export const MENUS_SEED = [
  { id: 'mn-kpbeef',   item: 'kp-beef',    name: 'กระเพราเนื้อ + ข้าว',       price: 119, disc: 10 },
  { id: 'mn-beefsalt', item: 'beef-salt',  name: 'เนื้อคั่วพริกเกลือ + ข้าว', price: 129, disc: 0 },
  { id: 'mn-kpduck',   item: 'kp-duck',    name: 'กระเพราเป็ด + ข้าว',        price: 109, disc: 0 },
  { id: 'mn-kpbreast', item: 'kp-breast',  name: 'กระเพราอกไก่ + ข้าว',       price: 89,  disc: 5 },
  { id: 'mn-kpsoft',   item: 'kp-soft',    name: 'กระเพราไก่นุ่ม + ข้าว',     price: 95,  disc: 0 },
  { id: 'mn-kpsalmon', item: 'kp-salmon',  name: 'กระเพราแซลม่อน + ข้าว',    price: 159, disc: 20 },
  { id: 'mn-kpshrimp', item: 'kp-shrimp',  name: 'กระเพรากุ้ง + ข้าว',         price: 139, disc: 0 },
  { id: 'mn-shrimpgar',item: 'shrimp-gar', name: 'กุ้งกระเทียม + ข้าว',       price: 135, disc: 0 },
  { id: 'mn-eggshoyu', item: 'egg-shoyu',  name: 'ไข่ดองโชยุ (เพิ่ม)',        price: 25,  disc: 0 },
  { id: 'mn-eggsoft',  item: 'egg-soft',   name: 'ไข่ต้มยางมะตูม (เพิ่ม)',    price: 15,  disc: 0 },
  { id: 'mn-cocomat',  item: 'dr-cocomat', name: 'Coconut Matcha',            price: 65,  disc: 10 },
  { id: 'mn-thaipi2',  item: 'dr-thaipi2', name: 'ชาไทยพิทาชิโอ้',            price: 69,  disc: 0 },
  { id: 'mn-orange',   item: 'dr-orange',  name: 'น้ำส้มจี๊ด',                 price: 35,  disc: 0 },
];

/* ---------- assumption กลาง (เจ้าของแก้ได้) ---------- */
export const ASSUMPTIONS_SEED = [
  { id: 'gp-grab',    grp: 'รายได้', name: 'GP Grab',                 v: '30', unit: '%' },
  { id: 'gp-lineman', grp: 'รายได้', name: 'GP Lineman',              v: '30', unit: '%' },
  { id: 'gp-shopee',  grp: 'รายได้', name: 'GP Shopee',               v: '28', unit: '%' },
  { id: 'mkt-pct',    grp: 'รายได้', name: 'ค่าการตลาดเริ่มต้น',      v: '2.5', unit: '%' },
  { id: 'egg-tray',   grp: 'สต๊อก',  name: 'ไข่ 1 แผง',               v: '30', unit: 'ฟอง' },
  { id: 'low-days',   grp: 'สต๊อก',  name: 'เกณฑ์สต๊อกต่ำ (ใช้ได้อีก)', v: '2',  unit: 'วัน' },
  { id: 'order-buf',  grp: 'พยากรณ์', name: 'เผื่อความปลอดภัยใบสั่งของ', v: '10', unit: '%' },
  { id: 'fc-window',  grp: 'พยากรณ์', name: 'ใช้ข้อมูลย้อนหลัง',       v: '3',  unit: 'เดือน' },
  { id: 'tax-lump',   grp: 'ภาษี',   name: 'หักค่าใช้จ่ายเหมา ม.40(8)', v: '60', unit: '%' },
  { id: 'tax-deduct', grp: 'ภาษี',   name: 'ลดหย่อนส่วนตัว',          v: '60000', unit: 'บาท' },
  { id: 'vat-line',   grp: 'ภาษี',   name: 'เกณฑ์จด VAT',             v: '1800000', unit: 'บาท/ปี' },
];

/* ---------- สต๊อกคงเหลือ (ตัวเด่น demo) ---------- */
export const STOCK_SEED = [
  { id: 'kp-shrimp', qty: 0.3, use: 0.6, st: 'lo',
    lots: [{ d: '10 มิ.ย.', lot: 27, qty: 0.3, age: 1 }] },
  { id: 'egg-shoyu', qty: 18, use: 23, st: 'mid',
    lots: [{ d: '8 มิ.ย.', lot: 24, qty: 6, age: 3 }, { d: '10 มิ.ย.', lot: 27, qty: 12, age: 1 }] },
  { id: 'kp-beef', qty: 2.4, use: 2.1, st: 'mid',
    lots: [{ d: '9 มิ.ย.', lot: 25, qty: 0.9, age: 2 }, { d: '11 มิ.ย.', lot: 28, qty: 1.5, age: 0 }] },
  { id: 'pk-box1', qty: 2, use: 0.8, st: 'mid',
    lots: [{ d: '5 มิ.ย.', lot: 19, qty: 2, age: 6 }] },
  { id: 'dr-cocomat', qty: 9, use: 3, st: 'ok',
    lots: [{ d: '7 มิ.ย.', lot: 22, qty: 4, age: 4 }, { d: '10 มิ.ย.', lot: 27, qty: 5, age: 1 }] },
  { id: 'kp-salmon', qty: 1.2, use: 0.5, st: 'ok',
    lots: [{ d: '10 มิ.ย.', lot: 27, qty: 1.2, age: 1 }] },
  { id: 'rice-iraya', qty: 8, use: 1.3, st: 'ok',
    lots: [{ d: '5 มิ.ย.', lot: 19, qty: 8, age: 6 }] },
];

export const SHRINK_DEMO = { gone: 2.3, waste: 0.2, sold: 2.1 };

/* ---------- เงิน — มิ.ย. 2569 ---------- */
export const MONEY = {
  monthIncome: 312000, monthExpense: 113600,
  days: {
    1: { in: 11200, ex: 0 }, 2: { in: 10400, ex: 980 }, 3: { in: 12100, ex: 0 },
    4: { in: 9800, ex: 340 }, 5: { in: 13900, ex: 0 }, 6: { in: 15200, ex: 1200 },
    7: { in: 14800, ex: 0 }, 8: { in: 12400, ex: 340 }, 9: { in: 11700, ex: 0 },
    10: { in: 12900, ex: 8000 }, 11: { in: 6400, ex: 0 },
  },
  channels: ['Grab', 'Lineman', 'Shopee', 'หน้าร้าน', 'อื่นๆ'],
  expCats: ['บรรจุภัณฑ์', 'ข้าว', 'ซอส/น้ำจิ้ม', 'อื่นๆ', 'ค่าเช่า', 'ค่าไฟ', 'ค่าน้ำ', 'เน็ต/โทร', 'ค่าส่ง/ค่าเดินทาง'],
  todayExp: [{ cat: 'บรรจุภัณฑ์', amt: 340, note: 'ถุงร้อน 4×7 · 2 แพ็ค' }],
};

export const INCOME_LOG = {
  11: { Grab: { gross: 7800, mkt: 300 } },
  10: { Grab: { gross: 7400, mkt: 250 }, Lineman: { gross: 3600, mkt: 0 }, 'หน้าร้าน': { gross: 1900, mkt: 0 } },
  9:  { Grab: { gross: 6900, mkt: 200 }, Lineman: { gross: 3300, mkt: 0 }, 'หน้าร้าน': { gross: 1500, mkt: 0 } },
};
export const GP_PCT = { Grab: 0.30, Lineman: 0.30, Shopee: 0.28, 'หน้าร้าน': 0, 'อื่นๆ': 0 };

/* ---------- ประวัติ + audit ---------- */
export const RECORDS = [
  { d: '11 มิ.ย.', t: '08:20', kind: 'receive', items: 14, today: true },
  { d: '10 มิ.ย.', t: '18:45', kind: 'count', items: 31 },
  { d: '10 มิ.ย.', t: '08:10', kind: 'receive', items: 12 },
  { d: '9 มิ.ย.', t: '18:35', kind: 'count', items: 29 },
];
export const AUDIT = [
  { txt: 'แก้ "ไข่ดองโชยุ" คงเหลือ 10 มิ.ย. · 18 → 12 ฟอง', by: 'รหัส: staff', t: '11 มิ.ย. 09:12', kind: 'edit' },
  { txt: 'บันทึกรับของ 14 รายการ', by: 'รหัส: staff', t: '11 มิ.ย. 08:20', kind: 'add' },
  { txt: 'บันทึกนับปิดร้าน 31 รายการ', by: 'รหัส: staff', t: '10 มิ.ย. 18:45', kind: 'add' },
];

/* ---------- ผู้ใช้ + รหัสผ่าน (login) ----------
   level: owner=เจ้าของ · lead=หัวหน้า · staff=พนักงาน (เรียงสูง→ต่ำ)
   ตอนนี้ lead/staff สิทธิ์เท่ากัน (appRole=staff) · owner เห็นแท็บเพิ่มเติม
   ชื่อขึ้นต้น "user" + เลข = ยังไม่ได้ตั้งชื่อ (ถือว่า login ยังไม่มีผู้ใช้งาน) */
export const USERS_SEED = [
  { id: 'u-meili', pin: '9991', name: 'เหมยลี่', level: 'owner', blocked: false },
  { id: 'u-champ', pin: '4065', name: 'แชมป์',  level: 'owner', blocked: false },
  { id: 'u-kaew',  pin: '8888', name: 'แก้ว',   level: 'lead',  blocked: false },
  { id: 'u-su',    pin: '9999', name: 'ซู',     level: 'lead',  blocked: false },
  { id: 'u-aom',   pin: '1111', name: 'ออม',    level: 'staff', blocked: false },
  { id: 'u-user2', pin: '2222', name: 'user2',  level: 'staff', blocked: false },
  { id: 'u-user3', pin: '3333', name: 'user3',  level: 'staff', blocked: false },
];

/* ---------- งานและข้อความ (rama9_tasks) ----------
   kind:   'task'   = งาน/คำสั่งติดตามผล (ติ๊กส่ง → รอตรวจ → อนุมัติ)
           'notice' = แจ้งให้ทราบ/ประกาศ (กด "รับทราบ")
           'note'   = โน้ตส่วนตัว (assignee = assigner = ตัวเอง)
   status: 'open' (ยังไม่ทำ) | 'submitted' (พนักงานกดเสร็จ รอตรวจ) | 'done' (อนุมัติแล้ว)
   due:    วันที่ครบกำหนด (เลขวันในเดือนปัจจุบัน) | null  → เกินกำหนด = due < TODAY.d และยังไม่ done
   urgent: งานด่วน · acked: รับทราบประกาศแล้ว · bounced: งานที่ถูกตีกลับ
   assignee_id = ผู้รับ · assigner_id = ผู้ส่ง/ผู้สั่ง */
export const TASKS_SEED = [
  // ── ข้อความจากเจ้าของ → หัวหน้า (แก้ว) ──
  { id: 't-s01', assignee_id: 'u-kaew', assigner_id: 'u-meili', title: 'ฝากดูสต๊อกเนื้อ/ไก่ ช่วงปิดร้าน', detail: 'วันนี้ลูกค้าเยอะ เผื่อของไม่พอพรุ่งนี้ — รบกวนเช็กให้หน่อยนะ', kind: 'notice', manual_ref: null, status: 'open', due: null, urgent: false, acked: false, created_at: '2569-06-11T09:20:00', done_at: null },
  // ── คำสั่งจากเจ้าของ → หัวหน้า (แก้ว) งานด่วน ──
  { id: 't-s02', assignee_id: 'u-kaew', assigner_id: 'u-meili', title: 'สรุปยอดของเสียประจำสัปดาห์', detail: 'ทำสรุปส่งก่อนประชุมเช้าพรุ่งนี้', kind: 'task', manual_ref: null, status: 'open', due: 11, urgent: true, acked: false, created_at: '2569-06-11T09:25:00', done_at: null },

  // ── คำสั่งจากหัวหน้า (แก้ว) → พนักงาน (ออม) ──
  { id: 't-s03', assignee_id: 'u-aom', assigner_id: 'u-kaew', title: 'เช็ดทำความสะอาดสถานีแพ็คก่อนเปิดร้าน', detail: 'เน้นโต๊ะตัก + ที่ชั่ง ให้แห้งสะอาด', kind: 'task', manual_ref: 'mn-open', status: 'open', due: 11, urgent: false, acked: false, created_at: '2569-06-11T07:10:00', done_at: null },
  { id: 't-s04', assignee_id: 'u-aom', assigner_id: 'u-kaew', title: 'เช็คสต๊อกไก่ก่อนปิดร้าน 18:30', detail: 'ถ้าน้อยกว่า 2 kg แจ้งหัวหน้าทันที', kind: 'task', manual_ref: 'mn-close', status: 'open', due: 11, urgent: true, acked: false, created_at: '2569-06-11T11:00:00', done_at: null },
  // ── ข้อความจากเจ้าของ → พนักงาน (ออม) ──
  { id: 't-s05', assignee_id: 'u-aom', assigner_id: 'u-meili', title: 'พรุ่งนี้ร้านเปิดสาย 1 ชม. (ทีมประชุมเช้า)', detail: 'ฝากแจ้งเพื่อนในกะด้วยนะ', kind: 'notice', manual_ref: null, status: 'open', due: null, urgent: false, acked: false, created_at: '2569-06-11T09:00:00', done_at: null },
  // ── งานที่ถูกตีกลับ (ออม) ──
  { id: 't-s06', assignee_id: 'u-aom', assigner_id: 'u-meili', title: 'นับสต๊อกซอส/น้ำจิ้มให้ครบทุกขวด', detail: 'รอบที่แล้วตกไป 2 รายการ ช่วยนับใหม่ให้ครบนะ', kind: 'task', manual_ref: 'mn-close', status: 'open', due: 11, urgent: false, acked: false, bounced: true, created_at: '2569-06-10T18:40:00', done_at: null },

  // ── งานรอตรวจ: พนักงานกดเสร็จแล้ว รอหัวหน้า/เจ้าของอนุมัติ ──
  { id: 't-s07', assignee_id: 'u-aom', assigner_id: 'u-kaew', title: 'จัดเรียงคลังแห้งตาม FIFO', detail: '', kind: 'task', manual_ref: null, status: 'submitted', due: 11, urgent: false, acked: false, created_at: '2569-06-11T10:00:00', done_at: '2569-06-11T15:20:00' },
  { id: 't-s08', assignee_id: 'u-su', assigner_id: 'u-meili', title: 'ตรวจรับของจากซัพพลายเออร์รอบเช้า', detail: '', kind: 'task', manual_ref: null, status: 'submitted', due: 11, urgent: false, acked: false, created_at: '2569-06-11T08:10:00', done_at: '2569-06-11T09:05:00' },

  // ── งานเกินกำหนด (due < 11, ยังไม่ done) ──
  { id: 't-s09', assignee_id: 'u-user2', assigner_id: 'u-meili', title: 'ถ่ายรูปสต๊อกตู้แช่ส่งกลุ่ม', detail: 'ค้างมาจากเมื่อวาน', kind: 'task', manual_ref: null, status: 'open', due: 10, urgent: false, acked: false, created_at: '2569-06-10T12:00:00', done_at: null },

  // ── โน้ตส่วนตัวของพนักงาน (ออม) ──
  { id: 't-s10', assignee_id: 'u-aom', assigner_id: 'u-aom', title: 'อย่าลืมสั่งถุงร้อนเพิ่ม', detail: 'เหลือ ~1 แพ็ค', kind: 'note', manual_ref: null, status: 'open', due: null, urgent: false, acked: false, created_at: '2569-06-11T10:30:00', done_at: null },
];

/* ---------- ยอดขายรายวัน แยกสาขา (การ์ดหน้าแรกเจ้าของ) ----------
   • ชื่อสาขา = ชื่อร้านจากตัวสลับร้าน (shopCtx.shops) — ใช้ชื่อเดียวกันทั้งแอป
   • สาขาแรก (หลัก) = ดึงยอดจากบันทึกรายได้จริง (MONEY.days[d].in)
   • สาขาอื่น = เดโม deterministic (สัดส่วนจากสาขาหลัก) จนกว่าจะต่อข้อมูลจริง
   คืน { branches:[{name,color}], days:[{d, byBranch, total}], today:[{name,color,today}], todayTotal } */
export const BRANCH_COLORS = ['#54AE7B', '#5B9BF6', '#B98AF0', '#F4A259', '#E26D8A'];
const _BRANCH_FACTOR = [1, 0.82, 0.6, 0.48, 0.4];

export function branchDailySales(shopNames) {
  const names = shopNames && shopNames.length ? shopNames : ['ร้านหลัก'];
  const branches = names.map((name, i) => ({ name, color: BRANCH_COLORS[i % BRANCH_COLORS.length] }));
  const dayKeys = Object.keys(MONEY.days).map(Number).sort((a, b) => a - b);
  const days = dayKeys.map((d) => {
    const mainIn = MONEY.days[d].in;
    const byBranch = {};
    names.forEach((name, i) => {
      if (i === 0) { byBranch[name] = mainIn; return; }
      const factor = _BRANCH_FACTOR[i] ?? 0.4;
      const wobble = (((d * 7 + i * 13) % 11) - 5) * 45;
      byBranch[name] = Math.max(0, Math.round(mainIn * factor + wobble));
    });
    const total = names.reduce((a, name) => a + byBranch[name], 0);
    return { d, byBranch, total, actual: d <= TODAY.d };
  });
  const last = days[days.length - 1];
  return {
    branches, days,
    today: branches.map((b) => ({ ...b, today: last.byBranch[b.name] })),
    todayTotal: last.total,
  };
}

/* ---------- สูตรอาหาร · เพลง · คู่มือ ---------- */
export const RECIPES = [
  { id: 'rc-shoyu', item: 'egg-shoyu', name: 'น้ำดองโชยุ (ดองไข่)', yield: 'สูตรมาตรฐาน', unit: 'g', locked: true,
    ing: [['น้ำเปล่า', 1500], ['ทาคูมิ ซอสโชยุ', 300], ['ไซรัปสีสรร', 85], ['สาเกปรุงอาหาร', 65]],
    method: ['ต้มไข่ยางมะตูม 6.5 นาที น็อคน้ำเย็น ปอกเปลือก', 'ผสมส่วนผสมน้ำดองตามสัดส่วน คนให้ไซรัปละลาย', 'แช่ไข่ให้น้ำท่วม 12 ชม. ในตู้เย็น', 'โรยงาขาวก่อนเสิร์ฟ (ถ้าชอบ)'] },
  { id: 'rc-kpsauce', item: 'kp-beef', name: 'ซอสกะเพราสูตรกลาง', yield: 'ซอสเบสผัดกะเพรา', unit: 'g', locked: true,
    ing: [['ซีอิ๊วขาว', 400], ['ซอสหอยนางรม', 350], ['น้ำตาลปี๊บ', 150], ['ซีอิ๊วดำหวาน', 50]],
    method: ['อุ่นซีอิ๊วขาว + หอยนางรม พอเดือดเบาๆ', 'ใส่น้ำตาลปี๊บ คนจนละลายหมด', 'แต่งสีด้วยซีอิ๊วดำหวาน', 'พักให้เย็น เก็บขวด ใช้ได้ 1 สัปดาห์'] },
  { id: 'rc-jaew', item: 'sc-jaew', name: 'น้ำจิ้มแจ่ว', yield: 'สูตรร้าน', unit: 'g', locked: false,
    ing: [['น้ำปลา', 200], ['มะขามเปียก', 120], ['น้ำตาลปี๊บ', 100], ['ข้าวคั่ว', 40], ['พริกป่น', 30]],
    method: ['ละลายมะขามเปียกกับน้ำปลา', 'ใส่น้ำตาลปี๊บ คนให้เข้ากัน', 'ใส่ข้าวคั่ว + พริกป่น ก่อนเสิร์ฟ'] },
];
export const SONGS = [
  { id: 'sg-1', name: 'เพลงขอบคุณลูกค้า (Original)', fmt: 'wav', len: '3:42', fav: true },
  { id: 'sg-2', name: 'Morning Basil — เปิดร้าน', fmt: 'mp3', len: '4:10' },
  { id: 'sg-3', name: 'Lo-fi ครัวคลีน 01', fmt: 'mp3', len: '2:58' },
  { id: 'sg-4', name: 'Lo-fi ครัวคลีน 02', fmt: 'mp3', len: '3:21' },
];
export const PLAYLISTS = [
  { id: 'pl-open', name: 'เปิดร้าน · เช้า', count: 6 },
  { id: 'pl-rush', name: 'ช่วงพีคเที่ยง', count: 9 },
  { id: 'pl-close', name: 'ปิดร้าน · เก็บครัว', count: 4 },
];
export const MANUAL = [
  { id: 'mn-open', icon: 'store', name: 'เปิดร้าน (07:30)', steps: ['เปิดไฟ + แอร์ + เครื่องอุ่น', 'เช็ครับของจากสาขาหลัก ใน "สั่งของ / รับของ"', 'เช็ดเคาน์เตอร์ เตรียมสถานีแพ็ค'] },
  { id: 'mn-pack', icon: 'box', name: 'แพ็คออเดอร์', steps: ['ดูสติ๊กเกอร์ เผ็ด = แดง / ไม่เผ็ด = เขียว', 'ตักตามสูตร (ดูการ์ดสูตรอาหาร)', 'เช็คซอส + ช้อนส้อม ก่อนปิดถุง'] },
  { id: 'mn-close', icon: 'scale', name: 'ปิดร้าน + ตรวจนับ (18:30)', steps: ['ตรวจนับสินค้าคงเหลือทุกหมวด', 'แยกของทิ้ง/เสีย พร้อมสาเหตุ', 'กดส่งรายงานประจำวันเข้า LINE'] },
  { id: 'mn-clean', icon: 'drop', name: 'ความสะอาด', steps: ['ล้างกล่อง/ถาดทุกเย็น', 'น้ำยาเช็ดพื้น สูตรปลอดภัยอาหาร', 'ทิ้งขยะเปียกก่อน 19:00'] },
];

/* ---------- พยากรณ์ฐาน + เดโมรายงาน ---------- */
export const FC_BASE = {
  'kp-beef': 2.2, 'beef-salt': 0.5, 'kp-duck': 0.6, 'kp-breast': 1.5, 'kp-soft': 0.9, 'breast': 0.7,
  'kp-salmon': 0.5, 'kp-shrimp': 0.55, 'shrimp-gar': 0.4,
  'sc-prik': 100, 'sc-teri': 42, 'sc-jaew': 36,
  'rice-iraya': 6.5, 'rice-horm': 4.2, 'rice-berry': 3.1,
};
export const COUNT_RESULT = [
  { id: 'kp-beef',    prev: 4.5, recv: 0,  count: 2.4, waste: 0.2 },
  { id: 'kp-shrimp',  prev: 1.1, recv: 0,  count: 0.3, waste: 0 },
  { id: 'egg-shoyu',  prev: 30,  recv: 12, count: 18,  waste: 2 },
  { id: 'dr-cocomat', prev: 15,  recv: 5,  count: 9,   waste: 0 },
  { id: 'pk-box1',    prev: 3,   recv: 0,  count: 2,   waste: 0 },
];
export const STOCKVAL_CUM = [
  { d: 5, v: 41800 }, { d: 6, v: 45200 }, { d: 7, v: 44100 }, { d: 8, v: 47600 },
  { d: 9, v: 46300 }, { d: 10, v: 50100 }, { d: 11, v: 48700 },
];
export const REV_TARGET_YEAR = 1800000;
export const COST_MODEL = {
  fixedMonth: { 'ค่าเช่า': 8000, 'ค่าแรงประจำ': 36000, 'ค่าไฟ/น้ำ/เน็ต': 7400, 'อื่นๆคงที่': 4200 },
  varRatio: 0.46,
};
export const TOP_FOOD = [
  { id: 'kp-beef',   qty: 312, rev: 37128 },
  { id: 'kp-breast', qty: 268, rev: 23852 },
  { id: 'kp-soft',   qty: 201, rev: 19095 },
  { id: 'kp-salmon', qty: 142, rev: 22578 },
  { id: 'kp-duck',   qty: 121, rev: 13189 },
];
export const TOP_DRINK = [
  { id: 'dr-cocomat', qty: 188, rev: 12220 },
  { id: 'dr-thaipi2', qty: 156, rev: 10764 },
  { id: 'dr-orange',  qty: 134, rev: 4690 },
  { id: 'dr-matchap', qty: 98,  rev: 4410 },
  { id: 'dr-grape',   qty: 76,  rev: 2128 },
];
export const DOW_SALES = [
  { d: 'จันทร์',   v: 9800 },
  { d: 'อังคาร',  v: 10400 },
  { d: 'พุธ',     v: 11200 },
  { d: 'พฤหัสบดี', v: 12100 },
  { d: 'ศุกร์',    v: 15600 },
  { d: 'เสาร์',    v: 16900 },
  { d: 'อาทิตย์',  v: 14300 },
];
export const INV_GROUPS = [
  { id: 'food',  name: 'อาหาร',      icon: 'pan', tint: 'green',  cats: ['protein', 'egg', 'sauce', 'rice', 'dry'] },
  { id: 'drink', name: 'เครื่องดื่ม', icon: 'cup2', tint: 'blue',  cats: ['drink'] },
  { id: 'pack',  name: 'บรรจุภัณฑ์',  icon: 'box', tint: 'orange', cats: ['pack'] },
];
export const PAYROLL = [
  { id: 'pr-1', name: 'ปอ',      type: 'daily',   wage: 480,  otRate: 60, otHours: 1.5, days: 26 },
  { id: 'pr-2', name: 'แนน',     type: 'daily',   wage: 450,  otRate: 56, otHours: 1,   days: 24 },
  { id: 'pr-3', name: 'มิน (เมียนมา)', type: 'monthly', wage: 13000, otRate: 50, otHours: 20, days: 30 },
  { id: 'pr-4', name: 'เจ๊แดง (ครัว)', type: 'monthly', wage: 16000, otRate: 70, otHours: 12, days: 30 },
];
export const BOTTOM_FOOD = [
  { id: 'shrimp-gar', qty: 38, rev: 4180 },
  { id: 'beef-salt', qty: 44, rev: 5676 },
  { id: 'kp-shrimp', qty: 52, rev: 7228 },
];
export const BOTTOM_DRINK = [
  { id: 'dr-longan', qty: 12, rev: 420 },
  { id: 'dr-cocosug', qty: 18, rev: 486 },
  { id: 'dr-honeylem', qty: 22, rev: 660 },
];
export const EXP_INV_CAT = { 'บรรจุภัณฑ์': 'pack', 'ข้าว': 'rice', 'ซอส/น้ำจิ้ม': 'sauce', 'อื่นๆ': 'dry' };

/* ---------- พยากรณ์ย้อนหลัง (back-test) ---------- */
export const FC_HISTORY = [
  { d: '5 มิ.ย.', pred: 2.4, real: 2.5, err: '+4%', hit: true },
  { d: '6 มิ.ย.', pred: 2.0, real: 2.2, err: '+10%', hit: false },
  { d: '7 มิ.ย.', pred: 2.1, real: 2.0, err: '−5%', hit: true },
  { d: '8 มิ.ย.', pred: 2.2, real: 2.3, err: '+5%', hit: true },
  { d: '9 มิ.ย.', pred: 2.1, real: 2.1, err: '0%', hit: true },
  { d: '10 มิ.ย.', pred: 2.3, real: 2.2, err: '−4%', hit: true },
];

/* ---------- รับของรายวัน (เดโม) ---------- */
export const RECV_LOG = {
  2:  { time: '08:05', items: [
        { id: 'kp-beef', qty: 4.0 }, { id: 'kp-breast', qty: 2.5 }, { id: 'kp-salmon', qty: 0.9 },
        { id: 'kp-shrimp', qty: 0.6 }, { id: 'rice-iraya', qty: 9 }, { id: 'sc-prik', qty: 40 },
        { id: 'dy-riceoil', qty: 2 }, { id: 'dy-chilipow', qty: 2 }, { id: 'dy-sesame', qty: 1 }, { id: 'dy-syrup', qty: 2 },
      ], ship: 130 },
  4:  { time: '08:20', items: [
        { id: 'kp-beef', qty: 2.8 }, { id: 'kp-duck', qty: 0.9 }, { id: 'rice-horm', qty: 5 },
        { id: 'sc-jaew', qty: 20 }, { id: 'dy-chili', qty: 2 }, { id: 'dy-carrot', qty: 3 },
      ], ship: null },
  5:  { time: '08:12', items: [
        { id: 'kp-beef', qty: 4.2 }, { id: 'kp-breast', qty: 2.8 }, { id: 'kp-soft', qty: 1.4 },
        { id: 'shrimp-gar', qty: 0.5 }, { id: 'rice-iraya', qty: 10 }, { id: 'rice-berry', qty: 3 },
        { id: 'sc-prik', qty: 45 }, { id: 'sc-teri', qty: 18 }, { id: 'dy-shoyu', qty: 2 },
      ], ship: 140 },
  7:  { time: '08:08', items: [
        { id: 'kp-beef', qty: 3.0 }, { id: 'kp-salmon', qty: 1.0 }, { id: 'kp-shrimp', qty: 0.7 },
        { id: 'rice-iraya', qty: 8 }, { id: 'sc-prik', qty: 35 }, { id: 'dy-riceoil', qty: 1 }, { id: 'dy-sake', qty: 2 },
      ], ship: 100 },
  8:  { time: '08:18', items: [
        { id: 'kp-beef', qty: 3.5 }, { id: 'kp-duck', qty: 1.2 }, { id: 'kp-breast', qty: 2.0 },
        { id: 'rice-horm', qty: 6 }, { id: 'sc-jaew', qty: 25 }, { id: 'dy-chili', qty: 2 },
        { id: 'dy-sesame', qty: 2 }, { id: 'dy-syrup', qty: 3 },
      ], ship: 120 },
  10: { time: '08:10', items: [
        { id: 'kp-beef', qty: 4.0 }, { id: 'kp-breast', qty: 2.5 }, { id: 'kp-soft', qty: 1.2 },
        { id: 'kp-salmon', qty: 0.8 }, { id: 'kp-shrimp', qty: 0.6 }, { id: 'rice-iraya', qty: 8 },
        { id: 'sc-prik', qty: 40 }, { id: 'sc-teri', qty: 20 }, { id: 'dy-riceoil', qty: 1 },
        { id: 'dy-chilipow', qty: 2 }, { id: 'dy-shoyu', qty: 3 }, { id: 'dy-carrot', qty: 4 },
      ], ship: 150 },
  11: { time: '08:20', items: [
        { id: 'kp-beef', qty: 4.5 }, { id: 'kp-duck', qty: 1.0 }, { id: 'kp-breast', qty: 3.0 },
        { id: 'kp-soft', qty: 1.5 }, { id: 'breast', qty: 2.0 }, { id: 'kp-salmon', qty: 1.0 },
        { id: 'kp-shrimp', qty: 0.8 }, { id: 'shrimp-gar', qty: 0.6 }, { id: 'rice-iraya', qty: 10 },
        { id: 'rice-horm', qty: 5 }, { id: 'sc-prik', qty: 50 }, { id: 'sc-jaew', qty: 30 },
        { id: 'dy-riceoil', qty: 2 }, { id: 'dy-chili', qty: 3 },
      ], ship: null },
};

/* รายการใช้เฉพาะร้าน — ตอนนี้ของใช้ร่วมกันทุกร้าน */
export const SHOP_ONLY = {};
export const ORDER_CAT_IDS = ['protein', 'sauce', 'rice', 'dry'];

/* ====================================================================
   อิโมจิ + สี (สำหรับไอคอนรายการ/หมวด)
==================================================================== */
export const ICON_EMOJI = {
  pan: '🍳', chefhat: '👩‍🍳', grid: '🍽️',
  cow: '🥩', pig: '🐷', duck: '🦆', chicken: '🍗', fish: '🐟', shrimp: '🦐',
  egg: '🥚', eggtray: '🥚', eggboil: '🥚', eggsoft: '🍳', eggshoyu: '🥚',
  cup2: '🥤', bottle: '🍾', cup: '🥤', drop: '🥫', rice: '🍚', leaf: '🌿', flame: '🍵',
  box: '📦', bag: '🛍️', utensil: '🍴', jar: '🫙',
  store: '🏪', truck: '🚚', music: '🎵', book: '📖', users: '🧑‍🍳', user: '🙂',
  wallet: '👛', coin: '🪙', receipt: '🧾', cart: '🛒', scale: '⚖️', drink: '🥤',
};
export const ITEM_EMOJI = {
  'dr-orange': '🍊', 'dr-ginger': '🫚', 'dr-pandan': '🥥', 'dr-cocomat': '🍵',
  'dr-thaipis': '🧋', 'dr-thaipi2': '🧋', 'dr-matchap': '🍵', 'dr-grape': '🍇',
  'dr-honeylem': '🍋', 'dr-longan': '🧃', 'dr-cocosug': '🥥', 'dr-applemel': '🍏',
  'egg-soft': '🍳', 'egg-shoyu': '🥚', 'egg-boil': '🥚', 'egg-raw': '🥚',
  'sc-prik': '🌶️', 'sc-teri': '🍶', 'sc-jaew': '🥣',
  'dy-riceoil': '🛢️', 'dy-chili': '🌶️', 'dy-chilipow': '🌶️', 'dy-sesame': '🫘',
  'dy-sake': '🍶', 'dy-shoyu': '🍶', 'dy-carrot': '🥕', 'dy-syrup': '🍯',
  'rice-iraya': '🍚', 'rice-horm': '🍚', 'rice-berry': '🍙',
  'pk-box1': '🍱', 'pk-box2': '🍱', 'pk-box4': '🍱',
  'pk-cup4': '🥤', 'pk-lid4': '🥤', 'pk-cup6': '🥤', 'pk-lid6': '🥤',
  'pk-glass': '🥛', 'pk-glasslid': '🥛', 'pk-straw': '🥤',
  'pk-hotbag': '🛍️', 'pk-bag816': '🛍️', 'pk-bag1220': '🛍️', 'pk-trash': '🗑️',
  'pk-spoon': '🍴', 'pk-gas': '🔥',
};
export const SUB_TINT = { beef: 'rose', pork: 'pink', duck: 'orange', chicken: 'amber', fish: 'blue', shrimp: 'orange', boxes: 'orange', cups: 'blue', bags: 'amber', tools: 'violet', zero: 'green', low: 'teal' };
export const CAT_TINT = { protein: 'green', egg: 'amber', drink: 'teal', sauce: 'rose', rice: 'violet', pack: 'orange', dry: 'teal' };
export const SECTION_TINT = {
  beef: 'rose', pork: 'pink', duck: 'amber', chicken: 'amber', fish: 'blue', shrimp: 'rose',
  egg: 'amber', drink: 'teal', sauce: 'rose', rice: 'violet', pack: 'orange', dry: 'violet',
};
export const UNIT_CHOICES = ['kg', 'g', 'ฟอง', 'แผง', 'ขวด', 'ซอง', 'แพ็ค', 'แถว', 'ถุง', 'แกลอน', 'กระป๋อง', 'กล่อง'];

/* ====================================================================
   โภชนาการ (เดโม · ค่าประมาณ) — แสดงในหน้า "ข้อมูล → โภชนาการและสารอาหาร"
   INGR_NUTRI: ต่อวัตถุดิบ (ตาม per) · MENU_NUTRI: ต่อ 1 จาน/แก้ว เสิร์ฟ
   kcal=พลังงาน · p=โปรตีน(g) · c=คาร์บ(g) · f=ไขมัน(g)
   เจ้าของแก้/เพิ่มค่าจริงได้ภายหลัง (ค่าพวกนี้เป็นค่าตั้งต้นไว้ให้ดูโครง)
==================================================================== */
export const INGR_NUTRI = {
  // โปรตีน (ดิบ ต่อ 100 ก.)
  'kp-beef':    { per: '100 ก.', kcal: 250, p: 26,   c: 0,   f: 15 },
  'beef-salt':  { per: '100 ก.', kcal: 250, p: 26,   c: 0,   f: 15 },
  'kp-duck':    { per: '100 ก.', kcal: 135, p: 19,   c: 0,   f: 6 },
  'kp-breast':  { per: '100 ก.', kcal: 120, p: 22.5, c: 0,   f: 2.6 },
  'kp-soft':    { per: '100 ก.', kcal: 120, p: 22.5, c: 0,   f: 2.6 },
  'breast':     { per: '100 ก.', kcal: 120, p: 22.5, c: 0,   f: 2.6 },
  'kp-salmon':  { per: '100 ก.', kcal: 208, p: 20,   c: 0,   f: 13 },
  'kp-shrimp':  { per: '100 ก.', kcal: 99,  p: 24,   c: 0.2, f: 0.3 },
  'shrimp-gar': { per: '100 ก.', kcal: 99,  p: 24,   c: 0.2, f: 0.3 },
  // ไข่ (ต่อฟอง ~50 ก.)
  'egg-raw':    { per: '1 ฟอง', kcal: 70, p: 6,   c: 0.6, f: 5 },
  'egg-boil':   { per: '1 ฟอง', kcal: 70, p: 6,   c: 0.6, f: 5 },
  'egg-soft':   { per: '1 ฟอง', kcal: 70, p: 6,   c: 0.6, f: 5 },
  'egg-shoyu':  { per: '1 ฟอง', kcal: 78, p: 6.5, c: 2,   f: 5 },
  // ข้าว (สุก ต่อ 100 ก.)
  'rice-iraya': { per: '100 ก. สุก', kcal: 130, p: 2.7, c: 28, f: 0.3 },
  'rice-horm':  { per: '100 ก. สุก', kcal: 130, p: 2.7, c: 28, f: 0.3 },
  'rice-berry': { per: '100 ก. สุก', kcal: 110, p: 3,   c: 23, f: 1 },
  // เครื่องดื่ม (ต่อขวด)
  'dr-orange':  { per: '1 ขวด', kcal: 35, p: 0, c: 9,  f: 0 },
  'dr-ginger':  { per: '1 ขวด', kcal: 30, p: 0, c: 8,  f: 0 },
  'dr-cocomat': { per: '1 ขวด', kcal: 60, p: 1, c: 10, f: 2 },
  'dr-thaipi2': { per: '1 ขวด', kcal: 90, p: 2, c: 14, f: 3 },
  'dr-matchap': { per: '1 ขวด', kcal: 80, p: 2, c: 12, f: 2.5 },
  'dr-grape':   { per: '1 ขวด', kcal: 45, p: 0, c: 11, f: 0 },
};
export const MENU_NUTRI = {
  'mn-kpbeef':   { kcal: 620, p: 34, c: 70, f: 22 },
  'mn-beefsalt': { kcal: 640, p: 35, c: 68, f: 24 },
  'mn-kpduck':   { kcal: 540, p: 30, c: 70, f: 16 },
  'mn-kpbreast': { kcal: 470, p: 33, c: 70, f: 8 },
  'mn-kpsoft':   { kcal: 490, p: 32, c: 70, f: 10 },
  'mn-kpsalmon': { kcal: 600, p: 32, c: 70, f: 20 },
  'mn-kpshrimp': { kcal: 470, p: 30, c: 70, f: 8 },
  'mn-shrimpgar':{ kcal: 460, p: 29, c: 70, f: 8 },
  'mn-eggshoyu': { kcal: 78,  p: 6.5, c: 2, f: 5 },
  'mn-eggsoft':  { kcal: 70,  p: 6,  c: 0.6, f: 5 },
  'mn-cocomat':  { kcal: 60,  p: 1,  c: 10, f: 2 },
  'mn-thaipi2':  { kcal: 90,  p: 2,  c: 14, f: 3 },
  'mn-orange':   { kcal: 35,  p: 0,  c: 9,  f: 0 },
};
