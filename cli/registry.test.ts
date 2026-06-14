import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { aggregateHash } from './hash.js';
import { checkWidget, reportOK } from './gate.js';
import { buildIndex, marshalIndex, stripGeneratedAt } from './registry.js';

const MANIFEST = (name: string) => `
name        = "${name}"
version     = "1.0.0"
description = "A demonstration widget used by the registry test suite."
author      = "sillview"
license     = "MIT"
homepage    = "https://github.com/paulmeier/sillview-widgets/tree/main/widgets/${name}"
kind        = "builtin"
widget_type = "${name}"
category    = "Overview"
icon        = "wallet"
default_size = { w = 4, h = 3 }
`;

function writeWidget(root: string, name: string): void {
  const dir = path.join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'widget.toml'), MANIFEST(name));
  writeFileSync(path.join(dir, 'README.md'), `# ${name}\n\nA test widget.\n`);
}

describe('aggregateHash', () => {
  it('is independent of input order', () => {
    const a = [
      { path: 'b.md', sha256: '22' },
      { path: 'a.toml', sha256: '11' },
    ];
    const b = [
      { path: 'a.toml', sha256: '11' },
      { path: 'b.md', sha256: '22' },
    ];
    expect(aggregateHash(a)).toBe(aggregateHash(b));
    expect(aggregateHash(a)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('changes when a file hash changes', () => {
    const base = aggregateHash([{ path: 'a', sha256: '11' }]);
    const changed = aggregateHash([{ path: 'a', sha256: '12' }]);
    expect(base).not.toBe(changed);
  });
});

describe('gate + index', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'sw-test-'));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('passes a well-formed widget and builds a stable index', () => {
    writeWidget(root, 'net-worth');
    writeWidget(root, 'cashflow');

    const rep = checkWidget(path.join(root, 'net-worth'));
    expect(reportOK(rep)).toBe(true);

    const { index, failures } = buildIndex('https://example.com/repo', root, 'widgets');
    expect(failures).toHaveLength(0);
    expect(index.widgets.map((w) => w.name)).toEqual(['cashflow', 'net-worth']); // sorted
    const nw = index.widgets.find((w) => w.name === 'net-worth');
    expect(nw).toBeDefined();
    expect(nw?.content_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(nw?.files.map((f) => f.path)).toEqual(['README.md', 'widget.toml']); // sorted
    expect(nw?.path).toBe('widgets/net-worth');

    // Byte-stable apart from generated_at.
    index.generated_at = '2026-01-01T00:00:00.000Z';
    const a = marshalIndex(index);
    index.generated_at = '2030-12-31T23:59:59.000Z';
    const b = marshalIndex(index);
    expect(stripGeneratedAt(a)).toBe(stripGeneratedAt(b));
  });

  it('fails a widget with a missing README', () => {
    const dir = path.join(root, 'broken');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'widget.toml'), MANIFEST('broken'));
    const rep = checkWidget(dir);
    expect(reportOK(rep)).toBe(false);
    expect(rep.findings.some((f) => f.code === 'tree.readme_missing')).toBe(true);
  });

  it('fails a widget whose name does not match its directory', () => {
    writeWidget(root, 'mismatch');
    writeFileSync(path.join(root, 'mismatch', 'widget.toml'), MANIFEST('other'));
    const rep = checkWidget(path.join(root, 'mismatch'));
    expect(rep.findings.some((f) => f.code === 'manifest.name_mismatch')).toBe(true);
  });

  it('rejects nested directories and disallowed files', () => {
    writeWidget(root, 'messy');
    mkdirSync(path.join(root, 'messy', 'nested'));
    writeFileSync(path.join(root, 'messy', 'evil.js'), 'alert(1)');
    const rep = checkWidget(path.join(root, 'messy'));
    expect(rep.findings.some((f) => f.code === 'tree.nested_dir')).toBe(true);
    expect(rep.findings.some((f) => f.code === 'tree.disallowed_file')).toBe(true);
  });

  it('rejects symlinks', () => {
    writeWidget(root, 'linky');
    symlinkSync('/etc/hosts', path.join(root, 'linky', 'hosts.md'));
    const rep = checkWidget(path.join(root, 'linky'));
    expect(rep.findings.some((f) => f.code === 'tree.symlink')).toBe(true);
  });
});
