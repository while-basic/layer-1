import { ChromaClient, Collection } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';

/**
 * Metadata for each chunk stored in the vector database
 */
export interface ChunkMetadata {
  source: string;        // File path
  section: string;       // Section/heading within document
  type: string;          // Type: research|project|philosophy|documentation
  date_added: string;    // ISO date string
  tags: string[];        // Searchable tags
  chunk_index: number;   // Position in the original document
}

/**
 * Document chunk with text and metadata
 */
export interface DocumentChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

/**
 * Search result from vector store
 */
export interface SearchResult {
  id: string;
  text: string;
  metadata: ChunkMetadata;
  score: number;
}

/**
 * Service for managing vector storage and retrieval using ChromaDB
 */
export class VectorStoreService {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private collectionName = 'celaya-knowledge';

  constructor() {
    // Initialize ChromaDB client
    // For browser usage, this will connect to a local ChromaDB server
    // In production, you'd configure the server URL
    this.client = new ChromaClient({
      path: import.meta.env.VITE_CHROMA_URL || 'http://localhost:8000'
    });
  }

  /**
   * Initialize or get the collection
   */
  async initialize(): Promise<void> {
    try {
      // Try to get existing collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          'hnsw:space': 'cosine', // Use cosine similarity
          description: 'Christopher Celaya knowledge base embeddings'
        }
      });
      console.log('Vector store initialized');
    } catch (error) {
      console.error('Error initializing vector store:', error);
      throw new Error('Failed to initialize vector store');
    }
  }

  /**
   * Add or update a batch of document chunks
   */
  async upsertChunks(chunks: DocumentChunk[], embeddings: number[][]): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      await this.collection!.upsert({
        ids: chunks.map(c => c.id),
        embeddings: embeddings,
        metadatas: chunks.map(c => c.metadata as any),
        documents: chunks.map(c => c.text)
      });
      console.log(`Upserted ${chunks.length} chunks`);
    } catch (error) {
      console.error('Error upserting chunks:', error);
      throw new Error('Failed to upsert chunks');
    }
  }

  /**
   * Search for relevant chunks using vector similarity
   */
  async search(
    queryEmbedding: number[],
    topK: number = 8,
    filter?: Partial<ChunkMetadata>
  ): Promise<SearchResult[]> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      const results = await this.collection!.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        where: filter as any
      });

      // Transform results to SearchResult format
      const searchResults: SearchResult[] = [];

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          searchResults.push({
            id: results.ids[0][i],
            text: results.documents?.[0]?.[i] as string || '',
            metadata: results.metadatas?.[0]?.[i] as ChunkMetadata,
            score: results.distances?.[0]?.[i] || 0
          });
        }
      }

      return searchResults;
    } catch (error) {
      console.error('Error searching vector store:', error);
      throw new Error('Failed to search vector store');
    }
  }

  /**
   * Delete chunks by source file
   */
  async deleteBySource(source: string): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      await this.collection!.delete({
        where: { source } as any
      });
      console.log(`Deleted chunks from source: ${source}`);
    } catch (error) {
      console.error('Error deleting chunks:', error);
      throw new Error('Failed to delete chunks');
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<{ count: number }> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      const count = await this.collection!.count();
      return { count };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { count: 0 };
    }
  }

  /**
   * Clear all data from the collection
   */
  async clear(): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      // Delete the collection and recreate it
      await this.client.deleteCollection({ name: this.collectionName });
      await this.initialize();
      console.log('Vector store cleared');
    } catch (error) {
      console.error('Error clearing vector store:', error);
      throw new Error('Failed to clear vector store');
    }
  }
}

// Singleton instance
let vectorStoreInstance: VectorStoreService | null = null;

export const getVectorStore = (): VectorStoreService => {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStoreService();
  }
  return vectorStoreInstance;
};
