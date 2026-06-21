// ============================================================
// pages/users.js — การ์ด "ทีมงาน · ผู้ใช้ & รหัสผ่าน" (พับได้ acc-card)
//
// ใช้ตัวเดียวกันทั้งแท็บเพิ่มเติม (เจ้าของ) และแท็บบัญชี (ไม่ใช่เจ้าของ)
// ผู้ดู = ctx.user (คนที่ login) → กฎมองเห็น/แก้ไขคิดจากระดับของผู้ดูเอง
//
// การมองเห็น:
//   • เจ้าของ → เห็นทุกคน (รวมเจ้าของด้วยกัน) เรียง เจ้าของ→หัวหน้า→พนักงาน
//   • ไม่ใช่เจ้าของ → เห็นตัวเอง + ระดับที่ "ต่ำกว่า" เท่านั้น (ระดับเดียวกันไม่เห็นกัน)
// การแก้ไข:
//   • คนระดับสูงกว่า จัดการคนที่ "ต่ำกว่า" ได้เต็ม (ชื่อ/รหัส/บล็อก/ลบ/มอบงาน)
//   • ทุกคนแก้ ชื่อ/รหัส ของตัวเองได้
//   • บัญชีเจ้าของ (ที่ไม่ใช่ตัวเอง) → ล็อก แก้ไม่ได้
//   • เปลี่ยน "ระดับ" + เพิ่มผู้ใช้ใหม่ = เฉพาะเจ้าของ
//
// ลำดับชั้นบังคับฝั่ง client ตอนนี้ — ออกแบบให้ย้ายเป็น RLS ได้ตรงๆ ตอนเฟส auth
// ข้อมูลผ่าน data/store (rama9_users / rama9_tasks) เท่านั้น
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { note, seg, toggle } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { MANUAL } from "../data/seed.js";
import {
  users, userById, saveUser, removeUser,
  tasksRows, addTask, setTaskStatus, removeTask,
} from "../data/store.js";
import { LEVELS, LEVEL_ORDER, levelInfo, rankOf, isPlaceholderName } from "../services/authService.js";
import * as supa from "../api/supabaseClient.js";

const LEVEL_TINT = { owner: "amber", lead: "violet", staff: "green" };
const LEVEL_ICON = { owner: "shield", lead: "user", staff: "user" };

const TS = { open: false, ctx: null, edit: null }; // เริ่มพับ (default)

function pinTaken(pin, exceptId) {
  return users().some((u) => u.id !== exceptId && String(u.pin) === String(pin));
}
function sortedByRank(list) { return [...list].sort((a, b) => rankOf(b) - rankOf(a)); }
function pinInput(value) {
  const inp = h("input", {
    class: "input", type: "text", inputmode: "numeric", maxlength: "4",
    value: value || "", placeholder: "เช่น 1234",
    style: { fontFamily: "var(--font-num)", letterSpacing: "3px", fontWeight: 700 },
  });
  inp.addEventListener("input", () => { inp.value = inp.value.replace(/\D/g, "").slice(0, 4); });
  return inp;
}
const pwBadge = () => h("span", { class: "pw-chip" }, "••••");

// ---- ผู้ดู + กฎ ----
function viewer() { const c = TS.ctx; return c && c.user ? (userById(c.user.id) || c.user) : null; }
function visibleUsers(me) {
  if (!me) return [];
  const isOwner = me.level === "owner";
  const myRank = rankOf(me);
  return users().filter((u) => u.id === me.id || rankOf(u) < myRank || isOwner);
}

export function teamCard(ctx) {
  TS.ctx = ctx;
  const wrap = h("div", { class: "team-card-wrap" });
  wrap._sheets = h("div");
  renderCard(wrap);
  return wrap;
}

function renderCard(wrap) {
  const me = viewer();
  const isOwner = me && me.level === "owner";
  const myRank = rankOf(me);
  const list = sortedByRank(visibleUsers(me));

  // สรุปหัวการ์ด
  let summary;
  if (isOwner) {
    const o = list.filter((u) => u.level === "owner").length;
    const l = list.filter((u) => u.level === "lead").length;
    const s = list.filter((u) => u.level === "staff").length;
    summary = list.length + " คน · เจ้าของ " + o + " · หัวหน้า " + l + " · พนักงาน " + s;
  } else {
    const others = Math.max(0, list.length - 1);
    summary = others > 0 ? ("คุณ + ทีมที่ดูแล " + others + " คน") : "เฉพาะบัญชีของคุณ";
  }

  const head = h("button", { type: "button", class: "acc-head", onClick: () => { TS.open = !TS.open; renderCard(wrap); } },
    h("span", { class: "catic green" }, pi("users", 18)),
    h("span", { style: { flex: 1, minWidth: 0 } },
      h("span", { style: { display: "block", fontWeight: 700, fontSize: "14.5px" } }, "ผู้ใช้ & รหัสผ่าน"),
      h("span", { style: { display: "block", fontSize: "11.5px", color: "var(--muted)" } }, summary),
    ),
    h("span", { class: "acc-chev" }, pi("chevd", 16)),
  );

  let body = null;
  if (TS.open) {
    const rows = h("div", { class: "card", style: { padding: "4px 14px 10px", marginTop: "8px" } });
    list.forEach((u, i) => {
      const self = me && u.id === me.id;
      const canManage = rankOf(u) < myRank;
      const editable = self || canManage;
      const noName = isPlaceholderName(u.name);
      rows.appendChild(h("button", {
        type: "button", class: "user-row" + (editable ? " list-press" : " is-locked"),
        onClick: editable ? () => openEdit(u, wrap) : null,
        style: { borderBottom: i < list.length - 1 ? "1px solid var(--border-soft)" : "none" },
      },
        h("span", { class: "catic " + LEVEL_TINT[u.level] }, pi(LEVEL_ICON[u.level], 18)),
        h("span", { class: "user-row-main" },
          h("span", { class: "user-row-name" },
            noName ? h("span", { style: { color: "var(--muted)", fontWeight: 600 } }, u.name + " · ยังไม่ตั้งชื่อ") : u.name,
            self && h("span", { class: "badge badge-green", style: { marginLeft: "6px" } }, "ฉัน"),
            u.blocked && h("span", { class: "badge badge-red", style: { marginLeft: "6px" } }, "ระงับ"),
          ),
          // โชว์ระดับเฉพาะมุมมองเจ้าของ (ไม่ broadcast ระดับให้พนักงาน)
          isOwner && h("span", { class: "user-row-sub" }, h("span", { class: "lvl-badge lvl-" + u.level }, levelInfo(u.level).label)),
        ),
        pwBadge(),
        editable
          ? (() => { const c = pi("edit", 16); c.style.color = "var(--muted)"; c.style.marginLeft = "8px"; return c; })()
          : (() => { const c = pi("lock", 15); c.style.color = "var(--faint)"; c.style.marginLeft = "8px"; return c; })(),
      ));
    });

    const footNote = isOwner
      ? note([h("b", null, "เจ้าของ"), h("span", null, " จัดการได้ทุกคน — ยกเว้นบัญชีเจ้าของคนอื่น (ล็อก 🔒)")], { iconName: "shield" })
      : note("แก้ชื่อ/รหัสของคุณได้ที่นี่ · ดูแลและมอบหมายงานให้ทีมที่ต่ำกว่าได้", { iconName: "lock" });

    body = h("div", null,
      rows,
      isOwner && h("button", { type: "button", class: "btn btn-primary btn-block", style: { marginTop: "8px" }, onClick: () => openAdd(wrap) }, pi("plus", 16), "เพิ่มผู้ใช้"),
      footNote,
    );
  }

  wrap.replaceChildren(
    h("div", { class: "overline" }, "ทีมงาน"),
    h("div", { class: "acc-card" + (TS.open ? " open" : "") }, head, body),
    wrap._sheets,
  );
  renderSheets(wrap);
}

function openEdit(u, wrap) { TS.edit = { ...u }; renderSheets(wrap); }
function openAdd(wrap) { TS.edit = { new: true, id: "u-" + Date.now(), name: "", pin: "", level: "staff", blocked: false }; renderSheets(wrap); }

function renderSheets(wrap) {
  const layer = wrap._sheets;
  layer.replaceChildren();
  if (TS.edit) layer.appendChild(sheet({ onClose: () => { TS.edit = null; renderSheets(wrap); }, children: editBody(wrap) }));
}

function editBody(wrap) {
  const e = TS.edit;
  const ctx = TS.ctx;
  const me = viewer();
  const isOwner = me && me.level === "owner";
  const self = me && e.id === me.id && !e.new;
  const canManage = !e.new && rankOf(e) < rankOf(me);
  const showLevel = isOwner && (e.new || canManage); // เปลี่ยนระดับ = เจ้าของเท่านั้น
  const showManage = canManage;                       // บล็อก/ลบ/มอบงาน = จัดการคนต่ำกว่า

  const nameIn = h("input", { class: "input", type: "text", value: e.name, placeholder: "ชื่อผู้ใช้ (เช่น ออม)" });
  nameIn.addEventListener("input", () => { TS.edit.name = nameIn.value; });
  const pinIn = pinInput("");
  pinIn.addEventListener("input", () => { TS.edit.pin = pinIn.value; });
  const oldPinIn = pinInput("");
  oldPinIn.addEventListener("input", () => { TS.edit.oldPin = oldPinIn.value; });

  const levelSeg = showLevel ? seg({
    value: e.level, grow: true,
    options: LEVEL_ORDER.slice().reverse().map((k) => ({ v: k, t: LEVELS[k].label })),
    onChange: (v) => { TS.edit.level = v; },
  }) : null;
  const blockTgl = showManage ? toggle(!!e.blocked, (v) => { TS.edit.blocked = v; }) : null;

  async function save() {
    const name = (TS.edit.name || "").trim();
    const pin = (TS.edit.pin || "").trim();
    const oldPin = (TS.edit.oldPin || "").trim();
    if (!name) { ctx.toast && ctx.toast("กรอกชื่อผู้ใช้ก่อน"); return; }

    // ผู้ใช้ใหม่ → เพิ่มผ่านเซิร์ฟเวอร์
    if (e.new) {
      if (!/^\d{4}$/.test(pin)) { ctx.toast && ctx.toast("รหัสผ่านต้องเป็นตัวเลข 4 หลัก"); return; }
      const level = showLevel ? (TS.edit.level || "staff") : "staff";
      const r = await supa.addUser(name, level, pin);
      if (!r || !r.ok) { ctx.toast && ctx.toast((r && r.error) || "เพิ่มไม่สำเร็จ"); return; }
      saveUser({ id: r.id, name, level, blocked: false });
      TS.edit = null; renderSheets(wrap);
      ctx.toast && ctx.toast("เพิ่มผู้ใช้แล้ว");
      return;
    }

    // เจ้าของจัดการผู้อื่น/ตัวเอง
    if (isOwner) {
      const patch = { name };
      if (showLevel) patch.level = TS.edit.level;
      if (showManage) patch.blocked = !!TS.edit.blocked;
      const r = await supa.setUser(e.id, patch);
      if (!r || !r.ok) { ctx.toast && ctx.toast((r && r.error) || "บันทึกไม่สำเร็จ"); return; }
      if (pin) {
        if (!/^\d{4}$/.test(pin)) { ctx.toast && ctx.toast("รหัสใหม่ต้องเป็นเลข 4 หลัก"); return; }
        const rp = await supa.resetUserPin(e.id, pin);
        if (!rp || !rp.ok) { ctx.toast && ctx.toast((rp && rp.error) || "ตั้งรหัสไม่สำเร็จ"); return; }
      }
      saveUser({ id: e.id, name, ...(patch.level ? { level: patch.level } : {}), ...(showManage ? { blocked: !!TS.edit.blocked } : {}) });
      TS.edit = null; renderSheets(wrap);
      ctx.toast && ctx.toast("บันทึกแล้ว");
      return;
    }

    // ไม่ใช่เจ้าของ → แก้บัญชีตัวเองเท่านั้น
    if (self) {
      const rn = await supa.setOwnName(name);
      if (!rn || !rn.ok) { ctx.toast && ctx.toast((rn && rn.error) || "บันทึกไม่สำเร็จ"); return; }
      if (pin) {
        if (!/^\d{4}$/.test(pin)) { ctx.toast && ctx.toast("รหัสใหม่ต้องเป็นเลข 4 หลัก"); return; }
        if (!/^\d{4}$/.test(oldPin)) { ctx.toast && ctx.toast("กรอกรหัสเดิมเพื่อยืนยัน"); return; }
        const rp = await supa.changeOwnPin(oldPin, pin);
        if (!rp || !rp.ok) { ctx.toast && ctx.toast((rp && rp.error) || "เปลี่ยนรหัสไม่สำเร็จ"); return; }
      }
      saveUser({ id: e.id, name });
      TS.edit = null; renderSheets(wrap);
      ctx.toast && ctx.toast("บันทึกแล้ว");
      return;
    }
  }
  async function del() {
    const r = await supa.deleteUser(e.id);
    if (!r || !r.ok) { ctx.toast && ctx.toast((r && r.error) || "ลบไม่สำเร็จ"); return; }
    removeUser(e.id); TS.edit = null; renderSheets(wrap);
    ctx.toast && ctx.toast("ลบผู้ใช้แล้ว");
  }

  const children = [
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "2px 0 0" } }, e.new ? "เพิ่มผู้ใช้" : (self ? "แก้ไขบัญชีของฉัน" : "จัดการ " + e.name)),
    h("label", { class: "field", style: { margin: 0 } }, h("span", { class: "field-label" }, "ชื่อผู้ใช้"), nameIn),
    h("label", { class: "field", style: { margin: 0 } },
      h("span", { class: "field-label" }, e.new ? "รหัสผ่าน (4 หลัก)" : "ตั้งรหัสใหม่ (เว้นว่าง = ไม่เปลี่ยน)"), pinIn),
    (self && !isOwner) ? h("label", { class: "field", style: { margin: 0 } },
      h("span", { class: "field-label" }, "รหัสเดิม (กรอกเมื่อจะเปลี่ยนรหัส)"), oldPinIn) : null,
  ];
  if (showLevel) children.push(h("div", null,
    h("div", { class: "field-label", style: { marginBottom: "6px" } }, "ระดับสิทธิ์"),
    levelSeg,
    h("p", { style: { fontSize: "11.5px", color: "var(--faint)", margin: "6px 0 0" } }, "เจ้าของ = เห็นเมนูเพิ่มเติม · หัวหน้า/พนักงาน สิทธิ์เท่ากัน (ตอนนี้)"),
  ));
  if (showManage) children.push(h("div", { class: "card split", style: { padding: "10px 14px" } },
    h("span", { style: { fontSize: "13.5px", fontWeight: 600 } }, "ระงับการใช้งาน (block)"),
    blockTgl,
  ));
  // ---- มอบหมายงาน (เฉพาะตอนจัดการคนต่ำกว่า ที่บันทึกแล้ว) ----
  if (showManage) children.push(assignSection(wrap, e, me));

  children.push(h("div", { class: "rowflex", style: { gap: "10px", marginTop: "2px" } },
    showManage && h("button", { type: "button", class: "btn", style: { color: "var(--danger)" }, onClick: del }, pi("trash", 15), "ลบ"),
    h("button", { type: "button", class: "btn btn-block", onClick: () => { TS.edit = null; renderSheets(wrap); } }, "ยกเลิก"),
    h("button", { type: "button", class: "btn btn-primary btn-block", onClick: save }, pi("check", 16), "บันทึก"),
  ));

  return h("div", { class: "stack", style: { gap: "14px" } }, ...children);
}

// ---- ส่วนมอบหมายงานในชีตจัดการผู้ใช้ ----
function assignSection(wrap, target, me) {
  const ctx = TS.ctx;
  const mine = tasksRows().filter((t) => t.assigner_id === me.id && t.assignee_id === target.id);

  const titleIn = h("input", { class: "input", type: "text", placeholder: "งานที่มอบ เช่น เช็ดสถานีแพ็ค" });
  const detailIn = h("input", { class: "input", type: "text", placeholder: "รายละเอียดเพิ่มเติม (ไม่บังคับ)" });
  const manualSel = h("select", { class: "input" },
    h("option", { value: "" }, "— ไม่ผูกคู่มือ —"),
    MANUAL.map((m) => h("option", { value: m.id }, m.name)),
  );

  function add() {
    const title = titleIn.value.trim();
    if (!title) { ctx.toast && ctx.toast("กรอกชื่องานก่อน"); return; }
    addTask({
      assignee_id: target.id, assigner_id: me.id,
      title, detail: detailIn.value.trim(),
      kind: "task", manual_ref: manualSel.value || null,
    });
    ctx.toast && ctx.toast("มอบหมายงานแล้ว");
    // bumpData → ชีตวาดใหม่ พร้อมงานในรายการ
  }

  const listNode = mine.length
    ? h("div", { class: "stack", style: { gap: "6px" } },
        mine.map((t) => h("div", { class: "assign-task" + (t.status === "done" ? " done" : "") },
          h("button", { type: "button", class: "task-check" + (t.status === "done" ? " on" : ""), style: { width: "20px", height: "20px" }, onClick: () => setTaskStatus(t.id, t.status === "done" ? "open" : "done") }, t.status === "done" ? pi("check", 12) : null),
          h("span", { class: "at-title" }, t.title),
          h("span", { class: "badge " + (t.status === "done" ? "badge-green" : "badge-yellow") }, t.status === "done" ? "เสร็จ" : "ค้าง"),
          h("button", { type: "button", class: "ic-edit", style: { border: 0, background: "transparent", color: "var(--faint)" }, "aria-label": "ลบงาน", onClick: () => removeTask(t.id) }, pi("trash", 14)),
        )),
      )
    : h("p", { style: { fontSize: "12px", color: "var(--faint)", margin: "2px 0" } }, "ยังไม่มีงานที่มอบให้คนนี้");

  return h("div", { style: { borderTop: "1px dashed var(--border)", paddingTop: "12px" } },
    h("div", { class: "field-label", style: { marginBottom: "8px" } }, "งานที่มอบหมาย"),
    listNode,
    h("div", { class: "stack", style: { gap: "8px", marginTop: "10px" } },
      titleIn, detailIn,
      h("label", { class: "field", style: { margin: 0 } }, h("span", { class: "field-label" }, "ผูกหัวข้อคู่มือ (ไม่บังคับ)"), manualSel),
      h("button", { type: "button", class: "btn btn-block", onClick: add }, pi("send", 15), "มอบหมายงานนี้"),
    ),
  );
}
