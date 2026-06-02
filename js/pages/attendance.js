/* ============================================================
   pages/attendance.js — ฟังก์ชัน 6: วันลา + คะแนนแปรผันยอดขาย
   เห็นได้: เจ้าของข้อมูลเอง + admin (หัวหน้าขึ้นไป)
   ============================================================ */
import { state } from '../state.js';
import { currentUser, can, levelOf } from '../auth.js';
import { pageHead, esc, mockTag, icon } from '../components.js';

export default {
  render() {
    const u = currentUser();
    const isAdmin = levelOf(u.role) >= 2;
    const users = state.db.users.filter((x) => x.role !== 'owner');
    // mock scores
    const scores = { u_oam: 96, u_user1: 88, u_user2: 100, u_su: 99 };

    const board = users.map((p) => {
      const sc = scores[p.id] ?? state.config.scoring.baseScore;
      const leaves = state.db.attendance.filter((a) => a.userId === p.id).length;
      const color = sc >= 95 ? 'var(--basil-600)' : sc >= 85 ? 'var(--carrot)' : 'var(--chili)';
      return `<div class="li">
        <div class="li-ico" style="background:var(--cream);font-size:20px">${p.avatar}</div>
        <div class="li-main"><div class="li-t">${esc(p.name)}</div><div class="li-s">ลา ${leaves} วัน · มาแทนเพื่อน +${state.config.scoring.extraScorePerCover * 2} คะแนน</div></div>
        <div style="text-align:right"><div class="data" style="font-size:24px;font-weight:600;color:${color}">${sc}</div><div class="li-s">คะแนน</div></div>
      </div>`;
    }).join('');

    return `<div class="content-inner fade-in">
      ${pageHead({ title: 'วันลา & คะแนนประสิทธิภาพ', desc: 'คะแนนปรับตามยอดขายวันที่ลา (ลาวันยอดสูง = หักหนักกว่า) · มาแทนเพื่อนได้คะแนนพิเศษ', actions: isAdmin ? `<button class="btn btn-primary">${icon('plus', 18)} บันทึกวันลา</button>` : '' })}

      <div class="grid" style="grid-template-columns:1fr 1.3fr">
        <div class="card card-pad">
          <div class="overline">${isAdmin ? 'Leaderboard' : 'คะแนนของฉัน'}</div>
          <div class="section-title" style="margin-bottom:14px">คะแนนประสิทธิภาพ</div>
          ${isAdmin ? board : `<div style="text-align:center;padding:18px 0">
            <div style="width:120px;height:120px;border-radius:999px;margin:0 auto;background:conic-gradient(var(--basil-600) ${(scores[u.id] || 90) * 3.6}deg, var(--cream-200) 0);display:grid;place-items:center">
              <div style="width:88px;height:88px;border-radius:999px;background:var(--paper);display:grid;place-items:center;box-shadow:var(--sh-1)"><div class="data" style="font-size:30px;font-weight:600;color:var(--basil-700)">${scores[u.id] || 90}</div></div>
            </div>
            <div class="li-s" style="margin-top:12px">คะแนนของคุณเดือนนี้</div></div>`}
        </div>

        <div class="card card-pad">
          <div class="row" style="justify-content:space-between"><div class="section-title">ปฏิทินวันลา</div>${mockTag('ต่อ logic ปรับคะแนนในฟังก์ชัน 6')}</div>
          <table class="tbl" style="margin-top:12px">
            <thead><tr><th>พนักงาน</th><th>วันที่</th><th>ประเภท</th><th>ยอดขายวันนั้น</th><th style="text-align:right">ผลต่อคะแนน</th></tr></thead>
            <tbody>${state.db.attendance.map((a) => `<tr>
              <td>${esc(state.db.users.find((x) => x.id === a.userId)?.name || '')}</td>
              <td data-label="วันที่" class="data">${a.date}</td>
              <td data-label="ประเภท"><span class="pill ${a.type === 'ลาป่วย' ? 'pill-orange' : 'pill-gray'}">${esc(a.type)}</span></td>
              <td data-label="ยอดขายวันนั้น" class="data">฿16,200</td>
              <td data-label="ผลต่อคะแนน" class="num data" style="color:var(--chili)">−4.2</td></tr>`).join('')}</tbody>
          </table>
          ${can.viewFinance() ? '' : `<div style="margin-top:12px" class="locked">${icon('lock', 16)} หน้านี้แสดงเฉพาะข้อมูลของคุณ และหัวหน้า/เจ้าของ</div>`}
        </div>
      </div>
    </div>`;
  },
};
