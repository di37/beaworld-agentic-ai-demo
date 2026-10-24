"""Creates the LangChain models every level shares."""

from __future__ import annotations

from functools import cached_property

from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.config import Settings
from app.core.errors import DemoError

# OpenAI-compatible local servers often ignore the key but the client requires one.
_PLACEHOLDER_KEY = "not-needed"


class ModelProvider:
    """Builds the chat and embedding models once and reuses them.

    Args:
        settings: Model names, credentials and timeouts.
    """

    MISSING_KEY_MESSAGE = (
        "No OpenAI API key is configured. Add OPENAI_API_KEY to backend/.env, then restart the demo."
    )

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @property
    def is_configured(self) -> bool:
        """bool: Whether a key or custom model server has been configured."""
        return self._settings.model_configured

    def require_configured(self) -> None:
        """Stops a level early when no model service is configured.

        Raises:
            DemoError: If neither an API key nor a custom server is set.
        """
        if not self.is_configured:
            raise DemoError(self.MISSING_KEY_MESSAGE)

    @cached_property
    def chat(self) -> ChatOpenAI:
        """ChatOpenAI: The chat model.

        Temperature 0 keeps demos repeatable; LangChain drops it for reasoning
        models that only accept their default.
        """
        self.require_configured()
        return ChatOpenAI(
            model=self._settings.chat_model,
            temperature=0,
            api_key=self._api_key,
            base_url=self._settings.openai_base_url,
            use_responses_api=self._settings.use_responses_api,
            timeout=self._settings.request_timeout_s,
            max_retries=1,
        )

    @cached_property
    def embeddings(self) -> OpenAIEmbeddings:
        """OpenAIEmbeddings: The embedding model used to search the manual."""
        self.require_configured()
        return OpenAIEmbeddings(
            model=self._settings.embedding_model,
            api_key=self._api_key,
            base_url=self._settings.openai_base_url,
            timeout=self._settings.request_timeout_s,
            max_retries=1,
        )

    @property
    def _api_key(self) -> str:
        """str: The configured key, or a placeholder for keyless local servers."""
        return self._settings.openai_api_key or _PLACEHOLDER_KEY
