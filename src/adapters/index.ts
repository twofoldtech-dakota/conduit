/**
 * CMS Adapters
 * 
 * Pluggable adapters for different CMS platforms.
 */

export { BaseAdapter, type ICMSAdapter, type AdapterCapabilities, type AdapterConfig, type HealthCheckResult } from './interface.js';
export { ContentfulAdapter } from './contentful.js';
export { SanityAdapter } from './sanity.js';
export { WordPressAdapter } from './wordpress.js';
export { SitecoreAdapter } from './sitecore.js';
export { SitecoreXPAdapter } from './sitecore-xp.js';
export { UmbracoAdapter } from './umbraco.js';
export { OptimizelyAdapter } from './optimizely.js';

import type { ICMSAdapter } from './interface.js';
import { ContentfulAdapter } from './contentful.js';
import { SanityAdapter } from './sanity.js';
import { WordPressAdapter } from './wordpress.js';
import { SitecoreAdapter } from './sitecore.js';
import { SitecoreXPAdapter } from './sitecore-xp.js';
import { UmbracoAdapter } from './umbraco.js';
import { OptimizelyAdapter } from './optimizely.js';

/**
 * Registry of available adapters by name
 */
export const adapters: Record<string, new () => ICMSAdapter> = {
  contentful: ContentfulAdapter,
  sanity: SanityAdapter,
  wordpress: WordPressAdapter,
  sitecore: SitecoreAdapter,
  'sitecore-xp': SitecoreXPAdapter,
  umbraco: UmbracoAdapter,
  optimizely: OptimizelyAdapter,
};

/**
 * Create an adapter instance by name
 */
export function createAdapter(name: string): ICMSAdapter {
  const AdapterClass = adapters[name.toLowerCase()];
  if (!AdapterClass) {
    throw new Error(`Unknown adapter: ${name}. Available: ${Object.keys(adapters).join(', ')}`);
  }
  return new AdapterClass();
}
