/**
 * @fileoverview A card that shows the model's answer as it is generated.
 */

import { el } from "../dom.js";
import { icon } from "../icons.js";
import { StreamingText } from "./streaming-text.js";

/** The model's answer, streamed in and then formatted. */
export class AnswerPanel {
  /** @type {!StreamingText} */
  #body = new StreamingText();

  /**
   * @param {{title: string, iconName: (string|undefined)}} options Card title and icon.
   */
  constructor({ title, iconName = "spark" }) {
    /** @const {!HTMLElement} */
    this.element = el(
      "article",
      { class: "card answer", hidden: true },
      el("header", { class: "card__header" }, icon(iconName), el("h3", { text: title })),
      this.#body.element,
    );
  }

  /** Hides the card and clears its text. */
  reset() {
    this.#body.clear();
    this.element.hidden = true;
  }

  /**
   * Adds newly generated text.
   * @param {string} text The new piece of text.
   */
  appendToken(text) {
    this.element.hidden = false;
    this.#body.append(text);
  }

  /**
   * Shows the complete, formatted answer.
   * @param {string} markdown The answer.
   */
  setAnswer(markdown) {
    this.element.hidden = false;
    this.#body.setMarkdown(markdown);
  }
}
