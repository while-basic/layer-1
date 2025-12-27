import Anthropic from '@anthropic-ai/sdk'
import type { Message } from '@/types'

let client: Anthropic | null = null

export function getClaudeClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set')
    }

    client = new Anthropic({
      apiKey,
    })
  }

  return client
}

/**
 * Send a message to Claude with streaming
 */
export async function* streamChatCompletion(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: {
    maxTokens?: number
    temperature?: number
    tools?: any[]
  } = {}
): AsyncGenerator<string, void, unknown> {
  const client = getClaudeClient()
  const { maxTokens = 4000, temperature = 0.7, tools } = options

  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }, // Cache the system prompt
        },
      ],
      messages,
      tools,
    })

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        yield chunk.delta.text
      }
    }
  } catch (error) {
    console.error('Claude streaming failed:', error)
    throw error
  }
}

/**
 * Send a non-streaming message to Claude
 */
export async function chatCompletion(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: {
    maxTokens?: number
    temperature?: number
    tools?: any[]
  } = {}
): Promise<string> {
  const client = getClaudeClient()
  const { maxTokens = 4000, temperature = 0.7, tools } = options

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
      tools,
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return content.text
    }

    return ''
  } catch (error) {
    console.error('Claude completion failed:', error)
    throw error
  }
}

/**
 * Classify user intent
 */
export async function classifyIntent(query: string): Promise<{
  intent: 'search' | 'tool' | 'conversational' | 'command'
  needsSearch: boolean
  searchMode: 'semantic' | 'keyword' | 'hybrid' | 'graph'
  suggestedTools: string[]
  confidence: number
}> {
  const prompt = `
Analyze this user query and classify the intent:

"${query}"

Return JSON with:
{
  "intent": "search" | "tool" | "conversational" | "command",
  "needsSearch": boolean,
  "searchMode": "semantic" | "keyword" | "hybrid" | "graph",
  "suggestedTools": ["tool_name"],
  "confidence": 0-1
}

Guidelines:
- "search" intent: user wants information from knowledge base
- "tool" intent: user wants to execute a specific tool (CLOS, chess, neural, artifact)
- "conversational" intent: general chat, no search needed
- "command" intent: slash command or directive

- searchMode "semantic": conceptual questions, explanations
- searchMode "keyword": specific terms, names, acronyms
- searchMode "hybrid": combination of both
- searchMode "graph": relationship queries, connections between concepts

Return ONLY valid JSON, no additional text.
  `.trim()

  try {
    const response = await chatCompletion(prompt, [], {
      maxTokens: 300,
      temperature: 0.3,
    })

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Intent classification failed:', error)
    // Default fallback
    return {
      intent: 'search',
      needsSearch: true,
      searchMode: 'hybrid',
      suggestedTools: [],
      confidence: 0.5,
    }
  }
}

/**
 * Rewrite query for better search results
 */
export async function rewriteQuery(query: string): Promise<string> {
  const prompt = `
Rewrite this search query to be more effective for semantic search.
Make it more specific and keyword-rich while preserving intent.

Original: "${query}"

Return only the rewritten query, nothing else.
  `.trim()

  try {
    const response = await chatCompletion(prompt, [], {
      maxTokens: 200,
      temperature: 0.3,
    })

    return response.trim()
  } catch (error) {
    console.error('Query rewriting failed:', error)
    return query
  }
}

/**
 * Generate hypothetical document (HyDE technique)
 */
export async function generateHypotheticalDocument(
  query: string
): Promise<string> {
  const prompt = `
Write a detailed, technical answer to this question as if it were
from Christopher Celaya's documentation:

"${query}"

Write in first person, include specific technical details, methodologies,
and cross-domain connections. Keep it concise but information-dense.
  `.trim()

  try {
    const response = await chatCompletion(prompt, [], {
      maxTokens: 500,
      temperature: 0.7,
    })

    return response.trim()
  } catch (error) {
    console.error('HyDE generation failed:', error)
    return query
  }
}

/**
 * Extract entities from query for graph search
 */
export async function extractEntities(
  query: string
): Promise<string[]> {
  const prompt = `
Extract key concepts, entities, and topics from this query:

"${query}"

Return a JSON array of entity names, e.g.:
["CLOS", "flow states", "cognitive optimization"]

Return ONLY the JSON array, no additional text.
  `.trim()

  try {
    const response = await chatCompletion(prompt, [], {
      maxTokens: 200,
      temperature: 0.3,
    })

    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return []
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Entity extraction failed:', error)
    return []
  }
}

/**
 * Build system prompt with context
 */
export function buildSystemPrompt(
  context: Array<{ text: string; source: string; section: string; score: number }>,
  toolResults: Array<{ tool: string; data: any }> = []
): string {
  let prompt = `
You are the conversational interface to Christopher Celaya's research ecosystem.

Your role:
- Answer questions using the provided context
- Cite sources when relevant (use format: [source:section])
- Suggest tools when they would help the user
- Maintain Christopher's voice: technical, systematic, cross-domain
- Be concise but comprehensive

Available context:
${context
  .map(
    (c, i) => `
[${i + 1}] Source: ${c.source} (${c.section})
Relevance: ${(c.score * 100).toFixed(1)}%

${c.text}
`
  )
  .join('\n---\n')}
  `.trim()

  if (toolResults.length > 0) {
    prompt += `\n\nTool Results:\n`
    toolResults.forEach(tr => {
      prompt += `\n${tr.tool}:\n${JSON.stringify(tr.data, null, 2)}\n`
    })
  }

  return prompt
}
