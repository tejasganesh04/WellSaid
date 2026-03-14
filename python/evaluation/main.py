from fastapi import FastAPI
from pydantic import BaseModel
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

MODEL = "llama-3.3-70b-versatile"

class Message(BaseModel):
    role: str
    content: str

class SessionConfig(BaseModel):
    mode: str
    role: str
    seniority: str
    difficulty: str
    focusAreas: list[str] = []

class BehavioralFlags(BaseModel):
    off_topic_count: int = 0
    disrespect_count: int = 0
    warned: bool = False
    terminated_early: bool = False

class ReportRequest(BaseModel):
    conversation_history: list[Message]
    session_config: SessionConfig
    behavioral_flags: BehavioralFlags

def build_evaluation_prompt(config: SessionConfig, flags: BehavioralFlags) -> str:
    focus = ", ".join(config.focusAreas) if config.focusAreas else "general"
    terminated_note = " Note: This interview was terminated early due to unprofessional conduct." if flags.terminated_early else ""

    return f"""You are evaluating a mock {config.mode} interview for a {config.role} candidate at {config.seniority} level (difficulty: {config.difficulty}, focus: {focus}).{terminated_note}

Evaluate the candidate's performance across the full conversation and return a detailed JSON report.

Score each category from 1-10:
- overall
- communication
- structure
- relevance
- conciseness
- professionalism

Also provide:
- strengths: list of 2-4 specific strengths observed
- weaknesses: list of 2-4 specific areas to improve
- improvements: list of 2-4 concrete, actionable suggestions
- answer_breakdown: for each Q&A pair, include question, answer (summarized), score (1-10), and notes

The report must reflect the specific role, level, and focus areas. Do not be generic.

Return only valid JSON matching this structure:
{{
  "scores": {{"overall": 7, "communication": 6, "structure": 7, "relevance": 8, "conciseness": 5, "professionalism": 9}},
  "strengths": ["..."],
  "weaknesses": ["..."],
  "improvements": ["..."],
  "answer_breakdown": [{{"question": "...", "answer": "...", "score": 7, "notes": "..."}}]
}}"""

@app.post("/generate-report")
async def generate_report(req: ReportRequest):
    system_prompt = build_evaluation_prompt(req.session_config, req.behavioral_flags)

    # Format conversation as readable transcript
    transcript_lines = []
    for msg in req.conversation_history:
        label = "Interviewer" if msg.role == "interviewer" else "Candidate"
        transcript_lines.append(f"{label}: {msg.content}")
    transcript = "\n\n".join(transcript_lines)

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Interview transcript:\n\n{transcript}"},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    result = json.loads(response.choices[0].message.content)
    return result

@app.get("/health")
def health():
    return {"status": "ok", "service": "evaluation"}
