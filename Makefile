# FlowManner HIL Dashboard — convenience targets

.PHONY: install dev build seed seed-cli db-push db-studio health clean

install:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

db-push:
	pnpm db:push

db-studio:
	pnpm db:studio

# Seed via the running Next.js app's API (after `make dev` is up).
seed:
	curl -sS -X POST http://localhost:3000/api/seed | head -c 400 ; echo

# Seed by running the script directly (no Next.js needed).
seed-cli:
	pnpm seed

# Health check.
health:
	curl -sS http://localhost:3000/api/health ; echo

clean:
	rm -rf .next node_modules