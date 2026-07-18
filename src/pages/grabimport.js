// ============================================================
// pages/grabimport.js — อัปโหลดไฟล์ CSV จาก Grab (เจ้าของเท่านั้น)
// ลากวาง/เลือกได้หลายไฟล์ → auto-detect ชนิด → ยืนยันบันทึก (upsert กันซ้ำ)
// + แถบ "ความครบของข้อมูล" รายเดือนแยกชนิดไฟล์
// ============================================================
import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag } from "../components/components.js";
import { fmt } from "../utils/formulas.js";
import { detectAndParse } from "../services/grabParseService.js";
import { applyParsed, clearUploads, uploadCounts } from "../data/grabStore.js";
import { coverage, daysInMonth, thaiMonth } from "../services/grabReportService.js";

const TYPE_META = {
  txn: { emoji: "🧾", name: "ธุรกรรม/ออเดอร์", c: "#DFF0E6", ink: "#2E7D4F" },
  menu: { emoji: "🍛", name: "ยอดขายรายเมนู", c: "#FFF3D6", ink: "#9A6A00" },
  transfer: { emoji: "🏦", name: "เงินโอนเข้าธนาคาร", c: "#E3EDFB", ink: "#2E6BB0" },
  ads: { emoji: "📣", name: "โฆษณา (Ads)", c: "#F1E8FA", ink: "#7A4FA8" },
  peak: { emoji: "⏰", name: "ช่วงเวลาขายดี (Peak Hour)", c: "#FDE8F0", ink: "#B34A76" },
};
const thDate = (iso) => (iso ? +iso.slice(8) + "/" + +iso.slice(5, 7) + "/" + (+iso.slice(0, 4) + 543).toString().slice(-2) : "—");

export function grabImportScreen({ back, toast } = {}) {
  const pending = []; // {file, parsed | error}
  const listEl = h("div", { class: "stack", style: { gap: "8px" } });
  const covEl = h("div", null);

  function paintCoverage() {
    const cov = coverage();
    const months = Object.keys(cov).sort();
    if (!months.length) { covEl.replaceChildren(); return; }
    // เกณฑ์: ครบ ≥ 85% ของวันในเดือน (transfer โอนรายวันเหมือนกัน)
    const cell = (ym, type) => {
      const d = cov[ym][type], dim = daysInMonth(ym);
      const nowYm = new Date().toISOString().slice(0, 7);
      const dimEff = ym === nowYm ? new Date().getDate() : dim; // เดือนปัจจุบันนับถึงวันนี้
      const st = d === 0 ? "none" : d >= dimEff * 0.85 ? "full" : "part";
      const bg = st === "full" ? "#63BE8B" : st === "part" ? "#F2C46B" : "var(--danger, #E05B5B)";
      return h("div", { title: TYPE_META[type].name + " " + thaiMonth(ym) + " · " + d + "/" + dimEff + " วัน", style: { height: "22px", borderRadius: "7px", background: bg, opacity: st === "none" ? .8 : 1, display: "grid", placeItems: "center", color: "#fff", fontSize: "10px", fontWeight: 700 } }, st === "none" ? "×" : d);
    };
    covEl.replaceChildren(
      h("div", { class: "card", style: { padding: "14px 16px" } },
        h("div", { class: "split", style: { marginBottom: "8px" } },
          h("div", { style: { fontWeight: 800, fontSize: "14px" } }, "📅 ความครบของข้อมูลในระบบ"),
          h("div", { class: "rowflex", style: { gap: "6px", fontSize: "10.5px", color: "var(--muted)" } },
            h("span", { style: { width: "9px", height: "9px", borderRadius: "3px", background: "#63BE8B", display: "inline-block" } }), "ครบ",
            h("span", { style: { width: "9px", height: "9px", borderRadius: "3px", background: "#F2C46B", display: "inline-block" } }), "บางส่วน",
            h("span", { style: { width: "9px", height: "9px", borderRadius: "3px", background: "var(--danger,#E05B5B)", display: "inline-block" } }), "ขาด"),
        ),
        h("div", { style: { display: "grid", gridTemplateColumns: "86px repeat(" + months.length + ", 1fr)", gap: "5px", alignItems: "center" } },
          h("div", null),
          months.map((ym) => h("div", { style: { textAlign: "center", fontSize: "10.5px", fontWeight: 700, color: "var(--muted)" } }, thaiMonth(ym))),
          Object.keys(TYPE_META).flatMap((type) => [
            h("div", { style: { fontSize: "11.5px", fontWeight: 700 } }, TYPE_META[type].emoji + " " + TYPE_META[type].name.split("/")[0].split(" ")[0]),
            months.map((ym) => cell(ym, type)),
          ]),
        ),
        h("div", { style: { fontSize: "11px", color: "var(--faint)", marginTop: "8px" } }, "เดือนที่ขึ้นสีแดง = ยังไม่มีไฟล์ชนิดนั้น — ดาวน์โหลดจาก Grab Merchant แล้วลากมาวางด้านบนได้เลย"),
      ),
    );
  }

  function paintList() {
    listEl.replaceChildren(
      ...pending.map((p, i) => {
        if (p.error) return h("div", { class: "card", style: { padding: "12px 14px", borderColor: "#F3D9BE", background: "#FFFBF5" } },
          h("div", { class: "rowflex", style: { gap: "8px" } }, h("span", null, "⚠️"),
            h("div", { style: { flex: 1, minWidth: 0 } },
              h("div", { style: { fontWeight: 700, fontSize: "13px", overflowWrap: "anywhere" } }, p.file),
              h("div", { style: { fontSize: "12px", color: "#9A6A00", marginTop: "2px" } }, p.error)),
            h("button", { type: "button", class: "hdr-icon", "aria-label": "เอาออก", onClick: () => { pending.splice(i, 1); paintList(); } }, pi("x", 14))));
        const m = TYPE_META[p.parsed.type];
        return h("div", { class: "card", style: { padding: "12px 14px" } },
          h("div", { class: "rowflex", style: { gap: "10px" } },
            h("span", { style: { width: "38px", height: "38px", borderRadius: "12px", background: m.c, display: "grid", placeItems: "center", fontSize: "18px", flex: "none" } }, m.emoji),
            h("div", { style: { flex: 1, minWidth: 0 } },
              h("div", { class: "rowflex", style: { gap: "6px", flexWrap: "wrap" } },
                h("span", { style: { fontWeight: 800, fontSize: "13.5px", color: m.ink } }, p.parsed.label),
                p.saved ? tag("บันทึกแล้ว ✓", { kind: "ok" }) : tag("รอบันทึก", { kind: "warn" })),
              h("div", { style: { fontSize: "11.5px", color: "var(--muted)", marginTop: "2px", overflowWrap: "anywhere" } }, p.file),
              h("div", { style: { fontSize: "12px", marginTop: "3px" } },
                "ช่วง ", h("b", { class: "tnum" }, thDate(p.parsed.period[0]) + " – " + thDate(p.parsed.period[1])),
                " · ", h("b", { class: "tnum" }, fmt(p.parsed.rows)), " แถว · ", h("b", { class: "tnum" }, fmt(p.parsed.days)), " วัน",
                p.saved && h("span", { style: { color: "var(--primary-dark, #2E7D4F)" } }, " → ใหม่ " + p.saved.added + " วัน · ทับวันซ้ำ " + p.saved.replaced + " (ไม่นับซ้ำ)")),
            ),
            !p.saved && h("button", { type: "button", class: "hdr-icon", "aria-label": "เอาออก", onClick: () => { pending.splice(i, 1); paintList(); } }, pi("x", 14)),
          ));
      }),
      pending.some((p) => p.parsed && !p.saved) && h("button", {
        type: "button", class: "btn btn-primary btn-block", style: { marginTop: "2px" },
        onClick: () => {
          let a = 0, r = 0;
          for (const p of pending) if (p.parsed && !p.saved) { p.saved = applyParsed(p.parsed); a += p.saved.added; r += p.saved.replaced; }
          toast("บันทึกแล้ว — วันใหม่ " + a + " · ทับวันซ้ำ " + r + " ✓");
          paintList(); paintCoverage();
        },
      }, pi("check", 15), "ยืนยันบันทึกเข้าระบบ"),
    );
  }

  async function handleFiles(files) {
    for (const f of files) {
      try {
        const text = await f.text();
        pending.push({ file: f.name, parsed: detectAndParse(text) });
      } catch (e) { pending.push({ file: f.name, error: e.message }); }
    }
    paintList();
  }

  const input = h("input", { type: "file", accept: ".csv,text/csv", multiple: true, style: { display: "none" } });
  input.addEventListener("change", () => { if (input.files.length) handleFiles([...input.files]); input.value = ""; });
  const drop = h("button", {
    type: "button", class: "list-press",
    style: { width: "100%", border: "2px dashed #A8CFBA", borderRadius: "18px", background: "linear-gradient(160deg,#F2FAF5,#EDF5FC)", padding: "26px 16px", textAlign: "center", cursor: "pointer" },
    onClick: () => input.click(),
  },
    h("div", { style: { fontSize: "30px" } }, "📂"),
    h("div", { style: { fontWeight: 800, fontSize: "14.5px", marginTop: "6px" } }, "ลากไฟล์ CSV มาวาง หรือแตะเพื่อเลือก"),
    h("div", { style: { fontSize: "12px", color: "var(--muted)", marginTop: "3px" } }, "เลือกได้หลายไฟล์ · ไฟล์เดียวครอบหลายเดือนก็ได้ ระบบแตกเก็บครบทุกเดือน · รองรับ 5 ชนิด (Transaction · Menu · Transfers · Ads · Peak Hour)"),
  );
  ["dragover", "dragenter"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.style.background = "#E4F3EA"; }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.style.background = "linear-gradient(160deg,#F2FAF5,#EDF5FC)"; }));
  drop.addEventListener("drop", (e) => { const fs = [...e.dataTransfer.files].filter((f) => /\.csv$/i.test(f.name)); if (fs.length) handleFiles(fs); });

  const up = uploadCounts();
  const hasUploads = up.txn + up.menu + up.transfer + up.ads + up.peak > 0;

  const page = h("div", { class: "page-wrap", "data-screen-label": "grabimport" },
    hdr({ title: "อัปโหลดข้อมูล Grab", sub: "อัปทุกเดือน · ช่วงทับซ้อนได้ ไม่นับซ้ำ", onBack: back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    h("div", { class: "page stack", style: { paddingBottom: "16px" } },
      drop, input, listEl, covEl,
      note(["ดาวน์โหลดจาก Grab Merchant: ", h("b", null, "ธุรกรรม"), " (รายงาน > Transaction) · ", h("b", null, "เมนู"), " (Insights > Menu Sales) · ", h("b", null, "เงินโอน"), " (การเงิน > Transfers) · ", h("b", null, "Ads"), " (Marketing > Report) · ", h("b", null, "Peak Hour"), " (Insights > ช่วงเวลาขายดี) — อัปช้า/ลืมอัป ไม่เป็นไร ระบบเช็คช่องโหว่ให้"], { iconName: "info" }),
      hasUploads && h("button", {
        type: "button", class: "btn btn-block", style: { color: "var(--danger)" },
        onClick: () => { clearUploads(); toast("ล้างข้อมูลที่อัปเพิ่มแล้ว — เหลือชุดข้อมูลตั้งต้น"); paintCoverage(); },
      }, pi("trash", 14), "ล้างข้อมูลที่อัปเพิ่ม (เหลือชุดตั้งต้น)"),
    ),
  );
  paintCoverage();
  return page;
}
