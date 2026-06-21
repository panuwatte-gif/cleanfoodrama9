// ============================================================
// pages/music.js — เพลงร้าน · พอร์ตจาก prototype2 MusicScreen
// Playlist · เล่น wav/mp3 (เดโม) · ตัดเพลง + ส่งออกเสียงเรียกเข้า
// ctx = { back, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { SONGS, PLAYLISTS } from "../data/seed.js";

const WAVE = [4, 9, 14, 8, 16, 11, 18, 7, 13, 17, 9, 15, 6, 12, 18, 10, 16, 8, 14, 19, 11, 7, 15, 9, 17, 12, 6, 13, 10, 16, 8, 14, 5, 11, 9, 6];

const must = {
  playing: SONGS[0] && SONGS[0].id, paused: false, pl: PLAYLISTS[0] && PLAYLISTS[0].id,
  trim: null, exFmt: "m4a (iPhone)", pls: PLAYLISTS.map((p) => ({ ...p })), addPl: false, newName: "", ctx: null,
};

export function musicScreen(ctx) {
  must.ctx = ctx;
  const root = h("div", { class: "page-wrap", "data-screen-label": "music", style: { display: "flex", flexDirection: "column", flex: 1 } });
  root._sheets = h("div");
  paint(root);
  return root;
}

function paint(root) {
  const ctx = must.ctx;
  const now = SONGS.find((s) => s.id === must.playing) || SONGS[0];

  const nowCard = h("div", { class: "card", style: { background: "radial-gradient(120% 140% at 0% 0%, rgba(37,99,235,0.10) 0%, transparent 55%), var(--surface)", borderColor: "#BFDBFE" } },
    h("div", { class: "rowflex" },
      h("button", { type: "button", class: "play-btn", "aria-label": must.paused ? "เล่น" : "หยุด", onClick: () => { must.paused = !must.paused; paint(root); } }, pi(must.paused ? "play" : "pause", 20)),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { style: { fontWeight: 700, fontSize: "14.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, now.name),
        h("div", { class: "tnum", style: { fontSize: "11.5px", color: "var(--muted)" } }, now.fmt.toUpperCase() + " · 1:24 / " + now.len),
      ),
      tag("กำลังเล่น", { kind: "ok" }),
    ),
    h("div", { class: "wave", style: { marginTop: "12px" } }, WAVE.map((hh, i) => h("i", { class: i < 14 ? "on" : "", style: { height: hh + "px" } }))),
  );

  const plChips = h("div", { class: "chip-tabs" },
    must.pls.map((p) => h("button", { type: "button", class: "chip" + (must.pl === p.id ? " active" : ""), onClick: () => { must.pl = p.id; paint(root); } }, pi("music", 12), p.name + " · " + p.count)),
    h("button", { type: "button", class: "chip", style: { color: "var(--muted)" }, onClick: () => { must.addPl = true; must.newName = ""; renderSheets(root); } }, pi("plus", 12), " ใหม่"),
  );

  const songList = h("div", { class: "card", style: { padding: "4px 14px" } },
    SONGS.map((s) => h("div", { class: "rowflex", style: { padding: "10px 0", borderBottom: "1px solid var(--border-soft)" } },
      h("button", { type: "button", class: "mini-play" + (must.playing === s.id && !must.paused ? " on" : ""), "aria-label": "เล่นเพลงนี้", onClick: () => { must.playing = s.id; must.paused = false; paint(root); } }, pi(must.playing === s.id && !must.paused ? "pause" : "play", 13)),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { style: { fontSize: "13.5px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, s.name),
        h("div", { class: "tnum", style: { fontSize: "11px", color: "var(--muted)" } }, s.len + (s.fav ? " · เพลงที่แต่งให้ลูกค้า" : "")),
      ),
      h("span", { class: "badge " + (s.fmt === "wav" ? "badge-fifo" : ""), style: { fontSize: "10px" } }, s.fmt.toUpperCase()),
      h("button", { type: "button", class: "mini-btn", "aria-label": "ส่งออก", onClick: () => ctx.toast('เดโม — ส่งออก "' + s.name + '" เป็นไฟล์เสียง') }, pi("download", 14)),
      h("button", { type: "button", class: "mini-btn", "aria-label": "ตัดเพลง", onClick: () => { must.trim = s; renderSheets(root); } }, pi("scissors", 14)),
    )),
  );

  root.replaceChildren(
    hdr({ title: "เพลงร้าน", sub: "Playlist · ตัดเพลง + ส่งออกเป็นเสียงเรียกเข้า", onBack: ctx.back, right: h("span", { class: "catic blue" }, pi("music", 18)) }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      nowCard,
      h("div", { class: "overline" }, "Playlist"),
      plChips,
      songList,
      h("button", { type: "button", class: "btn btn-block", onClick: () => ctx.toast("เดโม — อัปโหลดไฟล์ wav / mp3") }, pi("plus", 15), "เพิ่มเพลง (wav / mp3)"),
      note("เพลงเก็บในระบบ ใช้ได้ทุกร้าน · ตั้งเวลาเล่นอัตโนมัติ เปิดร้าน-ปิดร้าน ได้ในอนาคต", { iconName: "music" }),
    ),
    root._sheets,
  );
  renderSheets(root);
}

function renderSheets(root) {
  const layer = root._sheets;
  layer.replaceChildren();
  const ctx = must.ctx;

  if (must.addPl) {
    const nameIn = h("input", { type: "text", class: "input", value: must.newName, placeholder: "เช่น ช่วงเย็นๆ · สุขุม", style: { fontSize: "15px" } });
    const add = () => { const n = nameIn.value.trim(); if (!n) return; const id = "pl-" + Date.now(); must.pls = [...must.pls, { id, name: n, count: 0 }]; must.pl = id; must.addPl = false; must.newName = ""; ctx.toast('สร้าง "' + n + '" แล้ว'); paint(root); };
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
    const fmtChips = h("div", { class: "chip-tabs" },
      ["m4a (iPhone)", "mp3 (Android)", "wav"].map((f) => h("button", { type: "button", class: "chip" + (must.exFmt === f ? " active" : ""), onClick: () => { must.exFmt = f; renderSheets(root); } }, pi("music", 12), f)),
    );
    layer.appendChild(sheet({ onClose: () => { must.trim = null; renderSheets(root); }, children: h("div", null,
      h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 4px" } }, "ตัดเพลง"),
      h("p", { style: { fontSize: "12.5px", color: "var(--muted)", textAlign: "center", margin: "0 0 14px" } }, t.name),
      h("div", { class: "card", style: { padding: "14px 14px 10px" } },
        h("div", { class: "wave trim" }, WAVE.map((hh, i) => h("i", { class: i >= 8 && i <= 26 ? "on" : "", style: { height: (hh + 4) + "px" } }))),
        h("div", { class: "split", style: { marginTop: "10px" } },
          h("span", { class: "badge badge-green tnum" }, "เริ่ม 0:42"),
          h("span", { class: "tnum", style: { fontSize: "11.5px", color: "var(--muted)" } }, "เลือกไว้ 1:36"),
          h("span", { class: "badge badge-green tnum" }, "จบ 2:18"),
        ),
      ),
      h("div", { class: "overline", style: { margin: "14px 0 6px" } }, "ส่งออกเป็นไฟล์เสียงเรียกเข้า"),
      fmtChips,
      note("เสียงเรียกเข้าควรยาวไม่เกิน ~30 วินาที — ระบบตัดให้พอดี แล้วดาวน์โหลดไปตั้งในมือถือได้เลย", { iconName: "music" }),
      h("div", { class: "rowflex", style: { gap: "10px", marginTop: "14px" } },
        h("button", { type: "button", class: "btn", onClick: () => ctx.toast("เดโม — ฟังช่วงที่เลือก") }, pi("play", 15), "ฟัง"),
        h("button", { type: "button", class: "btn btn-block", onClick: () => { ctx.toast('บันทึก "' + t.name + ' (ตัด)" เป็นเพลงใหม่แล้ว'); must.trim = null; renderSheets(root); } }, pi("scissors", 15), "บันทึกท่อน"),
        h("button", { type: "button", class: "btn btn-primary btn-block", onClick: () => { ctx.toast('ส่งออก "' + t.name + '" เป็น ' + must.exFmt + " แล้ว"); must.trim = null; renderSheets(root); } }, pi("download", 15), "ดาวน์โหลด"),
      ),
    ) }));
  }
}
