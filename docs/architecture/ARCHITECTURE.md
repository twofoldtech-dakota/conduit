# Architecture Overview

This document describes Conduit's high-level architecture.

## Components
- MCP Server (tool handlers, request routing)
- Adapter Layer (CMS-specific integrations)
- Middleware (cache, rate-limit, audit)
- X-Ray (scanner, analyzers, reports)

## Data Flow
1. MCP client sends tool request
2. Server routes to adapter or module
3. Middleware applies policies
4. Response returned to client

## Key Decisions (ADRs)
- TypeScript for type safety
- YAML for configuration
- Adapter interface abstraction

## Extensibility
- Add new adapters by implementing `AdapterInterface`
- Add middleware by composing pre/post handlers
