"""Shared behaviour for the levels where the model chooses tools."""

from __future__ import annotations

from abc import ABC
from typing import Any, Iterator, Mapping

from langgraph.graph.state import CompiledStateGraph

from app.core.events import DemoEvent
from app.levels.base import LevelRunner, RequestT
from app.services.agent_trace import AgentTraceTranslator

FIRST_STEP_STATUS = "The model is deciding what to check first…"


class AgentLevelRunner(LevelRunner[RequestT], ABC):
    """Base class for Levels 4 and 5, which stream an agent's tool loop."""

    @staticmethod
    def user_message(text: str) -> dict[str, Any]:
        """Wraps a task as the agent's first input.

        Args:
            text: The task for the agent.

        Returns:
            dict[str, Any]: Agent input with one user message.
        """
        return {"messages": [{"role": "user", "content": text}]}

    @staticmethod
    def stream_agent(
        agent: CompiledStateGraph,
        agent_input: Any,
        translator: AgentTraceTranslator,
        config: Mapping[str, Any] | None = None,
        status: str = FIRST_STEP_STATUS,
    ) -> Iterator[DemoEvent]:
        """Streams each agent step as it happens.

        Args:
            agent: The compiled LangChain agent.
            agent_input: First input, or a ``Command`` that resumes a paused run.
            translator: Converts agent updates to events and records pauses.
            config: Run configuration, such as the thread ID.
            status: Progress note shown before the first step.

        Yields:
            DemoEvent: A status note, then tool calls, results and the answer.
        """
        yield DemoEvent.status(status)
        for update in agent.stream(agent_input, config=config, stream_mode="updates"):
            yield from translator.translate(update)
