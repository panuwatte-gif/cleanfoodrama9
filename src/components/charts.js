// ============================================================
// components/charts.js — กราฟ SVG (vanilla) พอร์ตจาก prototype2/ui.jsx + screens-reports.jsx
//   lineChart(data, { color, h })           — เส้นสะสม (#11 #12b)
//   comboChart({ daily, target, breakeven }) — แท่งรับ/จ่าย + เส้นสะสม + เส้นประเป้า/คุ้มทุน (#10)
// ใช้ class จาก proto.css (.linechart .combo .combo-legend)
// ============================================================

const NS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
  return el;
}

/* ---------- กราฟเส้นสะสม ---------- */
export function lineChart(data, { color = "var(--primary)", h = 92 } = {}) {
  const W = 300, H = h, pad = 6, padB = 16;
  const vals = data.map((d) => d.v);
  const max = Math.max(...vals), min = Math.min(...vals, 0);
  const span = max - min || 1;
  const x = (i) => pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v) => pad + (1 - (v - min) / span) * (H - pad - padB);
  const pts = data.map((d, i) => [x(i), y(d.v)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = "M" + pts[0][0].toFixed(1) + " " + (H - padB) + " " + pts.map((p) => "L" + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") + " L" + pts[pts.length - 1][0].toFixed(1) + " " + (H - padB) + " Z";

  const svg = svgEl("svg", { class: "linechart", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });
  svg.style.height = H + "px";
  svg.appendChild(svgEl("line", { class: "ln-grid", x1: pad, y1: H - padB, x2: W - pad, y2: H - padB }));
  svg.appendChild(svgEl("path", { class: "ln-area", d: area, fill: color }));
  svg.appendChild(svgEl("path", { class: "ln-stroke", d: line, stroke: color }));
  pts.forEach((p, i) => {
    if (i === pts.length - 1 || i % 2 === 0) {
      const t = svgEl("text", { class: "ln-lbl", x: p[0], y: H - 4, "text-anchor": i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle" });
      t.textContent = data[i].label;
      svg.appendChild(t);
    }
  });
  svg.appendChild(svgEl("circle", { class: "ln-dot", cx: pts[pts.length - 1][0], cy: pts[pts.length - 1][1], r: 4, fill: color }));
  return svg;
}

/* ---------- กราฟผสม รายรับ-จ่าย (#10) ---------- */
export function comboChart({ daily, target, breakeven }) {
  const W = 328, H = 168, padL = 4, padR = 4, padB = 20, padT = 10;
  const n = daily.length;
  let acc = 0; const cum = daily.map((d) => (acc += d.in, acc));
  const leftMax = Math.max(...daily.flatMap((d) => [d.in, d.ex]), breakeven) * 1.18 || 1;
  const rightMax = Math.max(cum[cum.length - 1], target) * 1.04 || 1;
  const innerW = W - padL - padR;
  const x = (i) => padL + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const bw = Math.max(4, Math.min(11, innerW / n / 2.6));
  const yL = (v) => padT + (1 - v / leftMax) * (H - padT - padB);
  const yR = (v) => padT + (1 - v / rightMax) * (H - padT - padB);
  const base = H - padB;
  const cumPts = cum.map((v, i) => [x(i), yR(v)]);
  const cumLine = cumPts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const cumArea = "M" + cumPts[0][0].toFixed(1) + " " + base + " " + cumPts.map((p) => "L" + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") + " L" + cumPts[n - 1][0].toFixed(1) + " " + base + " Z";

  const svg = svgEl("svg", { class: "combo", viewBox: `0 0 ${W} ${H}` });
  svg.style.height = H + "px";
  svg.appendChild(svgEl("line", { class: "axis", x1: padL, y1: base, x2: W - padR, y2: base }));
  daily.forEach((d, i) => {
    const g = svgEl("g", {});
    g.appendChild(svgEl("rect", { class: "bar-in", x: x(i) - bw - 0.8, y: yL(d.in), width: bw, height: Math.max(1, base - yL(d.in)), rx: 2 }));
    g.appendChild(svgEl("rect", { class: "bar-ex", x: x(i) + 0.8, y: yL(d.ex), width: bw, height: Math.max(1, base - yL(d.ex)), rx: 2 }));
    const t = svgEl("text", { class: "axis-lbl", x: x(i), y: H - 6, "text-anchor": "middle" });
    t.textContent = d.d;
    g.appendChild(t);
    svg.appendChild(g);
  });
  svg.appendChild(svgEl("line", { class: "be-line", x1: padL, y1: yL(breakeven), x2: W - padR, y2: yL(breakeven) }));
  svg.appendChild(svgEl("line", { class: "tg-line", x1: padL, y1: yR(target), x2: W - padR, y2: yR(target) }));
  svg.appendChild(svgEl("path", { class: "cum-area", d: cumArea }));
  svg.appendChild(svgEl("path", { class: "cum-line", d: cumLine }));
  svg.appendChild(svgEl("circle", { class: "cum-dot", cx: cumPts[n - 1][0], cy: cumPts[n - 1][1], r: 3.6 }));
  return svg;
}

/* ---------- แท่งย้อนหลัง 30 วัน (วันนี้ทึบ · ย้อนหลังพาสเทล) ---------- */
export function miniBars(data, { solid = "#4FB985", soft = "#CDEBD9", h = 88 } = {}) {
  const W = 320, H = h, padB = 14, padT = 6;
  const n = data.length;
  const max = Math.max(...data.map((d) => d.v)) || 1;
  const gap = 1.5;
  const bw = (W - gap * (n - 1)) / n;
  const base = H - padB;
  const y = (v) => padT + (1 - v / max) * (H - padT - padB);
  const svg = svgEl("svg", { class: "minibars", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });
  svg.style.height = H + "px";
  svg.appendChild(svgEl("line", { class: "mb-axis", x1: 0, y1: base, x2: W, y2: base }));
  data.forEach((d, i) => {
    const x = i * (bw + gap);
    const ph = Math.max(2, base - y(d.v));
    svg.appendChild(svgEl("rect", {
      x: x.toFixed(1), y: y(d.v).toFixed(1), width: bw.toFixed(1), height: ph.toFixed(1),
      rx: Math.min(2.4, bw / 2.4), fill: d.today ? solid : soft,
    }));
  });
  return svg;
}

/* ---------- กราฟเดียว 2 แกน: แท่งซ้อน "ยอดขายรายวันแยกสาขา" (แกนซ้าย) + เส้น "ยอดสะสม" (แกนขวา)
   • แท่งวันในเดือนนี้ (actual) = สีสด · วันที่เกินมา (พยากรณ์) = โปร่งใส
   • แกนขวา = เส้นกริด + ป้าย K (0/80K/…) · ปลายเส้นติดป้ายยอดสะสมจริง ---------- */
const _NICE = [1, 1.5, 2, 2.5, 3, 4, 5, 8, 10];
function niceCeil(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (_NICE.find((x) => x >= n - 1e-9) || 10) * p;
}
const kLabel = (v) => (v >= 1000 ? Math.round(v / 1000) + "K" : String(Math.round(v)));

/* ---------- โดนัท: สัดส่วนรายได้ตามช่องทาง ---------- */
export function pieChart(segs, { size = 132, thickness = 26 } = {}) {
  const live = (segs || []).filter((s) => s.value > 0);
  const total = live.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2, cx = r, cy = r, ir = r - thickness;
  const svg = svgEl("svg", { class: "pie", viewBox: `0 0 ${size} ${size}`, width: size, height: size });
  svg.style.flex = "none";
  if (live.length === 1) {
    // 100% เดียว → วงแหวนเต็ม (outer fill + inner bg)
    svg.appendChild(svgEl("circle", { cx, cy, r, fill: live[0].color }));
    svg.appendChild(svgEl("circle", { cx, cy, r: ir, fill: "var(--surface)" }));
    return svg;
  }
  let a0 = -Math.PI / 2;
  const P = (ang, rad) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
  live.forEach((seg) => {
    const frac = seg.value / total;
    const a1 = a0 + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const [x0, y0] = P(a0, r), [x1, y1] = P(a1, r), [x2, y2] = P(a1, ir), [x3, y3] = P(a0, ir);
    const d = `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)} A${ir} ${ir} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)} Z`;
    svg.appendChild(svgEl("path", { class: "pie-seg", d, fill: seg.color }));
    a0 = a1;
  });
  return svg;
}

/* ---------- แท่งเดี่ยว: ยอดขายรวมรายวัน (สเกลของตัวเอง) ---------- */
export function barChart(data, { h = 118, color = "#7BC8A0" } = {}) {
  const W = 320, H = h, padT = 12, padB = 18, padR = 4, padL = 22;
  const n = data.length || 1;
  const max = niceCeil(Math.max(...data.map((d) => d.v), 1));
  const base = H - padB;
  const innerW = W - padL - padR;
  const gap = Math.min(9, innerW / n * 0.32);
  const bw = Math.max(5, (innerW - gap * (n - 1)) / n);
  const y = (v) => padT + (1 - v / max) * (H - padT - padB);
  const svg = svgEl("svg", { class: "barchart", viewBox: `0 0 ${W} ${H}` });
  svg.style.height = H + "px";
  [0, 0.5, 1].forEach((t) => {
    const gv = max * t, gy = y(gv);
    svg.appendChild(svgEl("line", { class: t === 0 ? "axis" : "grid-r", x1: padL, y1: gy, x2: W - padR, y2: gy }));
    const lb = svgEl("text", { class: "tick-r", x: padL - 3, y: gy + 3, "text-anchor": "end" });
    lb.textContent = kLabel(gv);
    svg.appendChild(lb);
  });
  const every = Math.ceil(n / 7) || 1;
  data.forEach((d, i) => {
    const x = padL + i * (bw + gap);
    const ph = Math.max(2, base - y(d.v));
    svg.appendChild(svgEl("rect", { x: x.toFixed(1), y: y(d.v).toFixed(1), width: bw.toFixed(1), height: ph.toFixed(1), rx: Math.min(3, bw / 2.5), fill: color }));
    if (i % every === 0 || i === n - 1) {
      const t = svgEl("text", { class: "axis-lbl", x: (x + bw / 2).toFixed(1), y: H - 5, "text-anchor": "middle" });
      t.textContent = d.label;
      svg.appendChild(t);
    }
  });
  return svg;
}

/* ---------- เส้นสะสม 3 เส้น: รายรับสะสม + รายจ่ายสะสม + กำไรสะสม (แกนขวา = บาท สะสม)
   + แท่งรายได้รายวัน (แกนซ้าย คนละสเกล) → เส้นสะสมไม่แบนเพราะตัวเลขต่างกันมาก ----------
   daily = [{ d, in, ex }] (in = รายได้/วัน · ex = รายจ่าย/วัน) */
export function cumLinesChart({ daily, h = 192, showBars = true } = {}) {
  const W = 336, H = h, padL = 6, padR = 36, padB = 20, padT = 22;
  const n = daily.length || 1;
  let ai = 0, ae = 0;
  const cum = daily.map((d) => { ai += (d.in || 0); ae += (d.ex || 0); return { d: d.d, in: d.in || 0, cin: ai, cex: ae, cpf: ai - ae }; });
  const innerW = W - padL - padR;
  const x = (i) => padL + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  // แกนขวา: ยอดสะสม (ครอบกำไรที่อาจติดลบด้วย)
  const cmax = Math.max(...cum.map((c) => c.cin), 1);
  const cmin = Math.min(0, ...cum.map((c) => c.cpf));
  const step = niceCeil((cmax - cmin) / 3) || 1;
  const top = Math.ceil(cmax / step) * step;
  const bot = Math.floor(cmin / step) * step;
  const span = (top - bot) || 1;
  const yR = (v) => padT + (1 - (v - bot) / span) * (H - padT - padB);
  // แกนซ้าย: รายได้/วัน (แท่ง)
  const dmax = Math.max(...daily.map((d) => d.in || 0), 1) * 1.2;
  const base = H - padB;
  const yL = (v) => padT + (1 - v / dmax) * (H - padT - padB);

  const svg = svgEl("svg", { class: "combo cumlines", viewBox: `0 0 ${W} ${H}` });
  svg.style.height = H + "px";
  for (let g = bot; g <= top + 1e-6; g += step) {
    const gy = yR(g);
    svg.appendChild(svgEl("line", { class: Math.abs(g) < 1e-6 ? "axis" : "grid-r", x1: padL, y1: gy, x2: W - padR, y2: gy }));
    const lb = svgEl("text", { class: "tick-r", x: W - padR + 4, y: gy + 3 }); lb.textContent = kLabel(g); svg.appendChild(lb);
  }
  if (showBars) {
    const bw = Math.max(3.5, Math.min(13, innerW / n / 1.5));
    cum.forEach((c, i) => { const yt = yL(c.in); svg.appendChild(svgEl("rect", { class: "cl-bar", x: (x(i) - bw / 2).toFixed(1), y: yt.toFixed(1), width: bw.toFixed(1), height: Math.max(0.6, base - yt).toFixed(1), rx: 2 })); });
  }
  cum.forEach((c, i) => { if (i % 2 === 0 || i === n - 1) { const t = svgEl("text", { class: "axis-lbl", x: x(i), y: H - 6, "text-anchor": "middle" }); t.textContent = c.d; svg.appendChild(t); } });
  const lineOf = (key) => cum.map((c, i) => [x(i), yR(c[key])]);
  const pathOf = (pts) => pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const inPts = lineOf("cin"), exPts = lineOf("cex"), pfPts = lineOf("cpf");
  svg.appendChild(svgEl("path", { class: "cl-ex", d: pathOf(exPts) }));
  svg.appendChild(svgEl("path", { class: "cl-pf", d: pathOf(pfPts) }));
  svg.appendChild(svgEl("path", { class: "cl-in", d: pathOf(inPts) }));
  [["cl-dot-ex", exPts], ["cl-dot-pf", pfPts], ["cl-dot-in", inPts]].forEach(([cls, pts]) => { const p = pts[n - 1]; svg.appendChild(svgEl("circle", { class: cls, cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 3.4 })); });
  return svg;
}

export function branchCombo({ days, branches, h = 168, fmt = (x) => x, cycleColors = null, lineColor = null } = {}) {
  const W = 332, H = h, padL = 6, padR = 33, padB = 19, padT = 22;
  const n = days.length;
  const dailyMax = Math.max(...days.map((d) => d.total), 1) * 1.18;
  let acc = 0; const cum = days.map((d) => (acc += d.total, acc));
  const cumTotal = cum[n - 1] || 0;
  const step = niceCeil(cumTotal / 3);
  const cumMax = step * 3 || 1;
  const innerW = W - padL - padR;
  const x = (i) => padL + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const bw = Math.max(7, Math.min(20, innerW / n / 1.4));
  const base = H - padB;
  const yL = (v) => padT + (1 - v / dailyMax) * (H - padT - padB);
  const yR = (v) => padT + (1 - v / cumMax) * (H - padT - padB);

  const svg = svgEl("svg", { class: "combo branch-combo", viewBox: `0 0 ${W} ${H}` });
  svg.style.height = H + "px";

  // เส้นกริด + ป้ายแกนขวา (มาตราส่วนยอดสะสม)
  for (let t = 0; t <= 3; t++) {
    const gv = step * t, gy = yR(gv);
    svg.appendChild(svgEl("line", { class: t === 0 ? "axis" : "grid-r", x1: padL, y1: gy, x2: W - padR, y2: gy }));
    const lbl = svgEl("text", { class: "tick-r", x: W - padR + 4, y: gy + 3 });
    lbl.textContent = kLabel(gv);
    svg.appendChild(lbl);
  }

  // แท่งซ้อนรายวัน (แต่ละชั้น = หนึ่งสาขา) · วันพยากรณ์ = โปร่งใส
  // cycleColors → มีช่องทางเดียว (ร้านเดียว): ระบายสีพาสเทลสลับกันต่อวัน (ไม่จำเจาะเขียว)
  days.forEach((d, i) => {
    const cx = x(i);
    if (cycleColors) {
      const v = d.total || 0;
      if (v > 0) {
        const yTop = yL(v);
        svg.appendChild(svgEl("rect", {
          class: "bc-seg", x: (cx - bw / 2).toFixed(1), y: yTop.toFixed(1),
          width: bw.toFixed(1), height: Math.max(0.6, base - yTop).toFixed(1),
          rx: 3, fill: cycleColors[i % cycleColors.length],
          "fill-opacity": d.actual === false ? 0.32 : 1,
        }));
      }
    } else {
      let running = 0;
      branches.forEach((b, bi) => {
        const v = d.byBranch[b.name] || 0;
        if (v <= 0) return;
        const yTop = yL(running + v), yBot = yL(running);
        svg.appendChild(svgEl("rect", {
          class: "bc-seg", x: (cx - bw / 2).toFixed(1), y: yTop.toFixed(1),
          width: bw.toFixed(1), height: Math.max(0.6, yBot - yTop).toFixed(1),
          rx: bi === branches.length - 1 ? 2.5 : 0, fill: b.color,
          "fill-opacity": d.actual === false ? 0.32 : 1,
        }));
        running += v;
      });
    }
    if (i % 2 === 0 || i === n - 1) {
      const t = svgEl("text", { class: "axis-lbl", x: cx, y: H - 6, "text-anchor": "middle" });
      t.textContent = d.d;
      svg.appendChild(t);
    }
  });

  // เส้นยอดสะสม (แกนขวา) + จุดทุกจุด
  const cumPts = cum.map((v, i) => [x(i), yR(v)]);
  const cumLine = cumPts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  svg.appendChild(svgEl("path", { class: "cum-line", d: cumLine, stroke: lineColor || null }));
  cumPts.forEach((p) => svg.appendChild(svgEl("circle", { class: "cum-dot", cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 2.8, fill: lineColor || null })));

  // ป้ายชื่อแกน (บนซ้าย) + ยอดสะสมจริงที่ปลายเส้น (บนขวา)
  const legDot = svgEl("circle", { class: "cum-dot", cx: padL + 3, cy: padT - 12, r: 3, fill: lineColor || null });
  svg.appendChild(legDot);
  const legTx = svgEl("text", { class: "combo-cap", x: padL + 10, y: padT - 9 });
  legTx.textContent = "ยอดสะสม";
  svg.appendChild(legTx);
  const endTx = svgEl("text", { class: "combo-end", x: W - padR, y: Math.max(padT - 8, cumPts[n - 1][1] - 7), "text-anchor": "end" });
  endTx.textContent = "฿" + fmt(cumTotal);
  svg.appendChild(endTx);
  return svg;
}

/* ---------- แนวโน้มรายได้ 2 ชนิด/2 ฐาน ----------
   • แท่ง (แกนซ้าย) = รายได้สุทธิรายวัน · เดือนนี้ = เขียวเข้ม · เดือนก่อน = เขียวจาง
   • เส้น (แกนขวา, คนละฐาน) = รายได้สะสมทั้งปี (YTD)
   • เส้นประ = จุดคุ้มทุน/วัน (แกนซ้าย)
   days = [{ label, net, cur, cum }] · breakeven = บาท/วัน */
export function revenueYtdCombo({ days, breakeven = 0, h = 210, fmt = (x) => x } = {}) {
  const W = 348, H = h, padL = 30, padR = 44, padT = 26, padB = 22;
  const n = days.length || 1;
  const innerW = W - padL - padR;
  const x = (i) => padL + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const gap = Math.min(5, innerW / n * 0.28);
  const bw = Math.max(4, (innerW - gap * (n - 1)) / n);

  // แกนซ้าย = รายได้/วัน (รวมเส้นคุ้มทุนในสเกลด้วย)
  const dmax = niceCeil(Math.max(...days.map((d) => d.net), breakeven, 1) * 1.12);
  // แกนขวา = ยอดสะสม YTD (ช่วงค่าจริงของหน้าต่าง 30 วัน)
  const cvals = days.map((d) => d.cum || 0);
  const cHi = Math.max(...cvals, 1), cLo = Math.min(...cvals, 0);
  const cStep = niceCeil((cHi - cLo) / 3) || 1;
  const cBot = Math.floor(cLo / cStep) * cStep;
  const cTop = Math.ceil(cHi / cStep) * cStep;
  const cSpan = (cTop - cBot) || 1;
  const base = H - padB;
  const yL = (v) => padT + (1 - v / dmax) * (H - padT - padB);
  const yR = (v) => padT + (1 - (v - cBot) / cSpan) * (H - padT - padB);

  const svg = svgEl("svg", { class: "combo", viewBox: `0 0 ${W} ${H}` });
  svg.style.height = H + "px";

  // กริดแนวนอน + ป้ายแกนซ้าย (บาท/วัน) และแกนขวา (สะสม K)
  [0, 0.5, 1].forEach((t) => {
    const gy = padT + (1 - t) * (H - padT - padB);
    svg.appendChild(svgEl("line", { class: t === 0 ? "axis" : "grid-r", x1: padL, y1: gy, x2: W - padR, y2: gy }));
    const lL = svgEl("text", { class: "tick-r", x: padL - 4, y: gy + 3, "text-anchor": "end" });
    lL.textContent = kLabel(dmax * t); svg.appendChild(lL);
    const lR = svgEl("text", { class: "tick-r", x: W - padR + 4, y: gy + 3 });
    lR.textContent = kLabel(cBot + cSpan * t); svg.appendChild(lR);
  });

  // แท่งรายได้สุทธิรายวัน
  const every = Math.ceil(n / 6) || 1;
  days.forEach((d, i) => {
    const cx = x(i), yt = yL(d.net);
    svg.appendChild(svgEl("rect", {
      x: (cx - bw / 2).toFixed(1), y: yt.toFixed(1), width: bw.toFixed(1),
      height: Math.max(0.8, base - yt).toFixed(1), rx: Math.min(2.5, bw / 2.5),
      fill: d.cur ? "#2E9B63" : "#BEE3CE",
    }));
    if (i % every === 0 || i === n - 1) {
      const t = svgEl("text", { class: "axis-lbl", x: cx, y: H - 6, "text-anchor": "middle" });
      t.textContent = d.label; svg.appendChild(t);
    }
  });

  // เส้นจุดคุ้มทุน (แกนซ้าย · เส้นประ)
  if (breakeven > 0 && breakeven <= dmax) {
    const by = yL(breakeven);
    svg.appendChild(svgEl("line", { x1: padL, y1: by.toFixed(1), x2: W - padR, y2: by.toFixed(1), stroke: "#E8734E", "stroke-width": 1.4, "stroke-dasharray": "4 3" }));
    const bt = svgEl("text", { class: "combo-cap", x: padL + 2, y: (by - 3).toFixed(1), fill: "#C8502B" });
    bt.textContent = "คุ้มทุน ฿" + fmt(breakeven); svg.appendChild(bt);
  }

  // เส้นรายได้สะสม YTD (แกนขวา)
  const pts = days.map((d, i) => [x(i), yR(d.cum || 0)]);
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  svg.appendChild(svgEl("path", { d: path, fill: "none", stroke: "#3F86D6", "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  const pe = pts[n - 1];
  svg.appendChild(svgEl("circle", { cx: pe[0].toFixed(1), cy: pe[1].toFixed(1), r: 3.4, fill: "#3F86D6", stroke: "#fff", "stroke-width": 1.6 }));
  const endTx = svgEl("text", { class: "combo-end", x: W - padR, y: Math.max(padT - 8, pe[1] - 8), "text-anchor": "end", fill: "#2E6BB0" });
  endTx.textContent = "สะสม ฿" + fmt(Math.round(days[n - 1].cum || 0)); svg.appendChild(endTx);
  return svg;
}
