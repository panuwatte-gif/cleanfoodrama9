// ============================================================
// utils/dom.js — tiny hyperscript + DOM helpers.
// The ONLY DOM-construction primitive used across the app, so
// pages/components never touch document.createElement by hand.
// No framework — this is ~40 lines of vanilla.
// ============================================================

// h(tag, props?, ...children) → HTMLElement
//   props: { class, id, style:{}, onClick, dataset:{}, value, ... }
//   children: string | number | Node | array | falsy(skipped)
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k === "dataset" && typeof v === "object") Object.assign(el.dataset, v);
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k in el && k !== "list") {
        try { el[k] = v; } catch { el.setAttribute(k, v); }
      } else {
        el.setAttribute(k, v);
      }
    }
  }
  appendChildren(el, children);
  return el;
}

function appendChildren(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false || c === true) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

// Replace all children of `el` with `node(s)`.
export function mount(el, node) {
  el.replaceChildren();
  if (node == null) return el;
  appendChildren(el, [node]);
  return el;
}

export function clear(el) { el.replaceChildren(); return el; }

// Inline SVG icon from a raw path string (Lucide-style, 24px, currentColor).
export function icon(paths, size = 22) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.innerHTML = paths;
  return svg;
}
