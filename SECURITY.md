# Security

## Trust model

The widgets listed in this registry are, today, **metadata only**. A `builtin`
widget's behavior is implemented by code that ships **compiled into the sillview
application** — this repository does not contain or distribute any executable widget
payload. "Installing" a widget in sillview records that the user has chosen to make a
built-in widget available; it downloads no code.

Consequently the registry's job is **integrity and provenance**, not sandboxing:

- Every listed widget passes an automated gate (`sillview-widgets validate`):
  a valid manifest, a name that matches its directory, a flat directory with no
  symlinks or disallowed files, and conservative size limits.
- The generated catalog (`registry/index.json`) records a per-file SHA-256 and an
  aggregate `content_hash` for each widget. These let the sillview app detect
  tampering or drift between "reviewed in this repo" and "fetched on a machine".
- `registry.yml` republishes the index on every push to `main`, and CI
  (`index --check`) blocks any change whose committed index is stale, so the
  published catalog always reflects exactly what was reviewed.

When future `spec` and `bundle` kinds are introduced, this document will be expanded
to cover their additional trust boundaries (declarative-spec validation and
sandboxed code execution, respectively).

## Reporting a vulnerability

Please report suspected security issues with the registry tooling, the catalog, or a
listed widget privately to **dangers_flyer.3p@icloud.com**. Do not open a public
issue for a security report. We will acknowledge receipt and work with you on a fix
and coordinated disclosure.
