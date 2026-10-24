"""Level 5 — Agentic AI application: tools + state + human approval.

The agent may *propose* a simulated ticket, but the application pauses
before the ticket tool runs and waits for an engineer to approve or reject.
"""

from __future__ import annotations

from functools import cached_property
from typing import Any, Iterator
from uuid import uuid4

from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import Command
from pydantic import BaseModel, ConfigDict, Field

from app.core.errors import DemoError
from app.core.events import DemoEvent
from app.core.prompts import AGENTIC_APP_SYSTEM_PROMPT, AGENTIC_APP_TASK
from app.levels.agent_runner import FIRST_STEP_STATUS, AgentLevelRunner
from app.levels.approvals import ApprovalBook
from app.levels.base import LevelRequest
from app.services.agent_trace import AgentTraceTranslator
from app.services.container import DemoServices
from app.services.toolkit import ToolName


class AgenticAppRequest(LevelRequest):
    """Request body for Level 5. There are no options: the scenario is fixed."""


class DecisionRequest(BaseModel):
    """The engineer's answer to a paused investigation.

    Attributes:
        thread_id: Investigation to resume.
        approve: ``True`` to create the ticket, ``False`` to decline it.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    thread_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    approve: bool


class AgenticAppLevel(AgentLevelRunner[AgenticAppRequest]):
    """Level 5: an agent with saved state and a human approval gate.

    Args:
        services: Shared services (models, data, tools).
    """

    number = 5
    request_model = AgenticAppRequest

    REJECT_MESSAGE = (
        "Engineer declined ticket creation. Do not request the ticket again; summarise the findings instead."
    )
    AUTO_REJECT_MESSAGE = (
        "Only one ticket can be proposed per investigation, and only once. "
        "The application rejected this request automatically."
    )
    MAX_AUTO_REJECTIONS = 2

    def __init__(self, services: DemoServices) -> None:
        super().__init__(services)
        self._approvals = ApprovalBook()
        self._checkpointer = InMemorySaver()

    @cached_property
    def _agent(self) -> CompiledStateGraph:
        """CompiledStateGraph: The agent, built once; its state lives in the checkpointer."""
        return create_agent(
            model=self._services.models.chat,
            tools=self._services.toolkit.agentic_app_tools(),
            system_prompt=AGENTIC_APP_SYSTEM_PROMPT,
            middleware=[
                HumanInTheLoopMiddleware(
                    interrupt_on={ToolName.TICKET.value: {"allowed_decisions": ["approve", "reject"]}}
                )
            ],
            checkpointer=self._checkpointer,
        )

    def run(self, request: AgenticAppRequest) -> Iterator[DemoEvent]:
        """Starts a new investigation and streams it until it finishes or pauses.

        Args:
            request: The (empty) request.

        Yields:
            DemoEvent: Agent steps, then an approval request or the final answer.
        """
        yield from self._advance(uuid4().hex, self.user_message(AGENTIC_APP_TASK), FIRST_STEP_STATUS)

    def decide(self, request: DecisionRequest) -> Iterator[DemoEvent]:
        """Applies the engineer's decision and streams the rest of the investigation.

        Args:
            request: The investigation and the decision.

        Returns:
            Iterator[DemoEvent]: The remaining events, ending with ``done``.
        """
        return self.guarded(lambda: self._resume(request))

    def _resume(self, request: DecisionRequest) -> Iterator[DemoEvent]:
        """Resumes a paused investigation with the engineer's decision.

        Args:
            request: The investigation and the decision.

        Yields:
            DemoEvent: The decision, the remaining agent steps and any new ticket.
        """
        self._approvals.close(request.thread_id)
        yield DemoEvent.decision(request.approve)
        decision = {"type": "approve"} if request.approve else {"type": "reject", "message": self.REJECT_MESSAGE}
        tickets_before = self._services.tickets.count
        yield from self._advance(
            request.thread_id,
            Command(resume={"decisions": [decision]}),
            "The application resumes the saved investigation…",
        )
        for ticket in self._services.tickets.created_since(tickets_before):
            yield DemoEvent.ticket(ticket.to_dict())

    def _advance(self, thread_id: str, agent_input: Any, status: str) -> Iterator[DemoEvent]:
        """Streams the agent until it finishes or pauses for a decision.

        Extra ticket requests (more than one at once, or any after a decision)
        are rejected automatically instead of being shown to the engineer.

        Args:
            thread_id: Investigation identifier used by the checkpointer.
            agent_input: First input, or a ``Command`` that resumes the run.
            status: Progress note shown before streaming.

        Yields:
            DemoEvent: Agent steps, then an approval request or the final answer.

        Raises:
            DemoError: If the agent keeps requesting tickets.
        """
        config = {"configurable": {"thread_id": thread_id}}
        next_input = agent_input
        for _ in range(self.MAX_AUTO_REJECTIONS + 1):
            translator = AgentTraceTranslator()
            yield from self.stream_agent(self._agent, next_input, translator, config, status)
            actions = translator.pending_actions
            if not actions:
                return
            if len(actions) == 1 and not self._approvals.was_decided(thread_id):
                self._approvals.open(thread_id, actions[0])
                yield DemoEvent.approval_required(thread_id, actions[0]["name"], actions[0]["args"])
                return
            status = "The application automatically rejected an extra ticket request."
            next_input = Command(
                resume={"decisions": [{"type": "reject", "message": self.AUTO_REJECT_MESSAGE} for _ in actions]}
            )
        raise DemoError("The agent kept requesting tickets, so the investigation was stopped.")
