// ============================================================
// lib/audio.js — ตัวช่วยเสียง (เพลงร้าน)
//   uploadAudio(blob, id, ext)  → อัปไฟล์ขึ้น Supabase Storage (bucket สาธารณะ) คืน public URL
//   decodeAudio(url)            → AudioBuffer (สำหรับตัด/ส่งออก)
//   bufferToWav(buf, s, e)      → Blob .wav ของช่วง [s,e] วินาที (ตัดเพลงจริง · ดาวน์โหลดได้)
// ใช้ client เดียวกับ data layer (api/supabaseClient) · ไม่มี secret
// ============================================================

import { getClient, isConfigured } from "../api/supabaseClient.js";
import { CONFIG } from "../config/config.js";

const BUCKET = CONFIG.AUDIO_BUCKET || "item-images";

// อัปไฟล์เสียง → คืน public URL (ออฟไลน์/ยังไม่ config → คืน null ให้ผู้เรียก fallback object URL)
export async function uploadAudio(blob, id, ext = "mp3") {
  if (!isConfigured || !isConfigured()) return null;
  const sb = await getClient();
  const path = `audio/${String(id).replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
  const { error } = await sb.storage.from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type || "audio/mpeg" });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return (data && data.publicUrl) || null;
}

// AudioContext เดี่ยว (lazy) — ใช้ตอน decode/ตัด
let _ac = null;
export function audioCtx() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  return _ac;
}

export async function decodeAudio(url) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return await audioCtx().decodeAudioData(buf);
}

// AudioBuffer → WAV (16-bit PCM) ของช่วง [start,end] วินาที
export function bufferToWav(buffer, start = 0, end = null) {
  const sr = buffer.sampleRate;
  const ch = buffer.numberOfChannels;
  const s0 = Math.max(0, Math.floor(start * sr));
  const s1 = end != null ? Math.min(buffer.length, Math.floor(end * sr)) : buffer.length;
  const frames = Math.max(0, s1 - s0);
  const dataLen = frames * ch * 2;
  const ab = new ArrayBuffer(44 + dataLen);
  const view = new DataView(ab);
  const wr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  wr(0, "RIFF"); view.setUint32(4, 36 + dataLen, true); wr(8, "WAVE");
  wr(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, ch, true); view.setUint32(24, sr, true);
  view.setUint32(28, sr * ch * 2, true); view.setUint16(32, ch * 2, true); view.setUint16(34, 16, true);
  wr(36, "data"); view.setUint32(40, dataLen, true);
  const chans = [];
  for (let c = 0; c < ch; c++) chans.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = s0; i < s1; i++) {
    for (let c = 0; c < ch; c++) {
      let v = Math.max(-1, Math.min(1, chans[c][i] || 0));
      view.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

// ---- MP3 encode (lamejs · pure-JS · ฝั่งเบราว์เซอร์) ----
// เราถอดเสียงเป็น PCM ด้วย Web Audio อยู่แล้ว (decode/ตัด) → encode PCM→MP3 ด้วย lamejs
// ตรงไปตรงมา · ไม่ต้องใช้ Web Worker / SharedArrayBuffer / ดาวน์โหลด core หนัก
// โหลด lamejs เป็น classic script (UMD) → global window.lamejs (เลี่ยงบั๊ก ESM "MPEGMode is not defined")
let _lameLoading = null;
function _loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error("โหลด lamejs ไม่ได้: " + src));
    document.head.appendChild(s);
  });
}
async function lame() {
  if (window.lamejs && window.lamejs.Mp3Encoder) return window.lamejs;
  if (!_lameLoading) _lameLoading = (async () => {
    const urls = [
      "https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js",
      "https://unpkg.com/lamejs@1.2.1/lame.min.js",
    ];
    let err = null;
    for (const u of urls) {
      try { await _loadScript(u); if (window.lamejs && window.lamejs.Mp3Encoder) return window.lamejs; }
      catch (e) { err = e; }
    }
    throw err || new Error("lamejs โหลดไม่สำเร็จ");
  })();
  return _lameLoading;
}

const _i16 = (f) => { const v = Math.max(-1, Math.min(1, f || 0)); return v < 0 ? v * 0x8000 : v * 0x7fff; };

// AudioBuffer (ช่วง [start,end] วินาที · ทั้งไฟล์ถ้าไม่ระบุ) → Blob .mp3 จริง
// kbps 128–192 ตามสเปก (ดีฟอลต์ 192) · คืน Blob audio/mpeg
export async function bufferToMp3(buffer, { start = 0, end = null, kbps = 192 } = {}) {
  const L = await lame();
  const sr = buffer.sampleRate;
  const ch = Math.min(2, buffer.numberOfChannels);
  const s0 = Math.max(0, Math.floor(start * sr));
  const s1 = end != null ? Math.min(buffer.length, Math.floor(end * sr)) : buffer.length;
  const left = buffer.getChannelData(0);
  const right = ch > 1 ? buffer.getChannelData(1) : null;
  const enc = new L.Mp3Encoder(ch, sr, kbps);
  const BLOCK = 1152;
  const lBuf = new Int16Array(BLOCK), rBuf = ch > 1 ? new Int16Array(BLOCK) : null;
  const chunks = [];
  for (let i = s0; i < s1; i += BLOCK) {
    const n = Math.min(BLOCK, s1 - i);
    for (let j = 0; j < n; j++) { lBuf[j] = _i16(left[i + j]); if (rBuf) rBuf[j] = _i16(right[i + j]); }
    const lSub = n === BLOCK ? lBuf : lBuf.subarray(0, n);
    const out = ch > 1 ? enc.encodeBuffer(lSub, (n === BLOCK ? rBuf : rBuf.subarray(0, n))) : enc.encodeBuffer(lSub);
    if (out.length) chunks.push(new Int8Array(out));
  }
  const tail = enc.flush();
  if (tail.length) chunks.push(new Int8Array(tail));
  return new Blob(chunks, { type: "audio/mpeg" });
}

// ไฟล์ที่อัปโหลด (wav/m4a/ogg/mp3) → ถอดด้วย Web Audio → encode เป็น .mp3 จริง
// คืน { blob, dur } · ถ้าถอดไม่ได้ (เบราว์เซอร์ไม่รองรับ codec) → throw ให้ผู้เรียก fallback
export async function fileToMp3(file, { kbps = 192 } = {}) {
  const ab = await file.arrayBuffer();
  const buffer = await audioCtx().decodeAudioData(ab.slice(0));
  const blob = await bufferToMp3(buffer, { kbps });
  return { blob, dur: buffer.duration };
}

// อ่านความยาว (วินาที) จากไฟล์ก่อนอัป — ผ่าน <audio> ชั่วคราว
export function readDuration(fileOrUrl) {
  return new Promise((resolve) => {
    const url = typeof fileOrUrl === "string" ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    const a = document.createElement("audio");
    a.preload = "metadata";
    a.onloadedmetadata = () => { const d = a.duration; if (typeof fileOrUrl !== "string") URL.revokeObjectURL(url); resolve(Number.isFinite(d) ? d : 0); };
    a.onerror = () => { if (typeof fileOrUrl !== "string") URL.revokeObjectURL(url); resolve(0); };
    a.src = url;
  });
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ":" + String(s).padStart(2, "0");
}
