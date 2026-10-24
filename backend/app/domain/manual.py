"""The fictional maintenance manual, loaded from text files."""

from __future__ import annotations

from dataclasses import asdict, dataclass, replace
from pathlib import Path
from typing import Any, Mapping

from app.core.errors import DemoError


@dataclass(frozen=True)
class ManualSection:
    """One section of the maintenance manual.

    Attributes:
        source: File name, used as the citation (for example ``01_air_filters.txt``).
        title: Human-friendly title derived from the file name.
        text: The section's content.
    """

    source: str
    title: str
    text: str

    def to_dict(self) -> dict[str, Any]:
        """Returns the section as a JSON-ready dictionary.

        Returns:
            dict[str, Any]: Source, title and text.
        """
        return asdict(self)


def _title_from_filename(filename: str) -> str:
    """Turns ``01_air_filters.txt`` into ``Air filters``.

    Args:
        filename: Manual file name.

    Returns:
        str: A readable title.
    """
    words = [part for part in Path(filename).stem.split("_") if not part.isdigit()]
    return " ".join(words).capitalize()


class ManualRepository:
    """Loads the manual sections once and serves them, optionally edited.

    Args:
        directory: Folder containing one ``.txt`` file per section.

    Raises:
        FileNotFoundError: If the folder has no ``.txt`` files.
    """

    def __init__(self, directory: Path) -> None:
        self._sections = self._load(directory)

    @staticmethod
    def _load(directory: Path) -> tuple[ManualSection, ...]:
        """Reads every section file in name order.

        Args:
            directory: Folder containing the section files.

        Returns:
            tuple[ManualSection, ...]: The sections.

        Raises:
            FileNotFoundError: If no section files exist.
        """
        paths = sorted(directory.glob("*.txt"))
        if not paths:
            raise FileNotFoundError(f"No manual sections found in {directory}")
        return tuple(
            ManualSection(path.name, _title_from_filename(path.name), path.read_text(encoding="utf-8").strip())
            for path in paths
        )

    @property
    def sections(self) -> tuple[ManualSection, ...]:
        """tuple[ManualSection, ...]: The manual as loaded from disk."""
        return self._sections

    def with_overrides(self, overrides: Mapping[str, str]) -> tuple[ManualSection, ...]:
        """Returns the manual with some sections' text replaced.

        Used by the Level 3 challenge, where the presenter edits a section on
        screen. The files on disk are never changed.

        Args:
            overrides: New text keyed by section source name.

        Returns:
            tuple[ManualSection, ...]: A new tuple of sections.

        Raises:
            DemoError: If an override names a section that doesn't exist.
        """
        known = {section.source for section in self._sections}
        unknown = sorted(set(overrides) - known)
        if unknown:
            raise DemoError(f"Unknown manual section: {', '.join(unknown)}")
        return tuple(
            replace(section, text=overrides[section.source].strip()) if section.source in overrides else section
            for section in self._sections
        )
