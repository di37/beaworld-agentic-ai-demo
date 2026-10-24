# BEAWorld — Agentic Engineering 101: Python Workshop

**Presenter:** Isham Rashik — AI Engineer, Future OS, Expo City, Dubai, UAE  
**Audience:** Engineers and architects  
**Case study:** A **fictional Air Handling Unit (AHU-01)** that is not cooling properly.

The five exercises correspond directly to the **five levels in the workshop slides**.

> For the live session, use the browser version of the same five levels: see [../README.md](../README.md).

| PowerPoint | Script | What it demonstrates | Time |
|---|---|---|---|
| Level 1 — LLM | `exercise_01_llm.py` | General explanation from a language model | 5 min |
| Level 2 — Tool | `exercise_02_tool.py` | A plain Python function supplies simulated readings | 5 min |
| Level 3 — RAG | `exercise_03_rag.py` | Search fictional maintenance documents and generate an answer based on retrieved evidence | 7 min |
| Level 4 — AI Agent | `exercise_04_agent.py` | Let the model select tools during an investigation | 10 min |
| Level 5 — Agentic AI Application | `exercise_05_agentic_application.py` | Add task state and human approval for a simulated ticket | 10 min |

## 1. Install prerequisites

Python **3.11+** is recommended. From this directory:

```bash
python -m venv .venv
source .venv/bin/activate               # macOS / Linux
# On Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## 2. Supply an API key

```bash
export OPENAI_API_KEY="your_openai_api_key"  # macOS / Linux
# On Windows PowerShell: $env:OPENAI_API_KEY="your_openai_api_key"
```

If the key is already in a `.env` file in this folder, load it into the current terminal instead (macOS / Linux):

```bash
set -a; source .env; set +a
```

Levels 1, 3, 4, and 5 call the OpenAI API and will incur usage charges. Level 2 makes no model or API call. Level 3 and later also create small text embeddings using `text-embedding-3-small`. Do **not** hardcode the API key into the Python files or share it on-screen.

Optional model override (choose an available model that supports tool calls for Levels 4 and 5):

```bash
export BEA_MODEL="gpt-4.1-mini"
```

## 3. Run each exercise (in order)

```bash
python exercise_01_llm.py
python exercise_02_tool.py
python exercise_03_rag.py
python exercise_04_agent.py
python exercise_05_agentic_application.py
```

For Level 5, the terminal prompts for a simulated ticket approval. Type `y` to approve or `n` to reject. No actual ticketing service is involved.

## 4. Interactive audience challenges

1. **LLM:** Ask whether it has seen an actual temperature reading.
2. **Tool:** Change `AHU-01` to `AHU-02`; notice that a deterministic tool can't invent measurements.
3. **RAG:** Modify `manual/01_air_filters.txt`, rerun, and inspect the retrieved citations. Retrieval is a *fixed* step in this exercise.
4. **AI Agent:** Try `BEA_FILTER_RECENT=1 python exercise_04_agent.py` to change the fictional filter replacement record. Compare the tool trace and recommendations.
5. **Agentic AI Application:** Run twice—once approving and once rejecting the simulated ticket—and explain why permission is separate from the model's recommendation.

## Folder structure

```
BEAWorld_Agentic_Engineering_101_Python_Code/
├── README.md
├── requirements.txt
├── exercise_01_llm.py
├── exercise_02_tool.py
├── exercise_03_rag.py
├── exercise_04_agent.py
├── exercise_05_agentic_application.py
├── workshop_tools.py           # shared, fictional agent tools
└── manual/
    ├── 01_air_filters.txt
    ├── 02_supply_fan.txt
    ├── 03_temperature_sensor.txt
    └── 04_cooling_coil.txt
```

## Engineering and teaching notes

- **LLM = Large Language Model.** Generates answers from the supplied context; does not inherently access equipment.
- **Tool = software function/API.** The Python application runs tools; the language model may request tool calls.
- **RAG = Retrieval-Augmented Generation.** Retrieves relevant passages before responding. It does **not** require an agent.
- **AI agent.** Model-driven tool selection in an execution loop.
- **Agentic AI application.** The agent plus tools, state, approvals, boundaries, and evaluation.

All manuals, readings, and maintenance records in this workshop are fictional and provided solely for teaching. **Never connect this classroom example to actuators or safety-critical systems.** Human review is required for real maintenance decisions.

These exercises are intentionally small, for learning. An actual deployment would also need authentication, scoped permissions, validation, retries, logs, monitoring, test cases, durable storage, and operational safety reviews.

## LangChain references

- https://docs.langchain.com/oss/python/langchain/agents
- https://docs.langchain.com/oss/python/langchain/knowledge-base
- https://docs.langchain.com/oss/python/langchain/human-in-the-loop
