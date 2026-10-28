/** Tiny DOM builders. Primitives build their DOM once in create(); render(t) only mutates it. */

const SVGNS = "http://www.w3.org/2000/svg";

const assign = (el, attrs = {}) => {
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "text") el.textContent = v;
    else if (k === "class") el.setAttribute("class", v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  return el;
};

export const h = (tag, attrs, ...children) => {
  const el = assign(document.createElement(tag), attrs);
  for (const c of children.flat()) if (c != null) el.append(c);
  return el;
};

export const s = (tag, attrs, ...children) => {
  const el = assign(document.createElementNS(SVGNS, tag), attrs);
  for (const c of children.flat()) if (c != null) el.append(c);
  return el;
};

/** An absolutely positioned, zero-size anchor at (x, y); children centre on it by default. */
export const anchor = (x, y, cls) =>
  h("div", { class: cls, style: { position: "absolute", left: `${x}px`, top: `${y}px`, width: "0px", height: "0px" } });

/** Set a style value only when it changed; keeps render(t) cheap. */
export const setStyle = (el, key, value) => {
  if (el.style[key] !== value) el.style[key] = value;
};

export const setAttr = (el, key, value) => {
  const v = String(value);
  if (el.getAttribute(key) !== v) el.setAttribute(key, v);
};

export const setText = (el, value) => {
  if (el.textContent !== value) el.textContent = value;
};

/** Lucide-style icons (ISC licence), inlined so rendering never touches the network. 24×24, stroke 1.75. */
export const ICONS = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  terminal: '<path d="m5 8 4 4-4 4"/><path d="M12 17h7"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  git: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5v7M18 15.5V11a4 4 0 0 0-4-4h-3"/><path d="m13 5-2 2 2 2"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  repo: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  loader: '<path d="M12 3a9 9 0 1 1-9 9"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.2-8.2M16 7l2 2M13.5 9.5l2 2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 8.5a4.5 4.5 0 0 1-.5 9.5z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>',
};

export const icon = (name, size = 24, color = "currentColor", stroke = 1.75) =>
  s("svg", {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: color,
    "stroke-width": stroke,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  }, htmlToSvg(ICONS[name] ?? ""));

const htmlToSvg = (markup) => {
  const g = document.createElementNS(SVGNS, "g");
  g.innerHTML = markup;
  return g;
};
