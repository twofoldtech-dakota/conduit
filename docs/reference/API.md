# API Reference

Complete reference for all Conduit MCP tools.

## Content Tools

### content_list

List content items with optional filters and pagination.

**Input:**
```typescript
{
  adapter?: string;      // Adapter name (uses default if omitted)
  type?: string;         // Filter by content type
  status?: "draft" | "published" | "archived";
  limit?: number;        // Max items (default: 10)
  skip?: number;         // Offset for pagination
  locale?: string;       // Locale code
}
```

**Output:**
```typescript
{
  items: Content[];      // Array of content items
  total: number;         // Total count
  skip: number;          // Current offset
  limit: number;         // Items per page
  hasMore: boolean;      // More items available
}
```

**Example:**
```json
{
  "tool": "content_list",
  "arguments": {
    "type": "blogPost",
    "status": "published",
    "limit": 5
  }
}
```

---

### content_get

Get a single content item by ID.

**Input:**
```typescript
{
  adapter?: string;      // Adapter name
  id: string;            // Content ID (required)
  locale?: string;       // Locale code
}
```

**Output:**
```typescript
{
  id: string;
  type: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
  locale?: string;
  fields: Record<string, unknown>;
  _raw: unknown;         // Original CMS response
}
```

**Example:**
```json
{
  "tool": "content_get",
  "arguments": {
    "id": "abc123",
    "locale": "en-US"
  }
}
```

---

### content_search

Full-text search across content.

**Input:**
```typescript
{
  adapter?: string;      // Adapter name
  query: string;         // Search query (required)
  type?: string;         // Filter by content type
  limit?: number;        // Max results (default: 10)
}
```

**Output:** Same as `content_list`

**Example:**
```json
{
  "tool": "content_search",
  "arguments": {
    "query": "getting started",
    "type": "article",
    "limit": 20
  }
}
```

---

### content_create

Create new content (requires write-enabled adapter).

**Input:**
```typescript
{
  adapter?: string;      // Adapter name
  type: string;          // Content type (required)
  fields: Record<string, unknown>;  // Field values (required)
  locale?: string;       // Locale code
  publish?: boolean;     // Publish immediately
}
```

**Output:** Created `Content` object

**Example:**
```json
{
  "tool": "content_create",
  "arguments": {
    "type": "blogPost",
    "fields": {
      "title": "My New Post",
      "body": "Content goes here...",
      "author": "John Doe"
    },
    "publish": false
  }
}
```

---

### content_update

Update existing content.

**Input:**
```typescript
{
  adapter?: string;      // Adapter name
  id: string;            // Content ID (required)
  fields: Record<string, unknown>;  // Fields to update (required)
  locale?: string;       // Locale code
  publish?: boolean;     // Publish after update
}
```

**Output:** Updated `Content` object

**Example:**
```json
{
  "tool": "content_update",
  "arguments": {
    "id": "abc123",
    "fields": {
      "title": "Updated Title"
    },
    "publish": true
  }
}
```

---

## Media Tools

### media_list

List media assets.

**Input:**
```typescript
{
  adapter?: string;      // Adapter name
  limit?: number;        // Max items (default: 10)
  skip?: number;         // Offset for pagination
}
```

**Output:**
```typescript
{
  items: Media[];
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
}
```

**Media object:**
```typescript
{
  id: string;
  filename: string;
  mimeType: string;
  size: number;          // Bytes
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  createdAt: string;
}
```

---

### media_get

Get a single media asset.

**Input:**
```typescript
{
  adapter?: string;      // Adapter name
  id: string;            // Media ID (required)
}
```

**Output:** `Media` object

---

## Schema Tools

### schema_list

List all content types/models.

**Input:**
```typescript
{
  adapter?: string;      // Adapter name
}
```

**Output:**
```typescript
ContentType[]
```

**ContentType:**
```typescript
{
  id: string;
  name: string;
  description?: string;
  fields: FieldDefinition[];
}
```

---

### schema_get

Get a content type definition with fields.

**Input:**
```typescript
{
  adapter?: string;      // Adapter name
  id: string;            // Content type ID (required)
}
```

**Output:** `ContentType` object with full field definitions

---

## Utility Tools

### health_check

Check adapter health and connectivity.

**Input:**
```typescript
{
  adapter?: string;      // Specific adapter, or check all if omitted
}
```

**Output:**
```typescript
{
  healthy: boolean;
  latencyMs: number;
  message: string;
}
```

Or for all adapters:
```typescript
{
  [adapterName: string]: {
    healthy: boolean;
    latencyMs: number;
    message: string;
  }
}
```

---

## X-Ray Tools (Sitecore XP Premium)

### xray_scan

Start a new audit scan.

**Input:**
```typescript
{
  adapter: string;              // Must be sitecore-xp
  rootPath?: string;            // Default: /sitecore/content
  includeTemplates?: boolean;   // Default: true
  includeMedia?: boolean;       // Default: true
  includeRenderings?: boolean;  // Default: true
  maxDepth?: number;            // Default: -1 (unlimited)
  tier?: 1 | 2 | 3;             // Scan tier (default: 1)
}
```

**Output:**
```typescript
{
  scanId: string;
  status: "scanning";
}
```

---

### xray_status

Check scan progress.

**Input:**
```typescript
{
  scanId: string;
}
```

**Output:**
```typescript
{
  status: "pending" | "scanning" | "analyzing" | "complete" | "failed";
  progress: {
    phase: string;
    itemsScanned: number;
    totalEstimate: number;
    currentPath: string;
  }
}
```

---

### xray_report

Get analysis results.

**Input:**
```typescript
{
  scanId: string;
  category?: IssueCategory;     // Filter by category
  severity?: "critical" | "warning" | "info";
}
```

**Output:**
```typescript
{
  healthScore: number;          // 0-100
  healthGrade: "A" | "B" | "C" | "D" | "F";
  issues: Issue[];
  stats: AnalysisStats;
}
```

**Issue categories:**
- `orphan` - Orphaned items
- `unused-template` - Unused templates
- `unused-rendering` - Unused renderings
- `broken-link` - Broken references
- `duplicate` - Duplicate items
- `security` - Security issues
- `deep-nesting` - Deeply nested items
- `large-media` - Large media files
- `stale-content` - Stale content
- `circular-reference` - Circular references
- `empty-container` - Empty folders
- `invalid-field` - Invalid field values

---

### xray_graph

Get knowledge graph.

**Input:**
```typescript
{
  scanId: string;
  nodeTypes?: NodeType[];       // Filter nodes
  maxNodes?: number;            // Default: 1000
  centerOn?: string;            // Item ID to center on
}
```

**Output:**
```typescript
{
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    nodesByType: Record<NodeType, number>;
    edgesByType: Record<EdgeType, number>;
  }
}
```

---

### xray_health

Quick health check (cached from last scan).

**Input:**
```typescript
{
  adapter: string;
}
```

**Output:**
```typescript
{
  healthScore: number;
  lastScanAt: string;
  criticalIssues: number;
  topIssue: Issue | null;
}
```

---

## Error Responses

All tools return errors in this format:

```typescript
{
  error: string;
}
```

Common errors:
- `Adapter not found: {name}` - Invalid adapter name
- `{Operation} not supported by {adapter} adapter` - Capability not available
- `No adapter configured` - No adapters in config
- `{CMS} API error: {status} - {message}` - API-level error
