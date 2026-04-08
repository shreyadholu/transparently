import os
import json
import logging
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from PyPDF2 import PdfReader
from dotenv import load_dotenv
import io

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Transparently AI Backend")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the Vite dev server URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Types ---

class AIFeedback(BaseModel):
    critical_issue: Optional[str] = None
    suggestions: List[str]

class AIResumeAnalysis(BaseModel):
    overall_score: int
    contact_info_score: int
    experience_score: int
    keyword_score: int
    skill_coverage_score: int
    skills: List[str]
    strengths: List[str]
    weak_areas: List[str]
    feedback: AIFeedback

# --- System Prompt (Ported from aiResumeAnalyzer.ts) ---

SYSTEM_PROMPT = """You are a professional ATS (Applicant Tracking System) resume evaluator used by HR teams at top companies.

SCORING RULES (apply these EXACTLY and DETERMINISTICALLY):
- overall_score: Use this formula: ROUND((contact_info_score * 0.15) + (experience_score * 0.35) + (keyword_score * 0.25) + (skill_coverage_score * 0.25)).
- contact_info_score: Start at 100. Deduct 30 if no email. Deduct 25 if no phone. Deduct 20 if no location. Min 0.
- experience_score: Start at 100. Deduct 20 if achievements lack numbers. Deduct 15 if no Education. Deduct 15 if weak verbs. Min 0.
- keyword_score: Count distinct hard technical keywords. Score: 0-7=20, 8-12=40, 13-18=60, 19-24=80, 25+=100.
- skill_coverage_score: Count distinct tech categories (Frontend, Backend, Cloud, Databases, Mobile, AI/ML, Tools). Score: 0=0, 1=20, 2=50, 3=70, 4=90, 5+=100.
- skills: Extract ONLY hard technical skills (languages, frameworks, libraries, databases, cloud, tools). EXCLUDE soft skills.
- strengths: Exactly 2-3 specific positive statements.
- weak_areas: Exactly 2-3 specific weaknesses.
- feedback.critical_issue: short sentence or null if overall_score >= 75.
- feedback.suggestions: Exactly 3 actionable improvement tips.

Return ONLY valid JSON matching the schema."""

# --- Helper Logic ---

def extract_text_from_pdf(file_content: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except Exception as e:
        logger.error(f"PDF Extraction failed: {e}")
        raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

class RoadmapRequest(BaseModel):
    student_skills: List[str]
    job_title: str
    job_skills: List[str]

class RoadmapStep(BaseModel):
    title: str
    description: str
    difficulty: str  # Beginner, Intermediate, Advanced

class GrowthRoadmap(BaseModel):
    steps: List[RoadmapStep]
    estimated_time: str
    project_idea: str

# --- Endpoints ---

@app.post("/analyze", response_model=AIResumeAnalysis)
async def analyze_resume(file: UploadFile = File(...)):
    # ... (existing analyze_resume logic) ...
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    content = await file.read()
    text = extract_text_from_pdf(content)
    
    if len(text) < 50:
        raise HTTPException(status_code=400, detail="Resume text too short. PDF may be image-based.")

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key missing in environment.")

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"Analyze this resume and return ONLY valid JSON matching the schema.\n\nResume Text:\n\n{text[:6000]}"
        
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0,
                response_mime_type="application/json",
            ),
            system_instruction=SYSTEM_PROMPT
        )
        
        parsed = json.loads(response.text)
        return parsed
    except Exception as e:
        logger.error(f"Gemini analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI Analysis failed: {str(e)}")

@app.post("/roadmap", response_model=GrowthRoadmap)
async def generate_roadmap(req: RoadmapRequest):
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")

    missing = [s for s in req.job_skills if s.lower() not in [ss.lower() for ss in req.student_skills]]
    
    prompt = f"""
    Create a professional 'Growth Roadmap' for a student who wants to be a {req.job_title}.
    Student possesses: {', '.join(req.student_skills)}
    Missing required skills: {', '.join(missing)}
    
    Return a JSON with:
    - steps: List of 3-4 steps with 'title', 'description', and 'difficulty'.
    - estimated_time: A string like '4-6 weeks'.
    - project_idea: A specific, non-generic project title and short description to prove competence.
    """

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                response_mime_type="application/json",
            )
        )
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Roadmap generation failed: {e}")
        # Fallback basic roadmap
        return {
            "steps": [{"title": "Skill Acquisition", "description": f"Focus on learning {', '.join(missing[:3])}", "difficulty": "Intermediate"}],
            "estimated_time": "4 weeks",
            "project_idea": f"Advanced {req.job_title} Portfolio Project"
        }

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
