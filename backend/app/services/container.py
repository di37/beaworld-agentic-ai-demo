"""Wires the long-lived services together once at start-up."""

from __future__ import annotations

from dataclasses import dataclass

from app.config import Settings
from app.core.model_provider import ModelProvider
from app.domain.equipment import EquipmentRepository
from app.domain.manual import ManualRepository
from app.domain.tickets import TicketDesk
from app.services.retrieval import ManualRetriever
from app.services.toolkit import WorkshopToolkit


@dataclass(frozen=True)
class DemoServices:
    """Everything a level needs, created once and shared.

    Attributes:
        settings: Runtime settings.
        models: Chat and embedding models.
        equipment: Fictional equipment data.
        manual: Fictional maintenance manual.
        retriever: Manual search.
        tickets: Simulated ticketing system.
        toolkit: Tools the model can request.
    """

    settings: Settings
    models: ModelProvider
    equipment: EquipmentRepository
    manual: ManualRepository
    retriever: ManualRetriever
    tickets: TicketDesk
    toolkit: WorkshopToolkit

    @classmethod
    def build(cls, settings: Settings) -> DemoServices:
        """Creates and connects every service.

        Args:
            settings: Runtime settings.

        Returns:
            DemoServices: The ready-to-use services.
        """
        models = ModelProvider(settings)
        equipment = EquipmentRepository()
        manual = ManualRepository(settings.manual_dir)
        retriever = ManualRetriever(models)
        tickets = TicketDesk()
        toolkit = WorkshopToolkit(equipment, manual, retriever, tickets)
        return cls(settings, models, equipment, manual, retriever, tickets, toolkit)
