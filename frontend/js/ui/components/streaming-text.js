/**
 * @fileoverview Text that appears word by word, then turns into formatted Markdown.
 */

import { el } from "../dom.js";
import { MarkdownRenderer } from "../markdown.js";

const renderer = new MarkdownRenderer();

/** A block of model text that can stream in and then be formatted. */
export class StreamingText {
  /** @type {string} */
  #raw = "";

  constructor() {
    /** @const {!HTMLElement} */
    this.element = el("div", { class: "prose" });
  }

  /** @return {boolean} Whether any text has arrived. */
  get isEmpty() {
    return this.#raw.length === 0;
  }

  /**
   * Appends newly generated text, shown as plain text while streaming.
   * @param {string} text The new piece of text.
   */
  append(text) {
    this.#raw += text;
    this.element.textContent = this.#raw;
    this.element.classList.add("is-streaming");
  }

  /**
   * Replaces the content with the final, formatted answer.
   * @param {string} markdown The complete answer.
   */
  setMarkdown(markdown) {
    this.#raw = markdown;
    // Safe: MarkdownRenderer escapes all input before adding its own tags.
    this.element.innerHTML = renderer.render(markdown);
    this.element.classList.remove("is-streaming");
  }

  /**
   * Replaces the content with plain text.
   * @param {string} text Text to show.
   */
  setPlain(text) {
    this.#raw = text;
    this.element.textContent = text;
    this.element.classList.remove("is-streaming");
  }

  /** Removes all text. */
  clear() {
    this.#raw = "";
    this.element.replaceChildren();
    this.element.classList.remove("is-streaming");
  }
}
