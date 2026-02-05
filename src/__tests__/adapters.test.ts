/**
 * Adapter Tests
 * 
 * Unit tests for CMS adapters using mock data.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentfulAdapter } from '../adapters/contentful.js';
import { SanityAdapter } from '../adapters/sanity.js';
import { WordPressAdapter } from '../adapters/wordpress.js';
import { createAdapter } from '../adapters/index.js';
import type { Content, Media, ContentType } from '../types/content.js';

// Mock contentful client
vi.mock('contentful', () => ({
  createClient: vi.fn(() => ({
    getEntries: vi.fn().mockResolvedValue({
      items: [
        {
          sys: { id: '1', contentType: { sys: { id: 'post' } }, createdAt: '2024-01-01', updatedAt: '2024-01-02' },
          fields: { title: 'Test Post', slug: 'test-post' },
        },
      ],
      total: 1,
      skip: 0,
      limit: 10,
    }),
    getEntry: vi.fn().mockResolvedValue({
      sys: { id: '1', contentType: { sys: { id: 'post' } }, createdAt: '2024-01-01', updatedAt: '2024-01-02' },
      fields: { title: 'Test Post', slug: 'test-post' },
    }),
    getContentTypes: vi.fn().mockResolvedValue({
      items: [
        { sys: { id: 'post' }, name: 'Post', description: 'Blog post', fields: [] },
      ],
    }),
    getContentType: vi.fn().mockResolvedValue({
      sys: { id: 'post' },
      name: 'Post',
      description: 'Blog post',
      fields: [{ id: 'title', name: 'Title', type: 'Symbol', required: true }],
    }),
    getAssets: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      skip: 0,
      limit: 10,
    }),
    getAsset: vi.fn().mockResolvedValue({
      sys: { id: 'asset-1', createdAt: '2024-01-01', locale: 'en-US' },
      fields: {
        file: {
          fileName: 'test.jpg',
          contentType: 'image/jpeg',
          url: '//images.ctfassets.net/test.jpg',
          details: { size: 1024, image: { width: 800, height: 600 } },
        },
        title: 'Test Image',
        description: 'Test description',
      },
    }),
  })),
}));

// Mock sanity client
vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({
    fetch: vi.fn().mockImplementation((query: string) => {
      // Count-only query
      if (query.startsWith('count(')) return Promise.resolve(1);
      // Unique types query
      if (query.includes('array::unique')) return Promise.resolve(['post']);
      // Single item fetch
      if (query.includes('_id == $id') && query.includes('[0]')) {
        return Promise.resolve({
          _id: '1',
          _type: 'post',
          _createdAt: '2024-01-01',
          _updatedAt: '2024-01-02',
          _rev: 'abc',
          title: 'Test Post',
          slug: { current: 'test-post' },
        });
      }
      // List query (returns object with items and total)
      if (query.includes('"items"') || query.includes('"total"')) {
        return Promise.resolve({
          items: [
            {
              _id: '1',
              _type: 'post',
              _createdAt: '2024-01-01',
              _updatedAt: '2024-01-02',
              _rev: 'abc',
              title: 'Test Post',
              slug: { current: 'test-post' },
            },
          ],
          total: 1,
        });
      }
      // Fallback
      return Promise.resolve(null);
    }),
    create: vi.fn().mockResolvedValue({
      _id: '2',
      _type: 'post',
      _createdAt: '2024-01-01',
      _updatedAt: '2024-01-01',
      _rev: 'def',
      title: 'New Post',
    }),
    patch: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        commit: vi.fn().mockResolvedValue({
          _id: '1',
          _type: 'post',
          _createdAt: '2024-01-01',
          _updatedAt: '2024-01-02',
          _rev: 'ghi',
          title: 'Updated Post',
        }),
      }),
    }),
    delete: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock global fetch for WordPress
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Adapter Factory', () => {
  it('creates contentful adapter', () => {
    const adapter = createAdapter('contentful');
    expect(adapter.name).toBe('contentful');
  });

  it('creates sanity adapter', () => {
    const adapter = createAdapter('sanity');
    expect(adapter.name).toBe('sanity');
  });

  it('creates wordpress adapter', () => {
    const adapter = createAdapter('wordpress');
    expect(adapter.name).toBe('wordpress');
  });

  it('throws for unknown adapter', () => {
    expect(() => createAdapter('unknown')).toThrow('Unknown adapter: unknown');
  });

  it('is case-insensitive', () => {
    const adapter = createAdapter('CONTENTFUL');
    expect(adapter.name).toBe('contentful');
  });
});

describe('ContentfulAdapter', () => {
  let adapter: ContentfulAdapter;

  beforeEach(async () => {
    adapter = new ContentfulAdapter();
    await adapter.initialize({
      type: 'contentful',
      credentials: {
        spaceId: 'test-space',
        accessToken: 'test-token',
      },
    });
  });

  it('has correct name and capabilities', () => {
    expect(adapter.name).toBe('contentful');
    expect(adapter.displayName).toBe('Contentful');
    expect(adapter.capabilities.search).toBe(true);
    expect(adapter.capabilities.media).toBe(true);
    expect(adapter.capabilities.localization).toBe(true);
  });

  it('lists content', async () => {
    const result = await adapter.listContent({ limit: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Test Post');
    expect(result.total).toBe(1);
  });

  it('gets single content', async () => {
    const content = await adapter.getContent('1');
    expect(content).not.toBeNull();
    expect(content?.id).toBe('1');
    expect(content?.title).toBe('Test Post');
  });

  it('gets content types', async () => {
    const types = await adapter.getContentTypes();
    expect(types).toHaveLength(1);
    expect(types[0].id).toBe('post');
  });

  it('searches content', async () => {
    const result = await adapter.searchContent('test query', { limit: 5 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Test Post');
  });

  it('handles ordering in listContent', async () => {
    const result = await adapter.listContent({ orderBy: 'title', orderDirection: 'desc' });
    expect(result.items).toHaveLength(1);
  });

  it('throws error on createContent', async () => {
    await expect(adapter.createContent({ type: 'post', fields: {} })).rejects.toThrow('Management API');
  });

  it('throws error on updateContent', async () => {
    await expect(adapter.updateContent('1', { fields: {} })).rejects.toThrow('Management API');
  });

  it('gets single media asset', async () => {
    const media = await adapter.getMedia('asset-1');
    expect(media).toBeDefined();
    expect(media?.id).toBe('asset-1');
    expect(media?.filename).toBe('test.jpg');
  });

  it('lists media assets', async () => {
    const result = await adapter.listMedia({ limit: 5 });
    expect(result).toBeDefined();
  });

  it('handles getContentType not found', async () => {
    const type = await adapter.getContentType('non-existent');
    expect(type).toBeDefined();
  });

  it('disposes without errors', async () => {
    await expect(adapter.dispose()).resolves.toBeUndefined();
  });
});

describe('SanityAdapter', () => {
  let adapter: SanityAdapter;

  beforeEach(async () => {
    adapter = new SanityAdapter();
    await adapter.initialize({
      type: 'sanity',
      credentials: {
        projectId: 'test-project',
        dataset: 'production',
        token: 'test-token',
      },
    });
  });

  it('has correct name and capabilities', () => {
    expect(adapter.name).toBe('sanity');
    expect(adapter.displayName).toBe('Sanity');
    expect(adapter.capabilities.search).toBe(true);
    expect(adapter.capabilities.versioning).toBe(true);
  });

  it('gets single content', async () => {
    const content = await adapter.getContent('1');
    expect(content).not.toBeNull();
    expect(content?.id).toBe('1');
    expect(content?.type).toBe('post');
    expect(content?.slug).toBe('test-post');
  });

  it('lists content', async () => {
    const result = await adapter.listContent({ type: 'post' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Test Post');
  });

  it('gets content types from existing documents', async () => {
    const types = await adapter.getContentTypes();
    expect(types).toHaveLength(1);
    expect(types[0].id).toBe('post');
  });
});

describe('WordPressAdapter', () => {
  let adapter: WordPressAdapter;

  beforeEach(async () => {
    mockFetch.mockReset();
    
    // Mock post types endpoint
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/wp-json/wp/v2/types')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            post: { slug: 'post', name: 'Posts', description: '', rest_base: 'posts' },
            page: { slug: 'page', name: 'Pages', description: '', rest_base: 'pages' },
          }),
          headers: new Headers(),
        });
      }
      if (url.includes('/wp-json/wp/v2/posts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 1,
              date: '2024-01-01',
              modified: '2024-01-02',
              slug: 'test-post',
              status: 'publish',
              type: 'post',
              title: { rendered: 'Test Post' },
              content: { rendered: '<p>Content</p>' },
              excerpt: { rendered: '<p>Excerpt</p>' },
              author: 1,
              featured_media: 0,
            },
          ]),
          headers: new Headers({
            'x-wp-total': '1',
            'x-wp-totalpages': '1',
          }),
        });
      }
      if (url.includes('/wp-json/wp/v2')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
          headers: new Headers(),
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    adapter = new WordPressAdapter();
    await adapter.initialize({
      type: 'wordpress',
      credentials: {
        url: 'https://example.com',
        username: 'admin',
        applicationPassword: 'xxxx xxxx xxxx',
      },
    });
  });

  it('has correct name and capabilities', () => {
    expect(adapter.name).toBe('wordpress');
    expect(adapter.displayName).toBe('WordPress');
    expect(adapter.capabilities.search).toBe(true);
    expect(adapter.capabilities.webhooks).toBe(false);
  });

  it('lists content', async () => {
    const result = await adapter.listContent({ type: 'post' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Test Post');
    expect(result.items[0].status).toBe('published');
  });

  it('gets content types', async () => {
    const types = await adapter.getContentTypes();
    expect(types.length).toBeGreaterThanOrEqual(2);
    expect(types.find(t => t.id === 'post')).toBeDefined();
    expect(types.find(t => t.id === 'page')).toBeDefined();
  });

  it('performs health check', async () => {
    const result = await adapter.healthCheck();
    expect(result.healthy).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('gets single content item', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/wp-json/wp/v2/posts/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            slug: 'test-post',
            title: { rendered: 'Test Post' },
            content: { rendered: '<p>Content</p>' },
            excerpt: { rendered: '<p>Excerpt</p>' },
            status: 'publish',
            type: 'post',
            date: '2024-01-01',
            modified: '2024-01-02',
          }),
          headers: new Headers(),
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    const content = await adapter.getContent('1');
    expect(content).toBeDefined();
    if (content) {
      expect(content.id).toBe('1');
    }
  });

  it('searches content', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/wp-json/wp/v2/posts') && url.includes('search=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{
            id: 1,
            title: { rendered: 'Found Post' },
            slug: 'found',
            content: { rendered: '<p>Found content</p>' },
            excerpt: { rendered: '<p>Found excerpt</p>' },
            status: 'publish',
            type: 'post',
            date: '2024-01-01',
            modified: '2024-01-02',
            author: 1,
            featured_media: 0,
            categories: [],
            tags: [],
          }]),
          headers: new Headers({ 'x-wp-total': '1', 'x-wp-totalpages': '1' }),
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    const result = await adapter.searchContent('test');
    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('disposes without errors', async () => {
    await expect(adapter.dispose()).resolves.toBeUndefined();
  });
});
