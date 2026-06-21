// ============================================================
// pages/orderexpense.js — ค่าใช้จ่ายสั่งอาหาร (เจ้าของ) · พอร์ตจาก prototype2 OrderExpenseScreen
// ปฏิทินต้นทุนรับของรายวัน · แตะวัน → รายละเอียด + กรอกค่าส่ง (live · ไม่เสีย focus)
// ต้นทุน/หน่วยดึงจากข้อมูลกลาง (ITEMS.cost) ผ่าน recvOf()
// ctx = { back, go, toast }
// ============================================================

import { h } from "../utils/dom.js";
import { pi } from "../components/icons.js";
import { hdr, note, tag, itemIc } from "../components/components.js";
import { fmt, itemById, recvOf, shipOf, setShipOf, RECV_DAYS } from "../utils/formulas.js";
import { TODAY } from "../data/seed.js";

const bold = (t) => h("b", null, t);
const num = (v) => parseFloat(v || 0) || 0;
const kBaht = (n) => (n >= 1000 ? (Math.round(n / 100) / 10).toFixed(1).replace(/\.0$/, "") + "k" : String(n));
const oest = { openDay: null, shipMap: null, ctx: null };

export function orderExpenseScreen(ctx) {
  oest.ctx = ctx;
  oest.openDay = null;
  oest.shipMap = {};
  RECV_DAYS.forEach((d) => { const v = shipOf(d); oest.shipMap[d] = v == null ? "" : String(v); });
  const root = h("div", { class: "page-wrap" });
  paint(root);
  return root;
}

function dayCalc(day) {
  const r = recvOf(day); if (!r) return null;
  const s = oest.shipMap[day];
  const ship = s === "" || s == null ? null : num(s);
  return { ...r, ship, total: r.menuTotal + (ship || 0) };
}

function paint(root) {
  if (oest.openDay != null) paintDetail(root);
  else paintCalendar(root);
}

function ln(l, v, col, b) {
  return h("div", { class: "split", style: { padding: b ? "8px 0 2px" : "4px 0" } },
    h("span", { style: { fontSize: b ? "14px" : "13px", fontWeight: b ? 800 : 500, color: b ? "var(--text)" : "var(--muted)" } }, l),
    h("span", { class: "tnum", style: { fontWeight: b ? 800 : 700, fontSize: b ? "19px" : "14px", color: col || "var(--text)" } }, v),
  );
}

function paintDetail(root) {
  const { go } = oest.ctx;
  const day = oest.openDay;
  const c = dayCalc(day);

  // live spans
  const bigTotal = h("div", { class: "big-num tnum", style: { fontSize: "28px", color: "var(--warning-ink)", margin: "2px 0 8px" } });
  const sumShip = h("span", { class: "tnum", style: { fontWeight: 700, fontSize: "14px" } });
  const sumTotal = h("span", { class: "tnum", style: { fontWeight: 800, fontSize: "19px", color: "var(--warning-ink)" } });
  const shipTag = h("span", {});
  const tfShip = h("td", { class: "tnum", style: { textAlign: "right", padding: "2px 0", fontWeight: 700, fontSize: "13px" } });
  const tfTotal = h("td", { class: "tnum", style: { textAlign: "right", padding: "6px 0 4px", fontWeight: 800, fontSize: "16px", color: "var(--warning-ink)" } });
  const sumShipLabel = h("span", { style: { fontSize: "13px", fontWeight: 500, color: "var(--muted)" } }, "ค่าส่ง");

  const shipIn = h("input", { type: "text", inputMode: "numeric", class: "input tnum", style: { fontSize: "22px", fontWeight: 700 }, placeholder: "กรอกค่าส่ง…", value: oest.shipMap[day] || "" });

  function refresh() {
    const cc = dayCalc(day);
    bigTotal.textContent = "฿" + fmt(cc.total);
    sumTotal.textContent = "฿" + fmt(cc.total);
    sumShip.textContent = cc.ship == null ? "รอกรอก" : "฿" + fmt(cc.ship);
    sumShip.style.color = cc.ship == null ? "var(--faint)" : "var(--text)";
    tfShip.textContent = cc.ship == null ? "—" : "฿" + fmt(cc.ship);
    tfShip.style.color = cc.ship == null ? "var(--faint)" : "var(--text)";
    tfTotal.textContent = "฿" + fmt(cc.total);
    shipTag.replaceChildren(cc.ship == null ? tag("ยังไม่กรอก", { kind: "warn" }) : tag("กรอกแล้ว", { kind: "ok", iconName: "check" }));
  }
  shipIn.addEventListener("input", () => {
    const s = shipIn.value.replace(/[^0-9]/g, ""); if (s !== shipIn.value) shipIn.value = s;
    oest.shipMap[day] = s; setShipOf(day, s === "" ? null : num(s)); refresh();
  });

  const rows = c.lines.map((l) => {
    const it = itemById(l.id);
    return h("tr", { style: { borderTop: "1px solid var(--border-soft)" } },
      h("td", { style: { padding: "8px 0" } }, h("span", { class: "rowflex", style: { gap: "7px" } }, itemIc(it), h("span", { style: { fontSize: "12.5px" } }, l.name))),
      h("td", { class: "tnum", style: { textAlign: "right", padding: "8px 4px", fontSize: "12px" } }, l.qty + " ", h("span", { style: { color: "var(--faint)", fontSize: "10px" } }, l.unit)),
      h("td", { class: "tnum", style: { textAlign: "right", padding: "8px 4px", fontSize: "12px", color: "var(--muted)" } }, fmt(l.cost)),
      h("td", { class: "tnum", style: { textAlign: "right", padding: "8px 0", fontWeight: 800, fontSize: "12.5px", color: "var(--primary-dark)" } }, "฿" + fmt(Math.round(l.sub))),
    );
  });

  root.replaceChildren(
    hdr({ title: "รับของ · " + day + " มิ.ย.", sub: "ยืนยันรับของ " + c.time + " น. · " + c.count + " รายการ", onBack: () => { oest.openDay = null; paint(root); }, right: h("span", { class: "catic amber" }, pi("truck", 18)) }),
    h("div", { class: "page stack" },
      note([h("span", null, "ต้นทุน/หน่วยของทุกรายการ "), bold("ดึงจากการ์ดข้อมูลกลาง (แท็บรับของ)"), " — แก้ราคาที่ข้อมูลกลางแล้วยอดที่นี่อัปเดตตาม"], { iconName: "db" }),
      h("div", { class: "card soft-card soft-amber" },
        h("div", { class: "overline", style: { color: "#92560B" } }, "ค่าใช้จ่ายรวมรอบนี้"),
        bigTotal,
        h("div", { class: "hr", style: { margin: "2px 0 4px" } }),
        ln("ค่าใช้จ่ายรายเมนู", "฿" + fmt(c.menuTotal)),
        h("div", { class: "split", style: { padding: "4px 0" } }, sumShipLabel, sumShip),
        h("div", { class: "hr", style: { margin: "4px 0 0" } }),
        h("div", { class: "split", style: { padding: "8px 0 2px" } },
          h("span", { style: { fontSize: "14px", fontWeight: 800 } }, "รวมทั้งหมด"), sumTotal),
      ),
      h("div", { class: "card" },
        h("div", { class: "split", style: { marginBottom: "8px" } },
          h("span", { class: "rowflex", style: { gap: "8px" } }, h("span", { class: "catic blue sm" }, pi("truck", 15)), h("span", { style: { fontWeight: 700, fontSize: "14px" } }, "ค่าส่งรอบนี้")),
          shipTag,
        ),
        h("div", { class: "rowflex", style: { gap: "8px" } },
          h("span", { style: { fontSize: "18px", fontWeight: 800, color: "var(--muted)", flex: "none" } }, "฿"),
          shipIn,
          h("span", { style: { fontSize: "13px", color: "var(--muted)", flex: "none" } }, "บาท"),
        ),
        h("div", { style: { fontSize: "11.5px", color: "var(--faint)", marginTop: "6px" } }, "ค่าส่ง/ค่าขนส่งของรอบนี้ — กรอกเองได้ ระบบรวมเข้ายอดทันที"),
      ),
      h("div", { class: "split" }, h("span", { class: "overline" }, "รายการที่รับ · ต้นทุนรายเมนู"), tag(c.count + " รายการ", { kind: "fifo", iconName: "db" })),
      h("div", { class: "card", style: { padding: "4px 14px 8px" } },
        h("table", { style: { width: "100%", borderCollapse: "collapse" } },
          h("thead", null, h("tr", { style: { color: "var(--muted)", fontSize: "10.5px" } },
            h("th", { style: { textAlign: "left", padding: "8px 0", fontWeight: 600 } }, "รายการ"),
            h("th", { style: { textAlign: "right", padding: "8px 4px", fontWeight: 600 } }, "รับ"),
            h("th", { style: { textAlign: "right", padding: "8px 4px", fontWeight: 600 } }, "฿/หน่วย"),
            h("th", { style: { textAlign: "right", padding: "8px 0", fontWeight: 600 } }, "รวม"),
          )),
          h("tbody", null, rows),
          h("tfoot", null,
            h("tr", { style: { borderTop: "1.5px solid var(--text)" } },
              h("td", { colspan: "3", style: { padding: "9px 0", fontWeight: 700, fontSize: "13px" } }, "รวมค่าใช้จ่ายรายเมนู"),
              h("td", { class: "tnum", style: { textAlign: "right", padding: "9px 0", fontWeight: 800, fontSize: "14px", color: "var(--primary-dark)" } }, "฿" + fmt(c.menuTotal)),
            ),
            h("tr", null, h("td", { colspan: "3", style: { padding: "2px 0", fontWeight: 600, fontSize: "12.5px", color: "var(--muted)" } }, "+ ค่าส่ง"), tfShip),
            h("tr", null, h("td", { colspan: "3", style: { padding: "6px 0 4px", fontWeight: 800, fontSize: "13.5px" } }, "รวมทั้งหมดรอบนี้"), tfTotal),
          ),
        ),
      ),
      note([h("span", null, "ค่าใช้จ่ายนี้คิดอัตโนมัติเมื่อพนักงานกด "), bold('"ยืนยันรับของ"'), " ที่หน้าแรก — เจ้าของเพิ่มแค่ ", bold("ค่าส่ง")]),
    ),
  );
  refresh();
}

function paintCalendar(root) {
  const { back } = oest.ctx;
  // month aggregate (ใช้ค่าส่งจาก shipMap)
  let menu = 0, ship = 0, pending = 0;
  RECV_DAYS.forEach((d) => { const c = dayCalc(d); menu += c.menuTotal; ship += (c.ship || 0); if (c.ship == null) pending++; });
  const mt = { menu, ship, total: menu + ship, batches: RECV_DAYS.length, pending };

  const calCells = [];
  for (let d = 1; d <= 30; d++) {
    const c = dayCalc(d);
    const future = d > TODAY.d;
    if (!c) { calCells.push(h("div", { class: "oe-day empty" + (future ? " future" : "") }, h("span", { class: "dn" }, String(d)))); continue; }
    calCells.push(h("button", { type: "button", class: "oe-day has" + (d === TODAY.d ? " today" : ""), onClick: () => { oest.openDay = d; paint(root); } },
      h("span", { class: "dn" }, String(d), c.ship == null && h("i", { class: "pend-dot", "aria-label": "รอกรอกค่าส่ง" })),
      h("span", { class: "amt tnum" }, "฿" + kBaht(c.total)),
    ));
  }

  const allRows = [...RECV_DAYS].reverse().map((d, i, arr) => {
    const c = dayCalc(d);
    return h("button", { type: "button", class: "rowflex list-press", style: { width: "100%", border: 0, background: "transparent", textAlign: "left", padding: "12px 2px", borderBottom: i < arr.length - 1 ? "1px solid var(--border-soft)" : "none" }, onClick: () => { oest.openDay = d; paint(root); } },
      h("span", { class: "catic amber sm" }, pi("truck", 15)),
      h("span", { style: { flex: 1, minWidth: 0 } },
        h("span", { style: { display: "block", fontWeight: 700, fontSize: "14px" } }, d + " มิ.ย. · " + c.count + " รายการ"),
        h("span", { class: "tnum", style: { display: "block", fontSize: "11.5px", color: "var(--muted)" } }, "เมนู ฿" + fmt(c.menuTotal) + " · ค่าส่ง " + (c.ship == null ? "รอกรอก" : "฿" + fmt(c.ship))),
      ),
      h("span", { class: "tnum", style: { fontWeight: 800, fontSize: "14.5px", color: "var(--warning-ink)" } }, "฿" + fmt(c.total)),
      (() => { const x = pi("chev", 15); x.style.color = "var(--faint)"; return x; })(),
    );
  });

  root.replaceChildren(
    hdr({ title: "ค่าใช้จ่ายสั่งอาหาร", sub: "ต้นทุนรับของรายวัน · มิ.ย. 2569", onBack: back, right: h("span", { class: "owner-tag" }, pi("lock", 11), "เจ้าของ") }),
    h("div", { class: "page stack" },
      note([h("span", null, "ทุกครั้งที่พนักงานกด "), bold('"ยืนยันรับของ"'), " (หน้าแรก → สั่งของ/รับของ) ระบบดึง", bold("ต้นทุน/หน่วยจากข้อมูลกลาง"), "มาคิดเป็นค่าใช้จ่าย — แตะวันในปฏิทินเพื่อดูรายละเอียด"], { iconName: "truck" }),
      h("div", { class: "card soft-card soft-amber" },
        h("div", { class: "split" }, h("span", { class: "overline", style: { color: "#92560B" } }, "ค่าใช้จ่ายสั่งอาหารรวม · เดือนนี้"), tag(mt.batches + " รอบ", { kind: "warn", iconName: "truck" })),
        h("div", { class: "big-num tnum", style: { fontSize: "28px", color: "var(--warning-ink)", margin: "4px 0 10px" } }, "฿" + fmt(mt.total)),
        h("div", { class: "rowflex", style: { gap: "10px" } },
          h("div", { style: { flex: 1, textAlign: "center" } }, h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "รายเมนู (วัตถุดิบ)"), h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "16px", color: "var(--primary-dark)" } }, "฿" + fmt(mt.menu))),
          h("span", { class: "tnum", style: { color: "var(--faint)", fontSize: "16px" } }, "+"),
          h("div", { style: { flex: 1, textAlign: "center" } }, h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, "ค่าส่งรวม"), h("div", { class: "tnum", style: { fontWeight: 800, fontSize: "16px", color: "var(--text)" } }, "฿" + fmt(mt.ship))),
        ),
      ),
      mt.pending > 0 && note([h("span", null, "มี "), bold(mt.pending + " รอบ"), " ที่ยัง", bold("ไม่ได้กรอกค่าส่ง"), " — แตะวันที่มีจุดส้มเพื่อกรอกให้ครบ"], { amber: true }),
      h("div", { class: "card", style: { padding: "14px" } },
        h("div", { class: "oe-grid", style: { marginBottom: "4px" } }, ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((w) => h("div", { class: "cal-dow" }, w))),
        h("div", { class: "oe-grid" }, calCells),
        h("div", { class: "rowflex", style: { gap: "14px", marginTop: "10px", fontSize: "11.5px", color: "var(--muted)", flexWrap: "wrap" } },
          h("span", { class: "rowflex", style: { gap: "5px" } }, h("i", { style: { width: "8px", height: "8px", borderRadius: "3px", background: "#FDFBF4", border: "1px solid #EAD9B0" } }), "มีรับของ"),
          h("span", { class: "rowflex", style: { gap: "5px" } }, h("i", { style: { width: "6px", height: "6px", borderRadius: "99px", background: "var(--warning)" } }), "รอกรอกค่าส่ง"),
        ),
      ),
      h("div", { class: "overline" }, "รอบรับของทั้งหมด · เดือนนี้"),
      h("div", { class: "card", style: { padding: "4px 16px" } }, allRows),
      note([bold("เชื่อมหน้าแรก:"), " รายการ + จำนวน มาจาก \"ยืนยันรับของ\" · ต้นทุน/หน่วย มาจาก", bold("ข้อมูลกลาง"), " · ค่าส่งเจ้าของกรอกเอง"]),
    ),
  );
}
