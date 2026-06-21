// ============================================================
// pages/linesend.js — ส่งเข้ากลุ่ม LINE · พอร์ตจาก prototype2 LineSendScreen
// เลือกหัวข้อ → ระบบแต่งข้อความ → ส่งทีเดียว (UI ครบ · ยิงจริงเฟส 4)
// ctx = { back, toast, go, role, shopCtx }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, toggle } from "../components/components.js";
import { TODAY } from "../data/seed.js";
import { sendLineReport } from "../services/reportService.js";

const bold = (t) => h("b", null, t);
const lst = { sel: null, remind: true, asImg: false, ctx: null };

const OPTS = [
  { k: "report", ic: "scale", t: "รายงานปิดร้าน (นับ + ทิ้ง/เสีย + ขายจริง)", s: "รวบจากที่กรอกไว้วันนี้" },
  { k: "sales", ic: "wallet", t: "ยอดขาย − GP − ค่าการตลาด", s: "Grab · Lineman · Shopee · หน้าร้าน" },
  { k: "stock", ic: "alert", t: "ของใกล้หมด + พยากรณ์พรุ่งนี้", s: "เตือนทีมให้เตรียมของ" },
  { k: "profit", ic: "lock", t: "กำไร / ต้นทุน", s: "ของลับเจ้าของ — เลือกได้เฉพาะส่งหาตัวเอง", owner: true },
];

export function lineSendScreen(ctx) {
  lst.ctx = ctx;
  lst.sel = { report: true, sales: true, stock: true, profit: false };
  lst.remind = true; lst.asImg = false;
  const root = h("div", { class: "page-wrap", style: { display: "flex", flexDirection: "column", flex: 1 } });
  paint(root);
  return root;
}

function H(t) { return h("b", { style: { color: "var(--primary-dark)" } }, t); }
const hr = () => h("hr", { class: "hr", style: { margin: "7px 0" } });

// build the plain-text LINE message — mirrors the on-screen preview so what
// the user sees is exactly what gets pushed to the group
function composeText() {
  const { role } = lst.ctx;
  const sel = lst.sel;
  const parts = [];
  if (sel.sales) parts.push("💰 เงิน\nยอดขายสุทธิ ฿12,400 · −หัก GP+การตลาด ฿2,470 · สุทธิ ฿9,930");
  if (sel.report) parts.push("📋 ขายไป / ใช้ไป\nเนื้อ 2.1 · กุ้ง 0.8 · ไข่ดองโชยุ 26 · +6 รายการ\nทิ้ง/เสีย: เนื้อ 0.2 (เสีย) · ไข่ดอง 2 ฟอง");
  if (sel.stock) parts.push("⚠ ของใกล้หมด\nกุ้ง 0.3 kg · ไข่ดองโชยุ 18 ฟอง · พยากรณ์พรุ่งนี้เนื้อ 2.0–2.4 kg");
  if (sel.profit && role === "owner") parts.push("🔒 กำไร (ลับ)\nกำไรขั้นต้นวันนี้ ≈ ฿6,100");
  return parts.join("\n\n");
}

function paint(root) {
  const { back, toast, role, shopCtx } = lst.ctx;
  const store = shopCtx ? shopCtx.shop : "กะเพราโคตรคลีน";
  const sel = lst.sel;
  const count = Object.values(sel).filter(Boolean).length;

  const optRows = OPTS.filter((o) => !o.owner || role === "owner").map((o, i, arr) =>
    h("div", { class: "split", style: { padding: "11px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border-soft)" : "none" } },
      h("div", { class: "rowflex", style: { minWidth: 0 } },
        h("span", { class: "catic sm " + (o.k === "profit" ? "amber" : o.k === "stock" ? "rose" : "green") }, pi(o.ic, 14)),
        h("div", { style: { minWidth: 0 } },
          h("div", { style: { fontSize: "13.5px", fontWeight: 600 } }, o.t),
          h("div", { style: { fontSize: "11.5px", color: o.owner ? "#9A7A2E" : "var(--muted)" } }, o.s),
        ),
      ),
      toggle(sel[o.k], () => { sel[o.k] = !sel[o.k]; paint(root); }),
    ));

  // message preview
  const msg = h("div", { style: { fontSize: "12.5px", lineHeight: 1.65, marginTop: "6px" } });
  if (sel.sales) msg.append(H("เงิน"), h("br"), "ยอดขายสุทธิ ", h("b", { class: "tnum" }, "฿12,400"), " · −หัก GP+การตลาด ", h("b", { class: "tnum", style: { color: "var(--danger)" } }, "฿2,470"), " · ", h("b", null, "สุทธิ ", h("span", { class: "tnum" }, "฿9,930")));
  if (sel.report) { if (sel.sales) msg.append(hr()); msg.append(H("ขายไป / ใช้ไป"), h("br"), "เนื้อ 2.1 · กุ้ง 0.8 · ไข่ดองโชยุ 26 · +6 รายการ", h("br"), "ทิ้ง/เสีย: เนื้อ 0.2 (เสีย) · ไข่ดอง 2 ฟอง"); }
  if (sel.stock) msg.append(hr(), H("ของใกล้หมด ⚠"), h("br"), "กุ้ง 0.3 kg · ไข่ดองโชยุ 18 ฟอง · พยากรณ์พรุ่งนี้เนื้อ 2.0–2.4 kg");
  if (sel.profit && role === "owner") msg.append(hr(), h("b", { style: { color: "#9A7A2E" } }, "กำไร (ลับ)"), h("br"), "กำไรขั้นต้นวันนี้ ≈ ", h("b", { class: "tnum" }, "฿6,100"));
  if (count === 0) msg.append(h("span", { style: { color: "var(--faint)" } }, "— ยังไม่ได้เลือกหัวข้อ —"));
  if (count > 0) msg.append(hr(), h("span", { style: { fontSize: "11px", color: "var(--muted)" } }, "ส่งโดย ปอ (พนักงาน) · 21:05"));

  const sendBtn = h("button", { type: "button", class: "btn btn-primary btn-block", disabled: !count, style: { opacity: count ? 1 : .45 } }, pi("send", 16), "ส่งทีเดียว (" + count + ")");
  sendBtn.addEventListener("click", async () => {
    if (!count || sendBtn.disabled) return;
    sendBtn.disabled = true;
    sendBtn.replaceChildren(pi("send", 16), document.createTextNode("กำลังส่ง…"));
    const topics = Object.keys(sel).filter((k) => sel[k]);
    const res = await sendLineReport({
      title: "รายงานร้าน · " + store,
      text: composeText(),
      topics, asImage: lst.asImg, shop: store, by: role === "owner" ? "เจ้าของ" : "พนักงาน",
    });
    if (res.ok) { toast("ส่ง " + count + " หัวข้อเข้ากลุ่ม LINE แล้ว"); back(); }
    else if (res.skipped) { toast("ส่งแล้ว (เดโม — ยังไม่ได้ตั้งค่า Webhook ใน config)"); back(); }
    else {
      toast("ส่งไม่สำเร็จ: " + (res.error || "เครือข่าย") + " — ลองใหม่อีกครั้ง", "err");
      sendBtn.disabled = false;
      sendBtn.replaceChildren(pi("send", 16), document.createTextNode("ส่งทีเดียว (" + count + ")"));
    }
  });

  root.replaceChildren(
    hdr({ title: "ส่งเข้ากลุ่ม LINE", sub: store + " · " + TODAY.dow + " " + TODAY.d + " " + TODAY.mon, onBack: back, right: h("span", { class: "catic fill" }, pi("chat", 18)) }),
    h("div", { class: "page stack", style: { paddingBottom: "12px" } },
      note([bold("เลือกว่าจะส่งอะไรบ้าง"), " — ติ๊กหัวข้อที่ต้องการ ระบบรวบข้อความให้ แล้วกด", bold("ส่งทีเดียว"), " — แทน Google Sheet เดิม"], { iconName: "chat" }),
      h("div", { class: "overline" }, "เลือกหัวข้อที่จะส่ง"),
      h("div", { class: "card", style: { padding: "2px 14px" } }, optRows),
      h("div", { class: "overline" }, "ข้อความที่จะส่ง (ระบบแต่งให้)"),
      h("div", { class: "rowflex", style: { alignItems: "flex-start" } },
        h("span", { class: "catic fill sm", style: { borderRadius: "50%" } }, pi("store", 15)),
        h("div", { class: "card", style: { flex: 1, background: "var(--primary-tint)", borderColor: "var(--primary-soft)", padding: "12px 14px" } },
          h("div", { class: "overline", style: { color: "var(--primary-dark)" } }, "รายงานร้าน · " + TODAY.dow + " " + TODAY.d + " " + TODAY.mon + " · " + store),
          msg,
        ),
      ),
      h("div", { class: "card split", style: { padding: "11px 14px" } },
        h("div", { style: { flex: 1, minWidth: 0 } },
          h("div", { style: { fontSize: "13px", fontWeight: 600 } }, "ส่งแบบรูปสรุป/กราฟ (1 รูป)"),
          h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "รายการเยอะ → bot แปลงเป็นรูปภาพส่งใน LINE ได้"),
        ),
        toggle(lst.asImg, (v) => { lst.asImg = v; paint(root); }),
      ),
      h("div", { class: "card split", style: { padding: "11px 14px" } },
        h("div", { class: "rowflex" }, pi("bell", 16), h("span", { style: { fontSize: "13px" } }, "ยังไม่ส่งถึง 21:30 → bot ทวงในกลุ่ม")),
        toggle(lst.remind, (v) => { lst.remind = v; paint(root); }),
      ),
    ),
    h("div", { class: "foot" },
      h("button", { type: "button", class: "btn", onClick: () => toast("เดโม — เปิดแก้ข้อความก่อนส่ง") }, pi("edit", 16), "แก้"),
      sendBtn,
    ),
  );
}
