# Deployment Guide

This guide describes supported deployment options for Conduit in enterprise environments.

## Prerequisites
- Node.js 18+
- Access credentials for target CMS adapters
- Network egress to CMS APIs

## Option A: Docker (Recommended)

### 1) Create config file

```yaml
# conduit.yaml
adapters:
  # Add your adapters here
middleware:
  cache:
    enabled: true
  rateLimit:
    enabled: true
```

### 2) Dockerfile

```Dockerfile
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY conduit.yaml ./conduit.yaml
CMD ["node", "dist/index.js"]
```

### 3) docker-compose.yml

```yaml
version: "3.9"
services:
  conduit:
    image: twofoldtech/conduit:latest
    build: .
    ports:
      - "8080:8080"
    environment:
      - CONDUIT_CONFIG=/app/conduit.yaml
    volumes:
      - ./conduit.yaml:/app/conduit.yaml:ro
```

## Option B: Systemd (VMs)

Create `/etc/systemd/system/conduit.service`:

```ini
[Unit]
Description=Conduit MCP Server
After=network.target

[Service]
Type=simple
Environment=CONDUIT_CONFIG=/etc/conduit.yaml
ExecStart=/usr/bin/node /opt/conduit/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable conduit
sudo systemctl start conduit
```

## Health and Metrics

- Liveness: `GET /health` returns 200 when ready
- Metrics: `GET /metrics` returns Prometheus metrics

## Logging

- Structured JSON logs (pino)
- Include correlationId per request
- Ship to Splunk/Datadog via Fluent Bit or Vector

## Security

- Run as non-root user in containers
- Store credentials in secrets manager (Vault, AWS Secrets Manager)
- Rotate tokens quarterly

## Backups (X-Ray)

- If using persistence, back up the database daily
- Retain 30 days for trend analysis
