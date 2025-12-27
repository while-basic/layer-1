import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import type { ParsedDocument } from '@/types'

/**
 * Parse a markdown file
 */
export async function parseMarkdown(filepath: string): Promise<ParsedDocument> {
  const raw = await fs.readFile(filepath, 'utf-8')
  const { data: metadata, content } = matter(raw)

  // Parse markdown AST
  const processor = unified().use(remarkParse).use(remarkGfm)
  const ast = processor.parse(content)

  // Extract sections
  const sections = extractSections(ast, content)

  return {
    content,
    metadata: {
      title: metadata.title || path.basename(filepath, '.md'),
      type: metadata.type || inferType(filepath),
      tags: metadata.tags || inferTags(filepath, content),
      date: metadata.date || new Date().toISOString(),
      ...metadata,
    },
    sections,
  }
}

/**
 * Extract sections from markdown AST
 */
function extractSections(ast: any, content: string): ParsedDocument['sections'] {
  const sections: ParsedDocument['sections'] = []
  let currentSection: ParsedDocument['sections'][0] | null = null

  // Walk through the AST
  function visit(node: any, depth = 0) {
    if (node.type === 'heading') {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection)
      }

      // Start new section
      currentSection = {
        heading: extractTextFromNode(node),
        level: node.depth,
        content: '',
      }
    } else if (currentSection && node.type !== 'heading') {
      // Add content to current section
      const text = extractTextFromNode(node)
      if (text) {
        currentSection.content += text + '\n\n'
      }
    }

    // Visit children
    if (node.children) {
      node.children.forEach((child: any) => visit(child, depth + 1))
    }
  }

  visit(ast)

  // Don't forget the last section
  if (currentSection) {
    sections.push(currentSection)
  }

  // If no sections found, create one with all content
  if (sections.length === 0) {
    sections.push({
      heading: 'Main Content',
      level: 1,
      content: content,
    })
  }

  return sections
}

/**
 * Extract text from an AST node
 */
function extractTextFromNode(node: any): string {
  if (node.type === 'text') {
    return node.value
  }

  if (node.type === 'inlineCode') {
    return `\`${node.value}\``
  }

  if (node.type === 'code') {
    return `\`\`\`\n${node.value}\n\`\`\``
  }

  if (node.children) {
    return node.children.map(extractTextFromNode).join('')
  }

  return ''
}

/**
 * Infer document type from filepath
 */
function inferType(filepath: string): string {
  const normalized = filepath.toLowerCase()

  if (normalized.includes('/00_core') || normalized.includes('/01_bio')) {
    return 'documentation'
  }

  if (
    normalized.includes('/02_projects') ||
    normalized.includes('/04_celaya_solutions') ||
    normalized.includes('/08_music')
  ) {
    return 'project'
  }

  if (normalized.includes('/03_philosophy')) {
    return 'philosophy'
  }

  if (
    normalized.includes('/06_cognitive_patterns') ||
    normalized.includes('/07_research') ||
    normalized.includes('/09_mental_artifacts')
  ) {
    return 'research'
  }

  if (
    normalized.includes('/05_expertise') ||
    normalized.includes('/10_communication')
  ) {
    return 'documentation'
  }

  return 'documentation'
}

/**
 * Infer tags from filepath and content
 */
function inferTags(filepath: string, content: string): string[] {
  const tags = new Set<string>()

  // Tags from filepath
  const pathParts = filepath.split('/')
  pathParts.forEach(part => {
    const cleaned = part
      .toLowerCase()
      .replace(/[_-]/g, ' ')
      .replace(/\d+/g, '')
      .trim()

    if (cleaned && !cleaned.includes('.md')) {
      tags.add(cleaned)
    }
  })

  // Common keywords to extract as tags
  const keywords = [
    'clos',
    'neural',
    'cognitive',
    'ai',
    'research',
    'flow',
    'optimization',
    'architecture',
    'agent',
    'game 34',
    'chess',
    'artifact',
    'electrical',
    'music',
    'production',
  ]

  const lowerContent = content.toLowerCase()
  keywords.forEach(keyword => {
    if (lowerContent.includes(keyword)) {
      tags.add(keyword)
    }
  })

  return Array.from(tags)
}

/**
 * Find all markdown files in a directory
 */
export async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath)
      }
    }
  }

  await walk(dir)
  return files
}
