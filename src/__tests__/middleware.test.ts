/**
 * Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheMiddleware } from '../middleware/cache.js';
import { RateLimitMiddleware } from '../middleware/rate-limit.js';

describe('CacheMiddleware', () => {
  let cache: CacheMiddleware;

  beforeEach(() => {
    cache = new CacheMiddleware({ ttlMs: 1000, maxSize: 10 });
  });

  it('caches values', () => {
    cache.set('key1', { data: 'value1' });
    expect(cache.get('key1')).toEqual({ data: 'value1' });
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('expires entries after TTL', async () => {
    const shortCache = new CacheMiddleware({ ttlMs: 50, maxSize: 10 });
    shortCache.set('key', 'value');
    expect(shortCache.get('key')).toBe('value');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(shortCache.get('key')).toBeUndefined();
  });

  it('respects max size (LRU eviction)', () => {
    const smallCache = new CacheMiddleware({ ttlMs: 10000, maxSize: 3 });
    smallCache.set('a', 1);
    smallCache.set('b', 2);
    smallCache.set('c', 3);
    smallCache.set('d', 4); // Should evict 'a'
    
    expect(smallCache.get('a')).toBeUndefined();
    expect(smallCache.get('b')).toBe(2);
    expect(smallCache.get('d')).toBe(4);
  });

  it('deletes entries', () => {
    cache.set('key', 'value');
    cache.delete('key');
    expect(cache.get('key')).toBeUndefined();
  });

  it('clears all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  it('generates consistent cache keys', () => {
    const key1 = CacheMiddleware.generateKey('op', { a: 1, b: 2 });
    const key2 = CacheMiddleware.generateKey('op', { b: 2, a: 1 });
    expect(key1).toBe(key2);
  });
});

describe('RateLimitMiddleware', () => {
  let rateLimiter: RateLimitMiddleware;

  beforeEach(() => {
    rateLimiter = new RateLimitMiddleware({ windowMs: 1000, maxRequests: 5 });
  });

  it('allows requests within limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.checkLimit('client1')).toBe(true);
    }
  });

  it('blocks requests over limit', () => {
    for (let i = 0; i < 5; i++) {
      rateLimiter.checkLimit('client1');
    }
    expect(rateLimiter.checkLimit('client1')).toBe(false);
  });

  it('tracks clients separately', () => {
    for (let i = 0; i < 5; i++) {
      rateLimiter.checkLimit('client1');
    }
    expect(rateLimiter.checkLimit('client1')).toBe(false);
    expect(rateLimiter.checkLimit('client2')).toBe(true);
  });

  it('resets after window expires', async () => {
    const shortLimiter = new RateLimitMiddleware({ windowMs: 100, maxRequests: 2 });
    shortLimiter.checkLimit('client');
    shortLimiter.checkLimit('client');
    expect(shortLimiter.checkLimit('client')).toBe(false);
    
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(shortLimiter.checkLimit('client')).toBe(true);
  });

  it('reports remaining requests', () => {
    rateLimiter.checkLimit('client');
    rateLimiter.checkLimit('client');
    const status = rateLimiter.getStatus('client');
    expect(status.remaining).toBe(3);
    expect(status.limit).toBe(5);
  });
});
