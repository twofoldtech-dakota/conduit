/**
 * Sitecore X-Ray Types
 * 
 * Type definitions for the audit and knowledge graph system.
 * Supports tiered scanning for efficient handling of large instances.
 */

// ============== Scan Configuration ==============

export interface XRayScanConfig {
  /** Root path to scan (default: /sitecore/content) */
  rootPath: string;
  /** Maximum depth to scan (-1 for unlimited) */
  maxDepth: number;
  /** Include templates in scan */
  includeTemplates: boolean;
  /** Include media library */
  includeMedia: boolean;
  /** Include renderings/layouts */
  includeRenderings: boolean;
  /** Languages to scan */
  languages: string[];
  /** Database to scan (master/web) */
  database: 'master' | 'web';
  /** Delay between API requests (ms) */
  requestDelay: number;
  /** Max items before warning */
  maxItems: number;
  /** Scan tier (1=index, 2=deep, 3=focused) */
  tier: 1 | 2 | 3;
}

export const DEFAULT_SCAN_CONFIG: XRayScanConfig = {
  rootPath: '/sitecore/content',
  maxDepth: -1,
  includeTemplates: true,
  includeMedia: true,
  includeRenderings: true,
  languages: ['en'],
  database: 'master',
  requestDelay: 50,
  maxItems: 50000,
  tier: 1,
};

// ============== Tier 1: Lightweight Index Data ==============
// ~100 bytes per item - can handle 500K items in ~50MB RAM

export interface IndexedItem {
  id: string;
  name: string;
  path: string;
  templateId: string;
  templateName: string;
  parentId: string;
  hasChildren: boolean;
  updated: string;
  language: string;
}

export interface IndexedTemplate {
  id: string;
  name: string;
  path: string;
  baseTemplateIds: string[];
}

export interface IndexedMedia {
  id: string;
  name: string;
  path: string;
  size: number;
  extension: string;
}

export interface IndexedRendering {
  id: string;
  name: string;
  path: string;
}

// ============== Tier 2: Deep Scan Data ==============
// Full field data - only fetched for flagged items

export interface DeepItemData {
  id: string;
  fields: ItemField[];
  renderings: PageRendering[];
  security?: string;
}

export interface ItemField {
  name: string;
  value: string;
  type?: string;
}

export interface PageRendering {
  uid: string;
  renderingId: string;
  placeholder: string;
  dataSourceId?: string;
}

// ============== Scan State ==============

export type ScanStatus = 'pending' | 'scanning' | 'analyzing' | 'complete' | 'failed';
export type ScanPhase = 'items' | 'templates' | 'media' | 'renderings' | 'deep' | 'analyzing' | 'complete';

export interface ScanProgress {
  phase: ScanPhase;
  itemsScanned: number;
  totalEstimate: number;
  currentPath: string;
  startedAt: string;
  errors: ScanError[];
}

export interface ScanError {
  path: string;
  message: string;
  timestamp: string;
}

export interface ScanResult {
  scanId: string;
  status: ScanStatus;
  config: XRayScanConfig;
  progress: ScanProgress;
  
  // Tier 1 data (lightweight index)
  items: Map<string, IndexedItem>;
  templates: Map<string, IndexedTemplate>;
  media: Map<string, IndexedMedia>;
  renderings: Map<string, IndexedRendering>;
  
  // Relationship maps (built during scan)
  childrenMap: Map<string, string[]>;      // parentId -> childIds
  templateUsage: Map<string, string[]>;    // templateId -> itemIds
  renderingUsage: Map<string, string[]>;   // renderingId -> pageIds
  references: Map<string, string[]>;       // itemId -> referenced itemIds
  
  // Tier 2 data (on-demand deep scan)
  deepData: Map<string, DeepItemData>;
  
  // Timestamps
  startedAt: string;
  completedAt?: string;
}

// ============== Analysis & Issues ==============

export type IssueSeverity = 'critical' | 'warning' | 'info';

// 12 issue categories matching our analysis algorithms
export type IssueCategory =
  | 'orphan'             // Orphan Detection
  | 'unused-template'    // Unused Template Detection
  | 'unused-rendering'   // Unused Rendering Detection
  | 'broken-link'        // Broken Link Detection
  | 'duplicate'          // Duplicate Detection
  | 'security'           // Security Analysis
  | 'deep-nesting'       // Deep Nesting Detection
  | 'large-media'        // Large Media Detection
  | 'stale-content'      // Stale Content Detection
  | 'circular-reference' // Circular Reference Detection
  | 'empty-container'    // Empty Container Detection
  | 'invalid-field';     // Invalid Field Validation

export interface Issue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  itemId?: string;
  itemPath?: string;
  recommendation?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalysisResult {
  scanId: string;
  analyzedAt: string;
  healthScore: number;
  healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: Issue[];
  stats: AnalysisStats;
}

export interface AnalysisStats {
  totalItems: number;
  totalTemplates: number;
  totalMedia: number;
  totalRenderings: number;
  
  // Issue counts by category
  orphanedItems: number;
  unusedTemplates: number;
  unusedRenderings: number;
  brokenLinks: number;
  duplicates: number;
  securityIssues: number;
  deeplyNested: number;
  largeMedia: number;
  staleContent: number;
  circularRefs: number;
  emptyContainers: number;
  invalidFields: number;
  
  // Structure stats
  avgDepth: number;
  maxDepth: number;
  itemsPerTemplate: Record<string, number>;
}

// ============== Knowledge Graph ==============

export type NodeType = 'item' | 'template' | 'media' | 'rendering' | 'placeholder';

export type EdgeType =
  | 'parent-of'      // Item -> Child Item
  | 'child-of'       // Item -> Parent Item  
  | 'instance-of'    // Item -> Template
  | 'inherits'       // Template -> Base Template
  | 'references'     // Item -> Referenced Item (links)
  | 'uses-rendering' // Page -> Rendering
  | 'datasource'     // Rendering -> Data Source Item
  | 'uses-media';    // Item -> Media

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  path?: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraph {
  scanId: string;
  generatedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    nodesByType: Record<NodeType, number>;
    edgesByType: Record<EdgeType, number>;
  };
}

// ============== Reports ==============

export interface XRayReport {
  scanId: string;
  generatedAt: string;
  instanceUrl: string;
  healthScore: number;
  healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  scanDuration: number;
  stats: AnalysisStats;
  issues: Issue[];
  recommendations: Recommendation[];
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  affectedItems: number;
}

// ============== MCP Tool Inputs ==============

export interface XRayScanInput {
  adapter: string;
  rootPath?: string;
  includeTemplates?: boolean;
  includeMedia?: boolean;
  includeRenderings?: boolean;
  maxDepth?: number;
  tier?: 1 | 2 | 3;
}

export interface XRayStatusInput {
  scanId: string;
}

export interface XRayReportInput {
  scanId: string;
  category?: IssueCategory;
  severity?: IssueSeverity;
}

export interface XRayGraphInput {
  scanId: string;
  nodeTypes?: NodeType[];
  maxNodes?: number;
  centerOn?: string;
}

export interface XRayHealthInput {
  adapter: string;
}
