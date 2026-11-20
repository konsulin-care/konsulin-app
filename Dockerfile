# Toolchain versions; override with --build-arg GO_VERSION=... / NODE_VERSION=...
ARG NODE_VERSION=24
ARG GO_VERSION=1.26.5

# Stage 1: Build Next.js static export
FROM node:${NODE_VERSION}-alpine AS next-builder
WORKDIR /build
COPY package.json package-lock.json ./
COPY next.config.mjs tsconfig.json postcss.config.mjs ./  
RUN npm ci
COPY next.config.mjs tsconfig.json ./
COPY public ./public
COPY src ./src
RUN npm run build

# Stage 2: Build Go binary
FROM golang:${GO_VERSION}-alpine AS go-builder
WORKDIR /build
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app/server ./cmd/konsulin-app

# Stage 3: Runtime
FROM alpine:3.24
RUN apk add --no-cache ca-certificates
WORKDIR /app
USER nobody:nobody
COPY --from=go-builder /app/server /app/server
COPY --from=next-builder /build/out ./out
ENV PORT=3000
EXPOSE 3000
CMD ["/app/server"]
