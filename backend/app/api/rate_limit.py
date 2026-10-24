"""A small per-client rate limit that protects the API budget."""

from __future__ import annotations

import time
from threading import Lock
from typing import Callable, Mapping

from fastapi import HTTPException, Request


class RateLimiter:
    """Allows at most ``max_requests`` runs per client in a sliding window.

    Use an instance as a FastAPI dependency.

    Args:
        max_requests: Runs allowed per window.
        window_s: Window length in seconds.
        clock: Returns the current time in seconds (replaceable for testing).
    """

    MESSAGE = "Too many demo runs in a short time. Please wait a minute and try again."

    def __init__(self, max_requests: int, window_s: float = 60.0, clock: Callable[[], float] = time.monotonic) -> None:
        self._max_requests = max_requests
        self._window_s = window_s
        self._clock = clock
        self._hits: Mapping[str, tuple[float, ...]] = {}
        self._lock = Lock()

    def allow(self, client_id: str) -> bool:
        """Records a run for the client if it is within the limit.

        Args:
            client_id: Identifier for the caller, such as its IP address.

        Returns:
            bool: ``True`` if the run may go ahead.
        """
        now = self._clock()
        with self._lock:
            recent = tuple(hit for hit in self._hits.get(client_id, ()) if now - hit < self._window_s)
            allowed = len(recent) < self._max_requests
            self._hits = {**self._hits, client_id: (*recent, now) if allowed else recent}
        return allowed

    async def __call__(self, request: Request) -> None:
        """FastAPI dependency that rejects callers over the limit.

        Args:
            request: The incoming request.

        Raises:
            HTTPException: 429 when the caller is over the limit.
        """
        client_id = request.client.host if request.client else "unknown"
        if not self.allow(client_id):
            raise HTTPException(status_code=429, detail=self.MESSAGE)
