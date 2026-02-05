# CMS Adapters

Conduit supports multiple CMS platforms through adapters. Each adapter implements the `ICMSAdapter` interface.

## Headless CMS

### Contentful

```yaml
adapter:
  type: contentful
  credentials:
    spaceId: ${CONTENTFUL_SPACE_ID}
    accessToken: ${CONTENTFUL_ACCESS_TOKEN}
    environment: master # optional, default: master
  defaultLocale: en-US
  preview: false # set true to use preview API
```

**Environment Variables:**
| Variable | Required | Description |
|----------|----------|-------------|
| `CONTENTFUL_SPACE_ID` | Yes | Your Contentful space ID |
| `CONTENTFUL_ACCESS_TOKEN` | Yes | Content Delivery API token |

**Capabilities:** Read ✅ | Write ✅ | Search ✅ | Media ✅

---

### Sanity

```yaml
adapter:
  type: sanity
  credentials:
    projectId: ${SANITY_PROJECT_ID}
    dataset: production
    token: ${SANITY_TOKEN} # optional for public datasets
    apiVersion: "2023-05-03"
  defaultLocale: en
```

**Environment Variables:**
| Variable | Required | Description |
|----------|----------|-------------|
| `SANITY_PROJECT_ID` | Yes | Sanity project ID |
| `SANITY_TOKEN` | No | API token (required for private datasets) |

**Capabilities:** Read ✅ | Write ✅ | Search ✅ | Media ✅

---

### WordPress

```yaml
adapter:
  type: wordpress
  credentials:
    url: ${WORDPRESS_URL}
    username: ${WORDPRESS_USERNAME}
    applicationPassword: ${WORDPRESS_APP_PASSWORD}
  defaultLocale: en
```

**Environment Variables:**
| Variable | Required | Description |
|----------|----------|-------------|
| `WORDPRESS_URL` | Yes | WordPress site URL |
| `WORDPRESS_USERNAME` | Yes | WordPress username |
| `WORDPRESS_APP_PASSWORD` | Yes | Application password (Settings → Security) |

**Capabilities:** Read ✅ | Write ✅ | Search ✅ | Media ✅

---

## Enterprise CMS

### Sitecore XM Cloud

Uses Sitecore Experience Edge GraphQL API.

```yaml
adapter:
  type: sitecore
  credentials:
    apiKey: ${SITECORE_API_KEY}
    endpoint: ${SITECORE_ENDPOINT} # optional
    siteName: ${SITECORE_SITE_NAME}
  defaultLocale: en
```

**Environment Variables:**
| Variable | Required | Description |
|----------|----------|-------------|
| `SITECORE_API_KEY` | Yes | Experience Edge API key |
| `SITECORE_ENDPOINT` | No | Custom Edge endpoint |
| `SITECORE_SITE_NAME` | Yes | Site name in Sitecore |

**Capabilities:** Read ✅ | Write ❌ | Search ✅ | Media ✅

---

### Sitecore XP

Uses Sitecore Services Client (SSC) and Item Web API.

```yaml
adapter:
  type: sitecore-xp
  credentials:
    url: ${SITECORE_XP_URL}
    username: ${SITECORE_XP_USERNAME}
    password: ${SITECORE_XP_PASSWORD}
    domain: sitecore # optional, default: sitecore
  defaultLocale: en
  preview: true # true = master DB, false = web DB
```

**Environment Variables:**
| Variable | Required | Description |
|----------|----------|-------------|
| `SITECORE_XP_URL` | Yes | Sitecore instance URL |
| `SITECORE_XP_USERNAME` | Yes | Sitecore username |
| `SITECORE_XP_PASSWORD` | Yes | Sitecore password |
| `SITECORE_XP_DOMAIN` | No | Sitecore domain (default: sitecore) |

**Capabilities:** Read ✅ | Write ✅ | Search ✅ | Media ✅

**Premium Features:**

- Layout/rendering manipulation
- Page composition
- X-Ray audit & knowledge graph

---

### Umbraco

Uses Umbraco Content Delivery API v2.

```yaml
adapter:
  type: umbraco
  credentials:
    url: ${UMBRACO_URL}
    apiKey: ${UMBRACO_API_KEY}
  defaultLocale: en-US
```

**Environment Variables:**
| Variable | Required | Description |
|----------|----------|-------------|
| `UMBRACO_URL` | Yes | Umbraco instance URL |
| `UMBRACO_API_KEY` | Yes | API key |

**Capabilities:** Read ✅ | Write ❌ | Search ✅ | Media ✅

---

### Optimizely

Uses Optimizely Content Delivery API with OAuth2.

```yaml
adapter:
  type: optimizely
  credentials:
    url: ${OPTIMIZELY_URL}
    clientId: ${OPTIMIZELY_CLIENT_ID}
    clientSecret: ${OPTIMIZELY_CLIENT_SECRET}
  defaultLocale: en
```

**Environment Variables:**
| Variable | Required | Description |
|----------|----------|-------------|
| `OPTIMIZELY_URL` | Yes | Optimizely CMS URL |
| `OPTIMIZELY_CLIENT_ID` | Yes | OAuth2 client ID |
| `OPTIMIZELY_CLIENT_SECRET` | Yes | OAuth2 client secret |

**Capabilities:** Read ✅ | Write ❌ | Search ✅ | Media ✅

---

## Multi-Adapter Configuration

Connect to multiple CMS platforms simultaneously:

```yaml
adapters:
  marketing:
    type: contentful
    credentials:
      spaceId: ${CONTENTFUL_SPACE_ID}
      accessToken: ${CONTENTFUL_ACCESS_TOKEN}

  corporate:
    type: sitecore-xp
    credentials:
      url: ${SITECORE_XP_URL}
      username: ${SITECORE_XP_USERNAME}
      password: ${SITECORE_XP_PASSWORD}

  blog:
    type: wordpress
    credentials:
      url: ${WORDPRESS_URL}
      username: ${WORDPRESS_USERNAME}
      applicationPassword: ${WORDPRESS_APP_PASSWORD}
```

When using multiple adapters, specify which adapter to use in tool calls:

```json
{
  "tool": "content_list",
  "arguments": {
    "adapter": "marketing",
    "type": "blogPost",
    "limit": 10
  }
}
```

If no adapter is specified, the first configured adapter is used as default.

---

## Creating Custom Adapters

Implement the `ICMSAdapter` interface:

```typescript
import {
  BaseAdapter,
  type AdapterConfig,
  type AdapterCapabilities,
} from "conduit-mcp";

export class MyAdapter extends BaseAdapter {
  readonly name = "mycms";
  readonly displayName = "My CMS";
  readonly capabilities: AdapterCapabilities = {
    search: true,
    media: true,
    create: false,
    update: false,
    delete: false,
    preview: false,
    versioning: false,
    localization: true,
    webhooks: false,
  };

  async initialize(config: AdapterConfig): Promise<void> {
    // Initialize your CMS client
  }

  async healthCheck(): Promise<HealthCheckResult> {
    // Return { healthy: true/false, latencyMs, message }
  }

  async getContent(id: string, locale?: string): Promise<Content | null> {
    // Fetch single content item
  }

  async listContent(
    filter?: ContentFilter,
  ): Promise<PaginatedResponse<Content>> {
    // List content with pagination
  }

  async searchContent(
    query: string,
    filter?: ContentFilter,
  ): Promise<PaginatedResponse<Content>> {
    // Full-text search
  }

  // Implement other methods as needed...

  async dispose(): Promise<void> {
    // Cleanup resources
  }
}
```

Register your adapter in `src/server.ts`:

```typescript
import { MyAdapter } from "./adapters/my-adapter.js";

function createAdapter(type: AdapterType): ICMSAdapter {
  switch (type) {
    // ... existing adapters
    case "mycms":
      return new MyAdapter();
  }
}
```
