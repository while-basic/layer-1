import { getEmbeddingService } from './embeddingService';
import { getVectorStore } from './vectorStoreService';
import { getChunkingService } from './chunkingService';
import type { DocumentChunk } from './vectorStoreService';

/**
 * Progress callback for ingestion operations
 */
export interface IngestionProgress {
  stage: 'reading' | 'chunking' | 'embedding' | 'storing' | 'complete';
  filesProcessed: number;
  totalFiles: number;
  chunksProcessed: number;
  totalChunks: number;
  message: string;
}

/**
 * Service for ingesting markdown files into the vector store
 */
export class IngestionService {
  private embeddingService = getEmbeddingService();
  private vectorStore = getVectorStore();
  private chunkingService = getChunkingService();

  /**
   * Ingest a single markdown file
   */
  async ingestFile(
    filepath: string,
    content: string,
    onProgress?: (progress: IngestionProgress) => void
  ): Promise<void> {
    // Step 1: Chunk the markdown
    onProgress?.({
      stage: 'chunking',
      filesProcessed: 0,
      totalFiles: 1,
      chunksProcessed: 0,
      totalChunks: 0,
      message: `Chunking ${filepath}...`
    });

    const chunks = await this.chunkingService.chunkMarkdown(filepath, content);

    // Step 2: Generate embeddings
    onProgress?.({
      stage: 'embedding',
      filesProcessed: 0,
      totalFiles: 1,
      chunksProcessed: 0,
      totalChunks: chunks.length,
      message: `Generating embeddings for ${chunks.length} chunks...`
    });

    const texts = chunks.map(c => c.text);
    const embeddings = await this.embeddingService.embedBatch(texts);

    // Step 3: Store in vector database
    onProgress?.({
      stage: 'storing',
      filesProcessed: 0,
      totalFiles: 1,
      chunksProcessed: chunks.length,
      totalChunks: chunks.length,
      message: `Storing ${chunks.length} chunks...`
    });

    await this.vectorStore.upsertChunks(chunks, embeddings);

    // Complete
    onProgress?.({
      stage: 'complete',
      filesProcessed: 1,
      totalFiles: 1,
      chunksProcessed: chunks.length,
      totalChunks: chunks.length,
      message: `Successfully ingested ${filepath}`
    });
  }

  /**
   * Ingest multiple markdown files
   */
  async ingestFiles(
    files: Array<{ path: string; content: string }>,
    onProgress?: (progress: IngestionProgress) => void
  ): Promise<void> {
    const totalFiles = files.length;
    let filesProcessed = 0;
    const allChunks: DocumentChunk[] = [];

    // Step 1: Chunk all files
    onProgress?.({
      stage: 'chunking',
      filesProcessed: 0,
      totalFiles,
      chunksProcessed: 0,
      totalChunks: 0,
      message: 'Chunking markdown files...'
    });

    for (const file of files) {
      const chunks = await this.chunkingService.chunkMarkdown(file.path, file.content);
      allChunks.push(...chunks);
      filesProcessed++;

      onProgress?.({
        stage: 'chunking',
        filesProcessed,
        totalFiles,
        chunksProcessed: allChunks.length,
        totalChunks: allChunks.length,
        message: `Chunked ${filesProcessed}/${totalFiles} files (${allChunks.length} chunks)`
      });
    }

    // Step 2: Generate embeddings in batches
    onProgress?.({
      stage: 'embedding',
      filesProcessed: totalFiles,
      totalFiles,
      chunksProcessed: 0,
      totalChunks: allChunks.length,
      message: 'Generating embeddings...'
    });

    const batchSize = 100; // Process 100 chunks at a time
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const texts = batch.map(c => c.text);
      const embeddings = await this.embeddingService.embedBatch(texts);
      allEmbeddings.push(...embeddings);

      onProgress?.({
        stage: 'embedding',
        filesProcessed: totalFiles,
        totalFiles,
        chunksProcessed: Math.min(i + batchSize, allChunks.length),
        totalChunks: allChunks.length,
        message: `Generated ${Math.min(i + batchSize, allChunks.length)}/${allChunks.length} embeddings`
      });
    }

    // Step 3: Store in vector database (in batches)
    onProgress?.({
      stage: 'storing',
      filesProcessed: totalFiles,
      totalFiles,
      chunksProcessed: 0,
      totalChunks: allChunks.length,
      message: 'Storing chunks in vector database...'
    });

    for (let i = 0; i < allChunks.length; i += batchSize) {
      const chunkBatch = allChunks.slice(i, i + batchSize);
      const embeddingBatch = allEmbeddings.slice(i, i + batchSize);
      await this.vectorStore.upsertChunks(chunkBatch, embeddingBatch);

      onProgress?.({
        stage: 'storing',
        filesProcessed: totalFiles,
        totalFiles,
        chunksProcessed: Math.min(i + batchSize, allChunks.length),
        totalChunks: allChunks.length,
        message: `Stored ${Math.min(i + batchSize, allChunks.length)}/${allChunks.length} chunks`
      });
    }

    // Complete
    onProgress?.({
      stage: 'complete',
      filesProcessed: totalFiles,
      totalFiles,
      chunksProcessed: allChunks.length,
      totalChunks: allChunks.length,
      message: `Successfully ingested ${totalFiles} files (${allChunks.length} chunks)`
    });
  }

  /**
   * Re-ingest a file (delete old chunks and add new ones)
   */
  async reIngestFile(
    filepath: string,
    content: string,
    onProgress?: (progress: IngestionProgress) => void
  ): Promise<void> {
    // Delete existing chunks for this file
    await this.vectorStore.deleteBySource(filepath);

    // Ingest the new version
    await this.ingestFile(filepath, content, onProgress);
  }

  /**
   * Get ingestion statistics
   */
  async getStats(): Promise<{ totalChunks: number }> {
    const stats = await this.vectorStore.getStats();
    return { totalChunks: stats.count };
  }

  /**
   * Clear all ingested data
   */
  async clearAll(): Promise<void> {
    await this.vectorStore.clear();
  }
}

// Singleton instance
let ingestionServiceInstance: IngestionService | null = null;

export const getIngestionService = (): IngestionService => {
  if (!ingestionServiceInstance) {
    ingestionServiceInstance = new IngestionService();
  }
  return ingestionServiceInstance;
};
