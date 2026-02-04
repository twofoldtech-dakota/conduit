/**
 * Sanity CMS Adapter
 * 
 * Implements ICMSAdapter for Sanity headless CMS.
 * Uses GROQ for queries and supports real-time updates.
 */

import { createClient, type SanityClient } from '@sanity/client';
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

interface SanityDocument {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
  _rev: string;
  [key: string]: unknown;
}

interface SanityAsset {
  _id: string;
  _type: 'sanity.imageAsset' | 'sanity.fileAsset';
  _createdAt: string;
  url: string;
  originalFilename?: string;
  mimeType?: string;
  size?: number;
  metadata?: {
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

export class SanityAdapter extends BaseAdapter {
  readonly name = 'sanity';
  readonly displayName = 'Sanity';
  readonly capabilities: AdapterCapabilities = {
    search: true,
    media: true,
    create: true,
    update: true,
    delete: true,
    preview: true,
    versioning: true,
    localization: false, // Sanity handles this differently
    webhooks: true,
  };

  private client!: SanityClient;
  private projectId!: string;
  private dataset!: string;

  async initialize(config: AdapterConfig): Promise<void> {
    this.projectId = config.credentials.projectId;
    this.dataset = config.credentials.dataset || 'production';

    this.client = createClient({
      projectId: this.projectId,
      dataset: this.dataset,
      apiVersion: config.credentials.apiVersion || '2024-01-01',
      token: config.credentials.token,
      useCdn: !config.preview,
    });
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.client.fetch('*[0]');
      return {
        healthy: true,
        latencyMs: Date.now() - start,
        message: 'Connected to Sanity',
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
    const doc = await this.client.fetch<SanityDocument | null>(
      `*[_id == $id][0]`,
      { id }
    );
    return doc ? this.transformDocument(doc) : null;
  }

  async listContent(filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const limit = filter?.limit || 10;
    const skip = filter?.skip || 0;

    let groqFilter = '*[!(_id in path("_.**"))]'; // Exclude system documents
    
    if (filter?.type) {
      groqFilter = `*[_type == "${filter.type}"]`;
    }

    // Build order clause
    let orderClause = '';
    if (filter?.orderBy) {
      orderClause = ` | order(${filter.orderBy} ${filter.orderDirection || 'asc'})`;
    } else {
      orderClause = ' | order(_createdAt desc)';
    }

    // Query for items and total
    const query = `{
      "items": ${groqFilter}${orderClause}[${skip}...${skip + limit}],
      "total": count(${groqFilter})
    }`;

    const result = await this.client.fetch<{ items: SanityDocument[]; total: number }>(query);

    return {
      items: result.items.map(doc => this.transformDocument(doc)),
      total: result.total,
      skip,
      limit,
      hasMore: skip + result.items.length < result.total,
    };
  }

  async searchContent(query: string, filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const limit = filter?.limit || 10;
    const skip = filter?.skip || 0;

    let groqFilter = `*[!(_id in path("_.**"))]`;
    if (filter?.type) {
      groqFilter = `*[_type == "${filter.type}"]`;
    }

    // Sanity full-text search using score()
    const searchQuery = `{
      "items": ${groqFilter}[
        title match "*${query}*" ||
        _type match "*${query}*" ||
        pt::text(body) match "*${query}*"
      ] | order(_createdAt desc)[${skip}...${skip + limit}],
      "total": count(${groqFilter}[
        title match "*${query}*" ||
        _type match "*${query}*"
      ])
    }`;

    const result = await this.client.fetch<{ items: SanityDocument[]; total: number }>(searchQuery);

    return {
      items: result.items.map(doc => this.transformDocument(doc)),
      total: result.total,
      skip,
      limit,
      hasMore: skip + result.items.length < result.total,
    };
  }

  async createContent(input: ContentCreateInput): Promise<Content> {
    const doc = await this.client.create({
      _type: input.type,
      ...input.fields,
    });
    return this.transformDocument(doc as SanityDocument);
  }

  async updateContent(id: string, input: ContentUpdateInput): Promise<Content> {
    const doc = await this.client
      .patch(id)
      .set(input.fields)
      .commit();
    return this.transformDocument(doc as SanityDocument);
  }

  async deleteContent(id: string): Promise<void> {
    await this.client.delete(id);
  }

  async getMedia(id: string): Promise<Media | null> {
    const asset = await this.client.fetch<SanityAsset | null>(
      `*[_id == $id && (_type == "sanity.imageAsset" || _type == "sanity.fileAsset")][0]`,
      { id }
    );
    return asset ? this.transformAsset(asset) : null;
  }

  async listMedia(filter?: { limit?: number; skip?: number }): Promise<PaginatedResponse<Media>> {
    const limit = filter?.limit || 10;
    const skip = filter?.skip || 0;

    const query = `{
      "items": *[_type == "sanity.imageAsset" || _type == "sanity.fileAsset"] | order(_createdAt desc)[${skip}...${skip + limit}],
      "total": count(*[_type == "sanity.imageAsset" || _type == "sanity.fileAsset"])
    }`;

    const result = await this.client.fetch<{ items: SanityAsset[]; total: number }>(query);

    return {
      items: result.items.map(asset => this.transformAsset(asset)),
      total: result.total,
      skip,
      limit,
      hasMore: skip + result.items.length < result.total,
    };
  }

  async getContentTypes(): Promise<ContentType[]> {
    // Sanity doesn't have a direct API for schema introspection
    // We can infer types from existing documents
    const types = await this.client.fetch<string[]>(
      `array::unique(*[!(_id in path("_.**"))]._type)`
    );

    return types.map(type => ({
      id: type,
      name: type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1'),
      description: `Content type: ${type}`,
      fields: [], // Would need schema introspection for full field definitions
    }));
  }

  async getContentType(id: string): Promise<ContentType | null> {
    // Check if any documents of this type exist
    const count = await this.client.fetch<number>(
      `count(*[_type == $type])`,
      { type: id }
    );

    if (count === 0) return null;

    // Get a sample document to infer fields
    const sample = await this.client.fetch<SanityDocument | null>(
      `*[_type == $type][0]`,
      { type: id }
    );

    const fields = sample
      ? Object.keys(sample)
          .filter(key => !key.startsWith('_'))
          .map(key => ({
            id: key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            type: 'unknown' as const,
            required: false,
          }))
      : [];

    return {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1).replace(/([A-Z])/g, ' $1'),
      description: `Content type: ${id}`,
      fields,
    };
  }

  async dispose(): Promise<void> {
    // Sanity client doesn't require cleanup
  }

  // ============== Transform Helpers ==============

  private transformDocument(doc: SanityDocument): Content {
    const { _id, _type, _createdAt, _updatedAt, _rev, ...fields } = doc;

    // Try to find title
    const title = (fields.title as string) || 
                  (fields.name as string) || 
                  _type;

    // Try to find slug
    const slugField = fields.slug as { current?: string } | string | undefined;
    const slug = typeof slugField === 'object' ? slugField?.current : slugField;

    return {
      id: _id,
      type: _type,
      title: String(title),
      slug,
      status: 'published', // Sanity documents are published when accessible via API
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      fields,
      _raw: doc,
    };
  }

  private transformAsset(asset: SanityAsset): Media {
    return {
      id: asset._id,
      filename: asset.originalFilename || 'unknown',
      mimeType: asset.mimeType || 'application/octet-stream',
      size: asset.size || 0,
      url: asset.url,
      width: asset.metadata?.dimensions?.width,
      height: asset.metadata?.dimensions?.height,
      createdAt: asset._createdAt,
    };
  }
}
