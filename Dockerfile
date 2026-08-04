# Stage 1: Build Next.js static export
FROM node:24-alpine AS next-builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY next.config.mjs tsconfig.json ./
COPY public ./public
COPY src ./src
RUN npm run build

# Stage 2: Build Go binary
FROM golang:1.26-alpine AS go-builder
WORKDIR /build
RUN apk add --no-cache git=2.52.0-r0
COPY go.mod go.sum ./
RUN go mod download
COPY mise.toml ./
RUN TEMPL_VERSION=$(awk -F'"' '/templ\/cmd\/templ/{print $4}' mise.toml) && \
    GOPROXY=direct go install "github.com/a-h/templ/cmd/templ@v${TEMPL_VERSION}"
COPY . .
RUN templ generate && CGO_ENABLED=0 go build -o /app/server ./cmd/konsulin-app

# Stage 3: Runtime
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=go-builder /app/server /app/server
COPY --from=next-builder /build/out ./out
EXPOSE 8080
CMD ["/app/server"]
