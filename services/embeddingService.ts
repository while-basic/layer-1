import OpenAI from 'openai';

/**
 * Service for generating vector embeddings using OpenAI
 * Uses text-embedding-3-large for high-quality semantic representations
 */

export class EmbeddingService {
  private openai: OpenAI;
  private model = 'text-embedding-3-large';

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * More efficient than calling embed() multiple times
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: texts,
        encoding_format: 'float'
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw new Error('Failed to generate batch embeddings');
    }
  }

  /**
   * Get the dimension size of the embeddings produced by this model
   * text-embedding-3-large produces 3072-dimensional vectors
   */
  getDimension(): number {
    return 3072;
  }
}

// Singleton instance for browser usage
let embeddingServiceInstance: EmbeddingService | null = null;

export const getEmbeddingService = (): EmbeddingService => {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new EmbeddingService();
  }
  return embeddingServiceInstance;
};
