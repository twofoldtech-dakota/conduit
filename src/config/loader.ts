/**
 * Configuration loader for Conduit.
 * Supports YAML config files with environment variable interpolation.
 */

import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

// Supported adapter types
export const AdapterType = z.enum(['contentful', 'sanity', 'wordpress', 'sitecore', 'sitecore-xp', 'umbraco', 'optimizely']);
export type AdapterType = z.infer<typeof AdapterType>;

// Single adapter configuration
const AdapterConfigSchema = z.object({
  name: z.string().optional(),
  type: z.string(),
  credentials: z.record(z.unknown()),
  defaultLocale: z.string().optional(),
  preview: z.boolean().optional().default(false),
  endpoint: z.string().optional(),
});

// Cache configuration
const CacheConfigSchema = z.object({
  enabled: z.boolean().optional().default(true),
  ttlMs: z.number().optional().default(60000),
  maxSize: z.number().optional().default(500),
});

// Rate limiting configuration
const RateLimitConfigSchema = z.object({
  enabled: z.boolean().optional().default(false),
  windowMs: z.number().optional().default(60000),
  maxRequests: z.number().optional().default(100),
});

// Audit logging configuration
const AuditConfigSchema = z.object({
  enabled: z.boolean().optional().default(false),
  level: z.string().optional().default('info'),
  logFile: z.string().optional(),
});

// Middleware config
const MiddlewareConfigSchema = z.object({
  cache: CacheConfigSchema.optional(),
  rateLimit: RateLimitConfigSchema.optional(),
  audit: AuditConfigSchema.optional(),
}).optional();

// Main configuration schema
const ConfigSchema = z.object({
  // Single adapter mode
  adapter: AdapterConfigSchema.optional(),
  
  // Multi-adapter mode (for enterprise) - object keyed by adapter name
  adapters: z.record(AdapterConfigSchema).optional(),
  
  // Middleware settings
  middleware: MiddlewareConfigSchema,
  
  // Server settings
  server: z.object({
    name: z.string().default('conduit'),
    version: z.string().default('1.0.0'),
  }).optional(),
}).refine(
  (data) => data.adapter || data.adapters,
  { message: 'Either adapter or adapters must be provided' }
);

export type ConduitConfig = z.infer<typeof ConfigSchema>;
export type AdapterConfig = z.infer<typeof AdapterConfigSchema>;

/**
 * Interpolate environment variables in a value.
 * Supports ${VAR} syntax. Missing vars are kept as-is.
 */
export function interpolateEnvVars<T>(value: T): T {
  if (typeof value === 'string') {
    return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const envValue = process.env[varName.trim()];
      return envValue !== undefined ? envValue : match;
    }) as T;
  }
  if (Array.isArray(value)) {
    return value.map(interpolateEnvVars) as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = interpolateEnvVars(val);
    }
    return result as T;
  }
  return value;
}

/**
 * Validate configuration without loading from file.
 */
export function validateConfig(config: unknown): ConduitConfig {
  return ConfigSchema.parse(config);
}

/**
 * Load configuration from a YAML file.
 */
export async function loadConfig(configPath: string): Promise<ConduitConfig> {
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const content = readFileSync(configPath, 'utf-8');
  const parsed = parseYaml(content);
  const interpolated = interpolateEnvVars(parsed);
  
  return ConfigSchema.parse(interpolated);
}

/**
 * Get the active adapter configurations as a map.
 */
export function getAdapterConfigs(config: ConduitConfig): Map<string, AdapterConfig> {
  const result = new Map<string, AdapterConfig>();
  
  if (config.adapters) {
    for (const [name, adapter] of Object.entries(config.adapters)) {
      result.set(name, { ...adapter, name });
    }
  } else if (config.adapter) {
    result.set('default', { ...config.adapter, name: 'default' });
  }
  
  return result;
}
