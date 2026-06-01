/* ============================================================
   pages/mytasks.js — งานของฉัน + สมุดโน้ตพนักงาน
   พนักงานมีการ์ดงาน (หัวหน้าเพิ่มให้/เพิ่มเอง) + โน้ตอิสระ
   ============================================================ */
import { state } from '../state.js';
import { currentUser, can } from '../auth.js';
import { pageHead, esc, icon } from '../components.js';

export default {
  render() {
    const u = currentUser();
    const tasks = state.db.tasks.filter((t) => t.assignedTo === u.id);
    const notes = state.db.notes.filter((n) => n.userId === u.id);

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'งานของฉัน & โน้ต', desc: 'การ์ดงานที่ได้รับมอบหมาย และสมุดจดส่วนตัว (สูตร ไอเดีย เตือนความจำ)', actions: `<button class="btn btn-outline btn-sm">${icon('plus', 16)} เพิ่มงานเอง</button><button class="btn btn-primary">${icon('note', 16)} โน้ตใหม่</button>` })}

      <div class="grid" style="grid-template-columns:1.3fr 1fr">
        <div>
          <div class="section-title" style="margin-bottom:14px">การ์ดงาน (${tasks.length})</div>
          <div class="grid" style="gap:14px">
            ${tasks.map((t) => `<div class="card card-pad" style="border-left:3px solid ${t.done ? 'var(--basil-600)' : 'var(--carrot)'}">
              <div class="row" style="justify-content:space-between;align-items:flex-start">
                <div class="row" style="align-items:flex-start"><button class="btn btn-ghost btn-sm" style="padding:2px;width:26px;height:26px;border:1.5px solid ${t.done ? 'var(--basil-600)' : 'var(--line-2)'};border-radius:7px;color:var(--basil-600)">${t.done ? icon('check', 15) : ''}</button>
                <div><div class="li-t" style="${t.done ? 'text-decoration:line-through;color:var(--ink-3)' : ''}">${esc(t.title)}</div><div class="li-s" style="margin-top:3px">${esc(t.detail)}</div></div></div>
                <span class="pill ${t.done ? 'pill-green' : 'pill-orange'}">${t.done ? 'เสร็จ' : 'ค้าง'}</span>
              </div>
              <div class="row" style="justify-content:space-between;margin-top:12px;color:var(--ink-3);font-size:12px"><span>${icon('user', 13)} โดย ${esc(state.db.users.find((x) => x.id === t.assignedBy)?.name || '')}</span><span>${icon('clock', 13)} ${t.due}</span></div>
            </div>`).join('') || '<div class="empty card card-pad">ยังไม่มีงาน</div>'}
          </div>
        </div>

        <div>
          <div class="section-title" style="margin-bottom:14px">สมุดโน้ต</div>
          <div class="grid" style="gap:14px">
            ${notes.map((n) => `<div class="card card-pad" style="background:linear-gradient(180deg,#fffdf5,var(--cream))">
              <div class="row" style="justify-content:space-between"><div class="li-t">${n.pinned ? icon('pin', 15) + ' ' : ''}${esc(n.title)}</div><span class="li-s">${n.updated}</span></div>
              <div class="ds-body" style="font-size:14px;margin-top:8px">${esc(n.body)}</div>
            </div>`).join('')}
            <div class="card card-pad" style="border-style:dashed;text-align:center;color:var(--ink-3);cursor:pointer">${icon('plus', 22)}<div class="li-t" style="margin-top:6px">โน้ตใหม่</div><div class="li-s">เครื่องมือจัดรูปแบบอิสระ (ฟังก์ชันถัดไป)</div></div>
          </div>
        </div>
      </div>
    </div>`;
  },
};
