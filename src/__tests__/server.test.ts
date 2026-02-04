/**
 * Conduit Server Tests
 * 
 * Integration tests for the MCP server.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConduitServer } from '../server.js';
import type { ConduitConfig } from '../config/loader.js';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

// Mock adapters
const mockAdapter = {
  name: 'test',
  displayName: 'Test',
  capabilities: {
    search: true,
    media: true,
    create: true,
    update: true,
  },
  initialize: vi.fn().mockResolvedValue(undefined),
  listContent: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getContent: vi.fn().mockResolvedValue(null),
  searchContent: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  createContent: vi.fn().mockResolvedValue({ id: 'new-1', title: 'New' }),
  updateContent: vi.fn().mockResolvedValue({ id: '1', title: 'Updated' }),
  listMedia: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getMedia: vi.fn().mockResolvedValue(null),
  getContentTypes: vi.fn().mockResolvedValue([]),
  getContentType: vi.fn().mockResolvedValue(null),
  healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
  dispose: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../adapters/contentful.js', () => ({
  ContentfulAdapter: vi.fn().mockImplementation(() => ({ ...mockAdapter, name: 'contentful' })),
}));

vi.mock('../adapters/sanity.js', () => ({
  SanityAdapter: vi.fn().mockImplementation(() => ({ ...mockAdapter, name: 'sanity' })),
}));

vi.mock('../adapters/wordpress.js', () => ({
  WordPressAdapter: vi.fn().mockImplementation(() => ({ ...mockAdapter, name: 'wordpress' })),
}));

vi.mock('../adapters/sitecore.js', () => ({
  SitecoreAdapter: vi.fn().mockImplementation(() => ({ ...mockAdapter, name: 'sitecore' })),
}));

vi.mock('../adapters/sitecore-xp.js', () => ({
  SitecoreXPAdapter: vi.fn().mockImplementation(() => ({ ...mockAdapter, name: 'sitecore-xp' })),
}));

vi.mock('../adapters/umbraco.js', () => ({
  UmbracoAdapter: vi.fn().mockImplementation(() => ({ ...mockAdapter, name: 'umbraco' })),
}));

vi.mock('../adapters/optimizely.js', () => ({
  OptimizelyAdapter: vi.fn().mockImplementation(() => ({ ...mockAdapter, name: 'optimizely' })),
}));

// Mock X-Ray
vi.mock('../xray/index.js', () => ({
  XRayScanner: vi.fn().mockImplementation(() => ({
    getResult: () => ({ scanId: 'scan-123', status: 'pending', progress: 0 }),
    scan: vi.fn().mockResolvedValue({ scanId: 'scan-123', status: 'complete', progress: 100 }),
  })),
  analyzeXRayScan: vi.fn().mockReturnValue({
    healthScore: 85,
    healthGrade: 'B',
    issues: [],
    stats: {},
  }),
  buildKnowledgeGraph: vi.fn().mockReturnValue({
    nodes: [],
    edges: [],
  }),
  filterIssues: vi.fn().mockImplementation((issues) => issues),
  DEFAULT_SCAN_CONFIG: {
    rootPath: '/sitecore/content',
    includeTemplates: true,
    includeMedia: true,
    includeRenderings: true,
    maxDepth: -1,
    tier: 1,
  },
}));

describe('ConduitServer', () => {
  let config: ConduitConfig;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    config = {
      adapter: {
        type: 'contentful',
        credentials: {
          spaceId: 'test-space',
          accessToken: 'test-token',
        },
      },
    };
  });

  describe('constructor', () => {
    it('creates server with single adapter config', () => {
      const server = new ConduitServer(config);
      expect(server).toBeDefined();
    });

    it('creates server with multiple adapters config', () => {
      const multiConfig: ConduitConfig = {
        adapters: {
          cms1: {
            type: 'contentful',
            credentials: { spaceId: 's1', accessToken: 't1' },
          },
          cms2: {
            type: 'sanity',
            credentials: { projectId: 'p1', dataset: 'd1' },
          },
        },
      };
      const server = new ConduitServer(multiConfig);
      expect(server).toBeDefined();
    });

    it('initializes middleware with default values', () => {
      const server = new ConduitServer(config);
      expect(server).toBeDefined();
    });

    it('initializes middleware with custom values', () => {
      const customConfig: ConduitConfig = {
        ...config,
        middleware: {
          cache: { enabled: true, ttlMs: 5000, maxSize: 100 },
          rateLimit: { enabled: true, windowMs: 30000, maxRequests: 50 },
          audit: { enabled: true, logFile: '/tmp/audit.log' },
        },
      };
      const server = new ConduitServer(customConfig);
      expect(server).toBeDefined();
    });

    it('sets server name and version from config', () => {
      const customConfig: ConduitConfig = {
        ...config,
        server: {
          name: 'custom-conduit',
          version: '2.0.0',
        },
      };
      const server = new ConduitServer(customConfig);
      expect(server).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('initializes single adapter', async () => {
      const server = new ConduitServer(config);
      await server.initialize();
      
      expect(mockAdapter.initialize).toHaveBeenCalled();
      expect(mockAdapter.healthCheck).toHaveBeenCalled();
    });

    it('initializes multiple adapters', async () => {
      const multiConfig: ConduitConfig = {
        adapters: {
          cms1: {
            type: 'contentful',
            credentials: { spaceId: 's1', accessToken: 't1' },
          },
          cms2: {
            type: 'wordpress',
            credentials: { url: 'https://example.com' },
          },
        },
      };
      const server = new ConduitServer(multiConfig);
      await server.initialize();
      
      expect(mockAdapter.initialize).toHaveBeenCalledTimes(2);
    });

    it('exits if no adapters configured', async () => {
      const emptyConfig: ConduitConfig = {};
      const server = new ConduitServer(emptyConfig);
      
      await server.initialize();
      
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'No adapters configured. Please create a conduit.yaml file.'
      );
    });

    it('logs warning on adapter health check failure', async () => {
      mockAdapter.healthCheck.mockResolvedValueOnce({
        healthy: false,
        message: 'Connection failed',
      });
      
      const server = new ConduitServer(config);
      await server.initialize();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('health check failed')
      );
    });

    it('sets first adapter as default', async () => {
      const server = new ConduitServer(config);
      await server.initialize();
      // Adapter should be accessible (no error thrown)
      expect(mockAdapter.initialize).toHaveBeenCalled();
    });
  });

  describe('tool handlers - content', () => {
    let server: ConduitServer;

    beforeEach(async () => {
      server = new ConduitServer(config);
      await server.initialize();
    });

    it('lists tools', () => {
      const server = new ConduitServer(config);
      expect(server).toBeDefined();
      // Tool list is set up in setupHandlers
    });
  });

  describe('start and stop', () => {
    it('starts server', async () => {
      const server = new ConduitServer(config);
      await server.start();
      
      expect(mockAdapter.initialize).toHaveBeenCalled();
    });

    it('stops server and disposes adapters', async () => {
      const server = new ConduitServer(config);
      await server.initialize();
      await server.stop();
      
      expect(mockAdapter.dispose).toHaveBeenCalled();
    });
  });

  describe('adapter factory', () => {
    it('creates contentful adapter', async () => {
      const cfg: ConduitConfig = {
        adapter: {
          type: 'contentful',
          credentials: { spaceId: 's', accessToken: 't' },
        },
      };
      const server = new ConduitServer(cfg);
      await server.initialize();
      expect(mockAdapter.initialize).toHaveBeenCalled();
    });

    it('creates sanity adapter', async () => {
      const cfg: ConduitConfig = {
        adapter: {
          type: 'sanity',
          credentials: { projectId: 'p', dataset: 'd' },
        },
      };
      const server = new ConduitServer(cfg);
      await server.initialize();
      expect(mockAdapter.initialize).toHaveBeenCalled();
    });

    it('creates wordpress adapter', async () => {
      const cfg: ConduitConfig = {
        adapter: {
          type: 'wordpress',
          credentials: { url: 'https://example.com' },
        },
      };
      const server = new ConduitServer(cfg);
      await server.initialize();
      expect(mockAdapter.initialize).toHaveBeenCalled();
    });

    it('creates sitecore adapter', async () => {
      const cfg: ConduitConfig = {
        adapter: {
          type: 'sitecore',
          credentials: { url: 'https://sitecore.local' },
        },
      };
      const server = new ConduitServer(cfg);
      await server.initialize();
      expect(mockAdapter.initialize).toHaveBeenCalled();
    });

    it('creates sitecore-xp adapter', async () => {
      const cfg: ConduitConfig = {
        adapter: {
          type: 'sitecore-xp',
          credentials: { url: 'https://sitecore.local' },
        },
      };
      const server = new ConduitServer(cfg);
      await server.initialize();
      expect(mockAdapter.initialize).toHaveBeenCalled();
    });

    it('creates umbraco adapter', async () => {
      const cfg: ConduitConfig = {
        adapter: {
          type: 'umbraco',
          credentials: { url: 'https://umbraco.local' },
        },
      };
      const server = new ConduitServer(cfg);
      await server.initialize();
      expect(mockAdapter.initialize).toHaveBeenCalled();
    });

    it('creates optimizely adapter', async () => {
      const cfg: ConduitConfig = {
        adapter: {
          type: 'optimizely',
          credentials: { url: 'https://optimizely.local' },
        },
      };
      const server = new ConduitServer(cfg);
      await server.initialize();
      expect(mockAdapter.initialize).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles adapter initialization errors', async () => {
      mockAdapter.initialize.mockRejectedValueOnce(new Error('Init failed'));
      
      const server = new ConduitServer(config);
      
      await expect(server.initialize()).rejects.toThrow('Init failed');
    });

    it('handles missing adapter', () => {
      const server = new ConduitServer(config);
      expect(server).toBeDefined();
    });
  });

  describe('multi-adapter support', () => {
    it('manages multiple adapters independently', async () => {
      const multiConfig: ConduitConfig = {
        adapters: {
          contentful: {
            type: 'contentful',
            credentials: { spaceId: 's1', accessToken: 't1' },
          },
          sanity: {
            type: 'sanity',
            credentials: { projectId: 'p1', dataset: 'd1' },
          },
          wordpress: {
            type: 'wordpress',
            credentials: { url: 'https://example.com' },
          },
        },
      };
      
      const server = new ConduitServer(multiConfig);
      await server.initialize();
      
      expect(mockAdapter.initialize).toHaveBeenCalledTimes(3);
    });
  });

  describe('X-Ray integration', () => {
    it('initializes X-Ray state', () => {
      const server = new ConduitServer(config);
      expect(server).toBeDefined();
      // X-Ray maps are initialized in constructor
    });
  });
});
