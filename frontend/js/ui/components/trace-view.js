/**
 * @fileoverview Levels 4 and 5: a live timeline of every step the agent takes.
 */

import { toolLabel } from "../../levels/catalog.js";
import { el, revealGently } from "../dom.js";
import { icon } from "../icons.js";

/** Tool results longer than this are folded so the trace stays readable. */
const LONG_OUTPUT_CHARS = 300;
const PREVIEW_CHARS = 140;

/**
 * Turns `equipment_id` into "Equipment id".
 * @param {string} key Argument name.
 * @return {string} Readable label.
 */
function humanise(key) {
  const words = key.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A vertical timeline of agent steps. */
export class TraceView {
  /** @type {!HTMLElement} */
  #list;
  /** @type {!Map<string, !HTMLElement>} Result slots keyed by tool call ID. */
  #resultSlots = new Map();
  /** @type {!Array<string>} Tool names in the order the model requested them. */
  #toolOrder = [];
  /** @type {boolean} Whether a pause interrupted the timeline. */
  #interrupted = false;

  constructor() {
    this.#list = el("ol", { class: "trace__list" });
    /** @const {!HTMLElement} */
    this.element = el(
      "section",
      { class: "card", hidden: true },
      el(
        "header",
        { class: "card__header" },
        icon("loop"),
        el("h3", { text: "Investigation trace" }),
        el("span", { class: "card__hint", text: "Every step, as it happens" }),
      ),
      this.#list,
    );
  }

  /** @return {!Array<string>} Tool names in request order. */
  get toolOrder() {
    return [...this.#toolOrder];
  }

  /** Clears the timeline. */
  reset() {
    this.#list.replaceChildren();
    this.#resultSlots = new Map();
    this.#toolOrder = [];
    this.#interrupted = false;
    this.element.hidden = true;
  }

  /**
   * Adds the engineer's request that starts the investigation.
   * @param {string} text The task.
   */
  addTask(text) {
    this.#addStep("task", "user", "Engineer's request", el("p", { text }));
  }

  /**
   * Adds a note the model wrote while it was also requesting tools.
   * @param {string} text The note.
   */
  addAgentNote(text) {
    this.#addStep("note", "spark", "The model says", el("p", { text }));
  }

  /**
   * Adds a tool request, with an empty slot for its result.
   * @param {{call_id: string, name: string, args: !Object}} call The request.
   */
  addToolCall({ call_id, name, args }) {
    const tool = toolLabel(name);
    const slot = el("div", { class: "step__result", hidden: true });
    this.#addStep(
      "call",
      tool.icon,
      "The model asks the application to",
      el("p", { class: "step__action" }, el("strong", { text: tool.label })),
      TraceView.#argumentList(args),
      slot,
    );
    this.#resultSlots = new Map([...this.#resultSlots, [call_id, slot]]);
    this.#toolOrder = [...this.#toolOrder, name];
  }

  /**
   * Shows what a tool returned, under its request when possible.
   * @param {{call_id: string, name: string, output: string, ok: boolean}} result The result.
   */
  addToolResult({ call_id, name, output, ok }) {
    const content = [
      el("p", {
        class: "step__result-label",
        text: ok ? "The application ran it. Result:" : "Not run. The model was told:",
      }),
      TraceView.#outputBlock(output),
    ];
    const slot = this.#resultSlots.get(call_id);
    if (slot && !this.#interrupted) {
      slot.replaceChildren(...content);
      slot.classList.toggle("is-blocked", !ok);
      slot.hidden = false;
      revealGently(slot);
      return;
    }
    const block = el("div", { class: ok ? "step__result" : "step__result is-blocked" }, ...content);
    this.#addStep("result", toolLabel(name).icon, toolLabel(name).label, block);
  }

  /**
   * Adds the moment the application pauses for a person.
   * @param {!HTMLElement} card The approval card.
   */
  addPause(card) {
    this.#interrupted = true;
    this.#addStep("pause", "shield", "The application pauses before acting", card);
  }

  /**
   * Adds the engineer's decision.
   * @param {boolean} approved Whether the action was approved.
   */
  addDecision(approved) {
    const text = approved
      ? "The application now runs the ticket tool."
      : "The ticket tool does not run. The model is told the request was declined.";
    this.#addStep(
      approved ? "approved" : "declined",
      approved ? "check" : "cross",
      approved ? "Engineer approved" : "Engineer declined",
      el("p", { text }),
    );
  }

  /**
   * @param {string} kind Step style (task, note, call, result, pause, approved, declined).
   * @param {string} iconName Marker icon.
   * @param {string} title Small heading.
   * @param {...!Node} body Step content.
   */
  #addStep(kind, iconName, title, ...body) {
    const step = el(
      "li",
      { class: `step step--${kind}` },
      el("span", { class: "step__marker" }, icon(iconName, { size: 18 })),
      el("div", { class: "step__body" }, el("p", { class: "step__title", text: title }), ...body),
    );
    this.element.hidden = false;
    this.#list.append(step);
    revealGently(step);
  }

  /**
   * Shows short output in full and folds long output behind a summary.
   * @param {string} output Text the tool returned.
   * @return {!HTMLElement} The output block.
   */
  static #outputBlock(output) {
    if (output.length <= LONG_OUTPUT_CHARS) return el("pre", { text: output });
    const sources = [...output.matchAll(/^Source: (.+)$/gm)].map((match) => match[1]);
    const preview = sources.length
      ? `Found ${sources.length} manual passage${sources.length === 1 ? "" : "s"}: ${sources.join(", ")}`
      : `${output.slice(0, PREVIEW_CHARS).trim()}…`;
    return el(
      "details",
      { class: "step__more" },
      el("summary", {}, el("span", { text: preview }), el("span", { class: "step__more-hint", text: "Show full text" })),
      el("pre", { text: output }),
    );
  }

  /**
   * @param {!Object} args Tool arguments chosen by the model.
   * @return {?HTMLElement} A definition list, or null if there are none.
   */
  static #argumentList(args) {
    const entries = Object.entries(args ?? {});
    if (!entries.length) return null;
    return el(
      "dl",
      { class: "args" },
      ...entries.flatMap(([key, value]) => [
        el("dt", { text: humanise(key) }),
        el("dd", { text: typeof value === "string" ? value : JSON.stringify(value) }),
      ]),
    );
  }
}
