import { getToolByName, TOOLS } from './registry'
import type { ToolResult } from '@/types'

/**
 * Execute a tool by name with parameters
 */
export async function executeTool(
  toolName: string,
  parameters: any
): Promise<ToolResult> {
  const tool = getToolByName(toolName)

  if (!tool) {
    return {
      tool: toolName,
      data: null,
      success: false,
      error: `Tool "${toolName}" not found`,
    }
  }

  console.log(`🔧 Executing tool: ${toolName}`)
  console.log(`📝 Parameters:`, parameters)

  try {
    let result

    // Local handler
    if (tool.handler) {
      result = await tool.handler(parameters)
    }
    // Remote API
    else if (tool.endpoint) {
      result = await executeRemoteTool(tool.endpoint, parameters)
    } else {
      throw new Error(`Tool ${toolName} has no handler or endpoint`)
    }

    console.log(`✅ Tool ${toolName} executed successfully`)

    return {
      tool: toolName,
      data: result,
      success: true,
    }
  } catch (error) {
    console.error(`❌ Tool ${toolName} failed:`, error)

    return {
      tool: toolName,
      data: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Execute a remote tool via API
 */
async function executeRemoteTool(
  endpoint: string,
  parameters: any
): Promise<any> {
  const apiKey = process.env.CELAYA_API_KEY

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(parameters),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Execute multiple tools in parallel
 */
export async function executeTools(
  toolCalls: Array<{ name: string; parameters: any }>
): Promise<ToolResult[]> {
  const results = await Promise.all(
    toolCalls.map(call => executeTool(call.name, call.parameters))
  )

  return results
}

/**
 * Format tool result for conversational display
 */
export function formatToolResult(toolName: string, data: any): string {
  switch (toolName) {
    case 'analyze_clos':
      return formatCLOSResult(data)

    case 'game_34_analysis':
      return formatChessResult(data)

    case 'generate_artifact':
      return formatArtifactResult(data)

    case 'neural_child_interact':
      return formatNeuralChildResult(data)

    case 'search_knowledge':
    case 'hyde_search':
    case 'multi_query_search':
      return formatSearchResult(data)

    default:
      return JSON.stringify(data, null, 2)
  }
}

function formatCLOSResult(data: any): string {
  return `
## CLOS Analysis

${data.analysis || 'Analysis not available'}

**Key Patterns Detected:**
${data.patterns?.map((p: string) => `- ${p}`).join('\n') || 'None identified'}

**Recommendations:**
${data.recommendations?.map((r: string) => `- ${r}`).join('\n') || 'None available'}

**Cognitive Load Score:** ${data.cognitive_load_score || 'N/A'}/10
**Flow State Likelihood:** ${data.flow_state_likelihood || 'N/A'}%

*Analysis used ${data.algorithms_used?.length || 37} algorithms*
  `.trim()
}

function formatChessResult(data: any): string {
  return `
## Game 34 Strategic Analysis

**Situation Assessment:**
${data.assessment || 'Assessment not available'}

**Available Moves:**
${
  data.moves
    ?.map(
      (m: any, i: number) => `
${i + 1}. **${m.title}** (Strategic Value: ${m.score}/10)
   ${m.description}
   - Risks: ${m.risks?.join(', ') || 'None identified'}
   - Rewards: ${m.rewards?.join(', ') || 'None identified'}
   - Timeline: ${m.timeline || 'Not specified'}
`
    )
    .join('\n') || 'No moves identified'
}

**Recommended Strategy:**
${data.recommendation || 'No recommendation available'}

**Confidence Level:** ${data.confidence || 'N/A'}%
  `.trim()
}

function formatArtifactResult(data: any): string {
  return `
## Cognitive Artifact Generated

**Category:** ${data.category || 'N/A'}
**Complexity:** ${data.complexity || 'N/A'}

**Prompt:**
${data.prompt || 'Prompt not available'}

**Usage Guidelines:**
${data.guidelines?.map((g: string) => `- ${g}`).join('\n') || 'None provided'}

**Expected Outcomes:**
${data.outcomes?.map((o: string) => `- ${o}`).join('\n') || 'None specified'}
  `.trim()
}

function formatNeuralChildResult(data: any): string {
  return `
## Neural Child Response

${data.response || 'Response not available'}

**Network Used:** ${data.network || 'General'}
**Developmental Stage:** ${data.stage || 'N/A'}
**Confidence:** ${data.confidence || 'N/A'}%

${data.insights?.length > 0 ? `\n**Key Insights:**\n${data.insights.map((i: string) => `- ${i}`).join('\n')}` : ''}
  `.trim()
}

function formatSearchResult(data: any): string {
  if (!Array.isArray(data)) {
    return 'Search results not available'
  }

  return `
## Search Results (${data.length} found)

${data
  .slice(0, 5)
  .map(
    (result: any, i: number) => `
### ${i + 1}. ${result.metadata?.section || 'Untitled'}
**Source:** ${result.metadata?.source || 'Unknown'}
**Relevance:** ${((result.score || 0) * 100).toFixed(1)}%

${result.text?.slice(0, 300)}${result.text?.length > 300 ? '...' : ''}
`
  )
  .join('\n---\n')}

${data.length > 5 ? `\n*...and ${data.length - 5} more results*` : ''}
  `.trim()
}

/**
 * Validate tool parameters
 */
export function validateToolParameters(
  toolName: string,
  parameters: any
): { valid: boolean; errors: string[] } {
  const tool = getToolByName(toolName)

  if (!tool) {
    return {
      valid: false,
      errors: [`Tool "${toolName}" not found`],
    }
  }

  const errors: string[] = []

  // Check required parameters
  for (const param of tool.parameters) {
    if (param.required && !parameters[param.name]) {
      errors.push(`Missing required parameter: ${param.name}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
