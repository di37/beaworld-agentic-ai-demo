"""LEVEL 2 — TOOL: A Python function returns simulated information.

Run: python exercise_02_tool.py
No LLM or API key is needed for this exercise.
"""
from langchain.tools import tool

@tool
def get_ahu_readings(equipment_id: str) -> str:
    """Get fictional room and airflow readings for an Air Handling Unit."""
    print(f"[TOOL RUNNING] get_ahu_readings({equipment_id})")
    if equipment_id != "AHU-01":
        return "No simulated readings available for that equipment ID."
    return (
        "FICTIONAL AHU-01 data: room temperature = 28 C; "
        "setpoint = 22 C; supply airflow = LOW; "
        "filter differential pressure = HIGH."
    )

# Notice: PYTHON decides to call the tool. There is no agent here.
result = get_ahu_readings.invoke({"equipment_id": "AHU-01"})
print("\nLEVEL 2 — TOOL RESULT\n")
print(result)
print("\nQUESTION: Who chose to run the tool? Our Python program.\n")
