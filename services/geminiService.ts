import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Uses Gemini to split long text into natural subtitle chunks.
 * Updated to ensure each sentence is its own line and newlines/paragraphs are respected.
 */
export const optimizeTextForSubtitles = async (text: string): Promise<string[]> => {
  // Helper for fallback splitting
  const fallbackSplit = (inputText: string): string[] => {
    // 1. Split by newlines first to respect paragraphs
    const paragraphs = inputText.split(/\r?\n/).filter(p => p.trim().length > 0);
    const results: string[] = [];
    
    for (const p of paragraphs) {
      // 2. Split each paragraph into sentences
      const sentences = p.match(/[^\.!\?]+[\.!\?]+["']?|.+$/g)?.map(s => s.trim()) || [p.trim()];
      results.push(...sentences);
    }
    return results;
  };

  if (!apiKey) {
    console.warn("No API Key found. Returning simple split.");
    return fallbackSplit(text);
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
      5. Treat newlines (paragraphs) in the source text as hard breaks. Do not merge text from different paragraphs.
      6. Return a JSON array of strings.
      
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
    return fallbackSplit(text);

  } catch (error) {
    console.error("Gemini optimization failed:", error);
    return fallbackSplit(text);
  }
};