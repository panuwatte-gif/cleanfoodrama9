// ============================================================
// pages/manual.js — คู่มือพนักงาน · พอร์ตจาก prototype2 ManualScreen
// ขั้นตอนงานประจำวัน · มีไอคอนกำกับ · เจ้าของเพิ่มหัวข้อได้
// ctx = { back, toast, role }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { MANUAL } from "../data/seed.js";

const bold = (t) => h("b", null, t);
const mst = { open: MANUAL[0] && MANUAL[0].id, topics: MANUAL.map((m) => ({ ...m, steps: [...m.steps] })), addT: false, newName: "", ctx: null };

export function manualScreen(ctx) {
  mst.ctx = ctx;
  if (ctx && ctx.ref) mst.open = ctx.ref; // deep-link จากการ์ดงาน → กางหัวข้อนั้น
  const root = h("div", { class: "page-wrap", "data-screen-label": "manual" });
  root._sheets = h("div");
  paint(root);
  return root;
}

function paint(root) {
  const ctx = mst.ctx;
  const content = h("div", { class: "page stack", style: { paddingBottom: "12px" } },
    note(["เขียนสั้น อ่านง่าย มี", bold("ไอคอนกำกับ"), " — เผื่อพนักงานใหม่/อ่านไทยไม่คล่อง ดูรูปแล้วเข้าใจ"], { iconName: "users" }),
    mst.topics.map((m) => {
      const isOpen = mst.open === m.id;
      return h("div", { class: "acc-card" + (isOpen ? " open" : "") },
        h("button", { type: "button", class: "acc-head", onClick: () => { mst.open = isOpen ? null : m.id; paint(root); } },
          h("span", { class: "catic green" }, pi(m.icon, 18)),
          h("span", { style: { flex: 1, fontWeight: 700, fontSize: "14.5px" } }, m.name),
          h("span", { class: "tnum", style: { fontSize: "11.5px", color: "var(--faint)" } }, m.steps.length + " ขั้น"),
          h("span", { class: "acc-chev" }, pi("chevd", 16)),
        ),
        isOpen && h("div", { style: { padding: "2px 14px 14px" } },
          h("div", { class: "stack", style: { gap: "8px" } },
            m.steps.map((s, i) => h("div", { class: "rowflex", style: { alignItems: "flex-start", gap: "9px" } },
              h("span", { class: "step-num tnum" }, String(i + 1)),
              h("span", { style: { fontSize: "13px", lineHeight: 1.5 } }, s),
            )),
          ),
        ),
      );
    }),
    ctx.role === "owner"
      ? h("button", { type: "button", class: "btn btn-block", onClick: () => { mst.addT = true; mst.newName = ""; renderSheets(root); } }, pi("plus", 15), "เพิ่มหัวข้อ (เจ้าของ)")
      : note(["เพิ่ม/แก้คู่มือ ทำได้เฉพาะ", bold("เจ้าของ")], { iconName: "lock" }),
  );
  root.replaceChildren(
    hdr({ title: "คู่มือพนักงาน", sub: "ขั้นตอนงานประจำวัน · มีไอคอนกำกับทุกหัวข้อ", onBack: ctx.back, right: h("span", { class: "catic green" }, pi("book", 18)) }),
    content,
    root._sheets,
  );
  renderSheets(root);
}

function renderSheets(root) {
  const layer = root._sheets;
  layer.replaceChildren();
  if (!mst.addT) return;
  const nameIn = h("input", { type: "text", class: "input", value: mst.newName, placeholder: "เช่น ล้างจาน/อุปกรณ์", style: { fontSize: "15px" } });
  const add = () => {
    const n = nameIn.value.trim(); if (!n) return;
    const id = "mn-" + Date.now();
    mst.topics = [...mst.topics, { id, icon: "book", name: n, steps: ["(ยังไม่ได้ใส่ขั้นตอน — แตะแก้ได้ภายหลัง)"] }];
    mst.open = id; mst.addT = false; mst.newName = "";
    mst.ctx.toast('เพิ่มหัวข้อ "' + n + '" แล้ว'); paint(root);
  };
  nameIn.addEventListener("input", () => { mst.newName = nameIn.value; });
  nameIn.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
  setTimeout(() => nameIn.focus(), 30);
  layer.appendChild(sheet({ onClose: () => { mst.addT = false; renderSheets(root); }, children: h("div", null,
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 4px" } }, "เพิ่มหัวข้อคู่มือ"),
    h("p", { style: { fontSize: "12.5px", color: "var(--muted)", textAlign: "center", margin: "0 0 14px" } }, "ตั้งชื่อหัวข้องาน"),
    nameIn,
    h("div", { class: "rowflex", style: { gap: "10px", marginTop: "14px" } },
      h("button", { type: "button", class: "btn btn-block", onClick: () => { mst.addT = false; renderSheets(root); } }, "ยกเลิก"),
      h("button", { type: "button", class: "btn btn-primary btn-block", onClick: add }, pi("plus", 16), "เพิ่ม"),
    ),
  ) }));
}
