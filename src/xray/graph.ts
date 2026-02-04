/**
 * Sitecore X-Ray Knowledge Graph Builder
 * 
 * Builds a graph representation of Sitecore content relationships.
 * Compatible with D3.js, Cytoscape, Neo4j import.
 */

import {
  type ScanResult,
  type KnowledgeGraph,
  type GraphNode,
  type GraphEdge,
  type NodeType,
  type EdgeType,
} from './types.js';

export interface GraphOptions {
  /** Filter to specific node types */
  nodeTypes?: NodeType[];
  /** Maximum nodes to include (default: 1000) */
  maxNodes?: number;
  /** Center graph on specific item ID */
  centerOn?: string;
  /** Include edges (default: true) */
  includeEdges?: boolean;
}

const DEFAULT_OPTIONS: Required<GraphOptions> = {
  nodeTypes: ['item', 'template', 'media', 'rendering', 'placeholder'],
  maxNodes: 1000,
  centerOn: '',
  includeEdges: true,
};

export class XRayGraphBuilder {
  private scan: ScanResult;
  private options: Required<GraphOptions>;
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];

  constructor(scan: ScanResult, options: GraphOptions = {}) {
    this.scan = scan;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Build the knowledge graph.
   */
  build(): KnowledgeGraph {
    // If centering on an item, start from there
    if (this.options.centerOn) {
      this.buildFromCenter(this.options.centerOn);
    } else {
      this.buildFull();
    }

    // Convert to arrays and apply limits
    let nodeArray = Array.from(this.nodes.values());
    
    // Apply max nodes limit
    if (nodeArray.length > this.options.maxNodes) {
      nodeArray = this.prioritizeNodes(nodeArray, this.options.maxNodes);
      
      // Filter edges to only include nodes in the limited set
      const nodeIds = new Set(nodeArray.map(n => n.id));
      this.edges = this.edges.filter(e => 
        nodeIds.has(e.source) && nodeIds.has(e.target)
      );
    }

    return {
      scanId: this.scan.scanId,
      generatedAt: new Date().toISOString(),
      nodes: nodeArray,
      edges: this.options.includeEdges ? this.edges : [],
      stats: this.calculateStats(nodeArray),
    };
  }

  /**
   * Build graph centered on a specific item.
   */
  private buildFromCenter(centerId: string): void {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: centerId, depth: 0 }];
    const maxDepth = 3; // Limit traversal depth from center

    while (queue.length > 0 && this.nodes.size < this.options.maxNodes) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      // Add item node
      const item = this.scan.items.get(id);
      if (item && this.shouldIncludeType('item')) {
        this.addNode({
          id: item.id,
          type: 'item',
          label: item.name,
          path: item.path,
          metadata: { templateName: item.templateName },
        });

        // Add template relationship
        if (this.shouldIncludeType('template')) {
          const template = this.scan.templates.get(item.templateId);
          if (template) {
            this.addNode({
              id: template.id,
              type: 'template',
              label: template.name,
              path: template.path,
            });
            this.addEdge(item.id, template.id, 'instance-of');
          }
        }

        // Add parent relationship
        if (item.parentId && depth < maxDepth) {
          const parent = this.scan.items.get(item.parentId);
          if (parent) {
            queue.push({ id: parent.id, depth: depth + 1 });
            this.addEdge(item.parentId, item.id, 'parent-of');
          }
        }

        // Add children
        const children = this.scan.childrenMap.get(id) || [];
        for (const childId of children) {
          if (depth < maxDepth) {
            queue.push({ id: childId, depth: depth + 1 });
          }
        }

        // Add rendering relationships from deep data
        const deepData = this.scan.deepData.get(id);
        if (deepData && this.shouldIncludeType('rendering')) {
          for (const rendering of deepData.renderings) {
            const renderingDef = this.scan.renderings.get(rendering.renderingId);
            if (renderingDef) {
              this.addNode({
                id: renderingDef.id,
                type: 'rendering',
                label: renderingDef.name,
                path: renderingDef.path,
              });
              this.addEdge(item.id, renderingDef.id, 'uses-rendering');

              // Add placeholder node
              if (this.shouldIncludeType('placeholder')) {
                const phId = `ph:${rendering.placeholder}`;
                this.addNode({
                  id: phId,
                  type: 'placeholder',
                  label: rendering.placeholder,
                });
                this.addEdge(renderingDef.id, phId, 'datasource');
              }
            }

            // Add data source relationship
            if (rendering.dataSourceId) {
              const dsItem = this.scan.items.get(rendering.dataSourceId);
              if (dsItem) {
                queue.push({ id: dsItem.id, depth: depth + 1 });
                this.addEdge(rendering.renderingId, dsItem.id, 'datasource');
              }
            }
          }
        }
      }

      // Check media
      const media = this.scan.media.get(id);
      if (media && this.shouldIncludeType('media')) {
        this.addNode({
          id: media.id,
          type: 'media',
          label: media.name,
          path: media.path,
          metadata: { size: media.size, extension: media.extension },
        });
      }
    }
  }

  /**
   * Build full graph from all scan data.
   */
  private buildFull(): void {
    // Add all items
    if (this.shouldIncludeType('item')) {
      for (const [id, item] of this.scan.items) {
        this.addNode({
          id,
          type: 'item',
          label: item.name,
          path: item.path,
          metadata: { templateName: item.templateName },
        });

        // Parent-child edges
        if (item.parentId && this.scan.items.has(item.parentId)) {
          this.addEdge(item.parentId, id, 'parent-of');
        }

        // Instance-of template
        if (this.shouldIncludeType('template') && item.templateId) {
          this.addEdge(id, item.templateId, 'instance-of');
        }
      }
    }

    // Add all templates
    if (this.shouldIncludeType('template')) {
      for (const [id, template] of this.scan.templates) {
        this.addNode({
          id,
          type: 'template',
          label: template.name,
          path: template.path,
        });

        // Template inheritance
        for (const baseId of template.baseTemplateIds) {
          if (this.scan.templates.has(baseId)) {
            this.addEdge(id, baseId, 'inherits');
          }
        }
      }
    }

    // Add all media
    if (this.shouldIncludeType('media')) {
      for (const [id, media] of this.scan.media) {
        this.addNode({
          id,
          type: 'media',
          label: media.name,
          path: media.path,
          metadata: { size: media.size, extension: media.extension },
        });
      }
    }

    // Add all renderings
    if (this.shouldIncludeType('rendering')) {
      for (const [id, rendering] of this.scan.renderings) {
        this.addNode({
          id,
          type: 'rendering',
          label: rendering.name,
          path: rendering.path,
        });
      }

      // Add rendering usage from deep data
      for (const [pageId, deepData] of this.scan.deepData) {
        for (const rendering of deepData.renderings) {
          if (this.scan.renderings.has(rendering.renderingId)) {
            this.addEdge(pageId, rendering.renderingId, 'uses-rendering');

            // Add placeholder
            if (this.shouldIncludeType('placeholder')) {
              const phId = `ph:${rendering.placeholder}`;
              if (!this.nodes.has(phId)) {
                this.addNode({
                  id: phId,
                  type: 'placeholder',
                  label: rendering.placeholder,
                });
              }
            }

            // Data source edge
            if (rendering.dataSourceId && this.scan.items.has(rendering.dataSourceId)) {
              this.addEdge(rendering.renderingId, rendering.dataSourceId, 'datasource');
            }
          }
        }
      }
    }

    // Add reference edges from deep data
    for (const [itemId, deepData] of this.scan.deepData) {
      for (const field of deepData.fields) {
        const guidPattern = /\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}/g;
        const matches = field.value.match(guidPattern) || [];

        for (const guid of matches) {
          const targetId = guid.toUpperCase();
          
          // Check if it's a content reference
          if (this.scan.items.has(targetId)) {
            this.addEdge(itemId, targetId, 'references');
          }
          // Check if it's a media reference
          else if (this.scan.media.has(targetId)) {
            this.addEdge(itemId, targetId, 'uses-media');
          }
        }
      }
    }
  }

  /**
   * Prioritize nodes when over the limit.
   */
  private prioritizeNodes(nodes: GraphNode[], limit: number): GraphNode[] {
    // Priority: items with most connections > templates > renderings > media > placeholders
    const connectionCount = new Map<string, number>();
    
    for (const edge of this.edges) {
      connectionCount.set(edge.source, (connectionCount.get(edge.source) || 0) + 1);
      connectionCount.set(edge.target, (connectionCount.get(edge.target) || 0) + 1);
    }

    const typePriority: Record<NodeType, number> = {
      item: 5,
      template: 4,
      rendering: 3,
      media: 2,
      placeholder: 1,
    };

    return nodes
      .sort((a, b) => {
        // First by type priority
        const typeA = typePriority[a.type] || 0;
        const typeB = typePriority[b.type] || 0;
        if (typeB !== typeA) return typeB - typeA;

        // Then by connection count
        const connA = connectionCount.get(a.id) || 0;
        const connB = connectionCount.get(b.id) || 0;
        return connB - connA;
      })
      .slice(0, limit);
  }

  private shouldIncludeType(type: NodeType): boolean {
    return this.options.nodeTypes.includes(type);
  }

  private addNode(node: GraphNode): void {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, node);
    }
  }

  private addEdge(source: string, target: string, type: EdgeType): void {
    // Avoid duplicate edges
    const exists = this.edges.some(
      e => e.source === source && e.target === target && e.type === type
    );
    if (!exists) {
      this.edges.push({ source, target, type });
    }
  }

  private calculateStats(nodes: GraphNode[]): KnowledgeGraph['stats'] {
    const nodesByType: Record<NodeType, number> = {
      item: 0,
      template: 0,
      media: 0,
      rendering: 0,
      placeholder: 0,
    };

    for (const node of nodes) {
      nodesByType[node.type]++;
    }

    const edgesByType: Record<EdgeType, number> = {
      'parent-of': 0,
      'child-of': 0,
      'instance-of': 0,
      'inherits': 0,
      'references': 0,
      'uses-rendering': 0,
      'datasource': 0,
      'uses-media': 0,
    };

    for (const edge of this.edges) {
      edgesByType[edge.type]++;
    }

    return {
      nodeCount: nodes.length,
      edgeCount: this.edges.length,
      nodesByType,
      edgesByType,
    };
  }
}

/**
 * Build knowledge graph from scan results.
 */
export function buildKnowledgeGraph(
  scan: ScanResult,
  options?: GraphOptions
): KnowledgeGraph {
  const builder = new XRayGraphBuilder(scan, options);
  return builder.build();
}
