/**
 * Sitecore X-Ray Analyzer
 * 
 * Runs 12 analysis algorithms against scan data to detect issues.
 */

import {
  type ScanResult,
  type AnalysisResult,
  type AnalysisStats,
  type Issue,
  type IssueCategory,
  type IssueSeverity,
} from './types.js';

export class XRayAnalyzer {
  private scan: ScanResult;
  private issues: Issue[] = [];
  private issueCounter = 0;

  constructor(scan: ScanResult) {
    this.scan = scan;
  }

  /**
   * Run all analysis algorithms.
   */
  analyze(): AnalysisResult {
    // Run all 12 algorithms
    this.detectOrphans();
    this.detectUnusedTemplates();
    this.detectUnusedRenderings();
    this.detectBrokenLinks();
    this.detectDuplicates();
    this.detectSecurityIssues();
    this.detectDeepNesting();
    this.detectLargeMedia();
    this.detectStaleContent();
    this.detectCircularReferences();
    this.detectEmptyContainers();
    this.detectInvalidFields();

    const stats = this.calculateStats();
    const healthScore = this.calculateHealthScore(stats);
    const healthGrade = this.getHealthGrade(healthScore);

    return {
      scanId: this.scan.scanId,
      analyzedAt: new Date().toISOString(),
      healthScore,
      healthGrade,
      issues: this.issues,
      stats,
    };
  }

  // ============== Algorithm 1: Orphan Detection ==============

  private detectOrphans(): void {
    for (const [id, item] of this.scan.items) {
      // Check if parent exists
      if (item.parentId && !this.scan.items.has(item.parentId)) {
        // Parent ID exists but parent not in scan (could be outside scan scope)
        // Check if parent path matches
        const expectedParentPath = item.path.split('/').slice(0, -1).join('/');
        
        if (item.parentId && expectedParentPath) {
          this.addIssue({
            severity: 'warning',
            category: 'orphan',
            title: `Orphaned item: ${item.name}`,
            description: `Item's parent (${item.parentId}) was not found in the scanned content.`,
            itemId: id,
            itemPath: item.path,
            recommendation: 'Verify the parent item exists or move this item to a valid location.',
          });
        }
      }

      // Check for path mismatch (item path doesn't match tree structure)
      const pathParts = item.path.split('/').filter(Boolean);
      const expectedName = pathParts[pathParts.length - 1];
      
      if (expectedName && item.name !== expectedName) {
        this.addIssue({
          severity: 'info',
          category: 'orphan',
          title: `Path mismatch: ${item.name}`,
          description: `Item name "${item.name}" doesn't match path segment "${expectedName}".`,
          itemId: id,
          itemPath: item.path,
          recommendation: 'Consider renaming the item to match its URL path.',
        });
      }
    }
  }

  // ============== Algorithm 2: Unused Template Detection ==============

  private detectUnusedTemplates(): void {
    for (const [templateId, template] of this.scan.templates) {
      const usage = this.scan.templateUsage.get(templateId) || [];
      
      // Check if it's a base template (used by other templates)
      const isBaseTemplate = Array.from(this.scan.templates.values())
        .some(t => t.baseTemplateIds.includes(templateId));

      if (usage.length === 0 && !isBaseTemplate) {
        this.addIssue({
          severity: 'info',
          category: 'unused-template',
          title: `Unused template: ${template.name}`,
          description: `Template has no content items using it.`,
          itemId: templateId,
          itemPath: template.path,
          recommendation: 'Consider removing this template if it\'s no longer needed.',
          metadata: { usageCount: 0 },
        });
      }
    }
  }

  // ============== Algorithm 3: Unused Rendering Detection ==============

  private detectUnusedRenderings(): void {
    for (const [renderingId, rendering] of this.scan.renderings) {
      const usage = this.scan.renderingUsage.get(renderingId) || [];

      if (usage.length === 0) {
        this.addIssue({
          severity: 'info',
          category: 'unused-rendering',
          title: `Unused rendering: ${rendering.name}`,
          description: `Rendering is not used on any scanned pages.`,
          itemId: renderingId,
          itemPath: rendering.path,
          recommendation: 'Consider removing this rendering if it\'s no longer needed.',
          metadata: { usageCount: 0 },
        });
      }
    }
  }

  // ============== Algorithm 4: Broken Link Detection ==============

  private detectBrokenLinks(): void {
    // Check references in deep data
    for (const [itemId, deepData] of this.scan.deepData) {
      const item = this.scan.items.get(itemId);
      
      for (const field of deepData.fields) {
        // Check for GUID references in field values
        const guidPattern = /\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}/g;
        const matches = field.value.match(guidPattern) || [];

        for (const guid of matches) {
          const cleanGuid = guid.toUpperCase();
          
          // Check if referenced item exists
          if (!this.scan.items.has(cleanGuid) && 
              !this.scan.media.has(cleanGuid) && 
              !this.scan.templates.has(cleanGuid)) {
            this.addIssue({
              severity: 'warning',
              category: 'broken-link',
              title: `Broken link in: ${item?.name || itemId}`,
              description: `Field "${field.name}" references non-existent item ${guid}.`,
              itemId,
              itemPath: item?.path,
              recommendation: 'Update or remove the broken reference.',
              metadata: { field: field.name, targetId: guid },
            });
          }
        }
      }

      // Check rendering data sources
      for (const rendering of deepData.renderings) {
        if (rendering.dataSourceId && !this.scan.items.has(rendering.dataSourceId)) {
          this.addIssue({
            severity: 'warning',
            category: 'broken-link',
            title: `Broken data source on: ${item?.name || itemId}`,
            description: `Rendering data source ${rendering.dataSourceId} not found.`,
            itemId,
            itemPath: item?.path,
            recommendation: 'Update the rendering data source or remove the rendering.',
            metadata: { renderingId: rendering.renderingId, dataSourceId: rendering.dataSourceId },
          });
        }
      }
    }
  }

  // ============== Algorithm 5: Duplicate Detection ==============

  private detectDuplicates(): void {
    // Group items by template + name
    const groups = new Map<string, string[]>();
    
    for (const [id, item] of this.scan.items) {
      const key = `${item.templateId}:${item.name.toLowerCase()}`;
      const group = groups.get(key) || [];
      group.push(id);
      groups.set(key, group);
    }

    // Find duplicates
    for (const [key, itemIds] of groups) {
      if (itemIds.length > 1) {
        const items = itemIds.map(id => this.scan.items.get(id)!);
        const [templateId, name] = key.split(':');
        
        this.addIssue({
          severity: 'info',
          category: 'duplicate',
          title: `Duplicate items: ${name}`,
          description: `${itemIds.length} items with same name and template found.`,
          recommendation: 'Review these items - they may be intentional (multisite) or accidental duplicates.',
          metadata: {
            count: itemIds.length,
            paths: items.map(i => i.path),
            itemIds,
          },
        });
      }
    }
  }

  // ============== Algorithm 6: Security Analysis ==============

  private detectSecurityIssues(): void {
    for (const [itemId, deepData] of this.scan.deepData) {
      if (!deepData.security) continue;

      const item = this.scan.items.get(itemId);
      const security = deepData.security;

      // Check for overly permissive rules
      if (security.includes('Everyone') && security.includes(':write')) {
        this.addIssue({
          severity: 'critical',
          category: 'security',
          title: `Overly permissive: ${item?.name || itemId}`,
          description: 'Item grants write access to Everyone role.',
          itemId,
          itemPath: item?.path,
          recommendation: 'Restrict write access to specific roles.',
          metadata: { security },
        });
      }

      // Check for broken inheritance
      if (security.includes('ar|') && security.includes('|pd|')) {
        // Complex security - flag for review
        this.addIssue({
          severity: 'info',
          category: 'security',
          title: `Complex security: ${item?.name || itemId}`,
          description: 'Item has complex security rules that may need review.',
          itemId,
          itemPath: item?.path,
          recommendation: 'Review security configuration for correctness.',
          metadata: { security },
        });
      }
    }
  }

  // ============== Algorithm 7: Deep Nesting Detection ==============

  private detectDeepNesting(): void {
    for (const [id, item] of this.scan.items) {
      const depth = item.path.split('/').filter(Boolean).length;

      if (depth > 15) {
        this.addIssue({
          severity: 'critical',
          category: 'deep-nesting',
          title: `Critically deep: ${item.name}`,
          description: `Item is ${depth} levels deep. Sitecore performance degrades significantly past 15 levels.`,
          itemId: id,
          itemPath: item.path,
          recommendation: 'Restructure content to reduce nesting depth.',
          metadata: { depth },
        });
      } else if (depth > 10) {
        this.addIssue({
          severity: 'warning',
          category: 'deep-nesting',
          title: `Deeply nested: ${item.name}`,
          description: `Item is ${depth} levels deep. Consider flattening the structure.`,
          itemId: id,
          itemPath: item.path,
          recommendation: 'Consider restructuring to improve performance.',
          metadata: { depth },
        });
      }
    }
  }

  // ============== Algorithm 8: Large Media Detection ==============

  private detectLargeMedia(): void {
    const MB = 1024 * 1024;

    for (const [id, media] of this.scan.media) {
      if (media.size > 20 * MB) {
        this.addIssue({
          severity: 'critical',
          category: 'large-media',
          title: `Very large file: ${media.name}`,
          description: `Media file is ${(media.size / MB).toFixed(1)}MB. Files over 20MB significantly impact performance.`,
          itemId: id,
          itemPath: media.path,
          recommendation: 'Compress or move to external storage (CDN, blob storage).',
          metadata: { sizeBytes: media.size, sizeMB: media.size / MB },
        });
      } else if (media.size > 5 * MB) {
        this.addIssue({
          severity: 'warning',
          category: 'large-media',
          title: `Large file: ${media.name}`,
          description: `Media file is ${(media.size / MB).toFixed(1)}MB.`,
          itemId: id,
          itemPath: media.path,
          recommendation: 'Consider compressing this file.',
          metadata: { sizeBytes: media.size, sizeMB: media.size / MB },
        });
      }
    }
  }

  // ============== Algorithm 9: Stale Content Detection ==============

  private detectStaleContent(): void {
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

    for (const [id, item] of this.scan.items) {
      if (!item.updated) continue;

      const updated = new Date(item.updated);

      if (updated < twoYearsAgo) {
        this.addIssue({
          severity: 'warning',
          category: 'stale-content',
          title: `Very stale: ${item.name}`,
          description: `Item hasn't been updated in over 2 years.`,
          itemId: id,
          itemPath: item.path,
          recommendation: 'Review for accuracy or consider archiving.',
          metadata: { lastUpdated: item.updated },
        });
      } else if (updated < oneYearAgo) {
        this.addIssue({
          severity: 'info',
          category: 'stale-content',
          title: `Stale content: ${item.name}`,
          description: `Item hasn't been updated in over a year.`,
          itemId: id,
          itemPath: item.path,
          recommendation: 'Review for accuracy.',
          metadata: { lastUpdated: item.updated },
        });
      }
    }
  }

  // ============== Algorithm 10: Circular Reference Detection ==============

  private detectCircularReferences(): void {
    // Build reference graph from deep data
    const refGraph = new Map<string, string[]>();

    for (const [itemId, deepData] of this.scan.deepData) {
      const refs: string[] = [];
      
      for (const field of deepData.fields) {
        const guidPattern = /\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}/g;
        const matches = field.value.match(guidPattern) || [];
        refs.push(...matches.map(g => g.toUpperCase()));
      }

      if (refs.length > 0) {
        refGraph.set(itemId, refs);
      }
    }

    // DFS cycle detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = refGraph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, path);
        } else if (recursionStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor);
          cycles.push(path.slice(cycleStart));
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    for (const node of refGraph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    // Report cycles
    for (const cycle of cycles) {
      const items = cycle.map(id => this.scan.items.get(id)?.name || id);
      
      this.addIssue({
        severity: 'warning',
        category: 'circular-reference',
        title: `Circular reference detected`,
        description: `Items reference each other in a cycle: ${items.join(' → ')}.`,
        recommendation: 'Review and break the circular dependency.',
        metadata: { cycle, itemNames: items },
      });
    }
  }

  // ============== Algorithm 11: Empty Container Detection ==============

  private detectEmptyContainers(): void {
    for (const [id, item] of this.scan.items) {
      // Check if it's a folder-like item with no children
      const templateName = item.templateName.toLowerCase();
      const isFolderLike = templateName.includes('folder') || 
                          templateName.includes('bucket') ||
                          templateName.includes('container');

      if (isFolderLike && !item.hasChildren) {
        this.addIssue({
          severity: 'info',
          category: 'empty-container',
          title: `Empty folder: ${item.name}`,
          description: `Folder has no child items.`,
          itemId: id,
          itemPath: item.path,
          recommendation: 'Add content or remove this empty folder.',
        });
      }
    }
  }

  // ============== Algorithm 12: Invalid Field Validation ==============

  private detectInvalidFields(): void {
    for (const [itemId, deepData] of this.scan.deepData) {
      const item = this.scan.items.get(itemId);

      for (const field of deepData.fields) {
        // Validate date fields
        if (field.type?.toLowerCase().includes('date') && field.value) {
          if (!this.isValidDate(field.value)) {
            this.addIssue({
              severity: 'warning',
              category: 'invalid-field',
              title: `Invalid date: ${item?.name || itemId}`,
              description: `Field "${field.name}" has invalid date value.`,
              itemId,
              itemPath: item?.path,
              recommendation: 'Correct the date format.',
              metadata: { field: field.name, value: field.value },
            });
          }
        }

        // Validate link fields (should have valid GUID or empty)
        if (field.type?.toLowerCase().includes('link') && field.value) {
          if (!this.isValidLinkField(field.value)) {
            this.addIssue({
              severity: 'info',
              category: 'invalid-field',
              title: `Malformed link: ${item?.name || itemId}`,
              description: `Field "${field.name}" has malformed link value.`,
              itemId,
              itemPath: item?.path,
              recommendation: 'Review and correct the link field.',
              metadata: { field: field.name, value: field.value.substring(0, 100) },
            });
          }
        }

        // Check for potential JSON fields with invalid JSON
        if (field.value.startsWith('{') && field.value.endsWith('}')) {
          try {
            JSON.parse(field.value);
          } catch {
            this.addIssue({
              severity: 'warning',
              category: 'invalid-field',
              title: `Invalid JSON: ${item?.name || itemId}`,
              description: `Field "${field.name}" appears to contain invalid JSON.`,
              itemId,
              itemPath: item?.path,
              recommendation: 'Fix the JSON syntax.',
              metadata: { field: field.name },
            });
          }
        }
      }
    }
  }

  // ============== Helpers ==============

  private addIssue(issue: Omit<Issue, 'id'>): void {
    this.issues.push({
      ...issue,
      id: `issue-${++this.issueCounter}`,
    });
  }

  private isValidDate(value: string): boolean {
    // Sitecore date format: yyyyMMddTHHmmssZ
    const sitecoreDatePattern = /^\d{8}T\d{6}Z?$/;
    if (sitecoreDatePattern.test(value)) return true;

    // ISO format
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  private isValidLinkField(value: string): boolean {
    // Check for Sitecore link XML format
    if (value.includes('<link')) return true;
    
    // Check for GUID
    const guidPattern = /^\{?[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}?$/;
    if (guidPattern.test(value)) return true;

    // Check for URL
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
      return true;
    }

    return false;
  }

  private calculateStats(): AnalysisStats {
    const stats: AnalysisStats = {
      totalItems: this.scan.items.size,
      totalTemplates: this.scan.templates.size,
      totalMedia: this.scan.media.size,
      totalRenderings: this.scan.renderings.size,
      orphanedItems: 0,
      unusedTemplates: 0,
      unusedRenderings: 0,
      brokenLinks: 0,
      duplicates: 0,
      securityIssues: 0,
      deeplyNested: 0,
      largeMedia: 0,
      staleContent: 0,
      circularRefs: 0,
      emptyContainers: 0,
      invalidFields: 0,
      avgDepth: 0,
      maxDepth: 0,
      itemsPerTemplate: {},
    };

    // Count issues by category
    for (const issue of this.issues) {
      switch (issue.category) {
        case 'orphan': stats.orphanedItems++; break;
        case 'unused-template': stats.unusedTemplates++; break;
        case 'unused-rendering': stats.unusedRenderings++; break;
        case 'broken-link': stats.brokenLinks++; break;
        case 'duplicate': stats.duplicates++; break;
        case 'security': stats.securityIssues++; break;
        case 'deep-nesting': stats.deeplyNested++; break;
        case 'large-media': stats.largeMedia++; break;
        case 'stale-content': stats.staleContent++; break;
        case 'circular-reference': stats.circularRefs++; break;
        case 'empty-container': stats.emptyContainers++; break;
        case 'invalid-field': stats.invalidFields++; break;
      }
    }

    // Calculate depth stats
    let totalDepth = 0;
    for (const item of this.scan.items.values()) {
      const depth = item.path.split('/').filter(Boolean).length;
      totalDepth += depth;
      if (depth > stats.maxDepth) stats.maxDepth = depth;
    }
    stats.avgDepth = this.scan.items.size > 0 ? totalDepth / this.scan.items.size : 0;

    // Items per template
    for (const [templateId, usage] of this.scan.templateUsage) {
      const template = this.scan.templates.get(templateId);
      const name = template?.name || templateId;
      stats.itemsPerTemplate[name] = usage.length;
    }

    return stats;
  }

  private calculateHealthScore(stats: AnalysisStats): number {
    let score = 100;

    // Count issues by severity
    let critical = 0;
    let warning = 0;
    let info = 0;

    for (const issue of this.issues) {
      switch (issue.severity) {
        case 'critical': critical++; break;
        case 'warning': warning++; break;
        case 'info': info++; break;
      }
    }

    // Deductions (capped)
    score -= Math.min(critical * 5, 40);  // Max -40 for critical
    score -= Math.min(warning * 2, 30);   // Max -30 for warnings
    score -= Math.min(info * 0.5, 10);    // Max -10 for info

    // Bonuses
    if (stats.orphanedItems === 0) score += 5;
    if (stats.brokenLinks === 0) score += 5;
    if (stats.unusedTemplates === 0) score += 5;
    if (stats.securityIssues === 0) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private getHealthGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

/**
 * Run analysis on scan results.
 */
export function analyzeXRayScan(scan: ScanResult): AnalysisResult {
  const analyzer = new XRayAnalyzer(scan);
  return analyzer.analyze();
}
