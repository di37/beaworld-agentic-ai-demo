"""Searches the maintenance manual by meaning, using embeddings (RAG step 1)."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from threading import Lock
from typing import Any, Mapping, Sequence

from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore

from app.core.errors import DemoError
from app.core.model_provider import ModelProvider
from app.domain.manual import ManualSection


@dataclass(frozen=True)
class RetrievalHit:
    """How well one manual section matches the question.

    Attributes:
        section: The manual section.
        score: Cosine similarity between question and section (higher is closer).
        retrieved: Whether the section was passed to the model.
    """

    section: ManualSection
    score: float
    retrieved: bool

    def to_dict(self) -> dict[str, Any]:
        """Returns the hit as a JSON-ready dictionary.

        Returns:
            dict[str, Any]: Source, title, score and retrieved flag.
        """
        return {
            "source": self.section.source,
            "title": self.section.title,
            "score": round(self.score, 4),
            "retrieved": self.retrieved,
        }


@dataclass(frozen=True)
class RetrievalResult:
    """Every section ranked against one question.

    Attributes:
        question: The question that was searched.
        hits: All sections, best match first.
    """

    question: str
    hits: tuple[RetrievalHit, ...]

    @property
    def retrieved_sections(self) -> tuple[ManualSection, ...]:
        """tuple[ManualSection, ...]: Sections selected for the model."""
        return tuple(hit.section for hit in self.hits if hit.retrieved)

    def as_context(self) -> str:
        """Formats the retrieved sections as evidence for the model.

        Returns:
            str: Each passage prefixed with ``Source: <file>``.
        """
        return "\n\n".join(f"Source: {section.source}\n{section.text}" for section in self.retrieved_sections)

    def to_dict(self) -> dict[str, Any]:
        """Returns the result as a JSON-ready dictionary.

        Returns:
            dict[str, Any]: The question and the ranked sections.
        """
        return {"question": self.question, "documents": [hit.to_dict() for hit in self.hits]}


class ManualRetriever:
    """Ranks manual sections against a question with an in-memory vector store.

    One store is kept per version of the manual, so unchanged sections are
    embedded only once even when the presenter edits a section on screen.

    Args:
        models: Supplies the embedding model.
        top_k: Number of sections passed on to the model.
        max_cached_versions: Number of manual versions to keep embedded.
    """

    def __init__(self, models: ModelProvider, top_k: int = 2, max_cached_versions: int = 8) -> None:
        self._models = models
        self._top_k = top_k
        self._max_cached_versions = max_cached_versions
        self._stores: Mapping[str, InMemoryVectorStore] = {}
        self._lock = Lock()

    def search(self, question: str, sections: Sequence[ManualSection]) -> RetrievalResult:
        """Scores every section against the question.

        Args:
            question: What the engineer wants to know.
            sections: The manual sections to search.

        Returns:
            RetrievalResult: All sections ranked, with the top ``top_k`` marked retrieved.

        Raises:
            DemoError: If the question is blank or there is nothing to search.
        """
        if not question.strip():
            raise DemoError("Please enter a question to search the manual.")
        if not sections:
            raise DemoError("The manual is empty, so there is nothing to search.")
        store = self._store_for(tuple(sections))
        by_source = {section.source: section for section in sections}
        scored = store.similarity_search_with_score(question, k=len(sections))
        ranked = sorted(scored, key=lambda pair: pair[1], reverse=True)
        hits = tuple(
            RetrievalHit(by_source[document.metadata["source"]], float(score), rank < self._top_k)
            for rank, (document, score) in enumerate(ranked)
        )
        return RetrievalResult(question, hits)

    def _store_for(self, sections: tuple[ManualSection, ...]) -> InMemoryVectorStore:
        """Returns a vector store for this manual version, embedding it if new.

        Args:
            sections: The manual version to index.

        Returns:
            InMemoryVectorStore: A store holding one document per section.
        """
        key = self._version_key(sections)
        with self._lock:
            cached = self._stores.get(key)
        if cached is not None:
            return cached
        store = InMemoryVectorStore(self._models.embeddings)
        store.add_documents([Document(page_content=s.text, metadata={"source": s.source}) for s in sections])
        with self._lock:
            newest = list({**self._stores, key: store}.items())[-self._max_cached_versions :]
            self._stores = dict(newest)
        return store

    @staticmethod
    def _version_key(sections: tuple[ManualSection, ...]) -> str:
        """Fingerprints a manual version.

        Args:
            sections: The manual sections.

        Returns:
            str: A SHA-256 hex digest of every source and text.
        """
        digest = hashlib.sha256()
        for section in sections:
            digest.update(section.source.encode("utf-8") + b"\0" + section.text.encode("utf-8") + b"\0")
        return digest.hexdigest()
