# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands you will use often

- Install deps
  ```bash path=null start=null
  npm ci
  ```
- Build (TypeScript → dist)
  ```bash path=null start=null
  npm run build
  ```
- Typecheck and lint
  ```bash path=null start=null
  npm run typecheck
  npm run lint
  ```
- Test suites

  ```bash path=null start=null
  # run once (no watch)
  npm test

  # watch mode
  npm run test:watch

  # coverage report
  npm run test:coverage
  ```

- Run a single test file or test name (Vitest)

  ```bash path=null start=null
  # by file
  npx vitest --run src/__tests__/server.test.ts

  # by test name pattern
  npx vitest --run -t "xray_report"
  ```

- Run the MCP server (CLI)

  ```bash path=null start=null
  # uses conduit.yaml in CWD or $CONDUIT_CONFIG
  npx conduit-mcp

  # with explicit config
  CONDUIT_CONFIG=./conduit.yaml npx conduit-mcp
  ```

- Enable HTTP health/metrics (optional ops)
  ```bash path=null start=null
  CONDUIT_HTTP_ENABLED=true CONDUIT_HTTP_PORT=8080 npx conduit-mcp
  # health:  curl http://localhost:8080/health
  # metrics: curl http://localhost:8080/metrics
  ```
- Docker (build and run minimal image from dist)
  ```bash path=null start=null
  npm run build
  docker build -t conduit:local .
  docker run -p 8080:8080 -e CONDUIT_HTTP_ENABLED=true conduit:local
  ```
- Docs automation (API refs, indexes, TOC, formatting)
  ```bash path=null start=null
  npm run docs:update   # generate & format
  npm run docs:check    # lint & external link check
  ```
- Release (CI publishes on tag; requires NPM_TOKEN secret in GitHub)
  ```bash path=null start=null
  git tag v1.0.0 && git push origin v1.0.0
  ```

## High-level architecture and code map

Conduit is an MCP (Model Context Protocol) server that unifies access to multiple CMSs through a single tool surface. The core pieces you will touch most often:

- Entry point: loads config and starts the MCP server

  ```ts path=/Users/dakotasmith/Documents/conduit/src/index.ts start=1
  #!/usr/bin/env node
  import { ConduitServer } from "./server.js";
  import { loadConfig } from "./config/loader.js";
  // Finds conduit.yaml (or $CONDUIT_CONFIG), validates, then starts ConduitServer
  ```

- Server: defines MCP tools, middleware, adapter wiring, and optional HTTP ops port

  ```ts path=/Users/dakotasmith/Documents/conduit/src/server.ts start=62
  export class ConduitServer {
    // MCP over stdio
    private server: Server;
    // Adapters by name (from config), middleware (cache/audit/rate-limit)
    private adapters: Map<string, ICMSAdapter> = new Map();
    // Optional HTTP /health and /metrics when CONDUIT_HTTP_ENABLED or port set
  }
  ```

  Key behaviors:
  - Adapter factory maps `type` → concrete adapter (Contentful, Sanity, WordPress, Sitecore XM/XP, Umbraco, Optimizely).
  - MCP tools exposed include content CRUD/search, media, schema, `health_check`, and Sitecore X-Ray tools (`xray_scan`, `xray_status`, `xray_report`, `xray_graph`, `xray_health`).
  - Middleware order is fixed in the server: cache → audit → rate-limit. Reads are cached with LRU; writes invalidate relevant keys.
  - Rate limiting is global today; per-adapter limits are a follow-on.
  - Optional HTTP server serves:
    - `/health` (aggregates `adapter.healthCheck()` results)
    - `/metrics` (Prometheus text with totals, failures, durations, and per-tool counters)

- Configuration loader: YAML + env interpolation + Zod validation

  ```ts path=/Users/dakotasmith/Documents/conduit/src/config/loader.ts start=52
  const ConfigSchema = z
    .object({
      adapter: AdapterConfigSchema.optional(),
      adapters: z.record(AdapterConfigSchema).optional(),
      middleware: MiddlewareConfigSchema,
      server: z
        .object({
          name: z.string().default("conduit"),
          version: z.string().default("1.0.0"),
        })
        .optional(),
    })
    .refine((data) => data.adapter || data.adapters, {
      message: "Either adapter or adapters must be provided",
    });
  ```

  Notes:
  - Single-adapter and multi-adapter modes are supported. `getAdapterConfigs` normalizes to a name→config map.
  - `${ENV_VAR}` placeholders in YAML are interpolated at load time.

- Adapters: CMS-specific implementations behind a common interface

  ```ts path=/Users/dakotasmith/Documents/conduit/src/adapters/interface.ts start=1
  // ICMSAdapter defines capabilities (read/write/search/media) and methods
  // Concrete adapters live in src/adapters/*.ts
  ```

  - Each adapter reports capabilities; server gates unsupported operations with clear errors.
  - Health checks are executed on startup and exposed via `health_check`.

- Middleware: cross-cutting behavior

  ```ts path=/Users/dakotasmith/Documents/conduit/src/middleware/audit.ts start=1
  // Pino-based structured audit logging wrapper around tool invocations
  ```

  - Cache (LRU with TTL), Rate-limit (sliding window), Audit (Pino JSON). Cache keys are composed via helper `CacheMiddleware.generateKey`.

- X-Ray (Sitecore XP premium module)
  ```ts path=/Users/dakotasmith/Documents/conduit/src/xray/index.ts start=1
  // Scanner orchestrates tiered item graph crawling; analysis produces health score,
  // issues list, and a knowledge graph. Reports/utilities under src/xray/*
  ```

  - Long-running scans are tracked in-memory and summarized in `xray_health`. Persistence is a planned enhancement.

## Project conventions and tooling

- Runtime: Node.js ≥ 18, ESM (NodeNext). Types emitted to `dist/` with source maps.
- Tests: Vitest. Tests live in `src/__tests__/`. Watch target is opt-in (`test:watch`).
- Docs: `/docs` is organized for enterprise users (getting-started, guides, reference, architecture, operations, contributing).
  - API reference is generated to `docs/reference/api` (TypeDoc + markdown plugin).
  - CI workflow `.github/workflows/docs.yml` can open PRs automatically after regeneration.
- CI: GitHub Actions
  - `test.yml` (install → typecheck → build → tests → coverage)
  - `security.yml` (npm audit + CodeQL)
  - `publish.yml` (npm publish on `v*.*.*` tags; requires `NPM_TOKEN` secret)

## Pointers for future Agents

- When running locally as an MCP server from source, prefer `npx conduit-mcp` after `npm run build`. The CLI looks for `conduit.yaml` in CWD or `$CONDUIT_CONFIG`.
- If you need operational checks during debugging, enable the optional HTTP port with `CONDUIT_HTTP_ENABLED=true` (and optionally `CONDUIT_HTTP_PORT`). This does not affect the stdio MCP transport.
- For documentation updates, run `npm run docs:update` before opening PRs; pre-commit hooks also format and check links. External link checks can fail on unpublished tags—run `npm run docs:update` after pushing if you see transient 404s.
