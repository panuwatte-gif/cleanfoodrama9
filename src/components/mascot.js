// ============================================================
// components/mascot.js — cut-out kawaii sprites (chick chef + sprout)
//   PNG sprites live in assets/mascots/ + assets/icons/ (cut from the
//   reference art sheets). Returns an <img> ready to drop into any page.
//   Back-compat: mascot(size, {mood, spark}) → the sprout pot mascot.
// ============================================================

const SPROUT = { happy: "sprout-happy", wink: "sprout-wink", smile: "sprout-smile" };

function imgEl(src, s, cls) {
  const el = document.createElement("img");
  el.src = src;
  el.width = s; el.height = s;
  el.alt = "";
  el.setAttribute("aria-hidden", "true");
  el.className = cls;
  el.style.width = s + "px";
  el.style.height = "auto";
  return el;
}

// สปราวต์ต้นกล้า (มาสคอตหลัก) — คงลายเซ็นเดิมไว้
export function mascot(s = 44, { mood = "happy", spark = false } = {}) {
  const name = SPROUT[mood] || SPROUT.happy;
  return imgEl("assets/mascots/" + name + ".png", s, "kk-mascot" + (spark ? " kk-float" : ""));
}

// ไก่เชฟ — pose: wave | clipboard | phone | sprout | calc | present | fridge
//        + อารมณ์: happy | cheer | eat | shy | sad
export function chick(s = 96, pose = "wave", { float = false } = {}) {
  const POSE = { wave: "chick-wave", clipboard: "chick-clipboard", phone: "chick-phone",
    sprout: "chick-sprout", calc: "chick-calc", present: "chick-present", fridge: "chick-fridge",
    happy: "chick-happy", cheer: "chick-cheer", eat: "chick-eat", shy: "chick-shy", sad: "chick-sad" };
  return imgEl("assets/mascots/" + (POSE[pose] || POSE.wave) + ".png", s, "kk-mascot" + (float ? " kk-float" : ""));
}

// cute icon sprite (assets/icons/<name>.png) — เช่น rice-berry, fridge, delivery
export function cic(name, s = 26) {
  return imgEl("assets/icons/" + name + ".png", s, "kk-cic");
}

// ก้อนเมฆหน้ายิ้ม — เก็บเป็น SVG เดิม (ใช้เป็นลายประดับเล็ก ๆ)
const NS = "http://www.w3.org/2000/svg";
export function cloudPal(s = 44) {
  const el = document.createElementNS(NS, "svg");
  el.setAttribute("viewBox", "0 0 48 48"); el.setAttribute("width", s); el.setAttribute("height", s);
  el.setAttribute("fill", "none"); el.setAttribute("aria-hidden", "true"); el.style.flex = "none";
  el.innerHTML = `
    <path d="M13.5 33.5a7.5 7.5 0 0 1-.8-15A8.6 8.6 0 0 1 30.4 16a6.6 6.6 0 0 1 2 13.4Z" fill="#FBFDFF"/>
    <path d="M31 13c2-1.6 4.3-1.7 6 .2-1.4 1.8-3.6 2.3-5.6 1.3" fill="#9FD37E"/>
    <circle cx="20" cy="26" r="1.7" fill="#5A4636"/><circle cx="28" cy="26" r="1.7" fill="#5A4636"/>
    <circle cx="15.6" cy="28" r="1.8" fill="#F6A6A6" opacity=".8"/><circle cx="32.4" cy="28" r="1.8" fill="#F6A6A6" opacity=".8"/>
    <path d="M21 28.5q3 2.2 6 0" stroke="#5A4636" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;
  return el;
}
