FROM golang:1.26-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app/server ./cmd/konsulin-app

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /app/server /app/server
COPY web ./web
EXPOSE 8080
CMD ["/app/server"]
