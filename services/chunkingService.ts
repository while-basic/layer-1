import { DocumentChunk, ChunkMetadata } from './vectorStoreService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for chunking
 */
export interface ChunkConfig {
  maxTokens: number;      // Approximate max tokens per chunk (~500)
  overlapTokens: number;  // Overlap between chunks (~50)
  preserveHeaders: boolean; // Keep headers with their content
}

const DEFAULT_CONFIG: ChunkConfig = {
  maxTokens: 500,
  overlapTokens: 50,
  preserveHeaders: true
};

/**
 * Service for splitting markdown documents into semantic chunks
 */
export class ChunkingService {
  private config: ChunkConfig;

  constructor(config: Partial<ChunkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Rough token estimation (1 token ≈ 4 characters for English)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Extract the document type from file path
   */
  private extractType(filepath: string): string {
    const typeMap: Record<string, string> = {
      '00_CORE': 'documentation',
      '01_BIO': 'documentation',
      '02_PROJECTS': 'project',
      '03_PHILOSOPHY': 'philosophy',
      '04_CELAYA_SOLUTIONS': 'project',
      '05_EXPERTISE': 'documentation',
      '06_COGNITIVE_PATTERNS': 'research',
      '07_RESEARCH': 'research',
      '08_MUSIC': 'project',
      '09_MENTAL_ARTIFACTS': 'research',
      '10_COMMUNICATION': 'documentation'
    };

    for (const [key, type] of Object.entries(typeMap)) {
      if (filepath.includes(key)) {
        return type;
      }
    }

    return 'documentation';
  }

  /**
   * Extract tags from content (simple keyword extraction)
   */
  private extractTags(text: string, filepath: string): string[] {
    const tags: Set<string> = new Set();

    // Add folder-based tags
    const folderMatch = filepath.match(/\/(\d+_[A-Z_]+)\//);
    if (folderMatch) {
      const folder = folderMatch[1].replace(/^\d+_/, '').toLowerCase();
      tags.add(folder.replace(/_/g, '-'));
    }

    // Extract common keywords (basic approach)
    const keywords = [
      'ai', 'cognitive', 'clos', 'neural', 'research', 'flow',
      'optimization', 'chess', 'game-34', 'artifact', 'learning',
      'consciousness', 'agent', 'llm', 'development'
    ];

    const lowerText = text.toLowerCase();
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        tags.add(keyword);
      }
    });

    return Array.from(tags);
  }

  /**
   * Split markdown into sections by headers
   */
  private splitIntoSections(content: string): Array<{ header: string; content: string }> {
    const sections: Array<{ header: string; content: string }> = [];
    const lines = content.split('\n');

    let currentHeader = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      // Check if line is a header (# Header)
      if (line.match(/^#{1,6}\s+/)) {
        // Save previous section
        if (currentContent.length > 0) {
          sections.push({
            header: currentHeader,
            content: currentContent.join('\n').trim()
          });
        }
        // Start new section
        currentHeader = line.replace(/^#+\s+/, '');
        currentContent = [line];
      } else {
        currentContent.push(line);
      }
    }

    // Add final section
    if (currentContent.length > 0) {
      sections.push({
        header: currentHeader,
        content: currentContent.join('\n').trim()
      });
    }

    return sections.filter(s => s.content.length > 0);
  }

  /**
   * Split a large section into smaller chunks
   */
  private chunkSection(section: string, maxTokens: number): string[] {
    const chunks: string[] = [];
    const paragraphs = section.split('\n\n').filter(p => p.trim());

    let currentChunk: string[] = [];
    let currentTokens = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.estimateTokens(paragraph);

      // If adding this paragraph exceeds limit, save current chunk
      if (currentTokens + paragraphTokens > maxTokens && currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n\n'));

        // Start new chunk with overlap (keep last paragraph for context)
        if (this.config.overlapTokens > 0 && currentChunk.length > 0) {
          const lastParagraph = currentChunk[currentChunk.length - 1];
          currentChunk = [lastParagraph];
          currentTokens = this.estimateTokens(lastParagraph);
        } else {
          currentChunk = [];
          currentTokens = 0;
        }
      }

      currentChunk.push(paragraph);
      currentTokens += paragraphTokens;
    }

    // Add remaining content
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
    }

    return chunks;
  }

  /**
   * Process a markdown file into document chunks
   */
  async chunkMarkdown(
    filepath: string,
    content: string
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const sections = this.splitIntoSections(content);
    const type = this.extractType(filepath);
    const dateAdded = new Date().toISOString();

    let globalChunkIndex = 0;

    for (const section of sections) {
      const sectionTokens = this.estimateTokens(section.content);

      // If section is small enough, use it as-is
      if (sectionTokens <= this.config.maxTokens) {
        const metadata: ChunkMetadata = {
          source: filepath,
          section: section.header || 'Introduction',
          type,
          date_added: dateAdded,
          tags: this.extractTags(section.content, filepath),
          chunk_index: globalChunkIndex++
        };

        chunks.push({
          id: uuidv4(),
          text: section.content,
          metadata
        });
      } else {
        // Split large section into smaller chunks
        const subChunks = this.chunkSection(section.content, this.config.maxTokens);

        for (let i = 0; i < subChunks.length; i++) {
          const metadata: ChunkMetadata = {
            source: filepath,
            section: `${section.header} (part ${i + 1}/${subChunks.length})`,
            type,
            date_added: dateAdded,
            tags: this.extractTags(subChunks[i], filepath),
            chunk_index: globalChunkIndex++
          };

          chunks.push({
            id: uuidv4(),
            text: subChunks[i],
            metadata
          });
        }
      }
    }

    return chunks;
  }

  /**
   * Process multiple markdown files
   */
  async chunkMarkdownFiles(
    files: Array<{ path: string; content: string }>
  ): Promise<DocumentChunk[]> {
    const allChunks: DocumentChunk[] = [];

    for (const file of files) {
      const chunks = await this.chunkMarkdown(file.path, file.content);
      allChunks.push(...chunks);
    }

    return allChunks;
  }
}

// Singleton instance
let chunkingServiceInstance: ChunkingService | null = null;

export const getChunkingService = (): ChunkingService => {
  if (!chunkingServiceInstance) {
    chunkingServiceInstance = new ChunkingService();
  }
  return chunkingServiceInstance;
};
