# =========================
# Base image with metadata
# =========================
FROM node:iron-slim AS base

WORKDIR /app

# Build metadata arguments
ARG VERSION=latest
ARG GIT_COMMIT=43fdfd34
ARG TAG=v0.0.1
ARG BUILD_TIME="date-time here"
ARG AUTHOR="CI/CD"

# Capture metadata in RELEASE file
RUN echo "author=${AUTHOR} \
version=${VERSION} \
commit=${GIT_COMMIT} \
tag=${TAG} \
build time=${BUILD_TIME}" > /app/RELEASE

# Disable Next.js telemetry globally
ENV NEXT_TELEMETRY_DISABLED=1

# =========================
# Dependencies stage (cache-friendly)
# =========================
FROM node:iron-slim AS deps
WORKDIR /app

# Copy only package manifests to leverage Docker cache
COPY package.json package-lock.json ./

# Install dependencies deterministically
RUN npm ci --ignore-scripts

# =========================
# Build stage (incremental)
# =========================
FROM deps AS builder
WORKDIR /app

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy app source (excluding package.json/lockfiles to avoid overwriting deps)
COPY . .

# Build Next.js app
RUN npm run build

# =========================
# Production image (minimal)
# =========================
FROM node:iron-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Create unprivileged user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built artifacts from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=base --chown=nextjs:nodejs /app/RELEASE ./RELEASE

# Prepare prerender cache directory with correct permissions
RUN mkdir -p .next && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000

# JSON-form CMD (recommended)
CMD ["node", "server.js"]
