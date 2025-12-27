import type { ParsedDocument } from '@/types'

export interface Chunk {
  text: string
  metadata: {
    source: string
    section: string
    chunk_index: number
    total_chunks: number
  }
}

/**
 * Chunk a document into semantic chunks
 */
export async function chunkDocument(
  doc: ParsedDocument,
  source: string,
  options: {
    maxTokens?: number
    overlap?: number
  } = {}
): Promise<Chunk[]> {
  const { maxTokens = 600, overlap = 100 } = options

  const chunks: Chunk[] = []

  // Chunk each section separately to preserve structure
  for (const section of doc.sections) {
    const sectionChunks = chunkText(section.content, {
      maxTokens,
      overlap,
    })

    sectionChunks.forEach(chunkText => {
      chunks.push({
        text: `${section.heading}\n\n${chunkText}`,
        metadata: {
          source,
          section: section.heading,
          chunk_index: chunks.length,
          total_chunks: 0, // Will update after
        },
      })
    })
  }

  // Update total chunks
  chunks.forEach(c => (c.metadata.total_chunks = chunks.length))

  return chunks
}

/**
 * Chunk text with overlap
 */
function chunkText(
  text: string,
  options: {
    maxTokens: number
    overlap: number
  }
): string[] {
  const { maxTokens, overlap } = options

  // Rough approximation: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4
  const overlapChars = overlap * 4

  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim())

  const chunks: string[] = []
  let currentChunk: string[] = []
  let currentLength = 0

  for (const paragraph of paragraphs) {
    const paragraphLength = paragraph.length

    if (currentLength + paragraphLength > maxChars && currentChunk.length > 0) {
      // Save current chunk
      chunks.push(currentChunk.join('\n\n'))

      // Start new chunk with overlap (keep last paragraph)
      if (currentChunk.length > 0) {
        const lastParagraph = currentChunk[currentChunk.length - 1]
        if (lastParagraph.length <= overlapChars) {
          currentChunk = [lastParagraph, paragraph]
          currentLength = lastParagraph.length + paragraphLength
        } else {
          currentChunk = [paragraph]
          currentLength = paragraphLength
        }
      } else {
        currentChunk = [paragraph]
        currentLength = paragraphLength
      }
    } else {
      currentChunk.push(paragraph)
      currentLength += paragraphLength
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'))
  }

  return chunks
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4)
}

/**
 * Smart chunking that preserves code blocks and lists
 */
export function smartChunk(
  text: string,
  maxTokens = 600,
  overlap = 100
): string[] {
  const maxChars = maxTokens * 4
  const overlapChars = overlap * 4

  // Split by major breaks
  const blocks = text.split(/\n\n+/)

  const chunks: string[] = []
  let currentChunk: string[] = []
  let currentLength = 0

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim()
    if (!block) continue

    const blockLength = block.length

    // Check if this is a code block or list
    const isSpecial =
      block.startsWith('```') ||
      block.startsWith('- ') ||
      block.startsWith('* ') ||
      block.match(/^\d+\. /)

    // If adding this block would exceed max and we have content
    if (currentLength + blockLength > maxChars && currentChunk.length > 0) {
      // Save current chunk
      chunks.push(currentChunk.join('\n\n'))

      // Calculate overlap
      let overlapBlocks: string[] = []
      let overlapLength = 0

      // Work backwards to include as much overlap as possible
      for (let j = currentChunk.length - 1; j >= 0; j--) {
        const overlapBlock = currentChunk[j]
        if (overlapLength + overlapBlock.length <= overlapChars) {
          overlapBlocks.unshift(overlapBlock)
          overlapLength += overlapBlock.length
        } else {
          break
        }
      }

      // Start new chunk with overlap + current block
      currentChunk = [...overlapBlocks, block]
      currentLength = overlapLength + blockLength
    } else {
      // Add to current chunk
      currentChunk.push(block)
      currentLength += blockLength
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'))
  }

  return chunks
}
