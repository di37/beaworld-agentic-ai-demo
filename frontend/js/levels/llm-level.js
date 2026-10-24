/**
 * @fileoverview Level 1: chat with the language model. No live data.
 */

import { ChatWindow } from "../ui/components/chat-window.js";
import { LevelView } from "./level-view.js";

/** Earlier turns sent with each question (the backend accepts up to 12). */
const MAX_HISTORY_TURNS = 12;

/** The model's greeting; it sets up the lesson that it has no live data. */
const WELCOME =
  "Hi! I'm a general-purpose language model. I can explain things from what I learned in training, " +
  "but I can't see AHU-01's sensors or records. Ask me anything.";

/** Shown when a run ends without any answer text. */
const NO_ANSWER = "Sorry, no answer came back this time. Please try again.";

/** Level 1 screen. */
export class LlmLevelView extends LevelView {
  /** @type {?ChatWindow} */
  #chat = null;
  /** @type {!Array<{role: string, content: string}>} */
  #history = [];
  /** @type {?Object} ChatReply receiving the current answer. */
  #reply = null;
  /** @type {string} */
  #pendingQuestion = "";

  /** @override The chat's typing dots show progress instead. */
  get showsProgressLine() {
    return false;
  }

  /** @override */
  renderOutput() {
    const { level1_question: question, level1_suggestions: suggestions } = this.config.defaults;
    this.#chat = new ChatWindow({
      model: this.config.model,
      welcome: WELCOME,
      starters: [question, ...suggestions],
      followUps: suggestions,
      onSend: (text) => this.#ask(text),
      onReset: () => this.#startOver(),
    });
    return [this.#chat.element];
  }

  /** @override */
  eventHandlers() {
    return {
      token: ({ text }) => this.#reply?.append(text),
      answer: ({ text }) => {
        this.#reply?.finish(text);
        this.#history = [
          ...this.#history,
          { role: "user", content: this.#pendingQuestion },
          { role: "assistant", content: text },
        ].slice(-MAX_HISTORY_TURNS);
      },
      error: ({ message }) => (this.#reply ? this.#reply.fail(message) : this.status.error(message)),
    };
  }

  /** @override */
  onBusyChange(busy) {
    this.#chat?.setBusy(busy);
  }

  /** @override */
  onRunEnd() {
    if (this.#reply?.isEmpty) this.#reply.fail(NO_ANSWER);
    this.#reply = null;
  }

  /**
   * Sends a question, keeping earlier turns as context.
   * @param {string} question The question.
   */
  #ask(question) {
    if (this.busy) return;
    this.#pendingQuestion = question;
    this.#chat.addUserMessage(question);
    this.#reply = this.#chat.startReply();
    this.execute(this.api.runLevel(this.number, { question, history: this.#history }));
  }

  /** Clears the conversation. */
  #startOver() {
    if (this.busy) return;
    this.#history = [];
    this.#chat.reset();
    this.status.finish();
    this.roomQuestion.reset();
  }
}
