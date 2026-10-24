/**
 * @fileoverview Shows which building blocks a level switches on.
 */

import { INGREDIENTS } from "../../levels/catalog.js";
import { el } from "../dom.js";
import { icon } from "../icons.js";

/** A row of chips; the ones this level uses are highlighted. */
export class IngredientBar {
  /**
   * @param {!Array<string>} activeKeys Ingredient keys used by the level.
   */
  constructor(activeKeys) {
    const active = new Set(activeKeys);
    /** @const {!HTMLElement} */
    this.element = el(
      "ul",
      { class: "ingredients", "aria-label": "What this level uses" },
      ...INGREDIENTS.map((ingredient) => {
        const on = active.has(ingredient.key);
        return el(
          "li",
          { class: on ? "ingredient is-on" : "ingredient", title: ingredient.hint },
          icon(ingredient.icon, { size: 15 }),
          el("span", { text: ingredient.label }),
          el("span", { class: "visually-hidden", text: on ? " (used)" : " (not used)" }),
        );
      }),
    );
  }
}
