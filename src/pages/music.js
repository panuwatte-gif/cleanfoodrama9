// ============================================================
// pages/music.js — เพลงร้าน (ใช้งานจริง)
//   • อัปโหลดไฟล์เสียง (mp3/wav/m4a/ogg) → Supabase Storage → เล่นได้ทุกเครื่อง
//   • เล่น/หยุด/เลื่อนเวลา ด้วย <audio> จริง · ความยาว/เวลาเดินจริง
//   • ตัดเพลง: เลือกช่วง → ฟังช่วงที่เลือก · บันทึกเป็นท่อนใหม่ (เล่นเฉพาะช่วง) ·
//     ดาวน์โหลดเป็น .wav ของช่วงที่ตัด (ตัดจริงด้วย Web Audio)
//   • Playlist · ลบเพลง
// ctx = { back, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag, emptyState } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { songsRows, saveSong, removeSong } from "../data/store.js";
import { uploadAudio, decodeAudio, bufferToMp3, fileToMp3, readDuration, fmtTime } from "../lib/audio.js";
import { PLAYLISTS } from "../data/seed.js";

const WAVE = [4, 9, 14, 8, 16, 11, 18, 7, 13, 17, 9, 15, 6, 12, 18, 10, 16, 8, 14, 19, 11, 7, 15, 9, 17, 12, 6, 13, 10, 16, 8, 14, 5, 11, 9, 6];

const must = { pl: "all", trim: null, trimSel: null, addPl: false, newName: "", busy: false, ctx: null, root: null, ui: null, pls: PLAYLISTS.map((p) => ({ ...p })) };

// ---- ตัวเล่นกลาง (คงอยู่ข้าม re-render) ----
const player = { audio: null, song: null, playing: false };
function audio() {
  if (!player.audio) {
    const a = new Audio();
    a.preload = "metadata";
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", () => { player.playing = true; if (must.root) paint(must.root); });
    a.addEventListener("pause", () => { player.playing = false; if (must.root) paint(must.root); });
    a.addEventListener("ended", () => { player.playing = false; if (must.root) paint(must.root); });
    player.audio = a;
  }
  return player.audio;
}
function clipSpan(s) { return s && s.trimEnd ? (s.trimEnd - (s.trimStart || 0)) : ((player.audio && player.audio.duration) || (s && s.dur) || 1); }
function clipRel() { const s = player.song, a = player.audio; if (!s || !a) return 0; return s.trimEnd ? (a.currentTime - (s.trimStart || 0)) : a.currentTime; }
function onTime() {
  const s = player.song, a = player.audio;
  if (!s || !a) return;
  if (s.trimEnd && a.currentTime >= s.trimEnd) { a.currentTime = s.trimStart || 0; }   // loop ภายในท่อน
  if (must.ui && must.ui.prog) {
    const span = clipSpan(s), rel = clipRel();
    must.ui.prog.style.width = Math.max(0, Math.min(100, rel / (span || 1) * 100)) + "%";
    if (must.ui.cur) must.ui.cur.textContent = fmtTime(rel);
  }
}
function playSong(song, toast) {
  if (!song.url) { toast && toast("เพลงตัวอย่าง — อัปโหลดไฟล์จริงเพื่อเล่น", "err"); return; }
  const a = audio();
  if (player.song && player.song.id === song.id) {
    if (a.paused) a.play(); else a.pause();
    return;
  }
  player.song = song;
  a.src = song.url;
  a.currentTime = song.trimStart || 0;
  a.play().catch(() => toast && toast("เล่นไฟล์นี้ไม่ได้", "err"));
}

export function musicScreen(ctx) {
  must.ctx = ctx;
  must.root = h("div", { class: "page-wrap", "data-screen-label": "music", style: { display: "flex", flexDirection: "column", flex: 1 } });
  must.root._sheets = h("div");
  paint(must.root);
  return must.root;
}

function paint(root) {
  const ctx = must.ctx;
  const songs = songsRows();
  const now = player.song ? songs.find((s) => s.id === player.song.id) || player.song : null;
  must.ui = {};

  // ── การ์ดกำลังเล่น (มี progress จริง) ──
  let nowCard;
  if (now) {
    const prog = h("span", { class: "mplay-fill" });
    const cur = h("span", { class: "tnum" }, fmtTime(clipRel()));
    must.ui.prog = prog; must.ui.cur = cur;
    const track = h("div", { class: "mplay-track", onClick: (e) => {
      const a = audio(); const r = track.getBoundingClientRect(); const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const s = player.song; a.currentTime = (s && s.trimStart || 0) + f * clipSpan(s);
    } }, prog);
    nowCard = h("div", { class: "card", style: { background: "radial-gradient(120% 140% at 0% 0%, rgba(37,99,235,0.10) 0%, transparent 55%), var(--surface)", borderColor: "#BFDBFE" } },
      h("div", { class: "rowflex" },
        h("button", { type: "button", class: "play-btn", "aria-label": player.playing ? "หยุด" : "เล่น", onClick: () => playSong(now, ctx.toast) }, pi(player.playing ? "pause" : "play", 20)),
        h("div", { style: { flex: 1, minWidth: 0 } },
          h("div", { style: { fontWeight: 700, fontSize: "14.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, now.name),
          h("div", { class: "tnum", style: { fontSize: "11.5px", color: "var(--muted)" } }, (now.fmt || "").toUpperCase() + (now.trimEnd ? " · ท่อนตัด" : "")),
        ),
        tag(player.playing ? "กำลังเล่น" : "พร้อมเล่น", { kind: player.playing ? "ok" : "fifo" }),
      ),
      track,
      h("div", { class: "split", style: { marginTop: "4px" } }, cur, h("span", { class: "tnum", style: { fontSize: "11px", color: "var(--faint)" } }, now.len || fmtTime(clipSpan(now)))),
    );
  } else {
    nowCard = h("div", { class: "card", style: { textAlign: "center", color: "var(--muted)", fontSize: "13px", padding: "18px" } },
      pi("music", 26), h("div", { style: { marginTop: "6px" } }, "ยังไม่ได้เลือกเพลง — แตะ ▶ ที่เพลงด้านล่าง"));
  }

  const plChips = h("div", { class: "chip-tabs" },
    [{ id: "all", name: "ทั้งหมด" }, ...must.pls].map((p) => h("button", { type: "button", class: "chip" + (must.pl === p.id ? " active" : ""), onClick: () => { must.pl = p.id; paint(root); } }, pi("music", 12), p.name)),
    h("button", { type: "button", class: "chip", style: { color: "var(--muted)" }, onClick: () => { must.addPl = true; must.newName = ""; renderSheets(root); } }, pi("plus", 12), " ใหม่"),
  );

  const shown = songs.filter((s) => must.pl === "all" || s.playlist === must.pl);
  const songList = shown.length
    ? h("div", { class: "card", style: { padding: "4px 14px" } },
        shown.map((s) => {
          const isCur = player.song && player.song.id === s.id;
          return h("div", { class: "rowflex", style: { padding: "10px 0", borderBottom: "1px solid var(--border-soft)" } },
            h("button", { type: "button", class: "mini-play" + (isCur && player.playing ? " on" : ""), "aria-label": "เล่นเพลงนี้", onClick: () => playSong(s, ctx.toast) }, pi(isCur && player.playing ? "pause" : "play", 13)),
            h("div", { style: { flex: 1, minWidth: 0 } },
              h("div", { style: { fontSize: "13.5px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, s.name),
              h("div", { class: "tnum", style: { fontSize: "11px", color: "var(--muted)" } }, (s.len || "") + (s.url ? "" : " · ตัวอย่าง") + (s.local ? " · ในเครื่องนี้" : "")),
            ),
            s.fmt && h("span", { class: "badge " + (s.fmt === "wav" ? "badge-fifo" : ""), style: { fontSize: "10px" } }, s.fmt.toUpperCase()),
            s.url && h("button", { type: "button", class: "mini-btn", "aria-label": "ตัดเพลง", onClick: () => openTrim(root, s) }, pi("scissors", 14)),
            h("button", { type: "button", class: "mini-btn", "aria-label": "ลบ", onClick: () => { if (player.song && player.song.id === s.id) { audio().pause(); player.song = null; } removeSong(s.id); ctx.toast("ลบเพลงแล้ว"); paint(root); } }, pi("trash", 14)),
          );
        }),
      )
    : emptyState({ compact: true, iconName: "music", title: "ยังไม่มีเพลงในรายการนี้", sub: "กดปุ่มด้านล่างเพื่ออัปโหลดไฟล์เสียง" });

  const fileInput = h("input", { type: "file", accept: "audio/*", style: { display: "none" } });
  fileInput.addEventListener("change", () => { const f = fileInput.files && fileInput.files[0]; if (f) ingest(f, root); fileInput.value = ""; });
  const upBtn = h("button", { type: "button", class: "btn btn-primary btn-block", disabled: must.busy, style: { opacity: must.busy ? .6 : 1 }, onClick: () => fileInput.click() },
    pi(must.busy ? "cloud" : "plus", 15), must.busy ? "กำลังแปลง MP3 / อัปโหลด…" : "อัปโหลดเพลง (mp3 / wav / m4a)");

  root.replaceChildren(
    hdr({ title: "เพลงร้าน", sub: "อัปโหลด · เล่น · ตัดเพลง — ใช้งานจริง", onBack: ctx.back, right: h("span", { class: "catic blue" }, pi("music", 18)) }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      nowCard,
      h("div", { class: "overline" }, "Playlist"),
      plChips,
      songList,
      fileInput,
      upBtn,
      note("ไฟล์เสียงเก็บบนคลาวด์ (Supabase) — เปิดแล้วเล่นได้ทุกเครื่อง · ตัดเพลงเพื่อทำเสียงเรียกเข้า/สปอตเปิด-ปิดร้านได้", { iconName: "music" }),
    ),
    root._sheets,
  );
  renderSheets(root);
}

// อัปโหลดไฟล์เสียง → แปลงเป็น MP3 ก่อนเก็บ (กิน Storage น้อยลง ~10 เท่าเทียบ wav) → Storage → metadata
async function ingest(file, root) {
  const ctx = must.ctx;
  must.busy = true; paint(root);
  try {
    const id = "sg-" + Date.now();
    const srcExt = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    let blob = file, fmt = "mp3", dur = 0;
    if (srcExt === "mp3") {
      // เป็น mp3 อยู่แล้ว — เก็บตรงๆ (เล็กอยู่แล้ว)
      dur = await readDuration(file);
    } else {
      // แปลงเป็น mp3 192 kbps ก่อนอัป
      try {
        const r = await fileToMp3(file, { kbps: 192 });
        blob = r.blob; dur = r.dur; fmt = "mp3";
      } catch (e) {
        // เบราว์เซอร์ถอด codec นี้ไม่ได้ → เก็บไฟล์เดิม (แอปไม่พัง)
        blob = file; fmt = srcExt || "mp3"; dur = await readDuration(file);
        ctx.toast("แปลง MP3 ไม่ได้ เก็บไฟล์เดิมแทน", "err");
      }
    }
    let url = null;
    try { url = await uploadAudio(blob, id, fmt); } catch (_) { url = null; }
    let local = false;
    if (!url) { url = URL.createObjectURL(blob); local = true; }   // ออฟไลน์ → เล่นได้ในเครื่องนี้
    const name = file.name.replace(/\.[^.]+$/, "");
    await saveSong({ id, name, fmt, dur, len: fmtTime(dur), url, local, fav: false, playlist: must.pl === "all" ? null : must.pl, at: new Date().toISOString() });
    ctx.toast(local ? "เพิ่มเพลงแล้ว (เครื่องนี้ — เชื่อมเน็ตเพื่ออัปคลาวด์)" : "อัปโหลด (MP3) ขึ้นคลาวด์แล้ว ✓");
  } catch (e) {
    ctx.toast("อัปโหลดไม่สำเร็จ: " + (e && e.message ? e.message : "ลองใหม่"), "err");
  } finally {
    must.busy = false; paint(root);
  }
}

function openTrim(root, song) {
  must.trim = song;
  must.trimSel = { start: 0, end: Math.max(1, Math.round(song.dur || song.trimEnd || 30)) };
  renderSheets(root);
}

function renderSheets(root) {
  const layer = root._sheets;
  layer.replaceChildren();
  const ctx = must.ctx;

  if (must.addPl) {
    const nameIn = h("input", { type: "text", class: "input", value: must.newName, placeholder: "เช่น ช่วงเย็นๆ · สุขุม", style: { fontSize: "15px" } });
    const add = () => { const n = nameIn.value.trim(); if (!n) return; const id = "pl-" + Date.now(); must.pls = [...must.pls, { id, name: n }]; must.pl = id; must.addPl = false; must.newName = ""; ctx.toast('สร้าง "' + n + '" แล้ว'); paint(root); };
    nameIn.addEventListener("input", () => { must.newName = nameIn.value; });
    nameIn.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
    setTimeout(() => nameIn.focus(), 30);
    layer.appendChild(sheet({ onClose: () => { must.addPl = false; renderSheets(root); }, children: h("div", null,
      h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 4px" } }, "สร้าง Playlist ใหม่"),
      h("p", { style: { fontSize: "12.5px", color: "var(--muted)", textAlign: "center", margin: "0 0 14px" } }, "ตั้งชื่อกลุ่มเพลง"),
      nameIn,
      h("div", { class: "rowflex", style: { gap: "10px", marginTop: "14px" } },
        h("button", { type: "button", class: "btn btn-block", onClick: () => { must.addPl = false; renderSheets(root); } }, "ยกเลิก"),
        h("button", { type: "button", class: "btn btn-primary btn-block", onClick: add }, pi("plus", 16), "สร้าง"),
      ),
    ) }));
  }

  if (must.trim) {
    const t = must.trim;
    const dur = Math.max(1, Math.round(t.dur || must.trimSel.end || 30));
    const sel = must.trimSel;
    const startLbl = h("span", { class: "badge badge-green tnum" }, "เริ่ม " + fmtTime(sel.start));
    const endLbl = h("span", { class: "badge badge-green tnum" }, "จบ " + fmtTime(sel.end));
    const lenLbl = h("span", { class: "tnum", style: { fontSize: "11.5px", color: "var(--muted)" } }, "เลือกไว้ " + fmtTime(Math.max(0, sel.end - sel.start)));
    const waveEl = h("div", { class: "wave trim" });
    const paintWave = () => waveEl.replaceChildren(...WAVE.map((hh, i) => { const sec = i / WAVE.length * dur; return h("i", { class: sec >= sel.start && sec <= sel.end ? "on" : "", style: { height: (hh + 4) + "px" } }); }));
    const sIn = h("input", { type: "range", class: "trim-range", min: 0, max: dur, step: 1, value: sel.start });
    const eIn = h("input", { type: "range", class: "trim-range", min: 0, max: dur, step: 1, value: sel.end });
    const sync = () => { startLbl.textContent = "เริ่ม " + fmtTime(sel.start); endLbl.textContent = "จบ " + fmtTime(sel.end); lenLbl.textContent = "เลือกไว้ " + fmtTime(Math.max(0, sel.end - sel.start)); paintWave(); };
    sIn.addEventListener("input", () => { sel.start = Math.min(Number(sIn.value), sel.end - 1); sIn.value = sel.start; sync(); });
    eIn.addEventListener("input", () => { sel.end = Math.max(Number(eIn.value), sel.start + 1); eIn.value = sel.end; sync(); });
    paintWave();

    const dlBtn = h("button", { type: "button", class: "btn btn-primary btn-block" }, pi("download", 15), "ดาวน์โหลด .mp3");
    dlBtn.addEventListener("click", async () => {
      dlBtn.disabled = true; dlBtn.replaceChildren(pi("cloud", 15), document.createTextNode("กำลังตัด MP3…"));
      try {
        const buf = await decodeAudio(t.url);
        const blob = await bufferToMp3(buf, { start: sel.start, end: sel.end, kbps: 192 });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = t.name.replace(/\s+/g, "_") + "_" + fmtTime(sel.start).replace(":", "") + "-" + fmtTime(sel.end).replace(":", "") + ".mp3";
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        ctx.toast("ดาวน์โหลดท่อนที่ตัด (.mp3) แล้ว");
      } catch (e) { ctx.toast("ตัดไฟล์ไม่สำเร็จ: " + (e && e.message ? e.message : "ลองใหม่"), "err"); }
      finally { dlBtn.disabled = false; dlBtn.replaceChildren(pi("download", 15), document.createTextNode("ดาวน์โหลด .mp3")); }
    });

    layer.appendChild(sheet({ onClose: () => { must.trim = null; renderSheets(root); }, children: h("div", null,
      h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 4px" } }, "ตัดเพลง"),
      h("p", { style: { fontSize: "12.5px", color: "var(--muted)", textAlign: "center", margin: "0 0 14px" } }, t.name),
      h("div", { class: "card", style: { padding: "14px 14px 12px" } },
        waveEl,
        h("div", { class: "split", style: { marginTop: "10px" } }, startLbl, lenLbl, endLbl),
        h("div", { class: "stack", style: { gap: "8px", marginTop: "12px" } },
          h("label", { class: "trim-row" }, h("span", null, "เริ่ม"), sIn),
          h("label", { class: "trim-row" }, h("span", null, "จบ"), eIn),
        ),
      ),
      note("ฟังช่วงที่เลือกก่อนได้ · บันทึกเป็นท่อนใหม่ (ตัดจริงเป็นไฟล์ MP3) หรือดาวน์โหลด .mp3 ของช่วงที่ตัด — ใช้ทำเสียงเรียกเข้า/สปอตเปิด-ปิดร้าน", { iconName: "music" }),
      h("div", { class: "rowflex", style: { gap: "10px", marginTop: "14px" } },
        h("button", { type: "button", class: "btn", onClick: () => playSong({ ...t, trimStart: sel.start, trimEnd: sel.end }, ctx.toast) }, pi("play", 15), "ฟัง"),
        h("button", { type: "button", class: "btn btn-block", onClick: async (e) => {
          const b = e.currentTarget; b.disabled = true; const old = [...b.childNodes]; b.replaceChildren(pi("cloud", 15), document.createTextNode("กำลังตัด MP3…"));
          const id = "sg-" + Date.now();
          try {
            const buf = await decodeAudio(t.url);
            const blob = await bufferToMp3(buf, { start: sel.start, end: sel.end, kbps: 192 });
            let url = null; try { url = await uploadAudio(blob, id, "mp3"); } catch (_) { url = null; }
            let local = false; if (!url) { url = URL.createObjectURL(blob); local = true; }
            await saveSong({ id, name: t.name + " (ตัด " + fmtTime(sel.start) + "–" + fmtTime(sel.end) + ")", fmt: "mp3", url, local, dur: sel.end - sel.start, len: fmtTime(sel.end - sel.start), playlist: t.playlist || null, at: new Date().toISOString() });
            must.trim = null; ctx.toast(local ? "บันทึกท่อน (MP3) แล้ว — เครื่องนี้" : "บันทึกท่อน (MP3) ขึ้นคลาวด์แล้ว ✓"); paint(root);
          } catch (err) { b.disabled = false; b.replaceChildren(...old); ctx.toast("บันทึกท่อนไม่สำเร็จ: " + (err && err.message ? err.message : "ลองใหม่"), "err"); }
        } }, pi("scissors", 15), "บันทึกท่อน (MP3)"),
      ),
      h("div", { style: { marginTop: "10px" } }, dlBtn),
    ) }));
  }
}
