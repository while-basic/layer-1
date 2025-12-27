import { VoyageAIClient } from 'voyageai'
import { getCachedEmbedding, cacheEmbedding } from '@/lib/db/redis'

let client: VoyageAIClient | null = null

export function getVoyageClient(): VoyageAIClient {
  if (!client) {
    const apiKey = process.env.VOYAGE_API_KEY

    if (!apiKey) {
      throw new Error('VOYAGE_API_KEY environment variable not set')
    }

    client = new VoyageAIClient({ apiKey })
  }

  return client
}

/**
 * Generate embeddings for a single text
 */
export async function generateEmbedding(
  text: string,
  useCache = true
): Promise<number[]> {
  // Try cache first
  if (useCache) {
    const cached = await getCachedEmbedding(text)
    if (cached) {
      return cached
    }
  }

  const client = getVoyageClient()

  try {
    const response = await client.embed({
      input: text,
      model: 'voyage-large-2-instruct',
    })

    const embedding = response.data[0].embedding

    // Cache the result
    if (useCache) {
      await cacheEmbedding(text, embedding)
    }

    return embedding
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    throw error
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(
  texts: string[],
  useCache = true
): Promise<number[][]> {
  // Check cache for all texts
  if (useCache) {
    const cached = await Promise.all(texts.map(text => getCachedEmbedding(text)))
    const allCached = cached.every(c => c !== null)

    if (allCached) {
      return cached as number[][]
    }
  }

  const client = getVoyageClient()

  try {
    // Voyage AI supports batch embedding
    const response = await client.embed({
      input: texts,
      model: 'voyage-large-2-instruct',
    })

    const embeddings = response.data.map(item => item.embedding)

    // Cache all embeddings
    if (useCache) {
      await Promise.all(
        texts.map((text, i) => cacheEmbedding(text, embeddings[i]))
      )
    }

    return embeddings
  } catch (error) {
    console.error('Failed to generate embeddings:', error)
    throw error
  }
}

/**
 * Get query embedding optimized for search
 */
export async function getQueryEmbedding(query: string): Promise<number[]> {
  return generateEmbedding(query, true)
}

/**
 * Generate embeddings for document chunks with progress callback
 */
export async function generateDocumentEmbeddings(
  chunks: string[],
  onProgress?: (current: number, total: number) => void
): Promise<number[][]> {
  const batchSize = 128 // Voyage AI max batch size
  const embeddings: number[][] = []

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const batchEmbeddings = await generateEmbeddings(batch, true)
    embeddings.push(...batchEmbeddings)

    if (onProgress) {
      onProgress(Math.min(i + batchSize, chunks.length), chunks.length)
    }
  }

  return embeddings
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimension')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Find most similar texts from a set
 */
export async function findMostSimilar(
  query: string,
  candidates: string[],
  topK = 5
): Promise<Array<{ text: string; score: number; index: number }>> {
  const queryEmbedding = await generateEmbedding(query)
  const candidateEmbeddings = await generateEmbeddings(candidates)

  const similarities = candidateEmbeddings.map((embedding, index) => ({
    text: candidates[index],
    score: cosineSimilarity(queryEmbedding, embedding),
    index,
  }))

  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
