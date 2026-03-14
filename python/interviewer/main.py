from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI
from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

app = FastAPI()
client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

MODEL = "llama-3.3-70b-versatile"

class Message(BaseModel):
    role: str
    content: str

class BehavioralFlags(BaseModel):
    off_topic_count: int = 0
    vague_count: int = 0
    disrespect_count: int = 0
    warned: bool = False
    terminated_early: bool = False

class SessionConfig(BaseModel):
    mode: str
    role: str
    seniority: str
    difficulty: str
    focusAreas: list[str] = []
    coachEnabled: bool = True

class QuestionRequest(BaseModel):
    session_config: SessionConfig
    conversation_history: list[Message]
    behavioral_flags: BehavioralFlags
    latest_answer: Optional[str] = None

def build_system_prompt(config: SessionConfig, flags: BehavioralFlags) -> str:
    focus = ", ".join(config.focusAreas) if config.focusAreas else "general topics"

    level_instructions = {
        "Intern / Fresher": "Ask foundational questions. Be encouraging but professional. Focus on fundamentals and basic concepts.",
        "Junior": "Ask practical questions about implementation and day-to-day engineering. Moderate depth.",
        "Mid-level": "Ask deeper questions about tradeoffs, debugging, ownership, and design decisions.",
        "Senior": "Ask architecture, system-level reasoning, ambiguity handling, tradeoffs, and leadership questions.",
    }.get(config.seniority, "Ask appropriately leveled questions.")

    mode_context = (
        "This is a technical interview. Ask about coding, system design, CS fundamentals, and engineering judgment."
        if config.mode == "tech"
        else "This is an HR/behavioral interview. Ask about experience, teamwork, conflict resolution, leadership, and growth."
    )

    warning_note = ""
    if flags.disrespect_count >= 2 and not flags.warned:
        warning_note = "The candidate has been unprofessional. Issue a formal professional warning in your next response."
    elif flags.disrespect_count >= 3 and flags.warned:
        warning_note = "The candidate has continued to be unprofessional after a warning. Professionally terminate the interview. Set terminated=true in your response."

    return f"""You are a professional interviewer conducting a {config.mode} interview for a {config.role} position.
Candidate level: {config.seniority}. Difficulty: {config.difficulty}. Focus areas: {focus}.

{mode_context}
{level_instructions}

RULES:
- Ask exactly ONE question at a time
- Base your next question on the candidate's previous answer when possible
- If the answer is vague or shallow, probe deeper with a follow-up
- If the candidate goes off-topic, professionally redirect them
- Maintain a serious, professional tone throughout
- Do not repeat questions already asked

{warning_note}

Respond in JSON format:
{{
  "question": "your next question here",
  "terminated": false,
  "termination_message": null,
  "behavioral_flags_update": {{
    "off_topic_count": 0,
    "vague_count": 0,
    "disrespect_count": 0,
    "warned": false
  }}
}}

If terminating, set terminated=true and write a professional closing message in termination_message."""

@app.post("/generate-question")
async def generate_question(req: QuestionRequest):
    system_prompt = build_system_prompt(req.session_config, req.behavioral_flags)

    messages = [{"role": "system", "content": system_prompt}]
    for msg in req.conversation_history:
        messages.append({"role": "user" if msg.role == "candidate" else "assistant", "content": msg.content})

    if req.latest_answer:
        messages.append({"role": "user", "content": req.latest_answer})

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.7,
    )

    import json
    result = json.loads(response.choices[0].message.content)

    return {
        "question": result.get("question"),
        "terminated": result.get("terminated", False),
        "termination_message": result.get("termination_message"),
        "behavioral_flags": result.get("behavioral_flags_update"),
    }

@app.get("/health")
def health():
    return {"status": "ok", "service": "interviewer"}
