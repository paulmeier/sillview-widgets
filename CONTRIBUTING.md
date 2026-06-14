# Contributing a widget

Thank you for extending sillview! This document is the contract for getting a widget
into the community registry. The goal of every rule here is one thing: a sillview
user should be able to install your widget with **high confidence** that it is what
it says it is.

If anything below is unclear, open a
[widget submission proposal](https://github.com/paulmeier/sillview-widgets/issues/new?template=widget_submission.yml)
to discuss before writing anything.

## 1. Understand the model

A sillview dashboard widget is a tile that renders data from the
[kasas](https://github.com/paulmeier/kasas) ledger. There are three possible
**kinds**, but only one is listable today:

- **`builtin`** *(the only listable kind today)* — the widget's React implementation
  ships **compiled into the sillview app**, keyed by `widget_type`. The registry
  entry is pure metadata: it tells the app the widget exists, what it does, its
  category/icon/default size, and its configuration contract, and it **gates** which
  built-in widgets a user may add to a dashboard. No code is downloaded.
- **`spec`** *(reserved)* — a declarative JSON widget (a kasas data source + a
  transform + a chart) rendered by a generic in-app renderer. Not yet supported.
- **`bundle`** *(reserved)* — a downloadable, sandboxed code widget. Not yet
  supported.

The manifest format reserves `spec` and `bundle` so the registry can grow into them
without a breaking change. Submitting a non-`builtin` widget is rejected by the gate.

## 2. Lay out your widget

Create exactly this under `widgets/<name>/`:

```text
widgets/<name>/
  widget.toml     # manifest (required)
  README.md       # what the widget shows and how to configure it (required)
```

A widget is a **single flat directory**. No nested directories, no symlinks, and no
file types beyond `widget.toml`, `README.md`, and (optionally) small `.json` data or
a `.png`/`.svg` preview. There is no executable payload.

## 3. Write the manifest

See [docs/widget-spec.md](docs/widget-spec.md) for the full field reference. A
minimal manifest:

```toml
name        = "net-worth"
version     = "1.0.0"
description = "Total balance across all accounts, grouped by currency."
author      = "your name"
license     = "MIT"
homepage    = "https://github.com/paulmeier/sillview-widgets/tree/main/widgets/net-worth"
kind        = "builtin"
widget_type = "net-worth"
category    = "Overview"
icon        = "wallet"
tags        = ["balance", "currency"]
default_size = { w = 4, h = 3, minW = 3, minH = 2 }
```

Rules the gate enforces (all of `sillview-widgets validate`):

- `name` is a lowercase slug and **must equal the directory name**.
- `version` is semver; `description` is 12–200 chars; `author` is required.
- `license` is on the SPDX allowlist; `homepage` is an `https://` URL.
- `kind` must be `builtin`; `widget_type` is required and is a slug.
- `category` and `icon` are from the curated sets; `default_size` fits the 12-column grid.
- Any `[[config]]` rows declare the keys the widget reads, with their accepted types.

## 4. Run the gate locally

```sh
npm install
npm run validate     # gate every widget (build + structural + manifest checks)
npm run index        # regenerate registry/index.json
git add widgets/<name> registry/index.json
```

CI re-runs the exact same gate on your PR and additionally verifies that
`registry/index.json` is current (`index --check`). A PR whose committed index is
stale fails — always commit the regenerated index.

## 5. Licensing

The repository and tooling are MIT. **Your widget is licensed independently** under
the SPDX `license` you declare in `widget.toml`. By submitting, you affirm you have
the right to publish it under that license. There is no separate CLA.
