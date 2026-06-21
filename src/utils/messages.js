// ============================================================
// utils/messages.js — ตรรกะ "งานและข้อความ" ตามลำดับชั้น (per role)
// ------------------------------------------------------------
// แหล่งข้อมูลเดียว: data/store (tasksRows / users) — ฟังก์ชันล้วน (pure-ish)
// ใช้ทั้งหน้าแรก (home card / mail badge) และหน้า งานและข้อความ (messages page)
//
// ระดับ (จาก authService): owner > lead > staff
//   • ส่ง/มอบหมายได้เฉพาะคนที่ "ต่ำกว่า" ตัวเอง
//   • staff ส่งให้คนอื่นไม่ได้ (ทำได้แค่รับ/รับทราบ/ทำงาน/โน้ตส่วนตัว)
// ============================================================

import { tasksRows, users } from "../data/store.js";
import { rankOf, levelInfo } from "../services/authService.js";
import { TODAY } from "../data/seed.js";

export const nameOf = (id) => {
  const u = users().find((x) => x.id === id);
  return u ? u.name : "—";
};
export const levelOfUser = (id) => {
  const u = users().find((x) => x.id === id);
  return u ? u.level : "staff";
};

// ---- สิทธิ์การส่ง ----
export const canCompose = (me) => !!me && (me.level === "owner" || me.level === "lead");

// ผู้รับที่ "ส่งได้จริง" เท่านั้น (ต่ำกว่าผู้ส่ง) — owner→lead+staff · lead→staff · staff→[]
export function recipientsFor(me) {
  if (!me) return [];
  const myRank = rankOf(me);
  return users()
    .filter((u) => !u.blocked && rankOf(u) < myRank)
    .sort((a, b) => rankOf(b) - rankOf(a) || a.name.localeCompare(b.name, "th"));
}
// กลุ่มลัด ("หัวหน้าทุกคน" / "พนักงานทุกคน") — เฉพาะระดับที่ส่งได้
export function recipientGroups(me) {
  const list = recipientsFor(me);
  const groups = [];
  ["lead", "staff"].forEach((lv) => {
    const ids = list.filter((u) => u.level === lv).map((u) => u.id);
    if (ids.length > 1) groups.push({ key: lv, label: levelInfo(lv).label + "ทุกคน", ids });
  });
  return groups;
}

// ---- สถานะงาน ----
const isTask = (t) => t.kind === "task";
const isNotice = (t) => t.kind === "notice";
const isNote = (t) => t.kind === "note";
const isOverdue = (t) => isTask(t) && t.status !== "done" && t.due != null && t.due < TODAY.d;
const isDueToday = (t) => isTask(t) && t.status !== "done" && t.due === TODAY.d;
export { isTask, isNotice, isNote, isOverdue, isDueToday };

// ---- กล่องต่าง ๆ ของผู้ใช้ ----
// เข้า (ส่งมาถึงฉัน) — ไม่รวมโน้ตส่วนตัว
export function inboxFor(me) {
  if (!me) return [];
  return tasksRows().filter((t) => t.assignee_id === me.id && t.assigner_id !== me.id);
}
// โน้ตส่วนตัว
export function notesFor(me) {
  if (!me) return [];
  return tasksRows().filter((t) => isNote(t) && t.assignee_id === me.id);
}
// ที่ฉันส่ง (มอบ/แจ้งให้คนอื่น)
export function sentBy(me) {
  if (!me) return [];
  return tasksRows().filter((t) => t.assigner_id === me.id && t.assignee_id !== me.id);
}
// งานรอตรวจ (พนักงานกดเสร็จแล้ว รออนุมัติ)
//   owner = เห็นทุกงานที่ submitted ในร้าน · lead = เฉพาะงานที่ตัวเองสั่ง
export function pendingReviewFor(me) {
  if (!me) return [];
  return tasksRows().filter((t) =>
    isTask(t) && t.status === "submitted" &&
    (me.level === "owner" ? true : t.assigner_id === me.id));
}
// งานเกินกำหนด ที่ฉันสั่ง (ติดตามผล)
export function overdueAssignedBy(me) {
  if (!me) return [];
  return tasksRows().filter((t) => t.assigner_id === me.id && isOverdue(t));
}

// ---- สรุปสำหรับ badge ไอคอนจดหมาย (เฉพาะ "เรื่องที่ต้องจัดการ") ----
export function actionCount(me) {
  if (!me) return 0;
  if (me.level === "owner") return pendingReviewFor(me).length + overdueAssignedBy(me).length;
  if (me.level === "lead") {
    const inbox = inboxFor(me);
    const newMsg = inbox.filter((t) => isNotice(t) && !t.acked).length;
    const myTasks = inbox.filter((t) => isTask(t) && t.status === "open" && (t.urgent || isOverdue(t) || isDueToday(t))).length;
    return newMsg + myTasks + pendingReviewFor(me).length + overdueAssignedBy(me).length;
  }
  // staff
  const inbox = inboxFor(me);
  const newMsg = inbox.filter((t) => isNotice(t) && !t.acked).length;
  const tasks = inbox.filter((t) => isTask(t) && t.status === "open" && (t.urgent || isOverdue(t) || isDueToday(t) || t.bounced)).length;
  return newMsg + tasks;
}

// ---- สรุปสำหรับการ์ดหน้าแรก (lead / staff) ----
// คืน { show, items:[{...}], countLine, headline:{tone,icon,title,sub} } หรือ show:false
export function homeCardSummary(me) {
  if (!me) return { show: false };
  const inbox = inboxFor(me);
  const newNotices = inbox.filter((t) => isNotice(t) && !t.acked);
  const openTasks = inbox.filter((t) => isTask(t) && t.status === "open");
  const urgentTasks = openTasks.filter((t) => t.urgent || isOverdue(t));
  const dueTodayTasks = openTasks.filter((t) => isDueToday(t) && !t.urgent && !isOverdue(t));
  const bounced = openTasks.filter((t) => t.bounced);
  const review = pendingReviewFor(me);
  const overdueMine = overdueAssignedBy(me);

  // ลำดับความสำคัญในการเลือก "หัวข้อเด่น"
  const pick =
    newNotices[0] ? { t: newNotices[0], tone: "msg" } :
    urgentTasks[0] ? { t: urgentTasks[0], tone: "urgent" } :
    bounced[0] ? { t: bounced[0], tone: "bounced" } :
    (me.level === "lead" && review[0]) ? { t: review[0], tone: "review" } :
    dueTodayTasks[0] ? { t: dueTodayTasks[0], tone: "due" } :
    overdueMine[0] ? { t: overdueMine[0], tone: "overdueAssign" } :
    null;

  // จำนวนรวมที่ต้องจัดการ
  const counts = [];
  if (newNotices.length) counts.push(newNotices.length + " ข้อความใหม่");
  const taskActionable = urgentTasks.length + dueTodayTasks.length + bounced.length;
  if (taskActionable) counts.push(taskActionable + " งานด่วน/ใกล้ครบ");
  if (me.level === "lead" && review.length) counts.push(review.length + " งานรอตรวจ");
  if (overdueMine.length) counts.push(overdueMine.length + " งานเกินกำหนด");

  if (!pick && !counts.length) return { show: false };
  return { show: true, pick, countLine: counts.join(" · "), total: actionCount(me) };
}
