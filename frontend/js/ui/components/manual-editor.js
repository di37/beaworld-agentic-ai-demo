/**
 * @fileoverview Level 3 audience challenge: edit a manual section on screen.
 */

import { el } from "../dom.js";
import { icon } from "../icons.js";

/** Collapsible editor for the manual sections. Edits never touch the files on disk. */
export class ManualEditor {
  /** @type {!Array<{source: string, title: string, text: string}>} */
  #sections;
  /** @type {!Map<string, !HTMLTextAreaElement>} */
  #fields;

  /**
   * @param {!Array<{source: string, title: string, text: string}>} sections The original manual.
   */
  constructor(sections) {
    this.#sections = sections;
    this.#fields = new Map(
      sections.map((section) => [
        section.source,
        el("textarea", { class: "input manual__text", rows: 9, "aria-label": `Text of ${section.title}` }),
      ]),
    );
    /** @const {!HTMLElement} */
    this.element = el(
      "details",
      { class: "manual" },
      el("summary", {}, icon("edit", { size: 18 }), el("span", { text: "Audience challenge: edit the manual" })),
      el("p", {
        class: "hint",
        text: "Change a section, then search again and watch the scores and citations change. The files on disk stay untouched.",
      }),
      el(
        "div",
        { class: "manual__grid" },
        ...sections.map((section) =>
          el(
            "label",
            { class: "field" },
            el("span", { class: "field__label", text: `${section.title} (${section.source})` }),
            this.#fields.get(section.source),
          ),
        ),
      ),
      el(
        "button",
        { class: "btn btn--ghost btn--small", type: "button", onClick: () => this.reset() },
        icon("reset", { size: 16 }),
        el("span", { text: "Restore the original manual" }),
      ),
    );
    this.reset();
  }

  /**
   * Returns the sections whose text differs from the original.
   * @return {!Object<string, string>} New text keyed by source file name.
   */
  overrides() {
    return Object.fromEntries(
      this.#sections
        .map((section) => [section.source, section.text, this.#fields.get(section.source).value.trim()])
        .filter(([, original, edited]) => edited.length > 0 && edited !== original.trim())
        .map(([source, , edited]) => [source, edited]),
    );
  }

  /** Puts every section back to its original text. */
  reset() {
    for (const section of this.#sections) this.#fields.get(section.source).value = section.text;
  }
}
