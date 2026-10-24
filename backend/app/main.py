"""Builds the FastAPI application: the API plus the static frontend."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.rate_limit import RateLimiter
from app.api.responses import failure, validation_message
from app.api.routes import DemoApi
from app.api.static_files import FreshStaticFiles
from app.config import Settings
from app.levels.registry import LevelRegistry
from app.services.container import DemoServices


async def _on_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    """Returns request validation problems in the standard envelope.

    Args:
        _: The request (unused).
        exc: The validation error.

    Returns:
        JSONResponse: A 422 error envelope.
    """
    return failure(validation_message(exc), 422)


async def _on_http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Returns HTTP errors (404, 429, …) in the standard envelope.

    Args:
        _: The request (unused).
        exc: The HTTP error.

    Returns:
        JSONResponse: An error envelope with the same status code.
    """
    return failure(str(exc.detail), exc.status_code)


def create_app(settings: Settings | None = None) -> FastAPI:
    """Creates the demo application.

    Args:
        settings: Runtime settings. Read from the environment when omitted.

    Returns:
        FastAPI: The app, serving ``/api/*`` and the frontend at ``/``.
    """
    active = settings or Settings.from_env()
    services = DemoServices.build(active)
    registry = LevelRegistry.build(services)

    app = FastAPI(
        title="BEAWorld Agentic AI Demo",
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )
    app.add_exception_handler(RequestValidationError, _on_validation_error)
    app.add_exception_handler(StarletteHTTPException, _on_http_error)
    app.include_router(DemoApi(services, registry, RateLimiter(active.rate_limit_per_minute)).router())
    app.mount("/", FreshStaticFiles(directory=active.frontend_dir, html=True), name="frontend")
    return app
