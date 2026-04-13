
import dotenv from "dotenv";
dotenv.config();

async function listModels() {
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("--- AVAILABLE MODELS ---");
    if (data.models) {
      data.models.forEach((m: any) => {
        if (m.supportedGenerationMethods.includes("generateContent")) {
          console.log(`- ${m.name} (${m.displayName})`);
        }
      });
    } else {
      console.log("No models returned. Response:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

listModels();
