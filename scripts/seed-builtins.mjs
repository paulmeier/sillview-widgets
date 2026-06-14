#!/usr/bin/env node
/**
 * Seeds widgets/<slug>/{widget.toml, README.md} for sillview's first-party built-in
 * widgets. This is a one-time / regeneration helper: the canonical implementation of
 * each widget lives (compiled) in the sillview app, keyed by `widget_type`. Edit the
 * table below and re-run `npm run seed` to regenerate, then `npm run index`.
 *
 * The table mirrors sillview/src/shared/widgets.ts WIDGET_META, enriched with a
 * curated icon name and tags for the marketplace.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'https://github.com/paulmeier/sillview-widgets';

/** @typedef {{key:string,types:string[],required?:boolean,description:string}} Config */
const WIDGETS = [
  {
    name: 'net-worth',
    version: '1.0.0',
    title: 'Net Worth',
    description: 'Total balance across all accounts, grouped by currency.',
    category: 'Overview',
    icon: 'wallet',
    tags: ['balance', 'currency', 'overview'],
    defaultSize: { w: 4, h: 3, minW: 3, minH: 2 },
    config: [],
  },
  {
    name: 'sync-status',
    version: '1.0.0',
    title: 'Sync Status',
    description: 'Backend connectivity and the most recent sync run.',
    category: 'Overview',
    icon: 'refresh',
    tags: ['sync', 'status', 'health'],
    defaultSize: { w: 4, h: 3, minW: 3, minH: 2 },
    config: [],
  },
  {
    name: 'accounts-list',
    version: '1.0.0',
    title: 'Accounts',
    description: 'Every account with its current balance.',
    category: 'Accounts',
    icon: 'bank',
    tags: ['accounts', 'balance'],
    defaultSize: { w: 4, h: 6, minW: 3, minH: 3 },
    config: [],
  },
  {
    name: 'account-balances',
    version: '1.0.0',
    title: 'Account Balances',
    description: 'Bar chart comparing balances across accounts.',
    category: 'Accounts',
    icon: 'bar-chart',
    tags: ['accounts', 'balance', 'chart'],
    defaultSize: { w: 4, h: 6, minW: 3, minH: 4 },
    config: [],
  },
  {
    name: 'transactions',
    version: '1.0.0',
    title: 'Transactions',
    description: 'The most recent transactions across all accounts.',
    category: 'Activity',
    icon: 'list',
    tags: ['transactions', 'activity', 'ledger'],
    defaultSize: { w: 6, h: 7, minW: 4, minH: 4 },
    config: [
      {
        key: 'limit',
        types: ['number', 'string'],
        description: 'How many recent transactions to list (default 40).',
      },
      {
        key: 'accountId',
        types: ['string'],
        description: 'Restrict to a single account id; omit for all accounts.',
      },
    ],
  },
  {
    name: 'spend-by-label',
    version: '1.0.0',
    title: 'Spending Breakdown',
    description: 'Outflow grouped by your most-used label (or payee).',
    category: 'Spending',
    icon: 'pie-chart',
    tags: ['spending', 'labels', 'chart'],
    defaultSize: { w: 4, h: 6, minW: 3, minH: 4 },
    config: [],
  },
  {
    name: 'cashflow',
    version: '1.0.0',
    title: 'Cash Flow',
    description: 'Money in vs. out per month over the last six months.',
    category: 'Spending',
    icon: 'exchange',
    tags: ['cashflow', 'income', 'expenses', 'chart'],
    defaultSize: { w: 8, h: 5, minW: 4, minH: 4 },
    config: [],
  },
  {
    name: 'activity-feed',
    version: '1.0.0',
    title: 'Live Activity',
    description: 'A live feed of change events streamed from kasas.',
    category: 'Activity',
    icon: 'activity',
    tags: ['activity', 'live', 'events'],
    defaultSize: { w: 4, h: 6, minW: 3, minH: 3 },
    config: [],
  },
  {
    name: 'benchmark-comparison',
    version: '1.0.0',
    title: 'Benchmark Comparison',
    description: 'A market series as "growth of $10k" alongside an account balance, for context.',
    category: 'Market',
    icon: 'scales',
    tags: ['market', 'benchmark', 'comparison', 'chart'],
    defaultSize: { w: 8, h: 5, minW: 4, minH: 4 },
    config: [
      {
        key: 'series',
        types: ['string'],
        required: true,
        description: 'A market series id (e.g. "spy").',
      },
      {
        key: 'account',
        types: ['string'],
        required: true,
        description: 'An account id (e.g. "acc_brokerage").',
      },
    ],
  },
  {
    name: 'market-series',
    version: '1.0.0',
    title: 'Market Series',
    description: 'Overlay one or more market series on one chart — two or more compare as growth of $10k.',
    category: 'Market',
    icon: 'line-chart',
    tags: ['market', 'series', 'chart'],
    defaultSize: { w: 6, h: 5, minW: 4, minH: 3 },
    config: [
      {
        key: 'series',
        types: ['string', 'string[]'],
        required: true,
        description: 'One market series id, or an array of ids to overlay (e.g. ["spy","agg"]).',
      },
    ],
  },
];

function tomlString(s) {
  return JSON.stringify(s); // TOML basic strings share JSON's escaping for our content
}

function sizeTable(s) {
  const parts = [`w = ${s.w}`, `h = ${s.h}`];
  if (s.minW !== undefined) parts.push(`minW = ${s.minW}`);
  if (s.minH !== undefined) parts.push(`minH = ${s.minH}`);
  return `{ ${parts.join(', ')} }`;
}

function manifestToml(w) {
  const homepage = `${REPO}/tree/main/widgets/${w.name}`;
  let out = '';
  out += `name        = ${tomlString(w.name)}\n`;
  out += `version     = ${tomlString(w.version)}\n`;
  out += `description = ${tomlString(w.description)}\n`;
  out += `author      = "sillview"\n`;
  out += `license     = "MIT"\n`;
  out += `homepage    = ${tomlString(homepage)}\n`;
  out += `kind        = "builtin"\n`;
  out += `widget_type = ${tomlString(w.name)}\n`;
  out += `category    = ${tomlString(w.category)}\n`;
  out += `icon        = ${tomlString(w.icon)}\n`;
  out += `tags        = [${w.tags.map(tomlString).join(', ')}]\n`;
  out += `default_size = ${sizeTable(w.defaultSize)}\n`;
  for (const c of w.config) {
    out += `\n[[config]]\n`;
    out += `key         = ${tomlString(c.key)}\n`;
    out += `types       = [${c.types.map(tomlString).join(', ')}]\n`;
    if (c.required) out += `required    = true\n`;
    out += `description = ${tomlString(c.description)}\n`;
  }
  return out;
}

function readme(w) {
  let out = `# ${w.title}\n\n${w.description}\n\n`;
  out += `- **Category:** ${w.category}\n`;
  out += `- **Type:** \`${w.name}\` (first-party built-in)\n`;
  out += `- **License:** MIT\n\n`;
  if (w.config.length) {
    out += `## Configuration\n\n`;
    for (const c of w.config) {
      out += `- \`${c.key}\` (${c.types.join(' | ')})${c.required ? ' — required' : ''}: ${c.description}\n`;
    }
    out += '\n';
  }
  out += `This widget's implementation ships compiled into the sillview app. Installing it from the\n`;
  out += `marketplace simply makes it available to add to a dashboard.\n`;
  return out;
}

for (const w of WIDGETS) {
  const dir = path.join(ROOT, 'widgets', w.name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'widget.toml'), manifestToml(w));
  writeFileSync(path.join(dir, 'README.md'), readme(w));
  process.stdout.write(`seeded widgets/${w.name}\n`);
}
process.stdout.write(`\n${WIDGETS.length} widget(s) seeded.\n`);
