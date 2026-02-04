/**
 * CMS Adapters Tests (Sitecore, Umbraco, Optimizely)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SitecoreAdapter } from '../adapters/sitecore.js';
import { SitecoreXPAdapter } from '../adapters/sitecore-xp.js';
import { UmbracoAdapter } from '../adapters/umbraco.js';
import { OptimizelyAdapter } from '../adapters/optimizely.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SitecoreAdapter', () => {
  let adapter: SitecoreAdapter;

  beforeEach(async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: [] }),
      headers: new Headers(),
    });

    adapter = new SitecoreAdapter();
    await adapter.initialize({
      type: 'sitecore',
      credentials: {
        url: 'https://sitecore.local',
        apiKey: 'test-key',
      },
    });
  });

  it('has correct name and capabilities', () => {
    expect(adapter.name).toBe('sitecore');
    expect(adapter.displayName).toBeDefined();
    expect(adapter.capabilities).toBeDefined();
  });

  it('performs health check', async () => {
    const result = await adapter.healthCheck();
    expect(result).toBeDefined();
    expect(result.healthy).toBeDefined();
  });

  it('lists content', async () => {
    const result = await adapter.listContent({ limit: 10 });
    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
  });

  it('gets single content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ItemID: '123',
        ItemName: 'Test',
        ItemPath: '/sitecore/content/test',
        TemplateName: 'Article',
      }),
      headers: new Headers(),
    });

    const content = await adapter.getContent('123');
    expect(content).toBeDefined();
  });

  it('searches content', async () => {
    const result = await adapter.searchContent('test query');
    expect(result).toBeDefined();
  });

  it('gets content types', async () => {
    const types = await adapter.getContentTypes();
    expect(types).toBeDefined();
    expect(Array.isArray(types)).toBe(true);
  });

  it('disposes without errors', async () => {
    await expect(adapter.dispose()).resolves.toBeUndefined();
  });
});

describe('SitecoreXPAdapter', () => {
  let adapter: SitecoreXPAdapter;

  beforeEach(async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: [] }),
      headers: new Headers(),
    });

    adapter = new SitecoreXPAdapter();
    await adapter.initialize({
      type: 'sitecore-xp',
      credentials: {
        url: 'https://sitecore.local',
        apiKey: 'test-key',
        username: 'admin',
        password: 'password',
      },
    });
  });

  it('has correct name and capabilities', () => {
    expect(adapter.name).toBe('sitecore-xp');
    expect(adapter.displayName).toBeDefined();
    expect(adapter.capabilities).toBeDefined();
  });

  it('performs health check', async () => {
    const result = await adapter.healthCheck();
    expect(result).toBeDefined();
  });

  it('lists content', async () => {
    const result = await adapter.listContent({ limit: 5 });
    expect(result).toBeDefined();
  });

  it('gets single content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ItemID: '456',
        ItemName: 'Test XP',
      }),
      headers: new Headers(),
    });

    const content = await adapter.getContent('456');
    expect(content).toBeDefined();
  });

  it('creates content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ItemID: 'new-123',
        ItemName: 'New Item',
      }),
      headers: new Headers(),
    });

    const result = await adapter.createContent({
      type: 'Article',
      fields: { title: 'New Article' },
    });
    expect(result).toBeDefined();
  });

  it('updates content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ItemID: '123',
        ItemName: 'Updated',
      }),
      headers: new Headers(),
    });

    const result = await adapter.updateContent('123', {
      fields: { title: 'Updated' },
    });
    expect(result).toBeDefined();
  });

  it('deletes content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
      headers: new Headers(),
    });

    await expect(adapter.deleteContent('123')).resolves.toBeUndefined();
  });

  it('searches content', async () => {
    const result = await adapter.searchContent('xp query');
    expect(result).toBeDefined();
  });

  it('gets content types', async () => {
    const types = await adapter.getContentTypes();
    expect(types).toBeDefined();
  });

  it('disposes without errors', async () => {
    await expect(adapter.dispose()).resolves.toBeUndefined();
  });
});

describe('UmbracoAdapter', () => {
  let adapter: UmbracoAdapter;

  beforeEach(async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0 }),
      headers: new Headers(),
    });

    adapter = new UmbracoAdapter();
    await adapter.initialize({
      type: 'umbraco',
      credentials: {
        url: 'https://umbraco.local',
        apiKey: 'test-key',
      },
    });
  });

  it('has correct name and capabilities', () => {
    expect(adapter.name).toBe('umbraco');
    expect(adapter.displayName).toBe('Umbraco');
    expect(adapter.capabilities.search).toBe(true);
  });

  it('performs health check', async () => {
    const result = await adapter.healthCheck();
    expect(result).toBeDefined();
  });

  it('lists content', async () => {
    const result = await adapter.listContent({ limit: 10 });
    expect(result).toBeDefined();
  });

  it('gets single content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: '789',
        name: 'Test Umbraco',
        contentType: 'article',
      }),
      headers: new Headers(),
    });

    const content = await adapter.getContent('789');
    expect(content).toBeDefined();
  });

  it('searches content', async () => {
    const result = await adapter.searchContent('umbraco query');
    expect(result).toBeDefined();
  });

  it('gets content types', async () => {
    const types = await adapter.getContentTypes();
    expect(types).toBeDefined();
  });

  it('disposes without errors', async () => {
    await expect(adapter.dispose()).resolves.toBeUndefined();
  });
});

describe('OptimizelyAdapter', () => {
  let adapter: OptimizelyAdapter;

  beforeEach(async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], totalCount: 0 }),
      headers: new Headers(),
    });

    adapter = new OptimizelyAdapter();
    await adapter.initialize({
      type: 'optimizely',
      credentials: {
        url: 'https://optimizely.local',
        apiKey: 'test-key',
      },
    });
  });

  it('has correct name and capabilities', () => {
    expect(adapter.name).toBe('optimizely');
    expect(adapter.displayName).toBe('Optimizely');
    expect(adapter.capabilities.search).toBe(true);
  });

  it('performs health check', async () => {
    const result = await adapter.healthCheck();
    expect(result).toBeDefined();
  });

  it('lists content', async () => {
    const result = await adapter.listContent({ limit: 10 });
    expect(result).toBeDefined();
  });

  it('gets single content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        contentLink: { id: '999' },
        name: 'Test Optimizely',
        contentType: ['page'],
      }),
      headers: new Headers(),
    });

    const content = await adapter.getContent('999');
    expect(content).toBeDefined();
  });

  it('searches content', async () => {
    const result = await adapter.searchContent('optimizely query');
    expect(result).toBeDefined();
  });

  it('gets content types', async () => {
    const types = await adapter.getContentTypes();
    expect(types).toBeDefined();
  });

  it('disposes without errors', async () => {
    await expect(adapter.dispose()).resolves.toBeUndefined();
  });
});
