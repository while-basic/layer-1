import { NextRequest, NextResponse } from 'next/server'
import { executeTool, validateToolParameters, formatToolResult } from '@/lib/tools/executor'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tool, parameters } = body

    if (!tool) {
      return NextResponse.json({ error: 'Tool name is required' }, { status: 400 })
    }

    console.log(`🔧 Executing tool: ${tool}`)

    // Validate parameters
    const validation = validateToolParameters(tool, parameters || {})

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: validation.errors,
        },
        { status: 400 }
      )
    }

    // Execute tool
    const result = await executeTool(tool, parameters || {})

    // Format result for display
    const formatted = result.success ? formatToolResult(tool, result.data) : null

    return NextResponse.json({
      ...result,
      formatted,
    })
  } catch (error) {
    console.error('Tool execution API error:', error)
    return NextResponse.json(
      {
        error: 'Tool execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
