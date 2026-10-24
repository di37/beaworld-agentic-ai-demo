"""Fictional Air Handling Unit readings and service records.

Every value here is invented for teaching. Nothing connects to real equipment.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum
from types import MappingProxyType
from typing import Any, Mapping


class HistoryScenario(str, Enum):
    """Which version of the fictional service record to return.

    ``FILTER_RECENT`` is the Level 4 audience challenge: the filter was just
    replaced, so the agent has to look for a different explanation.
    """

    STANDARD = "standard"
    FILTER_RECENT = "filter_recent"


@dataclass(frozen=True)
class AhuReadings:
    """Simulated live readings for one Air Handling Unit.

    Attributes:
        room_temperature_c: Room temperature in degrees Celsius.
        setpoint_c: Target room temperature in degrees Celsius.
        supply_airflow: Qualitative supply airflow (``LOW``, ``NORMAL`` or ``HIGH``).
        filter_pressure_drop: Qualitative pressure drop across the filter.
    """

    room_temperature_c: float
    setpoint_c: float
    supply_airflow: str
    filter_pressure_drop: str

    def describe(self, equipment_id: str) -> str:
        """Formats the readings as the text a tool hands to the model.

        Args:
            equipment_id: Equipment the readings belong to.

        Returns:
            str: A one-line, clearly fictional summary.
        """
        return (
            f"FICTIONAL {equipment_id} data: room temperature = {self.room_temperature_c:g} C; "
            f"setpoint = {self.setpoint_c:g} C; supply airflow = {self.supply_airflow}; "
            f"filter differential pressure = {self.filter_pressure_drop}."
        )

    def to_dict(self) -> dict[str, Any]:
        """Returns the readings as a JSON-ready dictionary.

        Returns:
            dict[str, Any]: Field names mapped to values.
        """
        return asdict(self)


@dataclass(frozen=True)
class ServiceRecord:
    """One line of an equipment maintenance log.

    Attributes:
        task: What was serviced.
        last_done: When it was last done, in plain words.
        status: ``OK`` or ``OVERDUE``.
    """

    task: str
    last_done: str
    status: str

    def describe(self) -> str:
        """Formats the record for the model.

        Returns:
            str: For example ``"Air filter replacement: 7 months ago (OVERDUE)"``.
        """
        return f"{self.task}: {self.last_done} ({self.status})"


_SENSOR_CALIBRATION = ServiceRecord("Room temperature sensor calibration", "4 months ago", "OK")
_COIL_CLEANING = ServiceRecord("Cooling coil cleaning", "5 months ago", "OK")

_READINGS: Mapping[str, AhuReadings] = MappingProxyType(
    {"AHU-01": AhuReadings(room_temperature_c=28, setpoint_c=22, supply_airflow="LOW", filter_pressure_drop="HIGH")}
)

_HISTORIES: Mapping[str, Mapping[HistoryScenario, tuple[ServiceRecord, ...]]] = MappingProxyType(
    {
        "AHU-01": MappingProxyType(
            {
                HistoryScenario.STANDARD: (
                    ServiceRecord("Air filter replacement", "7 months ago, due every 3 months", "OVERDUE"),
                    ServiceRecord("Supply fan belt inspection", "2 months ago", "OK"),
                    _COIL_CLEANING,
                    _SENSOR_CALIBRATION,
                ),
                HistoryScenario.FILTER_RECENT: (
                    ServiceRecord("Air filter replacement", "1 week ago", "OK"),
                    ServiceRecord("Supply fan belt inspection", "9 months ago, due every 6 months", "OVERDUE"),
                    _COIL_CLEANING,
                    _SENSOR_CALIBRATION,
                ),
            }
        )
    }
)


class EquipmentRepository:
    """Read-only access to the fictional equipment records.

    Args:
        readings: Simulated readings keyed by equipment ID.
        histories: Service records keyed by equipment ID, then scenario.
    """

    NO_READINGS = "No simulated readings available for that equipment ID."
    NO_HISTORY = "No maintenance history available for that equipment ID."
    # AHU-02 is deliberately unknown: the Level 2 challenge shows a tool can't invent data.
    DEMO_IDS: tuple[str, ...] = ("AHU-01", "AHU-02")

    def __init__(
        self,
        readings: Mapping[str, AhuReadings] = _READINGS,
        histories: Mapping[str, Mapping[HistoryScenario, tuple[ServiceRecord, ...]]] = _HISTORIES,
    ) -> None:
        self._readings = readings
        self._histories = histories

    def find_readings(self, equipment_id: str) -> AhuReadings | None:
        """Looks up the simulated readings for one unit.

        Args:
            equipment_id: Equipment identifier, for example ``AHU-01``.

        Returns:
            AhuReadings | None: The readings, or ``None`` if the unit is unknown.
        """
        return self._readings.get(equipment_id)

    def describe_readings(self, equipment_id: str) -> str:
        """Returns readings as tool output text.

        Args:
            equipment_id: Equipment identifier.

        Returns:
            str: The readings, or a message saying none are available.
        """
        readings = self.find_readings(equipment_id)
        return readings.describe(equipment_id) if readings else self.NO_READINGS

    def describe_history(self, equipment_id: str, scenario: HistoryScenario = HistoryScenario.STANDARD) -> str:
        """Returns the maintenance log as tool output text.

        Args:
            equipment_id: Equipment identifier.
            scenario: Which version of the fictional log to use.

        Returns:
            str: The service records, or a message saying none are available.
        """
        records = self._histories.get(equipment_id, {}).get(scenario)
        if not records:
            return self.NO_HISTORY
        return f"FICTIONAL {equipment_id} maintenance history: " + "; ".join(r.describe() for r in records) + "."
