"""LEVEL 1 — LLM: An answer without live sensor readings.

Run: python exercise_01_llm.py
"""
import os
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model=os.getenv("BEA_MODEL", "gpt-4.1-mini"), temperature=0)

reply = model.invoke(
    "An office Air Handling Unit (AHU-01) is not cooling properly. "
    "Explain three possible causes in simple terms for a mechanical engineer. "
    "Do not claim you can see live sensor readings."
)
print("\nLEVEL 1 — LLM RESPONSE\n")
print(reply.content)
print("\nQUESTION: Did GPT check any live equipment readings? No.\n")
