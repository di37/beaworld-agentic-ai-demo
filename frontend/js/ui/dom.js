/**
 * @fileoverview Small DOM helpers. Text is always set with textContent, so
 * model output can never inject HTML through these functions.
 */

/**
 * Creates an element with attributes, event listeners and children.
 *
 * Special attribute keys: `class`, `text` (textContent), `style` (object of
 * CSS properties) and `onEventName` (event listener). `false`, `null` and
 * `undefined` values are skipped; `true` sets an empty attribute.
 *
 * @param {string} tag Element name.
 * @param {!Object<string, *>=} attrs Attributes and listeners.
 * @param {...(Node|string|null|undefined|false)} children Child nodes or text.
 * @return {!HTMLElement} The new element.
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key === "class") node.className = String(value);
    else if (key === "text") node.textContent = String(value);
    else if (key === "style") Object.assign(node.style, value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? "" : String(value));
  }
  node.append(...children.filter((child) => child !== null && child !== undefined && child !== false));
  return node;
}

/** @const {boolean} Whether the viewer asked the system for less motion. */
const PREFERS_REDUCED_MOTION =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Scrolls an element into view without jumping when it is already visible.
 * @param {!Element} node The element to reveal.
 */
export function revealGently(node) {
  node.scrollIntoView({ block: "nearest", behavior: PREFERS_REDUCED_MOTION ? "auto" : "smooth" });
}
