"""Events streamed to the browser, one JSON object per line (NDJSON).

The frontend renders each event type differently, so this module is the
contract between the two halves of the demo.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Mapping


class EventType(str, Enum):
    """Kinds of event the frontend knows how to display."""

    STATUS = "status"
    TOKEN = "token"
    ANSWER = "answer"
    READINGS = "readings"
    RETRIEVAL = "retrieval"
    AGENT_MESSAGE = "agent_message"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    APPROVAL_REQUIRED = "approval_required"
    DECISION = "decision"
    TICKET = "ticket"
    ERROR = "error"
    DONE = "done"


@dataclass(frozen=True)
class DemoEvent:
    """A single step of a level run, ready to send to the browser.

    Attributes:
        type: What kind of step this is.
        data: Event-specific fields, merged into the JSON object.
    """

    type: EventType
    data: Mapping[str, Any] = field(default_factory=dict)

    def to_json_line(self) -> str:
        """Serialises the event as one line of NDJSON.

        Returns:
            str: The JSON object followed by a newline.
        """
        return json.dumps({"type": self.type.value, **self.data}, ensure_ascii=False, default=str) + "\n"

    @classmethod
    def status(cls, message: str) -> DemoEvent:
        """Creates a progress note, e.g. "Searching the manual".

        Args:
            message: Plain-English description of what is happening.

        Returns:
            DemoEvent: The status event.
        """
        return cls(EventType.STATUS, {"message": message})

    @classmethod
    def token(cls, text: str) -> DemoEvent:
        """Creates a piece of an answer that is still being generated.

        Args:
            text: The newly generated text.

        Returns:
            DemoEvent: The token event.
        """
        return cls(EventType.TOKEN, {"text": text})

    @classmethod
    def answer(cls, text: str) -> DemoEvent:
        """Creates the model's complete final answer.

        Args:
            text: The full answer, in Markdown.

        Returns:
            DemoEvent: The answer event.
        """
        return cls(EventType.ANSWER, {"text": text})

    @classmethod
    def readings(cls, payload: Mapping[str, Any]) -> DemoEvent:
        """Creates the Level 2 tool result with structured sensor values.

        Args:
            payload: Equipment ID, tool name, raw tool output and readings.

        Returns:
            DemoEvent: The readings event.
        """
        return cls(EventType.READINGS, dict(payload))

    @classmethod
    def retrieval(cls, payload: Mapping[str, Any]) -> DemoEvent:
        """Creates the Level 3 search result with a score for each section.

        Args:
            payload: The question and the ranked manual sections.

        Returns:
            DemoEvent: The retrieval event.
        """
        return cls(EventType.RETRIEVAL, dict(payload))

    @classmethod
    def agent_message(cls, text: str) -> DemoEvent:
        """Creates a note the model wrote while it was also requesting tools.

        Args:
            text: The model's commentary.

        Returns:
            DemoEvent: The agent message event.
        """
        return cls(EventType.AGENT_MESSAGE, {"text": text})

    @classmethod
    def tool_call(cls, call_id: str, name: str, args: Mapping[str, Any]) -> DemoEvent:
        """Creates a record of the model asking the application to run a tool.

        Args:
            call_id: Identifier linking the call to its result.
            name: Tool name.
            args: Arguments the model supplied.

        Returns:
            DemoEvent: The tool call event.
        """
        return cls(EventType.TOOL_CALL, {"call_id": call_id, "name": name, "args": dict(args)})

    @classmethod
    def tool_result(cls, call_id: str, name: str, output: str, ok: bool) -> DemoEvent:
        """Creates a record of what a tool returned to the model.

        Args:
            call_id: Identifier of the matching tool call.
            name: Tool name.
            output: Text the tool returned.
            ok: ``False`` when the tool failed or was not allowed to run.

        Returns:
            DemoEvent: The tool result event.
        """
        return cls(EventType.TOOL_RESULT, {"call_id": call_id, "name": name, "output": output, "ok": ok})

    @classmethod
    def approval_required(cls, thread_id: str, name: str, args: Mapping[str, Any]) -> DemoEvent:
        """Creates a pause that waits for an engineer to approve an action.

        Args:
            thread_id: Investigation to resume once a decision is made.
            name: Tool the model wants to run.
            args: Arguments the model supplied.

        Returns:
            DemoEvent: The approval request event.
        """
        return cls(EventType.APPROVAL_REQUIRED, {"thread_id": thread_id, "name": name, "args": dict(args)})

    @classmethod
    def decision(cls, approved: bool) -> DemoEvent:
        """Creates a record of the engineer's decision.

        Args:
            approved: Whether the engineer approved the action.

        Returns:
            DemoEvent: The decision event.
        """
        return cls(EventType.DECISION, {"approved": approved})

    @classmethod
    def ticket(cls, payload: Mapping[str, Any]) -> DemoEvent:
        """Creates a record of a simulated ticket that was created.

        Args:
            payload: The ticket fields.

        Returns:
            DemoEvent: The ticket event.
        """
        return cls(EventType.TICKET, dict(payload))

    @classmethod
    def error(cls, message: str) -> DemoEvent:
        """Creates an error that is safe to show on screen.

        Args:
            message: Friendly description of what went wrong.

        Returns:
            DemoEvent: The error event.
        """
        return cls(EventType.ERROR, {"message": message})

    @classmethod
    def done(cls) -> DemoEvent:
        """Creates the final event of every stream.

        Returns:
            DemoEvent: The done event.
        """
        return cls(EventType.DONE)
