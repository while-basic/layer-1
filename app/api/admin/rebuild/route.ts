import { NextResponse } from 'next/server'
import { clearKnowledgeBase } from '@/lib/db/weaviate'
import { clearGraph } from '@/lib/db/neo4j'
import { clearCache } from '@/lib/db/redis'

export async function POST() {
  try {
    console.log('🧹 Clearing all databases...')

    await Promise.all([clearKnowledgeBase(), clearGraph(), clearCache()])

    console.log('✅ All databases cleared')

    return NextResponse.json({
      success: true,
      message:
        'All databases cleared. Run the ingestion script to rebuild: npm run ingest',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Rebuild API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to clear databases',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
