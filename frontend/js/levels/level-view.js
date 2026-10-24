/**
 * @fileoverview Base class for a level screen: layout, run lifecycle and event routing.
 */

import { IngredientBar } from "../ui/components/ingredient-bar.js";
import { RoomQuestion } from "../ui/components/room-question.js";
import { StatusLine } from "../ui/components/status-line.js";
import { el } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { LEVELS } from "./catalog.js";

/**
 * One workshop level.
 *
 * Subclasses override the hooks: renderControls(), renderOutput(),
 * eventHandlers(), onRunStart() and onRunEnd(). Call render() once after
 * construction so subclass fields exist before the hooks run.
 */
export class LevelView {
  /** @type {!Array<!HTMLButtonElement>} */
  #actionButtons = [];

  /**
   * @param {{meta: !Object, api: !Object, config: !Object, navigate: function(number): void}} deps
   *     Level metadata, API client, backend configuration and a navigation callback.
   */
  constructor({ meta, api, config, navigate }) {
    this.meta = meta;
    this.api = api;
    this.config = config;
    this.navigate = navigate;
    this.status = new StatusLine({ showProgress: this.showsProgressLine });
    this.roomQuestion = new RoomQuestion(meta.roomQuestion);
    /** @type {boolean} */
    this.busy = false;
    /** @type {?HTMLElement} */
    this.element = null;
  }

  /** @return {number} Level number. */
  get number() {
    return this.meta.number;
  }

  /**
   * Whether progress messages appear under the controls. Levels with their
   * own progress display (such as the chat's typing dots) return false.
   * @return {boolean}
   */
  get showsProgressLine() {
    return true;
  }

  /**
   * Builds the level's DOM.
   * @return {!HTMLElement} The level section.
   */
  render() {
    const controls = this.renderControls();
    this.element = el(
      "section",
      { class: "level", id: `level-${this.number}`, "aria-labelledby": `level-${this.number}-title`, hidden: true },
      this.#renderHero(),
      controls.length > 0 && el("div", { class: "card level__controls" }, ...controls),
      this.status.element,
      el("div", { class: "level__output" }, ...this.renderOutput()),
      this.roomQuestion.element,
      this.#renderPager(),
    );
    return this.element;
  }

  /**
   * Shows or hides the level.
   * @param {boolean} visible Whether this is the current level.
   */
  setVisible(visible) {
    this.element.hidden = !visible;
  }

  /** @return {!Array<!Node>} Inputs and buttons. */
  renderControls() {
    return [];
  }

  /** @return {!Array<!Node>} Result areas. */
  renderOutput() {
    return [];
  }

  /**
   * Handlers keyed by event type. They may also replace the default
   * `status`, `error` and `done` handling.
   * @return {!Object<string, function(!Object): void>}
   */
  eventHandlers() {
    return {};
  }

  /** Called before a fresh run starts; clear previous results here. */
  onRunStart() {}

  /** Called after every run, successful or not. */
  onRunEnd() {}

  /**
   * Called when a run starts or stops, for controls the base class doesn't own.
   * @param {boolean} busy Whether a run is in progress.
   */
  onBusyChange(busy) {}

  /**
   * Creates a button that is disabled while a run is in progress.
   * @param {string} label Button text.
   * @param {function(): void} onClick Click handler.
   * @param {{variant: (string|undefined), iconName: (string|undefined)}=} options Style and icon.
   * @return {!HTMLButtonElement} The button.
   */
  actionButton(label, onClick, { variant = "primary", iconName = "play" } = {}) {
    const button = el(
      "button",
      { class: `btn btn--${variant}`, type: "button", onClick },
      icon(iconName, { size: 18 }),
      el("span", { text: label }),
    );
    this.#actionButtons = [...this.#actionButtons, button];
    return button;
  }

  /**
   * Consumes an event stream and routes each event to its handler.
   * @param {!AsyncIterable<!Object>} events Events from the backend.
   * @param {{fresh: (boolean|undefined)}=} options `fresh: false` continues
   *     the previous run instead of clearing it.
   * @return {!Promise<void>}
   */
  async execute(events, { fresh = true } = {}) {
    if (this.busy) return;
    this.#setBusy(true);
    if (fresh) {
      this.roomQuestion.reset();
      this.onRunStart();
    }
    this.status.working("Starting…");
    const handlers = { ...this.#defaultHandlers(), ...this.eventHandlers() };
    try {
      for await (const event of events) this.#dispatch(event, handlers);
    } catch (error) {
      console.error(`Level ${this.number} run failed`, error);
      handlers.error({ message: error?.message || "Something went wrong. Please try again." });
    } finally {
      this.#setBusy(false);
      this.onRunEnd();
    }
  }

  /** @return {!Object<string, function(!Object): void>} Shared handling for progress events. */
  #defaultHandlers() {
    return {
      status: ({ message }) => this.status.working(message),
      error: ({ message }) => this.status.error(message),
      done: () => this.status.finish(),
    };
  }

  /**
   * @param {!Object} event A backend event.
   * @param {!Object<string, function(!Object): void>} handlers Handlers keyed by event type.
   */
  #dispatch(event, handlers) {
    const handler = handlers[event.type];
    if (handler) handler(event);
    else console.warn(`Level ${this.number} has no handler for "${event.type}" events`);
  }

  /**
   * @param {boolean} busy Whether a run is in progress.
   */
  #setBusy(busy) {
    this.busy = busy;
    this.element.classList.toggle("is-busy", busy);
    this.element.setAttribute("aria-busy", String(busy));
    for (const button of this.#actionButtons) button.disabled = busy;
    this.onBusyChange(busy);
  }

  /** @return {!HTMLElement} Title, subtitle and "what's involved" summary. */
  #renderHero() {
    const { number, title, subtitle, uses, decides } = this.meta;
    return el(
      "header",
      { class: "level__hero" },
      el("p", { class: "kicker", text: `Level ${number} · Engineering lab · AHU-01` }),
      el("h2", { class: "level__title", id: `level-${number}-title`, text: title }),
      el("p", { class: "level__subtitle", text: subtitle }),
      el(
        "div",
        { class: "level__facts" },
        new IngredientBar(uses).element,
        el(
          "p",
          { class: "decides" },
          el("span", { class: "decides__label", text: "Who decides the next step?" }),
          el("strong", { text: decides }),
        ),
      ),
    );
  }

  /** @return {!HTMLElement} Previous / next level buttons. */
  #renderPager() {
    const previous = LEVELS.find((level) => level.number === this.number - 1);
    const next = LEVELS.find((level) => level.number === this.number + 1);
    const link = (level, direction) =>
      el(
        "button",
        { class: "btn btn--ghost", type: "button", onClick: () => this.navigate(level.number) },
        direction === "previous" && icon("arrowLeft", { size: 18 }),
        el("span", { text: `Level ${level.number}: ${level.name}` }),
        direction === "next" && icon("arrowRight", { size: 18 }),
      );
    return el(
      "nav",
      { class: "pager", "aria-label": "Level navigation" },
      previous ? link(previous, "previous") : el("span", { class: "pager__spacer" }),
      next ? link(next, "next") : el("span", { class: "pager__spacer" }),
    );
  }
}
