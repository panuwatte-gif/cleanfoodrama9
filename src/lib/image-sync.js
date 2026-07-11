// ============================================================
// lib/image-sync.js — เชื่อมรูปที่อัปในแอป (<image-slot>) ↔ Supabase Storage
//   ขาลง (โหลด): ดึงรูปที่เคยอัปจาก bucket "item-images" → ใส่กลับเข้า slot
//                (โชว์ได้ทุกเครื่อง / ทุกคน · รูปไม่หายเวลารีเฟรช)
//   ขาขึ้น (เซฟ): เมื่อผู้ใช้อัปรูปใหม่ (data: URL) → อัปขึ้น Storage
//                path = slots/<slotId>.webp (ผูกตาม slotId = id ของรายการ
//                → รายการเดียวกันใช้รูปเดียวกันทุกหน้า)
// ทำงานแบบ "เสริม" จาก component เดิม — ไม่แตะ logic ภายใน image-slot
// ============================================================

import { getClient, isConfigured } from "../api/supabaseClient.js";

const BUCKET = "item-images";
const PREFIX = "slots";

let started = false;
const lastUploaded = {};   // slotId -> data URL ที่อัปขึ้นคลาวด์ไปแล้ว (กันอัปซ้ำ)
const cloudSlots = new Set();   // slotId ที่ "มีไฟล์อยู่บนคลาวด์" (ไว้รู้ว่าต้องลบเมื่อผู้ใช้เอารูปออก)
const uploading = new Set();
const deleting = new Set();

const safeId = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, "_");

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

export async function initImageSync() {
  if (started) return;
  if (!isConfigured || !isConfigured()) return;
  if (!(window.kkSlots && window.kkSlots.set && window.kkSlots.all)) return;
  started = true;

  let sb;
  try { sb = await getClient(); } catch { started = false; return; }

  // ── ขาลง: โหลดรูปที่เคยอัปจากคลาวด์มาโชว์ ──
  try {
    const { data: files } = await sb.storage.from(BUCKET).list(PREFIX, { limit: 1000 });
    for (const f of files || []) {
      if (!f.name || !/\.webp$/i.test(f.name)) continue;
      const slotId = f.name.replace(/\.webp$/i, "");
      cloudSlots.add(slotId);   // มีไฟล์บนคลาวด์แล้ว → จำไว้เพื่อรองรับการลบ
      const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(`${PREFIX}/${f.name}`);
      if (pub && pub.publicUrl) {
        // cache-bust เบาๆ ด้วย updated_at เพื่อให้รูปใหม่เด้งทันทีหลังเปลี่ยน
        const v = f.updated_at ? `${pub.publicUrl}?v=${Date.parse(f.updated_at) || ""}` : pub.publicUrl;
        window.kkSlots.set(slotId, { u: v, s: 1, x: 0, y: 0 });
      }
    }
  } catch (_) { /* โหลดไม่ได้ก็ข้าม */ }

  // ── ขาขึ้น: เฝ้าการเปลี่ยนแปลง → อัปรูปใหม่ขึ้นคลาวด์ + ลบรูปที่ผู้ใช้เอาออก ──
  async function mirror() {
    const all = window.kkSlots.all();
    // (1) อัปรูปใหม่ (data: URL) ขึ้นคลาวด์
    for (const id of Object.keys(all)) {
      const v = all[id];
      const u = typeof v === "string" ? v : (v && v.u);
      if (!u || !/^data:image\//i.test(u)) continue;     // อัปเฉพาะรูปใหม่ (data: URL)
      if (uploading.has(id) || lastUploaded[id] === u) continue;
      uploading.add(id);
      try {
        const blob = await dataUrlToBlob(u);
        const path = `${PREFIX}/${safeId(id)}.webp`;
        const { error } = await sb.storage.from(BUCKET)
          .upload(path, blob, { upsert: true, contentType: "image/webp" });
        if (!error) { lastUploaded[id] = u; cloudSlots.add(id); }
      } catch (_) { /* ลองใหม่รอบหน้า */ }
      finally { uploading.delete(id); }
    }
    // (2) ลบไฟล์บนคลาวด์เมื่อผู้ใช้กด "ลบรูป" (slot ว่าง/หายไปแล้ว)
    //     ไม่งั้นรอบโหลดถัดไปจะดึงรูปเก่ากลับมาโชว์ → ลบไม่ติด
    for (const id of Array.from(cloudSlots)) {
      const raw = window.kkSlots.getRaw(id);
      const stillHas = raw && raw.u;
      if (stillHas || deleting.has(id)) continue;
      deleting.add(id);
      try {
        const path = `${PREFIX}/${safeId(id)}.webp`;
        const { error } = await sb.storage.from(BUCKET).remove([path]);
        if (!error) { cloudSlots.delete(id); delete lastUploaded[id]; }
      } catch (_) { /* ลองใหม่รอบหน้า */ }
      finally { deleting.delete(id); }
    }
  }

  let timer = null;
  function scheduleMirror() {
    if (timer) return;
    timer = setTimeout(() => { timer = null; mirror(); }, 800);
  }

  // เริ่มเฝ้าหลังประกาศตัวแปร/ฟังก์ชันครบแล้ว (กัน ReferenceError ตอนบูต)
  window.kkSlots.subscribe(scheduleMirror);
  scheduleMirror();
}
