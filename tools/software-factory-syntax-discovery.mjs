#!/usr/bin/env node
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const EXCLUDE = new Set(['node_modules', '.git', 'coverage', 'dist', 'build']);

function walk(dir, results = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return results; }
  for (const entry of entries) {
    if (EXCLUDE.has(entry)) continue;
    const full = join(dir, entry);
    let stat;
    try { stat = statSync(full); } catch { continue; }
    if (stat.isDirectory()) {
      walk(full, results);
    } else if (entry.endsWith('.mjs')) {
      results.push(full);
    }
  }
  return results;
}

export function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

export function discoverSoftwareFactorySyntaxFiles(rootDir = process.cwd()) {
  const dirs = [
    join(rootDir, 'tools', 'software-factory'),
    join(rootDir, 'tools', 'tests', 'software-factory'),
  ];
  const raw = [];
  for (const dir of dirs) {
    walk(dir, raw);
  }
  return [...new Set(raw.map(f => normalizePath(relative(rootDir, f))))].sort();
}
