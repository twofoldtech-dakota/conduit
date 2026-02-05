/**
 * Sitecore XM Cloud Adapter
 *
 * Implements ICMSAdapter for Sitecore XM Cloud via Experience Edge GraphQL API.
 * Supports both cloud Experience Edge and local CM Edge endpoints.
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

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface SitecoreItem {
  id: string;
  name: string;
  path: string;
  url?: { path: string };
  template: { id: string; name: string };
  created?: string;
  updated?: string;
  language?: { name: string };
  fields?: Array<{
    name: string;
    value?: string;
    jsonValue?: unknown;
  }>;
  children?: { results: SitecoreItem[] };
}

interface SitecoreSearchResults {
  search: {
    total: number;
    pageInfo: { endCursor: string; hasNext: boolean };
    results: SitecoreItem[];
  };
}

interface SitecoreItemResult {
  item: SitecoreItem | null;
}

interface SitecoreMediaItem {
  id: string;
  name: string;
  path: string;
  url: string;
  size?: number;
  mimeType?: string;
  dimensions?: { width: number; height: number };
  created?: string;
}

export class SitecoreAdapter extends BaseAdapter {
  readonly name = 'sitecore';
  readonly displayName = 'Sitecore XM Cloud';
  readonly capabilities: AdapterCapabilities = {
    search: true,
    media: true,
    create: false, // Experience Edge is read-only
    update: false,
    delete: false,
    preview: true,
    versioning: true,
    localization: true,
    webhooks: true,
  };

  private endpoint!: string;
  private apiKey!: string;
  private defaultLanguage: string = 'en';
  private siteName?: string;
  private isLocalEndpoint: boolean = false;

  async initialize(config: AdapterConfig): Promise<void> {
    this.apiKey = config.credentials.apiKey;
    this.defaultLanguage = config.defaultLocale || 'en';
    this.siteName = config.credentials.siteName;

    // Experience Edge endpoint
    this.endpoint = config.credentials.endpoint ||
      'https://edge.sitecorecloud.io/api/graphql/v1';

    // Detect local CM endpoint (different schema from cloud Edge)
    this.isLocalEndpoint = this.endpoint.includes('localhost') ||
      this.endpoint.includes('.local');
  }

  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sc_apikey': this.apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Sitecore API error: ${response.status}`);
    }

    const result = await response.json() as GraphQLResponse<T>;

    if (result.errors?.length) {
      throw new Error(`GraphQL error: ${result.errors[0].message}`);
    }

    return result.data as T;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.graphql<{ site: { siteInfoCollection: Array<{ name: string }> } }>(`
        query {
          site {
            siteInfoCollection {
              name
            }
          }
        }
      `);
      return {
        healthy: true,
        latencyMs: Date.now() - start,
        message: `Connected to Sitecore ${this.isLocalEndpoint ? 'local CM' : 'Experience Edge'}`,
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
    const language = locale || this.defaultLanguage;

    const data = await this.graphql<SitecoreItemResult>(`
      query GetItem($path: String!, $language: String!) {
        item(path: $path, language: $language) {
          id
          name
          path
          url { path }
          template { id name }
          fields {
            name
            value
            jsonValue
          }
        }
      }
    `, { path: id, language });

    return data.item ? this.transformItem(data.item) : null;
  }

  private async resolvePathToId(path: string): Promise<string | null> {
    const data = await this.graphql<SitecoreItemResult>(`
      query ResolvePath($path: String!, $language: String!) {
        item(path: $path, language: $language) {
          id
        }
      }
    `, { path, language: this.defaultLanguage });
    return data.item?.id || null;
  }

  async listContent(filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const first = filter?.limit || 10;
    const after = filter?.skip ? String(filter.skip) : undefined;

    // Build search query based on filters
    let rootPath = '/sitecore/content';
    if (this.siteName) {
      rootPath = `/sitecore/content/${this.siteName}`;
    }

    // Local CM Edge requires GUID for _path, resolve it first
    const rootId = await this.resolvePathToId(rootPath);
    if (!rootId) {
      return { items: [], total: 0, skip: 0, limit: first, hasMore: false };
    }

    const whereConditions: string[] = [
      `{ name: "_path", value: "${rootId}", operator: CONTAINS }`
    ];

    if (filter?.type) {
      whereConditions.push(`{ name: "_templates", value: "${filter.type}" }`);
    }

    const whereClause = whereConditions.length > 1
      ? `{ AND: [${whereConditions.join(', ')}] }`
      : whereConditions[0];

    const data = await this.graphql<SitecoreSearchResults>(`
      query SearchContent($first: Int!, $after: String) {
        search(
          where: ${whereClause}
          first: $first
          after: $after
        ) {
          total
          pageInfo {
            endCursor
            hasNext
          }
          results {
            id
            name
            path
            url { path }
            template { id name }
            fields {
              name
              value
              jsonValue
            }
          }
        }
      }
    `, { first, after });

    return {
      items: data.search.results.map(item => this.transformItem(item)),
      total: data.search.total,
      skip: filter?.skip || 0,
      limit: first,
      hasMore: data.search.pageInfo.hasNext,
    };
  }

  async searchContent(query: string, filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const first = filter?.limit || 10;

    // Local CM Edge supports _name, _path, _templates, _hasLayout, _language
    // Cloud Experience Edge supports _fulltext
    const searchField = this.isLocalEndpoint ? '_name' : '_fulltext';

    const data = await this.graphql<SitecoreSearchResults>(`
      query SearchContent($query: String!, $first: Int!) {
        search(
          where: {
            name: "${searchField}"
            value: $query
            operator: CONTAINS
          }
          first: $first
        ) {
          total
          pageInfo {
            endCursor
            hasNext
          }
          results {
            id
            name
            path
            url { path }
            template { id name }
            fields {
              name
              value
              jsonValue
            }
          }
        }
      }
    `, { query, first });

    return {
      items: data.search.results.map(item => this.transformItem(item)),
      total: data.search.total,
      skip: filter?.skip || 0,
      limit: first,
      hasMore: data.search.pageInfo.hasNext,
    };
  }

  async createContent(_input: ContentCreateInput): Promise<Content> {
    throw new Error('Sitecore Experience Edge is read-only. Use Sitecore Management API for write operations.');
  }

  async updateContent(_id: string, _input: ContentUpdateInput): Promise<Content> {
    throw new Error('Sitecore Experience Edge is read-only. Use Sitecore Management API for write operations.');
  }

  async deleteContent(_id: string): Promise<void> {
    throw new Error('Sitecore Experience Edge is read-only. Use Sitecore Management API for write operations.');
  }

  async getMedia(id: string, locale?: string): Promise<Media | null> {
    const language = locale || this.defaultLanguage;

    const data = await this.graphql<{ item: SitecoreMediaItem | null }>(`
      query GetMedia($path: String!, $language: String!) {
        item(path: $path, language: $language) {
          id
          name
          path
          url { path }
          fields {
            name
            value
          }
        }
      }
    `, { path: id, language });

    if (!data.item) return null;
    return this.transformMedia(data.item as unknown as SitecoreMediaItem);
  }

  async listMedia(filter?: { limit?: number; skip?: number }): Promise<PaginatedResponse<Media>> {
    const first = filter?.limit || 10;

    const mediaId = await this.resolvePathToId('/sitecore/media library');
    if (!mediaId) {
      return { items: [], total: 0, skip: 0, limit: first, hasMore: false };
    }

    const data = await this.graphql<SitecoreSearchResults>(`
      query ListMedia($first: Int!) {
        search(
          where: {
            name: "_path"
            value: "${mediaId}"
            operator: CONTAINS
          }
          first: $first
        ) {
          total
          pageInfo { hasNext }
          results {
            id
            name
            path
            url { path }
          }
        }
      }
    `, { first });

    return {
      items: data.search.results.map(item => this.transformMedia(item as unknown as SitecoreMediaItem)),
      total: data.search.total,
      skip: filter?.skip || 0,
      limit: first,
      hasMore: data.search.pageInfo.hasNext,
    };
  }

  async getContentTypes(): Promise<ContentType[]> {
    const templatesId = await this.resolvePathToId('/sitecore/templates');
    if (!templatesId) return [];

    const data = await this.graphql<SitecoreSearchResults>(`
      query GetTemplates {
        search(
          where: {
            name: "_path"
            value: "${templatesId}"
            operator: CONTAINS
          }
          first: 100
        ) {
          results {
            id
            name
            path
            fields {
              name
              value
            }
          }
        }
      }
    `);

    return data.search.results
      .filter(item => !item.path.includes('__Standard Values'))
      .map(item => ({
        id: item.id,
        name: item.name,
        description: item.path,
        fields: [],
      }));
  }

  async getContentType(id: string): Promise<ContentType | null> {
    const data = await this.graphql<SitecoreItemResult>(`
      query GetTemplate($path: String!, $language: String!) {
        item(path: $path, language: $language) {
          id
          name
          path
          children {
            results {
              name
              fields {
                name
                value
              }
            }
          }
        }
      }
    `, { path: id, language: this.defaultLanguage });

    if (!data.item) return null;

    return {
      id: data.item.id,
      name: data.item.name,
      description: data.item.path,
      fields: data.item.children?.results.map(field => ({
        id: field.name,
        name: field.name,
        type: 'unknown' as const,
        required: false,
      })) || [],
    };
  }

  async dispose(): Promise<void> {
    // No cleanup needed
  }

  // ============== Transform Helpers ==============

  private transformItem(item: SitecoreItem): Content {
    const fields: Record<string, unknown> = {};

    // Extract timestamps from fields if not available as top-level properties
    let createdAt = item.created;
    let updatedAt = item.updated;

    for (const field of item.fields || []) {
      fields[field.name] = field.jsonValue ?? field.value;

      // Extract Sitecore system timestamps from fields (local CM Edge)
      if (!createdAt && field.name === '__Created' && field.jsonValue) {
        const val = (field.jsonValue as { value?: string }).value;
        if (val) createdAt = val;
      }
      if (!updatedAt && field.name === '__Updated' && field.jsonValue) {
        const val = (field.jsonValue as { value?: string }).value;
        if (val) updatedAt = val;
      }
    }

    // Sitecore jsonValue wraps strings as { value: "..." } — unwrap for title
    const unwrap = (val: unknown): string | undefined => {
      if (typeof val === 'string') return val;
      if (val && typeof val === 'object' && 'value' in val) return (val as { value: string }).value;
      return undefined;
    };

    const title = unwrap(fields.Title) ||
                  unwrap(fields.PageTitle) ||
                  unwrap(fields.Headline) ||
                  item.name;

    return {
      id: item.id,
      type: item.template.name,
      title,
      slug: item.url?.path || item.path,
      status: 'published',
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: updatedAt || createdAt || new Date().toISOString(),
      locale: item.language?.name,
      fields,
      _raw: item,
    };
  }

  private transformMedia(item: SitecoreMediaItem): Media {
    return {
      id: item.id,
      filename: item.name,
      mimeType: item.mimeType || 'application/octet-stream',
      size: item.size || 0,
      url: item.url,
      width: item.dimensions?.width,
      height: item.dimensions?.height,
      createdAt: item.created || new Date().toISOString(),
    };
  }
}
