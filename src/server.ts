/**
 * Conduit MCP Server
 * 
 * Enterprise MCP server providing unified access to any CMS.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import http from 'http';

import { getAdapterConfigs, type ConduitConfig, type AdapterType } from './config/loader.js';
import { CacheMiddleware } from './middleware/cache.js';
import { AuditMiddleware } from './middleware/audit.js';
import { RateLimitMiddleware } from './middleware/rate-limit.js';
import type { ICMSAdapter } from './adapters/interface.js';
import { ContentfulAdapter } from './adapters/contentful.js';
import { SanityAdapter } from './adapters/sanity.js';
import { WordPressAdapter } from './adapters/wordpress.js';
import { SitecoreAdapter } from './adapters/sitecore.js';
import { SitecoreXPAdapter } from './adapters/sitecore-xp.js';
import { UmbracoAdapter } from './adapters/umbraco.js';
import { OptimizelyAdapter } from './adapters/optimizely.js';
import type { ContentFilter } from './types/content.js';

// X-Ray imports
import {
  XRayScanner,
  analyzeXRayScan,
  buildKnowledgeGraph,
  filterIssues,
  type ScanResult,
  type AnalysisResult,
  type XRayScanConfig,
  DEFAULT_SCAN_CONFIG,
} from './xray/index.js';

// Adapter factory
function createAdapter(type: AdapterType): ICMSAdapter {
  switch (type) {
    case 'contentful':
      return new ContentfulAdapter();
    case 'sanity':
      return new SanityAdapter();
    case 'wordpress':
      return new WordPressAdapter();
    case 'sitecore':
      return new SitecoreAdapter();
    case 'sitecore-xp':
      return new SitecoreXPAdapter();
    case 'umbraco':
      return new UmbracoAdapter();
    case 'optimizely':
      return new OptimizelyAdapter();
    default:
      throw new Error(`Unknown adapter type: ${type}`);
  }
}

export class ConduitServer {
  private server: Server;
  private config: ConduitConfig;
  private adapters: Map<string, ICMSAdapter> = new Map();
  private cache: CacheMiddleware;
  private audit: AuditMiddleware;
  private rateLimit: RateLimitMiddleware;
  private defaultAdapter?: string;

  // Optional HTTP server for health/metrics
  private httpServer?: http.Server;
  private httpPort: number = parseInt(process.env.CONDUIT_HTTP_PORT || '', 10) || 0;

  // Metrics (minimal Prometheus-style)
  private metrics = {
    requestTotal: 0,
    requestFailures: 0,
    requestDurationSecondsSum: 0,
    requestDurationSecondsCount: 0,
    toolRequestTotal: new Map<string, number>(),
  };

  // X-Ray state
  private xrayScans: Map<string, { scanner: XRayScanner; result: ScanResult; analysis?: AnalysisResult }> = new Map();
  private lastXrayHealth: Map<string, { score: number; scanId: string; scannedAt: string; criticalIssues: number; topIssue: unknown }> = new Map();

  constructor(config: ConduitConfig) {
    this.config = config;
    
    // Initialize middleware
    this.cache = new CacheMiddleware({
      ttlMs: this.config.middleware?.cache?.ttlMs ?? 60000,
      maxSize: this.config.middleware?.cache?.maxSize ?? 500,
    });
    
    this.audit = new AuditMiddleware({
      enabled: this.config.middleware?.audit?.enabled ?? false,
      logFile: this.config.middleware?.audit?.logFile,
    });
    
    this.rateLimit = new RateLimitMiddleware({
      windowMs: this.config.middleware?.rateLimit?.windowMs ?? 60000,
      maxRequests: this.config.middleware?.rateLimit?.maxRequests ?? 100,
    });

    // Create MCP server
    this.server = new Server(
      {
        name: this.config.server?.name ?? 'conduit',
        version: this.config.server?.version ?? '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Initialize adapters based on config.
   */
  async initialize(): Promise<void> {
    const adapterConfigs = getAdapterConfigs(this.config);
    
    if (adapterConfigs.size === 0) {
      console.error('No adapters configured. Please create a conduit.yaml file.');
      process.exit(1);
    }

    for (const [name, adapterConfig] of adapterConfigs) {
      const adapter = createAdapter(adapterConfig.type as AdapterType);
      await adapter.initialize({
        type: adapterConfig.type,
        credentials: adapterConfig.credentials as Record<string, string>,
        defaultLocale: adapterConfig.defaultLocale,
        preview: adapterConfig.preview,
      });

      this.adapters.set(name, adapter);
      
      if (!this.defaultAdapter) {
        this.defaultAdapter = name;
      }

      // Health check
      const health = await adapter.healthCheck();
      if (!health.healthy) {
        console.error(`Adapter ${name} (${adapterConfig.type}) health check failed: ${health.message}`);
      }
    }
  }

  /**
   * Get adapter by name (or default).
   */
  private getAdapter(name?: string): ICMSAdapter {
    const adapterName = name || this.defaultAdapter;
    if (!adapterName) {
      throw new Error('No adapter configured');
    }
    
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterName}`);
    }
    
    return adapter;
  }

  /**
   * Set up MCP request handlers.
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'content_list',
            description: 'List content items with optional filters',
            inputSchema: {
              type: 'object',
              properties: {
                adapter: { type: 'string', description: 'Adapter name (optional, uses default)' },
                type: { type: 'string', description: 'Content type to filter by' },
                status: { type: 'string', enum: ['draft', 'published', 'archived'] },
                limit: { type: 'number', description: 'Max items to return (default 10)' },
                skip: { type: 'number', description: 'Items to skip for pagination' },
              },
            },
          },
          {
            name: 'content_get',
            description: 'Get a single content item by ID',
            inputSchema: {
              type: 'object',
              properties: {
                adapter: { type: 'string', description: 'Adapter name (optional)' },
                id: { type: 'string', description: 'Content ID' },
                locale: { type: 'string', description: 'Locale code (optional)' },
              },
              required: ['id'],
            },
          },
          {
            name: 'content_search',
            description: 'Search content by query string',
            inputSchema: {
              type: 'object',
              properties: {
                adapter: { type: 'string', description: 'Adapter name (optional)' },
                query: { type: 'string', description: 'Search query' },
                type: { type: 'string', description: 'Content type to filter by' },
                limit: { type: 'number', description: 'Max items to return' },
              },
              required: ['query'],
            },
          },
          {
            name: 'content_create',
            description: 'Create new content',
            inputSchema: {
              type: 'object',
              properties: {
                adapter: { type: 'string', description: 'Adapter name (optional)' },
                type: { type: 'string', description: 'Content type' },
                fields: { type: 'object', description: 'Field values' },
                locale: { type: 'string', description: 'Locale code' },
                publish: { type: 'boolean', description: 'Publish immediately' },
              },
              required: ['type', 'fields'],
            },
          },
          {
            name: 'content_update',
            description: 'Update existing content',
            inputSchema: {
              type: 'object',
              properties: {
                adapter: { type: 'string', description: 'Adapter name (optional)' },
                id: { type: 'string', description: 'Content ID' },
                fields: { type: 'object', description: 'Field values to update' },
                locale: { type: 'string', description: 'Locale code' },
                publish: { type: 'boolean', description: 'Publish after update' },
              },
              required: ['id', 'fields'],
            },
          },
          {
            name: 'media_list',
            description: 'List media assets',
            inputSchema: {
              type: 'object',
              properties: {
                adapter: { type: 'string', description: 'Adapter name (optional)' },
                limit: { type: 'number', description: 'Max items to return' },
                skip: { type: 'number', description: 'Items to skip' },
              },
            },
          },
          {
            name: 'media_get',
            description: 'Get a single media asset',
            inputSchema: {
              type: 'object',
              properties: {
                adapter: { type: 'string', description: 'Adapter name (optional)' },
                id: { type: 'string', description: 'Media ID' },
              },
              required: ['id'],
            },
          },
          {
            name: 'schema_list',
            description: 'List all content types/models',
            inputSchema: {
              type: 'object',
              properties: {
                adapter: { type: 'string', description: 'Adapter name (optional)' },
              },
            },
          },
          {
            name: 'schema_get',
            description: 'Get a content type definition',
            inputSchema: {
              type: 'object',
              properties: {
                adapter: { type: 'string', description: 'Adapter name (optional)' },
                id: { type: 'string', description: 'Content type ID' },
              },
              required: ['id'],
            },
          },
          {
            name: 'health_check',
            description: 'Check adapter health and connectivity',
            inputSchema: {
              type: 'object',
              properties: {
                adapter: { type: 'string', description: 'Adapter name (optional, checks all if omitted)' },
              },
            },
          },
          // X-Ray tools (Sitecore XP Premium)
          {
            name: 'xray_scan',
            description: 'Start a Sitecore X-Ray audit scan',
            inputSchema: {
              type: 'object',
              properties: {
                adapter: { type: 'string', description: 'Adapter name (must be sitecore-xp)' },
                rootPath: { type: 'string', description: 'Root path to scan (default: /sitecore/content)' },
                includeTemplates: { type: 'boolean', description: 'Include templates (default: true)' },
                includeMedia: { type: 'boolean', description: 'Include media (default: true)' },
                includeRenderings: { type: 'boolean', description: 'Include renderings (default: true)' },
                maxDepth: { type: 'number', description: 'Max depth (-1 for unlimited)' },
                tier: { type: 'number', description: 'Scan tier: 1=index, 2=deep (default: 1)' },
              },
              required: ['adapter'],
            },
          },
          {
            name: 'xray_status',
            description: 'Check X-Ray scan progress',
            inputSchema: {
              type: 'object',
              properties: {
                scanId: { type: 'string', description: 'Scan ID' },
              },
              required: ['scanId'],
            },
          },
          {
            name: 'xray_report',
            description: 'Get X-Ray analysis results',
            inputSchema: {
              type: 'object',
              properties: {
                scanId: { type: 'string', description: 'Scan ID' },
                category: { type: 'string', description: 'Filter by issue category' },
                severity: { type: 'string', description: 'Filter by severity (critical, warning, info)' },
              },
              required: ['scanId'],
            },
          },
          {
            name: 'xray_graph',
            description: 'Get knowledge graph from X-Ray scan',
            inputSchema: {
              type: 'object',
              properties: {
                scanId: { type: 'string', description: 'Scan ID' },
                nodeTypes: { type: 'array', items: { type: 'string' }, description: 'Filter node types' },
                maxNodes: { type: 'number', description: 'Max nodes (default: 1000)' },
                centerOn: { type: 'string', description: 'Item ID to center graph on' },
              },
              required: ['scanId'],
            },
          },
          {
            name: 'xray_health',
            description: 'Quick X-Ray health check (from last scan)',
            inputSchema: {
              type: 'object',
              properties: {
                adapter: { type: 'string', description: 'Adapter name' },
              },
              required: ['adapter'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const start = process.hrtime.bigint();
      this.metrics.requestTotal++;
      this.metrics.toolRequestTotal.set(name, (this.metrics.toolRequestTotal.get(name) || 0) + 1);
      
      try {
        // Rate limiting
        await this.rateLimit.wrap('global', async () => {});

        const result = await this.handleTool(name, args as Record<string, unknown>);
        
        const end = process.hrtime.bigint();
        const durationSec = Number(end - start) / 1e9;
        this.metrics.requestDurationSecondsSum += durationSec;
        this.metrics.requestDurationSecondsCount += 1;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        this.metrics.requestFailures++;
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: message }),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Handle individual tool calls.
   */
  private async handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const adapterName = args.adapter as string | undefined;
    const adapter = this.getAdapter(adapterName);
    const cacheKey = adapterName || 'default';

    switch (name) {
      case 'content_list': {
        const filter: ContentFilter = {
          type: args.type as string | undefined,
          status: args.status as 'draft' | 'published' | 'archived' | undefined,
          limit: (args.limit as number) || 10,
          skip: args.skip as number | undefined,
        };
        const key = CacheMiddleware.generateKey(`${cacheKey}:content_list`, filter);
        
        return this.audit.wrap(cacheKey, 'content_list', filter, () =>
          this.cache.wrap(key, () => adapter.listContent(filter))
        );
      }

      case 'content_get': {
        const id = args.id as string;
        const locale = args.locale as string | undefined;
        const key = CacheMiddleware.generateKey(`${cacheKey}:content_get`, { id, locale });
        
        return this.audit.wrap(cacheKey, 'content_get', { id, locale }, () =>
          this.cache.wrap(key, () => adapter.getContent(id, locale))
        );
      }

      case 'content_search': {
        const query = args.query as string;
        const filter: ContentFilter = {
          type: args.type as string | undefined,
          limit: (args.limit as number) || 10,
        };
        
        if (!adapter.capabilities.search) {
          throw new Error(`Search not supported by ${adapter.name} adapter`);
        }
        
        return this.audit.wrap(cacheKey, 'content_search', { query, ...filter }, () =>
          adapter.searchContent(query, filter)
        );
      }

      case 'content_create': {
        if (!adapter.capabilities.create) {
          throw new Error(`Create not supported by ${adapter.name} adapter`);
        }
        
        // Invalidate cache on write
        this.cache.invalidate(`${cacheKey}:content`);
        
        return this.audit.wrap(cacheKey, 'content_create', args, () =>
          adapter.createContent({
            type: args.type as string,
            fields: args.fields as Record<string, unknown>,
            locale: args.locale as string | undefined,
            publish: args.publish as boolean | undefined,
          })
        );
      }

      case 'content_update': {
        if (!adapter.capabilities.update) {
          throw new Error(`Update not supported by ${adapter.name} adapter`);
        }
        
        // Invalidate cache on write
        this.cache.invalidate(`${cacheKey}:content`);
        
        return this.audit.wrap(cacheKey, 'content_update', args, () =>
          adapter.updateContent(args.id as string, {
            fields: args.fields as Record<string, unknown>,
            locale: args.locale as string | undefined,
            publish: args.publish as boolean | undefined,
          })
        );
      }

      case 'media_list': {
        if (!adapter.capabilities.media) {
          throw new Error(`Media not supported by ${adapter.name} adapter`);
        }
        
        const filter = {
          limit: (args.limit as number) || 10,
          skip: args.skip as number | undefined,
        };
        const key = CacheMiddleware.generateKey(`${cacheKey}:media_list`, filter);
        
        return this.audit.wrap(cacheKey, 'media_list', filter, () =>
          this.cache.wrap(key, () => adapter.listMedia(filter))
        );
      }

      case 'media_get': {
        if (!adapter.capabilities.media) {
          throw new Error(`Media not supported by ${adapter.name} adapter`);
        }
        
        const id = args.id as string;
        const key = CacheMiddleware.generateKey(`${cacheKey}:media_get`, { id });
        
        return this.audit.wrap(cacheKey, 'media_get', { id }, () =>
          this.cache.wrap(key, () => adapter.getMedia(id))
        );
      }

      case 'schema_list': {
        const key = CacheMiddleware.generateKey(`${cacheKey}:schema_list`, {});
        return this.audit.wrap(cacheKey, 'schema_list', {}, () =>
          this.cache.wrap(key, () => adapter.getContentTypes())
        );
      }

      case 'schema_get': {
        const id = args.id as string;
        const key = CacheMiddleware.generateKey(`${cacheKey}:schema_get`, { id });
        
        return this.audit.wrap(cacheKey, 'schema_get', { id }, () =>
          this.cache.wrap(key, () => adapter.getContentType(id))
        );
      }

      case 'health_check': {
        if (adapterName) {
          return adapter.healthCheck();
        }
        
        // Check all adapters
        const results: Record<string, unknown> = {};
        for (const [name, adp] of this.adapters) {
          results[name] = await adp.healthCheck();
        }
        return results;
      }

      // ============== X-Ray Tools ==============

      case 'xray_scan': {
        if (adapter.name !== 'sitecore-xp') {
          throw new Error('X-Ray scan requires sitecore-xp adapter');
        }

        const config: Partial<XRayScanConfig> = {
          ...DEFAULT_SCAN_CONFIG,
          rootPath: (args.rootPath as string) || DEFAULT_SCAN_CONFIG.rootPath,
          includeTemplates: args.includeTemplates !== false,
          includeMedia: args.includeMedia !== false,
          includeRenderings: args.includeRenderings !== false,
          maxDepth: (args.maxDepth as number) ?? -1,
          tier: (args.tier as 1 | 2 | 3) || 1,
        };

        const scanner = new XRayScanner(adapter as any, config);
        const scanId = scanner.getResult().scanId;

        // Store scanner and start scan in background
        this.xrayScans.set(scanId, { scanner, result: scanner.getResult() });

        // Run scan async
        scanner.scan().then(result => {
          const stored = this.xrayScans.get(scanId);
          if (stored) {
            stored.result = result;
            // Run analysis
            const analysis = analyzeXRayScan(result);
            stored.analysis = analysis;
            // Cache health for quick access
            this.lastXrayHealth.set(adapterName || 'default', {
              score: analysis.healthScore,
              scanId,
              scannedAt: new Date().toISOString(),
              criticalIssues: analysis.issues.filter(i => i.severity === 'critical').length,
              topIssue: analysis.issues[0] || null,
            });
          }
        });

        return { scanId, status: 'scanning' };
      }

      case 'xray_status': {
        const scanId = args.scanId as string;
        const stored = this.xrayScans.get(scanId);
        
        if (!stored) {
          throw new Error(`Scan not found: ${scanId}`);
        }

        return {
          scanId,
          status: stored.result.status,
          progress: stored.result.progress,
        };
      }

      case 'xray_report': {
        const scanId = args.scanId as string;
        const stored = this.xrayScans.get(scanId);
        
        if (!stored) {
          throw new Error(`Scan not found: ${scanId}`);
        }

        if (stored.result.status !== 'complete') {
          return { status: stored.result.status, message: 'Scan not complete' };
        }

        if (!stored.analysis) {
          stored.analysis = analyzeXRayScan(stored.result);
        }

        let issues = stored.analysis.issues;
        if (args.category || args.severity) {
          issues = filterIssues(issues, args.category as string, args.severity as string);
        }

        return {
          healthScore: stored.analysis.healthScore,
          healthGrade: stored.analysis.healthGrade,
          issues,
          stats: stored.analysis.stats,
        };
      }

      case 'xray_graph': {
        const scanId = args.scanId as string;
        const stored = this.xrayScans.get(scanId);
        
        if (!stored) {
          throw new Error(`Scan not found: ${scanId}`);
        }

        if (stored.result.status !== 'complete') {
          return { status: stored.result.status, message: 'Scan not complete' };
        }

        return buildKnowledgeGraph(stored.result, {
          nodeTypes: args.nodeTypes as any,
          maxNodes: (args.maxNodes as number) || 1000,
          centerOn: args.centerOn as string,
        });
      }

      case 'xray_health': {
        const health = this.lastXrayHealth.get(adapterName || 'default');
        
        if (!health) {
          return {
            healthScore: null,
            lastScanAt: null,
            message: 'No scan has been run yet. Use xray_scan first.',
          };
        }

        return {
          healthScore: health.score,
          lastScanAt: health.scannedAt,
          criticalIssues: health.criticalIssues,
          topIssue: health.topIssue,
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Start the MCP server.
   */
  async start(): Promise<void> {
    await this.initialize();

    // Start optional HTTP server for /health and /metrics if enabled
    const httpEnabled = (process.env.CONDUIT_HTTP_ENABLED || '').toLowerCase() === 'true' || this.httpPort > 0;
    if (httpEnabled) {
      await this.startHttpServer();
    }
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  /**
   * Stop the server gracefully.
   */
  async stop(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.dispose();
    }
    await new Promise<void>((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Minimal HTTP server exposing /health and /metrics
   */
  private async startHttpServer(): Promise<void> {
    const port = this.httpPort || 8080;
    this.httpServer = http.createServer(async (req, res) => {
      try {
        if (!req.url) {
          res.statusCode = 400;
          res.end('Bad Request');
          return;
        }
        if (req.url.startsWith('/health')) {
          const statuses: Record<string, unknown> = {};
          for (const [name, adp] of this.adapters) {
            try {
              statuses[name] = await adp.healthCheck();
            } catch (e) {
              statuses[name] = { healthy: false, message: (e as Error).message };
            }
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', adapters: statuses }));
          return;
        }
        if (req.url.startsWith('/metrics')) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain; version=0.0.4');
          const lines: string[] = [];
          lines.push('# HELP conduit_request_total Total MCP tool requests processed');
          lines.push('# TYPE conduit_request_total counter');
          lines.push(`conduit_request_total ${this.metrics.requestTotal}`);
          lines.push('# HELP conduit_request_failures_total Total MCP tool request failures');
          lines.push('# TYPE conduit_request_failures_total counter');
          lines.push(`conduit_request_failures_total ${this.metrics.requestFailures}`);
          lines.push('# HELP conduit_request_duration_seconds_sum Total time spent processing requests in seconds');
          lines.push('# TYPE conduit_request_duration_seconds summary');
          lines.push(`conduit_request_duration_seconds_sum ${this.metrics.requestDurationSecondsSum}`);
          lines.push(`conduit_request_duration_seconds_count ${this.metrics.requestDurationSecondsCount}`);
          for (const [tool, count] of this.metrics.toolRequestTotal) {
            lines.push(`conduit_tool_request_total{tool="${tool}"} ${count}`);
          }
          res.end(lines.join('\n'));
          return;
        }
        res.statusCode = 404;
        res.end('Not Found');
      } catch (err) {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    await new Promise<void>((resolve) => {
      this.httpServer!.listen(port, () => resolve());
    });
  }
}
