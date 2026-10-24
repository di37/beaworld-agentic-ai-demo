/**
 * @fileoverview "Question for the room" card with a hidden answer.
 */

import { el } from "../dom.js";
import { icon } from "../icons.js";

/** A question for the audience; the presenter reveals the answer. */
export class RoomQuestion {
  /** @type {!HTMLElement} */
  #answer;
  /** @type {!HTMLElement} */
  #button;

  /**
   * @param {{question: string, answer: string}} content Question and answer text.
   */
  constructor({ question, answer }) {
    this.#answer = el("p", { class: "room__answer", text: answer, hidden: true });
    this.#button = el(
      "button",
      { class: "btn btn--ghost btn--small", type: "button", onClick: () => this.reveal() },
      icon("eye", { size: 18 }),
      el("span", { text: "Reveal the answer" }),
    );
    /** @const {!HTMLElement} */
    this.element = el(
      "aside",
      { class: "room" },
      el("p", { class: "kicker", text: "Question for the room" }),
      el("p", { class: "room__question", text: question }),
      this.#button,
      this.#answer,
    );
  }

  /** Shows the answer. */
  reveal() {
    this.#answer.hidden = false;
    this.#button.hidden = true;
  }

  /** Hides the answer again. */
  reset() {
    this.#answer.hidden = true;
    this.#button.hidden = false;
  }

  /**
   * Replaces the answer, for questions whose answer depends on the run.
   * @param {string} text The new answer.
   */
  setAnswer(text) {
    this.#answer.textContent = text;
  }
}
