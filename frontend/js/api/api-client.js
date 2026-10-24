/**
 * @fileoverview Talks to the demo backend.
 */

import { NdjsonReader } from "./ndjson-reader.js";

/** An error with a message that is safe to show on screen. */
export class ApiError extends Error {
  /**
   * @param {string} message Friendly description of the problem.
   * @param {number} status HTTP status code, or 0 if the server was unreachable.
   */
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Client for the demo's HTTP API. */
export class ApiClient {
  /** @type {string} */
  #baseUrl;

  /**
   * @param {string=} baseUrl Prefix for API paths. Empty means the same origin.
   */
  constructor(baseUrl = "") {
    this.#baseUrl = baseUrl;
  }

  /**
   * Loads the demo configuration: model status, defaults and the manual.
   * @return {!Promise<!Object>} The configuration.
   */
  async getMeta() {
    const response = await this.#fetch("/api/meta", { method: "GET" });
    if (!response.ok) throw await ApiClient.#errorFrom(response);
    const body = await response.json();
    return body.data;
  }

  /**
   * Runs one level and streams its events.
   * @param {number} number Level number (1-5).
   * @param {!Object} payload Level-specific request body.
   * @return {!AsyncGenerator<!Object>} The level's events.
   */
  runLevel(number, payload) {
    return this.#stream(`/api/levels/${number}/run`, payload);
  }

  /**
   * Sends the engineer's Level 5 decision and streams the rest of the run.
   * @param {string} threadId The paused investigation.
   * @param {boolean} approve Whether the ticket is approved.
   * @return {!AsyncGenerator<!Object>} The remaining events.
   */
  decide(threadId, approve) {
    return this.#stream("/api/levels/5/decision", { thread_id: threadId, approve });
  }

  /**
   * POSTs a JSON body and yields the NDJSON events in the response.
   * @param {string} path API path.
   * @param {!Object} body Request body.
   * @return {!AsyncGenerator<!Object>} Parsed events.
   */
  async *#stream(path, body) {
    const response = await this.#fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw await ApiClient.#errorFrom(response);
    if (!response.body) throw new ApiError("The server sent an empty response.", response.status);
    yield* NdjsonReader.read(response.body);
  }

  /**
   * Wraps fetch so network failures become friendly errors.
   * @param {string} path API path.
   * @param {!RequestInit} init Fetch options.
   * @return {!Promise<!Response>} The response.
   */
  async #fetch(path, init) {
    try {
      return await fetch(this.#baseUrl + path, init);
    } catch (error) {
      console.error(`Request to ${path} failed`, error);
      throw new ApiError("Can't reach the demo server. Is it still running?", 0);
    }
  }

  /**
   * Builds an ApiError from a JSON error envelope.
   * @param {!Response} response A non-OK response.
   * @return {!Promise<!ApiError>} The error.
   */
  static async #errorFrom(response) {
    const fallback = `The request failed (HTTP ${response.status}).`;
    try {
      const body = await response.json();
      return new ApiError(body?.error || fallback, response.status);
    } catch {
      return new ApiError(fallback, response.status);
    }
  }
}
