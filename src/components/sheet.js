// ============================================================
// components/sheet.js — bottom sheet + Dash (ปุ่มกลาง = เกมส์) + toast
// พอร์ตจาก prototype2 Sheet / Toast / DashSheetBody
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "./icons.js";
import { mascot } from "./mascot.js";
import { note } from "./components.js";
import { CONFIG } from "../config/config.js";

// sheet({ onClose, children }) → wrapper (backdrop + panel) สำหรับ overlay layer
export function sheet({ onClose, children } = {}) {
  return h("div", { class: "sheet-wrap" },
    h("div", { class: "sheet-back", onClick: onClose }),
    h("div", { class: "sheet", role: "dialog" },
      h("div", { class: "sheet-grip" }),
      children,
    ),
  );
}

// toast(message, type) → node สำหรับ toast layer · type==="err" = แจ้งเตือนล้มเหลว
export function toastNode(message, type) {
  const err = type === "err";
  return h("div", { class: "toast" + (err ? " toast-err" : ""), style: err ? { borderColor: "var(--danger)", color: "var(--danger)" } : null },
    pi(err ? "alert" : "check", 16), h("span", null, message));
}

// ---- pinSheetBody — ยืนยันด้วยรหัสก่อน "ลบ" (กันลบพลาด) ----
// pinSheetBody({ title, sub, pin=CONFIG.DELETE_CONFIRM_PIN, onOk, onCancel })
// คีย์แพดตัวเลขในตัว · ครบ 4 หลักเช็คทันที · ผิด = สั่น + ล้าง
export function pinSheetBody({ title = "ยืนยันการลบ", sub = "ใส่รหัสเพื่อยืนยัน", pin = CONFIG.DELETE_CONFIRM_PIN, onOk, onCancel } = {}) {
  let val = "";
  const dots = h("div", { class: "pin-dots" });
  const errEl = h("div", { class: "pin-err" }, "รหัสไม่ถูกต้อง ลองใหม่");
  const wrap = h("div", { class: "pin-wrap" });

  function paintDots() {
    dots.replaceChildren(...[0, 1, 2, 3].map((i) => h("span", { class: "pin-dot" + (i < val.length ? " on" : "") })));
  }
  function press(d) {
    errEl.classList.remove("show");
    if (val.length >= 4) return;
    val += d; paintDots();
    if (val.length === 4) {
      setTimeout(() => {
        if (val === pin) { onOk && onOk(); }
        else { errEl.classList.add("show"); wrap.classList.add("shake"); setTimeout(() => wrap.classList.remove("shake"), 360); val = ""; paintDots(); }
      }, 120);
    }
  }
  function del() { errEl.classList.remove("show"); val = val.slice(0, -1); paintDots(); }

  const keypad = h("div", { class: "pin-pad" },
    ...["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => h("button", { type: "button", class: "pin-key", onClick: () => press(d) }, d)),
    h("span", null),
    h("button", { type: "button", class: "pin-key", onClick: () => press("0") }, "0"),
    h("button", { type: "button", class: "pin-key pin-del", "aria-label": "ลบ", onClick: del }, pi("arrowl", 18)),
  );
  paintDots();

  wrap.append(
    h("div", { class: "pin-ic" }, pi("lock", 24)),
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "8px 0 2px" } }, title),
    h("p", { style: { fontSize: "12.5px", color: "var(--muted)", textAlign: "center", margin: "0 0 12px" } }, sub),
    dots, errEl, keypad,
    h("button", { type: "button", class: "btn btn-block", style: { marginTop: "12px" }, onClick: () => onCancel && onCancel() }, "ยกเลิก"),
  );
  return wrap;
}

// ---- DashSheetBody (ปุ่มกลาง = เกมส์ผ่อนคลาย) ----
export function dashSheetBody({ toast } = {}) {
  const GAMES = [
    { t: "เลี้ยงแมว", s: "ให้อาหาร เล่นกับแมวร้าน", ic: "heart", grad: "linear-gradient(160deg,#16A34A,#0F7A35)", bg: "soft-green" },
    { t: "ดูดวง", s: "เปิดไพ่ ทำนายดวงวันนี้", ic: "sun", grad: "linear-gradient(160deg,#8B5CF6,#6D28D9)", bg: "soft-violet" },
    { t: "ตู้คีบ", s: "คีบตุ๊กตา ลุ้นรางวัล", ic: "box", grad: "linear-gradient(160deg,#3B82F6,#1D4ED8)", bg: "soft-blue" },
    { t: "Angry me", s: "ระบายอารมณ์ คลายเครียดสั้นๆ", ic: "flame", grad: "linear-gradient(160deg,#F59E0B,#B45309)", bg: "soft-amber" },
  ];
  return h("div", null,
    h("div", { style: { display: "flex", justifyContent: "center", marginBottom: "4px" } }, mascot(54)),
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "2px 0 4px" } }, "เกมส์"),
    h("p", { style: { fontSize: "12.5px", color: "var(--muted)", textAlign: "center", margin: "0 0 14px" } }, "พักเบรกสนุกๆ ระหว่างวัน · เล่นกับทีมได้"),
    h("div", { class: "game-grid" },
      GAMES.map((g) => h("button", {
        type: "button", class: "game-tile " + g.bg,
        onClick: () => toast && toast('เดโม — เปิดเกม "' + g.t + '" เร็วๆนี้'),
      },
        h("span", { class: "game-ic", style: { background: g.grad } }, pi(g.ic, 26)),
        h("span", { style: { fontSize: "13.5px", fontWeight: 800 } }, g.t),
        h("span", { style: { fontSize: "11px", color: "var(--muted)", lineHeight: 1.3 } }, g.s),
      )),
    ),
    h("div", { style: { marginTop: "12px" } }, note("เกมส์ไว้ผ่อนคลายช่วงพักเบรก — เพิ่มเกมใหม่ได้เรื่อยๆ", { iconName: "music" })),
  );
}
