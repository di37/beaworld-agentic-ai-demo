"""Level 2 — Tool: our program runs a function. No language model is used."""

from __future__ import annotations

from typing import Iterator

from pydantic import Field

from app.core.events import DemoEvent
from app.levels.base import LevelRequest, LevelRunner


class ToolLevelRequest(LevelRequest):
    """Request body for Level 2.

    Attributes:
        equipment_id: Unit to read, for example ``AHU-01``.
    """

    equipment_id: str = Field(min_length=1, max_length=20, pattern=r"^[A-Za-z0-9-]+$")


class ToolLevel(LevelRunner[ToolLevelRequest]):
    """Level 2: the program, not a model, decides to run the reading tool."""

    number = 2
    request_model = ToolLevelRequest
    uses_model = False

    def run(self, request: ToolLevelRequest) -> Iterator[DemoEvent]:
        """Runs the sensor tool and returns its output.

        Args:
            request: Which unit to read.

        Yields:
            DemoEvent: A status note, then the readings.
        """
        tool = self._services.toolkit.readings_tool()
        yield DemoEvent.status(f'Our program calls {tool.name}("{request.equipment_id}")')
        output = tool.invoke({"equipment_id": request.equipment_id})
        readings = self._services.equipment.find_readings(request.equipment_id)
        yield DemoEvent.readings(
            {
                "equipment_id": request.equipment_id,
                "tool_name": tool.name,
                "tool_output": output,
                "readings": readings.to_dict() if readings else None,
            }
        )
