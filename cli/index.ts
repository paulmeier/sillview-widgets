/**
 * Command `sillview-widgets` — the registry's tooling. It gates community widget
 * submissions and builds the index the sillview app consumes. It is the single
 * binary CI runs and the same one a contributor runs locally before opening a PR.
 *
 *   sillview-widgets validate [widget-dir ...]   # gate one or more widgets (default: all)
 *   sillview-widgets index [--check] [--out f]   # build registry/index.json (or verify it)
 *
 * validate exits non-zero if any widget fails the gate. index --check exits non-zero
 * if the committed index does not match the widgets directory — the CI gate that
 * keeps the published index honest.
 *
 * TypeScript analog of kasas-plugins' `cmd/kasas-plugins/main.go`.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { checkWidget, reportOK, formatFinding, defaultLimits, type Report } from './gate.js';
import { buildIndex, marshalIndex, stripGeneratedAt } from './registry.js';

const REPO_URL = 'https://github.com/paulmeier/sillview-widgets';
const WIDGETS_DIR = 'widgets';
const DEFAULT_INDEX_PATH = 'registry/index.json';

function usage(): void {
  process.stderr.write(`sillview-widgets — community widget registry tooling

Usage:
  sillview-widgets validate [widget-dir ...]
        gate widgets (default: every widget under ./widgets).
  sillview-widgets index [--check] [--out f]
        build registry/index.json (--check verifies it is current).
`);
}

function main(): void {
  const [, , cmd, ...args] = process.argv;
  try {
    switch (cmd) {
      case 'validate':
        cmdValidate(args);
        break;
      case 'index':
        cmdIndex(args);
        break;
      case '-h':
      case '--help':
      case 'help':
        usage();
        break;
      default:
        process.stderr.write(`unknown command ${cmd ? `"${cmd}"` : '(none)'}\n\n`);
        usage();
        process.exit(2);
    }
  } catch (err) {
    process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

function cmdValidate(args: string[]): void {
  let dirs = args.filter((a) => !a.startsWith('-'));
  const unknown = args.find((a) => a.startsWith('-'));
  if (unknown) throw new Error(`unknown flag "${unknown}"`);

  if (dirs.length === 0) dirs = allWidgetDirs(WIDGETS_DIR);
  if (dirs.length === 0) {
    process.stdout.write(`no widgets found under ${WIDGETS_DIR}\n`);
    return;
  }

  const limits = defaultLimits();
  let failed = 0;
  for (const d of dirs) {
    const report = checkWidget(d, limits);
    printReport(report);
    if (!reportOK(report)) failed++;
  }
  process.stdout.write(`\n${dirs.length} widget(s) checked, ${failed} failed.\n`);
  if (failed > 0) throw new Error(`${failed} widget(s) failed the submission gate`);
}

function cmdIndex(args: string[]): void {
  let out = DEFAULT_INDEX_PATH;
  let check = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check') check = true;
    else if (args[i] === '--out') {
      if (i + 1 >= args.length) throw new Error('--out requires a path');
      out = args[++i];
    } else throw new Error(`unknown flag "${args[i]}"`);
  }

  const { index, failures } = buildIndex(REPO_URL, WIDGETS_DIR, WIDGETS_DIR);
  if (failures.length > 0) {
    process.stderr.write('cannot build index: the following widgets fail the gate:\n');
    for (const rep of failures) printReport(rep);
    throw new Error(`${failures.length} widget(s) fail the gate; fix them before regenerating the index`);
  }
  index.generated_at = new Date().toISOString();
  const data = marshalIndex(index);

  if (check) {
    checkIndex(out, data);
    return;
  }
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, data);
  process.stdout.write(`wrote ${out} (${index.widgets.length} widget(s))\n`);
}

function checkIndex(file: string, fresh: string): void {
  if (!existsSync(file)) {
    throw new Error(`committed index ${file} is missing (run \`sillview-widgets index\` and commit it)`);
  }
  const committed = readFileSync(file, 'utf8');
  if (stripGeneratedAt(committed) === stripGeneratedAt(fresh)) {
    process.stdout.write(`${file} is up to date.\n`);
    return;
  }
  throw new Error(`${file} is out of date; run \`sillview-widgets index\` and commit the result`);
}

function printReport(report: Report): void {
  const status = reportOK(report) ? 'PASS' : 'FAIL';
  let line = `\n${status}  ${report.name}`;
  if (report.manifest) {
    line += `  (${report.manifest.version}, ${report.manifest.kind}, ${report.manifest.category})`;
  }
  process.stdout.write(line + '\n');
  for (const f of report.findings) process.stdout.write('   ' + formatFinding(f) + '\n');
}

/** Immediate subdirectories of root that contain a widget.toml. */
function allWidgetDirs(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = path.join(root, entry.name, 'widget.toml');
    if (existsSync(manifest) && statSync(manifest).isFile()) out.push(path.join(root, entry.name));
  }
  return out;
}

main();
