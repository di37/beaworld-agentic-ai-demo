/**
 * @fileoverview Level 3: search the manual, then answer from that evidence.
 */

import { AnswerPanel } from "../ui/components/answer-panel.js";
import { ManualEditor } from "../ui/components/manual-editor.js";
import { RetrievalBoard } from "../ui/components/retrieval-board.js";
import { el } from "../ui/dom.js";
import { LevelView } from "./level-view.js";

/** Shortest question the backend accepts. */
const MIN_QUESTION_LENGTH = 3;

/** Level 3 screen. */
export class RagLevelView extends LevelView {
  /** @type {!RetrievalBoard} */
  #board = new RetrievalBoard();
  /** @type {!AnswerPanel} */
  #answer = new AnswerPanel({ title: "Step 2 · Answer using only those passages", iconName: "book" });
  /** @type {?HTMLInputElement} */
  #question = null;
  /** @type {?ManualEditor} */
  #editor = null;
  /** @type {!Array<string>} Sections edited for the current run. */
  #editedSources = [];

  /** @override */
  renderControls() {
    this.#question = el("input", {
      class: "input",
      type: "text",
      maxlength: 500,
      "aria-label": "Question about the air handling unit",
    });
    this.#question.value = this.config.defaults.level3_question;
    this.#question.addEventListener("keydown", (event) => {
      if (event.key === "Enter") this.#run();
    });
    this.#editor = new ManualEditor(this.config.manual);
    return [
      el(
        "div",
        { class: "control-row" },
        el("label", { class: "field field--grow" }, el("span", { class: "field__label", text: "Question" }), this.#question),
        this.actionButton("Search the manual, then answer", () => this.#run(), { iconName: "search" }),
      ),
      this.#editor.element,
    ];
  }

  /** @override */
  renderOutput() {
    return [el("div", { class: "split" }, this.#board.element, this.#answer.element)];
  }

  /** @override */
  eventHandlers() {
    return {
      retrieval: (result) => this.#board.show(result, this.#editedSources),
      token: ({ text }) => this.#answer.appendToken(text),
      answer: ({ text }) => this.#answer.setAnswer(text),
    };
  }

  /** @override */
  onRunStart() {
    this.#board.reset();
    this.#answer.reset();
  }

  /** Validates the question and starts the search. */
  #run() {
    if (this.busy) return;
    const question = this.#question.value.trim();
    if (question.length < MIN_QUESTION_LENGTH) {
      this.status.error("Please type a question of at least three characters.");
      return;
    }
    const overrides = this.#editor.overrides();
    this.#editedSources = Object.keys(overrides);
    this.execute(this.api.runLevel(this.number, { question, manual_overrides: overrides }));
  }
}
