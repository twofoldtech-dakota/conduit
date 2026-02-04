/**
 * ICMSAdapter - The core interface that all CMS adapters must implement.
 * 
 * This abstraction allows Conduit to work with any CMS through a unified API.
 * Each adapter translates CMS-specific operations to this common interface.
 */

import type {
  Content,
  ContentFilter,
  ContentCreateInput,
  ContentUpdateInput,
  ContentType,
  Media,
  PaginatedResponse,
} from '../types/content.js';

/**
 * Capabilities that an adapter may or may not support.
 * Tools check these before attempting operations.
 */
export interface AdapterCapabilities {
  /** Can perform full-text search */
  search: boolean;
  /** Can manage media/assets */
  media: boolean;
  /** Can create new content */
  create: boolean;
  /** Can update existing content */
  update: boolean;
  /** Can delete content */
  delete: boolean;
  /** Supports draft/preview mode */
  preview: boolean;
  /** Supports content versioning */
  versioning: boolean;
  /** Supports multiple locales */
  localization: boolean;
  /** Supports webhooks for real-time updates */
  webhooks: boolean;
}

/**
 * Configuration passed to adapter during initialization.
 */
export interface AdapterConfig {
  /** Adapter type identifier */
  type: string;
  /** Adapter-specific credentials and settings */
  credentials: Record<string, string>;
  /** Optional: default locale */
  defaultLocale?: string;
  /** Optional: enable preview/draft mode */
  preview?: boolean;
  /** Optional: custom API endpoint */
  endpoint?: string;
}

/**
 * Result of adapter health check.
 */
export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * The main adapter interface. All CMS adapters must implement this.
 */
export interface ICMSAdapter {
  /** Unique identifier for this adapter type */
  readonly name: string;
  
  /** Human-readable display name */
  readonly displayName: string;
  
  /** What operations this adapter supports */
  readonly capabilities: AdapterCapabilities;

  /**
   * Initialize the adapter with credentials.
   * Called once when the server starts.
   */
  initialize(config: AdapterConfig): Promise<void>;

  /**
   * Check if the adapter can connect to the CMS.
   */
  healthCheck(): Promise<HealthCheckResult>;

  // ============== Content Operations ==============

  /**
   * Get a single content item by ID.
   */
  getContent(id: string, locale?: string): Promise<Content | null>;

  /**
   * List content with optional filters.
   */
  listContent(filter?: ContentFilter): Promise<PaginatedResponse<Content>>;

  /**
   * Search content by query string.
   * @throws if capabilities.search is false
   */
  searchContent(query: string, filter?: ContentFilter): Promise<PaginatedResponse<Content>>;

  /**
   * Create new content.
   * @throws if capabilities.create is false
   */
  createContent(input: ContentCreateInput): Promise<Content>;

  /**
   * Update existing content.
   * @throws if capabilities.update is false
   */
  updateContent(id: string, input: ContentUpdateInput): Promise<Content>;

  /**
   * Delete content.
   * @throws if capabilities.delete is false
   */
  deleteContent(id: string): Promise<void>;

  // ============== Media Operations ==============

  /**
   * Get a single media item by ID.
   * @throws if capabilities.media is false
   */
  getMedia(id: string): Promise<Media | null>;

  /**
   * List media assets.
   * @throws if capabilities.media is false
   */
  listMedia(filter?: { limit?: number; skip?: number }): Promise<PaginatedResponse<Media>>;

  // ============== Schema Operations ==============

  /**
   * Get all content types/models defined in the CMS.
   */
  getContentTypes(): Promise<ContentType[]>;

  /**
   * Get a specific content type by ID.
   */
  getContentType(id: string): Promise<ContentType | null>;

  // ============== Lifecycle ==============

  /**
   * Clean up resources when shutting down.
   */
  dispose(): Promise<void>;
}

/**
 * Base class providing default implementations for optional operations.
 * Adapters can extend this to reduce boilerplate.
 */
export abstract class BaseAdapter implements ICMSAdapter {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly capabilities: AdapterCapabilities;

  abstract initialize(config: AdapterConfig): Promise<void>;
  abstract healthCheck(): Promise<HealthCheckResult>;
  abstract getContent(id: string, locale?: string): Promise<Content | null>;
  abstract listContent(filter?: ContentFilter): Promise<PaginatedResponse<Content>>;
  abstract getContentTypes(): Promise<ContentType[]>;
  abstract getContentType(id: string): Promise<ContentType | null>;
  abstract dispose(): Promise<void>;

  async searchContent(_query: string, _filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    throw new Error(`Search not supported by ${this.name} adapter`);
  }

  async createContent(_input: ContentCreateInput): Promise<Content> {
    throw new Error(`Create not supported by ${this.name} adapter`);
  }

  async updateContent(_id: string, _input: ContentUpdateInput): Promise<Content> {
    throw new Error(`Update not supported by ${this.name} adapter`);
  }

  async deleteContent(_id: string): Promise<void> {
    throw new Error(`Delete not supported by ${this.name} adapter`);
  }

  async getMedia(_id: string): Promise<Media | null> {
    throw new Error(`Media not supported by ${this.name} adapter`);
  }

  async listMedia(_filter?: { limit?: number; skip?: number }): Promise<PaginatedResponse<Media>> {
    throw new Error(`Media not supported by ${this.name} adapter`);
  }
}
