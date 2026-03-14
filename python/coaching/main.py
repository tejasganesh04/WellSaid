from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI
from dotenv import load_dotenv
from pathlib import Path
import os
import json

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

app = FastAPI()
client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

MODEL = "llama-3.1-8b-instant"  # fast + cheap for short coaching hints

class SessionConfig(BaseModel):
    mode: str
    role: str
    seniority: str
    difficulty: str
    focusAreas: list[str] = []

class HintRequest(BaseModel):
    transcript: str
    current_question: Optional[str] = None
    session_config: SessionConfig

SYSTEM_PROMPT = """You are a real-time speech coach observing a mock interview.
Your job is to provide ONE short, actionable coaching hint based on the candidate's current answer.

Rules:
- Give ONLY ONE hint. Not a list.
- Keep it under 10 words.
- Be direct. Not encouraging. Not harsh. Just useful.
- Focus on delivery or structure problems, not content correctness.
- If the answer is fine, return null.

Examples of good hints:
- "Lead with your main point first."
- "Too much background — get to the answer."
- "Be more concise."
- "Give a concrete example."
- "Bring it back to the question."
- "Clarify the outcome or impact."

Respond in JSON: {"hint": "your hint here"} or {"hint": null} if no hint needed."""

@app.post("/generate-hint")
async def generate_hint(req: HintRequest):
    if not req.transcript or len(req.transcript.split()) < 15:
        return {"hint": None}

    user_message = f"Current question: {req.current_question or 'unknown'}\n\nCandidate is saying: {req.transcript[-500:]}"

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        temperature=0.4,
        max_tokens=60,
    )

    result = json.loads(response.choices[0].message.content)
    return {"hint": result.get("hint")}

@app.get("/health")
def health():
    return {"status": "ok", "service": "coaching"}
