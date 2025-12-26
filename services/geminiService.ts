
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";

export const sendMessageToPortal = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const savedNotion = localStorage.getItem('portal_notion_config');
  let augmentedPrompt = SYSTEM_PROMPT;
  
  if (savedNotion) {
    try {
      const config = JSON.parse(savedNotion);
      if (config.token && config.databaseId) {
        augmentedPrompt += `
\n\n[SYNAPSE CONNECTED: ${config.databaseId}]
The mirror is extended. Reflect with awareness of his broader intellectual architecture.`;
      }
    } catch (e) {
      // Silent failure
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: augmentedPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { 
              type: Type.STRING, 
              description: "The primary markdown response string." 
            },
            cards: {
              type: Type.ARRAY,
              description: "Optional structural artifacts.",
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["project", "media", "bio"] },
                  content: { 
                    type: Type.OBJECT,
                    description: "Details for the specific card type.",
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      status: { type: Type.STRING },
                      tech: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["name", "description", "status", "tech"]
                  }
                },
                required: ["type", "content"]
              }
            }
          },
          required: ["text", "cards"]
        }
      }
    });

    const responseText = response.text || '{"text": "", "cards": []}';
    return JSON.parse(responseText.trim());
  } catch (error) {
    console.error("Portal flicker:", error);
    return {
      text: "The connection is tenuous.",
      cards: []
    };
  }
};
