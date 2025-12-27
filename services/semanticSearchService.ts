import { getEmbeddingService } from './embeddingService';
import { getVectorStore, SearchResult } from './vectorStoreService';

/**
 * Search options
 */
export interface SearchOptions {
  topK?: number;          // Number of results to return (default: 8)
  minScore?: number;      // Minimum similarity score (0-1)
  type?: string;          // Filter by document type
  tags?: string[];        // Filter by tags
}

/**
 * Formatted context for Claude
 */
export interface FormattedContext {
  text: string;           // Formatted context text
  sources: string[];      // List of source files
  metadata: {
    totalChunks: number;
    uniqueSources: number;
    types: string[];
  };
}

/**
 * Service for semantic search across the knowledge base
 */
export class SemanticSearchService {
  private embeddingService = getEmbeddingService();
  private vectorStore = getVectorStore();

  /**
   * Search the knowledge base with a natural language query
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      topK = 8,
      minScore = 0.0,
      type,
      tags
    } = options;

    // Generate embedding for the query
    const queryEmbedding = await this.embeddingService.embed(query);

    // Build filter
    const filter: any = {};
    if (type) filter.type = type;
    if (tags && tags.length > 0) {
      // ChromaDB supports array containment
      filter.tags = { $contains: tags[0] }; // Simplified - can be enhanced
    }

    // Search vector store
    const results = await this.vectorStore.search(
      queryEmbedding,
      topK,
      Object.keys(filter).length > 0 ? filter : undefined
    );

    // Filter by minimum score
    return results.filter(r => r.score >= minScore);
  }

  /**
   * Format search results as context for Claude
   */
  formatContext(results: SearchResult[]): FormattedContext {
    const contextParts: string[] = [];
    const sources = new Set<string>();
    const types = new Set<string>();

    for (const result of results) {
      sources.add(result.metadata.source);
      types.add(result.metadata.type);

      // Format each chunk with metadata
      contextParts.push(`
### ${result.metadata.section}
**Source:** ${result.metadata.source}
**Type:** ${result.metadata.type}
**Relevance:** ${(result.score * 100).toFixed(1)}%

${result.text}
      `.trim());
    }

    return {
      text: contextParts.join('\n\n---\n\n'),
      sources: Array.from(sources),
      metadata: {
        totalChunks: results.length,
        uniqueSources: sources.size,
        types: Array.from(types)
      }
    };
  }

  /**
   * Search and format in one call (convenience method)
   */
  async searchAndFormat(
    query: string,
    options: SearchOptions = {}
  ): Promise<FormattedContext> {
    const results = await this.search(query, options);
    return this.formatContext(results);
  }

  /**
   * Get related content based on a document chunk
   */
  async findRelated(
    text: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    return this.search(text, options);
  }

  /**
   * Multi-query search (search with multiple queries and merge results)
   * Useful for complex questions that need different perspectives
   */
  async multiSearch(
    queries: string[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    const seenIds = new Set<string>();

    for (const query of queries) {
      const results = await this.search(query, options);

      // Deduplicate by ID
      for (const result of results) {
        if (!seenIds.has(result.id)) {
          allResults.push(result);
          seenIds.add(result.id);
        }
      }
    }

    // Sort by score
    allResults.sort((a, b) => b.score - a.score);

    // Return top K results
    const topK = options.topK || 8;
    return allResults.slice(0, topK);
  }

  /**
   * Hybrid search: combine semantic search with keyword filtering
   */
  async hybridSearch(
    query: string,
    keywords: string[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    // First do semantic search
    const results = await this.search(query, options);

    // Filter results that contain at least one keyword
    if (keywords.length === 0) {
      return results;
    }

    return results.filter(result => {
      const lowerText = result.text.toLowerCase();
      return keywords.some(keyword =>
        lowerText.includes(keyword.toLowerCase())
      );
    });
  }

  /**
   * Get statistics about search results
   */
  getResultStats(results: SearchResult[]): {
    avgScore: number;
    scoreRange: { min: number; max: number };
    typeDistribution: Record<string, number>;
    sourceDistribution: Record<string, number>;
  } {
    if (results.length === 0) {
      return {
        avgScore: 0,
        scoreRange: { min: 0, max: 0 },
        typeDistribution: {},
        sourceDistribution: {}
      };
    }

    const scores = results.map(r => r.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    const typeDistribution: Record<string, number> = {};
    const sourceDistribution: Record<string, number> = {};

    for (const result of results) {
      const type = result.metadata.type;
      const source = result.metadata.source;

      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
      sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
    }

    return {
      avgScore,
      scoreRange: { min: minScore, max: maxScore },
      typeDistribution,
      sourceDistribution
    };
  }
}

// Singleton instance
let semanticSearchInstance: SemanticSearchService | null = null;

export const getSemanticSearch = (): SemanticSearchService => {
  if (!semanticSearchInstance) {
    semanticSearchInstance = new SemanticSearchService();
  }
  return semanticSearchInstance;
};
