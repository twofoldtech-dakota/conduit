/**
 * Config Loader Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { interpolateEnvVars, validateConfig } from '../config/loader.js';

describe('interpolateEnvVars', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('replaces ${VAR} with env values', () => {
    process.env.MY_VAR = 'my-value';
    const result = interpolateEnvVars('prefix-${MY_VAR}-suffix');
    expect(result).toBe('prefix-my-value-suffix');
  });

  it('handles multiple variables', () => {
    process.env.VAR1 = 'one';
    process.env.VAR2 = 'two';
    const result = interpolateEnvVars('${VAR1} and ${VAR2}');
    expect(result).toBe('one and two');
  });

  it('keeps missing vars as-is', () => {
    const result = interpolateEnvVars('${MISSING_VAR}');
    expect(result).toBe('${MISSING_VAR}');
  });

  it('handles empty strings', () => {
    process.env.EMPTY = '';
    const result = interpolateEnvVars('${EMPTY}');
    expect(result).toBe('');
  });

  it('recursively processes objects', () => {
    process.env.TOKEN = 'secret';
    const obj = {
      credentials: {
        token: '${TOKEN}',
        nested: { value: '${TOKEN}' },
      },
    };
    const result = interpolateEnvVars(obj);
    expect(result).toEqual({
      credentials: {
        token: 'secret',
        nested: { value: 'secret' },
      },
    });
  });

  it('recursively processes arrays', () => {
    process.env.ITEM = 'value';
    const arr = ['${ITEM}', { key: '${ITEM}' }];
    const result = interpolateEnvVars(arr);
    expect(result).toEqual(['value', { key: 'value' }]);
  });
});

describe('validateConfig', () => {
  it('validates single adapter config', () => {
    const config = {
      adapter: {
        type: 'contentful',
        credentials: {
          spaceId: 'space-123',
          accessToken: 'token-456',
        },
      },
    };
    expect(() => validateConfig(config)).not.toThrow();
  });

  it('validates multi-adapter config', () => {
    const config = {
      adapters: {
        cms1: {
          type: 'contentful',
          credentials: { spaceId: 'x', accessToken: 'y' },
        },
        cms2: {
          type: 'sanity',
          credentials: { projectId: 'p', dataset: 'd' },
        },
      },
    };
    expect(() => validateConfig(config)).not.toThrow();
  });

  it('rejects config without adapter(s)', () => {
    const config = { middleware: {} };
    expect(() => validateConfig(config)).toThrow();
  });

  it('validates middleware config', () => {
    const config = {
      adapter: {
        type: 'wordpress',
        credentials: { url: 'https://example.com' },
      },
      middleware: {
        cache: { enabled: true, ttlMs: 5000 },
        rateLimit: { enabled: true, windowMs: 60000, maxRequests: 100 },
        audit: { enabled: false },
      },
    };
    expect(() => validateConfig(config)).not.toThrow();
  });
});
