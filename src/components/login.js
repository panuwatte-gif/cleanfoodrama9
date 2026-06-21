// ============================================================
// components/login.js — เข้าระบบด้วยรหัสผ่าน 4 หลัก (ไม่มีการ์ดแบ่งระดับ)
// ระบบคัดแยกสิทธิ์จากรหัสผ่านเอง — ผู้ใช้กรอกแค่รหัส ไม่ต้องเลือกบทบาท
//   onSubmit(pin) → Promise<{ ok, user } | { ok:false, reason }>
//   ok → เปลือกแอปเข้าระบบให้ · ผิด/ถูกบล็อก → สั่น + ล้าง + ข้อความ
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "./icons.js";
import { mascot } from "./mascot.js";

export function loginScreen({ onSubmit } = {}) {
  let pin = "";
  let busy = false;
  const stage = h("div", { class: "login-stage page-wrap" });
  const dotsRow = h("div", { class: "pin-row" });
  const errEl = h("p", { class: "login-err" }, "");
  const padWrap = h("div", { class: "pad-grid" });

  function paintDots() {
    dotsRow.replaceChildren(...[0, 1, 2, 3].map((i) => h("span", { class: "pin-dot" + (pin.length > i ? " fill" : "") })));
  }

  async function submit() {
    busy = true;
    const res = onSubmit ? await onSubmit(pin) : { ok: false };
    if (res && res.ok) return; // เปลือกแอป re-render ออกจากหน้านี้เอง
    // ผิด → สั่น + ล้าง
    busy = false;
    errEl.textContent = res && res.reason === "blocked"
      ? "บัญชีนี้ถูกระงับการใช้งาน — ติดต่อเจ้าของร้าน"
      : "รหัสผ่านไม่ถูกต้อง ลองใหม่อีกครั้ง";
    errEl.classList.add("show");
    stage.classList.add("shake");
    setTimeout(() => stage.classList.remove("shake"), 380);
    pin = ""; paintDots();
  }

  function press(k) {
    if (busy) return;
    errEl.classList.remove("show");
    if (k === "del") { pin = pin.slice(0, -1); paintDots(); return; }
    if (pin.length >= 4) return;
    pin = pin + k; paintDots();
    if (pin.length === 4) setTimeout(submit, 160);
  }

  const padKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  padWrap.replaceChildren(
    ...padKeys.map((k) => h("button", { type: "button", class: "pad-key", onClick: () => press(k) }, k)),
    h("span", { class: "pad-key ghost" }),
    h("button", { type: "button", class: "pad-key", onClick: () => press("0") }, "0"),
    h("button", { type: "button", class: "pad-key", "aria-label": "ลบ", onClick: () => press("del") }, pi("arrowl", 22)),
  );
  paintDots();

  stage.replaceChildren(
    h("div", { class: "login-mark" }, mascot(54, { spark: true })),
    h("h1", { style: { font: "var(--h1)", letterSpacing: "var(--tracking-tight)", margin: 0, whiteSpace: "nowrap" } }, "โคตรคลีน · สต๊อก"),
    h("p", { style: { font: "var(--body-sm)", color: "var(--muted)", margin: "6px 0 26px", textAlign: "center" } }, "ระบบจัดการร้าน · กะเพราโคตรคลีน"),
    h("p", { style: { font: "var(--body-sm)", fontWeight: 600, color: "var(--ink)", margin: "0 0 14px" } }, "ใส่รหัสผ่านเพื่อเข้าระบบ"),
    dotsRow,
    errEl,
    padWrap,
  );
  return stage;
}
