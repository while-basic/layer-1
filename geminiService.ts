
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const sendMessageToPortal = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  content: { type: Type.OBJECT }
                },
                required: ["type", "content"]
              }
            }
          },
          required: ["text", "cards"]
        }
      }
    });

    return JSON.parse(response.text || '{"text": "I encountered an error.", "cards": []}');
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "Connection to the portal was interrupted. Please try again.",
      cards: []
    };
  }
};
