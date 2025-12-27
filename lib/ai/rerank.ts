import { CohereClient } from 'cohere-ai'
import type { SearchResult } from '@/types'

let client: CohereClient | null = null

export function getCohereClient(): CohereClient {
  if (!client) {
    const apiKey = process.env.COHERE_API_KEY

    if (!apiKey) {
      throw new Error('COHERE_API_KEY environment variable not set')
    }

    client = new CohereClient({
      token: apiKey,
    })
  }

  return client
}

/**
 * Rerank search results using Cohere
 */
export async function rerankResults(
  query: string,
  results: SearchResult[],
  topN?: number
): Promise<SearchResult[]> {
  if (results.length === 0) {
    return []
  }

  const client = getCohereClient()

  try {
    const response = await client.rerank({
      model: 'rerank-english-v3.0',
      query,
      documents: results.map(r => r.text),
      topN: topN || results.length,
      returnDocuments: false,
    })

    // Reorder results based on Cohere's ranking
    const reranked = response.results
      .map(result => ({
        ...results[result.index],
        score: result.relevanceScore,
      }))
      .sort((a, b) => b.score - a.score)

    return reranked
  } catch (error) {
    console.error('Reranking failed, returning original results:', error)
    return results
  }
}

/**
 * Rerank with metadata boost
 * Combines Cohere reranking with metadata-based scoring
 */
export async function rerankWithMetadata(
  query: string,
  results: SearchResult[],
  options: {
    topN?: number
    typeBoost?: Record<string, number> // Boost certain document types
    recencyBoost?: boolean // Boost recent documents
  } = {}
): Promise<SearchResult[]> {
  const { topN, typeBoost = {}, recencyBoost = false } = options

  // First rerank with Cohere
  const reranked = await rerankResults(query, results, topN)

  // Apply metadata boosts
  const boosted = reranked.map(result => {
    let boost = 1.0

    // Type boost
    if (typeBoost[result.metadata.type]) {
      boost *= typeBoost[result.metadata.type]
    }

    // Recency boost (newer documents get higher score)
    if (recencyBoost && result.metadata.created_at) {
      const age = Date.now() - new Date(result.metadata.created_at).getTime()
      const daysSinceCreation = age / (1000 * 60 * 60 * 24)
      const recencyFactor = Math.exp(-daysSinceCreation / 365) // Exponential decay over a year
      boost *= 1 + recencyFactor * 0.2 // Up to 20% boost for very recent docs
    }

    return {
      ...result,
      score: result.score * boost,
    }
  })

  return boosted.sort((a, b) => b.score - a.score)
}

/**
 * Rerank and deduplicate results
 * Removes very similar chunks (likely from the same section)
 */
export async function rerankAndDeduplicate(
  query: string,
  results: SearchResult[],
  options: {
    topN?: number
    similarityThreshold?: number // 0-1, how similar to consider duplicate
  } = {}
): Promise<SearchResult[]> {
  const { topN, similarityThreshold = 0.95 } = options

  const reranked = await rerankResults(query, results, topN)

  // Deduplicate by checking if chunks are from the same source and very similar
  const deduplicated: SearchResult[] = []
  const seen = new Set<string>()

  for (const result of reranked) {
    // Create a fingerprint based on source and approximate content
    const fingerprint = `${result.metadata.source}:${result.text.slice(0, 100)}`

    // Simple deduplication based on source and first 100 chars
    if (!seen.has(fingerprint)) {
      deduplicated.push(result)
      seen.add(fingerprint)
    }
  }

  return deduplicated
}

/**
 * Multi-query reranking
 * Useful when you have multiple query variations
 */
export async function rerankMultiQuery(
  queries: string[],
  results: SearchResult[],
  topN?: number
): Promise<SearchResult[]> {
  const client = getCohereClient()

  try {
    // Rerank for each query and average the scores
    const allScores: Map<number, number[]> = new Map()

    for (const query of queries) {
      const response = await client.rerank({
        model: 'rerank-english-v3.0',
        query,
        documents: results.map(r => r.text),
        topN: topN || results.length,
        returnDocuments: false,
      })

      response.results.forEach(result => {
        const scores = allScores.get(result.index) || []
        scores.push(result.relevanceScore)
        allScores.set(result.index, scores)
      })
    }

    // Average scores across all queries
    const averaged = Array.from(allScores.entries()).map(([index, scores]) => ({
      ...results[index],
      score: scores.reduce((sum, s) => sum + s, 0) / scores.length,
    }))

    return averaged
      .sort((a, b) => b.score - a.score)
      .slice(0, topN || results.length)
  } catch (error) {
    console.error('Multi-query reranking failed:', error)
    return results
  }
}
