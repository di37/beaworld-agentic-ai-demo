"""LEVEL 4 — AI AGENT: The model chooses which read-only tools to use.

Run: python exercise_04_agent.py
"""
import os
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from workshop_tools import (
    get_ahu_readings,
    get_maintenance_history,
    build_manual_search_tool,
)

model = ChatOpenAI(model=os.getenv("BEA_MODEL", "gpt-4.1-mini"), temperature=0)
manual_tool = build_manual_search_tool()

agent = create_agent(
    model=model,
    tools=[get_ahu_readings, get_maintenance_history, manual_tool],
    system_prompt=(
        "You are an HVAC teaching assistant investigating FICTIONAL AHU-01. "
        "Use tools to check sensor readings, service history, and the manual. "
        "Decide what tool to use next from the evidence. Give a cautious hypothesis, "
        "cite the manual source when used, and recommend engineer verification. "
        "Never operate physical equipment or claim a confirmed diagnosis."
    ),
)

print("\nLEVEL 4 — AGENT INVESTIGATION\n")
result = agent.invoke({"messages": [{
    "role": "user",
    "content": "Investigate AHU-01: check readings, history, and manual guidance. "
               "Explain the leading hypothesis and next human inspection."
}]})
print("\nAGENT ANSWER\n")
print(result["messages"][-1].content)
print("\nQUESTION: Which tools did the model request, and in what order?\n")
