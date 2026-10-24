/**
 * @fileoverview Level 5: the agent proposes a ticket; an engineer approves or rejects it.
 */

import { ApprovalCard } from "../ui/components/approval-card.js";
import { TicketBanner } from "../ui/components/ticket-banner.js";
import { el } from "../ui/dom.js";
import { AgentTraceLevelView } from "./agent-trace-level-view.js";

/** Level 5 screen. */
export class AgenticAppLevelView extends AgentTraceLevelView {
  /** @type {!TicketBanner} */
  #banner = new TicketBanner();
  /** @type {?ApprovalCard} The card still waiting for a decision. */
  #openCard = null;
  /** @type {boolean} Whether the model asked for the ticket tool in this run. */
  #ticketProposed = false;

  /** @override */
  get taskText() {
    return this.config.defaults.level5_task;
  }

  /** @override */
  renderControls() {
    return [
      el("div", { class: "control-row" }, this.actionButton("Start the investigation", () => this.#start())),
      el("p", {
        class: "hint",
        text: "The model may propose one simulated ticket. The application pauses before the ticket tool runs, and waits for you.",
      }),
    ];
  }

  /** @override */
  renderOutput() {
    return [this.trace.element, this.#banner.element, this.answer.element];
  }

  /** @override */
  eventHandlers() {
    return {
      ...super.eventHandlers(),
      approval_required: (request) => this.#askForApproval(request),
      decision: ({ approved }) => {
        this.trace.addDecision(approved);
        if (!approved) this.#banner.declined();
      },
      ticket: (ticket) => this.#banner.created(ticket),
    };
  }

  /** @override */
  onRunStart() {
    this.#openCard?.lock(null);
    this.#openCard = null;
    this.#ticketProposed = false;
    this.#banner.reset();
    super.onRunStart();
  }

  /** @override */
  onAnswer() {
    if (!this.#ticketProposed) this.#banner.notProposed();
  }

  /** Starts a new investigation. */
  #start() {
    this.execute(this.api.runLevel(this.number, {}));
  }

  /**
   * Shows the proposed action and pauses for a decision.
   * @param {{thread_id: string, name: string, args: !Object}} request The paused action.
   */
  #askForApproval({ thread_id, name, args }) {
    const card = new ApprovalCard({ name, args, onDecide: (approve) => this.#decide(thread_id, approve, card) });
    this.#openCard = card;
    this.#ticketProposed = true;
    this.trace.addPause(card.element);
    this.status.waiting("Paused. The ticket tool will not run until an engineer approves it.");
  }

  /**
   * Sends the decision and continues the same investigation.
   * @param {string} threadId The paused investigation.
   * @param {boolean} approve Whether the ticket is approved.
   * @param {!ApprovalCard} card The card that was clicked.
   */
  #decide(threadId, approve, card) {
    if (this.busy || card !== this.#openCard) return;
    card.lock(approve);
    this.#openCard = null;
    this.execute(this.api.decide(threadId, approve), { fresh: false });
  }
}
