import { GoogleGenAI } from "@google/genai";

export async function generateGeminiResponse(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  // Initialize the SDK with the securely read API key
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  try {
    // Call the Gemini model. gemini-2.5-flash is current and excellent for reasoning/coding.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    if (!response.text) {
      throw new Error("Gemini returned an empty response.");
    }

    return response.text;
  } catch (error) {
    console.error("Error communicating with Gemini SDK:", error);
    throw new Error("Failed to generate response from Gemini.");
  }
}
