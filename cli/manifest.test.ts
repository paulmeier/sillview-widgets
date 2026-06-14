import { describe, expect, it } from 'vitest';
import { parseManifest, ManifestError } from './manifest.js';

const VALID = `
name        = "net-worth"
version     = "1.0.0"
description = "Total balance across all accounts, grouped by currency."
author      = "sillview"
license     = "MIT"
homepage    = "https://github.com/paulmeier/sillview-widgets/tree/main/widgets/net-worth"
kind        = "builtin"
widget_type = "net-worth"
category    = "Overview"
icon        = "wallet"
tags        = ["balance", "currency"]
default_size = { w = 4, h = 3, minW = 3, minH = 2 }
`;

const WITH_CONFIG = `
name        = "transactions"
version     = "1.2.0"
description = "The most recent transactions across all accounts."
author      = "sillview"
license     = "MIT"
homepage    = "https://github.com/paulmeier/sillview-widgets/tree/main/widgets/transactions"
kind        = "builtin"
widget_type = "transactions"
category    = "Activity"
icon        = "list"
default_size = { w = 6, h = 7, minW = 4, minH = 4 }

[[config]]
key = "limit"
types = ["number", "string"]
description = "How many recent transactions to list (default 40)."

[[config]]
key = "accountId"
types = ["string"]
required = false
description = "Restrict to a single account id; omit for all accounts."
`;

describe('parseManifest', () => {
  it('parses a valid builtin manifest', () => {
    const m = parseManifest(VALID);
    expect(m.name).toBe('net-worth');
    expect(m.kind).toBe('builtin');
    expect(m.widgetType).toBe('net-worth');
    expect(m.category).toBe('Overview');
    expect(m.icon).toBe('wallet');
    expect(m.tier).toBe('verified');
    expect(m.defaultSize).toEqual({ w: 4, h: 3, minW: 3, minH: 2 });
    expect(m.config).toEqual([]);
  });

  it('parses config rows with defaults', () => {
    const m = parseManifest(WITH_CONFIG);
    expect(m.config).toHaveLength(2);
    expect(m.config[0]).toEqual({
      key: 'limit',
      types: ['number', 'string'],
      required: false,
      description: 'How many recent transactions to list (default 40).',
    });
  });

  const cases: [string, string][] = [
    ['bad name', VALID.replace('"net-worth"', '"Net Worth"')],
    ['bad semver', VALID.replace('"1.0.0"', '"1.0"')],
    ['short description', VALID.replace(/description = ".*"/, 'description = "too short"')],
    ['bad license', VALID.replace('"MIT"', '"WTFPL"')],
    ['non-https homepage', VALID.replace('https://', 'http://')],
    ['unknown category', VALID.replace('"Overview"', '"Nonsense"')],
    ['unknown icon', VALID.replace('"wallet"', '"banana"')],
    ['reserved kind', VALID.replace('"builtin"', '"bundle"')],
    ['oversized grid w', VALID.replace('w = 4', 'w = 13')],
    ['empty author', VALID.replace('author      = "sillview"', 'author      = ""')],
    ['whitespace author', VALID.replace('author      = "sillview"', 'author      = "   "')],
    ['non-string icon', VALID.replace('icon        = "wallet"', 'icon        = 5')],
    ['non-string tier', VALID + '\ntier = 7\n'],
  ];
  for (const [label, toml] of cases) {
    it(`rejects ${label}`, () => {
      expect(() => parseManifest(toml)).toThrow(ManifestError);
    });
  }

  it('requires widget_type for a builtin', () => {
    const noType = VALID.replace(/widget_type = ".*"\n/, '');
    expect(() => parseManifest(noType)).toThrow(/widget_type is required/);
  });

  it('rejects duplicate config keys', () => {
    const dup = WITH_CONFIG + `
[[config]]
key = "limit"
types = ["number"]
description = "A duplicate key that should be rejected."
`;
    expect(() => parseManifest(dup)).toThrow(/duplicate config key/);
  });
});
