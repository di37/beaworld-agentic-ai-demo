/**
 * @fileoverview A one-line progress / error indicator under the controls.
 */

import { el } from "../dom.js";
import { icon } from "../icons.js";

/** Shows what the demo is doing right now. */
export class StatusLine {
  /** @type {!HTMLElement} */
  #text;
  /** @type {string} */
  #state = "idle";
  /** @type {boolean} */
  #showProgress;

  /**
   * @param {{showProgress: (boolean|undefined)}=} options Set `showProgress`
   *     to false to show only errors and pauses.
   */
  constructor({ showProgress = true } = {}) {
    this.#showProgress = showProgress;
    this.#text = el("span", { class: "status__text" });
    /** @const {!HTMLElement} */
    this.element = el(
      "div",
      { class: "status", role: "status", "aria-live": "polite", hidden: true },
      el("span", { class: "status__spinner", "aria-hidden": "true" }),
      icon("alert", { size: 18 }),
      this.#text,
    );
  }

  /**
   * Shows a spinner with a progress message.
   * @param {string} message What is happening.
   */
  working(message) {
    if (this.#showProgress) this.#set("working", message);
  }

  /**
   * Shows that the demo is paused, waiting for a person.
   * @param {string} message What it is waiting for.
   */
  waiting(message) {
    this.#set("waiting", message);
  }

  /**
   * Shows an error.
   * @param {string} message Friendly error message.
   */
  error(message) {
    this.#set("error", message);
  }

  /** Hides the line after a run, unless it is showing an error or a pause. */
  finish() {
    if (this.#state === "working") this.#set("idle", "");
  }

  /**
   * @param {string} state One of idle, working, waiting or error.
   * @param {string} message Text to display.
   */
  #set(state, message) {
    this.#state = state;
    this.element.dataset.state = state;
    this.element.hidden = state === "idle";
    this.#text.textContent = message;
  }
}
