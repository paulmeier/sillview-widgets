/**
 * Parses and validates a community widget's `widget.toml`.
 *
 * The manifest is the contract between a widget author, this registry, and the
 * sillview app. A manifest that passes here carries everything the marketplace
 * needs to present a widget with provenance (a semver version, a real description
 * and author, a recognized license, a homepage) AND everything the dashboard needs
 * to render and validate a widget instance (category, icon, default grid size, and
 * the authoritative config contract).
 *
 * This is the TypeScript analog of kasas-plugins' `internal/manifest/manifest.go`,
 * adapted from "sandboxed plugin runtimes" to "dashboard widgets". The validation is
 * deliberately explicit (not schema-driven) so every rejection has a clear, stable
 * message — the same philosophy as the Go gate.
 */

import { parse as parseToml } from 'smol-toml';

/**
 * The widget payload model. Only `builtin` is listable today: its code ships
 * compiled into the sillview app and the registry entry merely gates which built-in
 * `widget_type` a user may add. `spec` (a declarative JSON widget) and `bundle` (a
 * downloadable, sandboxed code widget) are reserved so the index format can grow
 * without a breaking change — the gate rejects them as "not yet supported".
 */
export const KINDS = ['builtin', 'spec', 'bundle'] as const;
export type Kind = (typeof KINDS)[number];

/** Marketplace categories; mirrors sillview's `WidgetCategory` union. */
export const CATEGORIES = ['Overview', 'Accounts', 'Spending', 'Activity', 'Market'] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * Curated icon names. Like kasas-plugins, icons are picked by NAME only — the
 * sillview app owns the SVG (it maps each name to a Remixicon component) — so a
 * widget can never inject markup through its catalog entry.
 */
export const KNOWN_ICONS = [
  'wallet',
  'bank',
  'bar-chart',
  'line-chart',
  'pie-chart',
  'list',
  'activity',
  'refresh',
  'scales',
  'exchange',
  'gauge',
  'coin',
  'star',
  'puzzle',
] as const;
export type IconName = (typeof KNOWN_ICONS)[number];

/** SPDX identifiers the registry accepts (same allowlist as kasas-plugins). */
export const LICENSE_ALLOWLIST = [
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'MIT',
  'MPL-2.0',
  'Unlicense',
] as const;

/**
 * Trust tier, surfaced so the marketplace can group/badge widgets (ADR parity with
 * kasas-plugins). A `builtin` widget is `verified` (first-party code compiled into
 * the app — no new trust surface). `community` is reserved for future downloadable
 * widgets.
 */
export const TIERS = ['verified', 'community'] as const;
export type Tier = (typeof TIERS)[number];

/** Accepted runtime types for one config value (mirrors sillview's WidgetConfigSpec). */
export const CONFIG_TYPES = ['string', 'number', 'string[]'] as const;
export type ConfigType = (typeof CONFIG_TYPES)[number];

/** One config key a widget instance reads — the unit of config validation. */
export interface ConfigSpec {
  key: string;
  types: ConfigType[];
  required: boolean;
  description: string;
}

/** A widget's footprint on the 12-column grid (rowHeight 56px in sillview). */
export interface WidgetSize {
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

/** The parsed, validated `widget.toml`. */
export interface Manifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  homepage: string;
  kind: Kind;
  widgetType: string;
  category: Category;
  icon: IconName;
  tags: string[];
  tier: Tier;
  defaultSize: WidgetSize;
  config: ConfigSpec[];
}

// --- Validation constants (mirror the Go manifest where applicable) ---------

const NAME_RE = /^[a-z0-9][a-z0-9_-]*$/;
/** Config keys are JS object keys a widget reads (camelCase allowed, e.g. accountId). */
const CONFIG_KEY_RE = /^[A-Za-z][A-Za-z0-9_]*$/;
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;
const MIN_DESCRIPTION_LEN = 12;
const MAX_DESCRIPTION_LEN = 200;
const MAX_AUTHOR_LEN = 120;
const MAX_TAGS = 12;
const MAX_TAG_LEN = 30;
const GRID_COLUMNS = 12;

/** Raised on any manifest that fails the registry's rules. */
export class ManifestError extends Error {}

function fail(msg: string): never {
  throw new ManifestError(msg);
}

function asRecord(value: unknown, ctx: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${ctx} must be a table`);
  }
  return value as Record<string, unknown>;
}

function requireString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v !== 'string') fail(`${key} is required and must be a string`);
  return v.trim();
}

function optionalStringArray(obj: Record<string, unknown>, key: string): string[] {
  const v = obj[key];
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) {
    fail(`${key} must be an array of strings`);
  }
  return (v as string[]).map((s) => s.trim());
}

/** Parse and validate a `widget.toml`, returning a normalized Manifest or throwing. */
export function parseManifest(data: string): Manifest {
  let raw: Record<string, unknown>;
  try {
    raw = asRecord(parseToml(data), 'manifest');
  } catch (err) {
    fail(`parse manifest: ${err instanceof Error ? err.message : String(err)}`);
  }

  const name = requireString(raw, 'name');
  if (!NAME_RE.test(name)) {
    fail(`invalid widget name "${name}" (must match ${NAME_RE.source})`);
  }

  const version = requireString(raw, 'version');
  if (!SEMVER_RE.test(version)) {
    fail(`version "${version}" is not a valid semantic version (MAJOR.MINOR.PATCH)`);
  }

  const description = requireString(raw, 'description');
  if (description.length < MIN_DESCRIPTION_LEN || description.length > MAX_DESCRIPTION_LEN) {
    fail(
      `description must be ${MIN_DESCRIPTION_LEN}-${MAX_DESCRIPTION_LEN} characters (got ${description.length})`,
    );
  }

  const author = requireString(raw, 'author');
  if (author === '') fail('author is required and must not be empty');
  if (author.length > MAX_AUTHOR_LEN) {
    fail(`author must be at most ${MAX_AUTHOR_LEN} characters`);
  }

  const license = requireString(raw, 'license');
  if (!(LICENSE_ALLOWLIST as readonly string[]).includes(license)) {
    fail(`license "${license}" is not on the allowlist (allowed: ${LICENSE_ALLOWLIST.join(', ')})`);
  }

  const homepage = requireString(raw, 'homepage');
  validateHttpsUrl(homepage, 'homepage');

  const kind = requireString(raw, 'kind');
  if (!(KINDS as readonly string[]).includes(kind)) {
    fail(`unknown kind "${kind}" (known: ${KINDS.join(', ')})`);
  }
  if (kind !== 'builtin') {
    fail(`kind "${kind}" is reserved but not yet supported for listing (only "builtin" is listable)`);
  }

  // For builtin widgets, widget_type names the compiled-in sillview component.
  const widgetTypeRaw = raw['widget_type'];
  if (typeof widgetTypeRaw !== 'string') {
    fail('widget_type is required for a builtin widget (the compiled-in sillview type, e.g. "net-worth")');
  }
  const widgetType = widgetTypeRaw.trim();
  if (!NAME_RE.test(widgetType)) {
    fail(`invalid widget_type "${widgetType}" (must match ${NAME_RE.source})`);
  }

  const category = requireString(raw, 'category');
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    fail(`unknown category "${category}" (known: ${CATEGORIES.join(', ')})`);
  }

  const iconRaw = raw['icon'];
  if (iconRaw !== undefined && typeof iconRaw !== 'string') fail('icon must be a string');
  let icon = typeof iconRaw === 'string' ? iconRaw.trim() : '';
  if (icon === '') icon = 'puzzle';
  if (!(KNOWN_ICONS as readonly string[]).includes(icon)) {
    fail(`unknown icon "${icon}" (known: ${KNOWN_ICONS.join(', ')})`);
  }

  const tags = optionalStringArray(raw, 'tags');
  if (tags.length > MAX_TAGS) fail(`at most ${MAX_TAGS} tags are allowed (got ${tags.length})`);
  for (const t of tags) {
    if (t === '') fail('tags must not contain empty strings');
    if (t.length > MAX_TAG_LEN) fail(`tag "${t}" is over the ${MAX_TAG_LEN}-character limit`);
  }

  const tierRaw = raw['tier'];
  if (tierRaw !== undefined && typeof tierRaw !== 'string') fail('tier must be a string');
  let tier = typeof tierRaw === 'string' ? tierRaw.trim() : '';
  if (tier === '') tier = 'verified';
  if (!(TIERS as readonly string[]).includes(tier)) {
    fail(`unknown tier "${tier}" (known: ${TIERS.join(', ')})`);
  }
  if (kind === 'builtin' && tier !== 'verified') {
    fail('a builtin widget must be tier "verified" (its code is first-party, compiled into the app)');
  }

  const defaultSize = parseDefaultSize(raw['default_size']);
  const config = parseConfig(raw['config']);

  return {
    name,
    version,
    description,
    author,
    license,
    homepage,
    kind: kind as Kind,
    widgetType,
    category: category as Category,
    icon: icon as IconName,
    tags,
    tier: tier as Tier,
    defaultSize,
    config,
  };
}

function parseDefaultSize(value: unknown): WidgetSize {
  const o = asRecord(value, 'default_size');
  const w = o['w'];
  const h = o['h'];
  if (typeof w !== 'number' || !Number.isInteger(w) || w < 1 || w > GRID_COLUMNS) {
    fail(`default_size.w must be an integer between 1 and ${GRID_COLUMNS}`);
  }
  if (typeof h !== 'number' || !Number.isInteger(h) || h < 1) {
    fail('default_size.h must be an integer of at least 1');
  }
  const size: WidgetSize = { w, h };
  if (o['minW'] !== undefined) {
    const minW = o['minW'];
    if (typeof minW !== 'number' || !Number.isInteger(minW) || minW < 1 || minW > w) {
      fail('default_size.minW must be an integer between 1 and w');
    }
    size.minW = minW;
  }
  if (o['minH'] !== undefined) {
    const minH = o['minH'];
    if (typeof minH !== 'number' || !Number.isInteger(minH) || minH < 1 || minH > h) {
      fail('default_size.minH must be an integer between 1 and h');
    }
    size.minH = minH;
  }
  return size;
}

function parseConfig(value: unknown): ConfigSpec[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail('config must be an array of [[config]] tables');
  const out: ConfigSpec[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const o = asRecord(entry, 'config entry');
    const key = requireString(o, 'key');
    if (!CONFIG_KEY_RE.test(key)) fail(`config key "${key}" must match ${CONFIG_KEY_RE.source}`);
    if (seen.has(key)) fail(`duplicate config key "${key}"`);
    seen.add(key);

    const types = o['types'];
    if (!Array.isArray(types) || types.length === 0) {
      fail(`config.${key}.types must be a non-empty array`);
    }
    for (const t of types) {
      if (typeof t !== 'string' || !(CONFIG_TYPES as readonly string[]).includes(t)) {
        fail(`config.${key}.types contains an unknown type (allowed: ${CONFIG_TYPES.join(', ')})`);
      }
    }
    const description = requireString(o, 'description');
    const required = o['required'] === undefined ? false : o['required'] === true;
    if (o['required'] !== undefined && typeof o['required'] !== 'boolean') {
      fail(`config.${key}.required must be a boolean`);
    }
    out.push({ key, types: types as ConfigType[], required, description });
  }
  return out;
}

function validateHttpsUrl(value: string, field: string): void {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    fail(`${field} "${value}" is not a valid URL`);
  }
  if (u.protocol !== 'https:') fail(`${field} "${value}" must use https`);
  if (u.hostname === '') fail(`${field} "${value}" must include a host`);
}
