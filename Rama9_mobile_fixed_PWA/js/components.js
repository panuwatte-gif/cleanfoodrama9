/* ============================================================
   components.js — ตัวช่วย render ที่ใช้ซ้ำทุกหน้า
   ============================================================ */
import { icon } from './icons.js';

export const baht = (n) => '฿' + Number(n || 0).toLocaleString('th-TH');
export const num = (n) => Number(n || 0).toLocaleString('th-TH');
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// KPI / stat card
export function kpi({ label, value, icon: ic, color = 'var(--basil-600)', bg = 'var(--sage-100)', delta, deltaDir }) {
  const deltaHtml = delta != null
    ? `<div class="kpi-delta ${deltaDir === 'down' ? 'down' : 'up'}">${icon(deltaDir === 'down' ? 'trendDown' : 'trendUp', 15)} ${esc(delta)}</div>`
    : '';
  return `<div class="kpi">
    <div class="kpi-ico" style="background:${bg};color:${color}">${icon(ic, 24)}</div>
    <div class="kpi-label">${esc(label)}</div>
    <div class="kpi-val">${value}</div>
    ${deltaHtml}
  </div>`;
}

// section header inside a page
export function pageHead({ title, desc, actions = '' }) {
  return `<div class="page-head">
    <div><h2>${esc(title)}</h2>${desc ? `<div class="desc">${desc}</div>` : ''}</div>
    <div class="row">${actions}</div>
  </div>`;
}

// "mock UI" badge
export const mockTag = (txt = 'Mock UI · standby') => `<span class="mock-tag">${icon('scan', 13)} ${esc(txt)}</span>`;

// locked / permission notice
export const lockedNote = (txt) => `<div class="locked owner-only">${icon('lock', 18)} <span>${esc(txt)}</span></div>`;

// simple bar chart from [{label,value,alt?}]
export function barChart(data, fmt = num) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return `<div class="bars">${data.map((d) => `
    <div class="bar-col">
      <div class="bar-val">${fmt(d.value)}</div>
      <div class="bar ${d.alt ? 'alt' : ''}" style="height:${Math.max(4, (d.value / max) * 100)}%;${d.color ? `background:${d.color}` : ''}"></div>
      <div class="bar-lbl">${esc(d.label)}</div>
    </div>`).join('')}</div>`;
}

// donut chart (conic-gradient) + legend from [{label,value,color}]
export function donut(data, size = 160) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0; const stops = [];
  data.forEach((d) => { const a = (acc / total) * 360, b = ((acc + d.value) / total) * 360; stops.push(`${d.color} ${a}deg ${b}deg`); acc += d.value; });
  const legend = data.map((d) => `<div class="lg"><span class="sw" style="background:${d.color}"></span><span style="flex:1">${esc(d.label)}</span><span class="data" style="color:var(--ink-2)">${Math.round((d.value / total) * 100)}%</span></div>`).join('');
  return `<div class="row" style="gap:24px">
    <div style="width:${size}px;height:${size}px;border-radius:999px;background:conic-gradient(${stops.join(',')});position:relative;flex-shrink:0">
      <div style="position:absolute;inset:26%;background:var(--paper);border-radius:999px;display:grid;place-items:center;box-shadow:var(--sh-1)">
        <div style="text-align:center"><div class="data" style="font-size:22px;font-weight:600">${num(total)}</div><div style="font-size:11px;color:var(--ink-3)">รวม</div></div>
      </div>
    </div>
    <div class="legend" style="flex:1">${legend}</div>
  </div>`;
}

// line/area sparkline-ish chart via SVG
export function areaChart(values, { w = 640, h = 200, color = 'var(--basil-600)', fill = 'rgba(47,143,91,.12)' } = {}) {
  const max = Math.max(...values, 1), min = Math.min(...values, 0);
  const rng = max - min || 1;
  const step = w / (values.length - 1 || 1);
  const pts = values.map((v, i) => [i * step, h - ((v - min) / rng) * (h - 20) - 10]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block">
    <path d="${area}" fill="${fill}"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="var(--paper)" stroke="${color}" stroke-width="2"/>`).join('')}
  </svg>`;
}

export { icon };
