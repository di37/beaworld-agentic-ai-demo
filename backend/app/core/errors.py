"""Turns failures into short messages that are safe to show the audience."""

from __future__ import annotations

import openai


class DemoError(Exception):
    """An error whose message is already friendly enough to show on screen."""


GENERIC_MESSAGE = "Something went wrong. Check the backend terminal for details."

# Order matters: APITimeoutError is a subclass of APIConnectionError.
_FRIENDLY_MESSAGES: tuple[tuple[type[BaseException], str], ...] = (
    (
        openai.AuthenticationError,
        "The OpenAI API key was rejected. Check OPENAI_API_KEY in backend/.env, then restart the demo.",
    ),
    (openai.PermissionDeniedError, "This API key isn't allowed to use the selected model."),
    (openai.RateLimitError, "The OpenAI rate limit or quota was reached. Wait a moment and try again."),
    (openai.NotFoundError, "The model wasn't found. Check BEA_MODEL in backend/.env."),
    (openai.APITimeoutError, "The model took too long to respond. Please try again."),
    (openai.APIConnectionError, "Couldn't reach the model service. Check the internet connection."),
    (openai.BadRequestError, "The model service rejected the request. Check the backend terminal for details."),
)


def describe_error(exc: BaseException) -> str:
    """Maps an exception to a message for the audience.

    Details stay in the server log; the browser only sees this summary.

    Args:
        exc: The exception that stopped a level run.

    Returns:
        str: A short, plain-English explanation.
    """
    if isinstance(exc, DemoError):
        return str(exc)
    for error_type, message in _FRIENDLY_MESSAGES:
        if isinstance(exc, error_type):
            return message
    return GENERIC_MESSAGE
