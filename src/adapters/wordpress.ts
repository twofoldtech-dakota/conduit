/**
 * WordPress Adapter
 * 
 * Implements ICMSAdapter for WordPress via REST API.
 * Supports both WordPress.com and self-hosted instances.
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

interface WPPost {
  id: number;
  date: string;
  modified: string;
  slug: string;
  status: 'publish' | 'draft' | 'pending' | 'private' | 'future';
  type: string;
  title: { rendered: string; raw?: string };
  content: { rendered: string; raw?: string };
  excerpt: { rendered: string; raw?: string };
  author: number;
  featured_media: number;
  categories?: number[];
  tags?: number[];
  [key: string]: unknown;
}

interface WPMedia {
  id: number;
  date: string;
  slug: string;
  title: { rendered: string };
  mime_type: string;
  source_url: string;
  media_details?: {
    width?: number;
    height?: number;
    filesize?: number;
    file?: string;
  };
}

interface WPType {
  slug: string;
  name: string;
  description: string;
  rest_base: string;
}

interface WPHeaders {
  'x-wp-total'?: string;
  'x-wp-totalpages'?: string;
}

export class WordPressAdapter extends BaseAdapter {
  readonly name = 'wordpress';
  readonly displayName = 'WordPress';
  readonly capabilities: AdapterCapabilities = {
    search: true,
    media: true,
    create: true,
    update: true,
    delete: true,
    preview: true,
    versioning: true,
    localization: false,
    webhooks: false, // WordPress needs plugins for webhooks
  };

  private baseUrl!: string;
  private headers!: Record<string, string>;
  private postTypes: Map<string, WPType> = new Map();

  async initialize(config: AdapterConfig): Promise<void> {
    this.baseUrl = config.credentials.url.replace(/\/$/, '');
    
    this.headers = {
      'Content-Type': 'application/json',
    };

    // Support both Application Passwords and JWT auth
    if (config.credentials.username && config.credentials.applicationPassword) {
      const credentials = Buffer.from(
        `${config.credentials.username}:${config.credentials.applicationPassword}`
      ).toString('base64');
      this.headers['Authorization'] = `Basic ${credentials}`;
    } else if (config.credentials.token) {
      this.headers['Authorization'] = `Bearer ${config.credentials.token}`;
    }

    // Cache available post types
    await this.loadPostTypes();
  }

  private async loadPostTypes(): Promise<void> {
    try {
      const response = await this.fetch('/wp-json/wp/v2/types');
      const types = await response.json() as Record<string, WPType>;
      
      for (const [key, type] of Object.entries(types)) {
        if (key !== 'attachment') {
          this.postTypes.set(key, type);
        }
      }
    } catch {
      // Default to standard post types if introspection fails
      this.postTypes.set('post', { slug: 'post', name: 'Posts', description: '', rest_base: 'posts' });
      this.postTypes.set('page', { slug: 'page', name: 'Pages', description: '', rest_base: 'pages' });
    }
  }

  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: { ...this.headers, ...options.headers },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WordPress API error: ${response.status} - ${error}`);
    }

    return response;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.fetch('/wp-json/wp/v2');
      return {
        healthy: true,
        latencyMs: Date.now() - start,
        message: 'Connected to WordPress',
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async getContent(id: string): Promise<Content | null> {
    // Try each post type until we find the content
    for (const type of this.postTypes.values()) {
      try {
        const response = await this.fetch(`/wp-json/wp/v2/${type.rest_base}/${id}`);
        const post = await response.json() as WPPost;
        return this.transformPost(post);
      } catch {
        continue;
      }
    }
    return null;
  }

  async listContent(filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const limit = filter?.limit || 10;
    const page = Math.floor((filter?.skip || 0) / limit) + 1;

    // Determine endpoint based on type filter
    const typeSlug = filter?.type || 'post';
    const type = this.postTypes.get(typeSlug);
    const endpoint = type?.rest_base || 'posts';

    const params = new URLSearchParams({
      per_page: String(limit),
      page: String(page),
      _embed: '1', // Include embedded resources
    });

    if (filter?.status) {
      params.set('status', filter.status);
    }

    if (filter?.orderBy) {
      params.set('orderby', filter.orderBy);
      params.set('order', filter.orderDirection || 'asc');
    }

    const response = await this.fetch(`/wp-json/wp/v2/${endpoint}?${params}`);
    const posts = await response.json() as WPPost[];
    const headers = Object.fromEntries(response.headers) as WPHeaders;
    const total = parseInt(headers['x-wp-total'] || '0', 10);

    return {
      items: posts.map(post => this.transformPost(post)),
      total,
      skip: filter?.skip || 0,
      limit,
      hasMore: page < parseInt(headers['x-wp-totalpages'] || '1', 10),
    };
  }

  async searchContent(query: string, filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const limit = filter?.limit || 10;
    const page = Math.floor((filter?.skip || 0) / limit) + 1;

    const typeSlug = filter?.type || 'post';
    const type = this.postTypes.get(typeSlug);
    const endpoint = type?.rest_base || 'posts';

    const params = new URLSearchParams({
      search: query,
      per_page: String(limit),
      page: String(page),
      _embed: '1',
    });

    const response = await this.fetch(`/wp-json/wp/v2/${endpoint}?${params}`);
    const posts = await response.json() as WPPost[];
    const headers = Object.fromEntries(response.headers) as WPHeaders;
    const total = parseInt(headers['x-wp-total'] || '0', 10);

    return {
      items: posts.map(post => this.transformPost(post)),
      total,
      skip: filter?.skip || 0,
      limit,
      hasMore: page < parseInt(headers['x-wp-totalpages'] || '1', 10),
    };
  }

  async createContent(input: ContentCreateInput): Promise<Content> {
    const type = this.postTypes.get(input.type);
    const endpoint = type?.rest_base || 'posts';

    const body: Record<string, unknown> = {
      status: input.status || 'draft',
      ...input.fields,
    };

    // Handle common field mappings
    if (input.fields.title) {
      body.title = input.fields.title;
    }
    if (input.fields.content) {
      body.content = input.fields.content;
    }

    const response = await this.fetch(`/wp-json/wp/v2/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const post = await response.json() as WPPost;
    return this.transformPost(post);
  }

  async updateContent(id: string, input: ContentUpdateInput): Promise<Content> {
    // Find the type for this content
    const content = await this.getContent(id);
    if (!content) {
      throw new Error(`Content not found: ${id}`);
    }

    const type = this.postTypes.get(content.type);
    const endpoint = type?.rest_base || 'posts';

    const body: Record<string, unknown> = {
      ...input.fields,
    };

    if (input.status) {
      body.status = input.status;
    }

    const response = await this.fetch(`/wp-json/wp/v2/${endpoint}/${id}`, {
      method: 'POST', // WordPress uses POST for updates
      body: JSON.stringify(body),
    });

    const post = await response.json() as WPPost;
    return this.transformPost(post);
  }

  async deleteContent(id: string): Promise<void> {
    // Find the type for this content
    const content = await this.getContent(id);
    if (!content) {
      throw new Error(`Content not found: ${id}`);
    }

    const type = this.postTypes.get(content.type);
    const endpoint = type?.rest_base || 'posts';

    await this.fetch(`/wp-json/wp/v2/${endpoint}/${id}`, {
      method: 'DELETE',
    });
  }

  async getMedia(id: string): Promise<Media | null> {
    try {
      const response = await this.fetch(`/wp-json/wp/v2/media/${id}`);
      const media = await response.json() as WPMedia;
      return this.transformMedia(media);
    } catch {
      return null;
    }
  }

  async listMedia(filter?: { limit?: number; skip?: number }): Promise<PaginatedResponse<Media>> {
    const limit = filter?.limit || 10;
    const page = Math.floor((filter?.skip || 0) / limit) + 1;

    const params = new URLSearchParams({
      per_page: String(limit),
      page: String(page),
    });

    const response = await this.fetch(`/wp-json/wp/v2/media?${params}`);
    const items = await response.json() as WPMedia[];
    const headers = Object.fromEntries(response.headers) as WPHeaders;
    const total = parseInt(headers['x-wp-total'] || '0', 10);

    return {
      items: items.map(item => this.transformMedia(item)),
      total,
      skip: filter?.skip || 0,
      limit,
      hasMore: page < parseInt(headers['x-wp-totalpages'] || '1', 10),
    };
  }

  async getContentTypes(): Promise<ContentType[]> {
    return Array.from(this.postTypes.values()).map(type => ({
      id: type.slug,
      name: type.name,
      description: type.description,
      fields: this.getDefaultFieldsForType(type.slug),
    }));
  }

  async getContentType(id: string): Promise<ContentType | null> {
    const type = this.postTypes.get(id);
    if (!type) return null;

    return {
      id: type.slug,
      name: type.name,
      description: type.description,
      fields: this.getDefaultFieldsForType(type.slug),
    };
  }

  async dispose(): Promise<void> {
    // Nothing to clean up
  }

  // ============== Transform Helpers ==============

  private transformPost(post: WPPost): Content {
    const statusMap: Record<string, Content['status']> = {
      publish: 'published',
      draft: 'draft',
      pending: 'draft',
      private: 'published',
      future: 'scheduled',
    };

    return {
      id: String(post.id),
      type: post.type,
      title: post.title.rendered || post.title.raw || 'Untitled',
      slug: post.slug,
      status: statusMap[post.status] || 'draft',
      createdAt: post.date,
      updatedAt: post.modified,
      fields: {
        content: post.content.rendered || post.content.raw,
        excerpt: post.excerpt.rendered || post.excerpt.raw,
        author: post.author,
        featuredMedia: post.featured_media,
        categories: post.categories,
        tags: post.tags,
      },
      _raw: post,
    };
  }

  private transformMedia(media: WPMedia): Media {
    return {
      id: String(media.id),
      filename: media.media_details?.file || media.slug,
      mimeType: media.mime_type,
      size: media.media_details?.filesize || 0,
      url: media.source_url,
      width: media.media_details?.width,
      height: media.media_details?.height,
      createdAt: media.date,
    };
  }

  private getDefaultFieldsForType(type: string): ContentType['fields'] {
    const commonFields = [
      { id: 'title', name: 'Title', type: 'string' as const, required: true },
      { id: 'content', name: 'Content', type: 'rich-text' as const, required: false },
      { id: 'excerpt', name: 'Excerpt', type: 'string' as const, required: false },
      { id: 'slug', name: 'Slug', type: 'string' as const, required: false },
      { id: 'status', name: 'Status', type: 'string' as const, required: false },
    ];

    if (type === 'post') {
      return [
        ...commonFields,
        { id: 'categories', name: 'Categories', type: 'array' as const, required: false },
        { id: 'tags', name: 'Tags', type: 'array' as const, required: false },
      ];
    }

    return commonFields;
  }
}
