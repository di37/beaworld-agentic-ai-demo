/**
 * @fileoverview The application shell: level navigation, keyboard shortcuts and model status.
 */

import { AgentLevelView } from "./levels/agent-level.js";
import { AgenticAppLevelView } from "./levels/agentic-app-level.js";
import { LEVELS } from "./levels/catalog.js";
import { LlmLevelView } from "./levels/llm-level.js";
import { RagLevelView } from "./levels/rag-level.js";
import { ToolLevelView } from "./levels/tool-level.js";
import { el } from "./ui/dom.js";

/** @const {!Object<number, function(new: Object, !Object)>} Screen class for each level. */
const VIEW_TYPES = Object.freeze({
  1: LlmLevelView,
  2: ToolLevelView,
  3: RagLevelView,
  4: AgentLevelView,
  5: AgenticAppLevelView,
});

/** Keys that move between levels (arrow keys and presentation clickers). */
const NEXT_KEYS = new Set(["ArrowRight", "PageDown"]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "PageUp"]);

/** Elements where arrow keys must keep their normal meaning. */
const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** The demo application. */
export class App {
  /** @type {!Object} */
  #api;
  /** @type {!HTMLElement} */
  #nav;
  /** @type {!HTMLElement} */
  #stage;
  /** @type {!HTMLElement} */
  #badge;
  /** @type {!Array<!Object>} */
  #views = [];
  /** @type {!Array<!HTMLButtonElement>} */
  #navButtons = [];
  /** @type {!Set<number>} */
  #visited = new Set();
  /** @type {number} */
  #current = 0;

  /**
   * @param {{api: !Object, nav: !HTMLElement, stage: !HTMLElement, badge: !HTMLElement}} parts
   *     API client and the page regions to fill.
   */
  constructor({ api, nav, stage, badge }) {
    this.#api = api;
    this.#nav = nav;
    this.#stage = stage;
    this.#badge = badge;
  }

  /**
   * Loads the configuration and builds every level.
   * @return {!Promise<void>}
   */
  async start() {
    let config;
    try {
      config = await this.#api.getMeta();
    } catch (error) {
      console.error("Could not load the demo configuration", error);
      this.#showStartupError(error?.message);
      return;
    }
    this.#renderBadge(config);
    const navigate = (number) => this.show(number);
    this.#views = LEVELS.map((meta) => new VIEW_TYPES[meta.number]({ meta, api: this.#api, config, navigate }));
    this.#stage.replaceChildren(...this.#views.map((view) => view.render()));
    this.#renderNav();
    document.addEventListener("keydown", (event) => this.#onKeyDown(event));
    window.addEventListener("hashchange", () => this.show(App.#levelFromHash(), { updateHash: false }));
    this.show(App.#levelFromHash(), { updateHash: false });
  }

  /**
   * Switches to a level.
   * @param {number} number Level number; clamped to 1–5.
   * @param {{updateHash: (boolean|undefined)}=} options Whether to update the URL.
   */
  show(number, { updateHash = true } = {}) {
    const target = Math.min(Math.max(number, 1), LEVELS.length);
    if (target === this.#current) return;
    this.#current = target;
    this.#visited = new Set([...this.#visited, target]);
    for (const view of this.#views) view.setVisible(view.number === target);
    this.#navButtons.forEach((button, index) => {
      const level = index + 1;
      if (level === target) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
      button.classList.toggle("is-visited", this.#visited.has(level));
    });
    if (updateHash) history.replaceState(null, "", `#level-${target}`);
    window.scrollTo({ top: 0 });
  }

  /** Builds the sidebar journey. */
  #renderNav() {
    this.#navButtons = LEVELS.map((level) =>
      el(
        "button",
        { class: "journey__step", type: "button", onClick: () => this.show(level.number) },
        el("span", { class: "journey__number", text: String(level.number) }),
        el(
          "span",
          {},
          el("span", { class: "journey__name", text: level.name }),
          el("span", { class: "journey__hint", text: level.navHint }),
        ),
      ),
    );
    this.#nav.replaceChildren(...this.#navButtons);
  }

  /**
   * Shows which model is in use, or that no key is configured.
   * @param {!Object} config Backend configuration.
   */
  #renderBadge(config) {
    const ready = Boolean(config.model_configured);
    this.#badge.dataset.state = ready ? "ready" : "missing";
    this.#badge.textContent = ready
      ? `Live · ${config.model}`
      : "No API key: only Level 2 works";
  }

  /**
   * Replaces the stage with instructions when the backend is unreachable.
   * @param {string=} message Error detail.
   */
  #showStartupError(message) {
    this.#badge.dataset.state = "missing";
    this.#badge.textContent = "Server not reachable";
    this.#stage.replaceChildren(
      el(
        "section",
        { class: "card startup-error" },
        el("h2", { text: "The demo server isn't responding" }),
        el("p", { text: message || "The page could not load its configuration." }),
        el("p", {}, "Start it from the backend folder with ", el("code", { text: "python -m app" }), ", then refresh this page."),
      ),
    );
  }

  /**
   * Handles level shortcuts unless the presenter is typing.
   * @param {!KeyboardEvent} event The key press.
   */
  #onKeyDown(event) {
    const target = /** @type {!HTMLElement} */ (event.target);
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (TYPING_TAGS.has(target.tagName) || target.isContentEditable) return;
    if (NEXT_KEYS.has(event.key)) this.show(this.#current + 1);
    else if (PREVIOUS_KEYS.has(event.key)) this.show(this.#current - 1);
    else if (/^[1-5]$/.test(event.key)) this.show(Number(event.key));
    else return;
    event.preventDefault();
  }

  /** @return {number} Level number from a `#level-N` hash, or 1. */
  static #levelFromHash() {
    const match = window.location.hash.match(/^#level-(\d)$/);
    return match ? Number(match[1]) : 1;
  }
}
