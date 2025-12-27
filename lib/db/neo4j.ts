import neo4j, { Driver, Session } from 'neo4j-driver'
import type { GraphNode, GraphEdge } from '@/types'

let driver: Driver | null = null

export function getNeo4jDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI
    const user = process.env.NEO4J_USER || 'neo4j'
    const password = process.env.NEO4J_PASSWORD

    if (!uri || !password) {
      throw new Error('NEO4J_URI and NEO4J_PASSWORD must be set')
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
  }

  return driver
}

export function getSession(): Session {
  return getNeo4jDriver().session()
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close()
    driver = null
  }
}

// Node types in the knowledge graph
export enum NodeType {
  CONCEPT = 'Concept',
  PROJECT = 'Project',
  PERSON = 'Person',
  TOOL = 'Tool',
  DOCUMENT = 'Document',
  TECHNIQUE = 'Technique',
  THEORY = 'Theory',
}

// Relationship types
export enum RelationType {
  RELATES_TO = 'RELATES_TO',
  ENABLES = 'ENABLES',
  REQUIRES = 'REQUIRES',
  PART_OF = 'PART_OF',
  DOCUMENTED_IN = 'DOCUMENTED_IN',
  USES = 'USES',
  IMPLEMENTS = 'IMPLEMENTS',
  ANALYZES = 'ANALYZES',
  DERIVES_FROM = 'DERIVES_FROM',
}

/**
 * Initialize Neo4j constraints and indexes
 */
export async function initializeConstraints(): Promise<void> {
  const session = getSession()

  try {
    // Create uniqueness constraints for node types
    const nodeTypes = Object.values(NodeType)

    for (const nodeType of nodeTypes) {
      try {
        await session.run(`
          CREATE CONSTRAINT ${nodeType.toLowerCase()}_name_unique
          IF NOT EXISTS
          FOR (n:${nodeType})
          REQUIRE n.name IS UNIQUE
        `)
      } catch (error) {
        // Constraint might already exist
        console.log(`Constraint for ${nodeType} might already exist`)
      }
    }

    console.log('✅ Neo4j constraints initialized')
  } catch (error) {
    console.error('Failed to initialize Neo4j constraints:', error)
    throw error
  } finally {
    await session.close()
  }
}

/**
 * Create or update a node
 */
export async function createNode(node: GraphNode): Promise<void> {
  const session = getSession()

  try {
    await session.run(
      `
      MERGE (n:${node.label} {name: $name})
      SET n += $properties
      `,
      {
        name: node.properties.name,
        properties: node.properties,
      }
    )
  } catch (error) {
    console.error(`Failed to create node:`, error)
    throw error
  } finally {
    await session.close()
  }
}

/**
 * Create a relationship between two nodes
 */
export async function createRelationship(edge: GraphEdge): Promise<void> {
  const session = getSession()

  try {
    await session.run(
      `
      MATCH (a {name: $from})
      MATCH (b {name: $to})
      MERGE (a)-[r:${edge.type}]->(b)
      ${edge.properties ? 'SET r += $properties' : ''}
      `,
      {
        from: edge.from,
        to: edge.to,
        properties: edge.properties || {},
      }
    )
  } catch (error) {
    console.error(`Failed to create relationship:`, error)
    throw error
  } finally {
    await session.close()
  }
}

/**
 * Find concepts related to a given concept
 */
export async function findRelatedConcepts(
  conceptName: string,
  depth = 2
): Promise<Array<{ name: string; type: string; description?: string }>> {
  const session = getSession()

  try {
    const result = await session.run(
      `
      MATCH path = (c {name: $name})-[*1..${depth}]-(related)
      RETURN DISTINCT related.name as name, labels(related)[0] as type, related.description as description
      ORDER BY length(path)
      LIMIT 20
      `,
      { name: conceptName }
    )

    return result.records.map(record => ({
      name: record.get('name'),
      type: record.get('type'),
      description: record.get('description'),
    }))
  } catch (error) {
    console.error('Failed to find related concepts:', error)
    return []
  } finally {
    await session.close()
  }
}

/**
 * Find the shortest path between two concepts
 */
export async function findPath(
  from: string,
  to: string
): Promise<Array<{ node: string; relationship: string }> | null> {
  const session = getSession()

  try {
    const result = await session.run(
      `
      MATCH path = shortestPath(
        (a {name: $from})-[*]-(b {name: $to})
      )
      RETURN [node in nodes(path) | node.name] as nodes,
             [rel in relationships(path) | type(rel)] as relationships
      `,
      { from, to }
    )

    if (result.records.length === 0) {
      return null
    }

    const nodes = result.records[0].get('nodes')
    const relationships = result.records[0].get('relationships')

    return nodes.slice(0, -1).map((node: string, i: number) => ({
      node,
      relationship: relationships[i],
    }))
  } catch (error) {
    console.error('Failed to find path:', error)
    return null
  } finally {
    await session.close()
  }
}

/**
 * Find documents related to a concept
 */
export async function findRelatedDocuments(
  conceptName: string,
  limit = 10
): Promise<Array<{ source: string; section?: string }>> {
  const session = getSession()

  try {
    const result = await session.run(
      `
      MATCH (c {name: $name})-[*1..2]-(doc:Document)
      RETURN DISTINCT doc.source as source, doc.section as section
      LIMIT $limit
      `,
      { name: conceptName, limit }
    )

    return result.records.map(record => ({
      source: record.get('source'),
      section: record.get('section'),
    }))
  } catch (error) {
    console.error('Failed to find related documents:', error)
    return []
  } finally {
    await session.close()
  }
}

/**
 * Get all concepts of a specific type
 */
export async function getConceptsByType(
  type: NodeType,
  limit = 50
): Promise<Array<{ name: string; description?: string }>> {
  const session = getSession()

  try {
    const result = await session.run(
      `
      MATCH (n:${type})
      RETURN n.name as name, n.description as description
      LIMIT $limit
      `,
      { limit }
    )

    return result.records.map(record => ({
      name: record.get('name'),
      description: record.get('description'),
    }))
  } catch (error) {
    console.error(`Failed to get ${type} nodes:`, error)
    return []
  } finally {
    await session.close()
  }
}

/**
 * Clear all data from the graph
 */
export async function clearGraph(): Promise<void> {
  const session = getSession()

  try {
    await session.run('MATCH (n) DETACH DELETE n')
    console.log('✅ Cleared Neo4j graph')
  } catch (error) {
    console.error('Failed to clear graph:', error)
    throw error
  } finally {
    await session.close()
  }
}

/**
 * Get graph statistics
 */
export async function getGraphStats(): Promise<{
  totalNodes: number
  totalRelationships: number
  nodeTypeDistribution: Record<string, number>
}> {
  const session = getSession()

  try {
    const nodeResult = await session.run(`
      MATCH (n)
      RETURN count(n) as totalNodes, labels(n)[0] as label
    `)

    const relResult = await session.run(`
      MATCH ()-[r]->()
      RETURN count(r) as totalRelationships
    `)

    const totalNodes = nodeResult.records.reduce(
      (sum, record) => sum + record.get('totalNodes').toNumber(),
      0
    )
    const totalRelationships = relResult.records[0]
      ?.get('totalRelationships')
      .toNumber() || 0

    const nodeTypeDistribution: Record<string, number> = {}
    nodeResult.records.forEach(record => {
      const label = record.get('label')
      const count = record.get('totalNodes').toNumber()
      if (label) {
        nodeTypeDistribution[label] = count
      }
    })

    return {
      totalNodes,
      totalRelationships,
      nodeTypeDistribution,
    }
  } catch (error) {
    console.error('Failed to get graph stats:', error)
    return {
      totalNodes: 0,
      totalRelationships: 0,
      nodeTypeDistribution: {},
    }
  } finally {
    await session.close()
  }
}
