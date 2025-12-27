import weaviate, { WeaviateClient } from 'weaviate-ts-client'
import type { SearchResult } from '@/types'

let client: WeaviateClient | null = null

export function getWeaviateClient(): WeaviateClient {
  if (!client) {
    const scheme = process.env.WEAVIATE_SCHEME || 'https'
    const host = process.env.WEAVIATE_HOST
    const apiKey = process.env.WEAVIATE_API_KEY

    if (!host) {
      throw new Error('WEAVIATE_HOST environment variable not set')
    }

    client = weaviate.client({
      scheme: scheme as 'http' | 'https',
      host,
      apiKey: apiKey ? { apiKey } : undefined,
    })
  }

  return client
}

// Weaviate schema for knowledge chunks
export const KNOWLEDGE_CHUNK_CLASS = {
  class: 'KnowledgeChunk',
  vectorizer: 'none', // Using external embeddings (Voyage AI)
  properties: [
    {
      name: 'text',
      dataType: ['text'],
      description: 'The chunk content',
    },
    {
      name: 'source',
      dataType: ['string'],
      description: 'Source file path',
    },
    {
      name: 'section',
      dataType: ['string'],
      description: 'Section heading',
    },
    {
      name: 'type',
      dataType: ['string'],
      description: 'Document type: research|project|philosophy|documentation',
    },
    {
      name: 'tags',
      dataType: ['string[]'],
      description: 'Relevant tags',
    },
    {
      name: 'created_at',
      dataType: ['date'],
      description: 'Creation timestamp',
    },
    {
      name: 'chunk_index',
      dataType: ['int'],
      description: 'Index of this chunk in the document',
    },
  ],
}

/**
 * Initialize Weaviate schema
 */
export async function initializeSchema(): Promise<void> {
  const client = getWeaviateClient()

  try {
    const exists = await client.schema.exists('KnowledgeChunk')

    if (!exists) {
      await client.schema.classCreator().withClass(KNOWLEDGE_CHUNK_CLASS).do()
      console.log('✅ Created KnowledgeChunk schema in Weaviate')
    } else {
      console.log('✅ KnowledgeChunk schema already exists')
    }
  } catch (error) {
    console.error('Failed to initialize Weaviate schema:', error)
    throw error
  }
}

/**
 * Hybrid search (vector + BM25)
 */
export async function hybridSearch(
  query: string,
  queryEmbedding: number[],
  options: {
    alpha?: number // 0=BM25, 1=vector (default 0.7)
    limit?: number
    filters?: any
  } = {}
): Promise<SearchResult[]> {
  const { alpha = 0.7, limit = 10, filters } = options
  const client = getWeaviateClient()

  try {
    let queryBuilder = client.graphql
      .get()
      .withClassName('KnowledgeChunk')
      .withHybrid({
        query,
        alpha,
        vector: queryEmbedding,
      })
      .withLimit(limit)
      .withFields('text source section type tags chunk_index created_at _additional { id score }')

    if (filters) {
      queryBuilder = queryBuilder.withWhere(filters)
    }

    const result = await queryBuilder.do()

    const chunks = result.data.Get.KnowledgeChunk || []

    return chunks.map((chunk: any) => ({
      id: chunk._additional.id,
      text: chunk.text,
      score: chunk._additional.score || 0,
      metadata: {
        source: chunk.source,
        section: chunk.section,
        type: chunk.type,
        tags: chunk.tags || [],
        chunk_index: chunk.chunk_index,
        created_at: chunk.created_at,
      },
    }))
  } catch (error) {
    console.error('Hybrid search failed:', error)
    throw error
  }
}

/**
 * Pure vector search
 */
export async function vectorSearch(
  queryEmbedding: number[],
  limit = 10,
  filters?: any
): Promise<SearchResult[]> {
  const client = getWeaviateClient()

  try {
    let queryBuilder = client.graphql
      .get()
      .withClassName('KnowledgeChunk')
      .withNearVector({
        vector: queryEmbedding,
      })
      .withLimit(limit)
      .withFields('text source section type tags chunk_index created_at _additional { id distance }')

    if (filters) {
      queryBuilder = queryBuilder.withWhere(filters)
    }

    const result = await queryBuilder.do()
    const chunks = result.data.Get.KnowledgeChunk || []

    return chunks.map((chunk: any) => ({
      id: chunk._additional.id,
      text: chunk.text,
      score: 1 - (chunk._additional.distance || 0), // Convert distance to similarity
      metadata: {
        source: chunk.source,
        section: chunk.section,
        type: chunk.type,
        tags: chunk.tags || [],
        chunk_index: chunk.chunk_index,
        created_at: chunk.created_at,
      },
    }))
  } catch (error) {
    console.error('Vector search failed:', error)
    throw error
  }
}

/**
 * BM25 keyword search
 */
export async function bm25Search(
  query: string,
  limit = 10,
  filters?: any
): Promise<SearchResult[]> {
  const client = getWeaviateClient()

  try {
    let queryBuilder = client.graphql
      .get()
      .withClassName('KnowledgeChunk')
      .withBm25({
        query,
      })
      .withLimit(limit)
      .withFields('text source section type tags chunk_index created_at _additional { id score }')

    if (filters) {
      queryBuilder = queryBuilder.withWhere(filters)
    }

    const result = await queryBuilder.do()
    const chunks = result.data.Get.KnowledgeChunk || []

    return chunks.map((chunk: any) => ({
      id: chunk._additional.id,
      text: chunk.text,
      score: chunk._additional.score || 0,
      metadata: {
        source: chunk.source,
        section: chunk.section,
        type: chunk.type,
        tags: chunk.tags || [],
        chunk_index: chunk.chunk_index,
        created_at: chunk.created_at,
      },
    }))
  } catch (error) {
    console.error('BM25 search failed:', error)
    throw error
  }
}

/**
 * Add a knowledge chunk to Weaviate
 */
export async function addChunk(
  text: string,
  embedding: number[],
  metadata: {
    source: string
    section: string
    type: string
    tags: string[]
    chunk_index: number
  }
): Promise<string> {
  const client = getWeaviateClient()

  try {
    const result = await client.data
      .creator()
      .withClassName('KnowledgeChunk')
      .withProperties({
        text,
        source: metadata.source,
        section: metadata.section,
        type: metadata.type,
        tags: metadata.tags,
        created_at: new Date().toISOString(),
        chunk_index: metadata.chunk_index,
      })
      .withVector(embedding)
      .do()

    return result.id
  } catch (error) {
    console.error('Failed to add chunk:', error)
    throw error
  }
}

/**
 * Clear all data from KnowledgeChunk class
 */
export async function clearKnowledgeBase(): Promise<void> {
  const client = getWeaviateClient()

  try {
    await client.schema.classDeleter().withClassName('KnowledgeChunk').do()
    console.log('✅ Deleted KnowledgeChunk class')

    await initializeSchema()
    console.log('✅ Re-created KnowledgeChunk schema')
  } catch (error) {
    console.error('Failed to clear knowledge base:', error)
    throw error
  }
}

/**
 * Get statistics about the knowledge base
 */
export async function getStats(): Promise<{
  totalChunks: number
  typeDistribution: Record<string, number>
}> {
  const client = getWeaviateClient()

  try {
    const result = await client.graphql
      .aggregate()
      .withClassName('KnowledgeChunk')
      .withFields('meta { count } groupedBy { path value } type')
      .do()

    const count = result.data.Aggregate.KnowledgeChunk[0]?.meta?.count || 0

    return {
      totalChunks: count,
      typeDistribution: {}, // Can be enhanced
    }
  } catch (error) {
    console.error('Failed to get stats:', error)
    return {
      totalChunks: 0,
      typeDistribution: {},
    }
  }
}
