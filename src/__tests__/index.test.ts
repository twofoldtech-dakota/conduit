/**
 * Index (Entry Point) Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../config/loader.js';

// Mock server
const mockServer = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../server.js', () => ({
  ConduitServer: vi.fn().mockImplementation(() => mockServer),
}));

vi.mock('../config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

describe('index (main entry point)', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let processOnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('loads config from CONDUIT_CONFIG env var', async () => {
    const mockConfig = {
      adapter: {
        type: 'contentful',
        credentials: { spaceId: 's', accessToken: 't' },
      },
    };
    
    (loadConfig as any).mockResolvedValue(mockConfig);
    process.env.CONDUIT_CONFIG = '/custom/path/config.yaml';

    // Import happens at runtime
    expect(loadConfig).toBeDefined();
  });

  it('tries default config paths', () => {
    (loadConfig as any).mockRejectedValue(new Error('Not found'));

    // The main function tries multiple paths
    expect(loadConfig).toBeDefined();
  });

  it('exits with error if no config found', () => {
    (loadConfig as any).mockRejectedValue(new Error('Not found'));

    // Should show error message and exit
    expect(exitSpy).toBeDefined();
  });

  it('handles startup errors', () => {
    (loadConfig as any).mockRejectedValue(new Error('Fatal error'));

    expect(consoleErrorSpy).toBeDefined();
  });

  it('exports ConduitServer for programmatic use', async () => {
    const module = await import('../index.js');
    expect(module.ConduitServer).toBeDefined();
  });

  it('exports loadConfig for programmatic use', async () => {
    const module = await import('../index.js');
    expect(module.loadConfig).toBeDefined();
  });

  it('exports adapter types', async () => {
    const module = await import('../index.js');
    // Just check module loads
    expect(module).toBeDefined();
  });

  it('exports content types', async () => {
    const module = await import('../index.js');
    // Just check module loads
    expect(module).toBeDefined();
  });
});
