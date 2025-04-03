FROM node:20-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@10.6.2

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY tsconfig.json biome.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/

RUN pnpm build

FROM node:20-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r mcp && useradd -r -g mcp mcp

RUN npm install -g pnpm@10.6.2

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile \
    && pnpm store prune

COPY --from=builder /app/dist ./dist

RUN chown -R mcp:mcp /app

ENV NODE_ENV=production

USER mcp

LABEL org.opencontainers.image.title="nr-mcp" \
      org.opencontainers.image.description="MCP server allowing AI agents to query New Relic for debugging incidents" \
      org.opencontainers.image.source="https://github.com/ducduyn31/nr-mcp" \
      org.opencontainers.image.licenses="MIT"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "dist/index.js"]
