"""A pretend ticketing system. It never contacts a real service."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from threading import Lock
from typing import Any


class Priority(str, Enum):
    """Allowed ticket priorities."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass(frozen=True)
class Ticket:
    """A simulated maintenance ticket.

    Attributes:
        ticket_id: Identifier such as ``SIM-1001``.
        equipment_id: Equipment the ticket is about.
        priority: Ticket priority.
        summary: Evidence and requested inspection.
        created_at: ISO 8601 creation time in UTC.
    """

    ticket_id: str
    equipment_id: str
    priority: Priority
    summary: str
    created_at: str

    def describe(self) -> str:
        """Formats the ticket as tool output text.

        Returns:
            str: A one-line confirmation that makes clear it is simulated.
        """
        return (
            f"SIMULATED ticket {self.ticket_id} created for {self.equipment_id} "
            f"(priority: {self.priority.value}): {self.summary}"
        )

    def to_dict(self) -> dict[str, Any]:
        """Returns the ticket as a JSON-ready dictionary.

        Returns:
            dict[str, Any]: The ticket fields.
        """
        return {
            "ticket_id": self.ticket_id,
            "equipment_id": self.equipment_id,
            "priority": self.priority.value,
            "summary": self.summary,
            "created_at": self.created_at,
        }


class TicketDesk:
    """Stores simulated tickets in memory for the life of the server."""

    FIRST_NUMBER = 1001

    def __init__(self) -> None:
        self._tickets: tuple[Ticket, ...] = ()
        self._lock = Lock()

    @property
    def count(self) -> int:
        """int: Number of tickets created so far."""
        return len(self._tickets)

    def create(self, equipment_id: str, priority: Priority, summary: str) -> Ticket:
        """Creates a simulated ticket.

        Args:
            equipment_id: Equipment the ticket is about.
            priority: Ticket priority.
            summary: Evidence and requested inspection.

        Returns:
            Ticket: The new ticket.
        """
        with self._lock:
            ticket = Ticket(
                ticket_id=f"SIM-{self.FIRST_NUMBER + len(self._tickets)}",
                equipment_id=equipment_id,
                priority=priority,
                summary=summary.strip(),
                created_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
            )
            self._tickets = (*self._tickets, ticket)
        return ticket

    def created_since(self, count: int) -> tuple[Ticket, ...]:
        """Returns tickets created after the desk held ``count`` tickets.

        Args:
            count: Value of :attr:`count` taken earlier.

        Returns:
            tuple[Ticket, ...]: The newer tickets, oldest first.
        """
        return self._tickets[count:]
