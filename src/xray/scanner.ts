/**
 * Sitecore X-Ray Scanner
 * 
 * Tiered data collection from Sitecore XP via SSC API.
 * - Tier 1: Lightweight index scan (~100 bytes/item)
 * - Tier 2: Deep scan for flagged items only
 * - Tier 3: Focused scan on specific subtree
 */

import type { SitecoreXPAdapter } from '../adapters/sitecore-xp.js';
import {
  type XRayScanConfig,
  type ScanResult,
  type ScanProgress,
  type ScanStatus,
  type IndexedItem,
  type IndexedTemplate,
  type IndexedMedia,
  type IndexedRendering,
  type DeepItemData,
  type PageRendering,
  DEFAULT_SCAN_CONFIG,
} from './types.js';

interface SitecoreItem {
  ItemID: string;
  ItemName: string;
  ItemPath: string;
  TemplateID: string;
  TemplateName: string;
  ParentID?: string;
  HasChildren?: boolean;
  ItemUpdated?: string;
  ItemLanguage?: string;
  ItemFields?: Array<{ Name: string; Value: string; Type?: string }>;
}

interface SitecoreSearchResult {
  TotalCount: number;
  ResultItems: SitecoreItem[];
}

export class XRayScanner {
  private adapter: SitecoreXPAdapter;
  private config: XRayScanConfig;
  private result: ScanResult;
  private aborted = false;

  constructor(adapter: SitecoreXPAdapter, config: Partial<XRayScanConfig> = {}) {
    this.adapter = adapter;
    this.config = { ...DEFAULT_SCAN_CONFIG, ...config };
    this.result = this.initializeResult();
  }

  private initializeResult(): ScanResult {
    return {
      scanId: this.generateScanId(),
      status: 'pending',
      config: this.config,
      progress: {
        phase: 'items',
        itemsScanned: 0,
        totalEstimate: 0,
        currentPath: '',
        startedAt: new Date().toISOString(),
        errors: [],
      },
      items: new Map(),
      templates: new Map(),
      media: new Map(),
      renderings: new Map(),
      childrenMap: new Map(),
      templateUsage: new Map(),
      renderingUsage: new Map(),
      references: new Map(),
      deepData: new Map(),
      startedAt: new Date().toISOString(),
    };
  }

  private generateScanId(): string {
    return `xray-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current scan result (for status checks).
   */
  getResult(): ScanResult {
    return this.result;
  }

  /**
   * Abort the current scan.
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Run the scan based on configured tier.
   */
  async scan(onProgress?: (progress: ScanProgress) => void): Promise<ScanResult> {
    this.result.status = 'scanning';
    this.result.startedAt = new Date().toISOString();

    try {
      // Tier 1: Lightweight index scan
      await this.scanItems(onProgress);
      
      if (this.config.includeTemplates) {
        await this.scanTemplates(onProgress);
      }
      
      if (this.config.includeMedia) {
        await this.scanMedia(onProgress);
      }
      
      if (this.config.includeRenderings) {
        await this.scanRenderings(onProgress);
      }

      // Tier 2: Deep scan if requested
      if (this.config.tier >= 2) {
        await this.deepScanFlaggedItems(onProgress);
      }

      // Build relationship maps
      this.buildRelationshipMaps();

      this.result.status = 'complete';
      this.result.completedAt = new Date().toISOString();
      this.result.progress.phase = 'complete';
      
    } catch (error) {
      this.result.status = 'failed';
      this.result.progress.errors.push({
        path: this.result.progress.currentPath,
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }

    return this.result;
  }

  /**
   * Tier 1: Scan content items (lightweight).
   */
  private async scanItems(onProgress?: (progress: ScanProgress) => void): Promise<void> {
    this.result.progress.phase = 'items';
    
    // Start with root path
    const queue: string[] = [this.config.rootPath];
    let depth = 0;

    while (queue.length > 0 && !this.aborted) {
      const currentPath = queue.shift()!;
      this.result.progress.currentPath = currentPath;

      try {
        // Fetch children of current path
        const children = await this.fetchChildren(currentPath);
        
        for (const item of children) {
          if (this.aborted) break;
          
          // Check max items limit
          if (this.result.items.size >= this.config.maxItems) {
            this.result.progress.errors.push({
              path: currentPath,
              message: `Max items limit reached (${this.config.maxItems}). Scan truncated.`,
              timestamp: new Date().toISOString(),
            });
            return;
          }

          // Store indexed item (Tier 1 - lightweight)
          const indexed: IndexedItem = {
            id: item.ItemID,
            name: item.ItemName,
            path: item.ItemPath,
            templateId: item.TemplateID,
            templateName: item.TemplateName,
            parentId: item.ParentID || '',
            hasChildren: item.HasChildren || false,
            updated: item.ItemUpdated || '',
            language: item.ItemLanguage || this.config.languages[0],
          };

          this.result.items.set(item.ItemID, indexed);
          this.result.progress.itemsScanned++;

          // Queue children for scanning
          if (item.HasChildren && this.shouldContinueDepth(depth)) {
            queue.push(item.ItemPath);
          }
        }

        // Rate limiting
        await this.delay(this.config.requestDelay);

      } catch (error) {
        this.result.progress.errors.push({
          path: currentPath,
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }

      // Report progress
      if (onProgress) {
        onProgress({ ...this.result.progress });
      }

      depth++;
    }
  }

  /**
   * Scan templates.
   */
  private async scanTemplates(onProgress?: (progress: ScanProgress) => void): Promise<void> {
    this.result.progress.phase = 'templates';
    this.result.progress.currentPath = '/sitecore/templates';

    try {
      const templates = await this.fetchTemplates();
      
      for (const template of templates) {
        const indexed: IndexedTemplate = {
          id: template.ItemID,
          name: template.ItemName,
          path: template.ItemPath,
          baseTemplateIds: this.extractBaseTemplates(template),
        };

        this.result.templates.set(template.ItemID, indexed);
      }

      if (onProgress) {
        onProgress({ ...this.result.progress });
      }
    } catch (error) {
      this.result.progress.errors.push({
        path: '/sitecore/templates',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Scan media library.
   */
  private async scanMedia(onProgress?: (progress: ScanProgress) => void): Promise<void> {
    this.result.progress.phase = 'media';
    this.result.progress.currentPath = '/sitecore/media library';

    try {
      const mediaItems = await this.fetchMedia();
      
      for (const item of mediaItems) {
        const sizeField = item.ItemFields?.find(f => f.Name === 'Size');
        const extField = item.ItemFields?.find(f => f.Name === 'Extension');
        
        const indexed: IndexedMedia = {
          id: item.ItemID,
          name: item.ItemName,
          path: item.ItemPath,
          size: sizeField ? parseInt(sizeField.Value, 10) : 0,
          extension: extField?.Value || '',
        };

        this.result.media.set(item.ItemID, indexed);
      }

      if (onProgress) {
        onProgress({ ...this.result.progress });
      }
    } catch (error) {
      this.result.progress.errors.push({
        path: '/sitecore/media library',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Scan renderings.
   */
  private async scanRenderings(onProgress?: (progress: ScanProgress) => void): Promise<void> {
    this.result.progress.phase = 'renderings';
    this.result.progress.currentPath = '/sitecore/layout/renderings';

    try {
      const renderings = await this.fetchRenderings();
      
      for (const item of renderings) {
        const indexed: IndexedRendering = {
          id: item.ItemID,
          name: item.ItemName,
          path: item.ItemPath,
        };

        this.result.renderings.set(item.ItemID, indexed);
      }

      if (onProgress) {
        onProgress({ ...this.result.progress });
      }
    } catch (error) {
      this.result.progress.errors.push({
        path: '/sitecore/layout/renderings',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Tier 2: Deep scan for specific items.
   */
  private async deepScanFlaggedItems(onProgress?: (progress: ScanProgress) => void): Promise<void> {
    this.result.progress.phase = 'deep';

    // Get items that need deep scanning (pages with potential layouts)
    const itemsToDeepScan = this.getItemsForDeepScan();

    for (const itemId of itemsToDeepScan) {
      if (this.aborted) break;

      try {
        const deepData = await this.fetchDeepItemData(itemId);
        if (deepData) {
          this.result.deepData.set(itemId, deepData);
        }

        await this.delay(this.config.requestDelay);
      } catch (error) {
        this.result.progress.errors.push({
          path: itemId,
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (onProgress) {
      onProgress({ ...this.result.progress });
    }
  }

  /**
   * Determine which items need deep scanning.
   */
  private getItemsForDeepScan(): string[] {
    const itemIds: string[] = [];

    // For Tier 2, scan items that are likely pages (have certain template patterns)
    // or items that might have renderings
    for (const [id, item] of this.result.items) {
      const templateName = item.templateName.toLowerCase();
      
      // Common page template patterns
      if (
        templateName.includes('page') ||
        templateName.includes('article') ||
        templateName.includes('landing') ||
        templateName.includes('home') ||
        templateName.includes('content page')
      ) {
        itemIds.push(id);
      }
    }

    // Limit deep scan to reasonable number
    return itemIds.slice(0, 1000);
  }

  /**
   * Fetch deep data for a single item.
   */
  private async fetchDeepItemData(itemId: string): Promise<DeepItemData | null> {
    try {
      // Use the adapter's getPageLayout method to get renderings
      const layout = await this.adapter.getPageLayout(itemId, this.config.languages[0]);
      
      const renderings: PageRendering[] = [];
      for (const device of layout.devices) {
        for (const r of device.renderings) {
          renderings.push({
            uid: r.uid,
            renderingId: r.renderingId,
            placeholder: r.placeholder,
            dataSourceId: r.dataSource,
          });
        }
      }

      // Get item fields via content API
      const content = await this.adapter.getContent(itemId, this.config.languages[0]);
      
      return {
        id: itemId,
        fields: content ? Object.entries(content.fields).map(([name, value]) => ({
          name,
          value: String(value),
        })) : [],
        renderings,
        security: content?.fields['__Security'] as string | undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Build relationship maps from collected data.
   */
  private buildRelationshipMaps(): void {
    // Build children map
    for (const [id, item] of this.result.items) {
      if (item.parentId) {
        const siblings = this.result.childrenMap.get(item.parentId) || [];
        siblings.push(id);
        this.result.childrenMap.set(item.parentId, siblings);
      }
    }

    // Build template usage map
    for (const [id, item] of this.result.items) {
      const usage = this.result.templateUsage.get(item.templateId) || [];
      usage.push(id);
      this.result.templateUsage.set(item.templateId, usage);
    }

    // Build rendering usage map from deep data
    for (const [pageId, deepData] of this.result.deepData) {
      for (const rendering of deepData.renderings) {
        const usage = this.result.renderingUsage.get(rendering.renderingId) || [];
        usage.push(pageId);
        this.result.renderingUsage.set(rendering.renderingId, usage);
      }
    }
  }

  // ============== API Helpers ==============

  private async fetchChildren(path: string): Promise<SitecoreItem[]> {
    // Use adapter's internal fetch method via search
    const searchQuery = `+_path:${path}/* +_database:${this.config.database}`;
    
    // Access adapter's private fetch through content listing
    const result = await this.adapter.listContent({
      limit: 100,
      locale: this.config.languages[0],
    });

    // Convert to internal format
    return result.items.map(item => ({
      ItemID: item.id,
      ItemName: item.title,
      ItemPath: item.slug,
      TemplateID: (item._raw as SitecoreItem)?.TemplateID || '',
      TemplateName: item.type,
      ParentID: this.extractParentId(item.slug),
      HasChildren: (item._raw as SitecoreItem)?.HasChildren,
      ItemUpdated: item.updatedAt,
      ItemLanguage: item.locale,
    }));
  }

  private async fetchTemplates(): Promise<SitecoreItem[]> {
    const types = await this.adapter.getContentTypes();
    return types.map(t => ({
      ItemID: t.id,
      ItemName: t.name,
      ItemPath: t.description || `/sitecore/templates/${t.name}`,
      TemplateID: t.id,
      TemplateName: 'Template',
    }));
  }

  private async fetchMedia(): Promise<SitecoreItem[]> {
    const result = await this.adapter.listMedia({ limit: 500 });
    return result.items.map(m => ({
      ItemID: m.id,
      ItemName: m.filename,
      ItemPath: m.url,
      TemplateID: '',
      TemplateName: 'Media',
      ItemFields: [
        { Name: 'Size', Value: String(m.size) },
        { Name: 'Extension', Value: m.mimeType.split('/')[1] || '' },
      ],
    }));
  }

  private async fetchRenderings(): Promise<SitecoreItem[]> {
    const renderings = await this.adapter.getAvailableRenderings();
    return renderings.map(r => ({
      ItemID: r.id,
      ItemName: r.name,
      ItemPath: r.path,
      TemplateID: '',
      TemplateName: 'Rendering',
    }));
  }

  private extractParentId(path: string): string {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
  }

  private extractBaseTemplates(template: SitecoreItem): string[] {
    const baseField = template.ItemFields?.find(f => f.Name === '__Base template');
    if (!baseField?.Value) return [];
    
    // Sitecore stores as pipe-separated GUIDs
    return baseField.Value.split('|').filter(Boolean);
  }

  private shouldContinueDepth(currentDepth: number): boolean {
    if (this.config.maxDepth === -1) return true;
    return currentDepth < this.config.maxDepth;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create and run a scan.
 */
export async function runXRayScan(
  adapter: SitecoreXPAdapter,
  config: Partial<XRayScanConfig> = {},
  onProgress?: (progress: ScanProgress) => void
): Promise<ScanResult> {
  const scanner = new XRayScanner(adapter, config);
  return scanner.scan(onProgress);
}
