"""Starts the demo and opens it in the default browser.

Run from the ``backend`` folder::

    python -m app
"""

from __future__ import annotations

import logging
import os
import threading
import webbrowser

import uvicorn

from app.config import Settings
from app.main import create_app

logger = logging.getLogger("app")

BROWSER_DELAY_SECONDS = 1.5


def main() -> None:
    """Starts the web server and, unless disabled, opens the demo page."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    settings = Settings.from_env()
    url = f"http://{settings.host}:{settings.port}"
    if not settings.model_configured:
        logger.warning("OPENAI_API_KEY is not set. Only Level 2 will work until you add it to backend/.env.")
    if os.getenv("BEA_OPEN_BROWSER", "1") != "0":
        threading.Timer(BROWSER_DELAY_SECONDS, webbrowser.open, args=(url,)).start()
    logger.info("BEAWorld demo running at %s (press Ctrl+C to stop)", url)
    uvicorn.run(create_app(settings), host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()
