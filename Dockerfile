# VISION CORE V2.3.4 HARDENED REAL-TIME
# Runtime padronizado: Node 20 fixo.
FROM node:20-bookworm-slim AS base

ENV NODE_ENV=production \
    PORT=8787 \
    HOST=0.0.0.0 \
    DB_PATH=/app/server/.vault/vision_core.db \
    AUTO_PR=false \
    SKIP_VISION_POSTINSTALL=0

WORKDIR /app

# better-sqlite3 pode exigir toolchain caso o binário pré-compilado não exista.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev --ignore-scripts

WORKDIR /app
COPY server ./server
COPY scripts ./scripts
COPY package.json ./package.json

RUN mkdir -p /app/server/.vault /app/server/data

WORKDIR /app/server
RUN npm run postinstall

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD node scripts/docker-healthcheck.js

CMD ["node", "src/server.js"]
