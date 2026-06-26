// ============================================================
// components/components.js — UI atoms (vanilla) ตรงกับ prototype2/ui.jsx
// ใช้ class เดิมจาก proto.css/cookbook → หน้าตาตรงต้นแบบ
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "./icons.js";
import { mascot } from "./mascot.js";
import {
  itemById, catById, subById, itemIcon, itemTint, catEmoji, itemEmoji,
  emojiByIcon, unitOf, unitOptions, sectionsFor,
} from "../utils/formulas.js";
import { cats as allCats } from "../data/store.js";

/* สลับสไตล์ไอคอน: emoji (ดีฟอลต์) / line — ตั้งจาก Tweaks ผ่าน window.__kkIcons */
export function cuteIcons() { return window.__kkIcons !== "line"; }

/* รูปที่อัปโหลดเอง (image-slot) — คืน url หรือ null */
function slotPhoto(id) { return window.kkSlots ? window.kkSlots.get(id) : null; }

/* ---------- ไอคอน + อิโมจิ ---------- */
// emo(name, {e, s}) → span อิโมจิ ถ้าโหมดน่ารัก ไม่งั้นไอคอนเส้น
export function emo(name, { e, s = 18 } = {}) {
  const glyph = e || (cuteIcons() ? emojiByIcon(name) : null);
  if (glyph) return h("span", { class: "emo-g", "aria-hidden": "true" }, glyph);
  return pi(name, s);
}

export function catIc(catId, { sm, fill } = {}) {
  const c = catById(catId);
  const photo = slotPhoto("icon-cat-" + catId);
  if (photo) return h("span", { class: "catic photo" + (sm ? " sm" : "") }, h("img", { src: photo, alt: "" }));
  const glyph = !fill && cuteIcons() && catEmoji(catId);
  if (glyph) return h("span", { class: "catic emo " + c.tint + (sm ? " sm" : "") }, h("span", { class: "emo-g" }, glyph));
  return h("span", { class: "catic " + (fill ? "fill" : c.tint) + (sm ? " sm" : "") }, pi(c.icon, sm ? 15 : 18));
}

export function itemIc(item, { sm = true } = {}) {
  const it = typeof item === "string" ? itemById(item) : item;
  const photo = slotPhoto("icon-" + (it && it.id));
  if (photo) return h("span", { class: "catic photo" + (sm ? " sm" : "") }, h("img", { src: photo, alt: "" }));
  const glyph = cuteIcons() && itemEmoji(it);
  if (glyph) return h("span", { class: "catic emo " + itemTint(it) + (sm ? " sm" : "") }, h("span", { class: "emo-g" }, glyph));
  return h("span", { class: "catic " + itemTint(it) + (sm ? " sm" : "") }, pi(itemIcon(it), sm ? 15 : 18));
}

/* ---------- badge / tag ---------- */
export function tag(text, { kind = "", iconName } = {}) {
  const cls = { ok: "badge-green", warn: "badge-yellow", dgr: "badge-red", fifo: "badge-fifo" }[kind] || "";
  return h("span", { class: "badge " + cls }, iconName && pi(iconName, 11), text);
}

/* ---------- note ---------- */
export function note(content, { amber = false, iconName = "leaf" } = {}) {
  return h("div", { class: "note" + (amber ? " amber" : "") },
    pi(amber ? "alert" : iconName, 15),
    h("div", null, content),
  );
}

/* ---------- toggle ---------- */
export function toggle(on, onChange) {
  return h("button", {
    type: "button", class: "tgl" + (on ? " on" : ""), "aria-pressed": on,
    onClick: () => onChange && onChange(!on),
  }, h("i", null));
}

/* ---------- segmented ---------- */
// seg({ value, options:[{v,t,ic}], onChange, grow })
export function seg({ value, options = [], onChange, grow } = {}) {
  return h("div", { class: "seg" + (grow ? " grow" : "") },
    options.map((o) => h("button", {
      type: "button", class: value === o.v ? "on" : "",
      onClick: () => onChange && onChange(o.v),
    }, o.ic && pi(o.ic, 14), o.t)),
  );
}

/* ---------- chip cat-tabs ---------- */
export function catTabs({ cats = allCats(), value, onChange, showAll, wrap } = {}) {
  return h("div", { class: "chip-tabs cat-tabs" + (wrap ? " cat-tabs-wrap" : "") },
    showAll && h("button", { type: "button", class: "chip" + (value === "all" ? " active" : ""), onClick: () => onChange("all") }, "ทั้งหมด"),
    cats.map((c) => h("button", { type: "button", class: "chip" + (value === c.id ? " active" : ""), onClick: () => onChange(c.id) },
      emo(c.icon, { s: 13 }), c.name)),
  );
}

/* ---------- section tabs (ไอคอนบน + ชื่อล่าง) · มีแท็บแม่ "อาหาร" ครอบ เนื้อ/หมู/เป็ด/ไก่/ปลา ---------- */
export function sectionTabs({ cats = allCats(), value, onChange, allLabel = "เมนูทั้งหมด" } = {}) {
  const proteinCat = cats.find((c) => c.id === "protein");
  const proteinSubIds = proteinCat && proteinCat.subs ? proteinCat.subs.map((s) => s.id) : [];
  const allSecs = sectionsFor(cats);
  const proteinSecs = allSecs.filter((s) => proteinSubIds.includes(s.id));
  const otherSecs = allSecs.filter((s) => !proteinSubIds.includes(s.id));
  const inFood = value === "protein" || proteinSubIds.includes(value);
  const secChip = (active, onClick, ico, label, tint) => h("button", {
    type: "button", class: "chip sec-chip" + (tint ? " tint-" + tint : "") + (active ? " active" : ""), onClick,
  }, h("span", { class: "sec-chip-ic" }, ico), label);

  return h("div", { class: "menutabs" },
    h("div", { class: "chip-tabs cat-tabs sec-tabs" },
      secChip(value === "all", () => onChange("all"), pi("grid", 16), allLabel),
      proteinSecs.length ? secChip(inFood, () => onChange("protein"), emo(proteinCat.icon, { s: 16 }), "อาหาร", "green") : null,
      otherSecs.map((s) => secChip(value === s.id, () => onChange(s.id), emo(s.icon, { s: 16 }), s.name, s.tint)),
    ),
    inFood && proteinSecs.length > 0 && h("div", { class: "chip-tabs subtabs" },
      h("button", { type: "button", class: "chip" + (value === "protein" ? " active" : ""), onClick: () => onChange("protein") }, "ทั้งหมด"),
      proteinSecs.map((s) => h("button", { type: "button", class: "chip" + (value === s.id ? " active" : ""), onClick: () => onChange(s.id) },
        emo(s.icon, { s: 13 }), s.name)),
    ),
  );
}

/* ---------- menu tabs 2 ชั้น ---------- */
import { SECTION_TINT } from "../data/seed.js";
import { items as allItems } from "../data/store.js";
export function menuTabs({ cats = allCats(), top, sub, onTop, onSub } = {}) {
  const proteinCat = cats.find((c) => c.id === "protein");
  const proteinSubs = proteinCat && proteinCat.subs
    ? proteinCat.subs.filter((sb) => allItems().some((i) => i.cat === "protein" && i.sub === sb.id && i.isActive !== false))
    : [];
  const others = cats.filter((c) => c.id !== "protein");
  const inFood = top === "protein";
  return h("div", { class: "menutabs" },
    h("div", { class: "chip-tabs cat-tabs sec-tabs" },
      h("button", { type: "button", class: "chip sec-chip" + (top === "all" ? " active" : ""), onClick: () => onTop("all") },
        h("span", { class: "sec-chip-ic" }, pi("grid", 16)), "เมนูทั้งหมด"),
      proteinSubs.length ? h("button", {
        type: "button", class: "chip sec-chip tint-green" + (inFood ? " active" : ""), onClick: () => onTop("protein"),
      }, h("span", { class: "sec-chip-ic" }, emo(proteinCat.icon, { s: 16 })), "อาหาร") : null,
      others.map((c) => h("button", {
        type: "button", class: "chip sec-chip tint-" + (SECTION_TINT[c.id] || c.tint) + (top === c.id ? " active" : ""), onClick: () => onTop(c.id),
      }, h("span", { class: "sec-chip-ic" }, emo(c.icon, { s: 16 })), c.name)),
    ),
    inFood && proteinSubs.length > 0 && h("div", { class: "chip-tabs subtabs" },
      h("button", { type: "button", class: "chip" + (sub === "all" ? " active" : ""), onClick: () => onSub("all") }, "ทั้งหมด"),
      proteinSubs.map((sb) => h("button", { type: "button", class: "chip" + (sub === sb.id ? " active" : ""), onClick: () => onSub(sb.id) },
        emo(sb.icon, { s: 13 }), sb.name)),
    ),
  );
}

/* ---------- search box ---------- */
export function searchBox({ value, onChange, placeholder } = {}) {
  const input = h("input", {
    type: "text", class: "input", value, placeholder: placeholder || "ค้นหา…",
    style: { border: 0, padding: "10px 0", background: "transparent", flex: 1, boxShadow: "none" },
    onInput: (e) => onChange && onChange(e.target.value),
  });
  return h("div", { class: "rowflex", style: { gap: "8px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "0 12px" } },
    (() => { const s = pi("search", 16); Object.assign(s.style, { color: "var(--faint)", flex: "none" }); return s; })(),
    input,
    value && h("button", { type: "button", "aria-label": "ล้างคำค้น", style: { border: 0, background: "transparent", color: "var(--faint)", padding: 0, display: "grid" }, onClick: () => onChange("") }, pi("x", 14)),
  );
}

/* ---------- stepper −[ค่า]+ ---------- */
export function stepper({ value, onChange, step = 1 } = {}) {
  const num = parseFloat(value || 0) || 0;
  const set = (n) => { n = Math.max(0, Math.round(n * 100) / 100); onChange(n === 0 ? "" : String(n)); };
  const input = h("input", {
    type: "text", inputMode: "decimal", class: "sv", value, placeholder: "0",
    onInput: (e) => onChange(e.target.value.replace(/[^0-9.]/g, "")),
  });
  return h("div", { class: "stepper" + (value ? " filled" : "") },
    h("button", { type: "button", class: "st-minus", "aria-label": "ลด", onClick: () => set(num - step) }, pi("minus", 15)),
    input,
    h("button", { type: "button", class: "st-plus", "aria-label": "เพิ่ม", onClick: () => set(num + step) }, pi("plus", 15)),
  );
}

/* ---------- qty input ---------- */
export function qtyInput({ value, onChange, wide, tone, placeholder = "0" } = {}) {
  return h("input", {
    type: "text", inputMode: "decimal",
    class: "qty-in" + (wide ? " wide" : "") + (tone ? " " + tone : "") + (value ? " filled" : ""),
    value, placeholder,
    onInput: (e) => onChange(e.target.value.replace(/[^0-9.]/g, "")),
  });
}

/* ---------- mini stepper (ในตารางกรอก) ---------- */
export function miniStep({ value, onChange, tone, step = 1, readOnly } = {}) {
  const num = parseFloat(value || 0) || 0;
  const set = (n) => { n = Math.max(0, Math.round(n * 100) / 100); onChange(n === 0 ? "" : String(n)); };
  if (readOnly) {
    return h("div", { class: "ministep ro" + (tone ? " " + tone : "") + (value ? " filled" : "") }, h("span", { class: "ms-v" }, value || "0"));
  }
  const input = h("input", {
    type: "text", inputMode: "decimal", class: "ms-v", value, placeholder: "0",
    onInput: (e) => onChange(e.target.value.replace(/[^0-9.]/g, "")),
  });
  return h("div", { class: "ministep" + (tone ? " " + tone : "") + (value ? " filled" : "") },
    h("button", { type: "button", class: "ms-minus", "aria-label": "ลด", onClick: () => set(num - step) }, pi("minus", 13)),
    input,
    h("button", { type: "button", class: "ms-plus", "aria-label": "เพิ่ม", onClick: () => set(num + step) }, pi("plus", 13)),
  );
}

/* ---------- unit select ---------- */
export function unitSelect({ it, value, onChange } = {}) {
  const sel = h("select", { "aria-label": "หน่วยนับ", onChange: (e) => onChange(e.target.value) },
    unitOptions(it).map((u) => h("option", { value: u, selected: u === (value || unitOf(it)) }, u)));
  return h("span", { class: "unit-sel" }, sel, pi("chevd", 14));
}

/* ---------- meter ---------- */
export function meter(pct, tone) {
  return h("div", { class: "meter" }, h("i", { class: tone || "", style: { width: pct + "%" } }));
}

/* ---------- date bar (ดู/แก้ย้อนหลัง) — onChange(newDay) ---------- */
import { TODAY } from "../data/seed.js";
export function dateBar({ day, onChange } = {}) {
  const isToday = day === TODAY.d;
  const prev = h("button", { type: "button", class: "hdr-icon", style: { width: "32px", height: "32px" }, "aria-label": "วันก่อนหน้า", onClick: () => onChange(Math.max(1, day - 1)) }, pi("chevl", 16));
  const calIc = pi("cal", 14); calIc.style.color = "var(--muted)";
  const next = h("button", { type: "button", class: "hdr-icon", disabled: isToday, style: { width: "32px", height: "32px", opacity: isToday ? .35 : 1 }, "aria-label": "วันถัดไป", onClick: () => onChange(Math.min(TODAY.d, day + 1)) }, pi("chev", 16));
  return h("div", { class: "datebar" },
    prev,
    h("div", { style: { flex: 1, textAlign: "center" } },
      h("div", { class: "rowflex", style: { justifyContent: "center", gap: "7px" } },
        calIc,
        h("span", { style: { fontWeight: 700, fontSize: "14px" } }, (isToday ? "วันนี้ · " + TODAY.dow + " " : "") + day + " มิ.ย."),
        !isToday && tag("ย้อนหลัง", { kind: "warn", iconName: "history" }),
      ),
    ),
    next,
  );
}

/* ---------- date bar (ปฏิทินข้ามเดือน · ISO) — onChange(newIso) ----------
   มีปุ่ม ‹ › เลื่อนทีละวัน + แตะวันที่/ปฏิทินไอคอน → เปิดปฏิทินเลือกวันไหนก็ได้ (ย้อนหลังหลายเดือน) */
import { todayIso as _todayIso, parseIso as _parseIso, addDaysIso as _addDays, isFutureIso as _isFuture, thaiLong as _thaiLong } from "../utils/dateutil.js";
export function dateBarFull({ iso, onChange } = {}) {
  iso = iso || _todayIso();
  const today = _todayIso();
  const isToday = iso === today;
  const nextIso = _addDays(iso, 1);
  const nextDisabled = _isFuture(nextIso); // ห้ามเลยวันนี้ (กรอกอนาคตไม่ได้)

  // ปฏิทินจริง (native) — ซ่อนไว้ เปิดด้วยปุ่มวันที่/ไอคอน
  const picker = h("input", { type: "date", value: iso, max: today, style: { position: "absolute", width: "1px", height: "1px", opacity: 0, pointerEvents: "none", left: "50%", bottom: 0 } });
  picker.addEventListener("change", () => { if (picker.value && picker.value <= today) onChange(picker.value); });
  const openCal = () => { try { picker.showPicker(); } catch (e) { picker.focus(); picker.click(); } };

  const calIc = pi("cal", 15); calIc.style.color = "var(--primary)";
  const prev = h("button", { type: "button", class: "hdr-icon", style: { width: "32px", height: "32px" }, "aria-label": "วันก่อนหน้า", onClick: () => onChange(_addDays(iso, -1)) }, pi("chevl", 16));
  const next = h("button", { type: "button", class: "hdr-icon", disabled: nextDisabled, style: { width: "32px", height: "32px", opacity: nextDisabled ? .35 : 1 }, "aria-label": "วันถัดไป", onClick: () => { if (!nextDisabled) onChange(nextIso); } }, pi("chev", 16));

  return h("div", { class: "datebar", style: { position: "relative" } },
    prev,
    h("button", { type: "button", class: "datebar-pick list-press", style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", background: "transparent", border: 0, cursor: "pointer", padding: "4px 0" }, onClick: openCal },
      calIc,
      h("span", { style: { fontWeight: 700, fontSize: "14px" } }, (isToday ? "วันนี้ · " : "") + _thaiLong(iso)),
      !isToday && tag("ย้อนหลัง", { kind: "warn", iconName: "history" }),
      (() => { const c = pi("chevd", 13); c.style.color = "var(--faint)"; return c; })(),
    ),
    next,
    picker,
  );
}

/* ---------- header ---------- */
export function hdr({ title, sub, onBack, right } = {}) {
  return h("header", { class: "hdr" },
    onBack && h("button", { type: "button", class: "hdr-icon", "aria-label": "ย้อนกลับ", onClick: onBack }, pi("arrowl", 18)),
    h("div", { class: "hdr-titles" },
      h("h1", { class: "hdr-title", style: { fontSize: (onBack ? 19 : 22) + "px" } }, title),
      sub && h("p", { class: "hdr-sub" }, sub),
    ),
    right,
  );
}

/* ---------- empty state ---------- */
export function emptyState({ iconName = "leaf", title, sub, action, compact } = {}) {
  return h("div", { class: "empty" + (compact ? " compact" : "") },
    h("span", { class: "empty-art" }, compact ? pi(iconName, 24) : mascot(60, { spark: true })),
    h("div", { class: "empty-title" }, title),
    sub && h("div", { class: "empty-sub" }, sub),
    action,
  );
}

/* ---------- icon picker (เปลี่ยนรูปหมวด/รายการ — อัปรูปเอง หรือเลือกไอคอน) ---------- */
export const ICON_CHOICES = [
  "pan", "chefhat", "cow", "pig", "duck", "chicken", "fish", "shrimp",
  "egg", "eggtray", "eggboil", "eggsoft", "eggshoyu",
  "cup2", "bottle", "cup", "drop", "rice", "leaf", "flame", "snow",
  "box", "bag", "utensil", "jar", "tag", "scale", "truck", "store",
  "heart", "sun", "book", "music", "wallet", "coin", "receipt", "notebook", "clipboard", "calc", "cart",
];

export function iconPicker({ value, onChange, tint = "green", slotId } = {}) {
  const grid = h("div", { class: "icon-picker" },
    ICON_CHOICES.map((n) => h("button", {
      type: "button", class: "icon-opt" + (value === n ? " on tint-" + tint : ""), "aria-label": n,
      onClick: () => onChange && onChange(n),
    }, pi(n, 20))),
  );
  if (!slotId) {
    return h("div", { class: "stack", style: { gap: "10px" } },
      h("div", { class: "field-label" }, "เลือกไอคอน"), grid);
  }
  const hasPhoto = !!(window.kkSlots && window.kkSlots.get(slotId));
  const slot = h("image-slot", { id: slotId, class: "upload-slot", shape: "rounded", radius: "14", placeholder: "วางรูป / แตะเลือกไฟล์" });
  return h("div", { class: "stack", style: { gap: "10px" } },
    h("div", { class: "upload-row" },
      slot,
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { style: { fontSize: "13px", fontWeight: 700 } }, "อัปโหลดรูปเอง (น่ารักกว่าไอคอน)"),
        h("div", { style: { fontSize: "11px", color: "var(--muted)", marginTop: "2px", lineHeight: 1.45 } },
          "ลากรูปลงช่อง หรือแตะเพื่อเลือกไฟล์ — ", h("b", null, "ระบบจะย่อไฟล์ให้อัตโนมัติ"), " (PNG · JPG · WebP)"),
        hasPhoto && h("span", { class: "badge badge-green", style: { marginTop: "7px" } }, pi("check", 11), "ใช้รูปนี้แล้ว"),
      ),
    ),
    h("div", { class: "field-label" }, "หรือเลือกไอคอนสำเร็จรูป" + (hasPhoto ? " (รูปที่อัปโหลดจะถูกใช้ก่อน)" : "")),
    grid,
  );
}
