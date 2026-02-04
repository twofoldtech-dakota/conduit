# Conduit

**One connection to every CMS.**

Conduit is an enterprise-grade MCP (Model Context Protocol) server that provides unified access to multiple content management systems through a single interface. Connect your AI assistants to Contentful, Sanity, WordPress, and more—without writing custom integrations for each.

## Features

- **Unified API** - Single interface for all CMS operations across platforms
- **Multi-CMS Support** - Connect to multiple CMS platforms simultaneously
- **Enterprise Ready** - Built-in caching, rate limiting, and audit logging
- **Type Safe** - Full TypeScript support with comprehensive type definitions
- **Extensible** - Easy adapter architecture for adding new CMS platforms

## Supported CMS Platforms

### Headless CMS
| Platform | Read | Write | Search | Media |
|----------|------|-------|--------|-------|
| Contentful | ✅ | ✅ | ✅ | ✅ |
| Sanity | ✅ | ✅ | ✅ | ✅ |
| WordPress | ✅ | ✅ | ✅ | ✅ |

### Enterprise CMS
| Platform | Read | Write | Search | Media |
|----------|------|-------|--------|-------|
| Sitecore XM Cloud | ✅ | ❌* | ✅ | ✅ |
| Sitecore XP | ✅ | ✅ | ✅ | ✅ |
| Umbraco | ✅ | ❌* | ✅ | ✅ |
| Optimizely | ✅ | ❌* | ✅ | ✅ |

*Read-only via Content Delivery APIs. Sitecore XP supports writes via SSC.

## Quick Start

### Installation

```bash
npm install conduit-mcp
```

### Configuration

Create a `conduit.yaml` file:

```yaml
# Single CMS mode
adapter:
  type: contentful
  credentials:
    spaceId: ${CONTENTFUL_SPACE_ID}
    accessToken: ${CONTENTFUL_ACCESS_TOKEN}

middleware:
  cache:
    enabled: true
    ttlMs: 60000
  rateLimit:
    enabled: true
    windowMs: 60000
    maxRequests: 100
```

Or connect multiple CMS platforms:

```yaml
# Multi-CMS mode (Enterprise)
adapters:
  contentful:
    type: contentful
    credentials:
      spaceId: ${CONTENTFUL_SPACE_ID}
      accessToken: ${CONTENTFUL_ACCESS_TOKEN}
  
  sanity:
    type: sanity
    credentials:
      projectId: ${SANITY_PROJECT_ID}
      dataset: production
      token: ${SANITY_TOKEN}
  
  wordpress:
    type: wordpress
    credentials:
      url: ${WORDPRESS_URL}
      username: ${WORDPRESS_USERNAME}
      applicationPassword: ${WORDPRESS_APP_PASSWORD}
```

### Running

```bash
# Using npx
npx conduit-mcp

# Or with environment variable
CONDUIT_CONFIG=/path/to/conduit.yaml npx conduit-mcp
```

### MCP Client Configuration

Add to your MCP client config (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "conduit": {
      "command": "npx",
      "args": ["conduit-mcp"],
      "env": {
        "CONTENTFUL_SPACE_ID": "your-space-id",
        "CONTENTFUL_ACCESS_TOKEN": "your-token"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `content_list` | List content with filters and pagination |
| `content_get` | Get a single content item by ID |
| `content_search` | Full-text search across content |
| `content_create` | Create new content |
| `content_update` | Update existing content |
| `media_list` | List media assets |
| `media_get` | Get a single media asset |
| `schema_list` | List available content types |
| `schema_get` | Get content type schema |
| `health_check` | Check adapter connectivity |

## Middleware

### Caching

LRU cache with configurable TTL:

```yaml
middleware:
  cache:
    enabled: true
    ttlMs: 60000    # 1 minute
    maxSize: 500    # Max entries
```

### Rate Limiting

Sliding window rate limiter:

```yaml
middleware:
  rateLimit:
    enabled: true
    windowMs: 60000    # 1 minute window
    maxRequests: 100   # Max requests per window
```

### Audit Logging

Pino-based structured logging:

```yaml
middleware:
  audit:
    enabled: true
    level: info        # debug, info, warn, error
    logFile: ./audit.log  # Optional file output
```

## Programmatic Usage

```typescript
import { ConduitServer, loadConfig } from 'conduit-mcp';

const config = await loadConfig('./conduit.yaml');
const server = new ConduitServer(config);

await server.start();
```

## Sitecore X-Ray (Premium)

X-Ray is a comprehensive audit and knowledge graph system for Sitecore XP installations.

### Features

- **12 Analysis Algorithms**: Orphan detection, unused templates, broken links, security analysis, and more
- **Health Scoring**: A-F grades with actionable recommendations
- **Knowledge Graph**: Visualize relationships between items, templates, renderings
- **Tiered Scanning**: Handles 100K+ items efficiently

### MCP Tools

| Tool | Description |
|------|-------------|
| `xray_scan` | Start a new audit scan |
| `xray_status` | Check scan progress |
| `xray_report` | Get issues and health score |
| `xray_graph` | Get knowledge graph data |
| `xray_health` | Quick health check |

See [docs/XRAY.md](docs/XRAY.md) for full documentation.

## Adding Custom Adapters

Implement the `ICMSAdapter` interface:

```typescript
import { BaseAdapter, type AdapterConfig } from 'conduit-mcp';

export class MyAdapter extends BaseAdapter {
  readonly name = 'mycms';
  readonly displayName = 'My CMS';
  
  async initialize(config: AdapterConfig) {
    // Initialize client
  }
  
  async listContent(filter) {
    // Implement
  }
  
  // ... implement other methods
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build
```

## Environment Variables

### Headless CMS
| Variable | Description |
|----------|-------------|
| `CONTENTFUL_SPACE_ID` | Contentful space ID |
| `CONTENTFUL_ACCESS_TOKEN` | Contentful delivery API token |
| `SANITY_PROJECT_ID` | Sanity project ID |
| `SANITY_TOKEN` | Sanity API token |
| `WORDPRESS_URL` | WordPress site URL |
| `WORDPRESS_USERNAME` | WordPress username |
| `WORDPRESS_APP_PASSWORD` | WordPress application password |

### Enterprise CMS
| Variable | Description |
|----------|-------------|
| `SITECORE_API_KEY` | Sitecore Experience Edge API key (XM Cloud) |
| `SITECORE_ENDPOINT` | Sitecore Edge endpoint (optional) |
| `SITECORE_SITE_NAME` | Sitecore site name |
| `SITECORE_XP_URL` | Sitecore XP instance URL |
| `SITECORE_XP_USERNAME` | Sitecore XP username |
| `SITECORE_XP_PASSWORD` | Sitecore XP password |
| `SITECORE_XP_DOMAIN` | Sitecore domain (default: sitecore) |
| `UMBRACO_URL` | Umbraco instance URL |
| `UMBRACO_API_KEY` | Umbraco API key |
| `OPTIMIZELY_URL` | Optimizely instance URL |
| `OPTIMIZELY_CLIENT_ID` | OAuth client ID |
| `OPTIMIZELY_CLIENT_SECRET` | OAuth client secret |

## License

MIT © Twofold Tech
