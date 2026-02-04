/**
 * Sitecore XP Adapter
 * 
 * Implements ICMSAdapter for Sitecore XP (Experience Platform) via Item Web API
 * and Sitecore Services Client (SSC).
 * 
 * Supports Sitecore XP 9.x and 10.x on-premise/hybrid deployments.
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

interface SitecoreXPItem {
  ItemID: string;
  ItemName: string;
  ItemPath: string;
  TemplateName: string;
  TemplateID: string;
  ItemLanguage: string;
  ItemVersion: string;
  ItemCreated: string;
  ItemUpdated: string;
  ItemFields?: SitecoreXPField[];
  ItemUrl?: string;
  HasChildren?: boolean;
}

interface SitecoreXPField {
  Name: string;
  Value: string;
  Type?: string;
}

interface SitecoreXPSearchResult {
  TotalCount: number;
  ResultItems: SitecoreXPItem[];
}

interface SSCAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// Layout/Rendering types
export interface RenderingDefinition {
  uid: string;
  renderingId: string;
  renderingName?: string;
  placeholder: string;
  dataSource?: string;
  parameters?: Record<string, string>;
  cacheable?: boolean;
}

export interface LayoutData {
  devices: DeviceLayout[];
}

interface DeviceLayout {
  id: string;
  name: string;
  renderings: RenderingDefinition[];
}

export interface AddRenderingInput {
  /** Page item ID */
  pageId: string;
  /** Rendering item ID (the component template) */
  renderingId: string;
  /** Placeholder key (e.g., "main", "header", "content") */
  placeholder: string;
  /** Optional data source item ID */
  dataSource?: string;
  /** Rendering parameters */
  parameters?: Record<string, string>;
  /** Position in placeholder (default: end) */
  position?: number;
  /** Device ID (default: default device) */
  deviceId?: string;
  /** Language */
  language?: string;
}

export class SitecoreXPAdapter extends BaseAdapter {
  readonly name = 'sitecore-xp';
  readonly displayName = 'Sitecore XP';
  readonly capabilities: AdapterCapabilities = {
    search: true,
    media: true,
    create: true,  // SSC supports write operations
    update: true,
    delete: true,
    preview: true,
    versioning: true,
    localization: true,
    webhooks: false, // XP doesn't have built-in webhooks
  };

  private baseUrl!: string;
  private accessToken?: string;
  private tokenExpiry?: number;
  private username!: string;
  private password!: string;
  private domain: string = 'sitecore';
  private defaultLanguage: string = 'en';
  private database: string = 'web';

  async initialize(config: AdapterConfig): Promise<void> {
    this.baseUrl = config.credentials.url.replace(/\/$/, '');
    this.username = config.credentials.username;
    this.password = config.credentials.password;
    this.domain = config.credentials.domain || 'sitecore';
    this.defaultLanguage = config.defaultLocale || 'en';
    this.database = config.preview ? 'master' : 'web';

    // Authenticate via SSC
    await this.authenticate();
  }

  private async authenticate(): Promise<void> {
    const authUrl = `${this.baseUrl}/sitecore/api/ssc/auth/login`;
    
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: this.domain,
        username: this.username,
        password: this.password,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sitecore XP authentication failed: ${response.status}`);
    }

    // SSC returns token in cookie or response
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      const match = cookies.match(/\.ASPXAUTH=([^;]+)/);
      if (match) {
        this.accessToken = match[1];
        this.tokenExpiry = Date.now() + 3600000; // 1 hour default
        return;
      }
    }

    // Try JSON response for newer SSC versions
    const data = await response.json() as SSCAuthResponse;
    if (data.access_token) {
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
    }
  }

  private async ensureAuth(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry - 60000) {
      await this.authenticate();
    }
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    await this.ensureAuth();

    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `.ASPXAUTH=${this.accessToken}`,
        ...(this.accessToken && !this.accessToken.includes('=') 
          ? { 'Authorization': `Bearer ${this.accessToken}` } 
          : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sitecore XP API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.fetch<{ IsAuthenticated: boolean }>(
        '/sitecore/api/ssc/auth/whoami'
      );
      return {
        healthy: true,
        latencyMs: Date.now() - start,
        message: 'Connected to Sitecore XP',
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
      
      // Try Item Web API
      const item = await this.fetch<SitecoreXPItem>(
        `/sitecore/api/ssc/item/${id}?database=${this.database}&language=${language}&fields=*`
      );

      return this.transformItem(item);
    } catch {
      return null;
    }
  }

  async listContent(filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const language = filter?.locale || this.defaultLanguage;
    const pageSize = filter?.limit || 10;
    const page = Math.floor((filter?.skip || 0) / pageSize) + 1;

    // Use Sitecore search API
    let searchQuery = `+_database:${this.database} +_language:${language}`;
    
    if (filter?.type) {
      searchQuery += ` +_templatename:${filter.type}`;
    }

    // Exclude system items
    searchQuery += ' -_path:/sitecore/system* -_path:/sitecore/templates*';

    const params = new URLSearchParams({
      query: searchQuery,
      pageSize: String(pageSize),
      page: String(page),
    });

    const result = await this.fetch<SitecoreXPSearchResult>(
      `/sitecore/api/ssc/item/search?${params}`
    );

    return {
      items: result.ResultItems.map(item => this.transformItem(item)),
      total: result.TotalCount,
      skip: filter?.skip || 0,
      limit: pageSize,
      hasMore: (filter?.skip || 0) + result.ResultItems.length < result.TotalCount,
    };
  }

  async searchContent(query: string, filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    const language = filter?.locale || this.defaultLanguage;
    const pageSize = filter?.limit || 10;
    const page = Math.floor((filter?.skip || 0) / pageSize) + 1;

    // Sitecore search with free text
    let searchQuery = `+_database:${this.database} +_language:${language} +_content:*${query}*`;
    
    if (filter?.type) {
      searchQuery += ` +_templatename:${filter.type}`;
    }

    const params = new URLSearchParams({
      query: searchQuery,
      pageSize: String(pageSize),
      page: String(page),
    });

    const result = await this.fetch<SitecoreXPSearchResult>(
      `/sitecore/api/ssc/item/search?${params}`
    );

    return {
      items: result.ResultItems.map(item => this.transformItem(item)),
      total: result.TotalCount,
      skip: filter?.skip || 0,
      limit: pageSize,
      hasMore: (filter?.skip || 0) + result.ResultItems.length < result.TotalCount,
    };
  }

  async createContent(input: ContentCreateInput): Promise<Content> {
    const language = input.locale || this.defaultLanguage;

    // Find parent path (default to content root)
    const parentPath = (input.fields._parentPath as string) || '/sitecore/content';
    delete input.fields._parentPath;

    // Get parent item ID
    const parent = await this.fetch<SitecoreXPItem>(
      `/sitecore/api/ssc/item?path=${encodeURIComponent(parentPath)}&database=master`
    );

    // Create item
    const item = await this.fetch<SitecoreXPItem>(
      `/sitecore/api/ssc/item/${parent.ItemID}?database=master&language=${language}`,
      {
        method: 'POST',
        body: JSON.stringify({
          ItemName: input.fields.name || input.fields.title || 'New Item',
          TemplateID: input.type,
          ...this.transformFieldsForWrite(input.fields),
        }),
      }
    );

    // Publish if requested
    if (input.publish) {
      await this.publishItem(item.ItemID);
    }

    return this.transformItem(item);
  }

  async updateContent(id: string, input: ContentUpdateInput): Promise<Content> {
    const language = input.locale || this.defaultLanguage;

    const item = await this.fetch<SitecoreXPItem>(
      `/sitecore/api/ssc/item/${id}?database=master&language=${language}`,
      {
        method: 'PATCH',
        body: JSON.stringify(this.transformFieldsForWrite(input.fields)),
      }
    );

    if (input.publish) {
      await this.publishItem(id);
    }

    return this.transformItem(item);
  }

  async deleteContent(id: string): Promise<void> {
    await this.fetch<void>(
      `/sitecore/api/ssc/item/${id}?database=master`,
      { method: 'DELETE' }
    );
  }

  private async publishItem(itemId: string): Promise<void> {
    // Trigger publish via SSC
    await this.fetch<void>(
      `/sitecore/api/ssc/publishing/publish`,
      {
        method: 'POST',
        body: JSON.stringify({
          ItemId: itemId,
          PublishMode: 'Smart',
          SourceDatabase: 'master',
          TargetDatabases: ['web'],
          Languages: [this.defaultLanguage],
          Deep: false,
        }),
      }
    );
  }

  async getMedia(id: string): Promise<Media | null> {
    try {
      const item = await this.fetch<SitecoreXPItem>(
        `/sitecore/api/ssc/item/${id}?database=${this.database}&fields=*`
      );

      // Check if it's a media item
      if (!item.ItemPath.startsWith('/sitecore/media library')) {
        return null;
      }

      return this.transformMediaItem(item);
    } catch {
      return null;
    }
  }

  async listMedia(filter?: { limit?: number; skip?: number }): Promise<PaginatedResponse<Media>> {
    const pageSize = filter?.limit || 10;
    const page = Math.floor((filter?.skip || 0) / pageSize) + 1;

    const params = new URLSearchParams({
      query: `+_database:${this.database} +_path:/sitecore/media library*`,
      pageSize: String(pageSize),
      page: String(page),
    });

    const result = await this.fetch<SitecoreXPSearchResult>(
      `/sitecore/api/ssc/item/search?${params}`
    );

    return {
      items: result.ResultItems.map(item => this.transformMediaItem(item)),
      total: result.TotalCount,
      skip: filter?.skip || 0,
      limit: pageSize,
      hasMore: (filter?.skip || 0) + result.ResultItems.length < result.TotalCount,
    };
  }

  async getContentTypes(): Promise<ContentType[]> {
    // Get templates from Sitecore
    const result = await this.fetch<SitecoreXPSearchResult>(
      `/sitecore/api/ssc/item/search?query=+_database:master +_path:/sitecore/templates* +_templatename:Template&pageSize=100`
    );

    return result.ResultItems
      .filter(item => !item.ItemPath.includes('__Standard Values'))
      .map(item => ({
        id: item.ItemID,
        name: item.ItemName,
        description: item.ItemPath,
        fields: [], // Would need additional query for sections/fields
      }));
  }

  async getContentType(id: string): Promise<ContentType | null> {
    try {
      const template = await this.fetch<SitecoreXPItem>(
        `/sitecore/api/ssc/item/${id}?database=master&fields=*`
      );

      // Get template sections and fields
      const sections = await this.fetch<{ Children: SitecoreXPItem[] }>(
        `/sitecore/api/ssc/item/${id}/children?database=master`
      );

      const fields: ContentType['fields'] = [];
      
      for (const section of sections.Children || []) {
        if (section.TemplateName === 'Template section') {
          const sectionFields = await this.fetch<{ Children: SitecoreXPItem[] }>(
            `/sitecore/api/ssc/item/${section.ItemID}/children?database=master`
          );
          
          for (const field of sectionFields.Children || []) {
            if (field.TemplateName === 'Template field') {
              fields.push({
                id: field.ItemID,
                name: field.ItemName,
                type: this.mapFieldType(field.ItemFields?.find(f => f.Name === 'Type')?.Value || ''),
                required: field.ItemFields?.find(f => f.Name === 'Required')?.Value === '1',
              });
            }
          }
        }
      }

      return {
        id: template.ItemID,
        name: template.ItemName,
        description: template.ItemPath,
        fields,
      };
    } catch {
      return null;
    }
  }

  // ============== Layout/Rendering Operations (Premium) ==============

  /**
   * Get the layout/renderings for a page.
   */
  async getPageLayout(pageId: string, language?: string): Promise<LayoutData> {
    const lang = language || this.defaultLanguage;
    
    const item = await this.fetch<SitecoreXPItem>(
      `/sitecore/api/ssc/item/${pageId}?database=${this.database}&language=${lang}&fields=__Renderings,__Final Renderings`
    );

    const finalRenderingsField = item.ItemFields?.find(f => f.Name === '__Final Renderings');
    const renderingsField = item.ItemFields?.find(f => f.Name === '__Renderings');
    const layoutXml = finalRenderingsField?.Value || renderingsField?.Value || '';

    return this.parseLayoutXml(layoutXml);
  }

  /**
   * List all renderings on a page.
   */
  async listRenderings(pageId: string, language?: string): Promise<RenderingDefinition[]> {
    const layout = await this.getPageLayout(pageId, language);
    
    // Flatten renderings from all devices
    const renderings: RenderingDefinition[] = [];
    for (const device of layout.devices) {
      renderings.push(...device.renderings);
    }
    
    return renderings;
  }

  /**
   * Add a rendering to a page placeholder.
   */
  async addRendering(input: AddRenderingInput): Promise<RenderingDefinition> {
    const language = input.language || this.defaultLanguage;
    const deviceId = input.deviceId || '{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}'; // Default device
    
    // Get current layout
    const layout = await this.getPageLayout(input.pageId, language);
    
    // Find or create device
    let device = layout.devices.find(d => d.id === deviceId);
    if (!device) {
      device = { id: deviceId, name: 'Default', renderings: [] };
      layout.devices.push(device);
    }

    // Create new rendering definition
    const newRendering: RenderingDefinition = {
      uid: this.generateGuid(),
      renderingId: input.renderingId,
      placeholder: input.placeholder,
      dataSource: input.dataSource,
      parameters: input.parameters,
    };

    // Insert at position or append
    if (input.position !== undefined && input.position < device.renderings.length) {
      device.renderings.splice(input.position, 0, newRendering);
    } else {
      device.renderings.push(newRendering);
    }

    // Save updated layout
    await this.savePageLayout(input.pageId, layout, language);

    return newRendering;
  }

  /**
   * Remove a rendering from a page by its UID.
   */
  async removeRendering(pageId: string, renderingUid: string, language?: string): Promise<void> {
    const lang = language || this.defaultLanguage;
    const layout = await this.getPageLayout(pageId, lang);

    // Find and remove rendering
    for (const device of layout.devices) {
      const index = device.renderings.findIndex(r => r.uid === renderingUid);
      if (index !== -1) {
        device.renderings.splice(index, 1);
        break;
      }
    }

    await this.savePageLayout(pageId, layout, lang);
  }

  /**
   * Update rendering parameters or data source.
   */
  async updateRendering(
    pageId: string,
    renderingUid: string,
    updates: { dataSource?: string; parameters?: Record<string, string> },
    language?: string
  ): Promise<RenderingDefinition | null> {
    const lang = language || this.defaultLanguage;
    const layout = await this.getPageLayout(pageId, lang);

    // Find rendering
    for (const device of layout.devices) {
      const rendering = device.renderings.find(r => r.uid === renderingUid);
      if (rendering) {
        if (updates.dataSource !== undefined) {
          rendering.dataSource = updates.dataSource;
        }
        if (updates.parameters) {
          rendering.parameters = { ...rendering.parameters, ...updates.parameters };
        }
        
        await this.savePageLayout(pageId, layout, lang);
        return rendering;
      }
    }

    return null;
  }

  /**
   * Move a rendering to a different placeholder or position.
   */
  async moveRendering(
    pageId: string,
    renderingUid: string,
    targetPlaceholder: string,
    position?: number,
    language?: string
  ): Promise<void> {
    const lang = language || this.defaultLanguage;
    const layout = await this.getPageLayout(pageId, lang);

    // Find and remove rendering from current location
    let rendering: RenderingDefinition | null = null;
    for (const device of layout.devices) {
      const index = device.renderings.findIndex(r => r.uid === renderingUid);
      if (index !== -1) {
        rendering = device.renderings.splice(index, 1)[0];
        
        // Update placeholder and re-insert
        rendering.placeholder = targetPlaceholder;
        if (position !== undefined) {
          device.renderings.splice(position, 0, rendering);
        } else {
          device.renderings.push(rendering);
        }
        break;
      }
    }

    if (rendering) {
      await this.savePageLayout(pageId, layout, lang);
    }
  }

  /**
   * Get available renderings (components) that can be added to pages.
   */
  async getAvailableRenderings(): Promise<Array<{ id: string; name: string; path: string }>> {
    const result = await this.fetch<SitecoreXPSearchResult>(
      `/sitecore/api/ssc/item/search?query=+_database:master +_path:/sitecore/layout/renderings* +_templatename:"View rendering" OR _templatename:"Controller rendering"&pageSize=100`
    );

    return result.ResultItems.map(item => ({
      id: item.ItemID,
      name: item.ItemName,
      path: item.ItemPath,
    }));
  }

  /**
   * Create a data source item for a rendering.
   */
  async createDataSource(
    renderingId: string,
    pageId: string,
    fields: Record<string, unknown>,
    language?: string
  ): Promise<Content> {
    const lang = language || this.defaultLanguage;

    // Get rendering to find its data source template and location
    const rendering = await this.fetch<SitecoreXPItem>(
      `/sitecore/api/ssc/item/${renderingId}?database=master&fields=*`
    );

    const dsTemplate = rendering.ItemFields?.find(f => f.Name === 'Datasource Template')?.Value;
    const dsLocation = rendering.ItemFields?.find(f => f.Name === 'Datasource Location')?.Value;

    if (!dsTemplate) {
      throw new Error('Rendering does not have a Datasource Template configured');
    }

    // Determine parent path for data source
    let parentPath = dsLocation || '/sitecore/content';
    
    // If dsLocation is relative, resolve against page
    if (dsLocation?.startsWith('./') || dsLocation?.startsWith('../')) {
      const page = await this.fetch<SitecoreXPItem>(
        `/sitecore/api/ssc/item/${pageId}?database=master`
      );
      parentPath = this.resolvePath(page.ItemPath, dsLocation);
    }

    // Create the data source item
    return this.createContent({
      type: dsTemplate,
      fields: {
        ...fields,
        _parentPath: parentPath,
      },
      locale: lang,
    });
  }

  /**
   * Save layout data back to Sitecore.
   */
  private async savePageLayout(pageId: string, layout: LayoutData, language: string): Promise<void> {
    const layoutXml = this.serializeLayoutXml(layout);

    await this.fetch<SitecoreXPItem>(
      `/sitecore/api/ssc/item/${pageId}?database=master&language=${language}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          '__Final Renderings': layoutXml,
        }),
      }
    );
  }

  /**
   * Parse Sitecore layout XML into structured data.
   */
  private parseLayoutXml(xml: string): LayoutData {
    const devices: DeviceLayout[] = [];
    
    if (!xml) {
      return { devices };
    }

    // Simple XML parsing for Sitecore layout format
    // Format: <r><d id="{device-id}" l="{layout-id}"><r uid="{uid}" id="{rendering-id}" ph="placeholder" ds="datasource" par="params" /></d></r>
    const deviceMatches = xml.matchAll(/<d\s+id="([^"]+)"[^>]*>(.*?)<\/d>/gs);
    
    for (const deviceMatch of deviceMatches) {
      const deviceId = deviceMatch[1];
      const deviceContent = deviceMatch[2];
      const renderings: RenderingDefinition[] = [];

      const renderingMatches = deviceContent.matchAll(
        /<r\s+([^>]+)\/>/g
      );

      for (const renderingMatch of renderingMatches) {
        const attrs = renderingMatch[1];
        
        const uid = this.extractAttr(attrs, 'uid') || this.generateGuid();
        const renderingId = this.extractAttr(attrs, 'id') || '';
        const placeholder = this.extractAttr(attrs, 'ph') || '';
        const dataSource = this.extractAttr(attrs, 'ds');
        const paramsStr = this.extractAttr(attrs, 'par');

        const parameters: Record<string, string> = {};
        if (paramsStr) {
          for (const param of paramsStr.split('&')) {
            const [key, value] = param.split('=');
            if (key) parameters[key] = decodeURIComponent(value || '');
          }
        }

        renderings.push({
          uid,
          renderingId,
          placeholder,
          dataSource,
          parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
        });
      }

      devices.push({
        id: deviceId,
        name: deviceId === '{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}' ? 'Default' : 'Unknown',
        renderings,
      });
    }

    return { devices };
  }

  /**
   * Serialize layout data back to Sitecore XML format.
   */
  private serializeLayoutXml(layout: LayoutData): string {
    let xml = '<r>';

    for (const device of layout.devices) {
      xml += `<d id="${device.id}" l="{00000000-0000-0000-0000-000000000000}">`;
      
      for (const rendering of device.renderings) {
        const params = rendering.parameters
          ? Object.entries(rendering.parameters)
              .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
              .join('&')
          : '';

        xml += `<r uid="${rendering.uid}" id="${rendering.renderingId}" ph="${rendering.placeholder}"`;
        if (rendering.dataSource) xml += ` ds="${rendering.dataSource}"`;
        if (params) xml += ` par="${params}"`;
        xml += ' />';
      }
      
      xml += '</d>';
    }

    xml += '</r>';
    return xml;
  }

  private extractAttr(attrs: string, name: string): string | undefined {
    const match = attrs.match(new RegExp(`${name}="([^"]*)"`));
    return match ? match[1] : undefined;
  }

  private generateGuid(): string {
    return '{xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx}'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  }

  private resolvePath(basePath: string, relativePath: string): string {
    const parts = basePath.split('/');
    const relParts = relativePath.split('/');
    
    for (const part of relParts) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.' && part !== '') {
        parts.push(part);
      }
    }
    
    return parts.join('/');
  }

  async dispose(): Promise<void> {
    // Logout from SSC
    try {
      await this.fetch<void>('/sitecore/api/ssc/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors
    }
    this.accessToken = undefined;
    this.tokenExpiry = undefined;
  }

  // ============== Transform Helpers ==============

  private transformItem(item: SitecoreXPItem): Content {
    const fields: Record<string, unknown> = {};
    
    for (const field of item.ItemFields || []) {
      fields[field.Name] = field.Value;
    }

    // Find title from common field names
    const title = (fields.Title as string) ||
                  (fields['Page Title'] as string) ||
                  (fields.Headline as string) ||
                  item.ItemName;

    return {
      id: item.ItemID,
      type: item.TemplateName,
      title,
      slug: item.ItemUrl || item.ItemPath,
      status: this.database === 'web' ? 'published' : 'draft',
      createdAt: item.ItemCreated,
      updatedAt: item.ItemUpdated,
      locale: item.ItemLanguage,
      fields,
      _raw: item,
    };
  }

  private transformMediaItem(item: SitecoreXPItem): Media {
    const fields: Record<string, string> = {};
    for (const field of item.ItemFields || []) {
      fields[field.Name] = field.Value;
    }

    // Build media URL
    const mediaUrl = `${this.baseUrl}/-/media/${item.ItemPath.replace('/sitecore/media library/', '')}`;

    return {
      id: item.ItemID,
      filename: item.ItemName,
      mimeType: fields['Mime Type'] || 'application/octet-stream',
      size: parseInt(fields['Size'] || '0', 10),
      url: mediaUrl,
      alt: fields['Alt'] || undefined,
      width: fields['Width'] ? parseInt(fields['Width'], 10) : undefined,
      height: fields['Height'] ? parseInt(fields['Height'], 10) : undefined,
      createdAt: item.ItemCreated,
    };
  }

  private transformFieldsForWrite(fields: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(fields)) {
      if (value !== null && value !== undefined) {
        result[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }
    
    return result;
  }

  private mapFieldType(sitecoreType: string): import('../types/content.js').FieldType {
    const typeMap: Record<string, import('../types/content.js').FieldType> = {
      'Single-Line Text': 'string',
      'Multi-Line Text': 'text',
      'Rich Text': 'rich-text',
      'Integer': 'integer',
      'Number': 'number',
      'Checkbox': 'boolean',
      'Date': 'date',
      'Datetime': 'datetime',
      'Droptree': 'reference',
      'Droplink': 'reference',
      'Multilist': 'array',
      'Treelist': 'array',
      'Image': 'media',
      'File': 'media',
      'General Link': 'link',
    };
    return typeMap[sitecoreType] || 'unknown';
  }
}
