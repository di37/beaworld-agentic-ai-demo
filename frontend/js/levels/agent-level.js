/**
 * @fileoverview Level 4: the model chooses which read-only tools to use.
 */

import { el } from "../ui/dom.js";
import { toolLabel } from "./catalog.js";
import { AgentTraceLevelView } from "./agent-trace-level-view.js";

/** Level 4 screen. */
export class AgentLevelView extends AgentTraceLevelView {
  /** @type {?HTMLInputElement} */
  #filterRecent = null;

  /** @override */
  get taskText() {
    return this.config.defaults.level4_task;
  }

  /** @override */
  renderControls() {
    this.#filterRecent = el("input", { class: "toggle__input", type: "checkbox" });
    return [
      el(
        "div",
        { class: "control-row" },
        el(
          "label",
          { class: "toggle" },
          this.#filterRecent,
          el("span", { class: "toggle__track", "aria-hidden": "true" }),
          el("span", {}, el("strong", { text: "Audience challenge: " }), "the filter was replaced last week"),
        ),
        this.actionButton("Start the investigation", () => this.#run()),
      ),
      el("p", {
        class: "hint",
        text: "The model can read the sensors, check the service history and search the manual. It decides which to use, and in what order.",
      }),
    ];
  }

  /** @override */
  onAnswer() {
    const steps = this.trace.toolOrder.map((name, index) => `${index + 1}. ${toolLabel(name).label}`);
    this.roomQuestion.setAnswer(
      steps.length
        ? `This run: ${steps.join(" → ")}. Run it again, or flip the challenge switch: the route can change, because the model chooses it.`
        : "This time the model answered without using any tools.",
    );
  }

  /** Starts an investigation with the chosen scenario. */
  #run() {
    this.execute(this.api.runLevel(this.number, { filter_recently_replaced: this.#filterRecent.checked }));
  }
}
