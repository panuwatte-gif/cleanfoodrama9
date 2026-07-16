// ============================================================
// pages/orderrecv.js — สั่งของ / รับของ (พอร์ตจาก prototype2 OrderRecvScreen)
// แท็บเดียว 2 โหมด (สั่ง/รับ) · progress · sheet ยืนยันกันบันทึกซ้ำ · autosave draft
// ดึงรายการจากหมวดสั่งของ (protein/sauce/rice/dry) — เรียงเหมือนข้อมูลกลาง
// ctx = { go, back, role, toast, shopCtx, mode }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { seg, searchBox, note, menuTabs, hdr } from "../components/components.js";
import { entryList, entryFoot, confirmSheet, isFilled, sumOf } from "./_entry.js";
import { orderCats, orderItems, itemById, unitOf } from "../utils/formulas.js";
import { TODAY } from "../data/seed.js";
import { load, save } from "../utils/storage.js";
import { sendOrderReport } from "../services/reportService.js";
import { applyReceive } from "../data/store.js";

const DKO = "draft:order", DKR = "draft:recv";

const st = {
  mode: "recv", top: "all", sub: "all", q: "", openO: {}, openR: {},
  confirm: false, valsO: load(DKO, {}), valsR: load(DKR, {}), ctx: null,
};

const bold = (t) => h("b", null, t);

export function orderRecvScreen(ctx) {
  st.ctx = ctx;
  if (ctx.mode) st.mode = ctx.mode;
  st.confirm = false;
  const root = h("div", { class: "page-wrap", "data-screen-label": "orderrecv", style: { display: "flex", flexDirection: "column", flex: 1 } });
  root._sheets = h("div");
  paint(root);
  return root;
}

function paint(root) {
  const ctx = st.ctx;
  const sub = (ctx.shopCtx ? ctx.shopCtx.shop : "พระราม 9") + " · " + TODAY.dow + " " + TODAY.d + " " + TODAY.mon;
  const isOrder = st.mode === "order";
  const vals = isOrder ? st.valsO : st.valsR;
  const commit = isOrder
    ? (k, v) => { st.valsO[k] = v; save(DKO, st.valsO); }
    : (k, v) => { st.valsR[k] = v; save(DKR, st.valsR); };
  const open = isOrder ? st.openO : st.openR;
  const oc = orderCats(), oi = orderItems();
  const filter = st.top === "all" ? "all" : st.top === "protein" ? (st.sub === "all" ? "protein" : st.sub) : st.top;
  const toggleOpen = (id) => { open[id] = !(open[id] !== false); paint(root); };

  const foot = entryFoot({
    vals, items: oi,
    label: isOrder ? "ส่งใบสั่ง" : "บันทึกรับของ",
    icon: isOrder ? "send" : "check",
    onSave: () => { st.confirm = true; renderSheets(root); },
  });

  const list = entryList({
    vals, commit, footUpdate: foot.update, filter, q: st.q,
    cats: oc, open, toggleOpen,
  });

  const onTop = (id) => { st.q = ""; st.top = id; st.sub = "all"; paint(root); };
  const onSub = (id) => { st.q = ""; st.sub = id; paint(root); };

  const content = h("div", { class: "page stack", style: { paddingBottom: "12px" } },
    seg({ grow: true, value: st.mode, onChange: (v) => { st.mode = v; paint(root); }, options: [{ v: "order", t: "สั่งของ", ic: "send" }, { v: "recv", t: "รับของ", ic: "truck" }] }),
    // ข้อมูลชุดเดียวกับ "ข้อมูลกลาง" — เจ้าของเพิ่ม/ลบ/แก้รายการได้ที่นั่น แล้วหน้านี้ใช้ตามทันที
    ctx.role === "owner"
      ? note([bold("รายการนี้ = ข้อมูลกลางชุดเดียว"), " — เพิ่ม / ลบ / แก้ชื่อ·ต้นทุน·หน่วย ทำได้ที่ ", bold("ข้อมูลกลาง"), " แล้วหน้าสั่ง/รับ/นับ/พยากรณ์ ใช้ชุดเดียวกันทันที"], { iconName: "db" })
      : note(["กรอกจำนวนได้เลย · การ ", bold("เพิ่ม/ลบ/แก้รายการ"), " ทำที่ฝั่ง ", bold("เจ้าของ"), " (ข้อมูลกลาง)"], { iconName: "lock" }),
    ctx.role === "owner" && h("button", { type: "button", class: "btn btn-block btn-primary", style: { marginTop: "-2px" }, onClick: () => ctx.go({ name: "master", mode: isOrder ? "order" : "recv" }) }, pi("edit", 16), "เพิ่ม / ลบ / แก้รายการสั่งของ (ข้อมูลกลาง)"),
    !isOrder && note(["สาขาหลักส่งมา ", bold("14 รายการ"), " · แจ้งใน LINE แล้ว — เช็คของจริงแล้วกรอกจำนวนที่รับ"], { iconName: "truck" }),
    searchBox({ value: st.q, onChange: (v) => { st.q = v; paint(root); }, placeholder: "ค้นหา… (ไม่ต้องใส่หน่วยหมด)" }),
    menuTabs({ cats: oc, top: st.top, sub: st.sub, onTop, onSub }),
    list,
  );

  root.replaceChildren(
    hdr({ title: "สั่งของ / รับของ", sub, onBack: ctx.back, right: h("button", { type: "button", class: "hdr-icon", "aria-label": "ประวัติ", onClick: () => ctx.go({ name: "history" }) }, pi("history", 18)) }),
    content,
    foot.node,
    root._sheets,
  );
  renderSheets(root);
}

function renderSheets(root) {
  const ctx = st.ctx;
  const layer = root._sheets;
  layer.replaceChildren();
  if (!st.confirm) return;
  const isOrder = st.mode === "order";
  layer.appendChild(confirmSheet({
    vals: isOrder ? st.valsO : st.valsR,
    title: isOrder ? "ยืนยันใบสั่งของ?" : "ยืนยันรับของ?",
    dupNote: isOrder
      ? ["ระบบเช็คให้: สัปดาห์นี้ยังไม่เคยส่งใบสั่ง — ", bold("ไม่ซ้ำ")]
      : ['ระบบเช็คให้: วันนี้ยังไม่เคยบันทึก "รับของ" — ', bold("ไม่ซ้ำ"), " · บันทึกแล้วเข้าสต๊อกทันที"],
    onClose: () => { st.confirm = false; renderSheets(root); },
    onSave: async () => {
      st.confirm = false; renderSheets(root);
      if (!isOrder) {
        // บันทึกรับของจริง → บวกเข้าสต๊อก (persist + sync Supabase)
        const lines = oi.filter((it) => isFilled(st.valsR, it))
          .map((it) => ({ id: it.id, qty: Number(sumOf(st.valsR, it)) }))
          .filter((l) => l.qty > 0);
        const n = await applyReceive(lines, ctx.user ? ctx.user.name : (ctx.role === "owner" ? "เจ้าของ" : "พนักงาน"));
        st.valsR = {}; save(DKR, st.valsR);
        ctx.toast(n ? "บันทึกรับของ " + n + " รายการ · เข้าสต๊อกแล้ว" : "ยังไม่ได้กรอกจำนวนที่รับ");
        ctx.back(); return;
      }
      // ส่งใบสั่งของจริงเข้ากลุ่ม LINE (POST ไป webhook ผ่าน reportService)
      const lines = oi.filter((it) => isFilled(st.valsO, it))
        .map((it) => ({ name: it.name, qty: Number(sumOf(st.valsO, it)), unit: unitOf(it) }))
        .filter((l) => l.qty > 0);
      const res = await sendOrderReport({ lines, shop: ctx.shopCtx ? ctx.shopCtx.shop : "", date: TODAY.dow + " " + TODAY.d + " " + TODAY.mon });
      if (res.ok) { ctx.toast("ส่งใบสั่งของให้สาขาหลักใน LINE แล้ว"); ctx.back(); }
      else if (res.skipped) { ctx.toast("ส่งใบสั่งแล้ว (เดโม — ยังไม่ได้ตั้งค่า Webhook)"); ctx.back(); }
      else { ctx.toast("ส่งใบสั่งไม่สำเร็จ: " + (res.error || "เครือข่าย") + " — ลองใหม่", "err"); }
    },
  }));
}
