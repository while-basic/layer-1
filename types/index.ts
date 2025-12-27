// Core types for the AI Research Platform

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  toolResults?: ToolResult[]
  timestamp: number
}

export interface Source {
  source: string
  section: string
  text: string
  score: number
  type: string
  tags?: string[]
}

export interface ToolResult {
  tool: string
  data: any
  success: boolean
  error?: string
}

export interface SearchResult {
  id: string
  text: string
  score: number
  metadata: {
    source: string
    section: string
    type: string
    tags: string[]
    chunk_index: number
    created_at: string
  }
}

export interface SearchOptions {
  query: string
  mode?: 'semantic' | 'keyword' | 'hybrid' | 'graph'
  filters?: {
    type?: string[]
    tags?: string[]
    source?: string
  }
  limit?: number
  rerank?: boolean
}

export interface Tool {
  name: string
  command: string
  description: string
  parameters: ToolParameter[]
  endpoint?: string
  handler?: (params: any) => Promise<any>
  examples: string[]
}

export interface ToolParameter {
  name: string
  type: string
  description: string
  required: boolean
}

export interface KnowledgeChunk {
  id: string
  text: string
  embedding?: number[]
  source: string
  section?: string
  type: string
  tags: string[]
  created_at: string
  chunk_index: number
}

export interface ParsedDocument {
  content: string
  metadata: {
    title: string
    type: string
    tags: string[]
    date: string
    [key: string]: any
  }
  sections: DocumentSection[]
}

export interface DocumentSection {
  heading: string
  level: number
  content: string
}

export interface GraphNode {
  label: string
  properties: {
    name: string
    description?: string
    type?: string
    source?: string
    [key: string]: any
  }
}

export interface GraphEdge {
  from: string
  to: string
  type: string
  properties?: Record<string, any>
}

export interface ChatCompletionOptions {
  systemPrompt: string
  messages: Message[]
  tools?: Tool[]
  maxTokens?: number
  temperature?: number
  stream?: boolean
}
