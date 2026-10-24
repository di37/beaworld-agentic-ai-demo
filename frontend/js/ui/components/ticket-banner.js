/**
 * @fileoverview Level 5 outcome: was a simulated ticket created?
 */

import { el } from "../dom.js";
import { icon } from "../icons.js";

/** Announces the ticket outcome once the engineer has decided. */
export class TicketBanner {
  constructor() {
    /** @const {!HTMLElement} */
    this.element = el("div", { class: "ticket-banner", role: "status", hidden: true });
  }

  /** Hides the banner. */
  reset() {
    this.element.replaceChildren();
    this.element.hidden = true;
  }

  /**
   * Shows the simulated ticket that was created.
   * @param {{ticket_id: string, equipment_id: string, priority: string, summary: string}} ticket
   */
  created({ ticket_id, equipment_id, priority, summary }) {
    this.#show(
      false,
      "ticket",
      `Simulated ticket ${ticket_id} created for ${equipment_id} (priority: ${priority})`,
      summary,
    );
  }

  /** Shows that no ticket was created. */
  declined() {
    this.#show(
      true,
      "cross",
      "No ticket was created",
      "The engineer declined, so the application never ran the ticket tool.",
    );
  }

  /** Explains a run where the model never asked for the ticket tool. */
  notProposed() {
    this.#show(
      true,
      "alert",
      "The model didn't propose a ticket this time",
      "It answered in text instead of asking for the ticket tool. Start the investigation again; the route can change from run to run.",
    );
  }

  /**
   * @param {boolean} declined Whether to use the neutral "declined" style.
   * @param {string} iconName Banner icon.
   * @param {string} title Headline.
   * @param {string} detail Supporting text.
   */
  #show(declined, iconName, title, detail) {
    this.element.classList.toggle("is-declined", declined);
    this.element.replaceChildren(
      icon(iconName, { size: 26 }),
      el("div", {}, el("p", { class: "ticket-banner__title", text: title }), el("p", { text: detail })),
    );
    this.element.hidden = false;
  }
}
