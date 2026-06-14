# Widget manifest (`widget.toml`)

Every widget directory contains a `widget.toml`. It is the contract between an author,
this registry, and the sillview app. The authoritative validator is
`sillview-widgets validate`; the [JSON Schema](../schema/widget.schema.json) provides
editor validation for TOML-aware editors.

## Example

```toml
name        = "transactions"
version     = "1.0.0"
description = "The most recent transactions across all accounts."
author      = "sillview"
license     = "MIT"
homepage    = "https://github.com/paulmeier/sillview-widgets/tree/main/widgets/transactions"
kind        = "builtin"
widget_type = "transactions"
category    = "Activity"
icon        = "list"
tags        = ["transactions", "activity", "ledger"]
default_size = { w = 6, h = 7, minW = 4, minH = 4 }

[[config]]
key         = "limit"
types       = ["number", "string"]
description = "How many recent transactions to list (default 40)."

[[config]]
key         = "accountId"
types       = ["string"]
description = "Restrict to a single account id; omit for all accounts."
```

## Field reference

| Field | Required | Rules |
| ----- | -------- | ----- |
| `name` | yes | Lowercase slug `^[a-z0-9][a-z0-9_-]*$`. **Must equal the directory name.** |
| `version` | yes | Semantic version `MAJOR.MINOR.PATCH` (pre-release/build metadata allowed). |
| `description` | yes | 12–200 characters. Shown on the marketplace card. |
| `author` | yes | ≤120 characters. |
| `license` | yes | SPDX id: one of `0BSD`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `MIT`, `MPL-2.0`, `Unlicense`. |
| `homepage` | yes | `https://` URL where users can read about the widget. |
| `kind` | yes | `builtin` (only listable kind today). `spec` and `bundle` are reserved and rejected. |
| `widget_type` | yes (builtin) | Slug naming the compiled-in sillview widget this entry maps to. |
| `category` | yes | One of `Overview`, `Accounts`, `Spending`, `Activity`, `Market`. |
| `icon` | no | Curated icon name (see below); defaults to `puzzle`. |
| `tags` | no | Up to 12 short tags used for search/filter. |
| `tier` | no | `verified` (default; a builtin's code is first-party) or `community`. |
| `default_size` | yes | Inline table `{ w, h, minW?, minH? }`. `w` is 1–12 (grid columns); `minW ≤ w`, `minH ≤ h`. |
| `[[config]]` | no | Repeatable. Declares each config key the widget reads. |

### `[[config]]` rows

| Field | Required | Rules |
| ----- | -------- | ----- |
| `key` | yes | The config key the widget reads (e.g. `limit`, `accountId`). Identifier `^[A-Za-z][A-Za-z0-9_]*$`. Unique within the widget. |
| `types` | yes | Non-empty array of accepted value types: `string`, `number`, `string[]`. |
| `required` | no | `true` if the widget cannot render without it. Defaults to `false`. |
| `description` | yes | What the key does. |

### Curated icons

`wallet`, `bank`, `bar-chart`, `line-chart`, `pie-chart`, `list`, `activity`,
`refresh`, `scales`, `exchange`, `gauge`, `coin`, `star`, `puzzle`. The sillview app
owns the SVG for each name — a widget can never inject markup through its icon.
