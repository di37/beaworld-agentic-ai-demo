"""Response helpers: a consistent JSON envelope and an NDJSON event stream."""

from __future__ import annotations

from typing import Any, Iterable

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import ValidationError

from app.core.events import DemoEvent


def success(data: Any, status_code: int = 200) -> JSONResponse:
    """Wraps data in the standard envelope.

    Args:
        data: The response payload.
        status_code: HTTP status code.

    Returns:
        JSONResponse: ``{"success": true, "data": ..., "error": null}``.
    """
    return JSONResponse({"success": True, "data": data, "error": None}, status_code=status_code)


def failure(message: str, status_code: int) -> JSONResponse:
    """Wraps an error message in the standard envelope.

    Args:
        message: Friendly error message.
        status_code: HTTP status code.

    Returns:
        JSONResponse: ``{"success": false, "data": null, "error": ...}``.
    """
    return JSONResponse({"success": False, "data": None, "error": message}, status_code=status_code)


def validation_message(exc: ValidationError | RequestValidationError) -> str:
    """Summarises the first validation problem in plain words.

    Args:
        exc: The validation error.

    Returns:
        str: For example ``"question: String should have at least 3 characters"``.
    """
    errors = exc.errors()
    if not errors:
        return "The request was not valid."
    first = errors[0]
    field = ".".join(str(part) for part in first.get("loc", ()) if part != "body")
    message = str(first.get("msg", "Invalid value"))
    return f"{field}: {message}" if field else message


class EventStreamResponse(StreamingResponse):
    """Streams demo events to the browser as newline-delimited JSON.

    Args:
        events: The events to send, in order.
    """

    def __init__(self, events: Iterable[DemoEvent]) -> None:
        super().__init__(
            (event.to_json_line() for event in events),
            media_type="application/x-ndjson",
            headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
        )
