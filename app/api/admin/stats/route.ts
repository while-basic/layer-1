import { NextResponse } from 'next/server'
import { getStats as getWeaviateStats } from '@/lib/db/weaviate'
import { getGraphStats } from '@/lib/db/neo4j'
import { getCacheStats } from '@/lib/db/redis'

export async function GET() {
  try {
    console.log('📊 Fetching system statistics...')

    const [weaviateStats, graphStats, cacheStats] = await Promise.all([
      getWeaviateStats(),
      getGraphStats(),
      getCacheStats(),
    ])

    return NextResponse.json({
      vectorDatabase: {
        totalChunks: weaviateStats.totalChunks,
        typeDistribution: weaviateStats.typeDistribution,
      },
      knowledgeGraph: {
        totalNodes: graphStats.totalNodes,
        totalRelationships: graphStats.totalRelationships,
        nodeTypeDistribution: graphStats.nodeTypeDistribution,
      },
      cache: {
        totalKeys: cacheStats.totalKeys,
        memoryUsed: cacheStats.memoryUsed,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
