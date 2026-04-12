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
   - skills: Identify ONLY hard technical skills explicitly mentioned in the resume text (languages, frameworks, databases, cloud tools, libraries). Do NOT invent skills not present.
   - strengths: Identify exactly 3 SPECIFIC strengths based on what is actually in the resume.
   - weak_areas: Identify exactly 3 SPECIFIC potential issues based on what is missing or weak.
   - feedback: Provide exactly 3 high-impact, actionable suggestions.

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
  let clean = raw.trim();
  if (clean.includes('```')) {
    const matches = clean.match(/```(?:json)?([\s\S]*?)```/);
    if (matches && matches[1]) clean = matches[1].trim();
  }
  const jsonStart = clean.indexOf('{');
  const jsonEnd = clean.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) clean = clean.slice(jsonStart, jsonEnd + 1);
  return clean;
}

function parseAIResponse(rawText: string): AIResumeAnalysis {
  const cleanJson = cleanJsonString(rawText);
  const parsed = JSON.parse(cleanJson);

  const clamp = (n: unknown) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));
  const strArray = (arr: unknown) =>
    Array.isArray(arr) ? arr.filter((s): s is string => typeof s === 'string' && s.length > 2) : [];

  return {
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
}

// ─── Main Function ────────────────────────────────────────────────────────────
export async function analyzeResumeWithAI(text: string): Promise<AIResumeAnalysis> {
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    throw new Error('Missing AI API Key. Please add VITE_GROQ_API_KEY or VITE_GEMINI_API_KEY to your .env file.');
  }

  // Trim to 8000 chars — enough for a full resume, keeps token count low
  const trimmedText = text.slice(0, 8000);
  let lastError = 'Unknown error';

  // --- 1. TRY GROQ FIRST (FAST & GENEROUS FREE TIER) ---
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Analyze this resume text and return JSON:\n\n${trimmedText}` }
          ],
          temperature: 0,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Groq API Error: ${errData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || '{}';
      return parseAIResponse(rawText);

    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn('Groq failed, attempting Gemini fallback...', lastError);
    }
  }

  // --- 2. TRY GEMINI FALLBACK MODELS ---
  if (geminiKey) {
    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    
    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
        const payload = {
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nAnalyze this resume text and return JSON:\n\n${trimmedText}` }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 1024,
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const msg = errData.error?.message || response.statusText;
          if (response.status === 404 || response.status === 400 || response.status === 429) {
            lastError = `Gemini API Error: ${msg}`;
            continue; // try next gemini model
          }
          throw new Error(`Gemini API Error: ${msg}`);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        return parseAIResponse(rawText);

      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
  }

  throw new Error(`AI Analysis failed on all configured providers. Last error: ${lastError}`);
}
