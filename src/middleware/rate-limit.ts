/**
 * Rate limiting middleware to prevent API abuse.
 * Uses sliding window algorithm.
 */

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

interface WindowEntry {
  timestamps: number[];
}

export class RateLimitMiddleware {
  private windows: Map<string, WindowEntry> = new Map();
  private windowMs: number;
  private limit: number;

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs;
    this.limit = options.maxRequests;
  }

  /**
   * Check if request should be allowed (sliding window).
   * @returns true if allowed, false if rate limited
   */
  checkLimit(key: string = 'global'): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let entry = this.windows.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.windows.set(key, entry);
    }
    
    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(t => t > windowStart);
    
    if (entry.timestamps.length >= this.limit) {
      return false;
    }
    
    entry.timestamps.push(now);
    return true;
  }

  /**
   * Get rate limit status for a key.
   */
  getStatus(key: string = 'global'): { remaining: number; limit: number; resetMs: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const entry = this.windows.get(key);
    const timestamps = entry?.timestamps.filter(t => t > windowStart) || [];
    const remaining = Math.max(0, this.limit - timestamps.length);
    const oldestTimestamp = timestamps[0];
    const resetMs = oldestTimestamp ? (oldestTimestamp + this.windowMs) - now : 0;
    
    return { remaining, limit: this.limit, resetMs };
  }

  /**
   * Wrap an async function with rate limiting.
   * Throws if rate limited.
   */
  async wrap<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (!this.checkLimit(key)) {
      const status = this.getStatus(key);
      const resetIn = Math.ceil(status.resetMs / 1000);
      throw new Error(`Rate limited. Try again in ${resetIn} seconds.`);
    }
    return fn();
  }
}
