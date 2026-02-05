# Sitecore X-Ray: Architecture & Design

A comprehensive audit and knowledge graph system for Sitecore XP installations.

## Overview

X-Ray scans a Sitecore instance via API, analyzes the collected data for issues, and generates a knowledge graph showing relationships between all entities.

## Goals

- **Audit**: Find orphaned items, unused templates, broken links, security gaps
- **Visualize**: Generate knowledge graph showing item/template/rendering relationships
- **Score**: Provide actionable health score with prioritized recommendations
- **Premium Feature**: Differentiates Conduit for Sitecore shops

## Data Collection

### What We Scan

**Via SSC API (existing adapter)**

- Content items: ID, path, template, fields, parent, children
- Templates: ID, fields, inheritance chain, standard values
- Renderings: Definition items under /sitecore/layout/renderings
- Media: Items under /sitecore/media library
- Layout data: `__Renderings` and `__Final Renderings` fields

**Extracted from Fields**

- Reference links: Droptree, Droplink, Multilist, Treelist fields
- Media references: Image fields, File fields
- Internal links: Rich Text link parsing
- Data sources: From layout XML

### Scan Process (Tiered)

**Tier 1: Index Scan (lightweight)**

Fetch only: ID, path, templateId, parentId, updatedDate
~100 bytes per item → 100K items = ~10MB RAM

```
1. Authenticate via SSC
2. Crawl /sitecore/content (breadth-first)
   - Fetch minimal fields only
   - Build parent/child map
   - Build template usage map
3. Crawl /sitecore/templates (minimal)
4. Run Tier 1 analysis (orphans, unused, structure)
```

**Tier 2: Deep Scan (on-demand)**

Fetch full fields for flagged items only:

```
1. Items flagged by Tier 1 (orphans, broken refs)
2. Pages with layouts (for rendering analysis)
3. User-specified focus areas
```

**Tier 3: Focused Scan**

User specifies subtree, full detail within bounded scope.

### Rate Limiting

- Batch requests where possible (up to 50 items/request)
- Configurable delay between requests (default: 50ms)
- Progress callbacks for UI updates
- Respects Sitecore API rate limits

## Analysis Algorithms

### 1. Orphan Detection

```
For each item:
  - If parent ID doesn't exist in scanned items → orphan
  - If path doesn't match parent's path + name → path mismatch
```

### 2. Unused Template Detection

```
For each template:
  - Count items using this template
  - If count = 0 and not a base template → unused
```

### 3. Broken Link Detection

```
For each reference field value:
  - Extract target ID(s)
  - If target ID not in scanned items → broken link
```

### 4. Unused Rendering Detection

```
For each rendering definition:
  - Scan all page layouts for usage
  - If not used anywhere → unused
```

### 5. Duplicate Detection

```
Group items by (templateId + name)
  - If group.length > 1 → potential duplicates
```

### 6. Security Analysis

```
For items with __Security field:
  - Parse security string
  - Flag overly permissive rules (e.g., Everyone:write)
```

### 7. Deep Nesting Detection

```
For each item:
  - Count path segments
  - If depth > 10 → performance warning
  - If depth > 15 → critical (Sitecore struggles)
```

### 8. Large Media Detection

```
For each media item:
  - Check Size field
  - If > 5MB → warning
  - If > 20MB → critical
```

### 9. Stale Content Detection

```
For each item:
  - Check __Updated field
  - If > 12 months old → info (potential cleanup)
  - If > 24 months old → warning
```

### 10. Circular Reference Detection

```
Build directed graph of references
Run cycle detection (DFS with visited set)
Flag any cycles found → warning
```

### 11. Empty Container Detection

```
For items with HasChildren = false:
  - If template name contains "Folder" → empty folder
  - If item has child placeholder structure → empty container
```

### 12. Invalid Field Validation

```
For each field by type:
  - Date fields: validate ISO format
  - Link fields: validate GUID format
  - Image fields: validate media path exists
  - JSON fields: validate parseable
```

### Health Score Calculation

```
Base: 100 points

Deductions:
  - Critical issue: -5 points each (max -40)
  - Warning issue: -2 points each (max -30)
  - Info issue: -0.5 points each (max -10)

Bonuses:
  - No orphans: +5
  - No broken links: +5
  - All templates used: +5
  - Good naming conventions: +5

Final: clamp(0, 100)
```

## Knowledge Graph

### Node Types

- `item`: Content item
- `template`: Template definition
- `media`: Media library item
- `rendering`: Rendering definition
- `placeholder`: Placeholder key

### Edge Types

- `parent-of` / `child-of`: Tree structure
- `instance-of`: Item → Template
- `inherits`: Template → Base Template
- `references`: Item → Item (link fields)
- `uses-rendering`: Page → Rendering
- `datasource`: Rendering instance → Data source item
- `uses-media`: Item → Media item

### Graph Output Format

```json
{
  "nodes": [
    {
      "id": "guid",
      "type": "item",
      "label": "Home",
      "path": "/sitecore/content/Home"
    }
  ],
  "edges": [{ "source": "guid1", "target": "guid2", "type": "parent-of" }]
}
```

Compatible with D3.js, Cytoscape, Neo4j import.

## MCP Tools

### xray_scan

Start a new scan.

```
Input:
  adapter: string (required, must be sitecore-xp)
  rootPath: string (default: /sitecore/content)
  includeTemplates: boolean (default: true)
  includeMedia: boolean (default: true)
  includeRenderings: boolean (default: true)
  maxDepth: number (default: -1 unlimited)

Output:
  scanId: string
  status: "scanning"
```

### xray_status

Check scan progress.

```
Input:
  scanId: string

Output:
  status: "scanning" | "analyzing" | "complete" | "failed"
  progress: { phase, itemsScanned, currentPath }
```

### xray_report

Get analysis results.

```
Input:
  scanId: string
  category?: IssueCategory (filter by category)
  severity?: IssueSeverity (filter by severity)

Output:
  healthScore: number
  healthGrade: "A" | "B" | "C" | "D" | "F"
  issues: Issue[]
  stats: AnalysisStats
```

### xray_graph

Get knowledge graph.

```
Input:
  scanId: string
  nodeTypes?: NodeType[] (filter nodes)
  maxNodes?: number (limit for large graphs)
  centerOn?: string (item ID to center graph on)

Output:
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: { nodeCount, edgeCount }
```

### xray_health

Quick health check (cached from last scan).

```
Input:
  adapter: string

Output:
  healthScore: number
  lastScanAt: string
  criticalIssues: number
  topIssue: Issue | null
```

## File Structure

```
src/xray/
├── types.ts        # Type definitions
├── scanner.ts      # Data collection
├── analyzer.ts     # Issue detection algorithms
├── graph.ts        # Knowledge graph builder
├── reports.ts      # Report generation
└── index.ts        # Module exports
```

## Future: Pulse Integration

X-Ray is the engine. Pulse (future product) would:

- Schedule periodic X-Ray scans
- Store historical results
- Track trends over time
- Send alerts on regressions
- Provide web dashboard

## Design Decisions

1. **Scan storage**: In-memory for v1 (Pulse will add persistence later)
2. **Large instances**: Tiered scanning - lightweight index scan first, deep scan on-demand
3. **Concurrent scans**: One scan at a time per adapter, queue additional requests
4. **Graph limits**: Default 1000 nodes, configurable via maxNodes param
