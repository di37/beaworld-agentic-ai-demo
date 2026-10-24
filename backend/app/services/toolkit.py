"""The tools the model may ask the application to run.

The model only *requests* a tool; this application runs the function and
returns the result. All data behind the tools is fictional.
"""

from __future__ import annotations

from enum import Enum
from typing import Callable

from langchain_core.tools import BaseTool, StructuredTool
from pydantic import BaseModel, Field

from app.domain.equipment import EquipmentRepository, HistoryScenario
from app.domain.manual import ManualRepository
from app.domain.tickets import Priority, TicketDesk
from app.services.retrieval import ManualRetriever


class ToolName(str, Enum):
    """Names the model uses to request each tool."""

    READINGS = "get_ahu_readings"
    HISTORY = "get_maintenance_history"
    MANUAL = "search_manual"
    TICKET = "create_maintenance_ticket"


class EquipmentArgs(BaseModel):
    """Arguments for tools that look up one unit."""

    equipment_id: str = Field(description="Equipment identifier, for example AHU-01.", min_length=1, max_length=20)


class ManualSearchArgs(BaseModel):
    """Arguments for the manual search tool."""

    query: str = Field(description="What to look up in the maintenance manual.", min_length=2, max_length=300)


class TicketArgs(BaseModel):
    """Arguments for the simulated ticket tool."""

    equipment_id: str = Field(description="Equipment identifier, for example AHU-01.", min_length=1, max_length=20)
    priority: Priority = Field(description="Ticket priority: low, medium or high.")
    summary: str = Field(
        description="Short summary of the evidence and the inspection requested.", min_length=10, max_length=500
    )


class WorkshopToolkit:
    """Builds the LangChain tools used by Levels 2, 4 and 5.

    Args:
        equipment: Source of fictional readings and service history.
        manual: The fictional maintenance manual.
        retriever: Searches the manual.
        tickets: The simulated ticketing system.
    """

    def __init__(
        self,
        equipment: EquipmentRepository,
        manual: ManualRepository,
        retriever: ManualRetriever,
        tickets: TicketDesk,
    ) -> None:
        self._equipment = equipment
        self._manual = manual
        self._retriever = retriever
        self._tickets = tickets

    def readings_tool(self) -> BaseTool:
        """Builds the sensor-reading tool.

        Returns:
            BaseTool: ``get_ahu_readings``.
        """
        return self._build(
            self._equipment.describe_readings,
            ToolName.READINGS,
            "Get fictional room temperature, setpoint, airflow and filter readings for an Air Handling Unit.",
            EquipmentArgs,
        )

    def history_tool(self, scenario: HistoryScenario = HistoryScenario.STANDARD) -> BaseTool:
        """Builds the maintenance-history tool.

        Args:
            scenario: Which version of the fictional service log to return.

        Returns:
            BaseTool: ``get_maintenance_history``.
        """

        def get_history(equipment_id: str) -> str:
            return self._equipment.describe_history(equipment_id, scenario)

        return self._build(
            get_history,
            ToolName.HISTORY,
            "Get the fictional maintenance and service history for an Air Handling Unit.",
            EquipmentArgs,
        )

    def manual_tool(self) -> BaseTool:
        """Builds the manual-search tool.

        Returns:
            BaseTool: ``search_manual``, returning the best-matching passages with sources.
        """

        def search_manual(query: str) -> str:
            return self._retriever.search(query, self._manual.sections).as_context()

        return self._build(
            search_manual,
            ToolName.MANUAL,
            "Search the fictional AHU maintenance manual. Returns the most relevant passages with their source files.",
            ManualSearchArgs,
        )

    def ticket_tool(self) -> BaseTool:
        """Builds the simulated ticket tool. It needs human approval in Level 5.

        Returns:
            BaseTool: ``create_maintenance_ticket``.
        """

        def create_ticket(equipment_id: str, priority: Priority, summary: str) -> str:
            return self._tickets.create(equipment_id, Priority(priority), summary).describe()

        return self._build(
            create_ticket,
            ToolName.TICKET,
            "Create a SIMULATED maintenance ticket asking an engineer to inspect equipment. No real system is contacted.",
            TicketArgs,
        )

    def investigation_tools(self, scenario: HistoryScenario = HistoryScenario.STANDARD) -> list[BaseTool]:
        """Returns the three read-only tools used by the agent levels.

        Args:
            scenario: Which version of the service log the history tool returns.

        Returns:
            list[BaseTool]: Readings, history and manual search.
        """
        return [self.readings_tool(), self.history_tool(scenario), self.manual_tool()]

    def agentic_app_tools(self) -> list[BaseTool]:
        """Returns the read-only tools plus the ticket tool for Level 5.

        Returns:
            list[BaseTool]: Readings, history, manual search and ticket creation.
        """
        return [*self.investigation_tools(), self.ticket_tool()]

    @staticmethod
    def _build(func: Callable[..., str], name: ToolName, description: str, schema: type[BaseModel]) -> BaseTool:
        """Wraps a plain function as a LangChain tool.

        Args:
            func: The function the application runs.
            name: Name the model uses to request it.
            description: What the model is told the tool does.
            schema: Pydantic model that validates the model's arguments.

        Returns:
            BaseTool: The tool.
        """
        return StructuredTool.from_function(func=func, name=name.value, description=description, args_schema=schema)
