# Submission guidelines (the gate)

Every widget is checked by `sillview-widgets validate` — locally and again in CI on
every pull request. The gate is **deterministic**, reads only the widget directory,
and never executes anything, so it is safe to run on untrusted submissions. A widget
that produces any **error**-severity finding is never listed.

## What the gate checks

### Manifest
- Parses as TOML and satisfies every rule in [the widget spec](widget-spec.md):
  valid `name`/`version`/`description`/`author`/`license`/`homepage`, a listable
  `kind` (`builtin`), a `widget_type`, a known `category`/`icon`, a sane
  `default_size`, and well-formed `[[config]]` rows.
- The manifest `name` equals the directory name.

### Structure
- A `README.md` is present.
- The widget is a **single flat directory**: nested directories are rejected.
- **No symlinks** (a classic way to smuggle content or escape the directory).
- Only allowlisted file types: `widget.toml`, `README.md`, and optionally `.json`
  (small static data) or `.png` / `.svg` (a preview image). Anything else —
  including source code — is rejected.

### Size limits
- ≤ 512 KiB per file, ≤ 2 MiB total, ≤ 16 files. Generous for a manifest, a README,
  and a preview; tight enough to make abuse obvious.

## The index must be current

After the gate passes, CI runs `sillview-widgets index --check`. This rebuilds the
catalog from `widgets/` and fails if the committed `registry/index.json` differs (the
`generated_at` timestamp is ignored). **Always** run `npm run index` and commit the
result as part of your PR.

## Review

A maintainer ([CODEOWNERS](../.github/CODEOWNERS)) reviews every widget directory
before merge. Because v1 widgets carry no executable code, review focuses on accuracy
(does the description match the widget?), naming, and metadata quality.
