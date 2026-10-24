/**
 * @fileoverview Level 2 result: what the tool call was, and what it returned.
 */

import { el } from "../dom.js";
import { icon } from "../icons.js";

/** Temperatures more than this far above target are flagged. */
const TEMPERATURE_TOLERANCE_C = 1;

/**
 * How to display each reading.
 * @const {!Array<{label: string, icon: string, value: function(!Object): string,
 *     alert: function(!Object): boolean, note: function(!Object): string}>}
 */
const TILES = Object.freeze([
  {
    label: "Room temperature",
    icon: "thermometer",
    value: (r) => `${r.room_temperature_c} °C`,
    alert: (r) => r.room_temperature_c > r.setpoint_c + TEMPERATURE_TOLERANCE_C,
    note: (r) => `${r.room_temperature_c - r.setpoint_c} °C above target`,
  },
  {
    label: "Target",
    icon: "target",
    value: (r) => `${r.setpoint_c} °C`,
    alert: () => false,
    note: () => "The setpoint",
  },
  {
    label: "Supply airflow",
    icon: "wind",
    value: (r) => r.supply_airflow,
    alert: (r) => r.supply_airflow !== "NORMAL",
    note: (r) => (r.supply_airflow === "LOW" ? "Less air than normal" : "Within range"),
  },
  {
    label: "Filter pressure drop",
    icon: "gauge",
    value: (r) => r.filter_pressure_drop,
    alert: (r) => r.filter_pressure_drop === "HIGH",
    note: (r) => (r.filter_pressure_drop === "HIGH" ? "Air is struggling through the filter" : "Within range"),
  },
]);

/** Shows the tool call, the readings as tiles, and the raw tool output. */
export class ReadingsBoard {
  constructor() {
    /** @const {!HTMLElement} */
    this.element = el("div", { class: "readings", hidden: true });
  }

  /** Clears the board. */
  reset() {
    this.element.replaceChildren();
    this.element.hidden = true;
  }

  /**
   * Displays a Level 2 result.
   * @param {{equipment_id: string, tool_name: string, tool_output: string, readings: ?Object}} result
   */
  show({ equipment_id, tool_name, tool_output, readings }) {
    this.element.replaceChildren(
      el(
        "div",
        { class: "callout" },
        icon("program", { size: 24 }),
        el(
          "div",
          {},
          el("p", { class: "callout__label", text: "Our program ran this tool" }),
          el("code", { text: `${tool_name}("${equipment_id}")` }),
        ),
      ),
      readings ? ReadingsBoard.#tiles(readings) : ReadingsBoard.#noData(equipment_id),
      el(
        "div",
        { class: "raw" },
        el("p", { class: "raw__label", text: "Exactly what the tool returned" }),
        el("pre", { text: tool_output }),
      ),
    );
    this.element.hidden = false;
  }

  /**
   * @param {!Object} readings Structured readings.
   * @return {!HTMLElement} One tile per reading.
   */
  static #tiles(readings) {
    return el(
      "div",
      { class: "tiles" },
      ...TILES.map((tile) =>
        el(
          "div",
          { class: tile.alert(readings) ? "tile is-alert" : "tile" },
          el("p", { class: "tile__label" }, icon(tile.icon, { size: 17 }), el("span", { text: tile.label })),
          el("p", { class: "tile__value", text: tile.value(readings) }),
          el("p", { class: "tile__note", text: tile.note(readings) }),
        ),
      ),
    );
  }

  /**
   * @param {string} equipmentId Unit with no data.
   * @return {!HTMLElement} An explanation that nothing was invented.
   */
  static #noData(equipmentId) {
    return el(
      "div",
      { class: "empty-state" },
      icon("alert", { size: 24 }),
      el(
        "p",
        {},
        el("strong", { text: `No readings for ${equipmentId}. ` }),
        "The tool can only return data it actually has. It can't invent a measurement.",
      ),
    );
  }
}
