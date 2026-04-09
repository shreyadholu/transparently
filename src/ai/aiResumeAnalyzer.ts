// ─── Types ────────────────────────────────────────────────────────────────────
export interface AIResumeAnalysis {
  overall_score: number;
  contact_info_score: number;
  experience_score: number;
  keyword_score: number;
  skill_coverage_score: number;
  skills: string[];
  strengths: string[];
  weak_areas: string[];
  feedback: {
    critical_issue: string | null;
    suggestions: string[];
  };
}

// ─── PROMPT ───────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a world-class Recruitment Consultant and ATS Evaluator.
Your goal is to provide a deep, high-quality analysis of the provided resume text.

ANALYSIS GUIDELINES:
1. SCORING (0-100):
   - overall_score: Weighted average: (contact * 0.1) + (experience * 0.4) + (keywords * 0.25) + (skill_coverage * 0.25).
   - contact_info_score: 100 if email, phone, and location are present. Deduct 25 per missing item.
   - experience_score: Evaluate depth, quantified achievements (using numbers), and professional formatting of headers.
   - keyword_score: Look for specific industry tools/libraries (e.g., React, Python, AWS, Docker).
   - skill_coverage_score: Evaluate breadth across different domains (Frontend, Backend, Data, Cloud).

2. EXTRACTION:
   - skills: Identify at least 5-10 distinct hard technical skills. Categorize them internally to calculate the coverage score.
   - strengths: Identify exactly 3 SPECIFIC strengths (e.g., "Exceptional use of action verbs", "Strong emphasis on cloud-native architecture").
   - weak_areas: Identify exactly 3 SPECIFIC potential issues (e.g., "No GitHub or Portfolio links found", "Vague project descriptions lacking technical role details").
   - feedback: Provide exactly 3 high-impact suggestions to improve the resume.

REQUIRED OUTPUT:
Return ONLY valid JSON matching this structure:
{
  "overall_score": number,
  "contact_info_score": number,
  "experience_score": number,
  "keyword_score": number,
  "skill_coverage_score": number,
  "skills": string[],
  "strengths": string[],
  "weak_areas": string[],
  "feedback": {
    "critical_issue": string | null,
    "suggestions": string[]
  }
}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cleanJsonString(raw: string): string {
  // Remove markdown code blocks if present (```json ... ```)
  let clean = raw.trim();
  if (clean.includes('```')) {
    const matches = clean.match(/```(?:json)?([\s\S]*?)```/);
    if (matches && matches[1]) {
      clean = matches[1].trim();
    }
  }
  return clean;
}

// ─── Main Function ────────────────────────────────────────────────────────────
export async function analyzeResumeWithAI(text: string): Promise<AIResumeAnalysis> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ [Gemini] VITE_GEMINI_API_KEY is missing from .env");
    throw new Error("Missing Gemini API Key. Please add VITE_GEMINI_API_KEY to your .env file.");
  }

  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  const trimmedText = text.slice(0, 10000);
  let lastError: string = "Unknown error";

  console.log("🤖 [Gemini] Starting Stable v1 REST Analysis... Length:", trimmedText.length);

  for (const modelName of modelsToTry) {
    try {
      console.log(`🤖 [Gemini] Attempting ${modelName} via v1 REST API...`);
      
      const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: [{
          parts: [{
            text: `${SYSTEM_PROMPT}\n\nAnalyze this resume text and return JSON:\n\n${trimmedText}`
          }]
        }],
        generationConfig: {
          temperature: 0.2
          // Removed responseMimeType to fix 400 error in v1 API
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const status = response.status;
        const msg = errData.error?.message || response.statusText;
        console.warn(`⚠️ [Gemini] ${modelName} HTTP ${status}: ${msg}`);
        
        if (status === 404 || status === 400) continue; // Try next model
        throw new Error(`Gemini API Error: ${msg}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      
      console.log(`🤖 [DEBUG] Raw text from ${modelName}:`, rawText.slice(0, 100) + "...");

      const cleanJson = cleanJsonString(rawText);
      const parsed = JSON.parse(cleanJson);

      const clamp = (n: any) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));
      const strArray = (arr: any) => 
        Array.isArray(arr) ? arr.filter(s => typeof s === 'string' && s.length > 2) : [];

      const analysis: AIResumeAnalysis = {
        overall_score:        clamp(parsed.overall_score),
        contact_info_score:   clamp(parsed.contact_info_score),
        experience_score:     clamp(parsed.experience_score),
        keyword_score:        clamp(parsed.keyword_score),
        skill_coverage_score: clamp(parsed.skill_coverage_score),
        skills:               strArray(parsed.skills),
        strengths:            strArray(parsed.strengths),
        weak_areas:           strArray(parsed.weak_areas),
        feedback: {
          critical_issue: parsed.feedback?.critical_issue || null,
          suggestions:    strArray(parsed.feedback?.suggestions),
        },
      };

      console.log(`✅ [Gemini] SUCCESS with ${modelName}. Score:`, analysis.overall_score);
      return analysis;

    } catch (err: any) {
      lastError = err.message;
      console.warn(`⚠️ [Gemini] Error with ${modelName}:`, err.message);
    }
  }

  throw new Error(`AI Analysis failed on all stable models. Last error: ${lastError}`);
}
