// ============================================================
// pages/reportback.js — "รายงานกลับ" — สรุปการทำงานของระบบ + การเรียนรู้ของโมเดล
//   • 6 ขั้นตอนที่ระบบทำให้ (สูตรขาย · ลำดับข้อมูล · ข้าว ×1.5 · ไลบรารีสูตร · error+model · เตรียม/สั่ง)
//   • สถิติโมเดลจริง: นับรายการที่พยากรณ์ได้ + MAPE/WMAPE เฉลี่ยจาก forecastItem (สูตรเดียวทั้งแอป)
// ctx = { go, back, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note } from "../components/components.js";
import { chick, cic } from "../components/mascot.js";
import { items } from "../data/store.js";
import { todayISO } from "../utils/usage.js";
import { forecastItem, getCfg } from "../forecast/formulaLibrary.js";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function fmtBE(iso) {
  const d = new Date(iso + "T00:00:00");
  const MON = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return d.getDate() + " " + MON[d.getMonth()] + " " + (d.getFullYear() + 543);
}

const STEPS = [
  { ic: "clipboard", color: "#E0457B", title: "สูตรคำนวณปริมาณการขาย + ลำดับแหล่งข้อมูล", desc: "ขาย = สต๊อกก่อนหน้า + รับของ − ปัจจุบัน − ของเสีย ± ปรับยอด · ไม่มีนับ → กรอกเอง → ค่าเฉลี่ย" },
  { ic: "calculator", color: "#B07BD8", title: "การคำนวณข้าว ×1.5 · ไรซ์เบอรี่/หอมมะลิ", desc: "อาหารขาย(ข้าวสุก) × อัตราส่วน = ข้าวดิบ แล้วแบ่งสัดส่วนตามที่ตั้งค่า" },
  { ic: "recipe", color: "#E89A2B", title: "ไลบรารีสูตร: เลือก / ปรับ / กำหนดช่วงวัน / เพิ่มสูตร", desc: "Normal · Event · ค่าเฉลี่ย · ถ่วงน้ำหนักวันเดียวกัน — ใช้เฉพาะวันร้านเปิด" },
  { ic: "warning", color: "#5B9BD8", title: "เก็บ error + ปรับปรุง model อัตโนมัติ", desc: "วัด MAPE/WMAPE จาก backtest แล้วดึง bias กลับทีละน้อย (cap ±8%) กัน overfit" },
  { ic: "veggiebox", color: "#5BB87E", title: "หน้าเตรียมของ (FIFO) + หน้าสั่งของ", desc: "ตารางจัดกลุ่มตามหมวด · ตัดล็อตเก่าสุดก่อน · สั่งของตามความจุตู้ + รอบส่ง" },
  { ic: "database", color: "#8A7FD0", title: "ทุกหน้าลิงก์ข้อมูลกลางชุดเดียว", desc: "items / สต๊อก / ล็อต FIFO อ่านจากแหล่งเดียว — แก้ที่เดียว เปลี่ยนทุกหน้า" },
];

export function reportBackScreen(ctx) {
  const { back, toast } = ctx;
  const root = h("div", { class: "page-wrap", "data-screen-label": "reportback" });

  const rows = (items() || []).filter((it) => it.isActive !== false).map((it) => forecastItem(it.id, todayISO())).filter(Boolean);
  const withErr = rows.filter((r) => !r.learning && r.mape != null);
  const mape = withErr.length ? r2(mean(withErr.map((r) => r.mape))) : null;
  const wmape = withErr.length ? r2(mean(withErr.map((r) => r.wmape))) : null;
  const dataPts = rows.reduce((s, r) => s + ((r.n && r.n.total) || 0), 0);
  const learning = withErr.length < 5;

  const stepCard = (s, i) => h("div", { class: "rb-step" },
    h("span", { class: "rb-no", style: { color: s.color, borderColor: s.color } }, String(i + 1)),
    h("span", { class: "rb-step-ic" }, cic(s.ic, 30)),
    h("div", { class: "rb-step-main" }, h("div", { class: "rb-step-t" }, s.title), h("div", { class: "rb-step-d" }, s.desc)),
    h("span", { class: "rb-done" }, pi("check", 13), "สำเร็จ"));

  const stat = (ic, label, val, sub, color) => h("div", { class: "rb-stat" },
    cic(ic, 24), h("div", { class: "rb-stat-v", style: color ? { color } : null }, val), h("div", { class: "rb-stat-k" }, label), sub ? h("div", { class: "rb-stat-s" }, sub) : null);

  const expBtn = (cls, ic, t, sub) => h("button", { type: "button", class: "rb-exp " + cls, onClick: () => toast("เดโม — " + t) },
    pi(ic, 16), h("div", null, h("b", null, t), h("span", null, sub)));

  root.replaceChildren(
    hdr({ title: "รายงานกลับ", sub: "สรุปการทำงานของระบบ + ผลลัพธ์", onBack: back, right: h("span", { class: "catic helper-ic-violet" }, pi("doc", 18)) }),
    h("div", { class: "page stack" },
      h("div", { class: "rb-hero" },
        chick(76, "present", { float: true }),
        h("div", { style: { flex: 1, minWidth: 0 } },
          h("div", { class: "rb-hero-badge" }, "สรุปสิ่งที่ระบบทำให้"),
          h("div", { class: "rb-hero-txt" }, "ระบบทำงานครบทุกขั้นตอน ช่วยวางแผนสต๊อกแม่นขึ้น ลดของเสีย เพิ่มกำไรอย่างยั่งยืน 💗")),
        cic("veggiebox", 46)),

      h("div", { class: "rb-steps" }, STEPS.map(stepCard)),

      h("div", { class: "card rb-model" },
        h("div", { class: "rowflex", style: { gap: "7px", marginBottom: "12px" } }, cic("growth", 22), h("b", { style: { fontSize: "15px", color: "var(--primary-deep)" } }, "สถานะการเรียนรู้ของโมเดล")),
        h("div", { class: "rb-stat-grid" },
          stat("linechart", "พยากรณ์ได้", rows.length + " รายการ", "ในรอบที่เลือก"),
          stat("calendar-check", "มีค่า error", withErr.length + " รายการ", "เทียบของจริงแล้ว"),
          stat("target", "ค่าเฉลี่ย Error", mape == null ? "—" : mape + "%", wmape == null ? "กำลังเก็บ" : "WMAPE " + wmape + "%", "#E0457B"),
          stat("warning", "สถานะ", learning ? "กำลังเรียนรู้" : "ปรับต่อเนื่อง", dataPts + " จุดข้อมูล", "#B07BD8")),
        h("div", { class: "rb-model-note" }, cic("clipboard", 16), h("span", null, "อัปเดตล่าสุด ", h("b", null, fmtBE(todayISO())), " · โมเดลปรับ bias ทีละน้อยจาก error เพื่อไม่ให้ overfit"))),

      h("div", { class: "card" },
        h("div", { class: "rowflex", style: { gap: "7px", marginBottom: "11px" } }, cic("cloud-upload", 20), h("b", { style: { fontSize: "15px", color: "var(--primary-deep)" } }, "ส่งออกรายงานและแชร์")),
        h("div", { class: "rb-exp-grid" },
          expBtn("rose", "box", "ส่งออกรายงาน", "CSV / Excel / PDF"),
          expBtn("blue", "doc", "ดูรายละเอียด", "รายงานเชิงลึก"),
          expBtn("green", "users", "แชร์ให้ทีม", "ส่งลิงก์รายงาน"))),

      note(["รายงานนี้สรุปจาก ", h("b", null, "ข้อมูลกลางจริง"), " + สูตรพยากรณ์ที่ใช้งานอยู่ · ค่า error เฉลี่ยจากทุกรายการที่เทียบกับยอดจริงแล้ว"], { iconName: "doc" }),
    ),
  );
  return root;
}
