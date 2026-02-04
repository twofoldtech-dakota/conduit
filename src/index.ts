#!/usr/bin/env node
/**
 * Conduit - Enterprise CMS MCP Server
 * 
 * One connection to every CMS.
 */

import { ConduitServer } from './server.js';
import { loadConfig } from './config/loader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Find config file
  const configPaths = [
    process.env.CONDUIT_CONFIG,
    path.join(process.cwd(), 'conduit.yaml'),
    path.join(process.cwd(), 'conduit.yml'),
    path.join(__dirname, '..', 'conduit.yaml'),
  ].filter(Boolean) as string[];

  let config;
  for (const configPath of configPaths) {
    try {
      config = await loadConfig(configPath);
      break;
    } catch {
      continue;
    }
  }

  if (!config) {
    console.error('Error: No configuration file found.');
    console.error('Create conduit.yaml in the current directory or set CONDUIT_CONFIG env var.');
    process.exit(1);
  }

  const server = new ConduitServer(config);
  
  // Handle shutdown gracefully
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });

  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Re-export for programmatic use
export { ConduitServer } from './server.js';
export { loadConfig, type ConduitConfig } from './config/loader.js';
export * from './adapters/index.js';
export * from './types/content.js';
