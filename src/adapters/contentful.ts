/**
 * Contentful CMS Adapter
 * 
 * Implements ICMSAdapter for Contentful headless CMS.
 * Supports content delivery API and content management API.
 */

import contentful from 'contentful';
const { createClient } = contentful;
import type { ContentfulClientApi, Entry, Asset, ContentType as CFContentType } from 'contentful';
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
  FieldDefinition,
  FieldType,
  Media,
  PaginatedResponse,
} from '../types/content.js';

export class ContentfulAdapter extends BaseAdapter {
  readonly name = 'contentful';
  readonly displayName = 'Contentful';
  readonly capabilities: AdapterCapabilities = {
    search: true,
    media: true,
    create: false, // Requires Management API (different auth)
    update: false,
    delete: false,
    preview: true,
    versioning: true,
    localization: true,
    webhooks: true,
  };

  private client!: ContentfulClientApi<undefined>;
  private defaultLocale?: string;

  async initialize(config: AdapterConfig): Promise<void> {
    this.defaultLocale = config.defaultLocale;

    this.client = createClient({
      space: config.credentials.spaceId,
      accessToken: config.credentials.accessToken,
      host: config.preview ? 'preview.contentful.com' : 'cdn.contentful.com',
      environment: config.credentials.environment || 'master',
    });
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.client.getSpace();
      return {
        healthy: true,
        latencyMs: Date.now() - start,
        message: 'Connected to Contentful',
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
      const entry = await this.client.getEntry(id, {
        locale: locale || this.defaultLocale || '*',
      });
      return this.transformEntry(entry);
    } catch (error) {
      if ((error as { sys?: { id?: string } })?.sys?.id === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  async listContent(filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const query: Record<string, unknown> = {
      limit: filter?.limit || 10,
      skip: filter?.skip || 0,
      locale: filter?.locale || this.defaultLocale || '*',
    };

    if (filter?.type) {
      query.content_type = filter.type;
    }

    if (filter?.orderBy) {
      query.order = filter.orderDirection === 'desc' ? `-fields.${filter.orderBy}` : `fields.${filter.orderBy}`;
    }

    const response = await this.client.getEntries(query);

    return {
      items: response.items.map(entry => this.transformEntry(entry)),
      total: response.total,
      skip: response.skip,
      limit: response.limit,
      hasMore: response.skip + response.items.length < response.total,
    };
  }

  async searchContent(query: string, filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const searchQuery: Record<string, unknown> = {
      query,
      limit: filter?.limit || 10,
      skip: filter?.skip || 0,
      locale: filter?.locale || this.defaultLocale || '*',
    };

    if (filter?.type) {
      searchQuery.content_type = filter.type;
    }

    const response = await this.client.getEntries(searchQuery);

    return {
      items: response.items.map(entry => this.transformEntry(entry)),
      total: response.total,
      skip: response.skip,
      limit: response.limit,
      hasMore: response.skip + response.items.length < response.total,
    };
  }

  async createContent(_input: ContentCreateInput): Promise<Content> {
    throw new Error('Create requires Contentful Management API. Configure management token for write operations.');
  }

  async updateContent(_id: string, _input: ContentUpdateInput): Promise<Content> {
    throw new Error('Update requires Contentful Management API. Configure management token for write operations.');
  }

  async getMedia(id: string): Promise<Media | null> {
    try {
      const asset = await this.client.getAsset(id);
      return this.transformAsset(asset);
    } catch (error) {
      if ((error as { sys?: { id?: string } })?.sys?.id === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  async listMedia(filter?: { limit?: number; skip?: number }): Promise<PaginatedResponse<Media>> {
    const response = await this.client.getAssets({
      limit: filter?.limit || 10,
      skip: filter?.skip || 0,
    });

    return {
      items: response.items.map(asset => this.transformAsset(asset)),
      total: response.total,
      skip: response.skip,
      limit: response.limit,
      hasMore: response.skip + response.items.length < response.total,
    };
  }

  async getContentTypes(): Promise<ContentType[]> {
    const response = await this.client.getContentTypes();
    return response.items.map(ct => this.transformContentType(ct));
  }

  async getContentType(id: string): Promise<ContentType | null> {
    try {
      const ct = await this.client.getContentType(id);
      return this.transformContentType(ct);
    } catch (error) {
      if ((error as { sys?: { id?: string } })?.sys?.id === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  async dispose(): Promise<void> {
    // Contentful client doesn't require cleanup
  }

  // ============== Transform Helpers ==============

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transformEntry(entry: Entry<any>): Content {
    const sys = entry.sys as any;
    const fields = entry.fields as Record<string, unknown>;

    // Try to find a title field
    const titleField = fields.title || fields.name || fields.headline || Object.values(fields)[0];
    const title = typeof titleField === 'string' ? titleField : String(titleField || 'Untitled');

    // Try to find a slug field
    const slugField = fields.slug || fields.url;
    const slug = typeof slugField === 'string' ? slugField : undefined;

    return {
      id: sys.id,
      type: sys.contentType?.sys?.id || 'unknown',
      title,
      slug,
      status: sys.publishedAt ? 'published' : 'draft',
      createdAt: sys.createdAt,
      updatedAt: sys.updatedAt,
      publishedAt: sys.publishedAt || undefined,
      locale: sys.locale,
      fields,
      _raw: entry,
    };
  }

  private transformAsset(asset: Asset<undefined, string>): Media {
    const file = asset.fields.file as any;
    const details = file?.details as { size?: number; image?: { width: number; height: number } } | undefined;

    return {
      id: asset.sys.id,
      filename: String(file?.fileName || 'unknown'),
      mimeType: String(file?.contentType || 'application/octet-stream'),
      size: details?.size || 0,
      url: file?.url ? `https:${file.url}` : '',
      alt: asset.fields.description as string | undefined,
      title: asset.fields.title as string | undefined,
      width: details?.image?.width,
      height: details?.image?.height,
      createdAt: asset.sys.createdAt,
      metadata: {
        locale: asset.sys.locale,
      },
    };
  }

  private transformContentType(ct: CFContentType): ContentType {
    return {
      id: ct.sys.id,
      name: ct.name,
      description: ct.description,
      fields: ct.fields.map(field => this.transformField(field)),
    };
  }

  private transformField(field: CFContentType['fields'][0]): FieldDefinition {
    return {
      id: field.id,
      name: field.name,
      type: this.mapFieldType(field.type),
      required: field.required,
      localized: field.localized,
      validations: field.validations,
    };
  }

  private mapFieldType(cfType: string): FieldType {
    const typeMap: Record<string, FieldType> = {
      Symbol: 'text',
      Text: 'richtext',
      Integer: 'number',
      Number: 'number',
      Boolean: 'boolean',
      Date: 'datetime',
      Link: 'reference',
      Array: 'array',
      Object: 'object',
      RichText: 'richtext',
      Location: 'object',
    };
    return typeMap[cfType] || 'unknown';
  }
}
