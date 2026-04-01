import { GoogleGenAI, Type, Schema } from "@google/genai";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AIResumeAnalysis {
  overall_score: number;          // 0–100 composite ATS score
  contact_info_score: number;     // 0–100
  experience_score: number;       // 0–100 (section structure + depth)
  keyword_score: number;          // 0–100 (industry keyword density)
  skill_coverage_score: number;   // 0–100 (breadth of skill coverage)
  skills: string[];               // Hard technical skills only
  strengths: string[];            // 2–3 resume strengths
  weak_areas: string[];           // 2–3 improvement areas
  feedback: {
    critical_issue: string | null;
    suggestions: string[];        // Actionable improvement tips (2–4)
  };
}

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a professional ATS (Applicant Tracking System) resume evaluator used by HR teams at top companies.

SCORING RULES (apply these EXACTLY and DETERMINISTICALLY — same resume = same score every time):
- overall_score: Use this formula: ROUND((contact_info_score * 0.15) + (experience_score * 0.35) + (keyword_score * 0.25) + (skill_coverage_score * 0.25)). Do NOT deviate.
- contact_info_score: Start at 100. Deduct 30 if no email found. Deduct 25 if no phone found. Deduct 20 if no location/city found. Minimum 0.
- experience_score: Start at 100. Deduct 20 if experience achievements lack numbers/metrics. Deduct 15 if no Education section. Deduct 15 if weak action verbs (e.g., "helped", "did", "was responsible for"). Minimum 0.
- keyword_score: Count distinct hard technical keywords (languages, tools, frameworks, libraries, platforms, databases, cloud services). Score: 0-7=20, 8-12=40, 13-18=60, 19-24=80, 25+=100.
- skill_coverage_score: Count distinct tech categories present (Frontend, Backend, Cloud/DevOps, Databases, Mobile, AI/ML, Other Tools). Score: 0=0, 1=20, 2=50, 3=70, 4=90, 5+=100.
- skills: Extract ONLY hard technical skills (programming languages, frameworks, libraries, databases, cloud platforms, tools, DevOps tools). EXCLUDE: soft skills, spoken languages (English, Hindi etc.), certifications, degrees, job titles.
- strengths: Write exactly 2-3 specific positive statements about this resume (e.g., "Strong quantified achievements in backend performance"). Be specific to this resume.
- weak_areas: Write exactly 2-3 specific weaknesses (e.g., "No LinkedIn profile URL found"). Be specific to this resume.
- feedback.critical_issue: The single most important ATS blocker as a short sentence. Set to null if overall_score >= 75.
- feedback.suggestions: Write exactly 3 actionable improvement tips specific to this resume.

Be consistent. An average resume should score 55-70. A strong resume 70-85. An exceptional resume 85+.`;

// ─── JSON Schema ──────────────────────────────────────────────────────────────
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overall_score:        { type: Type.INTEGER },
    contact_info_score:   { type: Type.INTEGER },
    experience_score:     { type: Type.INTEGER },
    keyword_score:        { type: Type.INTEGER },
    skill_coverage_score: { type: Type.INTEGER },
    skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    weak_areas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    feedback: {
      type: Type.OBJECT,
      properties: {
        critical_issue: { type: Type.STRING, nullable: true },
        suggestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ["suggestions"],
    },
  },
  required: [
    "overall_score",
    "contact_info_score",
    "experience_score",
    "keyword_score",
    "skill_coverage_score",
    "skills",
    "strengths",
    "weak_areas",
    "feedback",
  ],
};

// ─── Main Function ────────────────────────────────────────────────────────────
export async function analyzeResumeWithAI(text: string): Promise<AIResumeAnalysis> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY. Please add it to your .env file.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Trim to ~6000 chars to stay within safe prompt lengths
  const trimmedText = text.slice(0, 6000);

  console.log("🤖 [Gemini] Starting analysis, text length:", trimmedText.length);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Analyze this resume and return ONLY valid JSON matching the schema.\n\nResume Text:\n\n${trimmedText}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0,           // ← 0 = fully deterministic, same input = same output
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const raw = response.text || "{}";
  console.log("🤖 [Gemini] Raw response length:", raw.length);

  let parsed: Partial<AIResumeAnalysis>;
  try {
    parsed = JSON.parse(raw) as Partial<AIResumeAnalysis>;
  } catch (parseErr) {
    console.error("🤖 [Gemini] JSON parse failed:", parseErr, "\nRaw:", raw.slice(0, 500));
    throw new Error("Gemini returned invalid JSON. Check console for details.");
  }

  const clamp = (n: unknown) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));
  const strArray = (arr: unknown) =>
    Array.isArray(arr)
      ? (arr as unknown[]).filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : [];

  const result: AIResumeAnalysis = {
    overall_score:        clamp(parsed.overall_score),
    contact_info_score:   clamp(parsed.contact_info_score),
    experience_score:     clamp(parsed.experience_score),
    keyword_score:        clamp(parsed.keyword_score),
    skill_coverage_score: clamp(parsed.skill_coverage_score),
    skills:               strArray(parsed.skills).map(s => s.trim()),
    strengths:            strArray(parsed.strengths),
    weak_areas:           strArray(parsed.weak_areas),
    feedback: {
      critical_issue: parsed.feedback?.critical_issue ?? null,
      suggestions:    strArray(parsed.feedback?.suggestions),
    },
  };

  console.log("✅ [Gemini] Analysis complete:", {
    score: result.overall_score,
    skills: result.skills.length,
    strengths: result.strengths.length,
    suggestions: result.feedback.suggestions.length,
  });

  return result;
}
