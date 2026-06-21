// ============================================================
// pages/_entry.js — ส่วนกลางของหน้ากรอก (นับ · สั่ง · รับ)
// พอร์ตตรงจาก prototype2/screens-entry.jsx: EntryList · EntryFoot · ConfirmSheet
//
// ตารางกรอก เผ็ด/ไม่เผ็ด/รวม(อัตโนมัติ) + หน่วยนับ — class เดิมจาก proto.css
// ปรับเป็น vanilla: ช่องกรอกอัปเดตตัวเองตรงๆ ไม่ rerender ทั้งหน้า → ไม่เสีย focus/caret
//   • commit(key,val)  = ให้หน้าจอเก็บค่า (draft กันค่าหาย)
//   • footUpdate()     = ให้หน้าจออัปเดต progress ที่ footer
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { emo, note, tag, itemIc, unitSelect, emptyState, meter } from "../components/components.js";
import { sectionsFor, itemById, unitOf, catById, subById } from "../utils/formulas.js";
import { items as allItems } from "../data/store.js";

/* ---------- helpers (อ่านค่าใน vals) ---------- */
export const isFilled = (vals, it) => !!(vals[it.id + ":h"] || vals[it.id + ":m"]);
export function sumOf(vals, it) {
  const a = parseFloat(vals[it.id + ":h"] || 0) || 0;
  const b = parseFloat(vals[it.id + ":m"] || 0) || 0;
  const t = Math.round((a + b) * 100) / 100;
  return t ? String(t) : "";
}

/* ---------- mini stepper ที่อัปเดตช่องตัวเอง (ไม่ rerender) ---------- */
function miniStep({ value = "", tone, step = 1, onChange }) {
  const wrap = h("div", { class: "ministep" + (tone ? " " + tone : "") + (value ? " filled" : "") });
  const input = h("input", { type: "text", inputMode: "decimal", class: "ms-v", value, placeholder: "0" });
  const setUI = (s) => { input.value = s; wrap.classList.toggle("filled", !!s); };
  const setNum = (n) => { n = Math.max(0, Math.round(n * 100) / 100); const s = n === 0 ? "" : String(n); setUI(s); onChange(s); };
  input.addEventListener("input", () => {
    const s = input.value.replace(/[^0-9.]/g, "");
    if (s !== input.value) input.value = s;
    wrap.classList.toggle("filled", !!s);
    onChange(s);
  });
  wrap.append(
    h("button", { type: "button", class: "ms-minus", "aria-label": "ลด", onClick: () => setNum((parseFloat(input.value || 0) || 0) - step) }, pi("minus", 13)),
    input,
    h("button", { type: "button", class: "ms-plus", "aria-label": "เพิ่ม", onClick: () => setNum((parseFloat(input.value || 0) || 0) + step) }, pi("plus", 13)),
  );
  return wrap;
}

/* ช่องรวม (อ่านอย่างเดียว) — คืน node ที่มี ._set(v) */
function sumField(value = "") {
  const span = h("span", { class: "ms-v" }, value || "0");
  const wrap = h("div", { class: "ministep ro sum" + (value ? " filled" : "") }, span);
  wrap._set = (v) => { span.textContent = v || "0"; wrap.classList.toggle("filled", !!v); };
  return wrap;
}

/* ====================================================================
   entryList — การ์ดหมวด + ตารางกรอก
   { vals, commit, footUpdate, filter, q, cats, hideIds, open, toggleOpen, onAdd, onRemove }
==================================================================== */
export function entryList({ vals, commit, footUpdate, filter = "all", q = "", cats, hideIds = [], open = {}, toggleOpen, onAdd, onRemove } = {}) {
  const hidden = hideIds || [];
  const sections = sectionsFor(cats).map((s) => ({ ...s, items: s.items.filter((it) => !hidden.includes(it.id)) }));

  // เปลี่ยนค่า → เก็บ draft + อัปเดต ช่องรวม + done badge + footer (ไม่ rerender)
  const change = (it, key, val, sumEl, doneEl, secItems) => {
    commit(key, val);
    if (sumEl) sumEl._set(sumOf(vals, it));
    if (doneEl) updateDone(doneEl, secItems);
    footUpdate && footUpdate();
  };

  function updateDone(doneEl, secItems) {
    const n = secItems.filter((it) => isFilled(vals, it)).length;
    doneEl.lastChild.textContent = n;
    doneEl.style.display = n > 0 ? "" : "none";
  }

  function row(it, doneEl, secItems) {
    if (!it.spicy) {
      const stepM = miniStep({ tone: "plain", value: vals[it.id + ":m"] || "", step: it.unit === "kg" ? 0.1 : 1, onChange: (v) => change(it, it.id + ":m", v, null, doneEl, secItems) });
      return h("div", { class: "ent2-row cols5 plain" },
        itemIc(it, { sm: false }),
        nameCell(it),
        h("span", { class: "ent2-plainwrap" }, stepM),
        unitSelect({ it, value: vals[it.id + ":u"], onChange: (v) => commit(it.id + ":u", v) }),
      );
    }
    const sum = sumField(sumOf(vals, it));
    const stepH = miniStep({ tone: "hot", value: vals[it.id + ":h"] || "", step: it.unit === "kg" ? 0.1 : 1, onChange: (v) => change(it, it.id + ":h", v, sum, doneEl, secItems) });
    const stepM = miniStep({ tone: "cold", value: vals[it.id + ":m"] || "", step: it.unit === "kg" ? 0.1 : 1, onChange: (v) => change(it, it.id + ":m", v, sum, doneEl, secItems) });
    return h("div", { class: "ent2-row cols5" },
      itemIc(it, { sm: false }),
      nameCell(it),
      stepH, stepM, sum,
      unitSelect({ it, value: vals[it.id + ":u"], onChange: (v) => commit(it.id + ":u", v) }),
    );
  }

  function nameCell(it) {
    return h("span", { class: "ent2-name" },
      it.name,
      it.note && h("span", { class: "ent2-note" }, it.note),
      onRemove && h("button", { type: "button", class: "row-x", "aria-label": "ลบรายการ", onClick: () => onRemove(it) }, pi("x", 11)),
    );
  }

  function colHead(spicy) {
    if (spicy) {
      return h("div", { class: "ent2-head cols5" },
        h("span"), h("span"),
        h("span", { class: "ent2-h hot" }, pi("flame", 13), "เผ็ด"),
        h("span", { class: "ent2-h cold" }, pi("snow", 13), "ไม่เผ็ด"),
        h("span", { class: "ent2-h sum" }, "รวม"),
        h("span", { class: "ent2-h unit" }, "หน่วย"),
      );
    }
    return h("div", { class: "ent2-head cols5 noheat" },
      h("span"), h("span"),
      h("span", { class: "ent2-h qtyh" }, "จำนวน"),
      h("span", { class: "ent2-h unit" }, "หน่วย"),
    );
  }

  /* โหมดค้นหา — แสดงแบน */
  if (q) {
    const allowed = allItems().filter((it) => cats.some((c) => c.id === it.cat) && !hidden.includes(it.id) && it.isActive !== false);
    const found = allowed.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
    const spicy = found.some((it) => it.spicy);
    return h("div", { class: "ent2-card tint-green open" },
      colHead(spicy),
      h("div", { class: "ent2-body" },
        found.map((it) => row(it, null, found)),
        !found.length && emptyState({ compact: true, iconName: "search", title: 'ไม่พบ "' + q + '"', sub: "ลองคำอื่น หรือเลือกหมวดด้านบน" }),
      ),
    );
  }

  const shown = filter === "all" ? sections : sections.filter((s) => s.id === filter);
  return h("div", { class: "stack" },
    shown.map((sec) => {
      const isOpen = open[sec.id] !== false;
      const spicy = sec.items.some((it) => it.spicy);
      const done0 = sec.items.filter((it) => isFilled(vals, it)).length;
      const doneEl = h("span", { class: "ent2-done", style: { display: done0 > 0 ? "" : "none" } }, pi("check", 11), h("span", null, String(done0)));
      const body = isOpen && sec.items.length > 0 && h("div", { class: "ent2-body" },
        colHead(spicy),
        sec.subs
          ? sec.subs.map((sb) => {
            const subItems = sec.items.filter((i) => i.sub === sb.id);
            if (!subItems.length) return null;
            return h("div", { class: "stack", style: { gap: 0 } },
              h("div", { class: "sub-head" }, h("span", { class: "sub-ic" }, pi(sb.icon, 13)), h("span", null, sb.name), h("i")),
              subItems.map((it) => row(it, doneEl, sec.items)),
            );
          })
          : sec.items.map((it) => row(it, doneEl, sec.items)),
        onAdd && h("button", { type: "button", class: "add-row-btn", onClick: () => onAdd(sec) }, pi("plus", 13), "เพิ่มรายการใน" + sec.name),
      );
      return h("div", { class: "ent2-card tint-" + sec.tint + (isOpen ? " open" : "") },
        h("button", { type: "button", class: "ent2-cat", onClick: () => toggleOpen(sec.id) },
          h("span", { class: "ent2-cat-ic" }, emo(sec.icon, { s: 20 })),
          h("span", { class: "ent2-cat-name" }, sec.name),
          doneEl,
          h("span", { class: "ent2-count" }, sec.items.length + " รายการ"),
          h("span", { class: "ent2-chev" }, pi("chevd", 17)),
        ),
        body,
      );
    }),
  );
}

/* ====================================================================
   entryFoot — progress + ปุ่มบันทึก · คืน { node, update }
==================================================================== */
export function entryFoot({ vals, items, label, icon = "check", onSave }) {
  const fill = h("i", { style: { width: "0%" } });
  const countEl = h("span", { class: "tnum", style: { fontSize: "12px", fontWeight: 700 } }, "0 / " + items.length);
  const btn = h("button", { type: "button", class: "btn btn-primary", onClick: onSave }, pi(icon, 17), label);
  const node = h("div", { class: "foot" },
    h("div", { style: { flex: 1 } },
      h("div", { class: "split", style: { marginBottom: "6px" } },
        h("span", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "กรอกแล้ว"),
        countEl,
      ),
      h("div", { class: "meter" }, fill),
    ),
    btn,
  );
  function update() {
    const filled = items.filter((it) => isFilled(vals, it)).length;
    const pct = Math.round((filled / items.length) * 100);
    fill.style.width = pct + "%";
    countEl.textContent = filled + " / " + items.length;
    btn.disabled = !filled;
    btn.style.opacity = filled ? 1 : 0.45;
  }
  update();
  return { node, update };
}

/* ====================================================================
   confirmSheet — รายการที่กรอก + ปุ่มยืนยัน (กันบันทึกซ้ำ/ผิด)
   { vals, title, dupNote, onClose, onSave } → คืน node (bottom sheet)
==================================================================== */
export function confirmSheet({ vals, title, dupNote, onClose, onSave }) {
  const filled = allItems().filter((it) => isFilled(vals, it));
  return h("div", { class: "sheet-wrap" },
    h("div", { class: "sheet-back", onClick: onClose }),
    h("div", { class: "sheet", role: "dialog" },
      h("div", { class: "sheet-grip" }),
      h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 4px" } }, title),
      h("p", { style: { fontSize: "13px", color: "var(--muted)", textAlign: "center", margin: "0 0 12px" } }, "ตรวจทานก่อน — กันบันทึกซ้ำ/ผิด"),
      h("div", { class: "card", style: { padding: "4px 14px", maxHeight: "220px", overflowY: "auto" } },
        filled.map((it) => h("div", { class: "rowflex", style: { padding: "8px 0", borderBottom: "1px solid var(--border-soft)" } },
          itemIc(it),
          h("span", { style: { fontSize: "13.5px", flex: 1 } }, it.name),
          h("span", { class: "rowflex", style: { gap: "5px" } },
            it.spicy
              ? [
                vals[it.id + ":h"] && tag("เผ็ด " + vals[it.id + ":h"], { kind: "dgr", iconName: "flame" }),
                vals[it.id + ":m"] && tag("ไม่เผ็ด " + vals[it.id + ":m"]),
              ]
              : (vals[it.id + ":m"] || vals[it.id + ":h"]) && tag("จำนวน " + (vals[it.id + ":m"] || vals[it.id + ":h"]), { kind: "ok" }),
            h("span", { class: "tnum", style: { fontSize: "11px", color: "var(--faint)" } }, vals[it.id + ":u"] || unitOf(it)),
          ),
        )),
        !filled.length && h("p", { style: { fontSize: "13px", color: "var(--faint)", textAlign: "center", padding: "12px 0", margin: 0 } }, "ยังไม่ได้กรอกรายการใด"),
      ),
      h("div", { style: { margin: "12px 0 0" } }, note(dupNote)),
      h("div", { class: "rowflex", style: { gap: "10px", marginTop: "14px" } },
        h("button", { type: "button", class: "btn btn-block", onClick: onClose }, "กลับไปแก้"),
        h("button", { type: "button", class: "btn btn-primary btn-block", onClick: onSave }, pi("check", 17), "ยืนยันบันทึก"),
      ),
    ),
  );
}
