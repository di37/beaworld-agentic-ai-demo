"""Shared, FICTIONAL tools for Levels 4 and 5.

Each tool is a plain Python function. The language model may *request* a
tool; our Python program runs it. Every tool prints a [TOOL RUNNING] line so
you can follow the agent's route in the terminal.

Audience challenge (Level 4): run with BEA_FILTER_RECENT=1 to switch to a
service record where the air filter was replaced last week.
"""
import os
from itertools import count
from pathlib import Path
from typing import Literal

from langchain.tools import tool
from langchain_core.documents import Document
from langchain_core.tools import BaseTool
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings

MANUAL_DIR = Path(__file__).parent / "manual"
EMBEDDING_MODEL = "text-embedding-3-small"
PASSAGES_PER_SEARCH = 2

STANDARD_HISTORY = (
    "FICTIONAL AHU-01 maintenance history: "
    "air filter replacement: 7 months ago, due every 3 months (OVERDUE); "
    "supply fan belt inspection: 2 months ago (OK); "
    "cooling coil cleaning: 5 months ago (OK); "
    "room temperature sensor calibration: 4 months ago (OK)."
)
FILTER_RECENT_HISTORY = (
    "FICTIONAL AHU-01 maintenance history: "
    "air filter replacement: 1 week ago (OK); "
    "supply fan belt inspection: 9 months ago, due every 6 months (OVERDUE); "
    "cooling coil cleaning: 5 months ago (OK); "
    "room temperature sensor calibration: 4 months ago (OK)."
)

_ticket_numbers = count(1001)


@tool(parse_docstring=True)
def get_ahu_readings(equipment_id: str) -> str:
    """Get fictional room and airflow readings for an Air Handling Unit.

    Args:
        equipment_id: Equipment identifier, for example AHU-01.
    """
    print(f"[TOOL RUNNING] get_ahu_readings({equipment_id})")
    if equipment_id != "AHU-01":
        return "No simulated readings available for that equipment ID."
    return (
        "FICTIONAL AHU-01 data: room temperature = 28 C; "
        "setpoint = 22 C; supply airflow = LOW; "
        "filter differential pressure = HIGH."
    )


@tool(parse_docstring=True)
def get_maintenance_history(equipment_id: str) -> str:
    """Get the fictional maintenance and service history for an Air Handling Unit.

    Args:
        equipment_id: Equipment identifier, for example AHU-01.
    """
    print(f"[TOOL RUNNING] get_maintenance_history({equipment_id})")
    if equipment_id != "AHU-01":
        return "No maintenance history available for that equipment ID."
    if os.getenv("BEA_FILTER_RECENT") == "1":
        return FILTER_RECENT_HISTORY
    return STANDARD_HISTORY


def build_manual_search_tool() -> BaseTool:
    """Builds a tool that searches the fictional maintenance manual.

    The manual is embedded once, when the tool is built, just like Level 3.

    Returns:
        BaseTool: The ``search_manual`` tool.

    Raises:
        RuntimeError: If the ``manual`` folder has no ``.txt`` files.
    """
    documents = [
        Document(page_content=path.read_text(encoding="utf-8"), metadata={"source": path.name})
        for path in sorted(MANUAL_DIR.glob("*.txt"))
    ]
    if not documents:
        raise RuntimeError("No manual files found in the 'manual' directory")
    store = InMemoryVectorStore(OpenAIEmbeddings(model=EMBEDDING_MODEL))
    store.add_documents(documents)

    @tool(parse_docstring=True)
    def search_manual(query: str) -> str:
        """Search the fictional AHU maintenance manual. Returns passages with their source files.

        Args:
            query: What to look up, for example "low airflow and high filter pressure".
        """
        print(f"[TOOL RUNNING] search_manual({query!r})")
        passages = store.similarity_search(query, k=PASSAGES_PER_SEARCH)
        return "\n\n".join(f"Source: {doc.metadata['source']}\n{doc.page_content}" for doc in passages)

    return search_manual


@tool(parse_docstring=True)
def create_maintenance_ticket(
    equipment_id: str, priority: Literal["low", "medium", "high"], summary: str
) -> str:
    """Create a SIMULATED maintenance ticket. No real ticketing system is contacted.

    Args:
        equipment_id: Equipment identifier, for example AHU-01.
        priority: Ticket priority.
        summary: Short summary of the evidence and the inspection requested.
    """
    ticket_id = f"SIM-{next(_ticket_numbers)}"
    print(f"[TOOL RUNNING] create_maintenance_ticket({equipment_id}, {priority}) -> {ticket_id}")
    return f"SIMULATED ticket {ticket_id} created for {equipment_id} (priority: {priority}): {summary}"
