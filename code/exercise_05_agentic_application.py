"""LEVEL 5 — AGENTIC AI APPLICATION: Tools + state + human approval.

Run: python exercise_05_agentic_application.py
A ticket is created ONLY in a fictional demo tool, after approval.
"""
import os
from uuid import uuid4
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command
from workshop_tools import (
    get_ahu_readings,
    get_maintenance_history,
    build_manual_search_tool,
    create_maintenance_ticket,
)

model = ChatOpenAI(model=os.getenv("BEA_MODEL", "gpt-4.1-mini"), temperature=0)
agent = create_agent(
    model=model,
    tools=[
        get_ahu_readings,
        get_maintenance_history,
        build_manual_search_tool(),
        create_maintenance_ticket,
    ],
    system_prompt=(
        "You are a demo HVAC support agent. Investigate the fictional AHU-01 "
        "using sensor readings, maintenance history, and manual guidance. "
        "When requested, propose ONE simulated ticket with cautious evidence by "
        "calling the create_maintenance_ticket tool. Do not ask for permission in "
        "your reply: the software automatically pauses and asks an engineer to "
        "approve the tool call. "
        "If permission is denied, do not request the ticket again. "
        "Never operate physical equipment."
    ),
    middleware=[HumanInTheLoopMiddleware(
        interrupt_on={
            "create_maintenance_ticket": {
                "allowed_decisions": ["approve", "reject"]
            }
        }
    )],
    checkpointer=InMemorySaver(),  # saves state for this demo only
)

# A thread ID makes it possible to resume the SAME paused investigation.
config = {"configurable": {"thread_id": str(uuid4())}}
print("\nLEVEL 5 — AGENTIC AI APPLICATION\n")
result = agent.invoke(
    {"messages": [{
        "role": "user",
        "content": "Investigate fictional AHU-01 using all three read-only tools, "
                   "then propose one simulated maintenance ticket using the ticket tool."
    }]},
    config=config,
    version="v2",
)

if result.interrupts:
    # The middleware stops BEFORE the ticket function runs.
    pending_count = sum(
        len(interruption.value.get("action_requests", []))
        for interruption in result.interrupts
    )
    if pending_count != 1:
        raise RuntimeError(
            "Expected exactly one proposed ticket. No action was approved."
        )
    for interruption in result.interrupts:
        print("\nACTION WAITING FOR HUMAN APPROVAL:\n", interruption.value)
    choice = input("\nApprove this SIMULATED ticket? [y/N]: ").strip().lower()
    decision = (
        {"type": "approve"} if choice == "y"
        else {"type": "reject", "message": "Engineer declined ticket creation."}
    )
    result = agent.invoke(
        Command(resume={"decisions": [decision]}),
        config=config,
        version="v2",
    )
else:
    print("No ticket was proposed; agent returned a response instead.")

print("\nFINAL APPLICATION RESPONSE\n")
print(result.value["messages"][-1].content)
print("\nQUESTION: Did the model alone have permission to create a ticket? No.\n")
