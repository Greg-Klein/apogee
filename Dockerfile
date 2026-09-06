# syntax=docker/dockerfile:1

# Debian slim rather than Alpine: better-sqlite3 ships glibc prebuilds, so the
# native addon installs without a compiler toolchain in the final image.
ARG NODE_VERSION=24-slim

# ---------------------------------------------------------------------------
# deps: full install, including the dev dependencies the build needs
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# python3/make/g++ are only needed if npm has to compile better-sqlite3 from
# source; they stay in this stage and never reach the runtime image.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# builder: Next standalone output plus the bundled data-pipeline tools
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined at build time, so the public URL has to be
# known here and not merely at runtime. Coolify: mark this one as a build variable.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build:tools && npm run build

# ---------------------------------------------------------------------------
# runner: server, tools, and a runtime-only dependency set
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Points at the mounted volume rather than the image layer, so a rebuild of the
# snapshot survives redeployment.
ENV SPACEX_DB_PATH=/app/data/spacex.db
ENV SPACEX_RAW_PATH=/app/data/raw
ENV SPACEX_SCHEMA_PATH=/app/schema.sql

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Reuses the node_modules already resolved in `deps` rather than running a second,
# independent `npm ci` here. better-sqlite3 has no prebuilt binary for every
# Node/platform combination and falls back to compiling from source via node-gyp,
# which needs Python and a compiler; `deps` has that toolchain, this stage
# deliberately does not. Pruning only removes files already on disk, so no compiler
# is needed here even when a fresh install would have had to build from source.
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev && npm cache clean --force

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Data pipeline: pre-bundled to plain ESM, so no TypeScript or dev tooling is needed.
COPY --from=builder /app/dist/tools ./dist/tools
COPY --from=builder /app/src/lib/db/schema.sql ./schema.sql

# The volume is created by the orchestrator; this makes the path exist and be
# writable when no volume is mounted (a first run then reports "source unavailable"
# rather than crashing).
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
