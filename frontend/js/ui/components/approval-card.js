/**
 * @fileoverview Level 5: the action waiting for an engineer's decision.
 */

import { toolLabel } from "../../levels/catalog.js";
import { el } from "../dom.js";
import { icon } from "../icons.js";

/** @const {!Object<string, string>} Labels for known ticket fields. */
const FIELD_LABELS = Object.freeze({ equipment_id: "Equipment", priority: "Priority", summary: "Summary" });

/** Shows the proposed action with Approve and Reject buttons. */
export class ApprovalCard {
  /** @type {!Array<!HTMLButtonElement>} */
  #buttons;
  /** @type {!HTMLElement} */
  #stamp;

  /**
   * @param {{name: string, args: !Object, onDecide: function(boolean): void}} options
   *     The proposed tool call and the decision callback.
   */
  constructor({ name, args, onDecide }) {
    const approve = el(
      "button",
      { class: "btn btn--primary", type: "button", onClick: () => onDecide(true) },
      icon("check"),
      el("span", { text: "Approve ticket" }),
    );
    const reject = el(
      "button",
      { class: "btn btn--danger", type: "button", onClick: () => onDecide(false) },
      icon("cross"),
      el("span", { text: "Reject" }),
    );
    this.#buttons = [approve, reject];
    this.#stamp = el("p", { class: "approval__stamp", hidden: true });
    /** @const {!HTMLElement} */
    this.element = el(
      "div",
      { class: "approval" },
      el("p", {
        class: "approval__lead",
        text: `The model wants to: ${toolLabel(name).label} (simulated). Nothing happens until an engineer decides.`,
      }),
      el(
        "dl",
        { class: "approval__fields" },
        ...Object.entries(args ?? {}).flatMap(([key, value]) => [
          el("dt", { text: FIELD_LABELS[key] ?? key }),
          el("dd", { text: String(value) }),
        ]),
      ),
      el("div", { class: "approval__actions" }, approve, reject),
      this.#stamp,
    );
  }

  /**
   * Disables the buttons and stamps the outcome.
   * @param {?boolean} approved True or false for a decision; null if the request expired.
   */
  lock(approved) {
    for (const button of this.#buttons) button.disabled = true;
    const stamps = new Map([
      [true, "Approved by the engineer."],
      [false, "Rejected by the engineer."],
      [null, "Expired: a new investigation was started."],
    ]);
    this.#stamp.textContent = stamps.get(approved);
    this.#stamp.hidden = false;
  }
}
