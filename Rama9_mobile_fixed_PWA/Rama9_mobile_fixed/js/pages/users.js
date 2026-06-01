/* ============================================================
   pages/users.js — ฟังก์ชัน 1: จัดการผู้ใช้ + ประกาศ
   ออกแบบให้ "เท่ากันทุกคน" — ไม่โชว์ตำแหน่ง/ลำดับชั้น
   (สิทธิ์ยังทำงานเบื้องหลังตาม role แต่ไม่แสดงเป็นชั้นยศ)
   ============================================================ */
import { state } from '../state.js';
import { currentUser, can } from '../auth.js';
import { pageHead, esc, mockTag, icon } from '../components.js';

export default {
  render() {
    const me = currentUser();
    const users = state.db.users;
    // สิทธิ์แก้ไข (เบื้องหลัง) — ไม่แสดงเป็นลำดับชั้นบนหน้าจอ
    const canEditTarget = (t) => {
      if (me.isSuperOwner) return true;
      if (me.role === 'owner') return t.role !== 'owner';
      if (me.role === 'supervisor') return t.role === 'employee';
      return false;
    };

    const cards = users.map((u) => {
      const editable = canEditTarget(u);
      const isMe = u.id === me.id;
      return `<div class="card card-pad" style="${u.blocked ? 'opacity:.6;' : ''}">
        <div class="row" style="gap:14px">
          <span style="width:52px;height:52px;border-radius:999px;background:var(--cream);display:grid;place-items:center;font-size:26px;flex-shrink:0;border:1px solid var(--line)">${u.avatar}</span>
          <div style="flex:1;min-width:0">
            <div class="row" style="gap:8px"><span class="li-t" style="font-size:16px">${esc(u.name)}</span>${isMe ? '<span class="pill pill-gray" style="font-size:10px">คุณ</span>' : ''}</div>
            <div class="li-s">${u.blocked ? 'ถูกระงับการใช้งาน' : 'ใช้งานอยู่'} · เข้าร่วม ${u.joined}</div>
          </div>
          ${u.blocked ? `<span class="pill pill-red">ระงับ</span>` : `<span class="pill pill-green">${icon('check', 12)} ใช้งาน</span>`}
        </div>
        ${editable && !isMe ? `<div class="row" style="gap:8px;margin-top:16px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm">${icon('edit', 15)} แก้ไขชื่อ</button>
          <button class="btn btn-outline btn-sm">${icon('lock', 15)} เปลี่ยนรหัส</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--chili);margin-left:auto">${icon(u.blocked ? 'refresh' : 'x', 15)} ${u.blocked ? 'ปลดระงับ' : 'ระงับ'}</button>
        </div>` : `<div class="row" style="margin-top:16px;gap:8px">
          ${isMe && u.canChangeOwnPassword ? `<button class="btn btn-outline btn-sm">${icon('lock', 15)} เปลี่ยนรหัสของฉัน</button>` : ''}
          ${!isMe && !editable ? `<div class="li-s">${icon('lock', 13)} จัดการโดยแอดมิน</div>` : ''}
        </div>`}
      </div>`;
    }).join('');

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'ผู้ใช้', desc: 'จัดการบัญชีทีมงาน — แก้ชื่อ เปลี่ยนรหัส หรือระงับการใช้งาน', actions: `<button class="btn btn-primary">${icon('plus', 18)} เพิ่มผู้ใช้</button>` })}

      ${can.postAnnouncement() ? `<div class="card card-pad" style="margin-bottom:20px;border-left:3px solid var(--carrot)">
        <div class="row" style="margin-bottom:10px;gap:10px"><span style="color:var(--carrot)">${icon('megaphone', 20)}</span><div class="section-title">ประกาศข้อความวิ่ง</div></div>
        <div class="row" style="gap:10px;flex-wrap:wrap"><input class="input" style="flex:1;min-width:200px" placeholder="พิมพ์ข้อความประกาศ… (จะวิ่งบนแถบบนสุดของแอป)" value="${esc(state.db.announcements[0]?.text || '')}"><button class="btn btn-primary">ประกาศ</button></div>
      </div>` : ''}

      <div class="row" style="justify-content:space-between;margin-bottom:14px">
        <div class="section-title">ทีมงาน · ${users.length} คน</div>${mockTag('CRUD จริงในฟังก์ชัน 1')}
      </div>
      <div class="grid cols-2">${cards}
        <div class="card card-pad" style="border-style:dashed;display:grid;place-items:center;text-align:center;color:var(--ink-3);cursor:pointer;min-height:120px">
          <div>${icon('plus', 26)}<div class="li-t" style="margin-top:6px">เพิ่มผู้ใช้ใหม่</div></div>
        </div>
      </div>
    </div>`;
  },
};
