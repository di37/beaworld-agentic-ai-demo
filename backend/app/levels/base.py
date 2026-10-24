"""Shared behaviour for every workshop level."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any, Callable, ClassVar, Generic, Iterator, Mapping, Sequence, TypeVar, cast

from pydantic import BaseModel, ConfigDict

from app.core.errors import describe_error
from app.core.events import DemoEvent
from app.services.container import DemoServices

logger = logging.getLogger(__name__)


class LevelRequest(BaseModel):
    """Base class for level request bodies. Unknown fields are rejected."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, frozen=True)


RequestT = TypeVar("RequestT", bound=LevelRequest)


class LevelRunner(ABC, Generic[RequestT]):
    """One workshop level that streams its progress as demo events.

    Subclasses implement :meth:`run`. :meth:`stream` wraps it with the shared
    checks and error handling, and always finishes with a ``done`` event.

    Attributes:
        number: Level number in the workshop (1-5).
        request_model: Validates the request body.
        uses_model: Whether the level calls the language model.

    Args:
        services: Shared services (models, data, tools).
    """

    number: ClassVar[int]
    request_model: ClassVar[type[LevelRequest]] = LevelRequest
    uses_model: ClassVar[bool] = True

    def __init__(self, services: DemoServices) -> None:
        self._services = services

    def parse(self, payload: Mapping[str, Any]) -> RequestT:
        """Validates a raw request body.

        Args:
            payload: The decoded JSON body.

        Returns:
            RequestT: The validated request.

        Raises:
            pydantic.ValidationError: If the body is invalid.
        """
        return cast(RequestT, self.request_model.model_validate(payload))

    def stream(self, request: RequestT) -> Iterator[DemoEvent]:
        """Runs the level and streams its events.

        Args:
            request: The validated request.

        Returns:
            Iterator[DemoEvent]: The level's events, ending with ``done``.
        """
        return self.guarded(lambda: self.run(request))

    def guarded(self, produce: Callable[[], Iterator[DemoEvent]]) -> Iterator[DemoEvent]:
        """Runs an event producer, turning any failure into an on-screen error.

        Args:
            produce: Creates the events to stream.

        Yields:
            DemoEvent: The producer's events, an ``error`` event if it failed,
            and finally ``done``.
        """
        try:
            if self.uses_model:
                self._services.models.require_configured()
            yield from produce()
        except Exception as exc:  # noqa: BLE001 - every failure must reach the screen
            logger.exception("Level %s run failed", self.number)
            yield DemoEvent.error(describe_error(exc))
        yield DemoEvent.done()

    @abstractmethod
    def run(self, request: RequestT) -> Iterator[DemoEvent]:
        """Produces the level's events.

        Args:
            request: The validated request.

        Yields:
            DemoEvent: Progress, results and the answer.
        """

    def stream_chat(self, messages: Sequence[Any]) -> Iterator[DemoEvent]:
        """Streams a chat reply word by word, then the complete answer.

        Args:
            messages: Messages for the chat model, as ``(role, text)`` pairs.

        Yields:
            DemoEvent: ``token`` events, then one ``answer`` event.
        """
        answer = ""
        for chunk in self._services.models.chat.stream(messages):
            text = str(chunk.text)
            if text:
                answer += text
                yield DemoEvent.token(text)
        yield DemoEvent.answer(answer.strip())
