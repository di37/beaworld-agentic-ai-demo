"""Level 1 — LLM: an answer without any live sensor readings."""

from __future__ import annotations

from types import MappingProxyType
from typing import Iterator, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.core.events import DemoEvent
from app.core.prompts import LEVEL1_SYSTEM_PROMPT
from app.levels.base import LevelRequest, LevelRunner


class ChatTurn(BaseModel):
    """One earlier message in the Level 1 conversation."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, frozen=True)

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class LlmLevelRequest(LevelRequest):
    """Request body for Level 1.

    Attributes:
        question: The new question.
        history: Earlier turns, so follow-up questions have context.
    """

    question: str = Field(min_length=1, max_length=1000)
    history: tuple[ChatTurn, ...] = Field(default=(), max_length=12)


class LlmLevel(LevelRunner[LlmLevelRequest]):
    """Level 1: the model answers only from what it learned in training."""

    number = 1
    request_model = LlmLevelRequest

    _ROLES = MappingProxyType({"user": "human", "assistant": "ai"})

    def run(self, request: LlmLevelRequest) -> Iterator[DemoEvent]:
        """Streams the model's answer to the question.

        Args:
            request: The question and earlier turns.

        Yields:
            DemoEvent: Answer tokens, then the full answer.
        """
        history = tuple((self._ROLES[turn.role], turn.content) for turn in request.history)
        yield from self.stream_chat([("system", LEVEL1_SYSTEM_PROMPT), *history, ("human", request.question)])
