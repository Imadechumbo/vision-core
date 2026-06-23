#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

export function validateSlug(slug) {
  if (!slug) return { valid: false, error: 'Missing slug. Usage: node tools/run-software-factory-test.mjs <slug>' };
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: `Invalid slug: "${slug}". Only lowercase letters, numbers and hyphens allowed.` };
  }
  return { valid: true };
}

export function resolveTestFilePath(slug) {
  return join('tools', 'tests', 'software-factory', `software-factory-${slug}.test.mjs`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2];
  const v = validateSlug(slug);
  if (!v.valid) {
    console.error(v.error);
    process.exit(1);
  }
  const testFile = resolveTestFilePath(slug);
  if (!existsSync(testFile)) {
    console.error(`Test file not found: ${testFile}`);
    process.exit(1);
  }
  const result = spawnSync(process.execPath, ['--no-deprecation', testFile], {
    stdio: 'inherit',
    shell: false,
  });
  process.exit(result.status ?? 1);
}
