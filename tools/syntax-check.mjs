#!/usr/bin/env node
/**
 * Syntax Check Runner — replaces the long &&-chain in test:syntax.
 * Runs `node --check` on each listed file. Exits 1 on any failure.
 *
 * §125: Migrated from hardcoded list + software-factory-syntax-discovery import
 * to dynamic filesystem scan. Scans tools/ root, tools/hermes/, and tools/tests/
 * (excluding tools/_archive/ which contains archived orphan modules).
 */

import { spawnSync } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Recursively collect all .mjs files under `dir`, skipping `excludeDirs`.
 */
function collectMjs(dir, excludeDirs = []) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        results.push(...collectMjs(join(dir, entry.name), excludeDirs));
      }
    } else if (entry.name.endsWith('.mjs')) {
      results.push(join(dir, entry.name).replace(/\\/g, '/'));
    }
  }
  return results;
}

// Scan active tools/ directories, skip _archive/
const allFiles = [
  ...collectMjs('tools', ['_archive', 'automation', 'real-validation', 'tests']),
  ...collectMjs('tools/tests', ['software-factory']),
];

const unique = [...new Set(allFiles)].sort();

let failures = 0;
for (const file of unique) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`SYNTAX FAIL: ${file}`);
    if (r.stderr) process.stderr.write(r.stderr);
    failures++;
  }
}

if (failures === 0) {
  console.log(`syntax-check: ${unique.length} files OK`);
} else {
  console.error(`syntax-check: ${failures} file(s) failed`);
  process.exit(1);
}
