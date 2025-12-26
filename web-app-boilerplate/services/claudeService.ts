
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../constants";

export const sendMessageToPortal = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  const anthropic = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true
  });

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
    // Convert history from Gemini format to Claude format
    const claudeMessages = history.map(h => ({
      role: h.role === 'user' ? 'user' as const : 'assistant' as const,
      content: h.parts.map(p => p.text).join('\n')
    }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8096,
      system: augmentedPrompt,
      messages: [
        ...claudeMessages,
        { role: 'user', content: message }
      ]
    });

    // Extract text from response
    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : '{"text": "", "cards": []}';

    return JSON.parse(responseText.trim());
  } catch (error) {
    console.error("Portal flicker:", error);
    return {
      text: "The connection is tenuous.",
      cards: []
    };
  }
};
