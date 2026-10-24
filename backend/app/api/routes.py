"""HTTP endpoints used by the frontend."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse, Response
from pydantic import ValidationError

from app.api.rate_limit import RateLimiter
from app.api.responses import EventStreamResponse, failure, success, validation_message
from app.core.prompts import (
    AGENT_TASK,
    AGENTIC_APP_TASK,
    LEVEL1_QUESTION,
    LEVEL1_SUGGESTIONS,
    LEVEL3_QUESTION,
)
from app.domain.equipment import EquipmentRepository
from app.levels.level5_agentic_app import DecisionRequest
from app.levels.registry import LevelRegistry
from app.services.container import DemoServices


class DemoApi:
    """The demo's HTTP API.

    Endpoints:
        ``GET /api/meta``: model status, default questions and the manual text.
        ``POST /api/levels/{number}/run``: runs a level and streams its events.
        ``POST /api/levels/5/decision``: approves or rejects a paused ticket.

    Args:
        services: Shared services.
        registry: Level runners.
        limiter: Rate limit applied to every run.
    """

    def __init__(self, services: DemoServices, registry: LevelRegistry, limiter: RateLimiter) -> None:
        self._services = services
        self._registry = registry
        self._limiter = limiter

    def router(self) -> APIRouter:
        """Builds the router with every endpoint registered.

        Returns:
            APIRouter: Routes under ``/api``.
        """
        router = APIRouter(prefix="/api")
        limited = [Depends(self._limiter)]
        router.add_api_route("/meta", self.meta, methods=["GET"])
        router.add_api_route("/levels/{number}/run", self.run_level, methods=["POST"], dependencies=limited)
        router.add_api_route("/levels/5/decision", self.decide, methods=["POST"], dependencies=limited)
        return router

    def meta(self) -> JSONResponse:
        """Describes the demo configuration for the frontend.

        Returns:
            JSONResponse: Model status, defaults, equipment IDs and the manual.
        """
        settings = self._services.settings
        return success(
            {
                "model": settings.chat_model,
                "embedding_model": settings.embedding_model,
                "model_configured": self._services.models.is_configured,
                "equipment_ids": list(EquipmentRepository.DEMO_IDS),
                "defaults": {
                    "level1_question": LEVEL1_QUESTION,
                    "level1_suggestions": list(LEVEL1_SUGGESTIONS),
                    "level3_question": LEVEL3_QUESTION,
                    "level4_task": AGENT_TASK,
                    "level5_task": AGENTIC_APP_TASK,
                },
                "manual": [section.to_dict() for section in self._services.manual.sections],
            }
        )

    def run_level(self, number: int, payload: dict[str, Any] | None = Body(default=None)) -> Response:
        """Runs one level and streams its events.

        Args:
            number: Level number (1-5).
            payload: Level-specific request body.

        Returns:
            Response: An NDJSON event stream, or a JSON error envelope.
        """
        runner = self._registry.find(number)
        if runner is None:
            return failure(f"There is no level {number}.", 404)
        try:
            request = runner.parse(payload or {})
        except ValidationError as exc:
            return failure(validation_message(exc), 422)
        return EventStreamResponse(runner.stream(request))

    def decide(self, request: DecisionRequest) -> Response:
        """Applies an engineer's approval decision in Level 5.

        Args:
            request: The paused investigation and the decision.

        Returns:
            Response: An NDJSON stream of the rest of the investigation.
        """
        return EventStreamResponse(self._registry.agentic_app.decide(request))
