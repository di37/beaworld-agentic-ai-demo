"""Serves the frontend so browsers always pick up edited files."""

from __future__ import annotations

from typing import Any

from fastapi.staticfiles import StaticFiles
from starlette.responses import Response


class FreshStaticFiles(StaticFiles):
    """Static files that browsers must revalidate on every load.

    Without this, a browser can keep running a stale copy of a JavaScript
    module after the file changes. Unchanged files still come back as a
    cheap ``304 Not Modified``.
    """

    def file_response(self, *args: Any, **kwargs: Any) -> Response:
        """Adds ``Cache-Control: no-cache`` to every file response.

        Args:
            *args: Passed to :meth:`StaticFiles.file_response`.
            **kwargs: Passed to :meth:`StaticFiles.file_response`.

        Returns:
            Response: The file response with the cache header set.
        """
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "no-cache"
        return response
