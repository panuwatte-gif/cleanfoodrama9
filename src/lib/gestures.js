// ============================================================
// lib/gestures.js — ท่าทางทั้งแอป (ใช้ได้ทั้ง PC + มือถือ)
//   1) แถบแท็บแนวนอน (cat-tabs / sec-tabs / subtabs / md-tabs ฯลฯ) ที่กว้างเกินจอ:
//      • PC: ลากด้วยเมาส์ (click-drag) เลื่อนได้ + หมุนล้อเมาส์ = เลื่อนซ้าย-ขวา
//      • มือถือ: ปัดนิ้วได้อยู่แล้ว (native) — เพิ่มเงาบอกว่ายังเลื่อนได้
//   2) ปัดขอบจอ = back / forward (เหมือนมือถือ)
//      • ปัดจากขอบ "ซ้ายสุด" ไปขวา = back
//      • ปัดจากขอบ "ขวาสุด" ไปซ้าย = forward (กลับไปหน้าที่เพิ่ง back ออกมา)
// ============================================================

// แถบที่ถือว่าเป็น "แท็บเลื่อนแนวนอน"
const HSCROLL_SEL = ".cat-tabs, .sec-tabs, .subtabs, .md-tabs, .chip-tabs, .fc7-daystrip, .fc7-days, .kk-hscroll";

let nav = null;

export function initGestures(navApi) {
  nav = navApi || null;
  installDragScroll();
  installWheelToHorizontal();
  installScrollHints();
  installEdgeSwipe();
}

/* ---------- หา element แม่ที่เลื่อนแนวนอนได้ ---------- */
function hscrollAncestor(el) {
  while (el && el.nodeType === 1 && el !== document.body) {
    if (el.matches && el.matches(HSCROLL_SEL) && el.scrollWidth - el.clientWidth > 4) return el;
    el = el.parentElement;
  }
  return null;
}
function scrollableXAncestor(el) {
  while (el && el.nodeType === 1 && el !== document.body) {
    if (el.scrollWidth - el.clientWidth > 4) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === "auto" || ox === "scroll") return el;
    }
    el = el.parentElement;
  }
  return null;
}

/* ---------- 1a) ลากด้วยเมาส์เพื่อเลื่อนแถบแท็บ (PC) ---------- */
function installDragScroll() {
  let target = null, startX = 0, startLeft = 0, dragging = false, pid = null;

  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;          // มือถือเลื่อนเองได้ (native)
    if (e.button !== 0) return;
    // ไม่ขโมยการลากจาก input/select/slider
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea" || e.target.isContentEditable) return;
    const sc = scrollableXAncestor(e.target);
    if (!sc) return;
    target = sc; startX = e.clientX; startLeft = sc.scrollLeft; dragging = false; pid = e.pointerId;
  });

  document.addEventListener("pointermove", (e) => {
    if (!target || e.pointerId !== pid) return;
    const dx = e.clientX - startX;
    if (!dragging && Math.abs(dx) > 6) {
      dragging = true;
      target.classList.add("kk-dragging");
      try { target.setPointerCapture(pid); } catch (_) {}
    }
    if (dragging) {
      target.scrollLeft = startLeft - dx;
      markStrip(target);
      e.preventDefault();
    }
  });

  const end = () => {
    if (!target) return;
    if (dragging) {
      const t = target;
      t.classList.remove("kk-dragging");
      // กดค้างลากแล้วอย่าให้กลายเป็นคลิกเลือกชิป
      const swallow = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
      t.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => t.removeEventListener("click", swallow, true), 60);
    }
    target = null; dragging = false; pid = null;
  };
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);
}

/* ---------- 1b) ล้อเมาส์แนวตั้ง → เลื่อนแถบแท็บแนวนอน ---------- */
function installWheelToHorizontal() {
  document.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // ปัดแนวนอนอยู่แล้ว
    const sc = hscrollAncestor(e.target);
    if (!sc) return;
    const atStart = sc.scrollLeft <= 0;
    const atEnd = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 1;
    if ((e.deltaY < 0 && !atStart) || (e.deltaY > 0 && !atEnd)) {
      sc.scrollLeft += e.deltaY;
      markStrip(sc);
      e.preventDefault();
    }
  }, { passive: false });
}

/* ---------- 1c) เงาขอบบอกว่ายังเลื่อนได้ (ซ้าย/ขวา) ---------- */
function markStrip(el) {
  if (!el) return;
  const canL = el.scrollLeft > 4;
  const canR = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
  el.classList.toggle("kk-fade-l", canL);
  el.classList.toggle("kk-fade-r", canR);
}
function refreshHints() {
  document.querySelectorAll(HSCROLL_SEL).forEach((el) => {
    if (el.scrollWidth - el.clientWidth > 4) markStrip(el);
    else { el.classList.remove("kk-fade-l", "kk-fade-r"); }
  });
}
function installScrollHints() {
  // อัปเดตเงาเมื่อแถบถูกเลื่อน (delegated, capture)
  document.addEventListener("scroll", (e) => {
    const el = e.target;
    if (el && el.nodeType === 1 && el.matches && el.matches(HSCROLL_SEL)) markStrip(el);
  }, true);
  window.addEventListener("resize", refreshHints);
  // เปิดให้ app เรียกหลังรีเรนเดอร์
  window.__kkRefreshHints = () => requestAnimationFrame(refreshHints);
  requestAnimationFrame(refreshHints);
}

/* ---------- 2) ปัดขอบจอ = back / forward ---------- */
function installEdgeSwipe() {
  const EDGE = 28;      // โซนขอบจอ (px)
  const TRIGGER = 70;   // ระยะปัดขั้นต่ำที่จะสั่ง back/forward
  let active = false, dir = null, sx = 0, sy = 0, sid = null, decided = false, hint = null;

  const makeHint = () => {
    const el = document.createElement("div");
    el.className = "kk-edge-hint";
    el.innerHTML = '<span class="kk-edge-arrow"></span>';
    document.body.appendChild(el);
    return el;
  };

  document.addEventListener("pointerdown", (e) => {
    if (!nav) return;
    if (active) return;
    const w = window.innerWidth;
    if (e.clientX <= EDGE && nav.canBack && nav.canBack()) { active = true; dir = "back"; }
    else if (e.clientX >= w - EDGE && nav.canForward && nav.canForward()) { active = true; dir = "fwd"; }
    else return;
    sx = e.clientX; sy = e.clientY; sid = e.pointerId; decided = false;
  });

  document.addEventListener("pointermove", (e) => {
    if (!active || e.pointerId !== sid) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!decided) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 14) { cancel(); return; } // เลื่อนแนวตั้ง = ยกเลิก
      if (Math.abs(dx) < 12) return;
      decided = true;
      hint = hint || makeHint();
      hint.classList.add("on", dir === "back" ? "left" : "right");
    }
    if (decided && hint) {
      const prog = Math.min(1, Math.abs(dir === "back" ? dx : -dx) / 120);
      const off = (dir === "back" ? Math.max(0, dx) : Math.min(0, dx)) * 0.5;
      hint.style.setProperty("--p", prog.toFixed(3));
      hint.style.transform = "translateX(" + off + "px)";
    }
  });

  const finish = (e) => {
    if (!active) return;
    const dx = (e && e.pointerId === sid) ? e.clientX - sx : 0;
    const go = dir === "back" ? dx > TRIGGER : -dx > TRIGGER;
    cleanup();
    if (go) { if (dir === "back") nav.back(); else nav.forward(); }
  };
  const cancel = () => cleanup();
  function cleanup() {
    if (hint) { hint.classList.remove("on", "left", "right"); const hh = hint; hint = null; setTimeout(() => hh.remove(), 180); }
    active = false; dir = null; sid = null; decided = false;
  }
  document.addEventListener("pointerup", finish);
  document.addEventListener("pointercancel", cancel);
}
