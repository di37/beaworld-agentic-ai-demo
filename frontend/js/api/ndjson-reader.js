/**
 * @fileoverview Reads a newline-delimited JSON (NDJSON) response stream.
 */

/** Turns a streamed HTTP body into a sequence of parsed JSON events. */
export class NdjsonReader {
  /**
   * Yields one parsed object per line as soon as each line arrives.
   * @param {!ReadableStream<Uint8Array>} body The response body.
   * @return {!AsyncGenerator<!Object>} Parsed events, in order.
   */
  static async *read(body) {
    const reader = body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const lines = (buffer + value).split("\n");
        buffer = lines.at(-1) ?? "";
        for (const line of lines.slice(0, -1)) {
          const event = NdjsonReader.#parse(line);
          if (event) yield event;
        }
      }
      const last = NdjsonReader.#parse(buffer);
      if (last) yield last;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Parses one line, skipping blank or malformed lines.
   * @param {string} line A single NDJSON line.
   * @return {?Object} The parsed object, or null.
   */
  static #parse(line) {
    const trimmed = line.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      console.warn("Skipping a malformed event line:", trimmed, error);
      return null;
    }
  }
}
