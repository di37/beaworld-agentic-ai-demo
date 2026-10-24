"""Level 3 — RAG: search the manual first, then answer from that evidence."""

from __future__ import annotations

from typing import Annotated, Iterator

from pydantic import Field, StringConstraints

from app.core.events import DemoEvent
from app.core.prompts import RAG_SYSTEM_PROMPT, rag_user_prompt
from app.levels.base import LevelRequest, LevelRunner

SectionName = Annotated[str, StringConstraints(min_length=1, max_length=100)]
SectionText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


class RagLevelRequest(LevelRequest):
    """Request body for Level 3.

    Attributes:
        question: What to ask about the AHU.
        manual_overrides: Edited section text keyed by file name (audience challenge).
    """

    question: str = Field(min_length=3, max_length=500)
    manual_overrides: dict[SectionName, SectionText] = Field(default_factory=dict, max_length=10)


class RagLevel(LevelRunner[RagLevelRequest]):
    """Level 3: a fixed two-step workflow — retrieve passages, then generate."""

    number = 3
    request_model = RagLevelRequest

    def run(self, request: RagLevelRequest) -> Iterator[DemoEvent]:
        """Searches the manual, shows the scores, then streams a cited answer.

        Args:
            request: The question and any edited manual sections.

        Yields:
            DemoEvent: Status notes, the retrieval scores, answer tokens and the answer.
        """
        sections = self._services.manual.with_overrides(request.manual_overrides)
        yield DemoEvent.status("Searching the manual for the most relevant passages…")
        result = self._services.retriever.search(request.question, sections)
        yield DemoEvent.retrieval(result.to_dict())
        yield DemoEvent.status("Asking the model to answer using only those passages…")
        yield from self.stream_chat(
            [("system", RAG_SYSTEM_PROMPT), ("human", rag_user_prompt(result.as_context(), request.question))]
        )
