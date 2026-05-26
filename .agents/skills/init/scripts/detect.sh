# Auto-detect project configuration — run during Phase 1
# Each command outputs a label if the file/tool is found

# Runtime / language
test -f package.json && echo "Node/JS: $(node -v 2>/dev/null)" || true
test -f go.mod && echo "Go: $(head -1 go.mod)" || true
test -f Cargo.toml && echo "Rust" || true
test -f pyproject.toml && echo "Python: $(python3 --version 2>/dev/null)" || true

# Extra config
test -f tsconfig.json && echo "TypeScript" || true
test -f Dockerfile && echo "Docker" || true
test -f Makefile && echo "Makefile" || true
ls .github/workflows/ 2>/dev/null && echo "CI: GitHub Actions" || true

# Lock files (env manager hints)
ls pixi.lock conda-lock poetry.lock uv.lock 2>/dev/null

# Frameworks
grep -q '"next"' package.json 2>/dev/null && echo "Framework: Next.js" || true
grep -q '"express"' package.json 2>/dev/null && echo "Framework: Express" || true
