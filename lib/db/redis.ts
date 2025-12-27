import { Redis } from '@upstash/redis'
import { createHash } from 'crypto'

let redis: Redis | null = null

export function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_URL
    const token = process.env.UPSTASH_REDIS_TOKEN

    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN must be set')
    }

    redis = new Redis({
      url,
      token,
    })
  }

  return redis
}

/**
 * Hash a vector for use as a cache key
 */
export function hashVector(vector: number[]): string {
  const hash = createHash('sha256')
  hash.update(JSON.stringify(vector))
  return hash.digest('hex')
}

/**
 * Cache search results
 */
export async function cacheSearch(
  queryEmbedding: number[],
  results: any[],
  ttl = 3600 // 1 hour
): Promise<void> {
  const client = getRedisClient()
  const key = `search:${hashVector(queryEmbedding)}`

  try {
    await client.setex(key, ttl, JSON.stringify(results))
  } catch (error) {
    console.error('Failed to cache search results:', error)
  }
}

/**
 * Get cached search results
 */
export async function getCachedSearch(
  queryEmbedding: number[]
): Promise<any[] | null> {
  const client = getRedisClient()
  const key = `search:${hashVector(queryEmbedding)}`

  try {
    const cached = await client.get(key)
    return cached ? JSON.parse(cached as string) : null
  } catch (error) {
    console.error('Failed to get cached search:', error)
    return null
  }
}

/**
 * Cache embeddings
 */
export async function cacheEmbedding(
  text: string,
  embedding: number[],
  ttl = 86400 // 24 hours
): Promise<void> {
  const client = getRedisClient()
  const hash = createHash('sha256').update(text).digest('hex')
  const key = `embedding:${hash}`

  try {
    await client.setex(key, ttl, JSON.stringify(embedding))
  } catch (error) {
    console.error('Failed to cache embedding:', error)
  }
}

/**
 * Get cached embedding
 */
export async function getCachedEmbedding(text: string): Promise<number[] | null> {
  const client = getRedisClient()
  const hash = createHash('sha256').update(text).digest('hex')
  const key = `embedding:${hash}`

  try {
    const cached = await client.get(key)
    return cached ? JSON.parse(cached as string) : null
  } catch (error) {
    console.error('Failed to get cached embedding:', error)
    return null
  }
}

/**
 * Cache query rewriting
 */
export async function cacheQueryRewrite(
  originalQuery: string,
  rewrittenQuery: string,
  ttl = 3600
): Promise<void> {
  const client = getRedisClient()
  const hash = createHash('sha256').update(originalQuery).digest('hex')
  const key = `query-rewrite:${hash}`

  try {
    await client.setex(key, ttl, rewrittenQuery)
  } catch (error) {
    console.error('Failed to cache query rewrite:', error)
  }
}

/**
 * Get cached query rewrite
 */
export async function getCachedQueryRewrite(
  originalQuery: string
): Promise<string | null> {
  const client = getRedisClient()
  const hash = createHash('sha256').update(originalQuery).digest('hex')
  const key = `query-rewrite:${hash}`

  try {
    const cached = await client.get(key)
    return cached as string | null
  } catch (error) {
    console.error('Failed to get cached query rewrite:', error)
    return null
  }
}

/**
 * Increment rate limit counter
 */
export async function incrementRateLimit(
  identifier: string,
  limit: number,
  window = 60 // 1 minute
): Promise<{ allowed: boolean; remaining: number }> {
  const client = getRedisClient()
  const key = `rate-limit:${identifier}`

  try {
    const count = await client.incr(key)

    if (count === 1) {
      await client.expire(key, window)
    }

    const allowed = count <= limit
    const remaining = Math.max(0, limit - count)

    return { allowed, remaining }
  } catch (error) {
    console.error('Failed to check rate limit:', error)
    return { allowed: true, remaining: limit }
  }
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<void> {
  const client = getRedisClient()

  try {
    await client.flushdb()
    console.log('✅ Cleared Redis cache')
  } catch (error) {
    console.error('Failed to clear cache:', error)
    throw error
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalKeys: number
  memoryUsed: string
}> {
  const client = getRedisClient()

  try {
    const info = await client.dbsize()

    return {
      totalKeys: info,
      memoryUsed: 'N/A', // Upstash doesn't expose this easily
    }
  } catch (error) {
    console.error('Failed to get cache stats:', error)
    return {
      totalKeys: 0,
      memoryUsed: 'N/A',
    }
  }
}
