import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../constants";
import CLAUDE_FUNCTIONS from "../knowledgebase/claude_functions.json";
import { getSemanticSearch } from "./semanticSearchService";

/**
 * Sends a message to the Christopher Celaya Portal using Claude AI
 * Implements function calling for rich UI components (project cards, media embeds, etc.)
 *
 * @param message - The user's message text
 * @param history - Conversation history in Gemini format (for backward compatibility)
 * @returns Response object with text and optional card data
 */
export const sendMessageToPortal = async (
  message: string,
  history: { role: 'user' | 'model', parts: { text: string }[] }[]
) => {
  const anthropic = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true
  });

  // Check for Notion integration and augment system prompt if configured
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
      console.warn('Failed to parse Notion config:', e);
    }
  }

  try {
    // Convert history from Gemini format to Claude format
    const claudeMessages = history.map(h => ({
      role: h.role === 'user' ? 'user' as const : 'assistant' as const,
      content: h.parts.map(p => p.text).join('\n')
    }));

    // Perform semantic search to get relevant context
    let contextualMessage = message;
    try {
      const semanticSearch = getSemanticSearch();
      const context = await semanticSearch.searchAndFormat(message, {
        topK: 6,
        minScore: 0.3
      });

      if (context.metadata.totalChunks > 0) {
        // Augment the message with retrieved context
        contextualMessage = `
[KNOWLEDGE BASE CONTEXT]
Retrieved ${context.metadata.totalChunks} relevant chunks from ${context.metadata.uniqueSources} sources:

${context.text}

---

[USER QUERY]
${message}

Please use the knowledge base context above to inform your response. Cite sources when relevant.
        `.trim();
      }
    } catch (searchError) {
      console.warn('Semantic search failed, proceeding without context:', searchError);
      // Continue with original message if search fails
    }

    // Convert function definitions to Anthropic tools format
    const tools = CLAUDE_FUNCTIONS.functions.map(fn => ({
      name: fn.name,
      description: fn.description,
      input_schema: fn.parameters
    }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8096,
      system: augmentedPrompt,
      tools,
      messages: [
        ...claudeMessages,
        { role: 'user', content: contextualMessage }
      ]
    });

    // Process response - handle both text and tool use
    let responseText = '';
    const cards: any[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text;
      } else if (block.type === 'tool_use') {
        // Convert tool calls to card format
        const toolName = block.name;
        const toolInput = block.input;

        // Map function calls to card types
        const cardTypeMap: Record<string, string> = {
          'render_project_card': 'project',
          'render_media_embed': 'media',
          'render_bio_card': 'bio',
          'render_project_list': 'project_list',
          'render_action_button': 'action',
          'render_philosophy_explanation': 'philosophy'
        };

        const cardType = cardTypeMap[toolName];
        if (cardType) {
          cards.push({
            type: cardType,
            content: toolInput
          });
        }
      }
    }

    return {
      text: responseText || '',
      cards
    };
  } catch (error) {
    console.error("Portal connection error:", error);

    // Provide more detailed error information in development
    if (import.meta.env.DEV) {
      console.error("Full error details:", error);
    }

    return {
      text: "The connection is tenuous. The portal flickers.",
      cards: []
    };
  }
};
