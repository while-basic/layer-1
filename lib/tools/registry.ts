import type { Tool } from '@/types'
import { advancedSearch, hydeSearch, multiQuerySearch } from '@/lib/search/hybrid'

/**
 * Tool registry for the platform
 */
export const TOOLS: Tool[] = [
  {
    name: 'search_knowledge',
    command: '/search',
    description: "Semantic search across Christopher's knowledge base",
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'Search query',
        required: true,
      },
      {
        name: 'mode',
        type: 'string',
        description: 'Search strategy: semantic|keyword|hybrid|graph',
        required: false,
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Maximum number of results',
        required: false,
      },
    ],
    handler: async params => {
      return await advancedSearch({
        query: params.query,
        mode: params.mode || 'hybrid',
        limit: params.limit || 10,
      })
    },
    examples: [
      '/search CLOS architecture',
      '/search --mode=graph flow states',
      '/search --mode=semantic "cognitive optimization"',
    ],
  },

  {
    name: 'analyze_clos',
    command: '/clos',
    description: 'Run CLOS cognitive optimization analysis',
    parameters: [
      {
        name: 'input',
        type: 'string',
        description: 'Text to analyze (voice memo, journal entry, etc.)',
        required: true,
      },
      {
        name: 'mode',
        type: 'string',
        description: 'Analysis mode: flow|attention|cognitive-load|comprehensive',
        required: false,
      },
      {
        name: 'algorithms',
        type: 'array',
        description: 'Specific algorithms to run (default: all 37)',
        required: false,
      },
    ],
    endpoint: process.env.CLOS_API_URL + '/analyze',
    examples: [
      '/clos analyze "feeling scattered, can\'t focus"',
      '/clos --mode=flow "productive morning session"',
      '/clos --mode=comprehensive "detailed analysis of my day"',
    ],
  },

  {
    name: 'game_34_analysis',
    command: '/chess',
    description: 'Strategic analysis using Game 34 framework',
    parameters: [
      {
        name: 'situation',
        type: 'string',
        description: 'The strategic situation or decision to analyze',
        required: true,
      },
      {
        name: 'constraints',
        type: 'array',
        description: 'Known constraints or limitations',
        required: false,
      },
    ],
    endpoint: process.env.GAME_34_API_URL + '/analyze',
    examples: [
      '/chess "should I raise VC funding for Celaya Solutions?"',
      '/chess "launch Neural Child in Jan vs wait until March"',
    ],
  },

  {
    name: 'generate_artifact',
    command: '/artifact',
    description: 'Generate cognitive artifact prompt',
    parameters: [
      {
        name: 'category',
        type: 'string',
        description: 'Artifact category: strategic|analytical|creative|behavioral',
        required: true,
      },
      {
        name: 'complexity',
        type: 'string',
        description: 'Complexity level: basic|intermediate|advanced|expert',
        required: false,
      },
    ],
    endpoint: process.env.ARTIFACTS_API_URL + '/generate',
    examples: [
      '/artifact --category=strategic --complexity=advanced',
      '/artifact --category=analytical',
    ],
  },

  {
    name: 'neural_child_interact',
    command: '/neural',
    description: 'Interact with Neural Child developmental AI',
    parameters: [
      {
        name: 'prompt',
        type: 'string',
        description: 'Interaction prompt',
        required: true,
      },
      {
        name: 'network',
        type: 'string',
        description: 'Neural network: sensory|cognitive|emotional|motor|social',
        required: false,
      },
    ],
    endpoint: process.env.NEURAL_CHILD_API_URL + '/chat',
    examples: [
      '/neural "what patterns do you see in my voice memos?"',
      '/neural --network=emotional "analyze sentiment trends"',
    ],
  },

  {
    name: 'hyde_search',
    command: '/hyde',
    description: 'Hypothetical document embedding search for complex queries',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'Complex question or topic',
        required: true,
      },
    ],
    handler: async params => {
      return await hydeSearch(params.query, 10)
    },
    examples: [
      '/hyde "How does CLOS integrate with flow state optimization?"',
    ],
  },

  {
    name: 'multi_query_search',
    command: '/mqsearch',
    description: 'Multi-query search with automatic query expansion',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'Search query',
        required: true,
      },
    ],
    handler: async params => {
      return await multiQuerySearch(params.query, 10)
    },
    examples: [
      '/mqsearch "cognitive architecture patterns"',
    ],
  },
]

/**
 * Get tool by name
 */
export function getToolByName(name: string): Tool | undefined {
  return TOOLS.find(t => t.name === name)
}

/**
 * Get tool by command
 */
export function getToolByCommand(command: string): Tool | undefined {
  return TOOLS.find(t => t.command === command)
}

/**
 * Parse slash command
 */
export function parseSlashCommand(input: string): {
  command: string
  args: Record<string, any>
} | null {
  if (!input.startsWith('/')) {
    return null
  }

  const parts = input.split(' ')
  const command = parts[0]

  // Parse --flag=value or --flag "value" style args
  const args: Record<string, any> = {}
  let currentFlag: string | null = null
  let currentValue: string[] = []

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]

    if (part.startsWith('--')) {
      // Save previous flag if exists
      if (currentFlag) {
        args[currentFlag] = currentValue.join(' ')
      }

      // Parse new flag
      const flagParts = part.slice(2).split('=')
      currentFlag = flagParts[0]
      currentValue = flagParts[1] ? [flagParts[1]] : []
    } else if (currentFlag) {
      currentValue.push(part)
    } else {
      // Positional arg (combine into 'input' or 'query')
      const key = args.input ? 'query' : 'input'
      args[key] = args[key] ? args[key] + ' ' + part : part
    }
  }

  // Save last flag
  if (currentFlag) {
    args[currentFlag] = currentValue.join(' ')
  }

  return { command, args }
}

/**
 * Convert tools to Claude function calling format
 */
export function toolsToClaudeFunctions(): any[] {
  return TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        tool.parameters.map(p => [
          p.name,
          {
            type: p.type === 'array' ? 'array' : p.type === 'number' ? 'number' : 'string',
            description: p.description,
          },
        ])
      ),
      required: tool.parameters.filter(p => p.required).map(p => p.name),
    },
  }))
}
