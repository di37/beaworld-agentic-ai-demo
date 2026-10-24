/**
 * @fileoverview Shared screen behaviour for the agent levels (4 and 5).
 */

import { AnswerPanel } from "../ui/components/answer-panel.js";
import { TraceView } from "../ui/components/trace-view.js";
import { toolLabel } from "./catalog.js";
import { LevelView } from "./level-view.js";

/** A level that shows the agent's steps live, then its conclusion. */
export class AgentTraceLevelView extends LevelView {
  /** @param {!Object} deps See LevelView. */
  constructor(deps) {
    super(deps);
    this.trace = new TraceView();
    this.answer = new AnswerPanel({ title: "The agent's conclusion" });
  }

  /**
   * The task sent to the agent, shown as the first step.
   * @return {string} Task text.
   */
  get taskText() {
    throw new Error("Subclasses must provide taskText");
  }

  /** @override */
  renderOutput() {
    return [this.trace.element, this.answer.element];
  }

  /** @override */
  eventHandlers() {
    return {
      agent_message: ({ text }) => this.trace.addAgentNote(text),
      tool_call: (call) => {
        this.trace.addToolCall(call);
        this.status.working(`The application runs the tool: ${toolLabel(call.name).label}…`);
      },
      tool_result: (result) => {
        this.trace.addToolResult(result);
        this.status.working("The model reads the result and decides what to do next…");
      },
      answer: ({ text }) => {
        this.answer.setAnswer(text);
        this.onAnswer();
      },
    };
  }

  /** @override */
  onRunStart() {
    this.trace.reset();
    this.answer.reset();
    this.trace.addTask(this.taskText);
  }

  /** Called when the agent gives its final answer. */
  onAnswer() {}
}
