#!/usr/bin/env tsx

/**
 * Ingestion script for processing knowledgebase markdown files
 * Run with: npx tsx scripts/ingest-knowledgebase.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import OpenAI from 'openai';
import { ChromaClient } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const KNOWLEDGEBASE_DIR = './knowledgebase';
const CHROMA_URL = process.env.VITE_CHROMA_URL || 'http://localhost:8000';
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;
const COLLECTION_NAME = 'celaya-knowledge';

interface ChunkMetadata {
  source: string;
  section: string;
  type: string;
  date_added: string;
  tags: string[];
  chunk_index: number;
}

interface DocumentChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

// Simple token estimator
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Extract document type from filepath
function extractType(filepath: string): string {
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

// Extract tags from content
function extractTags(text: string, filepath: string): string[] {
  const tags: Set<string> = new Set();

  // Add folder-based tags
  const folderMatch = filepath.match(/\/(\d+_[A-Z_]+)\//);
  if (folderMatch) {
    const folder = folderMatch[1].replace(/^\d+_/, '').toLowerCase();
    tags.add(folder.replace(/_/g, '-'));
  }

  // Extract common keywords
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

// Split markdown into sections
function splitIntoSections(content: string): Array<{ header: string; content: string }> {
  const sections: Array<{ header: string; content: string }> = [];
  const lines = content.split('\n');

  let currentHeader = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.match(/^#{1,6}\s+/)) {
      if (currentContent.length > 0) {
        sections.push({
          header: currentHeader,
          content: currentContent.join('\n').trim()
        });
      }
      currentHeader = line.replace(/^#+\s+/, '');
      currentContent = [line];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections.push({
      header: currentHeader,
      content: currentContent.join('\n').trim()
    });
  }

  return sections.filter(s => s.content.length > 0);
}

// Chunk a section
function chunkSection(section: string, maxTokens: number = 500): string[] {
  const chunks: string[] = [];
  const paragraphs = section.split('\n\n').filter(p => p.trim());

  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    if (currentTokens + paragraphTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(paragraph);
    currentTokens += paragraphTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }

  return chunks;
}

// Process markdown file into chunks
function chunkMarkdown(filepath: string, content: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const sections = splitIntoSections(content);
  const type = extractType(filepath);
  const dateAdded = new Date().toISOString();

  let globalChunkIndex = 0;

  for (const section of sections) {
    const sectionTokens = estimateTokens(section.content);

    if (sectionTokens <= 500) {
      chunks.push({
        id: uuidv4(),
        text: section.content,
        metadata: {
          source: filepath,
          section: section.header || 'Introduction',
          type,
          date_added: dateAdded,
          tags: extractTags(section.content, filepath),
          chunk_index: globalChunkIndex++
        }
      });
    } else {
      const subChunks = chunkSection(section.content, 500);

      for (let i = 0; i < subChunks.length; i++) {
        chunks.push({
          id: uuidv4(),
          text: subChunks[i],
          metadata: {
            source: filepath,
            section: `${section.header} (part ${i + 1}/${subChunks.length})`,
            type,
            date_added: dateAdded,
            tags: extractTags(subChunks[i], filepath),
            chunk_index: globalChunkIndex++
          }
        });
      }
    }
  }

  return chunks;
}

// Recursively find all markdown files
function findMarkdownFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // Store relative path
      const relativePath = path.relative(baseDir, fullPath);
      files.push(relativePath);
    }
  }

  return files;
}

// Main ingestion function
async function ingestKnowledgebase() {
  console.log('🚀 Starting knowledgebase ingestion...\n');

  // Validate environment
  if (!OPENAI_API_KEY) {
    throw new Error('VITE_OPENAI_API_KEY environment variable not set');
  }

  // Initialize OpenAI
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  // Initialize ChromaDB
  console.log(`📊 Connecting to ChromaDB at ${CHROMA_URL}...`);
  const chromaClient = new ChromaClient({ path: CHROMA_URL });

  // Create or get collection
  console.log(`📁 Creating collection: ${COLLECTION_NAME}...`);
  const collection = await chromaClient.getOrCreateCollection({
    name: COLLECTION_NAME,
    metadata: {
      'hnsw:space': 'cosine',
      description: 'Christopher Celaya knowledge base embeddings'
    }
  });

  // Find all markdown files
  console.log(`🔍 Scanning ${KNOWLEDGEBASE_DIR} for markdown files...`);
  const markdownFiles = findMarkdownFiles(KNOWLEDGEBASE_DIR);
  console.log(`Found ${markdownFiles.length} markdown files\n`);

  // Process files
  const allChunks: DocumentChunk[] = [];
  let filesProcessed = 0;

  for (const file of markdownFiles) {
    const fullPath = path.join(KNOWLEDGEBASE_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const chunks = chunkMarkdown(file, content);

    allChunks.push(...chunks);
    filesProcessed++;

    console.log(`✅ Processed: ${file} (${chunks.length} chunks)`);
  }

  console.log(`\n📦 Total chunks: ${allChunks.length}`);

  // Generate embeddings in batches
  console.log('\n🧠 Generating embeddings...');
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    const texts = batch.map(c => c.text);

    console.log(`  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allChunks.length / batchSize)}...`);

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: texts,
      encoding_format: 'float'
    });

    allEmbeddings.push(...response.data.map(item => item.embedding));
  }

  // Store in ChromaDB
  console.log('\n💾 Storing in vector database...');
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const chunkBatch = allChunks.slice(i, i + batchSize);
    const embeddingBatch = allEmbeddings.slice(i, i + batchSize);

    await collection.upsert({
      ids: chunkBatch.map(c => c.id),
      embeddings: embeddingBatch,
      metadatas: chunkBatch.map(c => c.metadata as any),
      documents: chunkBatch.map(c => c.text)
    });

    console.log(`  Stored batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allChunks.length / batchSize)}`);
  }

  // Summary
  const stats = await collection.count();
  console.log('\n✨ Ingestion complete!');
  console.log(`📊 Total chunks in database: ${stats}`);
  console.log(`📁 Files processed: ${filesProcessed}`);
}

// Run the script
ingestKnowledgebase()
  .then(() => {
    console.log('\n✅ Success!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
