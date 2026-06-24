// ============================================================
// pages/income.js — บันทึกรายได้ (5 ช่องทาง + กันคีย์ซ้ำ + แก้ย้อนหลัง)
// พอร์ตจาก prototype2 IncomeScreen · netAmount = gross − (GP + Marketing)
// ช่องเลขอัปเดต live (cut/net) ไม่ paint ทั้งหน้า → ไม่เสีย focus
// ctx = { back, toast, day }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, qtyInput, emptyState, dateBar } from "../components/components.js";
import { storeChip } from "../components/layout.js";
import { fmt } from "../utils/formulas.js";
import { GP_PCT, TODAY } from "../data/seed.js";
import { incomeRows, saveIncomeRecord } from "../data/store.js";

// ช่องทางรายได้ (ตรงกับคีย์ GP_PCT) — รายการคงที่ ไม่ใช่ตัวเลขเดโม
const CHANNELS = ["Grab", "Lineman", "Shopee", "หน้าร้าน", "อื่นๆ"];

const bold = (t) => h("b", null, t);
const num = (v) => parseFloat(v || 0) || 0;
const ist = { day: TODAY.d, ch: "Grab", gross: "", gp: "", mkt: "", ctx: null };

export function incomeScreen(ctx) {
  ist.ctx = ctx;
  ist.day = ctx.day || TODAY.d;
  ist.ch = "Grab";
  loadExisting();
  const root = h("div", { class: "page-wrap", style: { display: "flex", flexDirection: "column", flex: 1 } });
  paint(root);
  return root;
}

// id ของบันทึก = วัน+ช่องทาง (เดือนเดียว) — บันทึกซ้ำวัน/ช่องทางเดิม = แก้ทับ
function recId(day, ch) { return "inc-" + day + "-" + ch; }
// รวมรายการรายได้จริงของวัน (จากที่บันทึกจริงเท่านั้น — ไม่มี seed ปลอม)
function mergedDay(day) {
  const out = {};
  for (const r of incomeRows()) if (r.day === day) out[r.ch] = { gross: r.gross, gp: r.gp || 0, mkt: r.mkt || 0, stored: true };
  return out;
}

function loadExisting() {
  const ex = mergedDay(ist.day)[ist.ch];
  ist.gross = ex ? String(ex.gross) : "";
  ist.gp = ex && ex.gp != null ? String(ex.gp) : "";
  ist.mkt = ex ? String(ex.mkt) : "";
}

function lnRow(l, v, c, { bold: b, indent } = {}) {
  return h("div", { class: "split", style: { padding: "3px 0", paddingLeft: indent ? "18px" : "0" } },
    h("span", { style: { fontSize: b ? "14px" : "12.5px", fontWeight: b ? 700 : indent ? 400 : 600, color: b ? "var(--text)" : "var(--muted)" } }, l),
    h("span", { class: "tnum", style: { fontWeight: b ? 800 : 600, fontSize: b ? "17px" : "13px", color: c || "var(--text)" } }, v),
  );
}

function paint(root) {
  const { back, toast, shopCtx } = ist.ctx;
  const dayLog = mergedDay(ist.day);
  const existing = dayLog[ist.ch];
  const gpPct = GP_PCT[ist.ch] ?? 0;

  // --- live derived nodes ---
  const cutVal = h("span", { class: "cut-line-val tnum", style: { fontWeight: 600, fontSize: "13px" } });
  const netVal = h("span", { class: "tnum", style: { fontWeight: 800, fontSize: "17px", color: "var(--primary-dark)" } });
  const grossIn = h("input", { type: "text", inputMode: "numeric", class: "input tnum", style: { fontSize: "22px", fontWeight: 700 }, placeholder: "0", value: ist.gross });
  const gpIn = qtyInput({ value: ist.gp, onChange: (v) => { ist.gp = v; recompute(); } });
  const mktIn = qtyInput({ value: ist.mkt, onChange: (v) => { ist.mkt = v; recompute(); } });
  const footBtn = h("button", { type: "button", class: "btn btn-primary btn-block" });

  const helperWrap = h("div", { style: { marginLeft: "18px", marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "6px" } });

  function recompute() {
    const g = num(ist.gross), gpv = num(ist.gp), mk = num(ist.mkt);
    const cut = gpv + mk, net = g - cut;
    cutVal.textContent = cut ? "−฿" + fmt(cut) : "—";
    cutVal.style.color = cut ? "var(--danger)" : "var(--faint)";
    netVal.textContent = "฿" + fmt(net);
    // GP helper chips
    helperWrap.replaceChildren();
    if (g > 0 && gpPct > 0) {
      const withVat = Math.round(g * gpPct * 1.07);
      const plain = Math.round(g * gpPct);
      const b1 = h("button", { type: "button", class: "badge list-press", style: { border: "1px solid var(--primary-soft)", background: "var(--primary-tint)", color: "var(--primary-dark)" }, onClick: () => { ist.gp = String(withVat); paint(root); } },
        pi("trend", 11), "GP " + Math.round(gpPct * 100) + "% +VAT7% = " + (Math.round(gpPct * 1.07 * 1000) / 10) + "% (≈฿" + fmt(withVat) + ")");
      const b2 = h("button", { type: "button", class: "badge list-press", style: { border: "1px solid var(--border)", background: "var(--surface)", color: "var(--muted)" }, onClick: () => { ist.gp = String(plain); paint(root); } },
        "GP " + Math.round(gpPct * 100) + "% เฉยๆ (฿" + fmt(plain) + ")");
      helperWrap.append(b1, b2);
    }
    footBtn.disabled = !ist.gross;
    footBtn.style.opacity = ist.gross ? 1 : .45;
  }

  grossIn.addEventListener("input", () => { const s = grossIn.value.replace(/[^0-9]/g, ""); if (s !== grossIn.value) grossIn.value = s; ist.gross = s; recompute(); });

  // channel chips
  const chips = CHANNELS.map((c) => h("button", {
    type: "button", class: "chip" + (ist.ch === c ? " active" : ""),
    onClick: () => { ist.ch = c; loadExisting(); paint(root); },
  }, dayLog[c] && pi("check", 12), c));

  const noteEl = existing
    ? note([bold("วันที่ " + ist.day + " มิ.ย. บันทึก " + ist.ch + " ไว้แล้ว"), " (฿" + fmt(existing.gross) + ") — ฟอร์มดึงค่าเดิมมาให้ กดบันทึก = ", bold("แก้ทับ"), " ไม่บันทึกซ้ำ · เก็บ audit ว่าใครแก้"], { amber: true })
    : note("ยังไม่มีรายการ " + ist.ch + " ของวันที่ " + ist.day + " มิ.ย. — กรอกใหม่ได้เลย ระบบกันคีย์ซ้ำให้");

  // breakdown card
  const cutLine = h("div", { class: "split", style: { padding: "3px 0" } },
    h("span", { style: { fontSize: "12.5px", fontWeight: 600, color: "var(--muted)" } }, "หักเงิน (GP + Marketing)"),
    cutVal,
  );

  const breakdown = h("div", { class: "card" },
    h("div", { style: { fontSize: "12px", fontWeight: 600, color: "var(--muted)", marginBottom: "6px" } }, "ยอดขายสุทธิ (ก่อนหักค่าธรรมเนียม)"),
    h("div", { class: "rowflex", style: { gap: "8px" } }, grossIn, h("span", { style: { fontSize: "13px", color: "var(--muted)", flex: "none" } }, "บาท")),
    h("div", { class: "hr" }),
    cutLine,
    h("div", { class: "split", style: { padding: "3px 0", paddingLeft: "18px" } },
      h("span", { style: { fontSize: "12.5px", color: "var(--muted)" } }, "ค่าธรรมเนียมแพลตฟอร์ม (GP)"),
      h("div", { class: "rowflex", style: { gap: "6px" } }, gpIn, h("span", { style: { fontSize: "11.5px", color: "var(--faint)" } }, "บาท")),
    ),
    h("div", { class: "split", style: { padding: "3px 0", paddingLeft: "18px" } },
      h("span", { style: { fontSize: "12.5px", color: "var(--muted)" } }, "ค่าธรรมเนียมการตลาด (Marketing)"),
      h("div", { class: "rowflex", style: { gap: "6px" } }, mktIn, h("span", { style: { fontSize: "11.5px", color: "var(--faint)" } }, "บาท")),
    ),
    helperWrap,
    h("div", { class: "hr" }),
    h("div", { class: "split", style: { padding: "3px 0" } },
      h("span", { style: { fontSize: "14px", fontWeight: 700, color: "var(--text)" } }, "รายได้สุทธิ"),
      netVal,
    ),
    h("div", { style: { fontSize: "10.5px", color: "var(--faint)", textAlign: "right" } }, "สูตร = ขายสุทธิ − หักเงิน (ใส่เอง)"),
  );

  // saved list
  const logKeys = Object.keys(dayLog);
  const savedRows = logKeys.length
    ? logKeys.map((c) => {
        const r = dayLog[c];
        const cut = (r.gp || 0) + (r.mkt || 0);
        return h("div", { class: "rowflex", style: { padding: "10px 0", borderBottom: "1px solid var(--border-soft)" } },
          h("span", { class: "catic green sm" }, pi("wallet", 15)),
          h("div", { style: { flex: 1, minWidth: 0 } },
            h("div", { style: { fontSize: "13.5px", fontWeight: 600 } }, c, r.stored && h("span", { class: "badge badge-green", style: { marginLeft: "6px", fontSize: "9.5px" } }, "คลาวด์")),
            h("div", { class: "tnum", style: { fontSize: "11.5px", color: "var(--muted)" } }, "ขาย ฿" + fmt(r.gross) + " − หัก ฿" + fmt(cut)),
          ),
          h("span", { class: "tnum", style: { fontWeight: 700, color: "var(--primary-dark)" } }, "฿" + fmt(r.gross - cut)),
          h("button", { type: "button", class: "hdr-icon", style: { width: "30px", height: "30px" }, "aria-label": "แก้ไข", onClick: () => { ist.ch = c; loadExisting(); paint(root); } }, pi("edit", 14)),
        );
      })
    : [emptyState({ compact: true, iconName: "wallet", title: "ยังไม่มีบันทึกของวันนี้", sub: "กรอกยอดด้านบนแล้วกดบันทึก" })];

  footBtn.append(pi("check", 17), h("span", null, existing ? "บันทึกแก้ไข" : "บันทึก"));
  footBtn.addEventListener("click", () => {
    const g = num(ist.gross), gpv = num(ist.gp), mk = num(ist.mkt);
    const net = g - (gpv + mk);
    saveIncomeRecord({ id: recId(ist.day, ist.ch), day: ist.day, ch: ist.ch, gross: g, gp: gpv, mkt: mk, net, at: new Date().toISOString() });
    toast((existing ? "แก้ไข" : "บันทึก") + "รายได้ " + ist.ch + " · " + ist.day + " มิ.ย. ฿" + fmt(net) + " — บันทึกขึ้นคลาวด์แล้ว");
    back();
  });

  root.replaceChildren(
    hdr({ title: "บันทึกรายได้", sub: "เลือกวัน · เลือกช่องทาง · แก้ย้อนหลังได้", onBack: back, right: storeChip(shopCtx) }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      dateBar({ day: ist.day, onChange: (d) => { ist.day = d; loadExisting(); paint(root); } }),
      h("div", { class: "chip-tabs" }, chips),
      noteEl,
      breakdown,
      note([bold("หักเงิน GP + Marketing ใส่เอง"), " — กรอกตามจริงที่แต่ละแพลตฟอร์มหักจริง (มีปุ่มช่วยคิด GP% ให้ แต่แก้ทับได้)"]),
      note([bold("GP ต้องบวก VAT 7% เสมอ"), " — Grab/แพลตฟอร์มคิด GP บวก VAT 7% เช่น 30% → 30+(30×7%) = ", bold("32.1%"), " · ", bold("ถ้าร้านจด VAT"), " เอา 7% นี้ไปขอคืน/หักได้ · ", bold("ถ้าไม่จด"), " ต้องจ่ายเองเต็ม"], { amber: true }),
      h("div", { class: "overline" }, "บันทึกแล้ว · วันที่ " + ist.day + " มิ.ย."),
      h("div", { class: "card", style: { padding: "4px 16px" } }, ...savedRows),
    ),
    h("div", { class: "foot" },
      h("button", { type: "button", class: "btn btn-block", onClick: back }, "ยกเลิก"),
      footBtn,
    ),
  );

  recompute();
}
