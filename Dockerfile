# =========================
# Base image with metadata
# =========================
FROM node:25-slim AS base
WORKDIR /app

# Build metadata arguments
ARG VERSION=latest
ARG GIT_COMMIT=unknown
ARG TAG=v0.0.1
ARG BUILD_TIME="unknown"
ARG AUTHOR="CI/CD"

# Capture build metadata
RUN echo "author=${AUTHOR} \
version=${VERSION} \
commit=${GIT_COMMIT} \
tag=${TAG} \
build time=${BUILD_TIME}" > /app/RELEASE

# Disable Next.js telemetry globally
ENV NEXT_TELEMETRY_DISABLED=1

# =========================
# Dependencies stage
# =========================
FROM base AS deps
WORKDIR /app

# Copy only package manifests to leverage cache
COPY package.json package-lock.json ./

# Ensure deterministic installation
RUN npm ci

# =========================
# Builder stage
# =========================
FROM deps AS builder
WORKDIR /app

# Copy installed node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the Next.js app
RUN npm run build

# =========================
# Production runner
# =========================
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Create unprivileged user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy build artifacts
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=base --chown=nextjs:nodejs /app/RELEASE ./RELEASE

# Prepare prerender cache with correct permissions
RUN mkdir -p .next

USER nextjs
EXPOSE 3000

# Recommended JSON CMD
CMD ["node", "server.js"]
