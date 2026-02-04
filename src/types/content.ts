/**
 * Core content types used across all CMS adapters.
 * These provide a unified interface regardless of the underlying CMS.
 */

export interface Content {
  /** Unique identifier within the CMS */
  id: string;
  /** Content type/model name */
  type: string;
  /** Human-readable title or name */
  title: string;
  /** URL-friendly identifier */
  slug?: string;
  /** Publication status */
  status: ContentStatus;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last update timestamp */
  updatedAt: string;
  /** ISO 8601 publication timestamp (if published) */
  publishedAt?: string;
  /** Author information */
  author?: Author;
  /** Locale/language code */
  locale?: string;
  /** The actual content fields (CMS-specific structure) */
  fields: Record<string, unknown>;
  /** Raw response from CMS (for debugging/advanced use) */
  _raw?: unknown;
}

export type ContentStatus = 'draft' | 'published' | 'archived' | 'changed' | 'scheduled';

export interface Author {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface Media {
  /** Unique identifier */
  id: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Public URL to access the media */
  url: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Title/caption */
  title?: string;
  /** Width in pixels (for images/video) */
  width?: number;
  /** Height in pixels (for images/video) */
  height?: number;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface ContentType {
  /** Content type identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of this content type */
  description?: string;
  /** Field definitions */
  fields: FieldDefinition[];
}

export interface FieldDefinition {
  /** Field identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Field type */
  type: FieldType;
  /** Whether this field is required */
  required: boolean;
  /** Whether this field can be localized */
  localized?: boolean;
  /** Validation rules */
  validations?: unknown[];
}

export type FieldType =
  | 'string'
  | 'text'
  | 'rich-text'
  | 'richtext'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'media'
  | 'reference'
  | 'array'
  | 'object'
  | 'json'
  | 'link'
  | 'symbol'
  | 'unknown';

export interface ContentFilter {
  /** Filter by content type */
  type?: string;
  /** Filter by status */
  status?: ContentStatus;
  /** Filter by locale */
  locale?: string;
  /** Filter by author ID */
  authorId?: string;
  /** Created after this date */
  createdAfter?: string;
  /** Created before this date */
  createdBefore?: string;
  /** Updated after this date */
  updatedAfter?: string;
  /** Pagination: number of items to return */
  limit?: number;
  /** Pagination: number of items to skip */
  skip?: number;
  /** Sort field */
  orderBy?: string;
  /** Sort direction */
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
}

export interface ContentCreateInput {
  /** Content type to create */
  type: string;
  /** Field values */
  fields: Record<string, unknown>;
  /** Locale for the content */
  locale?: string;
  /** Initial status */
  status?: ContentStatus;
  /** Whether to publish immediately (default: false = draft) */
  publish?: boolean;
}

export interface ContentUpdateInput {
  /** Field values to update (partial update) */
  fields: Record<string, unknown>;
  /** Locale for the update */
  locale?: string;
  /** New status */
  status?: ContentStatus;
  /** Whether to publish after update */
  publish?: boolean;
}
