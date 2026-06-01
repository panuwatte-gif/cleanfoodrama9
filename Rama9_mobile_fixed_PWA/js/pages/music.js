/* ============================================================
   pages/music.js — ฟังก์ชันใหม่: เพลงร้าน
   เปิดเพลง · ตัดท่อนทำเสียงเรียกเข้า · ลิงก์ Google Drive
   ============================================================ */
import { state } from '../state.js';
import { pageHead, esc, mockTag, icon } from '../components.js';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default {
  render() {
    const { playlist, ringtones } = state.db.music;
    const now = playlist.find((t) => t.current) || playlist[0];

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'เพลงร้าน', desc: 'เปิดเพลงในร้าน · ตัดท่อนเพลงทำเสียงเรียกเข้า/แจ้งออเดอร์ · ไฟล์เก็บบน Google Drive', actions: `<button class="btn btn-outline btn-sm">${icon('plus', 16)} เพิ่มเพลง (Drive)</button>` })}

      <div class="grid" style="grid-template-columns:1fr 1fr">
        <div class="card card-pad" style="background:linear-gradient(150deg,var(--basil-800),var(--basil-900));color:#fff">
          <div class="overline" style="color:var(--basil-400)">กำลังเล่น</div>
          <div style="display:flex;align-items:center;gap:18px;margin:16px 0">
            <div style="width:84px;height:84px;border-radius:var(--r-md);background:rgba(255,255,255,.12);display:grid;place-items:center;flex-shrink:0">${icon('music', 36, { color: 'var(--basil-400)' })}</div>
            <div><div class="ds-h3" style="color:#fff">${esc(now.title)}</div><div style="color:var(--basil-400)">${esc(now.artist)}</div></div>
          </div>
          <div style="height:5px;background:rgba(255,255,255,.18);border-radius:999px;overflow:hidden;margin-bottom:8px"><div style="width:38%;height:100%;background:var(--basil-400)"></div></div>
          <div class="row" style="justify-content:space-between;font-family:var(--font-mono);font-size:12px;color:var(--basil-400)"><span>1:10</span><span>${fmt(now.duration)}</span></div>
          <div class="row" style="justify-content:center;gap:18px;margin-top:16px">
            <button class="topbar-ico" style="background:rgba(255,255,255,.1);border:none;color:#fff">${icon('chevronLeft', 20)}</button>
            <button class="topbar-ico" style="width:54px;height:54px;background:var(--basil-500);border:none;color:#fff">${icon('play', 24)}</button>
            <button class="topbar-ico" style="background:rgba(255,255,255,.1);border:none;color:#fff">${icon('chevronRight', 20)}</button>
          </div>
        </div>

        <div class="card card-pad">
          <div class="section-title" style="margin-bottom:6px">เพลย์ลิสต์</div>
          <div class="section-sub">${mockTag('สตรีมจาก Google Drive (stub)')}</div>
          ${playlist.map((t) => `<div class="li">
            <div class="li-ico" style="background:${t.current ? 'var(--basil-600)' : 'var(--cream)'};color:${t.current ? '#fff' : 'var(--ink-3)'}">${icon(t.current ? 'play' : 'music', 16)}</div>
            <div class="li-main"><div class="li-t">${esc(t.title)}</div><div class="li-s">${esc(t.artist)}</div></div>
            <span class="data li-s">${fmt(t.duration)}</span>
            <button class="btn btn-ghost btn-sm" title="ตัดท่อน">${icon('scissors', 16)}</button>
          </div>`).join('')}
        </div>
      </div>

      <div class="card card-pad" style="margin-top:18px">
        <div class="row" style="justify-content:space-between;margin-bottom:14px">
          <div><div class="overline">เครื่องมือตัดเพลง</div><div class="section-title">เสียงเรียกเข้า / แจ้งออเดอร์</div></div>
          <button class="btn btn-outline btn-sm">${icon('scissors', 16)} ตัดท่อนใหม่</button>
        </div>
        <div style="background:var(--cream-100);border-radius:var(--r-md);padding:18px;margin-bottom:16px">
          <div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="li-s">${esc(now.title)}</span><span class="data li-s">เลือกช่วง 0:12 – 0:18</span></div>
          <div style="position:relative;height:46px;background:var(--cream-200);border-radius:8px;overflow:hidden">
            <div style="position:absolute;left:18%;width:14%;top:0;bottom:0;background:rgba(47,143,91,.25);border-left:2px solid var(--basil-600);border-right:2px solid var(--basil-600)"></div>
            ${Array.from({ length: 48 }).map((_, i) => `<span style="position:absolute;bottom:8px;left:${i * 2.1}%;width:2px;height:${10 + Math.abs(Math.sin(i)) * 24}px;background:var(--basil-400);border-radius:2px"></span>`).join('')}
          </div>
        </div>
        <div class="grid cols-2" style="gap:14px">
          ${ringtones.map((r) => `<div class="li" style="border:1px solid var(--line);border-radius:var(--r-md);padding:12px 14px">
            <div class="li-ico" style="background:var(--sage-100);color:var(--basil-700)">${icon('play', 16)}</div>
            <div class="li-main"><div class="li-t">${esc(r.title)}</div><div class="li-s">${r.start}s – ${r.end}s · จาก ${esc(state.db.music.playlist.find((p) => p.id === r.sourceId)?.title || '')}</div></div>
            <button class="btn btn-ghost btn-sm">${icon('download', 16)}</button>
          </div>`).join('')}
          <div class="li" style="border:1px dashed var(--line-2);border-radius:var(--r-md);padding:12px 14px;color:var(--ink-3);cursor:pointer;justify-content:center">${icon('plus', 18)} บันทึกท่อนที่ตัดเป็นเสียงเรียกเข้า</div>
        </div>
      </div>
    </div>`;
  },
};
