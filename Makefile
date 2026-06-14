# sillview-widgets — registry tooling shortcuts.
# Run `make help` for the list.

SHELL := /bin/bash

.DEFAULT_GOAL := help

node_modules: package.json package-lock.json ## Install dependencies when stale
	npm install
	@touch node_modules

.PHONY: build
build: node_modules ## Bundle the CLI to dist/cli.mjs
	npm run build

.PHONY: test
test: node_modules ## Typecheck, lint, and run unit tests (the CI tooling gate)
	npm run typecheck
	npm run lint
	npm test

.PHONY: validate
validate: build ## Gate every widget under ./widgets
	node dist/cli.mjs validate

.PHONY: index
index: build ## Regenerate registry/index.json
	node dist/cli.mjs index

.PHONY: check
check: build ## Verify the committed index is current (CI gate)
	node dist/cli.mjs index --check

.PHONY: seed
seed: ## Regenerate the built-in widget directories from the seed table
	npm run seed

.PHONY: gate
gate: test validate check ## Everything CI runs

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
