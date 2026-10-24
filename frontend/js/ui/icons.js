/**
 * @fileoverview A tiny line-icon set drawn as inline SVG (24×24 grid).
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/** @const {!Object<string, !Array<string>>} SVG path data for each icon. */
const PATHS = Object.freeze({
  play: ["M7 4.5v15l12-7.5z"],
  spark: ["M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"],
  program: ["M3 5h18v11H3z", "M8 20h8", "M12 16v4"],
  thermometer: ["M14 14.8V4.5a2 2 0 0 0-4 0v10.3a4 4 0 1 0 4 0z"],
  history: ["M9 3h6v3H9z", "M9 4.5H6v16h12v-16h-3", "M9 11h6", "M9 15h4"],
  book: ["M5 4.5A1.5 1.5 0 0 1 6.5 3H19v14H6.5A1.5 1.5 0 0 0 5 18.5z", "M5 18.5A1.5 1.5 0 0 0 6.5 20H19"],
  ticket: ["M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z", "M14 7v10"],
  search: ["M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z", "M20 20l-4.8-4.8"],
  loop: ["M20 11a8 8 0 0 0-14.3-4.6L4 8", "M4 3v5h5", "M4 13a8 8 0 0 0 14.3 4.6L20 16", "M20 21v-5h-5"],
  shield: ["M12 3l8 3v6c0 4.5-3.4 7.8-8 9-4.6-1.2-8-4.5-8-9V6z", "M8.5 12l2.5 2.5 4.5-5"],
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  cross: ["M6 6l12 12", "M18 6L6 18"],
  alert: [
    "M12 9v4",
    "M12 17h.01",
    "M10.3 3.9L2.4 17.5a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  ],
  chat: ["M21 12a8 8 0 0 1-11.7 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12z"],
  send: ["M21 3L10 14", "M21 3l-7 18-4-7-7-4z"],
  arrowRight: ["M5 12h14", "M13 6l6 6-6 6"],
  arrowLeft: ["M19 12H5", "M11 6l-6 6 6 6"],
  reset: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"],
  edit: ["M4 20h4L19 9l-4-4L4 16z", "M13.5 6.5l4 4"],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  wind: ["M3 8h11a3 3 0 1 0-3-3", "M3 12h16a3 3 0 1 1-3 3", "M3 16h7"],
  gauge: ["M12 14l4-4", "M3.5 18a9 9 0 1 1 17 0"],
  target: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M12 12h.01"],
  dot: ["M12 12h.01"],
});

/**
 * Creates an icon element.
 * @param {string} name Icon name from the set above.
 * @param {{size: (number|undefined), label: (string|undefined)}=} options
 *     Pixel size, and an accessible label if the icon carries meaning.
 * @return {!SVGSVGElement} The icon.
 */
export function icon(name, { size = 20, label } = {}) {
  const svg = document.createElementNS(SVG_NS, "svg");
  const attributes = {
    viewBox: "0 0 24 24",
    width: String(size),
    height: String(size),
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    class: "icon",
  };
  for (const [key, value] of Object.entries(attributes)) svg.setAttribute(key, value);
  if (label) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
  } else {
    svg.setAttribute("aria-hidden", "true");
  }
  for (const d of PATHS[name] ?? PATHS.dot) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}
