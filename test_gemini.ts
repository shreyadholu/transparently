
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function listModels() {
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // There isn't a direct listModels in the client SDK easily accessible without a specific version
    // But we can try to initialize different models
    console.log("Checking gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log("gemini-1.5-flash worked!");
  } catch (err) {
    console.error("gemini-1.5-flash failed:", err.message);
  }
}

listModels();
