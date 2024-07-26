FROM node:iron-slim AS base

WORKDIR /app

# captures argument
ARG API_URL="https://your-api.domain.com"
# e.g. latest, development, production
ARG VERSION=latest
ARG GIT_COMMIT=43fdfd34
ARG TAG=v0.0.1
ARG BUILD_TIME="date-time here"
ARG AUTHOR="CI/CD"

# set environment variables
ENV NEXT_PUBLIC_API_URL=$API_URL

RUN echo "Set ARG value of [NEXT_PUBLIC_API_URL] as $API_URL"
RUN echo "Set ARG value of [VERSION] as $VERSION"
RUN echo "Set GIT_COMMIT value of [VERSION] as $GIT_COMMIT"
RUN echo "Set TAG value of [TAG] as $TAG"
RUN echo "Set BUILD_TIME value of [BUILD_TIME] as $BUILD_TIME"

RUN echo "Set ENV value of [NEXT_PUBLIC_API_URL] as $NEXT_PUBLIC_API_URL"

# get current commit and create build number
ARG RELEASE_NOTE="author=${AUTHOR} \nversion=${VERSION} \ncommit=${GIT_COMMIT} \ntag=${TAG} \nbuild time=${BUILD_TIME}"
RUN echo "${RELEASE_NOTE}" > /app/RELEASE

# Install dependencies only when needed
FROM node:iron-slim AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM deps AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production image, copy all the files and run next
#FROM node:iron-slim AS runner
FROM base AS runner

WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=base --chown=nextjs:nodejs /app/RELEASE ./RELEASE

USER nextjs

EXPOSE 3000

ENV PORT 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD HOSTNAME="0.0.0.0" node server.js
