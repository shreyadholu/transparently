import { GoogleGenAI, Type, Schema } from "@google/genai";

export interface AIResumeAnalysis {
  overall_score: number;         // 0–100 composite ATS score
  contact_info_score: number;    // 0–100
  experience_score: number;      // 0–100 (section structure + depth)
  keyword_score: number;         // 0–100 (industry keyword density)
  skill_coverage_score: number;  // 0–100 (breadth of skill coverage)
  skills: string[];              // All skills extracted from resume
  feedback: {
    critical_issue: string | null;
    suggestions: string[];
  };
}

const SYSTEM_PROMPT = `You are a professional ATS (Applicant Tracking System) resume evaluator used by HR teams at top companies.

SCORING RULES:
- overall_score: Weighted average (contact 15% + experience 35% + keyword 25% + skill_coverage 25%).
- contact_info_score: 100 if email + phone + location are ALL present. Deduct 25 per missing item. (LinkedIn or GitHub are optional).
- experience_score: 0-100 score. Deduct 20pts if impact/achievements are not clearly quantified with metrics/numbers. Deduct 10pts for weak action verbs. Deduct 10pts if no distinct Education section. 
- keyword_score: Look for industry-recognized hard skills. Score: <8=0, 8-12=40, 13-18=60, 19-24=80, 25+=100.
- skill_coverage_score: Breadth across technical categories (e.g. Frontend, Backend, Cloud, DBs). Score: 1=20, 2=50, 3=70, 4=90, 5+=100.
- skills: Extract ONLY hard technical skills (languages, frameworks, tools, databases, cloud platforms). EXCLUDE ALL soft skills (e.g. "Active Communication", "Proficient Speaking Skills", "Financial Documents", "Leadership", "Management"), spoken languages, and vague concepts.
- feedback.critical_issue: The single most important thing preventing this resume from passing ATS filters. null if score >= 75.
- feedback.suggestions: 2-4 professional, constructive, and actionable suggestions to improve the resume for ATS.

Be fair but professional. An average resume should score around 60-75.`;

// Define the exact JSON schema we want Gemini to output
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overall_score: { type: Type.INTEGER },
    contact_info_score: { type: Type.INTEGER },
    experience_score: { type: Type.INTEGER },
    keyword_score: { type: Type.INTEGER },
    skill_coverage_score: { type: Type.INTEGER },
    skills: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING } 
    },
    feedback: {
      type: Type.OBJECT,
      properties: {
        critical_issue: { type: Type.STRING, nullable: true },
        suggestions: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING } 
        }
      },
      required: ["suggestions"],
    }
  },
  required: [
    "overall_score", 
    "contact_info_score", 
    "experience_score", 
    "keyword_score", 
    "skill_coverage_score", 
    "skills", 
    "feedback"
  ],
};

export async function analyzeResumeWithAI(text: string): Promise<AIResumeAnalysis> {
  // Use Gemini API key from explicit env var, fallback to empty string if not provided
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY environment variable. Please add it to your .env file.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Trim to ~6000 chars (about 4-5 pages) to stay within safe prompt lengths
  const trimmedText = text.slice(0, 6000);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Resume Text:\n\n${trimmedText}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1,  // Low temperature for consistent, strict scoring
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const raw = response.text || "{}";
    const parsed = JSON.parse(raw) as Partial<AIResumeAnalysis>;

    // Validate and clamp all scores to 0–100
    const clamp = (n: unknown) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));

    return {
      overall_score: clamp(parsed.overall_score),
      contact_info_score: clamp(parsed.contact_info_score),
      experience_score: clamp(parsed.experience_score),
      keyword_score: clamp(parsed.keyword_score),
      skill_coverage_score: clamp(parsed.skill_coverage_score),
      skills: Array.isArray(parsed.skills)
        ? parsed.skills.filter((s) => typeof s === "string" && s.trim().length > 0).map(s => s.trim())
        : [],
      feedback: {
        critical_issue: parsed.feedback?.critical_issue ?? null,
        suggestions: Array.isArray(parsed.feedback?.suggestions)
          ? parsed.feedback!.suggestions.filter((s) => typeof s === "string")
          : [],
      },
    };
  } catch (error) {
    console.error("Gemini AI resume analysis failed:", error);
    // Return null-equivalent so caller can fall back to regex
    throw error;
  }
}
