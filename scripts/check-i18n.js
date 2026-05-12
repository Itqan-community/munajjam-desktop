#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'ui', 'messages');
const REFERENCE = 'en.json';
const TARGETS = ['ar.json'];

function flatten(value, prefix) {
  const out = new Set();
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      for (const leaf of flatten(child, path)) {
        out.add(leaf);
      }
    }
  } else {
    out.add(prefix);
  }
  return out;
}

function readKeys(file) {
  const full = path.join(LOCALES_DIR, file);
  let raw;
  try {
    raw = fs.readFileSync(full, 'utf8');
  } catch (err) {
    console.error(`Cannot read ${full}: ${err.message}`);
    process.exit(2);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`Invalid JSON in ${full}: ${err.message}`);
    process.exit(2);
  }
  return flatten(parsed, '');
}

const reference = readKeys(REFERENCE);
let failed = false;

for (const target of TARGETS) {
  const targetKeys = readKeys(target);
  const missingInTarget = [...reference].filter((k) => !targetKeys.has(k)).sort();
  const extraInTarget = [...targetKeys].filter((k) => !reference.has(k)).sort();

  if (missingInTarget.length === 0 && extraInTarget.length === 0) {
    console.log(`${target}: OK (${targetKeys.size} keys match ${REFERENCE})`);
    continue;
  }

  failed = true;
  console.error(`${target}: parity check failed against ${REFERENCE}`);
  if (missingInTarget.length > 0) {
    console.error(`  Missing in ${target} (${missingInTarget.length}):`);
    for (const key of missingInTarget) console.error(`    - ${key}`);
  }
  if (extraInTarget.length > 0) {
    console.error(`  Extra in ${target} (not in ${REFERENCE}) (${extraInTarget.length}):`);
    for (const key of extraInTarget) console.error(`    - ${key}`);
  }
}

process.exit(failed ? 1 : 0);
