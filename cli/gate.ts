/**
 * The submission gate: the automated checks a community widget must clear before it
 * can be listed in the registry. The goal mirrors kasas-plugins' gate — give a
 * sillview user high confidence that an installed widget is what it claims to be —
 * adapted to the widget model, where v1 widgets carry NO executable code (their
 * React implementation ships compiled into the app, keyed by `widget_type`). So the
 * gate here is the structural + manifest layer of the Go gate; the runtime
 * static-analysis layer has no analog yet (it returns when downloadable `bundle`
 * widgets land).
 *
 * The gate is deterministic, reads only the widget directory, and never executes
 * anything — safe to run on untrusted submissions in CI.
 */

import { readdirSync, readFileSync, statSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { parseManifest, ManifestError, type Manifest } from './manifest.js';

export type Severity = 'error' | 'warning';

export interface Finding {
  severity: Severity;
  code: string;
  message: string;
  file?: string;
}

export interface Report {
  dir: string;
  name: string;
  manifest?: Manifest;
  findings: Finding[];
}

export function reportOK(r: Report): boolean {
  return !r.findings.some((f) => f.severity === 'error');
}

export interface Limits {
  maxFileBytes: number;
  maxTotalBytes: number;
  maxFiles: number;
}

export function defaultLimits(): Limits {
  return {
    maxFileBytes: 512 * 1024, // 512 KiB — generous for a README + a preview image
    maxTotalBytes: 2 * 1024 * 1024, // 2 MiB
    maxFiles: 16,
  };
}

/**
 * Files a widget directory may contain. A widget is a single flat directory: the
 * manifest, a README, optionally small static data and a preview image. Everything
 * else (code, binaries, archives, nested dirs) is rejected so the reviewable surface
 * stays small — there is no executable widget payload in v1.
 */
const ALLOWED_EXTS = new Set(['.toml', '.md', '.json', '.png', '.svg']);

/** Run the full gate against a widget directory and return a Report. */
export function checkWidget(dir: string, limits: Limits = defaultLimits()): Report {
  const name = path.basename(dir);
  const findings: Finding[] = [];
  const add = (severity: Severity, code: string, message: string, file?: string) =>
    findings.push({ severity, code, message, file });

  let manifest: Manifest | undefined;
  try {
    const data = readFileSync(path.join(dir, 'widget.toml'), 'utf8');
    manifest = parseManifest(data);
  } catch (err) {
    if (err instanceof ManifestError) add('error', 'manifest.invalid', err.message);
    else add('error', 'manifest.missing', `could not read widget.toml: ${(err as Error).message}`);
    return { dir, name, manifest, findings };
  }

  if (manifest.name !== name) {
    add(
      'error',
      'manifest.name_mismatch',
      `manifest name "${manifest.name}" must equal the directory name "${name}"`,
    );
  }

  checkTree(dir, findings, limits, add);

  return { dir, name, manifest, findings };
}

function checkTree(
  dir: string,
  _findings: Finding[],
  limits: Limits,
  add: (severity: Severity, code: string, message: string, file?: string) => void,
): void {
  let total = 0;
  let fileCount = 0;
  let sawReadme = false;
  let sawManifest = false;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = entry.name;
    const full = path.join(dir, rel);

    // Reject symlinks outright (a classic way to smuggle content or escape the dir).
    const ls = lstatSync(full);
    if (ls.isSymbolicLink()) {
      add('error', 'tree.symlink', 'symlinks are not allowed in a widget', rel);
      continue;
    }
    if (entry.isDirectory()) {
      add(
        'error',
        'tree.nested_dir',
        'nested directories are not allowed; a widget is a single flat directory',
        rel,
      );
      continue;
    }
    if (!entry.isFile()) {
      add('error', 'tree.not_a_file', 'only regular files are allowed', rel);
      continue;
    }

    fileCount++;
    const size = statSync(full).size;
    total += size;
    if (size > limits.maxFileBytes) {
      add(
        'error',
        'tree.file_too_large',
        `file is ${size} bytes, over the ${limits.maxFileBytes}-byte per-file limit`,
        rel,
      );
    }

    if (rel === 'widget.toml') {
      sawManifest = true;
    } else if (rel.toLowerCase() === 'readme.md') {
      sawReadme = true;
    } else if (!ALLOWED_EXTS.has(path.extname(rel).toLowerCase())) {
      add(
        'error',
        'tree.disallowed_file',
        `file type not allowed in a widget (allowed: widget.toml, README.md, and ${[...ALLOWED_EXTS].sort().join(', ')})`,
        rel,
      );
    }
  }

  if (!sawManifest) add('error', 'tree.manifest_missing', 'widget.toml is required');
  if (!sawReadme) {
    add('error', 'tree.readme_missing', 'a README.md is required so users can understand the widget');
  }
  if (fileCount > limits.maxFiles) {
    add('error', 'tree.too_many_files', `${fileCount} files, over the limit of ${limits.maxFiles}`);
  }
  if (total > limits.maxTotalBytes) {
    add('error', 'tree.too_large', `widget is ${total} bytes, over the ${limits.maxTotalBytes}-byte limit`);
  }
}

/** Format a finding for human-facing CLI output. */
export function formatFinding(f: Finding): string {
  const loc = f.file ? ` (${f.file})` : '';
  return `[${f.severity}] ${f.code}: ${f.message}${loc}`;
}
