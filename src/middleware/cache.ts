/**
 * Caching middleware for adapter responses.
 * Uses LRU cache with configurable TTL.
 */

import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  ttlMs: number;
  maxSize: number;
}

export class CacheMiddleware {
  private cache: LRUCache<string, NonNullable<unknown>>;

  constructor(options: CacheOptions) {
    this.cache = new LRUCache({
      max: options.maxSize,
      ttl: options.ttlMs,
    });
  }

  /**
   * Generate cache key from operation and parameters.
   */
  static generateKey(operation: string, params: unknown): string {
    const sortedParams = JSON.stringify(params, Object.keys(params as object).sort());
    return `${operation}:${sortedParams}`;
  }

  /**
   * Get cached value if available.
   */
  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  /**
   * Set cache value.
   */
  set(key: string, value: NonNullable<unknown>): void {
    this.cache.set(key, value);
  }

  /**
   * Delete a cache entry.
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate cache entries matching a prefix.
   */
  invalidate(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  stats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      // Note: LRU cache doesn't track hits/misses by default
      // These would need custom tracking if needed
      hits: 0,
      misses: 0,
    };
  }

  /**
   * Wrap an async function with caching.
   * Note: null results are not cached.
   */
  async wrap<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Execute and cache result (skip caching null values)
    const result = await fn();
    if (result !== null && result !== undefined) {
      this.set(key, result as NonNullable<T>);
    }
    return result;
  }
}
