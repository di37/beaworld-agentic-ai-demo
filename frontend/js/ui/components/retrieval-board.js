/**
 * @fileoverview Level 3 step 1: every manual section with its match score.
 */

import { el } from "../dom.js";
import { icon } from "../icons.js";

/** Ranks the manual sections and highlights the ones sent to the model. */
export class RetrievalBoard {
  /** @type {!HTMLElement} */
  #list;

  constructor() {
    this.#list = el("ol", { class: "retrieval__list" });
    /** @const {!HTMLElement} */
    this.element = el(
      "section",
      { class: "card", hidden: true },
      el(
        "header",
        { class: "card__header" },
        icon("search"),
        el("h3", { text: "Step 1 · Search the manual" }),
        el("span", { class: "card__hint", text: "Top 2 go to the model" }),
      ),
      this.#list,
    );
  }

  /** Clears the board. */
  reset() {
    this.#list.replaceChildren();
    this.element.hidden = true;
  }

  /**
   * Displays the ranked sections.
   * @param {{documents: !Array<{source: string, title: string, score: number, retrieved: boolean}>}} result
   * @param {!Array<string>=} editedSources Sections the presenter edited.
   */
  show({ documents }, editedSources = []) {
    const best = Math.max(...documents.map((doc) => doc.score), Number.EPSILON);
    const edited = new Set(editedSources);
    this.#list.replaceChildren(
      ...documents.map((doc, index) => RetrievalBoard.#row(doc, index, best, edited.has(doc.source))),
    );
    this.element.hidden = false;
  }

  /**
   * @param {{source: string, title: string, score: number, retrieved: boolean}} doc Ranked section.
   * @param {number} index Position in the ranking.
   * @param {number} best Highest score, used to scale the bars.
   * @param {boolean} edited Whether the presenter edited this section.
   * @return {!HTMLElement} The row.
   */
  static #row(doc, index, best, edited) {
    const width = `${Math.max(4, Math.round((doc.score / best) * 100))}%`;
    return el(
      "li",
      { class: doc.retrieved ? "match is-retrieved" : "match" },
      el("span", { class: "match__rank", text: String(index + 1) }),
      el(
        "div",
        { class: "match__head" },
        el("strong", { text: doc.title }),
        el("span", { class: "match__file", text: doc.source }),
        edited && el("span", { class: "tag tag--amber", text: "Edited" }),
        doc.retrieved
          ? el("span", { class: "tag tag--green", text: "Sent to the model" })
          : el("span", { class: "tag", text: "Not used" }),
      ),
      el(
        "div",
        { class: "match__row" },
        el(
          "span",
          { class: "match__bar", role: "img", "aria-label": `Match score ${doc.score.toFixed(2)}` },
          el("span", { class: "match__fill", style: { width } }),
        ),
        el("span", { class: "match__score", text: doc.score.toFixed(2) }),
      ),
    );
  }
}
