# Conduit Enterprise Launch Plan v1.0
Problem statement
Conduit is functionally strong but lacks several enterprise launch pre-requisites across legal, deployment, observability, and operational maturity. We need a coordinated plan to reach enterprise-readiness and begin selling, while minimizing time-to-first-customer.
## Current state (summary)
Core product and docs are solid. Tests: 168 passing, 65.18% coverage. Gaps: legal files, production deployment guide, Docker, CI/CD, health and metrics endpoints, monitoring guidance, distribution mechanics, and a few architectural risks (transient failures, state persistence for X-Ray). Pricing is drafted. Initial sales motion defined.
## Objectives
1. Ship v1.0.0 that is deployable and supportable in enterprise environments.
2. Close first enterprise customer within 2 weeks of v1.0.0.
3. Establish repeatable deployment, support, and update processes.
4. Reach 80%+ test coverage on critical modules by end of Month 1.
## Non-goals
1. Building a full SaaS control plane before first five customers.
2. Adding many new adapters before launch; focus on reliability of existing ones.
## Scope
In scope: legal, security posture, deployment artifacts, health and metrics, CI/CD, distribution, logging/observability, X-Ray persistence, retries and circuit breakers, documentation overhaul, sales collateral. Out of scope: SSO, RBAC, hosted multi-tenant SaaS, payment automation beyond Stripe basics in Week 2.
## Deliverables
1. Legal and compliance artifacts: LICENSE, SECURITY.md, Terms of Service, Privacy Policy, optional DPA template.
2. Distribution: npm package published, v1.0.0 tag and release notes.
3. Deployment: Dockerfile, docker-compose, systemd and PM2 examples, DEPLOYMENT.md, .dockerignore.
4. Operations: health endpoint, Prometheus metrics endpoint, structured logging with correlation ID, TROUBLESHOOTING.md.
5. CI/CD: test, typecheck, lint, coverage, security scan, publish on tag.
6. Architecture enhancements: request retries with jitter, circuit breaker per adapter, X-Ray persistence and resume, adapter health checks.
7. Documentation: architecture overview and diagrams, docs hub, getting-started guide, reference cleanup, link hygiene.
8. Sales enablement: pricing sheet, quote template, POC offer, support SLAs.
## Workstreams
Legal and compliance
Distribution and release engineering
Deployment and operations
Observability and supportability
Architecture risk reduction
Documentation and developer experience
Sales enablement and GTM
## Phases and timeline (30 days)
Week 1
Legal and publishing, first outreach. Ship Docker and health checks.
Week 2
Stripe setup and license-check basics. Observability and retries. Land first paying customer.
Week 3
Differentiators: multi-tenancy scaffolding, X-Ray historical trends, webhook events. Expand docs and case study.
Week 4
Polish: CLI workflows, coverage to 80%+, diagrams, ADRs, optimize based on customer feedback.
## Acceptance criteria (v1.0.0)
Legal files present and linked from README. npm package published and installable. DEPLOYMENT.md instructions verified on Docker and VM. /health and /metrics endpoints live. CI pipelines run green on PR and on main. GitHub release v1.0.0 with changelog. One reference deployment and at least one paying customer in pipeline with agreed terms.
## Detailed implementation backlog
Legal and compliance
Create LICENSE (MIT).
Add SECURITY.md with disclosure steps and supported versions.
Draft Terms of Service and Privacy Policy tailored to self-hosted use and X-Ray data handling.
Optional DPA template for EU customers.
Distribution and release
Add .npmignore and verify package contents via npm pack.
Publish to npm and verify via npm info and npx smoke test.
Create GitHub release notes and tag v1.0.0.
Add semantic versioning policy; breaking changes bump major.
Deployment and operations
Author DEPLOYMENT.md with Docker, docker-compose, PM2 and systemd examples.
Add Dockerfile and .dockerignore; produce and test image locally.
Provide example reverse proxy config (nginx or Caddy) in docs.
Provide configuration samples for single-tenant and multi-adapter setups.
Observability and supportability
Add GET /health readiness endpoint.
Add GET /metrics Prometheus endpoint: request counts, latencies, cache hits, scan durations.
Standardize logs (pino) with correlationId per request; document shipping to Splunk and Datadog.
Author TROUBLESHOOTING.md with common errors and remediation steps.
Architecture risk reduction
Implement exponential backoff with jitter for transient adapter failures.
Add per-adapter circuit breaker; degrade gracefully when an adapter is down.
Introduce adapter health checks and version compatibility reporting.
X-Ray persistence using SQLite as default; support Postgres via env var; resume interrupted scans.
Documentation and developer experience
Create docs/README hub and section indexes.
Expand ARCHITECTURE.md and add diagrams (Mermaid) for data flow and X-Ray pipeline.
Create ARCHITECTURE decisions (ADRs) directory and seed initial ADR on configuration and adapter abstraction.
Improve error messages to include remediation hints and doc links.
Sales enablement and GTM
Finalize pricing tiers and add one-page pricing sheet with add-ons and SLAs.
Create quote template with three line items: package, adapter quantity, services/POC.
Prepare demo script and sample X-Ray report; publish LAUNCH.md checklist.
Define support policy, priority matrix, SLAs and escalation path; include in README and website.
## Engineering design details
Health and metrics endpoints
Expose GET /health returning 200 and basic status of adapters and queues.
Expose GET /metrics with Prometheus format including request_total, request_duration_seconds, cache_hit_total, xray_scan_duration_seconds, adapter_errors_total.
Retries and circuit breakers
Implement retry policy with capped exponential backoff and jitter for network errors and 5xx responses. Configure per-adapter limits. Circuit breaker opens after consecutive failures within a window and half-open probing recovers.
X-Ray persistence
Define minimal schema for scans, tasks, findings, and scores. Store in SQLite by default, configurable to Postgres via DATABASE_URL. On startup, resume any in-progress scans and expose xray_compare to diff two scan runs.
Configuration validation
Add CLI command conduit config validate with Zod validation and human-readable error reporting. Provide conduit config generate wizard to create a starter YAML.
Audit and logging
Attach correlationId to every tool invocation; include tenantId when multi-tenant is enabled. Log key fields: adapter, operation, latency, status, error codes.
## Security posture
Credentials must be sourced from environment variables or injected secrets; never stored in repo. Document examples for Vault and AWS Secrets Manager. Enforce payload size limits and query complexity caps. Add per-adapter rate limits in addition to global limiter.
## CI/CD pipelines
Test workflow: install, build, typecheck, unit tests, coverage upload, lint.
Security workflow: dependency audit and CodeQL.
Publish workflow: on tag v* build, test, publish to npm, create GitHub release.
## Milestones
M1 Day 2 complete: legal files, Docker, health and metrics, npm publish, v1.0.0 tag.
M2 End Week 2: Stripe basic billing and license check, retries and circuit breakers, first paying customer.
M3 End Month 1: 80% coverage, multi-tenancy scaffolding, X-Ray trends, webhook events, two case studies.
## Metrics and KPIs
Engineering: test coverage, MTTR on incidents, p95 request and scan latency, error rate per adapter.
Business: demos per week, conversion rate, MRR, churn, NPS, time-to-value from install to first scan.
## Risks and mitigations
Adapter API changes
Pin SDK versions, adapter health reports, test matrix in CI.
Performance on large instances
Tiered scanning, caching, async processing, metrics.
Support burden
Good docs, troubleshooting, community Slack, SLAs.
## Resource plan
Time: Week 1 20-30 hours; ongoing 10-15 hours weekly. Budget: $50-100 per month tools. People: 1 engineer can reach M1; add support as customers grow.
## Rollback and recovery
If v1.0.0 issues arise, roll back via npm deprecate and GitHub release notes; maintain v0.x branch for hotfixes. Provide migration notes in CHANGELOG.md for any breaking changes.
## Dependencies
Node 18+, supported CMS SDK versions per reference. Optional: Docker, Postgres for persistence, Prometheus-compatible scraper for metrics.
## Communication plan
Changelog entries for each release. Security advisories via GitHub and email list. Publish a launch blog post and share to Sitecore community.
## Next actions (immediate)
Create ToS and Privacy Policy drafts. Finish Dockerfile and .dockerignore. Implement /health and /metrics. Set up CI pipelines. Prepare pricing one-pager and quote template. Begin outreach to three target clients for free audit offer.
