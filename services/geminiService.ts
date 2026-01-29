import { GoogleGenAI, Type } from "@google/genai";
import { DreamAnalysis, Dream } from '../types';

// Get API key from environment - use GEMINI_API_KEY for client-side
const getApiKey = () => {
  if (typeof window !== 'undefined') {
    // Client-side: This should not be used directly, but kept for compatibility
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
  }
  // Server-side
  return process.env.GEMINI_API_KEY || '';
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

// Analyze dream text
export const analyzeDreamContent = async (text: string): Promise<DreamAnalysis> => {
  const modelId = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the following dream description deeply. 
    1. Identify key symbols (people, places, objects, actions) and interpret their potential subconscious meaning based on Jungian or general dream psychology.
    2. Analyze the underlying emotions and potential stressors.
    3. Rewrite the dream as a short, artistic creative story or poem.
    4. Extract key themes (e.g., Flying, Chase, Examination).
    
    Dream: "${text}"
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          symbols: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                meaning: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['person', 'place', 'object', 'action'] }
              }
            }
          },
          emotionalAnalysis: { type: Type.STRING },
          moods: { type: Type.ARRAY, items: { type: Type.STRING } },
          creativeStory: { type: Type.STRING },
          themes: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as DreamAnalysis;
  }
  throw new Error("Failed to analyze dream.");
};

// Generate dream image
export const generateDreamImage = async (description: string, themes: string[]): Promise<string> => {
  const modelId = "gemini-2.5-flash-image";
  const prompt = `A surreal, artistic, high-quality digital painting representing a dream about: ${description}. 
  Style: Ethereal, mystical, deep colors. Themes: ${themes.join(', ')}. No text in image.`;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        // generateContent for image does not support imageSize or count in standard config yet for flash-image
      }
    }
  });

  // Extract image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData && part.inlineData.data) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated.");
};

// Generate Universe Story
export const generateUniverseStory = async (dreams: string[]): Promise<string> => {
  const modelId = "gemini-3-pro-preview"; // Use Pro for better creative writing
  
  const prompt = `
    You are the Weaver of the Collective Unconscious. 
    I will provide snippets of dreams. Some are from the user, some are "echoes" from the collective pool.
    Weave them together into a mysterious, coherent, surreal narrative that connects these disparate threads into a single "Dream Universe".
    
    Dream Fragments:
    ${JSON.stringify(dreams)}
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 1024 } // Let it think a bit about connections
    }
  });

  return response.text || "The weaver is silent...";
};

// Analyze Subconscious Patterns
export const analyzeSubconsciousPatterns = async (dreams: Dream[]): Promise<string> => {
  if (dreams.length < 3) return "Please record at least 3 dreams to unlock pattern analysis.";

  const modelId = "gemini-3-pro-preview";
  
  const summary = dreams.map(d => ({
    date: new Date(d.timestamp).toDateString(),
    mood: d.mood,
    themes: d.analysis?.themes.join(', '),
    clarity: d.clarity,
    realityConnection: d.realityConnection
  }));

  const prompt = `
    You are an expert Dream Psychologist. Analyze these dream journal entries to find hidden patterns.
    
    Data: ${JSON.stringify(summary)}

    Please provide a Markdown formatted report covering:
    1. **Emotional Triggers**: Connect moods to themes (e.g., "When you feel Anxious, you tend to dream about Water").
    2. **Pattern Recognition**: Identify recurring symbols or clarity shifts.
    3. **Global Comparison**: Briefly contrast these themes with common human dream tropes (e.g., "Unlike the common falling dreams, yours focus on...").
    4. **Reality Check**: Analyze if there's a correlation between the 'realityConnection' notes and dream moods.

    Keep it insightful, mystical, but grounded in psychology. Max 300 words.
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
  });

  return response.text || "Could not analyze patterns.";
};
