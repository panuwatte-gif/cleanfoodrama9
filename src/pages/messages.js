// ============================================================
// pages/messages.js — "งานและข้อความ" (ศูนย์รวม per role)
// ctx = { go, back, role, toast, user, shopCtx }
//
// owner/lead: กล่องเข้า · งานรอตรวจ · ที่ฉันส่ง + ปุ่ม "สร้างรายการใหม่"
//             (เลือกผู้รับได้เฉพาะคนที่ "ต่ำกว่า" — owner→หัวหน้า/พนักงาน · lead→พนักงาน)
// staff:      กล่องเข้า + โน้ตส่วนตัว (ไม่มีปุ่มสร้างรายการเพื่อส่งให้คนอื่น)
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, seg, toggle } from "../components/components.js";
import { sheet } from "../components/sheet.js";
import { mascot } from "../components/mascot.js";
import { MANUAL, TODAY } from "../data/seed.js";
import { addTask, submitTask, approveTask, reopenTask, ackTask, removeTask, setTaskStatus } from "../data/store.js";
import {
  canCompose, recipientsFor, recipientGroups, nameOf, levelOfUser,
  inboxFor, notesFor, sentBy, pendingReviewFor, overdueAssignedBy,
  isNotice, isOverdue, isDueToday,
} from "../utils/messages.js";
import { levelInfo } from "../services/authService.js";

const MS = { tab: "inbox", compose: null };

function manualName(ref) { const m = MANUAL.find((x) => x.id === ref); return m ? m.name : "คู่มือ"; }
function kindLabel(t) {
  if (t.kind === "notice") return { ic: "megaphone", c: "violet", label: "ประกาศ" };
  return { ic: "clipboard", c: "green", label: "งาน" };
}

export function messagesScreen(ctx = {}) {
  const me = ctx.user;
  const root = h("div", { class: "page-wrap", "data-screen-label": "messages", style: { display: "flex", flexDirection: "column", flex: 1 } });
  paint(root, ctx, me);
  return root;
}

function paint(root, ctx, me) {
  const compose = canCompose(me);
  const review = pendingReviewFor(me);
  const overdue = overdueAssignedBy(me);
  const sent = sentBy(me);

  const tabs = compose ? [
    { v: "inbox", t: "กล่องเข้า" },
    { v: "review", t: "งานรอตรวจ" + (review.length ? " " + review.length : "") },
    { v: "sent", t: "ที่ฉันส่ง" },
  ] : null;

  let body;
  if (compose && MS.tab === "review") body = reviewSection(ctx, me, review);
  else if (compose && MS.tab === "sent") body = sentSection(ctx, me, sent, overdue);
  else body = inboxSection(ctx, me);

  root.replaceChildren(
    hdr({
      title: "งานและข้อความ",
      sub: compose ? "ส่งข้อความ · มอบหมายงาน · ติดตามผล" : "ข้อความและงานที่ได้รับ",
      onBack: ctx.back,
      right: h("span", { class: "catic violet" }, pi("mail", 18)),
    }),
    h("div", { class: "page stack", style: { paddingBottom: "16px" } },
      compose && h("button", { type: "button", class: "btn btn-primary btn-block compose-btn", onClick: () => { MS.compose = newDraft(me); renderSheet(root, ctx, me); } },
        pi("plus", 17), "สร้างรายการใหม่"),
      tabs && seg({ value: MS.tab, grow: true, options: tabs, onChange: (v) => { MS.tab = v; paint(root, ctx, me); } }),
      body,
    ),
    root._sheet || (root._sheet = h("div")),
  );
  renderSheet(root, ctx, me);
}

/* ---------------- กล่องเข้า ---------------- */
function inboxSection(ctx, me) {
  const inbox = inboxFor(me).slice().sort(sortInbox);
  const notes = notesFor(me);
  const wrap = h("div", { class: "stack", style: { gap: "14px" } });

  if (inbox.length) {
    wrap.appendChild(h("div", { class: "card", style: { padding: "6px 0" } },
      inbox.map((t, i) => inboxRow(ctx, me, t, i < inbox.length - 1))));
  } else {
    wrap.appendChild(emptyCard("ยังไม่มีข้อความหรืองานใหม่", "เคลียร์ครบแล้ว เก่งมาก!"));
  }

  // โน้ตส่วนตัว (ทุกคนมีได้)
  wrap.appendChild(h("div", { class: "overline" }, "โน้ตส่วนตัว"));
  const noteCard = h("div", { class: "card", style: { padding: "6px 0" } });
  if (notes.length) notes.forEach((t, i) => noteCard.appendChild(noteRow(ctx, t, i < notes.length - 1)));
  else noteCard.appendChild(h("p", { style: { fontSize: "12.5px", color: "var(--faint)", padding: "10px 16px", margin: 0 } }, "ยังไม่มีโน้ต — จดเตือนตัวเองได้เลย"));
  wrap.appendChild(noteCard);
  wrap.appendChild(addNoteBar(ctx, me));
  return wrap;
}

function sortInbox(a, b) {
  const score = (t) => {
    if (isNotice(t) && !t.acked) return 0;
    if (t.kind === "task" && t.status === "open" && (t.urgent || isOverdue(t))) return 1;
    if (t.kind === "task" && t.bounced) return 2;
    if (t.kind === "task" && t.status === "open" && isDueToday(t)) return 3;
    if (t.status === "submitted") return 4;
    if (t.status === "done" || t.acked) return 6;
    return 5;
  };
  return score(a) - score(b);
}

function statusChips(t) {
  const chips = [];
  if (t.urgent && t.status === "open") chips.push(["ด่วน", "badge-red", "flame"]);
  if (isOverdue(t)) chips.push(["เกินกำหนด", "badge-red", "clock"]);
  else if (isDueToday(t) && t.status === "open") chips.push(["ครบกำหนดวันนี้", "badge-yellow", "clock"]);
  if (t.bounced && t.status === "open") chips.push(["ถูกตีกลับ", "badge-yellow", "reply"]);
  if (t.status === "submitted") chips.push(["รอตรวจ", "badge-yellow", "clock"]);
  if (t.status === "done") chips.push(["อนุมัติแล้ว", "badge-green", "check"]);
  return chips.map(([txt, cls, ic]) => h("span", { class: "badge " + cls }, pi(ic, 10), txt));
}

function inboxRow(ctx, me, t, divider) {
  const k = kindLabel(t);
  const done = t.status === "done";
  const fromLvl = levelOfUser(t.assigner_id);
  const isMsg = t.kind === "notice";
  let action = null;
  if (isMsg && !t.acked) {
    action = h("button", { type: "button", class: "msg-act", onClick: () => { ackTask(t.id); ctx.toast && ctx.toast("รับทราบแล้ว"); } }, pi("check", 13), "รับทราบ");
  } else if (t.kind === "task" && t.status === "open") {
    action = h("button", { type: "button", class: "msg-act primary", onClick: () => { submitTask(t.id); ctx.toast && ctx.toast("ส่งงานแล้ว · รอหัวหน้าตรวจ"); } }, pi("check", 13), "ทำเสร็จแล้ว");
  } else if (isMsg && t.acked) {
    action = h("span", { class: "badge badge-green" }, pi("check", 10), "รับทราบแล้ว");
  }
  return h("div", { class: "msg-row" + (done ? " done" : ""), style: { borderBottom: divider ? "1px solid var(--border-soft)" : "none" } },
    h("span", { class: "catic " + k.c }, pi(k.ic, 18)),
    h("div", { class: "msg-main" },
      h("div", { class: "msg-top" },
        h("span", { class: "msg-title" }, t.title),
      ),
      h("div", { class: "msg-from" }, "จาก " + nameOf(t.assigner_id) + " · " + levelInfo(fromLvl).label),
      t.detail && h("div", { class: "msg-detail" }, "“" + t.detail + "”"),
      (statusChips(t).length || t.manual_ref) && h("div", { class: "msg-chips" },
        ...statusChips(t),
        t.manual_ref && h("button", { type: "button", class: "task-manual list-press", onClick: () => ctx.go({ name: "manual", ref: t.manual_ref }) }, pi("book", 12), manualName(t.manual_ref)),
      ),
      action && h("div", { class: "msg-actions" }, action),
    ),
  );
}

/* ---------------- งานรอตรวจ ---------------- */
function reviewSection(ctx, me, review) {
  if (!review.length) return emptyCard("ไม่มีงานรอตรวจ", "พนักงานยังไม่ได้กดส่งงานเข้ามา");
  return h("div", { class: "card", style: { padding: "6px 0" } },
    review.map((t, i) => h("div", { class: "msg-row", style: { borderBottom: i < review.length - 1 ? "1px solid var(--border-soft)" : "none" } },
      h("span", { class: "catic amber" }, pi("clipboard", 18)),
      h("div", { class: "msg-main" },
        h("span", { class: "msg-title" }, t.title),
        h("div", { class: "msg-from" }, "ส่งโดย " + nameOf(t.assignee_id) + " · " + levelInfo(levelOfUser(t.assignee_id)).label),
        t.detail && h("div", { class: "msg-detail" }, "“" + t.detail + "”"),
        h("div", { class: "msg-actions" },
          h("button", { type: "button", class: "msg-act primary", onClick: () => { approveTask(t.id); ctx.toast && ctx.toast("อนุมัติงานแล้ว"); } }, pi("check", 13), "อนุมัติ"),
          h("button", { type: "button", class: "msg-act warn", onClick: () => { reopenTask(t.id); ctx.toast && ctx.toast("ตีกลับงานแล้ว"); } }, pi("reply", 13), "ตีกลับ"),
        ),
      ),
    )),
  );
}

/* ---------------- ที่ฉันส่ง ---------------- */
function sentSection(ctx, me, sent, overdue) {
  const wrap = h("div", { class: "stack", style: { gap: "14px" } });
  if (overdue.length) {
    wrap.appendChild(h("div", { class: "overline", style: { color: "var(--danger)" } }, "เกินกำหนด " + overdue.length + " งาน"));
  }
  if (!sent.length) { wrap.appendChild(emptyCard("ยังไม่ได้ส่งอะไร", "กด “สร้างรายการใหม่” เพื่อแจ้งหรือมอบงาน")); return wrap; }
  const list = sent.slice().sort((a, b) => (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0));
  wrap.appendChild(h("div", { class: "card", style: { padding: "6px 0" } },
    list.map((t, i) => {
      const k = kindLabel(t);
      const st = t.status === "done" ? ["เสร็จ", "badge-green"] : t.status === "submitted" ? ["รอตรวจ", "badge-yellow"] : isOverdue(t) ? ["เกินกำหนด", "badge-red"] : ["ค้าง", "badge"];
      return h("div", { class: "msg-row", style: { borderBottom: i < list.length - 1 ? "1px solid var(--border-soft)" : "none" } },
        h("span", { class: "catic " + k.c }, pi(k.ic, 18)),
        h("div", { class: "msg-main" },
          h("span", { class: "msg-title" }, t.title),
          h("div", { class: "msg-from" }, "ถึง " + nameOf(t.assignee_id) + " · " + levelInfo(levelOfUser(t.assignee_id)).label),
          h("div", { class: "msg-chips" }, h("span", { class: "badge " + st[1] }, st[0])),
        ),
        h("button", { type: "button", class: "ic-edit", style: { border: 0, background: "transparent", color: "var(--faint)" }, "aria-label": "ลบ", onClick: () => { removeTask(t.id); ctx.toast && ctx.toast("ลบรายการแล้ว"); } }, pi("trash", 15)),
      );
    }),
  ));
  return wrap;
}

/* ---------------- โน้ตส่วนตัว ---------------- */
function noteRow(ctx, t, divider) {
  const done = t.status === "done";
  return h("div", { class: "msg-row" + (done ? " done" : ""), style: { borderBottom: divider ? "1px solid var(--border-soft)" : "none" } },
    h("button", { type: "button", class: "task-check" + (done ? " on" : ""), "aria-label": "เสร็จ", onClick: () => setTaskStatus(t.id, done ? "open" : "done") }, done ? pi("check", 14) : null),
    h("div", { class: "msg-main" },
      h("span", { class: "msg-title" }, t.title),
      t.detail && h("div", { class: "msg-detail" }, t.detail),
    ),
    h("button", { type: "button", class: "ic-edit", style: { border: 0, background: "transparent", color: "var(--faint)" }, "aria-label": "ลบ", onClick: () => removeTask(t.id) }, pi("trash", 15)),
  );
}

function addNoteBar(ctx, me) {
  const inp = h("input", { class: "input", type: "text", placeholder: "จดโน้ตเตือนตัวเอง…" });
  const add = () => {
    const v = inp.value.trim(); if (!v) return;
    addTask({ assignee_id: me.id, assigner_id: me.id, title: v, kind: "note" });
    ctx.toast && ctx.toast("บันทึกโน้ตแล้ว");
  };
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
  return h("div", { class: "rowflex", style: { gap: "8px" } },
    inp,
    h("button", { type: "button", class: "btn", style: { flex: "none" }, onClick: add }, pi("plus", 16), "เพิ่ม"),
  );
}

/* ---------------- helpers ---------------- */
function emptyCard(title, sub) {
  return h("div", { class: "card", style: { textAlign: "center", padding: "26px 16px" } },
    mascot(48, { spark: true }),
    h("div", { style: { fontWeight: 800, fontSize: "14.5px", marginTop: "8px" } }, title),
    h("div", { style: { fontSize: "12.5px", color: "var(--muted)", marginTop: "2px" } }, sub),
  );
}

/* ---------------- สร้างรายการใหม่ (compose) ---------------- */
function newDraft(me) {
  return { kind: "notice", to: new Set(), title: "", detail: "", due: null, urgent: false, manual: "" };
}

function renderSheet(root, ctx, me) {
  const layer = root._sheet;
  if (!layer) return;
  layer.replaceChildren();
  if (MS.compose) layer.appendChild(sheet({ onClose: () => { MS.compose = null; renderSheet(root, ctx, me); }, children: composeBody(root, ctx, me) }));
}

function composeBody(root, ctx, me) {
  const d = MS.compose;
  const recips = recipientsFor(me);
  const groups = recipientGroups(me);

  const titleIn = h("input", { class: "input", type: "text", value: d.title, placeholder: d.kind === "task" ? "งานที่ต้องทำ เช่น เช็คสต๊อกไก่" : "หัวข้อข้อความ เช่น เปิดร้านสายพรุ่งนี้" });
  titleIn.addEventListener("input", () => { d.title = titleIn.value; });
  const detailIn = h("input", { class: "input", type: "text", value: d.detail, placeholder: "รายละเอียดเพิ่มเติม (ไม่บังคับ)" });
  detailIn.addEventListener("input", () => { d.detail = detailIn.value; });

  // chip ผู้รับ (เลือกได้หลายคน) — เฉพาะคนที่ส่งได้จริง
  const recipWrap = h("div", { class: "recip-wrap" });
  function paintRecips() {
    recipWrap.replaceChildren(
      ...groups.map((g) => {
        const all = g.ids.every((id) => d.to.has(id));
        return h("button", { type: "button", class: "recip-group" + (all ? " on" : ""), onClick: () => { if (all) g.ids.forEach((id) => d.to.delete(id)); else g.ids.forEach((id) => d.to.add(id)); paintRecips(); } }, levelInfo(g.key).label + "ทุกคน");
      }),
      ...recips.map((u) => {
        const on = d.to.has(u.id);
        return h("button", { type: "button", class: "recip-chip" + (on ? " on" : ""), onClick: () => { on ? d.to.delete(u.id) : d.to.add(u.id); paintRecips(); } },
          h("span", { class: "rc-dot lvl-" + u.level }), u.name,
          h("span", { class: "rc-lvl" }, levelInfo(u.level).label));
      }),
    );
  }
  paintRecips();

  const typeSeg = seg({
    value: d.kind, grow: true,
    options: [{ v: "notice", t: "แจ้งให้ทราบ" }, { v: "task", t: "คำสั่งติดตามผล" }],
    onChange: (v) => { d.kind = v; renderSheet(root, ctx, me); },
  });

  const children = [
    h("h2", { style: { font: "var(--h2)", textAlign: "center", margin: "2px 0 0" } }, "สร้างรายการใหม่"),
    h("div", null, h("div", { class: "field-label", style: { marginBottom: "6px" } }, "ประเภท"), typeSeg),
    h("div", null,
      h("div", { class: "field-label", style: { marginBottom: "6px" } }, "ส่งถึง (เลือกได้เฉพาะทีมที่คุณดูแล)"),
      recipWrap,
    ),
    h("label", { class: "field", style: { margin: 0 } }, h("span", { class: "field-label" }, d.kind === "task" ? "งานที่มอบ" : "หัวข้อ"), titleIn),
    h("label", { class: "field", style: { margin: 0 } }, h("span", { class: "field-label" }, "รายละเอียด"), detailIn),
  ];

  if (d.kind === "task") {
    children.push(h("div", null,
      h("div", { class: "field-label", style: { marginBottom: "6px" } }, "ครบกำหนด"),
      seg({ value: String(d.due), grow: true, options: [{ v: "null", t: "ไม่กำหนด" }, { v: String(TODAY.d), t: "วันนี้" }, { v: String(TODAY.d + 1), t: "พรุ่งนี้" }], onChange: (v) => { d.due = v === "null" ? null : parseInt(v, 10); } }),
    ));
    const manualSel = h("select", { class: "input" },
      h("option", { value: "" }, "— ไม่ผูกคู่มือ —"),
      MANUAL.map((m) => h("option", { value: m.id, selected: d.manual === m.id }, m.name)),
    );
    manualSel.addEventListener("change", () => { d.manual = manualSel.value; });
    children.push(h("div", { class: "card split", style: { padding: "10px 14px" } },
      h("span", { style: { fontSize: "13.5px", fontWeight: 600 } }, "ทำเครื่องหมายงานด่วน"),
      toggle(!!d.urgent, (v) => { d.urgent = v; }),
    ));
    children.push(h("label", { class: "field", style: { margin: 0 } }, h("span", { class: "field-label" }, "ผูกหัวข้อคู่มือ (ไม่บังคับ)"), manualSel));
  }

  function send() {
    const title = (d.title || "").trim();
    if (!d.to.size) { ctx.toast && ctx.toast("เลือกผู้รับอย่างน้อย 1 คน"); return; }
    if (!title) { ctx.toast && ctx.toast(d.kind === "task" ? "กรอกชื่องานก่อน" : "กรอกหัวข้อก่อน"); return; }
    const recipN = d.to.size;
    MS.compose = null;   // ปิดชีตก่อน เพื่อให้ bumpData จาก addTask วาดหน้าใหม่แบบไม่มีชีตค้าง
    [...d.to].forEach((id) => addTask({
      assignee_id: id, assigner_id: me.id, title, detail: d.detail.trim(),
      kind: d.kind, manual_ref: d.kind === "task" ? (d.manual || null) : null,
      due: d.kind === "task" ? d.due : null, urgent: d.kind === "task" ? !!d.urgent : false,
    }));
    ctx.toast && ctx.toast(d.kind === "task" ? "มอบหมายงานแล้ว · " + recipN + " คน" : "ส่งข้อความแล้ว · " + recipN + " คน");
  }

  children.push(h("div", { class: "rowflex", style: { gap: "10px", marginTop: "2px" } },
    h("button", { type: "button", class: "btn btn-block", onClick: () => { MS.compose = null; renderSheet(root, ctx, me); } }, "ยกเลิก"),
    h("button", { type: "button", class: "btn btn-primary btn-block", onClick: send }, pi("send", 16), "ส่ง"),
  ));

  return h("div", { class: "stack", style: { gap: "14px" } }, ...children);
}
