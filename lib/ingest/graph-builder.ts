import { chatCompletion } from '@/lib/ai/claude'
import { createNode, createRelationship, NodeType, RelationType } from '@/lib/db/neo4j'
import type { ParsedDocument, GraphNode, GraphEdge } from '@/types'

/**
 * Extract entities and relationships from a document using Claude
 */
export async function extractEntitiesAndRelations(
  doc: ParsedDocument
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const prompt = `
Analyze this document and extract structured information for a knowledge graph.

Document title: ${doc.metadata.title}
Document type: ${doc.metadata.type}
Tags: ${doc.metadata.tags.join(', ')}

Content (first 3000 chars):
${doc.content.slice(0, 3000)}

Extract:
1. Key concepts, projects, tools, theories, and techniques mentioned
2. Relationships between these entities
3. Classify each entity type

Return JSON:
{
  "entities": [
    {
      "name": "CLOS",
      "type": "Project",
      "description": "Cognitive Load Optimization System for flow states"
    },
    {
      "name": "Flow States",
      "type": "Concept",
      "description": "Optimal cognitive performance state"
    }
  ],
  "relationships": [
    {
      "from": "CLOS",
      "to": "Flow States",
      "type": "ANALYZES",
      "description": "CLOS analyzes and optimizes flow states"
    }
  ]
}

Valid entity types: Concept, Project, Person, Tool, Technique, Theory
Valid relationship types: RELATES_TO, ENABLES, REQUIRES, PART_OF, DOCUMENTED_IN, USES, IMPLEMENTS, ANALYZES, DERIVES_FROM

Return ONLY valid JSON, no additional text.
  `.trim()

  try {
    const response = await chatCompletion(prompt, [], {
      maxTokens: 2000,
      temperature: 0.3,
    })

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('No JSON found in entity extraction response')
      return { nodes: [], edges: [] }
    }

    const data = JSON.parse(jsonMatch[0])

    // Convert to graph format
    const nodes: GraphNode[] = (data.entities || []).map((e: any) => ({
      label: e.type || NodeType.CONCEPT,
      properties: {
        name: e.name,
        description: e.description,
        source: doc.metadata.title,
        type: doc.metadata.type,
      },
    }))

    const edges: GraphEdge[] = (data.relationships || []).map((r: any) => ({
      from: r.from,
      to: r.to,
      type: r.type || RelationType.RELATES_TO,
      properties: {
        description: r.description,
      },
    }))

    return { nodes, edges }
  } catch (error) {
    console.error('Entity extraction failed:', error)
    return { nodes: [], edges: [] }
  }
}

/**
 * Build knowledge graph from a single document
 */
export async function buildGraphFromDocument(doc: ParsedDocument): Promise<void> {
  console.log(`🕸️  Extracting graph data from: ${doc.metadata.title}`)

  const { nodes, edges } = await extractEntitiesAndRelations(doc)

  console.log(`   Found ${nodes.length} entities, ${edges.length} relationships`)

  // Create nodes
  for (const node of nodes) {
    try {
      await createNode(node)
    } catch (error) {
      console.error(`Failed to create node ${node.properties.name}:`, error)
    }
  }

  // Create edges
  for (const edge of edges) {
    try {
      await createRelationship(edge)
    } catch (error) {
      console.error(`Failed to create edge ${edge.from} -> ${edge.to}:`, error)
    }
  }

  // Also create a document node
  try {
    await createNode({
      label: NodeType.DOCUMENT,
      properties: {
        name: doc.metadata.title,
        source: doc.metadata.title,
        type: doc.metadata.type,
        tags: doc.metadata.tags.join(', '),
        date: doc.metadata.date,
      },
    })

    // Link entities to this document
    for (const node of nodes) {
      await createRelationship({
        from: node.properties.name,
        to: doc.metadata.title,
        type: RelationType.DOCUMENTED_IN,
      })
    }
  } catch (error) {
    console.error('Failed to create document node:', error)
  }
}

/**
 * Build knowledge graph from multiple documents
 */
export async function buildKnowledgeGraph(
  documents: ParsedDocument[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  console.log(`🕸️  Building knowledge graph from ${documents.length} documents...`)

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]

    try {
      await buildGraphFromDocument(doc)

      if (onProgress) {
        onProgress(i + 1, documents.length)
      }
    } catch (error) {
      console.error(`Failed to process document ${doc.metadata.title}:`, error)
    }

    // Rate limiting: wait between docs to avoid overwhelming Claude API
    if (i < documents.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log('✅ Knowledge graph built')
}

/**
 * Extract entity mentions from text (simpler, rule-based approach)
 */
export function extractEntityMentions(text: string): string[] {
  const entities = new Set<string>()

  // Common patterns for entities
  const patterns = [
    // Acronyms in caps
    /\b[A-Z]{2,}\b/g,
    // Capitalized phrases (2-3 words)
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g,
  ]

  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach(match => entities.add(match))
    }
  }

  // Filter out common words
  const stopwords = new Set(['The', 'This', 'That', 'These', 'Those', 'It', 'AI'])

  return Array.from(entities).filter(e => !stopwords.has(e))
}
