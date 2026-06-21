// ============================================================
// pages/manual.js — คู่มือพนักงาน · ขั้นตอนงานประจำวัน (มีไอคอนกำกับ)
// เจ้าของ (owner): เพิ่ม / แก้ / ลบ หัวข้อและขั้นตอนได้ — บันทึกขึ้นคลาวด์
// พนักงาน: อ่านอย่างเดียว
// ctx = { back, toast, role, ref }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { manualRows, saveManualTopic, removeManualTopic } from "../data/store.js";

const mst = { open: null, addT: false, newName: "", ctx: null };

export function manualScreen(ctx) {
  mst.ctx = ctx;
  const topics = manualRows();
  if (ctx && ctx.ref) mst.open = ctx.ref;        // deep-link จากการ์ดงาน → กางหัวข้อนั้น
  if (mst.open == null && topics[0]) mst.open = topics[0].id;
  const root = h("div", { class: "page-wrap", "data-screen-label": "manual" });
  root._sheets = h("div");
  paint(root);
  return root;
}

function commit(topic) { saveManualTopic({ ...topic }); }

function paint(root) {
  const ctx = mst.ctx;
  const isOwner = ctx.role === "owner";
  const topics = manualRows();

  const content = h("div", { class: "page stack", style: { paddingBottom: "12px" } },
    topics.map((m) => {
      const isOpen = mst.open === m.id;
      return h("div", { class: "acc-card" + (isOpen ? " open" : "") },
        h("button", { type: "button", class: "acc-head", onClick: () => { mst.open = isOpen ? null : m.id; paint(root); } },
          h("span", { class: "catic green" }, pi(m.icon || "book", 18)),
          h("span", { style: { flex: 1, fontWeight: 700, fontSize: "14.5px" } }, m.name),
          h("span", { class: "tnum", style: { fontSize: "11.5px", color: "var(--faint)" } }, m.steps.length + " ขั้น"),
          h("span", { class: "acc-chev" }, pi("chevd", 16)),
        ),
        isOpen && h("div", { style: { padding: "2px 14px 14px" } },
          h("div", { class: "stack", style: { gap: "8px" } },
            m.steps.map((s, i) => stepRow(root, m, i, s, isOwner)),
          ),
          isOwner && ownerTopicTools(root, m),
        ),
      );
    }),
    isOwner
      ? h("button", { type: "button", class: "btn btn-block", onClick: () => { mst.addT = true; mst.newName = ""; renderSheets(root); } }, pi("plus", 15), "เพิ่มหัวข้อใหม่")
      : null,
  );

  root.replaceChildren(
    hdr({ title: "คู่มือพนักงาน", sub: isOwner ? "เจ้าของ: แตะแก้ข้อความ · เพิ่ม/ลบขั้นตอนได้" : "ขั้นตอนงานประจำวัน · มีไอคอนกำกับทุกหัวข้อ", onBack: ctx.back, right: h("span", { class: "catic green" }, pi("book", 18)) }),
    content,
    root._sheets,
  );
  renderSheets(root);
}

// ---- ขั้นตอน 1 บรรทัด (พนักงาน=อ่าน · เจ้าของ=แก้ inline + ลบ) ----
function stepRow(root, m, i, text, isOwner) {
  if (!isOwner) {
    return h("div", { class: "rowflex", style: { alignItems: "flex-start", gap: "9px" } },
      h("span", { class: "step-num tnum" }, String(i + 1)),
      h("span", { style: { fontSize: "13px", lineHeight: 1.5 } }, text),
    );
  }
  const ta = h("textarea", {
    class: "input", rows: "1",
    style: { fontSize: "13px", lineHeight: 1.5, minHeight: "40px", resize: "none", padding: "8px 10px", flex: 1, minWidth: 0 },
  });
  ta.value = text;
  const autosize = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; };
  setTimeout(autosize, 0);
  ta.addEventListener("input", () => { m.steps[i] = ta.value; autosize(); });
  ta.addEventListener("blur", () => { m.steps[i] = ta.value.trim() || "—"; commit(m); });
  return h("div", { class: "rowflex", style: { alignItems: "flex-start", gap: "8px" } },
    h("span", { class: "step-num tnum", style: { marginTop: "6px" } }, String(i + 1)),
    ta,
    h("button", {
      type: "button", class: "mini-btn", "aria-label": "ลบขั้นตอน",
      style: { marginTop: "4px", color: "var(--danger)" },
      onClick: () => { m.steps.splice(i, 1); if (!m.steps.length) m.steps.push("—"); commit(m); paint(root); },
    }, pi("trash", 14)),
  );
}

// ---- แถบเครื่องมือเจ้าของในหัวข้อ (เพิ่มขั้นตอน · เปลี่ยนชื่อ · ลบหัวข้อ) ----
function ownerTopicTools(root, m) {
  return h("div", { class: "rowflex", style: { gap: "8px", marginTop: "12px", flexWrap: "wrap" } },
    h("button", { type: "button", class: "btn", style: { flex: 1 }, onClick: () => { m.steps.push("ขั้นตอนใหม่ — แตะเพื่อแก้"); commit(m); paint(root); } }, pi("plus", 14), "เพิ่มขั้นตอน"),
    h("button", { type: "button", class: "btn", style: { flex: "none" }, onClick: () => { mst.rename = m; mst.newName = m.name; renderSheets(root); } }, pi("edit", 14), "ชื่อ"),
    h("button", { type: "button", class: "btn", style: { flex: "none", color: "var(--danger)" }, onClick: () => { mst.confirmDel = m; renderSheets(root); } }, pi("trash", 14)),
  );
}

function renderSheets(root) {
  const layer = root._sheets;
  layer.replaceChildren();

  // เพิ่มหัวข้อใหม่
  if (mst.addT) {
    const nameIn = mkInput("เช่น ล้างจาน/อุปกรณ์", mst.newName);
    const add = () => {
      const n = nameIn.value.trim(); if (!n) return;
      const id = "mn-" + Date.now();
      saveManualTopic({ id, icon: "book", name: n, steps: ["ขั้นตอนใหม่ — แตะเพื่อแก้"] });
      mst.open = id; mst.addT = false; mst.newName = "";
      mst.ctx.toast('เพิ่มหัวข้อ "' + n + '" แล้ว'); paint(root);
    };
    nameIn.addEventListener("input", () => { mst.newName = nameIn.value; });
    nameIn.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
    setTimeout(() => nameIn.focus(), 30);
    layer.appendChild(sheet({ onClose: () => { mst.addT = false; renderSheets(root); }, children: editBody("เพิ่มหัวข้อคู่มือ", "ตั้งชื่อหัวข้องาน", nameIn,
      () => { mst.addT = false; renderSheets(root); }, add, "เพิ่ม") }));
    return;
  }

  // เปลี่ยนชื่อหัวข้อ
  if (mst.rename) {
    const m = mst.rename;
    const nameIn = mkInput("ชื่อหัวข้อ", mst.newName);
    const save = () => {
      const n = nameIn.value.trim(); if (!n) return;
      m.name = n; commit(m); mst.rename = null; mst.ctx.toast("เปลี่ยนชื่อหัวข้อแล้ว"); paint(root);
    };
    nameIn.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
    setTimeout(() => nameIn.focus(), 30);
    layer.appendChild(sheet({ onClose: () => { mst.rename = null; renderSheets(root); }, children: editBody("เปลี่ยนชื่อหัวข้อ", "แก้ชื่อให้อ่านง่าย", nameIn,
      () => { mst.rename = null; renderSheets(root); }, save, "บันทึก") }));
    return;
  }

  // ยืนยันลบหัวข้อ
  if (mst.confirmDel) {
    const m = mst.confirmDel;
    layer.appendChild(sheet({ onClose: () => { mst.confirmDel = null; renderSheets(root); }, children: h("div", null,
      h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 4px" } }, "ลบหัวข้อนี้?"),
      h("p", { style: { fontSize: "13px", color: "var(--muted)", textAlign: "center", margin: "0 0 14px" } }, '"' + m.name + '" จะถูกลบถาวร'),
      h("div", { class: "rowflex", style: { gap: "10px" } },
        h("button", { type: "button", class: "btn btn-block", onClick: () => { mst.confirmDel = null; renderSheets(root); } }, "ยกเลิก"),
        h("button", { type: "button", class: "btn btn-block", style: { background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }, onClick: () => {
          removeManualTopic(m.id); if (mst.open === m.id) mst.open = null; mst.confirmDel = null; mst.ctx.toast("ลบหัวข้อแล้ว"); paint(root);
        } }, pi("trash", 16), "ลบ"),
      ),
    ) }));
  }
}

function mkInput(placeholder, value) {
  return h("input", { type: "text", class: "input", value: value || "", placeholder, style: { fontSize: "15px" } });
}

function editBody(title, sub, input, onCancel, onConfirm, confirmLabel) {
  return h("div", null,
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "6px 0 4px" } }, title),
    h("p", { style: { fontSize: "12.5px", color: "var(--muted)", textAlign: "center", margin: "0 0 14px" } }, sub),
    input,
    h("div", { class: "rowflex", style: { gap: "10px", marginTop: "14px" } },
      h("button", { type: "button", class: "btn btn-block", onClick: onCancel }, "ยกเลิก"),
      h("button", { type: "button", class: "btn btn-primary btn-block", onClick: onConfirm }, pi("check", 16), confirmLabel),
    ),
  );
}
