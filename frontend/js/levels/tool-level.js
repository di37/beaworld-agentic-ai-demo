/**
 * @fileoverview Level 2: our program runs one tool. No AI model.
 */

import { ReadingsBoard } from "../ui/components/readings-board.js";
import { el } from "../ui/dom.js";
import { LevelView } from "./level-view.js";

/** Level 2 screen. */
export class ToolLevelView extends LevelView {
  /** @type {!ReadingsBoard} */
  #board = new ReadingsBoard();
  /** @type {?HTMLSelectElement} */
  #equipment = null;

  /** @override */
  renderControls() {
    this.#equipment = el(
      "select",
      { class: "input input--select", "aria-label": "Equipment to read" },
      ...this.config.equipment_ids.map((id) => el("option", { value: id, text: id })),
    );
    return [
      el(
        "div",
        { class: "control-row" },
        el("label", { class: "field" }, el("span", { class: "field__label", text: "Equipment" }), this.#equipment),
        this.actionButton("Run the tool", () => this.#run()),
      ),
      el("p", {
        class: "hint",
        text: "No AI model is used here. Audience challenge: switch to AHU-02. The tool has no data for it, and it won't make any up.",
      }),
    ];
  }

  /** @override */
  renderOutput() {
    return [this.#board.element];
  }

  /** @override */
  eventHandlers() {
    return { readings: (result) => this.#board.show(result) };
  }

  /** @override */
  onRunStart() {
    this.#board.reset();
  }

  /** Reads the selected unit. */
  #run() {
    this.execute(this.api.runLevel(this.number, { equipment_id: this.#equipment.value }));
  }
}
