# sillview-widgets

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Validate](https://github.com/paulmeier/sillview-widgets/actions/workflows/validate.yml/badge.svg)](https://github.com/paulmeier/sillview-widgets/actions/workflows/validate.yml)

The community widget registry for the [sillview](https://github.com/paulmeier/sillview)
dashboard. Each widget lives in its own directory under [`widgets/`](widgets), is
gated by an automated submission pipeline, and is published into a single
machine-readable catalog the sillview app fetches to let users **install** widgets
before adding them to a dashboard.

```
                 widgets/<name>/widget.toml          (you write this)
                          │
            sillview-widgets validate                (the submission gate, in CI)
                          │
            sillview-widgets index  ──►  registry/index.json   (the catalog)
                          │
   raw.githubusercontent.com / GitHub Pages          (sillview fetches it)
                          │
            "Install" in sillview → add to a dashboard
```

## What's here

| Path | What it is |
| ---- | ---------- |
| [`widgets/`](widgets) | One directory per widget: a `widget.toml` manifest + a `README.md`. |
| [`registry/index.json`](registry/index.json) | The generated catalog (per-file SHA-256 + an aggregate `content_hash`). **Committed; source of truth.** |
| [`cli/`](cli) | The Node/TypeScript tooling: `validate` (the gate) and `index` (the catalog builder). |
| [`schema/widget.schema.json`](schema/widget.schema.json) | JSON Schema for `widget.toml` (editor validation). |
| [`docs/`](docs) | The [widget spec](docs/widget-spec.md), [submission guidelines](docs/submission-guidelines.md), and [registry schema](docs/registry.md). |

## Submitting a widget

Read [`CONTRIBUTING.md`](CONTRIBUTING.md). In short:

1. Create `widgets/<name>/widget.toml` + `widgets/<name>/README.md`.
2. Run the gate locally: `npm install && npm run validate`.
3. Regenerate the catalog: `npm run index` and commit `registry/index.json`.
4. Open a PR. CI re-runs the gate and verifies the index is current.

> **Today** the registry lists **built-in** widgets — their React implementation
> ships compiled into the sillview app, and a registry entry gates which ones a user
> may add. The manifest's `kind` field reserves `spec` (declarative JSON widgets) and
> `bundle` (downloadable, sandboxed code widgets) so the format can grow without a
> breaking change.

## The tooling

```sh
npm install
npm run build          # bundle the CLI to dist/cli.mjs
npm test               # unit tests
npm run validate       # gate every widget under ./widgets
npm run index          # (re)write registry/index.json
npm run index:check    # verify the committed index is current (CI gate)
```

## License

The registry tooling and repository are licensed under the [MIT License](LICENSE).
**Each widget is licensed independently** under the SPDX license declared in its
`widget.toml` (`license = "…"`). This mirrors the
[kasas-plugins](https://github.com/paulmeier/kasas-plugins) model.

For commercial licensing of the sillview application itself, see the
[sillview](https://github.com/paulmeier/sillview) repository.
