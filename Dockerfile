# Conduit - minimal runtime image
FROM node:18-alpine

# Create app user
RUN addgroup -S app && adduser -S app -G app
USER app

WORKDIR /app

# Copy package metadata and install prod deps
COPY --chown=app:app package*.json ./
RUN npm ci --only=production

# Copy built dist and default config
COPY --chown=app:app dist ./dist

ENV NODE_ENV=production \
    CONDUIT_HTTP_ENABLED=true \
    CONDUIT_HTTP_PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]
