# Layer 1: AI Research Platform

Production-grade conversational gateway to Christopher Celaya's research ecosystem.

## Architecture

```
User → Next.js Chat UI → Claude Orchestration → {
  Weaviate (Vector Search)
  Neo4j (Knowledge Graph)
  Redis (Cache)
  Tool APIs (CLOS, Game 34, Neural Child)
} → Streaming Response
```

## Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- TypeScript

**Backend:**
- Next.js API Routes (Edge Runtime)
- Claude Sonnet 4 (Orchestration)
- Voyage AI (Embeddings)
- Cohere (Reranking)

**Data:**
- Weaviate (Vector Database)
- Neo4j (Knowledge Graph)
- Upstash Redis (Cache)

**Tools:**
- CLOS API (Cognitive Optimization)
- Game 34 API (Strategic Analysis)
- Neural Child API (Developmental AI)
- Cognitive Artifacts API

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Docker and Docker Compose
- API keys for:
  - Anthropic (Claude)
  - Voyage AI (Embeddings)
  - Cohere (Reranking)

### 2. Setup

```bash
# Install dependencies
npm install

# Start local databases
cd docker && docker-compose up -d

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your API keys

# Initialize databases and ingest knowledge base
npm run ingest

# Start development server
npm run dev
```

Visit http://localhost:3000

### 3. Verify Setup

```bash
# Check database stats
curl http://localhost:3000/api/admin/stats

# Test search
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "CLOS architecture", "mode": "hybrid"}'
```

## Features

### Semantic Search

- **Hybrid Search**: Combines vector similarity (semantic) + BM25 (keyword)
- **Query Rewriting**: Claude rewrites queries for better retrieval
- **HyDE**: Hypothetical Document Embeddings for complex queries
- **Graph Search**: Leverages Neo4j relationships for contextual retrieval
- **Reranking**: Cohere rerank-english-v3.0 for precision
- **Caching**: Redis cache for frequently accessed queries

### Tool Integration

Commands available via `/` prefix:

- `/search` - Semantic search across knowledge base
- `/clos` - Run CLOS cognitive optimization analysis
- `/chess` - Game 34 strategic framework analysis
- `/neural` - Interact with Neural Child
- `/artifact` - Generate cognitive artifact prompts
- `/hyde` - Advanced HyDE search
- `/mqsearch` - Multi-query expansion search

### Knowledge Graph

Neo4j stores:
- **Concepts**: CLOS, Flow States, Neural Networks, etc.
- **Projects**: CLOS, Neural Child, Cognitive Artifacts, etc.
- **Relationships**: ENABLES, ANALYZES, DERIVES_FROM, etc.
- **Documents**: Source attribution and metadata

Enables graph-based queries like:
- "What concepts relate to CLOS?"
- "Find the path between Flow States and Neural Networks"
- "Show all projects that use cognitive optimization"

### Streaming Responses

Real-time token streaming from Claude for responsive UX.

### Prompt Caching

Claude prompt caching reduces costs by ~90% for repeated context.

## Project Structure

```
layer-1/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Main chat endpoint (streaming)
│   │   ├── search/route.ts        # Search API
│   │   ├── tools/execute/route.ts # Tool execution
│   │   └── admin/
│   │       ├── stats/route.ts     # System statistics
│   │       └── rebuild/route.ts   # Clear & rebuild databases
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Chat interface
│   └── globals.css                # Tailwind styles
│
├── lib/
│   ├── ai/
│   │   ├── claude.ts              # Claude API client
│   │   ├── embeddings.ts          # Voyage AI client
│   │   └── rerank.ts              # Cohere rerank
│   ├── db/
│   │   ├── weaviate.ts            # Weaviate client + schemas
│   │   ├── neo4j.ts               # Neo4j client + queries
│   │   └── redis.ts               # Redis cache client
│   ├── search/
│   │   └── hybrid.ts              # Advanced search strategies
│   ├── tools/
│   │   ├── registry.ts            # Tool definitions
│   │   └── executor.ts            # Tool execution logic
│   └── ingest/
│       ├── markdown.ts            # Parse markdown files
│       ├── chunker.ts             # Semantic chunking
│       └── graph-builder.ts       # Extract entities/relations
│
├── components/
│   ├── Chat.tsx                   # Main chat component
│   ├── Message.tsx                # Message bubble
│   └── CommandPalette.tsx         # Slash command UI
│
├── hooks/
│   ├── useChat.ts                 # Chat state management
│   └── useCommands.ts             # Command handling
│
├── types/
│   └── index.ts                   # TypeScript types
│
├── scripts/
│   └── ingest-all.ts              # Batch ingestion script
│
├── docker/
│   └── docker-compose.yml         # Local dev databases
│
├── knowledgebase/                 # Markdown files (auto-indexed)
│   ├── 00_CORE/
│   ├── 01_BIO/
│   ├── 02_PROJECTS/
│   └── ...
│
└── .env.local.example             # Environment template
```

## Usage

### Chat Interface

Type naturally:
```
"What is CLOS?"
"How does Neural Child work?"
"Explain cognitive optimization"
```

### Slash Commands

```
/search CLOS architecture
/search --mode=graph flow states
/clos analyze "feeling scattered today"
/chess "should I launch in January?"
/neural "analyze my patterns"
/artifact --category=strategic
```

### API Endpoints

**Chat (Streaming)**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is CLOS?"}]}'
```

**Search**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "cognitive optimization",
    "mode": "hybrid",
    "limit": 10,
    "rerank": true
  }'
```

**Execute Tool**
```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search_knowledge",
    "parameters": {"query": "CLOS", "mode": "semantic"}
  }'
```

**System Stats**
```bash
curl http://localhost:3000/api/admin/stats
```

## Ingestion Pipeline

The ingestion pipeline processes markdown files from `/knowledgebase`:

```bash
npm run ingest
```

This:
1. Scans all `.md` files in `/knowledgebase`
2. Parses frontmatter and content
3. Chunks into ~600 token semantic chunks
4. Generates embeddings via Voyage AI
5. Stores in Weaviate with metadata
6. Extracts entities/relationships via Claude
7. Builds knowledge graph in Neo4j

After adding/updating markdown files, re-run ingestion.

## Performance

**Search Latency:**
- Cold query: ~500ms
- Cached query: ~50ms
- With reranking: +200ms

**Costs (per 1000 queries):**
- Embeddings: $0.01 (Voyage AI)
- Reranking: $0.50 (Cohere)
- LLM: $1.50 (Claude Sonnet 4)
- With caching: ~$0.15 (90% cache hit rate)

**Scalability:**
- Vector DB: Millions of chunks (Weaviate)
- Graph DB: Tens of thousands of nodes (Neo4j)
- Cache: 100k+ keys (Redis)

## Deployment

### Vercel (Recommended)

```bash
# Set environment variables in Vercel dashboard
# Deploy
vercel --prod
```

### Railway (Databases)

Deploy Weaviate, Neo4j, and Redis to Railway or similar:

1. Create Weaviate cluster
2. Create Neo4j instance
3. Create Upstash Redis (serverless)
4. Update `.env.production` with connection strings

### Environment Variables

See `.env.production.example` for all required variables.

Critical:
- `ANTHROPIC_API_KEY`
- `VOYAGE_API_KEY`
- `COHERE_API_KEY`
- `WEAVIATE_HOST` + `WEAVIATE_API_KEY`
- `NEO4J_URI` + `NEO4J_PASSWORD`
- `UPSTASH_REDIS_URL` + `UPSTASH_REDIS_TOKEN`

## Development

**Run databases:**
```bash
cd docker && docker-compose up -d
```

**Check database logs:**
```bash
docker-compose logs -f weaviate
docker-compose logs -f neo4j
docker-compose logs -f redis
```

**Reset databases:**
```bash
curl -X POST http://localhost:3000/api/admin/rebuild
npm run ingest
```

**Run ingestion:**
```bash
npm run ingest
```

**Build for production:**
```bash
npm run build
npm start
```

## Troubleshooting

**"Failed to connect to Weaviate"**
- Ensure Docker is running: `docker-compose ps`
- Check Weaviate logs: `docker-compose logs weaviate`
- Verify `WEAVIATE_HOST=localhost:8080` and `WEAVIATE_SCHEME=http`

**"Neo4j connection failed"**
- Check Neo4j is running: `docker-compose ps`
- Verify credentials: `NEO4J_PASSWORD=password123`
- Visit http://localhost:7474 to check Neo4j Browser

**"Embedding generation failed"**
- Check `VOYAGE_API_KEY` is set
- Verify API key is valid
- Check Voyage AI usage limits

**"No search results"**
- Run ingestion: `npm run ingest`
- Check Weaviate stats: `curl localhost:3000/api/admin/stats`
- Verify embeddings were generated

## Next Steps

1. **Add Authentication**: Implement user authentication for multi-user support
2. **Expand Tools**: Connect to actual CLOS/Game34/Neural Child APIs
3. **Enhanced UI**: Add visualizations for graph exploration
4. **Analytics**: Integrate Helicone + Posthog for observability
5. **Multi-modal**: Add support for images, PDFs, voice memos

## License

Private - Christopher Celaya Research Platform

## Contact

Questions? Issues? Contact christopher@celaya.solutions
