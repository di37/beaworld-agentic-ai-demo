"""Finds the runner for each level number."""

from __future__ import annotations

from types import MappingProxyType
from typing import Iterable

from app.levels.base import LevelRunner
from app.levels.level1_llm import LlmLevel
from app.levels.level2_tool import ToolLevel
from app.levels.level3_rag import RagLevel
from app.levels.level4_agent import AgentLevel
from app.levels.level5_agentic_app import AgenticAppLevel
from app.services.container import DemoServices


class LevelRegistry:
    """Holds one runner per workshop level.

    Args:
        runners: The level runners; their ``number`` attributes must be unique.
    """

    LEVEL_TYPES: tuple[type[LevelRunner], ...] = (LlmLevel, ToolLevel, RagLevel, AgentLevel, AgenticAppLevel)

    def __init__(self, runners: Iterable[LevelRunner]) -> None:
        self._runners = MappingProxyType({runner.number: runner for runner in runners})

    @classmethod
    def build(cls, services: DemoServices) -> LevelRegistry:
        """Creates every level runner.

        Args:
            services: Shared services passed to each runner.

        Returns:
            LevelRegistry: The registry.
        """
        return cls(level_type(services) for level_type in cls.LEVEL_TYPES)

    def find(self, number: int) -> LevelRunner | None:
        """Looks up a level.

        Args:
            number: Level number (1-5).

        Returns:
            LevelRunner | None: The runner, or ``None`` if there is no such level.
        """
        return self._runners.get(number)

    @property
    def agentic_app(self) -> AgenticAppLevel:
        """AgenticAppLevel: The Level 5 runner, which also handles approval decisions."""
        runner = self._runners[AgenticAppLevel.number]
        if not isinstance(runner, AgenticAppLevel):
            raise TypeError("Level 5 must be an AgenticAppLevel")
        return runner
