/**
 * @fileoverview Level 1 chat window: header, message list and composer,
 * laid out like a familiar chatbot.
 */

import { el } from "../dom.js";
import { icon } from "../icons.js";
import { StreamingText } from "./streaming-text.js";

/** The composer grows with its text up to this height, then scrolls. */
const COMPOSER_MAX_HEIGHT_PX = 160;

/**
 * Wraps content in a left-aligned model message with an avatar.
 * @param {...!Node} content The bubble.
 * @return {!HTMLElement} The message row.
 */
function modelMessage(...content) {
  return el(
    "div",
    { class: "msg msg--model" },
    el("span", { class: "msg__avatar", "aria-hidden": "true" }, icon("spark", { size: 16 })),
    ...content,
  );
}

/** One model reply: typing dots until the first word arrives, then streamed text. */
export class ChatReply {
  /** @type {!StreamingText} */
  #body = new StreamingText();
  /** @type {!HTMLElement} */
  #typing;
  /** @type {function(): void} */
  #onGrow;

  /**
   * @param {function(): void} onGrow Called whenever the reply gets longer.
   */
  constructor(onGrow) {
    this.#onGrow = onGrow;
    this.#typing = el(
      "span",
      { class: "typing", role: "img", "aria-label": "The model is typing" },
      el("span"),
      el("span"),
      el("span"),
    );
    /** @const {!HTMLElement} */
    this.element = modelMessage(el("div", { class: "msg__bubble" }, this.#typing, this.#body.element));
  }

  /** @return {boolean} Whether no text has arrived yet. */
  get isEmpty() {
    return this.#body.isEmpty;
  }

  /**
   * Adds newly generated text.
   * @param {string} text The new piece of text.
   */
  append(text) {
    this.#typing.hidden = true;
    this.#body.append(text);
    this.#onGrow();
  }

  /**
   * Replaces the streamed text with the formatted final answer.
   * @param {string} markdown The complete answer.
   */
  finish(markdown) {
    this.#typing.hidden = true;
    this.#body.setMarkdown(markdown);
    this.#onGrow();
  }

  /**
   * Shows an error in place of the answer.
   * @param {string} message Friendly error message.
   */
  fail(message) {
    this.#typing.hidden = true;
    this.element.classList.add("is-failed");
    this.#body.setPlain(message);
    this.#onGrow();
  }
}

/** A chatbot-style window with starter questions and a message composer. */
export class ChatWindow {
  /** @type {!HTMLElement} */
  #messages;
  /** @type {!HTMLElement} */
  #starters;
  /** @type {!HTMLElement} */
  #followUps;
  /** @type {!HTMLTextAreaElement} */
  #input;
  /** @type {!HTMLButtonElement} */
  #send;
  /** @type {!HTMLElement} */
  #state;
  /** @type {!Array<!HTMLButtonElement>} Starter and follow-up buttons. */
  #choices = [];
  /** @type {string} */
  #welcome;
  /** @type {function(string): void} */
  #onSend;

  /**
   * @param {{model: string, welcome: string, starters: !Array<string>, followUps: !Array<string>,
   *     onSend: function(string): void, onReset: function(): void}} options
   *     Model name, greeting, suggested questions and callbacks.
   */
  constructor({ model, welcome, starters, followUps, onSend, onReset }) {
    this.#welcome = welcome;
    this.#onSend = onSend;
    this.#state = el("span", { class: "chat__state", text: "Online" });
    this.#messages = el("div", { class: "chat__messages", role: "log", "aria-live": "polite", "aria-label": "Conversation" });
    this.#starters = el(
      "div",
      { class: "chat__starters" },
      el("p", { class: "chat__starters-label", text: "Try asking" }),
      ...starters.map((text) => this.#choice("starter", text)),
    );
    this.#followUps = el("div", { class: "chat__followups" }, ...followUps.map((text) => this.#choice("chip", text)));
    this.#input = el("textarea", {
      class: "chat__input",
      rows: 1,
      placeholder: "Message the language model…",
      "aria-label": "Message",
    });
    this.#input.addEventListener("keydown", (event) => this.#onKeyDown(event));
    this.#input.addEventListener("input", () => this.#autoGrow());
    this.#send = el(
      "button",
      { class: "chat__send", type: "button", "aria-label": "Send message", onClick: () => this.#submit(this.#input.value) },
      icon("send", { size: 18 }),
    );
    /** @const {!HTMLElement} */
    this.element = el(
      "section",
      { class: "chat card", "aria-label": "Chat with the language model" },
      this.#renderHeader(model, onReset),
      this.#messages,
      el(
        "div",
        { class: "chat__composer" },
        this.#followUps,
        el("div", { class: "chat__field" }, this.#input, this.#send),
        el("p", { class: "chat__hint", text: "Enter to send · Shift + Enter for a new line" }),
      ),
    );
    this.reset();
  }

  /** Starts a fresh conversation with only the greeting and starter questions. */
  reset() {
    this.#messages.replaceChildren(
      modelMessage(el("div", { class: "msg__bubble" }, el("p", { text: this.#welcome }))),
      this.#starters,
    );
    this.#starters.hidden = false;
    this.#followUps.hidden = true;
    this.#input.value = "";
    this.#autoGrow();
  }

  /**
   * Locks sending while the model is answering.
   * @param {boolean} busy Whether a reply is in progress.
   */
  setBusy(busy) {
    this.#send.disabled = busy;
    for (const choice of this.#choices) choice.disabled = busy;
    this.#state.textContent = busy ? "Typing…" : "Online";
    this.element.classList.toggle("is-busy", busy);
    if (!busy) this.#input.focus();
  }

  /**
   * Adds the presenter's message.
   * @param {string} text The message.
   */
  addUserMessage(text) {
    this.#starters.hidden = true;
    this.#followUps.hidden = false;
    this.#messages.append(el("div", { class: "msg msg--user" }, el("div", { class: "msg__bubble" }, el("p", { text }))));
    this.#scrollToBottom();
  }

  /**
   * Adds a model reply that shows typing dots until text arrives.
   * @return {!ChatReply} The reply to stream into.
   */
  startReply() {
    const reply = new ChatReply(() => this.#scrollToBottom());
    this.#messages.append(reply.element);
    this.#scrollToBottom();
    return reply;
  }

  /**
   * @param {string} model Model name.
   * @param {function(): void} onReset New-chat callback.
   * @return {!HTMLElement} The header bar.
   */
  #renderHeader(model, onReset) {
    return el(
      "header",
      { class: "chat__header" },
      el("span", { class: "chat__avatar", "aria-hidden": "true" }, icon("spark", { size: 20 })),
      el(
        "div",
        { class: "chat__identity" },
        el("p", { class: "chat__title", text: "Language model" }),
        el("p", { class: "chat__subtitle", text: `${model} · no tools, no live data` }),
      ),
      this.#state,
      el(
        "button",
        { class: "btn btn--ghost btn--small", type: "button", onClick: onReset },
        icon("edit", { size: 16 }),
        el("span", { text: "New chat" }),
      ),
    );
  }

  /**
   * Creates a suggestion button that sends its text.
   * @param {string} className `starter` or `chip`.
   * @param {string} text The suggested question.
   * @return {!HTMLButtonElement} The button.
   */
  #choice(className, text) {
    const button = el("button", { class: className, type: "button", text, onClick: () => this.#submit(text) });
    this.#choices = [...this.#choices, button];
    return button;
  }

  /**
   * Sends a message unless it is empty or a reply is in progress.
   * @param {string} text The message.
   */
  #submit(text) {
    const message = text.trim();
    if (!message || this.#send.disabled) return;
    this.#input.value = "";
    this.#autoGrow();
    this.#onSend(message);
  }

  /**
   * Enter sends; Shift + Enter adds a new line.
   * @param {!KeyboardEvent} event The key press.
   */
  #onKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    this.#submit(this.#input.value);
  }

  /** Grows the composer with its content, up to a limit. */
  #autoGrow() {
    this.#input.style.height = "auto";
    // Empty (or not yet on the page): keep the natural one-line height.
    if (!this.#input.value) return;
    this.#input.style.height = `${Math.min(this.#input.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
  }

  /** Keeps the newest message in view inside the window. */
  #scrollToBottom() {
    this.#messages.scrollTop = this.#messages.scrollHeight;
  }
}
