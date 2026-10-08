#!/usr/bin/env node
// i18n consistency check: en/de key parity, every t()/tSub() key used in code exists, placeholders well-formed.
// Unused keys are reported as warnings (exit 0); everything else fails (exit 1). Run via `npm run lint:i18n`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (loc) => JSON.parse(readFileSync(join(root, 'public/_locales', loc, 'messages.json'), 'utf8'));
const en = read('en');
const de = read('de');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

const used = new Set();
for (const file of [...walk(join(root, 'features')), ...walk(join(root, 'entrypoints'))]) {
  for (const m of readFileSync(file, 'utf8').matchAll(/\bt(?:Sub)?\(\s*'([A-Za-z0-9]+)'/g)) used.add(m[1]);
}

const errors = [];
const onlyEn = Object.keys(en).filter((k) => !(k in de));
const onlyDe = Object.keys(de).filter((k) => !(k in en));
if (onlyEn.length) errors.push(`keys only in en: ${onlyEn.join(', ')}`);
if (onlyDe.length) errors.push(`keys only in de: ${onlyDe.join(', ')}`);
const missing = [...used].filter((k) => !(k in en)).sort();
if (missing.length) errors.push(`keys used in code but missing from locales: ${missing.join(', ')}`);

for (const [loc, dict] of [['en', en], ['de', de]]) {
  for (const [key, entry] of Object.entries(dict)) {
    const tokens = new Set([...entry.message.matchAll(/\$([A-Z_]+)\$/g)].map((m) => m[1].toLowerCase()));
    const declared = new Set(Object.keys(entry.placeholders ?? {}).map((k) => k.toLowerCase()));
    if ([...tokens].some((t) => !declared.has(t)) || [...declared].some((d) => !tokens.has(d))) {
      errors.push(`${loc}.${key}: placeholders ${[...declared].join(',') || '-'} do not match message tokens ${[...tokens].join(',') || '-'}`);
    }
  }
}

const unused = Object.keys(en).filter((k) => !used.has(k) && !['extName', 'extDescription'].includes(k)).sort();
if (unused.length) console.warn(`i18n warning: ${unused.length} unused key(s): ${unused.join(', ')}`);

if (errors.length) {
  console.error('i18n check failed:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log(`i18n check passed: ${Object.keys(en).length} keys, ${used.size} used in code`);
