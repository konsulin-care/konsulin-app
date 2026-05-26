.PHONY: all setup setup-cursor setup-windsurf setup-claude clean

all: setup

setup-cursor:
	ln -sf AGENTS.md .cursorrules
	@echo "  .cursorrules -> AGENTS.md"

setup-windsurf:
	ln -sf AGENTS.md .windsurfrules
	@echo "  .windsurfrules -> AGENTS.md"

setup-claude:
	ln -sf AGENTS.md CLAUDE.md
	@echo "  CLAUDE.md -> AGENTS.md"

setup: setup-cursor setup-windsurf setup-claude
	@echo "---"
	@echo "Symlinks created. Tools now read AGENTS.md as their instruction file."

clean:
	rm -f .cursorrules .windsurfrules CLAUDE.md
	@echo "Symlinks removed."
