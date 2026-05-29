# Stage 1: Build SPA assets
FROM node:24-alpine AS spa-builder
WORKDIR /build/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/auth-spa ./auth-spa
COPY web/static/css/templ-input.css ./static/css/templ-input.css
COPY web/template ../template/
COPY web/static/images ./static/images
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
COPY --from=spa-builder /build/web/static ./web/static
RUN templ generate && CGO_ENABLED=0 go build -o /app/server ./cmd/konsulin-app

# Stage 3: Runtime
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=go-builder /app/server /app/server
COPY --from=go-builder /build/web ./web
EXPOSE 8080
CMD ["/app/server"]
