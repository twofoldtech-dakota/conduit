# Contributing to Conduit

Thank you for your interest in contributing to Conduit!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/twofoldtech-dakota/conduit.git
cd conduit

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

## Project Structure

```
conduit/
├── src/
│   ├── adapters/         # CMS adapters
│   │   ├── interface.ts  # ICMSAdapter interface
│   │   ├── contentful.ts
│   │   ├── sanity.ts
│   │   ├── wordpress.ts
│   │   ├── sitecore.ts   # XM Cloud
│   │   ├── sitecore-xp.ts
│   │   ├── umbraco.ts
│   │   └── optimizely.ts
│   ├── config/
│   │   └── loader.ts     # YAML config loader
│   ├── middleware/
│   │   ├── cache.ts      # LRU cache
│   │   ├── audit.ts      # Logging
│   │   └── rate-limit.ts # Rate limiting
│   ├── xray/             # Sitecore X-Ray module
│   │   ├── types.ts
│   │   ├── scanner.ts
│   │   ├── analyzer.ts
│   │   └── graph.ts
│   ├── types/
│   │   └── content.ts    # Shared content types
│   ├── server.ts         # MCP server
│   └── index.ts          # Exports
├── docs/                 # Documentation
├── tests/                # Test files
└── conduit.example.yaml  # Example config
```

## Coding Standards

### TypeScript

- Use strict TypeScript (`"strict": true`)
- Prefer `interface` over `type` for object shapes
- Use explicit return types on public methods
- Document public APIs with JSDoc comments

### Naming Conventions

- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/methods: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

### Code Style

- Use ES modules (`import`/`export`)
- Prefer `async`/`await` over raw Promises
- Handle errors with try/catch, never swallow errors
- Use optional chaining (`?.`) and nullish coalescing (`??`)

## Adding a New Adapter

1. Create `src/adapters/my-adapter.ts`:

```typescript
import { BaseAdapter, type AdapterConfig, type AdapterCapabilities } from './interface.js';

export class MyAdapter extends BaseAdapter {
  readonly name = 'myadapter';
  readonly displayName = 'My CMS';
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
    // Initialize client
  }

  async healthCheck(): Promise<HealthCheckResult> {
    // Implement health check
  }

  async getContent(id: string, locale?: string): Promise<Content | null> {
    // Implement
  }

  async listContent(filter?: ContentFilter): Promise<PaginatedResponse<Content>> {
    // Implement
  }

  // ... other methods
}
```

2. Register in `src/server.ts`:

```typescript
import { MyAdapter } from './adapters/my-adapter.js';

function createAdapter(type: AdapterType): ICMSAdapter {
  switch (type) {
    // ... existing
    case 'myadapter':
      return new MyAdapter();
  }
}
```

3. Add to `src/config/loader.ts` AdapterType union:

```typescript
export type AdapterType = 
  | 'contentful' 
  // ... existing
  | 'myadapter';
```

4. Add tests in `src/__tests__/adapters.test.ts`

5. Document in `docs/ADAPTERS.md`

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- adapters.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Writing Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { MyAdapter } from '../adapters/my-adapter.js';

describe('MyAdapter', () => {
  it('should initialize successfully', async () => {
    const adapter = new MyAdapter();
    await adapter.initialize({
      type: 'myadapter',
      credentials: { apiKey: 'test' },
    });
    expect(adapter.name).toBe('myadapter');
  });

  it('should handle errors gracefully', async () => {
    const adapter = new MyAdapter();
    const result = await adapter.getContent('nonexistent');
    expect(result).toBeNull();
  });
});
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run type check: `npm run typecheck`
6. Commit with conventional commits:
   - `feat: Add new feature`
   - `fix: Fix bug`
   - `docs: Update documentation`
   - `refactor: Refactor code`
   - `test: Add tests`
7. Push and open a PR

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat(adapter): Add Drupal adapter`
- `fix(sitecore-xp): Handle auth token refresh`
- `docs: Update API reference`

## Documentation

- Update README.md for user-facing changes
- Update docs/*.md for detailed documentation
- Add JSDoc comments for public APIs
- Include examples in documentation

## Questions?

Open an issue or reach out to the maintainers.
