"""Level 4 — AI agent: the model chooses which read-only tools to use."""

from __future__ import annotations

from typing import Iterator

from langchain.agents import create_agent

from app.core.events import DemoEvent
from app.core.prompts import AGENT_SYSTEM_PROMPT, AGENT_TASK
from app.domain.equipment import HistoryScenario
from app.levels.agent_runner import AgentLevelRunner
from app.levels.base import LevelRequest
from app.services.agent_trace import AgentTraceTranslator


class AgentLevelRequest(LevelRequest):
    """Request body for Level 4.

    Attributes:
        filter_recently_replaced: Audience challenge — swap in a service record
            where the filter was replaced last week.
    """

    filter_recently_replaced: bool = False


class AgentLevel(AgentLevelRunner[AgentLevelRequest]):
    """Level 4: the model decides the investigation route."""

    number = 4
    request_model = AgentLevelRequest

    def run(self, request: AgentLevelRequest) -> Iterator[DemoEvent]:
        """Runs one agent investigation and streams every step.

        Args:
            request: The scenario to investigate.

        Yields:
            DemoEvent: Tool calls, tool results and the final answer.
        """
        scenario = HistoryScenario.FILTER_RECENT if request.filter_recently_replaced else HistoryScenario.STANDARD
        agent = create_agent(
            model=self._services.models.chat,
            tools=self._services.toolkit.investigation_tools(scenario),
            system_prompt=AGENT_SYSTEM_PROMPT,
        )
        yield from self.stream_agent(agent, self.user_message(AGENT_TASK), AgentTraceTranslator())
