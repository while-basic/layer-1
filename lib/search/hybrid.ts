import { hybridSearch as weaviateHybridSearch, vectorSearch, bm25Search } from '@/lib/db/weaviate'
import { findRelatedDocuments } from '@/lib/db/neo4j'
import { generateEmbedding, getQueryEmbedding } from '@/lib/ai/embeddings'
import { rerankResults } from '@/lib/ai/rerank'
import { rewriteQuery, generateHypotheticalDocument, extractEntities } from '@/lib/ai/claude'
import { getCachedSearch, cacheSearch, getCachedQueryRewrite, cacheQueryRewrite } from '@/lib/db/redis'
import type { SearchResult, SearchOptions } from '@/types'

/**
 * Advanced search with multiple strategies
 */
export async function advancedSearch(options: SearchOptions): Promise<SearchResult[]> {
  const { query, mode = 'hybrid', filters, limit = 10, rerank = true } = options

  console.log(`🔍 Search query: "${query}" (mode: ${mode})`)

  let candidates: SearchResult[] = []
  const queryEmbedding = await getQueryEmbedding(query)

  // Check cache first
  const cached = await getCachedSearch(queryEmbedding)
  if (cached) {
    console.log('✅ Cache hit')
    return cached.slice(0, limit)
  }

  // Step 1: Query rewriting
  const cachedRewrite = await getCachedQueryRewrite(query)
  const rewrittenQuery = cachedRewrite || await rewriteQuery(query)

  if (!cachedRewrite) {
    await cacheQueryRewrite(query, rewrittenQuery)
  }

  if (rewrittenQuery !== query) {
    console.log(`🔄 Rewrote query: "${query}" → "${rewrittenQuery}"`)
  }

  // Step 2: Multi-strategy retrieval
  const retrievalLimit = limit * 3 // Over-fetch for reranking

  switch (mode) {
    case 'semantic':
      candidates = await vectorSearch(queryEmbedding, retrievalLimit, filters)
      break

    case 'keyword':
      candidates = await bm25Search(rewrittenQuery, retrievalLimit, filters)
      break

    case 'hybrid':
      candidates = await weaviateHybridSearch(rewrittenQuery, queryEmbedding, {
        alpha: 0.7,
        limit: retrievalLimit,
        filters,
      })
      break

    case 'graph':
      candidates = await graphSearch(query, queryEmbedding, retrievalLimit, filters)
      break
  }

  console.log(`📊 Retrieved ${candidates.length} candidates`)

  // Step 3: Reranking
  if (rerank && candidates.length > limit) {
    candidates = await rerankResults(rewrittenQuery, candidates, limit)
    console.log(`🎯 Reranked to top ${limit}`)
  }

  // Step 4: Deduplication
  candidates = deduplicateResults(candidates)

  // Cache the results
  await cacheSearch(queryEmbedding, candidates)

  return candidates.slice(0, limit)
}

/**
 * HyDE (Hypothetical Document Embeddings) search
 * Generates a "perfect answer" and searches for docs similar to it
 */
export async function hydeSearch(
  query: string,
  limit = 10
): Promise<SearchResult[]> {
  console.log('🔮 Using HyDE search')

  // Generate hypothetical perfect answer
  const hypothetical = await generateHypotheticalDocument(query)
  console.log(`📝 Generated hypothetical doc (${hypothetical.length} chars)`)

  // Embed the hypothetical answer
  const embedding = await generateEmbedding(hypothetical)

  // Find real documents similar to hypothetical
  const results = await vectorSearch(embedding, limit)

  return results
}

/**
 * Graph-based search
 * Finds documents via knowledge graph relationships
 */
async function graphSearch(
  query: string,
  queryEmbedding: number[],
  limit: number,
  filters?: any
): Promise<SearchResult[]> {
  console.log('🕸️  Using graph search')

  // Extract entities from query
  const entities = await extractEntities(query)
  console.log(`🏷️  Extracted entities: ${entities.join(', ')}`)

  if (entities.length === 0) {
    // Fallback to hybrid search if no entities found
    return weaviateHybridSearch(query, queryEmbedding, {
      alpha: 0.7,
      limit,
      filters,
    })
  }

  // Find documents related to these entities via graph
  const relatedDocs: Array<{ source: string; section?: string }> = []

  for (const entity of entities) {
    const docs = await findRelatedDocuments(entity, 10)
    relatedDocs.push(...docs)
  }

  if (relatedDocs.length === 0) {
    // Fallback to hybrid search
    return weaviateHybridSearch(query, queryEmbedding, {
      alpha: 0.7,
      limit,
      filters,
    })
  }

  // Fetch chunks from Weaviate based on sources found in graph
  const results = await vectorSearch(queryEmbedding, limit * 2, {
    operator: 'Or',
    operands: relatedDocs.map(doc => ({
      path: ['source'],
      operator: 'Equal',
      valueString: doc.source,
    })),
  })

  return results
}

/**
 * Multi-query search
 * Expands query into multiple variations and merges results
 */
export async function multiQuerySearch(
  query: string,
  limit = 10
): Promise<SearchResult[]> {
  console.log('🔀 Using multi-query search')

  // Generate query variations
  const variations = [
    query,
    await rewriteQuery(query),
    // Could add more variations here
  ]

  const allResults: SearchResult[] = []
  const seenIds = new Set<string>()

  for (const variation of variations) {
    const queryEmbedding = await getQueryEmbedding(variation)
    const results = await weaviateHybridSearch(variation, queryEmbedding, {
      alpha: 0.7,
      limit: limit * 2,
    })

    // Deduplicate by ID
    for (const result of results) {
      if (!seenIds.has(result.id)) {
        allResults.push(result)
        seenIds.add(result.id)
      }
    }
  }

  // Sort by score and return top K
  return allResults
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Deduplicate search results
 * Removes duplicate chunks or very similar content
 */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  const deduplicated: SearchResult[] = []

  for (const result of results) {
    // Create fingerprint based on source and chunk index
    const fingerprint = `${result.metadata.source}:${result.metadata.chunk_index}`

    if (!seen.has(fingerprint)) {
      deduplicated.push(result)
      seen.add(fingerprint)
    }
  }

  return deduplicated
}

/**
 * Format search results for Claude consumption
 */
export function formatContextForClaude(
  results: SearchResult[]
): Array<{ text: string; source: string; section: string; score: number }> {
  return results.map(r => ({
    text: r.text,
    source: r.metadata.source,
    section: r.metadata.section,
    score: r.score,
  }))
}

/**
 * Get result statistics
 */
export function getSearchStats(results: SearchResult[]): {
  avgScore: number
  scoreRange: { min: number; max: number }
  typeDistribution: Record<string, number>
  sourceDistribution: Record<string, number>
} {
  if (results.length === 0) {
    return {
      avgScore: 0,
      scoreRange: { min: 0, max: 0 },
      typeDistribution: {},
      sourceDistribution: {},
    }
  }

  const scores = results.map(r => r.score)
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length
  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)

  const typeDistribution: Record<string, number> = {}
  const sourceDistribution: Record<string, number> = {}

  for (const result of results) {
    const type = result.metadata.type
    const source = result.metadata.source

    typeDistribution[type] = (typeDistribution[type] || 0) + 1
    sourceDistribution[source] = (sourceDistribution[source] || 0) + 1
  }

  return {
    avgScore,
    scoreRange: { min: minScore, max: maxScore },
    typeDistribution,
    sourceDistribution,
  }
}
