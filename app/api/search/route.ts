import { NextRequest, NextResponse } from 'next/server'
import { advancedSearch, hydeSearch, multiQuerySearch } from '@/lib/search/hybrid'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, mode = 'hybrid', limit = 10, rerank = true, method = 'standard' } = body

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    console.log(`🔍 Search: "${query}" (method: ${method}, mode: ${mode})`)

    let results

    switch (method) {
      case 'hyde':
        results = await hydeSearch(query, limit)
        break

      case 'multi':
        results = await multiQuerySearch(query, limit)
        break

      case 'standard':
      default:
        results = await advancedSearch({
          query,
          mode,
          limit,
          rerank,
        })
        break
    }

    return NextResponse.json({
      results,
      count: results.length,
      query,
      method,
      mode,
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
