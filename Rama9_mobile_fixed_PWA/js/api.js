/* ============================================================
   api.js — Stub สำหรับการเชื่อมต่อภายนอก
   ------------------------------------------------------------
   ตอนนี้ "จำลองสถานะส่งสำเร็จ" ทั้งหมด — ยังไม่ยิงจริง
   ฟังก์ชันถัดไปแค่เปลี่ยนเนื้อในให้ fetch จริง โดย signature คงเดิม
   ============================================================ */
import { state } from './state.js';

// หน่วงเวลาเล็กน้อยให้เหมือน network จริง
const fakeDelay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

/* ---- ฟังก์ชัน 5: อัปโหลดภาพออเดอร์ไป Google Drive (ผ่าน Apps Script) ---- */
export async function uploadOrderImage({ blob, orderNo, platform, storeId }) {
  await fakeDelay();
  const url = state.config.integrations.appsScriptUrl;
  console.info('[STUB] uploadOrderImage →', url || '(ยังไม่ตั้ง endpoint)', { orderNo, platform, storeId });
  // TODO(ฟังก์ชัน 5): fetch(url, { method:'POST', body: formData })
  return { ok: true, imageUrl: `https://drive.stub/${Date.now()}.jpg`, savedAt: new Date().toISOString() };
}

/* ---- บันทึก text ลง Supabase ---- */
export async function saveToSupabase(table, row) {
  await fakeDelay(400);
  console.info('[STUB] saveToSupabase →', table, row);
  // TODO: supabase.from(table).insert(row)
  return { ok: true, id: 'sb_' + Date.now() };
}

/* ---- แจ้งเตือน Email + Line OA (ฟังก์ชัน 2: หลังนับสต็อก) ---- */
export async function notifyChannels({ subject, message }) {
  await fakeDelay(300);
  const { notifyEmail, lineOaToken } = state.config.integrations;
  console.info('[STUB] notify →', { email: notifyEmail || '(ยังไม่ตั้ง)', line: !!lineOaToken, subject, message });
  // TODO: ยิง Email + Line Messaging API
  return { ok: true };
}

/* ---- บันทึกแถวลง Google Sheet (ฟังก์ชัน 5) ---- */
export async function appendToSheet(values) {
  await fakeDelay(300);
  console.info('[STUB] appendToSheet →', state.config.integrations.sheetId, values);
  return { ok: true };
}

/* ---- ฟังก์ชัน 5.3: ถ่ายภาพแปลภาษา → ไทย ---- */
export async function translateImage({ blob }) {
  await fakeDelay(700);
  console.info('[STUB] translateImage → OCR + แปลเป็นไทย');
  // TODO: ส่งภาพเข้า OCR + แปลภาษา (เช่น Google Vision + Translate)
  return { ok: true, sourceLang: 'en', text: 'Best before...', translated: 'ควรบริโภคก่อน…' };
}

/* ---- เพลงร้าน: โหลด/สตรีมไฟล์เพลงจาก Google Drive ---- */
export async function fetchDriveAudio(driveId) {
  await fakeDelay(400);
  console.info('[STUB] fetchDriveAudio →', driveId, state.config.integrations.driveFolderId);
  // TODO: ดึงไฟล์เสียงจาก Drive (หรือ stream URL)
  return { ok: true, url: `https://drive.stub/audio/${driveId}.mp3` };
}
