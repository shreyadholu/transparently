import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function extractSkillsWithAI(text: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Extract technical and professional skills from the resume. Return only a comma separated list."
        },
        {
          role: "user",
          content: text.slice(0, 4000)
        }
      ]
    });

    const content = response.choices[0].message.content || "";

    return content.split(",").map(s => s.trim());
  } catch (error) {
    console.error("AI skill extraction failed:", error);
    return [];
  }
}