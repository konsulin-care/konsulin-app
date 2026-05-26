.PHONY: deps test-go test-js test fmt-go check-fmt-go check-file-length
.PHONY: lint-go-cognitive lint-go check-go css-templ dev

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

# Tailwind CSS for templ templates
TAILWIND = .bin/tailwindcss
TAILWIND_INPUT = web/static/css/templ-input.css
TAILWIND_OUTPUT = web/static/css/output.css
TAILWIND_CONTENT = "web/template/**/*.templ"

css-templ:
	$(TAILWIND) -i $(TAILWIND_INPUT) -o $(TAILWIND_OUTPUT) --content $(TAILWIND_CONTENT)

# Dev server (placeholder)
dev:
	@echo "Use: make css-templ && go run ./cmd/konsulin-app"
