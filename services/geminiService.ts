
import { GoogleGenAI } from "@google/genai";

// Always use process.env.API_KEY directly for initialization.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getRunFeedback = async (distance: number, duration: number, steps: number) => {
  try {
    const pace = (duration / 60) / (distance / 1000); // min/km
    // Use ai.models.generateContent to query the model with the prompt.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this run: Distance: ${distance.toFixed(0)}m, Duration: ${duration}s, Steps: ${steps}, Pace: ${pace.toFixed(2)} min/km. 
      Provide a brief, motivating analysis (max 3 sentences). 
      Format: One sentence of praise, one insight about pace/cadence, and one tip for next time.`,
      config: {
        temperature: 0.7,
      }
    });
    // Access the generated text directly from the property.
    return response.text || "Great run! Keep pushing your limits.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Amazing effort today! Your consistency is your superpower.";
  }
};