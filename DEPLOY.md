# DEPLOY — CleanFoodRama9 (vanilla app)

> เป้า: push โค้ดขึ้น GitHub → Cloudflare Pages ดึงไป serve อัตโนมัติ
> **ไม่มี build step** (vanilla HTML/CSS/ESM) — root ที่ deploy = โฟลเดอร์ `app/`
> เจ้าของแก้โค้ดกับ AI แล้ว push → เว็บอัปเดตเองภายในไม่กี่นาที

---

## 0) ก่อนเริ่ม — ของที่ต้องมี
- บัญชี **GitHub** (ฟรี) + บัญชี **Cloudflare** (ฟรี)
- Supabase project **"Stock Tracker"** (`qxhvmrxbrrweundfspzp`, ap-northeast-1) — มีอยู่แล้ว
- (ออปชัน) LINE webhook / make.com / n8n สำหรับส่งรายงานเข้ากลุ่ม

> ⚠️ frontend ใส่ได้แค่ **public config** เท่านั้น (Supabase **anon** key, LIFF id, webhook URL)
> **ห้าม** ใส่ service key / channel secret / token ใดๆ ในโค้ดที่ push ขึ้น repo

---

## 1) ขึ้น GitHub (ครั้งแรก)
1. สร้าง repo ใหม่บน github.com (เช่น `cleanfoodrama9`) — ตั้ง **Private** ได้
2. อัปโหลดเฉพาะโฟลเดอร์ **`app/`** ขึ้น repo (ลากไฟล์ในหน้าเว็บ GitHub ก็ได้ ไม่ต้องใช้ git ก็ได้)
   - ให้ `index.html` อยู่ที่ **root ของ repo** (หรือจำ path ของมันไว้ใช้ตั้ง root ใน Cloudflare ขั้น 2)
3. รอบถัดไปแก้โค้ด → push/อัปโหลดทับ → Cloudflare deploy ใหม่อัตโนมัติ

## 2) ต่อ Cloudflare Pages
1. dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. เลือก repo ที่เพิ่งสร้าง → **Begin setup**
3. ตั้งค่า build:
   - **Framework preset:** `None`
   - **Build command:** *(เว้นว่าง — ไม่มี build)*
   - **Build output directory:** `app` *(ถ้า `index.html` อยู่ในโฟลเดอร์ `app/` ใน repo)*
     หรือ `/` ถ้าอัปเฉพาะไฟล์ใน `app/` ขึ้น root แล้ว
4. **Save and Deploy** → ได้ URL `https://<ชื่อ>.pages.dev`
5. ทุก push ครั้งถัดไป = auto-deploy (ดูสถานะใน Pages → Deployments)

> ไม่ต้องตั้ง environment variable ใดๆ — public config ทั้งหมดอยู่ใน `src/config/config.js` แล้ว

---

## 3) ตั้งค่า `src/config/config.js` (SINGLE SOURCE OF TRUTH)
แก้ค่าพวกนี้ในไฟล์เดียว แล้ว push:

| ค่า | ใส่อะไร | จำเป็น |
|---|---|---|
| `SUPABASE_URL` | `https://qxhvmrxbrrweundfspzp.supabase.co` | ✅ (มีแล้ว) |
| `SUPABASE_ANON_KEY` | anon key (public) ของ project | ✅ (มีแล้ว) |
| `REPORT_WEBHOOK_URL` | URL ของ LINE/make.com webhook | ออปชัน — เว้นว่าง = ส่ง LINE เป็นเดโม |
| `LIFF.ENABLED` + `LIFF.LIFF_ID` | เปิดเฉพาะถ้าจะเปิดในแอป LINE | ออปชัน — `false` = เว็บปกติ |

> เว้น `REPORT_WEBHOOK_URL` ว่าง → ปุ่ม "ส่งเข้ากลุ่ม LINE" / "ส่งใบสั่ง" ยังกดได้ แสดง toast เดโม (ไม่ยิงจริง)
> ใส่ URL แล้ว → POST จริง (success/fail toast) · ดู §5

---

## 4) Supabase — ตั้งค่า + ความปลอดภัย (RLS)
> ตาราง `rama9_*` สร้างไว้แล้วในเฟส 4a (ดู PROGRESS.md) — รอบนี้แค่ **ตรวจ**

- [ ] ตาราง `rama9_*` ครบทุก key ใน `CONFIG.TABLES` (item_master, stock_items, income, expenses, …)
- [ ] **เปิด RLS ทุกตาราง** + policy ให้ role `anon` / `authenticated` ทำงานได้
- [ ] ตาราง `rama9_tasks` — เฟสก่อนยัง **ไม่ได้สร้างจริง** (apiClient fallback เป็น localStorage)
      → สร้างตาราง + RLS ให้ตรงกฎลำดับชั้น (compose/review/ack) ตอนลง Supabase Auth
- [ ] bucket Storage **`rama9-receipts`** (private) สำหรับรูปใบเสร็จ
- [ ] **รัน advisor อีกรอบ** หลังต่อครบ (security + performance) → §6

## 5) ส่ง LINE จริง (REPORT_WEBHOOK_URL)
frontend **ไม่ถือ token** — แค่ POST JSON ไป webhook ที่ push เข้ากลุ่มให้ฝั่ง server:
- ตั้ง relay (make.com / n8n / Cloudflare Worker) ที่รับ `POST` body แล้ว push เข้า LINE group
  ด้วย **Channel access token ที่เก็บฝั่ง server เท่านั้น**
- ใส่ URL ของ relay ลง `CONFIG.REPORT_WEBHOOK_URL`
- payload ที่แอปส่ง (จาก `services/reportService.js`):
  ```json
  { "app":"CleanFoodRama9", "branch":"rama9", "type":"daily_report|order|daily_summary",
    "title":"…", "text":"…(ข้อความที่จัดรูปแล้ว)…", "topics":[…], "asImage":false,
    "shop":"…", "by":"…", "sentAt":"ISO" }
  ```
- ทดสอบ: หน้า "ส่งเข้ากลุ่ม LINE" + ปุ่ม "ส่งใบสั่ง" → ต้องได้ toast สำเร็จ และข้อความเข้ากลุ่มจริง
- ล้มเหลว (เน็ต/HTTP error) → toast แดง "ส่งไม่สำเร็จ … ลองใหม่" (ไม่นำทางออก ให้กดซ้ำได้)

## 6) รัน Supabase advisor (หลังต่อครบ) — ✅ รันแล้วรอบเฟส 4c
- Supabase Dashboard → **Advisors** → **Security** + **Performance** (หรือผ่านเครื่องมือ/MCP)
- ผลรอบเฟส 4c (เฉพาะตาราง `rama9_*`):
  - ✅ **แก้แล้ว** — `multiple_permissive_policies` บน `rama9_delivery` + `rama9_menu`
    (เคยมี policy ซ้ำ `allow_all_*` + `rama9_all_write` → ตัด `allow_all_*` ทิ้ง เหลือ `rama9_all_write` เหมือนตารางอื่น)
  - ⚙️ **ตั้งใจคงไว้** — `rls_policy_always_true` ทุก `rama9_*` (anon app ยังไม่มี auth) → ปิดเมื่อผูก Supabase Auth
  - ℹ️ **เก็บไว้** — `unused_index` `rama9_income_shop_idx` / `rama9_expenses_shop_idx` (index คุม FK `shop`
    ยัง "unused" เพราะยังไม่มี query กรองสาขาจริง — ได้ใช้เมื่อมีหลายสาขา)
- ⚠️ **ไม่ใช่ `rama9_*` แต่ควรเช็ก**: ERROR `rls_disabled_in_public` บน `price_global_cache`, `price_history`,
  `kk_captures` (ตารางระบบอื่นในโปรเจกต์เดียวกัน) — ถ้าเป็นของเจ้าของด้วย ให้เปิด RLS + policy

---

## 7) PWA — ติดตั้งบนมือถือ
- [ ] เปิด `https://<ชื่อ>.pages.dev` บนมือถือ → เมนู "เพิ่มไปหน้าจอโฮม" → เปิดเต็มจอเหมือนแอป
- [ ] `manifest.webmanifest` + `sw.js` โหลดผ่าน https (Cloudflare ให้ https อัตโนมัติ)
- [ ] service worker = **network-first** → แก้โค้ดแล้วรีเฟรชเห็นผลทันที · ออฟไลน์ยังเปิดได้
- [ ] (ภายหลัง) เปลี่ยนไอคอน placeholder ใน `icons/` เป็นโลโก้จริง

## 8) Checklist ก่อนส่งมอบ
- [ ] เปิด `.pages.dev` แล้ว login ด้วยรหัส 4 หลักได้ (เจ้าของ/หัวหน้า/พนักงาน)
- [ ] แถบสถานะบนสุดขึ้น **online** (ข้อมูลจาก Supabase จริง)
- [ ] กรอกนับ/สั่ง/รับ/รายรับ-จ่าย → refresh แล้วข้อมูลยังอยู่ (sync ขึ้นคลาวด์)
- [ ] ส่ง LINE (ถ้าตั้ง webhook) เข้ากลุ่มจริง · ส่งออก CSV/Excel/PDF + สำรอง/กู้คืน .json ได้
- [ ] PWA ติดหน้าจอได้ · advisor ผ่าน (เหลือเฉพาะ `rls_policy_always_true` ที่ตั้งใจ)

---

## หมายเหตุ
- **ไม่มี build / ไม่มี secret ใน frontend** → ปลอดภัยที่จะ push public ได้ (RLS กันข้อมูลฝั่ง DB)
- รอบถัดไป: ผูก PIN เข้า **Supabase Auth** จริง → เปิดแยกสิทธิ์ owner/staff ระดับ DB
  (เลิกพึ่ง client) + ชี้ data path ของ staff ไป view `rama9_item_master_staff` (ตัด `cost`)
