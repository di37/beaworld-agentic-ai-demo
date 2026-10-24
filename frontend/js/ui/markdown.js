/**
 * @fileoverview A deliberately small Markdown renderer for model answers.
 *
 * Safety: the whole input is HTML-escaped first, so the only tags in the
 * output are the ones this renderer adds.
 */

/** @const {!Object<string, string>} */
const HTML_ESCAPES = Object.freeze({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" });

/**
 * Escapes text for safe use inside HTML.
 * @param {string} text Untrusted text.
 * @return {string} Escaped text.
 */
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** A list item: its marker indent, marker and text. */
const LIST_ITEM = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/;

/** Lines indented at least this much belong to the previous list item. */
const NESTED_INDENT = 2;

/**
 * @typedef {{text: string, sub: ?{tag: string, items: !Array<string>}}}
 */
let ListItem;

/** Renders headings, lists (one level of nesting), paragraphs, bold, italics and inline code. */
export class MarkdownRenderer {
  /**
   * Converts Markdown to safe HTML.
   * @param {string} markdown Model output.
   * @return {string} HTML containing only renderer-generated tags.
   */
  render(markdown) {
    const lines = escapeHtml(markdown ?? "").split(/\r?\n/);
    const state = lines.reduce((current, line) => this.#consume(current, line), {
      blocks: [],
      paragraph: [],
      list: null,
    });
    return this.#flushAll(state).blocks.join("");
  }

  /**
   * Adds one line to the parser state.
   * @param {{blocks: !Array<string>, paragraph: !Array<string>,
   *     list: ?{tag: string, start: number, items: !Array<!ListItem>}}} state
   * @param {string} line An escaped line.
   * @return {!Object} The next state.
   */
  #consume(state, line) {
    if (!line.trim()) return this.#flushAll(state);
    if (/^\s*-{3,}\s*$/.test(line)) return this.#addBlock(state, "<hr>");

    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (heading) return this.#addBlock(state, `<h4>${this.#inline(heading[1])}</h4>`);

    const listItem = line.match(LIST_ITEM);
    if (listItem) return this.#addListItem(this.#flushParagraph(state), listItem);

    if (state.list && line.search(/\S/) >= NESTED_INDENT) return this.#continueItem(state, line.trim());

    const base = this.#flushList(state);
    return { ...base, paragraph: [...base.paragraph, line.trim()] };
  }

  /**
   * Adds a list item: nested under the previous item when indented,
   * otherwise to the current list (or a new one, keeping its number).
   * @param {!Object} state Parser state.
   * @param {!Array<string>} match The LIST_ITEM match: indent, marker, text.
   * @return {!Object} The next state.
   */
  #addListItem(state, [, indent, marker, text]) {
    const tag = /\d/.test(marker) ? "ol" : "ul";
    if (state.list && indent.length >= NESTED_INDENT) return this.#addNestedItem(state, tag, text);
    if (state.list?.tag === tag) {
      return { ...state, list: { ...state.list, items: [...state.list.items, { text, sub: null }] } };
    }
    const flushed = this.#flushList(state);
    const start = tag === "ol" ? Number.parseInt(marker, 10) : 1;
    return { ...flushed, list: { tag, start, items: [{ text, sub: null }] } };
  }

  /**
   * Adds an item to the sub-list of the last list item.
   * @param {!Object} state Parser state with an open list.
   * @param {string} tag `ul` or `ol`, used if the sub-list is new.
   * @param {string} text Item text.
   * @return {!Object} The next state.
   */
  #addNestedItem(state, tag, text) {
    const items = state.list.items;
    const last = items.at(-1);
    const sub = last.sub ? { ...last.sub, items: [...last.sub.items, text] } : { tag, items: [text] };
    return { ...state, list: { ...state.list, items: [...items.slice(0, -1), { ...last, sub }] } };
  }

  /**
   * Appends a wrapped, indented line to the last list item.
   * @param {!Object} state Parser state with an open list.
   * @param {string} text The continuation text.
   * @return {!Object} The next state.
   */
  #continueItem(state, text) {
    const items = state.list.items;
    const last = items.at(-1);
    const updated = last.sub
      ? { ...last, sub: { ...last.sub, items: [...last.sub.items.slice(0, -1), `${last.sub.items.at(-1)} ${text}`] } }
      : { ...last, text: `${last.text} ${text}` };
    return { ...state, list: { ...state.list, items: [...items.slice(0, -1), updated] } };
  }

  /**
   * Closes open blocks, then appends a standalone block.
   * @param {!Object} state Parser state.
   * @param {string} html The block's HTML.
   * @return {!Object} The next state.
   */
  #addBlock(state, html) {
    const flushed = this.#flushAll(state);
    return { ...flushed, blocks: [...flushed.blocks, html] };
  }

  /**
   * Closes any open paragraph and list.
   * @param {!Object} state Parser state.
   * @return {!Object} The next state.
   */
  #flushAll(state) {
    return this.#flushList(this.#flushParagraph(state));
  }

  /**
   * Closes an open paragraph.
   * @param {!Object} state Parser state.
   * @return {!Object} The next state.
   */
  #flushParagraph(state) {
    if (!state.paragraph.length) return state;
    return { ...state, blocks: [...state.blocks, `<p>${this.#inline(state.paragraph.join(" "))}</p>`], paragraph: [] };
  }

  /**
   * Closes an open list.
   * @param {!Object} state Parser state.
   * @return {!Object} The next state.
   */
  #flushList(state) {
    if (!state.list) return state;
    const { tag, start, items } = state.list;
    const startAttribute = tag === "ol" && start !== 1 ? ` start="${start}"` : "";
    const html =
      `<${tag}${startAttribute}>` +
      items.map((item) => `<li>${this.#inline(item.text)}${this.#subList(item.sub)}</li>`).join("") +
      `</${tag}>`;
    return { ...state, blocks: [...state.blocks, html], list: null };
  }

  /**
   * @param {?{tag: string, items: !Array<string>}} sub A nested list, if any.
   * @return {string} Its HTML, or an empty string.
   */
  #subList(sub) {
    if (!sub) return "";
    return `<${sub.tag}>${sub.items.map((item) => `<li>${this.#inline(item)}</li>`).join("")}</${sub.tag}>`;
  }

  /**
   * Applies inline formatting to escaped text.
   * @param {string} text Escaped text.
   * @return {string} HTML.
   */
  #inline(text) {
    return text
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<em>$2</em>");
  }
}
