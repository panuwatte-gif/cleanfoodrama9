// ============================================================
// pages/grabassumptions.js — ตั้งค่ารายงาน Grab (ค่า assumption ข้อ G)
// ทุกช่องแก้ได้ · บันทึกทันทีที่พิมพ์ · ปุ่ม "คืนค่าเริ่มต้น" ต่อหมวด
// ============================================================
import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, seg } from "../components/components.js";
import { grabAssum, setGrabAssum, replaceGrabAssum, resetGrabAssum, GRAB_DEFAULTS } from "../data/grabAssumptions.js";
import { sendVsUse } from "../services/grabReportService.js";

export function grabAssumptionsScreen({ back, toast } = {}) {
  const page = h("div", { class: "page stack", style: { paddingBottom: "16px" } });

  // input ตัวเลขเล็ก บันทึกทันที
  function numIn(get, set, { w = "84px" } = {}) {
    const inp = h("input", { type: "text", inputMode: "decimal", value: String(get()),
      style: { width: w, textAlign: "right", padding: "7px 9px", border: "1.5px solid var(--border)", borderRadius: "10px", fontWeight: 700, fontVariantNumeric: "tabular-nums", background: "var(--surface)", color: "var(--text)" } });
    inp.addEventListener("input", () => { const s = inp.value.replace(/[^0-9.]/g, ""); if (s !== inp.value) inp.value = s; set(s === "" ? 0 : parseFloat(s)); });
    return inp;
  }
  function textIn(get, set, { w = "100%" } = {}) {
    const inp = h("input", { type: "text", value: String(get()),
      style: { width: w, padding: "7px 9px", border: "1.5px solid var(--border)", borderRadius: "10px", fontSize: "12.5px", background: "var(--surface)", color: "var(--text)" } });
    inp.addEventListener("input", () => set(inp.value));
    return inp;
  }
  const row = (label, ctrl, suffix, hint) => h("div", { class: "split", style: { padding: "8px 0", borderBottom: "1px solid var(--border-soft)", gap: "10px" } },
    h("div", { style: { flex: 1, minWidth: 0 } },
      h("div", { style: { fontSize: "13px", fontWeight: 600 } }, label),
      hint && h("div", { style: { fontSize: "10.5px", color: "var(--faint)" } }, hint)),
    h("div", { class: "rowflex", style: { gap: "6px", flex: "none", alignItems: "center" } }, ctrl,
      suffix && h("span", { style: { fontSize: "11.5px", color: "var(--muted)", minWidth: "30px" } }, suffix)));

  function sectionCard({ emoji, title, sub, section, children, tint = "soft-green" }) {
    return h("div", { class: "card more-card " + tint, style: { padding: "6px 16px 12px" } },
      h("div", { class: "split", style: { padding: "12px 2px 4px" } },
        h("div", null,
          h("div", { style: { fontWeight: 800, fontSize: "14px" } }, emoji + " " + title),
          sub && h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, sub)),
        h("button", { type: "button", class: "mini-btn", style: { flex: "none", whiteSpace: "nowrap" }, onClick: () => { resetGrabAssum(section); toast("คืนค่าเริ่มต้นหมวด \"" + title + "\" แล้ว"); paint(); } }, pi("refresh", 12), "คืนค่าเริ่มต้น")),
      ...children);
  }

  function paint() {
    const A = grabAssum();
    const S = (sec) => (patch) => { setGrabAssum(sec, patch); };
    page.replaceChildren(
      note(["ค่าเริ่มต้น = ", h("b", null, "ค่าจริงปัจจุบันของร้าน"), " — แก้แล้วมีผลกับรายงาน Grab และงบการเงินทันที"], { iconName: "info" }),

      sectionCard({
        emoji: "🛵", title: "แพลตฟอร์ม (% ของยอดขายสุทธิ)", sub: "ใช้เป็น fallback เดือนที่ไม่มีไฟล์จริง", section: "platform", tint: "soft-blue",
        children: [
          row("GP Grab", numIn(() => A.platform.gpPct, (v) => S("platform")({ gpPct: v })), "%"),
          row("VAT บน GP", numIn(() => A.platform.vatOnGpPct, (v) => S("platform")({ vatOnGpPct: v })), "%"),
          row("การตลาด / โปรร่วม", numIn(() => A.platform.mktPct, (v) => S("platform")({ mktPct: v })), "%"),
          row("Ads", numIn(() => A.platform.adsPct, (v) => S("platform")({ adsPct: v })), "%"),
          row("การปรับยอดอื่น", numIn(() => A.platform.adjPct, (v) => S("platform")({ adjPct: v })), "%"),
        ],
      }),

      sectionCard({
        emoji: "🍳", title: "ต้นทุนอาหาร & แพ็กเกจ", sub: "โหมดส่งสำเร็จ = ยอดจ่ายจริงต่อออเดอร์", section: "cost", tint: "soft-amber",
        children: [
          h("div", { style: { padding: "8px 0" } },
            seg({ value: A.cost.foodMode, grow: true, options: [{ v: "sent", t: "โหมดส่งสำเร็จ" }, { v: "raw", t: "โหมดวัตถุดิบสด+ซอส" }], onChange: (v) => { S("cost")({ foodMode: v }); paint(); } })),
          row("ต้นทุนอาหาร / ออเดอร์", numIn(() => A.cost.foodPerOrder, (v) => S("cost")({ foodPerOrder: v })), "บาท", "โหมดส่งสำเร็จ (ค่าจริง 63)"),
          row("ข้าว + แพ็กเกจ / ออเดอร์", numIn(() => A.cost.ricePackPerOrder, (v) => S("cost")({ ricePackPerOrder: v })), "บาท", "กล่อง+ถุง+ช้อน+ข้าว ≈ 13"),
          row("ซอส / จาน", numIn(() => A.cost.saucePerDish, (v) => S("cost")({ saucePerDish: v })), "บาท", "ใช้ในโหมดวัตถุดิบสด"),
          row("กะเพรา+เครื่องสด / จาน", numIn(() => A.cost.herbPerDish, (v) => S("cost")({ herbPerDish: v })), "บาท"),
          row("อัตราหุงข้าว (สุก÷สาร)", numIn(() => A.cost.riceCookRatio, (v) => S("cost")({ riceCookRatio: v })), "เท่า"),
          row("ข้าวไรซ์เบอรี่", numIn(() => A.cost.riceberryKg, (v) => S("cost")({ riceberryKg: v })), "฿/กก."),
          row("ข้าวหอมมะลิ", numIn(() => A.cost.jasmineKg, (v) => S("cost")({ jasmineKg: v })), "฿/กก."),
          row("ไข่ไก่", numIn(() => A.cost.eggEach, (v) => S("cost")({ eggEach: v })), "฿/ฟอง"),
        ],
      }),

      sectionCard({
        emoji: "🏠", title: "Fix cost (ผูกช่วงเวลา)", sub: "ค่าจริงปัจจุบัน = แชร์ค่าเช่า+พนักงานกับร้านข้างๆ ≈21,000/เดือน — เดือนย้อนหลังใช้ค่าของช่วงนั้นๆ ไม่ใช่ 50,000 ย้อนหลัง", section: "fix", tint: "soft-violet",
        children: [
          h("div", { style: { padding: "8px 0" } },
            seg({ value: A.fix.mode, grow: true, options: [{ v: "share", t: "ปัจจุบัน (แชร์)" }, { v: "solo", t: "อยู่เดี่ยว" }, { v: "custom", t: "กำหนดเอง" }], onChange: (v) => { S("fix")({ mode: v }); paint(); } })),
          row("ปัจจุบัน · มีร้านแชร์ค่าใช้จ่าย", numIn(() => A.fix.share, (v) => S("fix")({ share: v })), "฿/เดือน", "แชร์เช่า+พนักงาน · ไม่แชร์น้ำไฟ"),
          row("กรณีอยู่เดี่ยว (จ่ายเต็ม)", numIn(() => A.fix.solo, (v) => S("fix")({ solo: v })), "฿/เดือน", "เช่า14,000+เงินเดือน16,000+รายวัน12,000+น้ำไฟ4,500+บัญชี3,000"),
          row("กำหนดเอง (what-if)", numIn(() => A.fix.custom, (v) => S("fix")({ custom: v })), "฿/เดือน"),
          row("มื้อพนักงาน", numIn(() => A.fix.staffMeal, (v) => S("fix")({ staffMeal: v })), "฿/เดือน"),
          row("OT", numIn(() => A.fix.otHour, (v) => S("fix")({ otHour: v })), "฿/ชม."),
          row("ค่าส่งของ", numIn(() => A.fix.deliveryRound, (v) => S("fix")({ deliveryRound: v })), "฿/รอบ"),
        ],
      }),

      sectionCard({
        emoji: "🧾", title: "ภาษี (คิดขั้นบันไดตามจริง)", sub: "เลือกรูปแบบกิจการ — ใช้คำนวณภาษีประมาณการในงบทั้งปี", section: "tax", tint: "soft-blue",
        children: [
          h("div", { style: { padding: "8px 0" } },
            seg({ value: A.tax.form, grow: true, options: [{ v: "individual", t: "บุคคลธรรมดา" }, { v: "partnership", t: "หสม./คณะบุคคล" }, { v: "company", t: "นิติบุคคล SME" }], onChange: (v) => { S("tax")({ form: v }); paint(); } })),
          A.tax.form !== "company" && row("หักค่าใช้จ่ายเหมา", numIn(() => A.tax.lumpExpensePct, (v) => S("tax")({ lumpExpensePct: v })), "%", "เงินได้ 40(8) ร้านอาหาร = 60%"),
          A.tax.form === "individual" && row("ลดหย่อนส่วนตัว", numIn(() => A.tax.personalDeduction, (v) => S("tax")({ personalDeduction: v })), "บาท"),
          A.tax.form === "partnership" && row("ลดหย่อนหุ้นส่วนรวม", numIn(() => A.tax.partnerDeduction, (v) => S("tax")({ partnerDeduction: v })), "บาท", "สูงสุด 120,000"),
          A.tax.form !== "company" && row("ลดหย่อนอื่นๆ (กรอกเพิ่ม)", numIn(() => A.tax.extraDeduction, (v) => S("tax")({ extraDeduction: v })), "บาท", "ประกัน/กองทุน ฯลฯ"),
          h("div", { style: { fontSize: "11px", color: "var(--faint)", padding: "8px 0 4px" } }, "ขั้นบันได: 0-1.5แสน=0% · →5% ·10% ·15% ·20% ·25% ·30% ·35% · นิติบุคคล SME: 0% ถึง 3แสน · 15% ถึง 3ล้าน · 20% เกิน"),
        ],
      }),

      sectionCard({
        emoji: "📉", title: "ของหาย (คำนวณอัตโนมัติ — ไม่ต้องกรอก)", sub: "ค่าจริง = cross-check ส่งจริง vs ใช้ตามยอดขาย · กรอกเฉพาะเป้า what-if + เกณฑ์เตือน", section: "loss", tint: "soft-rose",
        children: [
          (() => { const sv = sendVsUse(); return h("div", { class: "split", style: { padding: "8px 0", borderBottom: "1px solid var(--border-soft)" } },
            h("div", null, h("div", { style: { fontSize: "13px", fontWeight: 600 } }, "ของหายปัจจุบัน (ค่าจริงจากระบบ)"), h("div", { style: { fontSize: "10.5px", color: "var(--faint)" } }, "จากรอบส่งล่าสุด — แก้ยอดส่งที่หมวด \"ยอดส่งวัตถุดิบ\"")),
            h("b", { class: "tnum", style: { fontSize: "16px", color: sv.warn ? "var(--danger,#C24040)" : "var(--primary-dark,#2E7D4F)" } }, sv.pctT + "%")); })(),
          row("เป้าคุมให้เหลือ (what-if)", numIn(() => A.loss.controlPct, (v) => S("loss")({ controlPct: v })), "%"),
          row("เกณฑ์เตือนผิดปกติ", numIn(() => A.loss.warnPct, (v) => S("loss")({ warnPct: v })), "%", "เกินนี้ → การ์ดแดงเตือนให้นับสต๊อก"),
        ],
      }),

      sectionCard({
        emoji: "🏷️", title: "ราคาขายส่ง (ตีมูลค่าของหาย)", sub: "บาท/กก. ต่อโปรตีน", section: "wholesale", tint: "soft-amber",
        children: Object.keys(A.wholesale).map((k) =>
          row(k, numIn(() => A.wholesale[k], (v) => S("wholesale")({ [k]: v })), "฿/กก.")),
      }),

      sectionCard({
        emoji: "🚚", title: "ยอดส่งวัตถุดิบรอบล่าสุด", sub: "กก.ที่ส่งเข้าครัว — ใช้เทียบ ส่งvsใช้ (อัปเดตทุกรอบส่ง)", section: "send", tint: "soft-teal",
        children: [
          h("div", { class: "rowflex", style: { gap: "8px", padding: "8px 0", borderBottom: "1px solid var(--border-soft)" } },
            h("span", { style: { fontSize: "12.5px", fontWeight: 600, flex: "none" } }, "ช่วงวันที่"),
            (() => { const i = h("input", { type: "date", value: A.send.from, style: { flex: 1, padding: "6px 8px", border: "1.5px solid var(--border)", borderRadius: "10px", background: "var(--surface)", color: "var(--text)", fontSize: "12px" } }); i.addEventListener("change", () => S("send")({ from: i.value })); return i; })(),
            h("span", { style: { color: "var(--faint)" } }, "–"),
            (() => { const i = h("input", { type: "date", value: A.send.to, style: { flex: 1, padding: "6px 8px", border: "1.5px solid var(--border)", borderRadius: "10px", background: "var(--surface)", color: "var(--text)", fontSize: "12px" } }); i.addEventListener("change", () => S("send")({ to: i.value })); return i; })()),
          ...Object.keys(A.send.kg).map((k) =>
            row(k, numIn(() => A.send.kg[k], (v) => { const kg = { ...grabAssum().send.kg, [k]: v }; S("send")({ kg }); }), "กก.")),
        ],
      }),

      sectionCard({
        emoji: "💧", title: "เงินจ่ายค่าอาหารจริงรายเดือน", sub: "cash basis — ใช้ในการ์ด Cashflow", section: "foodPaid", tint: "soft-blue",
        children: ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07"].map((ym) => {
          const M = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค."][+ym.slice(5)] + " 69";
          return row(M, numIn(() => A.foodPaid[ym] || 0, (v) => S("foodPaid")({ [ym]: v })), "บาท");
        }),
      }),

      sectionCard({
        emoji: "🗓️", title: "ช่วงวิเคราะห์ (segment)", sub: "แบ่งช่วงตามพฤติกรรมร้าน — เดือนใหม่หลังช่วงสุดท้ายจะเป็น \"ล่าสุด\" อัตโนมัติ", section: "segments", tint: "soft-violet",
        children: A.segments.map((s, i) => h("div", { style: { padding: "8px 0", borderBottom: "1px solid var(--border-soft)" } },
          h("div", { class: "rowflex", style: { gap: "7px", marginBottom: "5px" } },
            h("span", { style: { width: "10px", height: "10px", borderRadius: "50%", background: s.c, flex: "none" } }),
            h("b", { style: { fontSize: "12.5px" } }, s.id + " · " + s.name)),
          h("div", { class: "rowflex", style: { gap: "6px" } },
            (() => { const inp = h("input", { type: "date", value: s.from, style: { flex: 1, padding: "6px 8px", border: "1.5px solid var(--border)", borderRadius: "10px", background: "var(--surface)", color: "var(--text)", fontSize: "12px" } }); inp.addEventListener("change", () => { const segs = grabAssum().segments; segs[i] = { ...segs[i], from: inp.value }; replaceGrabAssum("segments", segs); }); return inp; })(),
            h("span", { style: { color: "var(--faint)" } }, "–"),
            (() => { const inp = h("input", { type: "date", value: s.to, style: { flex: 1, padding: "6px 8px", border: "1.5px solid var(--border)", borderRadius: "10px", background: "var(--surface)", color: "var(--text)", fontSize: "12px" } }); inp.addEventListener("change", () => { const segs = grabAssum().segments; segs[i] = { ...segs[i], to: inp.value }; replaceGrabAssum("segments", segs); }); return inp; })()))),
      }),

      sectionCard({
        emoji: "🥘", title: "กติกาแปลงชื่อเมนู → โปรตีน", sub: "เช็คตามลำดับบน→ล่าง · คั่นคำด้วย | · รองรับเมนูใหม่/LINE MAN", section: "proteinRules", tint: "soft-green",
        children: [
          ...A.proteinRules.map((r, i) => h("div", { class: "rowflex", style: { gap: "6px", padding: "6px 0", borderBottom: "1px solid var(--border-soft)" } },
            h("span", { class: "tnum", style: { fontSize: "11px", color: "var(--faint)", width: "14px", flex: "none" } }, i + 1),
            textIn(() => r.match, (v) => { const rs = grabAssum().proteinRules; rs[i] = { ...rs[i], match: v }; replaceGrabAssum("proteinRules", rs); }),
            h("span", { style: { color: "var(--faint)", flex: "none" } }, "→"),
            textIn(() => r.protein, (v) => { const rs = grabAssum().proteinRules; rs[i] = { ...rs[i], protein: v }; replaceGrabAssum("proteinRules", rs); }, { w: "108px" }),
            h("button", { type: "button", class: "hdr-icon", "aria-label": "ลบกติกา", style: { width: "28px", height: "28px" }, onClick: () => { const rs = grabAssum().proteinRules; rs.splice(i, 1); replaceGrabAssum("proteinRules", rs); paint(); } }, pi("x", 12)))),
          h("button", { type: "button", class: "btn btn-block", style: { marginTop: "8px" }, onClick: () => { const rs = grabAssum().proteinRules; rs.push({ match: "คำใหม่", protein: "อกไก่สับ" }); replaceGrabAssum("proteinRules", rs); paint(); } }, pi("plus", 14), "เพิ่มกติกา"),
        ],
      }),

      sectionCard({
        emoji: "🍚", title: "พอร์ชั่นต่อจาน (กรัมสุก)", sub: "S/M/L — ใช้คำนวณวัตถุดิบจากยอดขาย", section: "portions", tint: "soft-amber",
        children: ["S", "M", "L"].map((sz) => h("div", { class: "rowflex", style: { gap: "10px", padding: "8px 0", borderBottom: "1px solid var(--border-soft)" } },
          h("b", { style: { width: "20px", fontSize: "13px" } }, sz),
          h("span", { style: { fontSize: "12px", color: "var(--muted)" } }, "ข้าว"),
          numIn(() => A.portions[sz].rice, (v) => S("portions")({ [sz]: { ...grabAssum().portions[sz], rice: v } }), { w: "64px" }),
          h("span", { style: { fontSize: "12px", color: "var(--muted)" } }, "เนื้อ"),
          numIn(() => A.portions[sz].meat, (v) => S("portions")({ [sz]: { ...grabAssum().portions[sz], meat: v } }), { w: "64px" }),
          h("span", { style: { fontSize: "11px", color: "var(--faint)" } }, "กรัม"))),
      }),
    );
  }

  paint();
  return h("div", { class: "page-wrap", "data-screen-label": "grabassumptions" },
    hdr({ title: "ตั้งค่ารายงาน Grab", sub: "assumption ทุกตัว · บันทึกอัตโนมัติ", onBack: back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    page,
  );
}
