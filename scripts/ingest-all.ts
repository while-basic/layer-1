#!/usr/bin/env tsx

import { findMarkdownFiles, parseMarkdown } from '../lib/ingest/markdown'
import { chunkDocument } from '../lib/ingest/chunker'
import { generateDocumentEmbeddings } from '../lib/ai/embeddings'
import { initializeSchema, addChunk, getStats as getWeaviateStats } from '../lib/db/weaviate'
import { initializeConstraints, getGraphStats } from '../lib/db/neo4j'
import { buildKnowledgeGraph } from '../lib/ingest/graph-builder'
import type { ParsedDocument } from '../types'

async function main() {
  console.log('🚀 Starting knowledge base ingestion...\n')

  const knowledgeBaseDir = './knowledgebase'

  try {
    // Step 1: Initialize databases
    console.log('📊 Initializing databases...')
    await initializeSchema()
    await initializeConstraints()
    console.log('✅ Databases initialized\n')

    // Step 2: Find all markdown files
    console.log(`🔍 Scanning ${knowledgeBaseDir} for markdown files...`)
    const files = await findMarkdownFiles(knowledgeBaseDir)
    console.log(`Found ${files.length} markdown files\n`)

    if (files.length === 0) {
      console.log('❌ No markdown files found')
      return
    }

    // Step 3: Parse documents
    console.log('📖 Parsing documents...')
    const documents: ParsedDocument[] = []

    for (const file of files) {
      try {
        const doc = await parseMarkdown(file)
        documents.push(doc)
        console.log(`   ✅ ${file}`)
      } catch (error) {
        console.error(`   ❌ Failed to parse ${file}:`, error)
      }
    }

    console.log(`\n✅ Parsed ${documents.length} documents\n`)

    // Step 4: Chunk documents
    console.log('✂️  Chunking documents...')
    const allChunks: Array<{
      text: string
      metadata: any
    }> = []

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i]
      const source = files[i]

      const chunks = await chunkDocument(doc, source)

      chunks.forEach(chunk => {
        allChunks.push({
          text: chunk.text,
          metadata: {
            source: chunk.metadata.source,
            section: chunk.metadata.section,
            type: doc.metadata.type,
            tags: doc.metadata.tags,
            chunk_index: chunk.metadata.chunk_index,
          },
        })
      })

      console.log(`   ✅ ${source}: ${chunks.length} chunks`)
    }

    console.log(`\n📦 Total chunks: ${allChunks.length}\n`)

    // Step 5: Generate embeddings
    console.log('🧠 Generating embeddings...')
    const embeddings = await generateDocumentEmbeddings(
      allChunks.map(c => c.text),
      (current, total) => {
        if (current % 50 === 0 || current === total) {
          console.log(`   Progress: ${current}/${total}`)
        }
      }
    )

    console.log('✅ Embeddings generated\n')

    // Step 6: Store in Weaviate
    console.log('💾 Storing in vector database...')

    for (let i = 0; i < allChunks.length; i++) {
      const chunk = allChunks[i]
      const embedding = embeddings[i]

      try {
        await addChunk(chunk.text, embedding, chunk.metadata)

        if ((i + 1) % 50 === 0 || i === allChunks.length - 1) {
          console.log(`   Stored ${i + 1}/${allChunks.length} chunks`)
        }
      } catch (error) {
        console.error(`   ❌ Failed to store chunk ${i}:`, error)
      }
    }

    console.log('✅ Vector database populated\n')

    // Step 7: Build knowledge graph
    console.log('🕸️  Building knowledge graph...')
    await buildKnowledgeGraph(documents, (current, total) => {
      console.log(`   Progress: ${current}/${total} documents`)
    })

    console.log('✅ Knowledge graph built\n')

    // Step 8: Show statistics
    console.log('📊 Final Statistics:\n')

    const weaviateStats = await getWeaviateStats()
    console.log(`   Vector Database:`)
    console.log(`   - Total chunks: ${weaviateStats.totalChunks}`)

    const graphStats = await getGraphStats()
    console.log(`\n   Knowledge Graph:`)
    console.log(`   - Total nodes: ${graphStats.totalNodes}`)
    console.log(`   - Total relationships: ${graphStats.totalRelationships}`)
    console.log(`   - Node types:`)
    Object.entries(graphStats.nodeTypeDistribution).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count}`)
    })

    console.log('\n✅ Ingestion complete!')
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error)
    process.exit(1)
  }
}

main()
