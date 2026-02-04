/**
 * Umbraco Adapter
 * 
 * Implements ICMSAdapter for Umbraco via Content Delivery API.
 * Supports Umbraco Heartcore (SaaS) and self-hosted Umbraco 12+ with Content Delivery API.
 */

import {
  BaseAdapter,
  type AdapterCapabilities,
  type AdapterConfig,
  type HealthCheckResult,
} from './interface.js';
import type {
  Content,
  ContentFilter,
  ContentCreateInput,
  ContentUpdateInput,
  ContentType,
  Media,
  PaginatedResponse,
} from '../types/content.js';

interface UmbracoContent {
  id: string;
  name: string;
  createDate: string;
  updateDate: string;
  route: { path: string };
  contentType: string;
  properties: Record<string, unknown>;
  cultures?: Record<string, { name: string; urlSegment: string }>;
}

interface UmbracoMedia {
  id: string;
  name: string;
  createDate: string;
  mediaType: string;
  url: string;
  properties?: {
    umbracoFile?: { src: string };
    umbracoWidth?: number;
    umbracoHeight?: number;
    umbracoBytes?: number;
    umbracoExtension?: string;
  };
}

interface UmbracoPagedResponse<T> {
  total: number;
  items: T[];
}

export class UmbracoAdapter extends BaseAdapter {
  readonly name = 'umbraco';
  readonly displayName = 'Umbraco';
  readonly capabilities: AdapterCapabilities = {
    search: true,
    media: true,
    create: false, // Content Delivery API is read-only
    update: false,
    delete: false,
    preview: true,
    versioning: false,
    localization: true,
    webhooks: true,
  };

  private baseUrl!: string;
  private apiKey!: string;
  private isHeartcore: boolean = false;
  private defaultCulture?: string;

  async initialize(config: AdapterConfig): Promise<void> {
    this.baseUrl = config.credentials.url.replace(/\/$/, '');
    this.apiKey = config.credentials.apiKey;
    this.isHeartcore = config.credentials.isHeartcore === 'true';
    this.defaultCulture = config.defaultLocale;

    // Heartcore uses different base path
    if (this.isHeartcore) {
      this.baseUrl = `https://cdn.umbraco.io`;
    }
  }

  private async fetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.isHeartcore) {
      headers['Umb-Project-Alias'] = this.apiKey;
    } else {
      headers['Api-Key'] = this.apiKey;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Umbraco API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Try to fetch root content
      await this.fetch<UmbracoContent>('/umbraco/delivery/api/v2/content');
      return {
        healthy: true,
        latencyMs: Date.now() - start,
        message: `Connected to Umbraco${this.isHeartcore ? ' Heartcore' : ''}`,
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async getContent(id: string, locale?: string): Promise<Content | null> {
    try {
      const params: Record<string, string> = {};
      if (locale || this.defaultCulture) {
        params['culture'] = locale || this.defaultCulture!;
      }

      // Try by ID first, then by path
      let content: UmbracoContent;
      try {
        content = await this.fetch<UmbracoContent>(
          `/umbraco/delivery/api/v2/content/item/${id}`,
          params
        );
      } catch {
        // Try as path
        content = await this.fetch<UmbracoContent>(
          `/umbraco/delivery/api/v2/content/item`,
          { ...params, path: id }
        );
      }

      return this.transformContent(content, locale);
    } catch {
      return null;
    }
  }

  async listContent(filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const params: Record<string, string> = {
      take: String(filter?.limit || 10),
      skip: String(filter?.skip || 0),
    };

    if (filter?.locale || this.defaultCulture) {
      params['culture'] = filter?.locale || this.defaultCulture!;
    }

    if (filter?.type) {
      params['filter'] = `contentType:${filter.type}`;
    }

    if (filter?.orderBy) {
      params['sort'] = `${filter.orderBy}:${filter.orderDirection || 'asc'}`;
    }

    const response = await this.fetch<UmbracoPagedResponse<UmbracoContent>>(
      '/umbraco/delivery/api/v2/content',
      params
    );

    return {
      items: response.items.map(item => this.transformContent(item, filter?.locale)),
      total: response.total,
      skip: filter?.skip || 0,
      limit: filter?.limit || 10,
      hasMore: (filter?.skip || 0) + response.items.length < response.total,
    };
  }

  async searchContent(query: string, filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const params: Record<string, string> = {
      query: query,
      take: String(filter?.limit || 10),
      skip: String(filter?.skip || 0),
    };

    if (filter?.locale || this.defaultCulture) {
      params['culture'] = filter?.locale || this.defaultCulture!;
    }

    if (filter?.type) {
      params['filter'] = `contentType:${filter.type}`;
    }

    const response = await this.fetch<UmbracoPagedResponse<UmbracoContent>>(
      '/umbraco/delivery/api/v2/content',
      params
    );

    return {
      items: response.items.map(item => this.transformContent(item, filter?.locale)),
      total: response.total,
      skip: filter?.skip || 0,
      limit: filter?.limit || 10,
      hasMore: (filter?.skip || 0) + response.items.length < response.total,
    };
  }

  async createContent(_input: ContentCreateInput): Promise<Content> {
    throw new Error('Umbraco Content Delivery API is read-only. Use Management API for write operations.');
  }

  async updateContent(_id: string, _input: ContentUpdateInput): Promise<Content> {
    throw new Error('Umbraco Content Delivery API is read-only. Use Management API for write operations.');
  }

  async deleteContent(_id: string): Promise<void> {
    throw new Error('Umbraco Content Delivery API is read-only. Use Management API for write operations.');
  }

  async getMedia(id: string): Promise<Media | null> {
    try {
      const media = await this.fetch<UmbracoMedia>(
        `/umbraco/delivery/api/v2/media/item/${id}`
      );
      return this.transformMedia(media);
    } catch {
      return null;
    }
  }

  async listMedia(filter?: { limit?: number; skip?: number }): Promise<PaginatedResponse<Media>> {
    const params: Record<string, string> = {
      take: String(filter?.limit || 10),
      skip: String(filter?.skip || 0),
    };

    const response = await this.fetch<UmbracoPagedResponse<UmbracoMedia>>(
      '/umbraco/delivery/api/v2/media',
      params
    );

    return {
      items: response.items.map(item => this.transformMedia(item)),
      total: response.total,
      skip: filter?.skip || 0,
      limit: filter?.limit || 10,
      hasMore: (filter?.skip || 0) + response.items.length < response.total,
    };
  }

  async getContentTypes(): Promise<ContentType[]> {
    // Umbraco Content Delivery API doesn't expose content types directly
    // We'd need Management API for this - return common types
    return [
      {
        id: 'page',
        name: 'Page',
        description: 'Standard page content type',
        fields: [],
      },
      {
        id: 'article',
        name: 'Article',
        description: 'Article/blog post content type',
        fields: [],
      },
    ];
  }

  async getContentType(id: string): Promise<ContentType | null> {
    // Would need Management API for full schema
    return {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      description: `Content type: ${id}`,
      fields: [],
    };
  }

  async dispose(): Promise<void> {
    // No cleanup needed
  }

  // ============== Transform Helpers ==============

  private transformContent(content: UmbracoContent, locale?: string): Content {
    const properties = content.properties || {};
    
    // Find title from common property names
    const title = (properties.title as string) ||
                  (properties.pageTitle as string) ||
                  (properties.name as string) ||
                  content.name;

    // Get culture-specific name if available
    const cultureName = locale && content.cultures?.[locale]?.name;

    return {
      id: content.id,
      type: content.contentType,
      title: cultureName || title,
      slug: content.route?.path,
      status: 'published',
      createdAt: content.createDate,
      updatedAt: content.updateDate,
      locale,
      fields: properties,
      _raw: content,
    };
  }

  private transformMedia(media: UmbracoMedia): Media {
    const props = media.properties || {};
    const fileInfo = props.umbracoFile;
    const url = typeof fileInfo === 'object' && fileInfo?.src 
      ? fileInfo.src 
      : media.url;

    // Determine MIME type from extension
    const ext = props.umbracoExtension || '';
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      mp4: 'video/mp4',
      webm: 'video/webm',
    };

    return {
      id: media.id,
      filename: media.name,
      mimeType: mimeTypes[ext.toLowerCase()] || 'application/octet-stream',
      size: props.umbracoBytes || 0,
      url,
      width: props.umbracoWidth,
      height: props.umbracoHeight,
      createdAt: media.createDate,
    };
  }
}
