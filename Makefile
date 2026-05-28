.PHONY: deps test-go test-js test fmt-go check-fmt-go check-file-length
.PHONY: lint-go-cognitive lint-go check-go css-templ dev dev-go dev-next
.PHONY: build-go run update-js docker-check

# Dependencies
deps:
	npm ci
	go mod download

# Testing
test-go:
	go test ./... -count=1

test-js:
	npm run test:run

test: test-go test-js

# Go formatting
fmt-go:
	gofmt -s -w ./cmd/ ./internal/ ./web/

check-fmt-go:
	@! gofmt -s -d ./cmd/ ./internal/ ./web/ | read i; \
	echo "  Go formatting is correct ✓"

# Go file length check (staged files only)
check-file-length:
	@git diff --cached --name-only --diff-filter=ACMR | grep '\.go$$' | while read f; do \
	  if [ -f "$$f" ] && [ "$$(wc -l < "$$f")" -gt 300 ]; then \
	    echo "FAIL: $$f has $$(wc -l < "$$f") lines (max 300)"; \
	    exit 1; \
	  fi; \
	done
	@echo "  Staged Go files under 300 lines ✓"

# Go linting
lint-go-cognitive:
	@gocognit -over 15 ./cmd ./internal 2>/dev/null; \
	if [ $$? -eq 1 ]; then \
	  echo "FAIL: cognitive complexity > 15 detected"; \
	  gocognit -over 15 ./cmd ./internal; \
	  exit 1; \
	fi
	@echo "  Cognitive complexity ≤ 15 ✓"

lint-go:
	golangci-lint run ./...

check-go: check-file-length lint-go-cognitive check-fmt-go lint-go

# Dockerfile linting
docker-check:
	if command -v hadolint >/dev/null 2>&1; then \
	  hadolint Dockerfile; \
	else \
	  echo "  hadolint not available (run mise install)"; \
	fi

# Tailwind CSS for templ templates
TAILWIND = .bin/tailwindcss
TAILWIND_INPUT = web/static/css/templ-input.css
TAILWIND_OUTPUT = web/static/css/output.css
TAILWIND_CONTENT = "web/template/**/*.templ"

css-templ:
	$(TAILWIND) -i $(TAILWIND_INPUT) -o $(TAILWIND_OUTPUT) --content $(TAILWIND_CONTENT)

# Templ code generation
templ-gen:
	templ generate

# Ports
GO_PORT ?= 3000
NEXT_PORT ?= 8080

# Development
dev: css-templ templ-gen
	@echo "Go SSR on :$(GO_PORT)  |  Next.js on :$(NEXT_PORT)"
	@trap 'kill 0' EXIT; \
	  PORT=$(GO_PORT) \
	  APP_URL=http://localhost:$(GO_PORT) \
	  API_URL=$${API_URL:-http://localhost:3200} \
	  TX_URL=$${TX_URL:-http://localhost:3300} \
	  NEXTJS_URL=http://localhost:$(NEXT_PORT) \
	  SESSION_COOKIE_SECRET=$${SESSION_COOKIE_SECRET:-CHANGE_ME_generate_a_random_64_char_secret} \
	  go run ./cmd/konsulin-app & \
	  npm run dev -- -p $(NEXT_PORT) & \
	  wait

dev-go: css-templ templ-gen
	PORT=$(GO_PORT) \
	APP_URL=http://localhost:$(GO_PORT) \
	API_URL=$${API_URL:-http://localhost:3200} \
	TX_URL=$${TX_URL:-http://localhost:3300} \
	NEXTJS_URL=http://localhost:$(NEXT_PORT) \
	SESSION_COOKIE_SECRET=$${SESSION_COOKIE_SECRET:-CHANGE_ME_generate_a_random_64_char_secret} \
	go run ./cmd/konsulin-app

dev-next:
	npm run dev -- -p $(NEXT_PORT)

# Build
build-go: css-templ templ-gen
	go build -o konsulin-app ./cmd/konsulin-app

run: css-templ templ-gen
	go run ./cmd/konsulin-app

update-js:
	cp node_modules/htmx.org/dist/htmx.min.js web/static/js/htmx.min.js
	cp node_modules/alpinejs/dist/cdn.min.js web/static/js/alpine.min.js
