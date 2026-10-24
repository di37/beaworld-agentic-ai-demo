/**
 * @fileoverview What each level teaches, in the words of the workshop deck.
 */

/**
 * @typedef {{
 *   number: number,
 *   name: string,
 *   navHint: string,
 *   title: string,
 *   subtitle: string,
 *   uses: !Array<string>,
 *   decides: string,
 *   roomQuestion: {question: string, answer: string},
 * }}
 */
export let LevelMeta;

/** The five building blocks; each level switches more of them on. */
export const INGREDIENTS = Object.freeze([
  { key: "llm", label: "Language model", icon: "spark", hint: "Writes the answer" },
  { key: "tool", label: "Tools", icon: "thermometer", hint: "Read sensors and service records" },
  { key: "search", label: "Manual search", icon: "book", hint: "Finds evidence in documents" },
  { key: "loop", label: "Agent loop", icon: "loop", hint: "The model picks the next step" },
  { key: "approval", label: "Human approval", icon: "shield", hint: "An engineer signs off actions" },
]);

/** Plain-English names for the tools the model can request. */
export const TOOL_LABELS = Object.freeze({
  get_ahu_readings: { label: "Read the sensors", icon: "thermometer" },
  get_maintenance_history: { label: "Check the service history", icon: "history" },
  search_manual: { label: "Search the manual", icon: "book" },
  create_maintenance_ticket: { label: "Create a maintenance ticket", icon: "ticket" },
});

/**
 * Looks up the friendly label for a tool name.
 * @param {string} name Tool name used by the model.
 * @return {{label: string, icon: string}} Label and icon.
 */
export function toolLabel(name) {
  return TOOL_LABELS[name] ?? { label: name, icon: "program" };
}

/** @const {!Array<!LevelMeta>} */
export const LEVELS = Object.freeze([
  {
    number: 1,
    name: "LLM",
    navHint: "Generates a response",
    title: "The LLM",
    subtitle: "Start with the simplest question: what might cause poor cooling?",
    uses: ["llm"],
    decides: "Nobody. One question in, one answer out.",
    roomQuestion: {
      question: "Did the model check any live equipment readings?",
      answer:
        "No. It wrote a sensible-sounding answer from what it learned in training. No measurement happened. Generated text is not a live measurement.",
    },
  },
  {
    number: 2,
    name: "Tool",
    navHint: "Reads data",
    title: "The Tool",
    subtitle: "Add one simple sensor-reading function. The tool knows data; it does not make decisions.",
    uses: ["tool"],
    decides: "Our program. You pressed the button.",
    roomQuestion: {
      question: "Who chose to run the tool?",
      answer:
        "Our program did, because you clicked. There is no AI in this step. And a tool can't invent data: ask about AHU-02 and it honestly says it has none.",
    },
  },
  {
    number: 3,
    name: "RAG",
    navHint: "Retrieves trusted context",
    title: "RAG: Search Before Answering",
    subtitle:
      "Retrieval-Augmented Generation finds relevant evidence in the maintenance manual before the model answers.",
    uses: ["search", "llm"],
    decides: "Our program. Always search first, then answer.",
    roomQuestion: {
      question: "Who decided when to search the manual?",
      answer:
        "Our fixed workflow: search, then answer, every time. RAG grounds the answer in documents, but it is not an agent. Nothing chose to search.",
    },
  },
  {
    number: 4,
    name: "AI Agent",
    navHint: "Chooses next steps",
    title: "The AI Agent",
    subtitle: "Let the model decide whether to read sensors, check service history, or look in the manual.",
    uses: ["llm", "tool", "search", "loop"],
    decides: "The model. It picks each tool from the evidence.",
    roomQuestion: {
      question: "Which tools did the model ask for, and in what order?",
      answer: "Run the investigation first, then reveal the answer.",
    },
  },
  {
    number: 5,
    name: "Agentic AI App",
    navHint: "Governs the whole task",
    title: "Agentic AI Application",
    subtitle: "Combine the agent, tools, task state and approval rules into one controlled application.",
    uses: ["llm", "tool", "search", "loop", "approval"],
    decides: "The model proposes. An engineer approves.",
    roomQuestion: {
      question: "Could the model create the ticket on its own?",
      answer:
        "No. The application paused before the ticket tool ran and waited for an engineer. Permission is separate from the model's recommendation.",
    },
  },
]);
