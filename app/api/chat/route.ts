import { StreamingTextResponse } from 'ai'
import { classifyIntent, streamChatCompletion, buildSystemPrompt } from '@/lib/ai/claude'
import { advancedSearch, formatContextForClaude } from '@/lib/search/hybrid'
import { executeTool } from '@/lib/tools/executor'
import { toolsToClaudeFunctions } from '@/lib/tools/registry'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages || messages.length === 0) {
      return new Response('No messages provided', { status: 400 })
    }

    const userMessage = messages[messages.length - 1].content
    console.log('💬 User message:', userMessage)

    // Step 1: Classify intent
    const intent = await classifyIntent(userMessage)
    console.log('🎯 Intent:', intent)

    // Step 2: Retrieve context if needed
    let context: any[] = []

    if (intent.needsSearch) {
      const results = await advancedSearch({
        query: userMessage,
        mode: intent.searchMode,
        limit: 8,
        rerank: true,
      })

      context = formatContextForClaude(results)
      console.log(`🔍 Retrieved ${context.length} context chunks`)
    }

    // Step 3: Execute tools if suggested
    let toolResults: any[] = []

    // Note: For now, we let Claude decide whether to call tools
    // In a more advanced implementation, we could pre-execute based on intent

    // Step 4: Build system prompt
    const systemPrompt = buildSystemPrompt(context, toolResults)

    // Step 5: Stream response from Claude
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamChatCompletion(
            systemPrompt,
            messages.map((m: any) => ({
              role: m.role,
              content: m.content,
            })),
            {
              tools: toolsToClaudeFunctions(),
              maxTokens: 4000,
              temperature: 0.7,
            }
          )

          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(chunk))
          }

          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      },
    })

    return new StreamingTextResponse(stream)
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
