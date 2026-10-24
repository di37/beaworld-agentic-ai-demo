"""Application settings loaded from ``backend/.env`` and the environment."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent

DEFAULT_CHAT_MODEL = "gpt-5.6-luna"
DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_TIMEOUT_SECONDS = 60.0
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8791
DEFAULT_RATE_LIMIT_PER_MINUTE = 30


class ConfigError(ValueError):
    """Raised when an environment variable holds an invalid value."""


def _env_text(name: str) -> str | None:
    """Reads an environment variable, treating blank values as missing.

    Args:
        name: Variable name.

    Returns:
        str | None: The stripped value, or ``None`` if unset or blank.
    """
    value = os.getenv(name, "").strip()
    return value or None


def _env_flag(name: str, default: bool) -> bool:
    """Reads a true/false switch from the environment.

    Args:
        name: Variable name.
        default: Value used when the variable is unset.

    Returns:
        bool: The parsed switch.

    Raises:
        ConfigError: If the value is not one of 1/0, true/false, yes/no, on/off.
    """
    raw = _env_text(name)
    if raw is None:
        return default
    lowered = raw.lower()
    if lowered in {"1", "true", "yes", "on"}:
        return True
    if lowered in {"0", "false", "no", "off"}:
        return False
    raise ConfigError(f"{name} must be true or false, got {raw!r}")


def _env_number(name: str, default: float, cast: type[int] | type[float]) -> int | float:
    """Reads a positive number from the environment.

    Args:
        name: Variable name.
        default: Value used when the variable is unset.
        cast: ``int`` or ``float``.

    Returns:
        int | float: The parsed number.

    Raises:
        ConfigError: If the value is not a positive number.
    """
    raw = _env_text(name)
    if raw is None:
        return cast(default)
    try:
        value = cast(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} must be a number, got {raw!r}") from exc
    if value <= 0:
        raise ConfigError(f"{name} must be greater than zero, got {raw!r}")
    return value


@dataclass(frozen=True)
class Settings:
    """Runtime settings for the demo backend.

    Attributes:
        openai_api_key: Key for OpenAI calls, or ``None`` when not configured.
        openai_base_url: Optional OpenAI-compatible endpoint, such as a local server.
        use_responses_api: Call OpenAI's Responses API instead of Chat Completions.
            Newer reasoning models (such as gpt-5.6-luna) need it for tool calling.
        chat_model: Chat model used by every level.
        embedding_model: Embedding model used to search the manual.
        request_timeout_s: Timeout for each model request, in seconds.
        host: Network interface the web server binds to.
        port: Port the web server listens on.
        rate_limit_per_minute: Maximum demo runs per client per minute.
        frontend_dir: Folder holding the static frontend.
        manual_dir: Folder holding the fictional manual sections.
    """

    openai_api_key: str | None
    openai_base_url: str | None
    use_responses_api: bool
    chat_model: str
    embedding_model: str
    request_timeout_s: float
    host: str
    port: int
    rate_limit_per_minute: int
    frontend_dir: Path
    manual_dir: Path

    @property
    def model_configured(self) -> bool:
        """bool: Whether the model service can be called (key or custom server set)."""
        return bool(self.openai_api_key or self.openai_base_url)

    @classmethod
    def from_env(cls, env_file: Path | None = None) -> Settings:
        """Builds settings from a ``.env`` file and the process environment.

        Variables already set in the environment take precedence over the file.

        Args:
            env_file: Path to a ``.env`` file. Defaults to ``backend/.env``.

        Returns:
            Settings: The validated settings.

        Raises:
            ConfigError: If a numeric variable is invalid.
        """
        load_dotenv(env_file or BACKEND_DIR / ".env", override=False)
        base_url = _env_text("OPENAI_BASE_URL")
        return cls(
            openai_api_key=_env_text("OPENAI_API_KEY"),
            openai_base_url=base_url,
            # Local OpenAI-compatible servers often lack the Responses API, so default it off for them.
            use_responses_api=_env_flag("BEA_USE_RESPONSES_API", default=base_url is None),
            chat_model=_env_text("BEA_MODEL") or DEFAULT_CHAT_MODEL,
            embedding_model=_env_text("BEA_EMBEDDING_MODEL") or DEFAULT_EMBEDDING_MODEL,
            request_timeout_s=_env_number("BEA_REQUEST_TIMEOUT", DEFAULT_TIMEOUT_SECONDS, float),
            host=_env_text("BEA_HOST") or DEFAULT_HOST,
            # BEA_PORT wins; PORT is honoured for hosting tools that assign one.
            port=_env_number("BEA_PORT", _env_number("PORT", DEFAULT_PORT, int), int),
            rate_limit_per_minute=_env_number(
                "BEA_RATE_LIMIT_PER_MINUTE", DEFAULT_RATE_LIMIT_PER_MINUTE, int
            ),
            frontend_dir=PROJECT_DIR / "frontend",
            manual_dir=Path(__file__).resolve().parent / "data" / "manual",
        )
