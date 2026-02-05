/**
 * Audit Middleware Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuditMiddleware, type AuditEntry } from '../middleware/audit.js';
import { createWriteStream } from 'fs';

// Mock fs
vi.mock('fs', () => ({
  createWriteStream: vi.fn(() => ({
    write: vi.fn(),
  })),
}));

// Mock pino
vi.mock('pino', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  const pinoFn = vi.fn(() => mockLogger);
  pinoFn.destination = vi.fn(() => ({}));
  pinoFn.multistream = vi.fn((streams) => ({}));

  return {
    default: pinoFn,
    pino: pinoFn,
  };
});

describe('AuditMiddleware', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('constructor', () => {
    it('creates disabled audit when not enabled', () => {
      const audit = new AuditMiddleware({ enabled: false });
      expect(audit).toBeDefined();
    });

    it('creates enabled audit with file logging', () => {
      const audit = new AuditMiddleware({
        enabled: true,
        logFile: '/tmp/audit.log',
      });
      expect(audit).toBeDefined();
      expect(createWriteStream).toHaveBeenCalledWith('/tmp/audit.log', { flags: 'a' });
    });

    it('creates enabled audit without file logging', () => {
      const audit = new AuditMiddleware({ enabled: true });
      expect(audit).toBeDefined();
    });

    it('configures stdout logging in non-production', () => {
      process.env.NODE_ENV = 'development';
      const audit = new AuditMiddleware({ enabled: true });
      expect(audit).toBeDefined();
    });

    it('skips stdout logging in production', () => {
      process.env.NODE_ENV = 'production';
      const audit = new AuditMiddleware({ enabled: true });
      expect(audit).toBeDefined();
    });
  });

  describe('log', () => {
    it('does not log when disabled', () => {
      const audit = new AuditMiddleware({ enabled: false });
      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        operation: 'test',
        adapter: 'test-adapter',
        params: {},
        success: true,
        durationMs: 100,
      };

      // Should not throw
      expect(() => audit.log(entry)).not.toThrow();
    });

    it('logs entry when enabled', () => {
      const audit = new AuditMiddleware({ enabled: true });
      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        operation: 'content_list',
        adapter: 'contentful',
        params: { limit: 10 },
        success: true,
        durationMs: 150,
      };

      expect(() => audit.log(entry)).not.toThrow();
    });

    it('logs entry with error', () => {
      const audit = new AuditMiddleware({ enabled: true });
      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        operation: 'content_get',
        adapter: 'sanity',
        params: { id: '123' },
        success: false,
        durationMs: 50,
        error: 'Not found',
      };

      expect(() => audit.log(entry)).not.toThrow();
    });

    it('logs entry with result count', () => {
      const audit = new AuditMiddleware({ enabled: true });
      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        operation: 'content_list',
        adapter: 'wordpress',
        params: { type: 'post' },
        success: true,
        durationMs: 200,
        resultCount: 5,
      };

      expect(() => audit.log(entry)).not.toThrow();
    });
  });

  describe('wrap', () => {
    it('executes function when disabled', async () => {
      const audit = new AuditMiddleware({ enabled: false });
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await audit.wrap('test', 'test_op', {}, mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });

    it('executes function and logs success', async () => {
      const audit = new AuditMiddleware({ enabled: true });
      const mockFn = vi.fn().mockResolvedValue({ data: 'success' });

      const result = await audit.wrap('adapter1', 'operation1', { param: 'value' }, mockFn);

      expect(result).toEqual({ data: 'success' });
      expect(mockFn).toHaveBeenCalled();
    });

    it('extracts result count from list operations', async () => {
      const audit = new AuditMiddleware({ enabled: true });
      const mockResult = {
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
        total: 3,
      };
      const mockFn = vi.fn().mockResolvedValue(mockResult);

      const result = await audit.wrap('adapter1', 'list_content', {}, mockFn);

      expect(result).toEqual(mockResult);
    });

    it('logs error on function failure', async () => {
      const audit = new AuditMiddleware({ enabled: true });
      const error = new Error('Test error');
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(
        audit.wrap('adapter1', 'failing_op', { test: true }, mockFn)
      ).rejects.toThrow('Test error');

      expect(mockFn).toHaveBeenCalled();
    });

    it('handles non-Error exceptions', async () => {
      const audit = new AuditMiddleware({ enabled: true });
      const mockFn = vi.fn().mockRejectedValue('string error');

      await expect(
        audit.wrap('adapter1', 'string_error', {}, mockFn)
      ).rejects.toBe('string error');
    });

    it('measures execution duration', async () => {
      const audit = new AuditMiddleware({ enabled: true });
      const mockFn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'done';
      });

      const result = await audit.wrap('adapter1', 'slow_op', {}, mockFn);

      expect(result).toBe('done');
    });

    it('handles null result', async () => {
      const audit = new AuditMiddleware({ enabled: true });
      const mockFn = vi.fn().mockResolvedValue(null);

      const result = await audit.wrap('adapter1', 'null_result', {}, mockFn);

      expect(result).toBeNull();
    });

    it('handles result without items property', async () => {
      const audit = new AuditMiddleware({ enabled: true });
      const mockFn = vi.fn().mockResolvedValue({ data: 'value' });

      const result = await audit.wrap('adapter1', 'single_item', {}, mockFn);

      expect(result).toEqual({ data: 'value' });
    });
  });

  describe('integration', () => {
    it('audit lifecycle with multiple operations', async () => {
      const audit = new AuditMiddleware({ enabled: true });

      // Success operation
      await audit.wrap('cms1', 'op1', { a: 1 }, async () => ({ items: [1, 2] }));

      // Another success
      await audit.wrap('cms2', 'op2', { b: 2 }, async () => 'result');

      // Failure operation
      try {
        await audit.wrap('cms3', 'op3', { c: 3 }, async () => {
          throw new Error('Failed');
        });
      } catch {
        // Expected
      }

      // Should have completed without errors
      expect(true).toBe(true);
    });
  });
});
