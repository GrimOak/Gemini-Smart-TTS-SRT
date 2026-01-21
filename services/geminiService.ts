import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Uses Gemini to split long text into natural subtitle chunks.
 * Updated to ensure each sentence is its own line as requested.
 */
export const optimizeTextForSubtitles = async (text: string): Promise<string[]> => {
  if (!apiKey) {
    console.warn("No API Key found. Returning simple split.");
    // Fallback if no API key: Simple sentence splitting
    return text.match(/[^\.!\?]+[\.!\?]+["']?|.+$/g)?.map(s => s.trim()) || [text];
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Split the following text into individual sentences.
      Rules:
      1. Each item in the array must be exactly one full sentence.
      2. Do not split a single sentence into multiple parts, even if it is long.
      3. Do not combine multiple sentences into one item.
      4. Preserve all original punctuation and wording exactly.
      5. Return a JSON array of strings.
      
      Text to split:
      "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("Empty response from Gemini");
    
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [text];

  } catch (error) {
    console.error("Gemini optimization failed:", error);
    // Fallback to basic sentence splitting if API fails
    return text.match(/[^\.!\?]+[\.!\?]+["']?|.+$/g)?.map(s => s.trim()) || [text];
  }
};