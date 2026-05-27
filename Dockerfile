FROM golang:1.26-alpine AS builder
WORKDIR /build

# Cache go modules
COPY go.mod go.sum ./
RUN go mod download

# Install templ at version from mise.toml (single source of truth)
COPY mise.toml ./
RUN TEMPL_VERSION=$(awk -F'"' '/templ\/cmd\/templ/{print $4}' mise.toml) && \
    echo "Installing templ@${TEMPL_VERSION}" && \
    go install "github.com/a-h/templ/cmd/templ@${TEMPL_VERSION}"

# Build the Go binary
COPY . .
RUN templ generate && CGO_ENABLED=0 go build -o /app/server ./cmd/konsulin-app

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=builder /app/server /app/server
COPY web ./web
EXPOSE 8080
CMD ["/app/server"]
