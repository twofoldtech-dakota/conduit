# Changelog

All notable changes to Conduit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Sitecore X-Ray audit module (WIP)
  - Tiered scanning (Tier 1: index, Tier 2: deep)
  - 12 analysis algorithms
  - Knowledge graph builder
  - Health scoring with A-F grades

## [1.0.0] - 2024-02-04

### Added
- Initial release
- MCP server with 10 tools:
  - `content_list`, `content_get`, `content_search`
  - `content_create`, `content_update`
  - `media_list`, `media_get`
  - `schema_list`, `schema_get`
  - `health_check`

- 7 CMS adapters:
  - **Headless**: Contentful, Sanity, WordPress
  - **Enterprise**: Sitecore XM Cloud, Sitecore XP, Umbraco, Optimizely

- Sitecore XP premium features:
  - Layout/rendering manipulation
  - Page composition

- Middleware:
  - LRU caching with configurable TTL
  - Rate limiting (sliding window)
  - Audit logging (Pino)

- Configuration:
  - YAML config file support
  - Environment variable interpolation
  - Multi-adapter mode

- Documentation:
  - README with quick start
  - API reference
  - Adapter configuration guide
  - X-Ray architecture doc
  - Contributing guidelines
