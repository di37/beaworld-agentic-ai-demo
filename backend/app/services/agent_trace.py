"""Turns a LangGraph agent's step-by-step updates into demo events."""

from __future__ import annotations

from typing import Any, Iterable, Iterator, Mapping

from langchain_core.messages import AIMessage, BaseMessage, ToolMessage

from app.core.events import DemoEvent


def _message_text(message: BaseMessage) -> str:
    """Extracts plain text from a message whose content may be a list of blocks.

    Args:
        message: A LangChain message.

    Returns:
        str: The message text, stripped.
    """
    return str(message.text).strip()


class AgentTraceTranslator:
    """Converts ``stream_mode="updates"`` chunks into events for the browser.

    Create one translator per agent stream. After the stream ends, check
    :attr:`pending_actions` to see whether the agent paused for approval.

    Middleware nodes repeat an earlier model message when an investigation is
    resumed, so model messages are only reported from the ``model`` node.
    """

    MODEL_NODE = "model"
    INTERRUPT_KEY = "__interrupt__"

    def __init__(self) -> None:
        self._pending_actions: tuple[Mapping[str, Any], ...] = ()

    @property
    def pending_actions(self) -> tuple[Mapping[str, Any], ...]:
        """tuple[Mapping[str, Any], ...]: Actions waiting for approval (``name`` and ``args``)."""
        return self._pending_actions

    def translate(self, update: Mapping[str, Any]) -> Iterator[DemoEvent]:
        """Converts one stream chunk into zero or more events.

        Args:
            update: Node name mapped to that node's state update.

        Yields:
            DemoEvent: Tool calls, tool results, commentary and the final answer.
        """
        for node, payload in update.items():
            if node == self.INTERRUPT_KEY:
                self._record_interrupts(payload)
            elif isinstance(payload, Mapping):
                yield from self._translate_messages(node, payload.get("messages", ()))

    def _translate_messages(self, node: str, messages: Iterable[BaseMessage]) -> Iterator[DemoEvent]:
        """Converts the messages one node added.

        Args:
            node: Name of the graph node that produced the messages.
            messages: The new messages.

        Yields:
            DemoEvent: One or more events per message.
        """
        for message in messages:
            if isinstance(message, ToolMessage):
                yield DemoEvent.tool_result(
                    message.tool_call_id, message.name or "tool", _message_text(message), message.status != "error"
                )
            elif isinstance(message, AIMessage) and node == self.MODEL_NODE:
                yield from self._translate_model_message(message)

    @staticmethod
    def _translate_model_message(message: AIMessage) -> Iterator[DemoEvent]:
        """Converts a model reply into tool requests or a final answer.

        Args:
            message: The model's reply.

        Yields:
            DemoEvent: Commentary and tool calls, or the final answer.
        """
        text = _message_text(message)
        if not message.tool_calls:
            yield DemoEvent.answer(text)
            return
        if text:
            yield DemoEvent.agent_message(text)
        for call in message.tool_calls:
            yield DemoEvent.tool_call(call["id"] or "", call["name"], call["args"])

    def _record_interrupts(self, interrupts: Iterable[Any]) -> None:
        """Stores the actions an approval interrupt is waiting on.

        Args:
            interrupts: LangGraph ``Interrupt`` objects.
        """
        actions = tuple(
            {"name": request.get("name", ""), "args": request.get("args", {})}
            for interrupt in interrupts
            for request in (getattr(interrupt, "value", None) or {}).get("action_requests", ())
        )
        self._pending_actions = (*self._pending_actions, *actions)
