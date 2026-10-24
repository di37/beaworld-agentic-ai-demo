"""Tracks Level 5 investigations that are paused for an engineer's decision."""

from __future__ import annotations

from threading import Lock
from typing import Any, Mapping

from app.core.errors import DemoError


class ApprovalBook:
    """Records which investigations wait for a decision and which already had one.

    A decision can be made only once per investigation, so a second click (or
    a stale browser tab) cannot approve the same action twice.

    Args:
        max_threads: How many investigations to remember before forgetting the oldest.
    """

    EXPIRED_MESSAGE = "This approval request has expired or was already answered. Please start a new investigation."

    def __init__(self, max_threads: int = 200) -> None:
        self._max_threads = max_threads
        self._pending: Mapping[str, Mapping[str, Any]] = {}
        self._decided: tuple[str, ...] = ()
        self._lock = Lock()

    def open(self, thread_id: str, action: Mapping[str, Any]) -> None:
        """Marks an investigation as paused on an action.

        Args:
            thread_id: The paused investigation.
            action: The action waiting for approval.
        """
        with self._lock:
            newest = list({**self._pending, thread_id: action}.items())[-self._max_threads :]
            self._pending = dict(newest)

    def close(self, thread_id: str) -> Mapping[str, Any]:
        """Takes the pending action so a decision can be applied to it.

        Args:
            thread_id: The paused investigation.

        Returns:
            Mapping[str, Any]: The action that was waiting.

        Raises:
            DemoError: If nothing is waiting for this investigation.
        """
        with self._lock:
            if thread_id not in self._pending:
                raise DemoError(self.EXPIRED_MESSAGE)
            action = self._pending[thread_id]
            self._pending = {key: value for key, value in self._pending.items() if key != thread_id}
            self._decided = (*self._decided, thread_id)[-self._max_threads :]
        return action

    def was_decided(self, thread_id: str) -> bool:
        """Checks whether an engineer already decided on this investigation.

        Args:
            thread_id: The investigation.

        Returns:
            bool: ``True`` if a decision was already made.
        """
        return thread_id in self._decided
