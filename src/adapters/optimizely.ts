/**
 * Optimizely Content Cloud Adapter
 * 
 * Implements ICMSAdapter for Optimizely (formerly Episerver) via Content Delivery API.
 * Supports both Optimizely CMS 12+ and Optimizely Content Cloud (SaaS).
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

interface OptimizelyContent {
  contentLink: {
    id: number;
    guidValue: string;
    url?: string;
  };
  name: string;
  language: { name: string };
  existingLanguages?: Array<{ name: string }>;
  contentType: string[];
  parentLink?: { id: number };
  routeSegment?: string;
  url?: string;
  changed: string;
  created: string;
  startPublish?: string;
  status?: string;
  [key: string]: unknown; // Dynamic properties
}

interface OptimizelyMediaData {
  contentLink: {
    id: number;
    guidValue: string;
    url: string;
  };
  name: string;
  language: { name: string };
  contentType: string[];
  created: string;
  mimeType?: string;
  thumbnail?: { url: string };
}

interface OptimizelyContentType {
  name: string;
  displayName: string;
  description?: string;
  base: string;
  properties: Record<string, {
    displayName: string;
    type: string;
    required: boolean;
  }>;
}

interface OptimizelyResponse<T> {
  items: T[];
  totalMatching: number;
  next?: string;
}

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class OptimizelyAdapter extends BaseAdapter {
  readonly name = 'optimizely';
  readonly displayName = 'Optimizely';
  readonly capabilities: AdapterCapabilities = {
    search: true,
    media: true,
    create: false, // Content Delivery API is read-only
    update: false,
    delete: false,
    preview: true,
    versioning: true,
    localization: true,
    webhooks: true,
  };

  private baseUrl!: string;
  private clientId!: string;
  private clientSecret!: string;
  private accessToken?: string;
  private tokenExpiry?: number;
  private defaultLanguage: string = 'en';

  async initialize(config: AdapterConfig): Promise<void> {
    this.baseUrl = config.credentials.url.replace(/\/$/, '');
    this.clientId = config.credentials.clientId;
    this.clientSecret = config.credentials.clientSecret;
    this.defaultLanguage = config.defaultLocale || 'en';

    // Get initial token
    await this.refreshToken();
  }

  private async refreshToken(): Promise<void> {
    const tokenUrl = `${this.baseUrl}/api/episerver/connect/token`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'epi_content_delivery',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get Optimizely token: ${response.status}`);
    }

    const data = await response.json() as OAuthTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early
  }

  private async ensureToken(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      await this.refreshToken();
    }
    return this.accessToken!;
  }

  private async fetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.ensureToken();
    
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Accept-Language': this.defaultLanguage,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Optimizely API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.fetch<OptimizelyResponse<OptimizelyContent>>(
        '/api/episerver/v3.0/site'
      );
      return {
        healthy: true,
        latencyMs: Date.now() - start,
        message: 'Connected to Optimizely Content Cloud',
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
      const language = locale || this.defaultLanguage;
      
      const content = await this.fetch<OptimizelyContent>(
        `/api/episerver/v3.0/content/${id}`,
        { language }
      );

      return this.transformContent(content);
    } catch {
      return null;
    }
  }

  async listContent(filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const params: Record<string, string> = {
      top: String(filter?.limit || 10),
      skip: String(filter?.skip || 0),
    };

    if (filter?.locale) {
      params['language'] = filter.locale;
    }

    if (filter?.type) {
      params['filter'] = `ContentType/any(t:t eq '${filter.type}')`;
    }

    if (filter?.orderBy) {
      params['orderby'] = `${filter.orderBy} ${filter.orderDirection || 'asc'}`;
    }

    const response = await this.fetch<OptimizelyResponse<OptimizelyContent>>(
      '/api/episerver/v3.0/content',
      params
    );

    return {
      items: response.items.map(item => this.transformContent(item)),
      total: response.totalMatching,
      skip: filter?.skip || 0,
      limit: filter?.limit || 10,
      hasMore: (filter?.skip || 0) + response.items.length < response.totalMatching,
    };
  }

  async searchContent(query: string, filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const params: Record<string, string> = {
      top: String(filter?.limit || 10),
      skip: String(filter?.skip || 0),
    };

    if (filter?.locale) {
      params['language'] = filter.locale;
    }

    // Optimizely uses OData-style search
    params['filter'] = `contains(Name, '${query}')`;

    if (filter?.type) {
      params['filter'] += ` and ContentType/any(t:t eq '${filter.type}')`;
    }

    const response = await this.fetch<OptimizelyResponse<OptimizelyContent>>(
      '/api/episerver/v3.0/search/content',
      params
    );

    return {
      items: response.items.map(item => this.transformContent(item)),
      total: response.totalMatching,
      skip: filter?.skip || 0,
      limit: filter?.limit || 10,
      hasMore: (filter?.skip || 0) + response.items.length < response.totalMatching,
    };
  }

  async createContent(_input: ContentCreateInput): Promise<Content> {
    throw new Error('Optimizely Content Delivery API is read-only. Use Content Management API for write operations.');
  }

  async updateContent(_id: string, _input: ContentUpdateInput): Promise<Content> {
    throw new Error('Optimizely Content Delivery API is read-only. Use Content Management API for write operations.');
  }

  async deleteContent(_id: string): Promise<void> {
    throw new Error('Optimizely Content Delivery API is read-only. Use Content Management API for write operations.');
  }

  async getMedia(id: string): Promise<Media | null> {
    try {
      const media = await this.fetch<OptimizelyMediaData>(
        `/api/episerver/v3.0/content/${id}`
      );

      if (!media.contentType.includes('Media')) {
        return null;
      }

      return this.transformMedia(media);
    } catch {
      return null;
    }
  }

  async listMedia(filter?: { limit?: number; skip?: number }): Promise<PaginatedResponse<Media>> {
    const params: Record<string, string> = {
      top: String(filter?.limit || 10),
      skip: String(filter?.skip || 0),
      filter: "ContentType/any(t:contains(t, 'Media'))",
    };

    const response = await this.fetch<OptimizelyResponse<OptimizelyMediaData>>(
      '/api/episerver/v3.0/content',
      params
    );

    return {
      items: response.items.map(item => this.transformMedia(item)),
      total: response.totalMatching,
      skip: filter?.skip || 0,
      limit: filter?.limit || 10,
      hasMore: (filter?.skip || 0) + response.items.length < response.totalMatching,
    };
  }

  async getContentTypes(): Promise<ContentType[]> {
    try {
      const response = await this.fetch<OptimizelyResponse<OptimizelyContentType>>(
        '/api/episerver/v3.0/contentmanifest/contenttypes'
      );

      return response.items.map(ct => ({
        id: ct.name,
        name: ct.displayName,
        description: ct.description,
        fields: Object.entries(ct.properties).map(([id, prop]) => ({
          id,
          name: prop.displayName,
          type: this.mapFieldType(prop.type),
          required: prop.required,
        })),
      }));
    } catch {
      // Fallback if manifest not available
      return [];
    }
  }

  async getContentType(id: string): Promise<ContentType | null> {
    const types = await this.getContentTypes();
    return types.find(t => t.id === id) || null;
  }

  async dispose(): Promise<void> {
    this.accessToken = undefined;
    this.tokenExpiry = undefined;
  }

  // ============== Transform Helpers ==============

  private transformContent(content: OptimizelyContent): Content {
    // Extract known system properties, rest are content fields
    const {
      contentLink,
      name,
      language,
      existingLanguages,
      contentType,
      parentLink,
      routeSegment,
      url,
      changed,
      created,
      startPublish,
      status,
      ...fields
    } = content;

    // Find title in fields
    const title = (fields.title as string) ||
                  (fields.pageTitle as string) ||
                  (fields.heading as string) ||
                  name;

    return {
      id: contentLink.guidValue || String(contentLink.id),
      type: contentType[contentType.length - 1], // Most specific type
      title,
      slug: url || routeSegment,
      status: status === 'Published' ? 'published' : 'draft',
      createdAt: created,
      updatedAt: changed,
      publishedAt: startPublish,
      locale: language.name,
      fields,
      _raw: content,
    };
  }

  private transformMedia(media: OptimizelyMediaData): Media {
    return {
      id: media.contentLink.guidValue || String(media.contentLink.id),
      filename: media.name,
      mimeType: media.mimeType || 'application/octet-stream',
      size: 0, // Not provided by default
      url: media.contentLink.url || media.thumbnail?.url || '',
      createdAt: media.created,
    };
  }

  private mapFieldType(optiType: string): import('../types/content.js').FieldType {
    const typeMap: Record<string, import('../types/content.js').FieldType> = {
      'String': 'string',
      'LongString': 'text',
      'XhtmlString': 'rich-text',
      'Int32': 'integer',
      'Double': 'number',
      'Boolean': 'boolean',
      'DateTime': 'datetime',
      'ContentReference': 'reference',
      'ContentReferenceList': 'array',
      'ContentArea': 'array',
      'LinkCollection': 'array',
      'Url': 'link',
    };
    return typeMap[optiType] || 'unknown';
  }
}
