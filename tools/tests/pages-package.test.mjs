import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { buildPagesPackage, readAllowlist } from '../build-pages-package.mjs';

const temporary = mkdtempSync(join(tmpdir(), 'vision-pages-package-'));
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const filesBelow = (directory) => readdirSync(directory, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile()).map((entry) => relative(directory, join(entry.parentPath, entry.name)).replaceAll('\\', '/')).sort();

try {
  const first = buildPagesPackage({ output: join(temporary, 'one') });
  const second = buildPagesPackage({ output: join(temporary, 'two') });
  const expected = [...readAllowlist(), 'deployment-manifest.json'].sort();
  check(JSON.stringify(filesBelow(join(temporary, 'one'))) === JSON.stringify(expected), 'package contains exactly the allowlist plus manifest');
  check(first.files.length === 16, 'approved allowlist has 16 files');
  const allowed = new Set(first.files.map(({ path }) => path));
  const references = ['about.html', 'index.html', 'landing.html', 'vision-core-next.html', 'assets/vision-core-next-clean.js']
    .flatMap((file) => [...readFileSync(join(resolve('frontend'), file), 'utf8').matchAll(/assets\/[A-Za-z0-9._/-]+/g)].map(([path]) => path));
  check(references.every((file) => allowed.has(file)), 'all static public asset references are allowlisted');
  check(first.package_sha256 === second.package_sha256, 'same inputs produce the same package hash');
  check(!filesBelow(join(temporary, 'one')).some((file) => file.startsWith('downloads/') || file === 'next.html'), 'downloads and debris are excluded');
  check(first.files.every((entry) => /^[a-f0-9]{64}$/.test(entry.sha256)), 'every file has a SHA-256');
  check(JSON.parse(readFileSync(join(temporary, 'one/deployment-manifest.json'))).package_sha256 === first.package_sha256, 'written manifest matches result');

  const fixture = join(temporary, 'frontend');
  const fixtureAllowlist = join(temporary, 'allowlist.txt');
  const fixtureFile = join(fixture, 'index.html');
  mkdirSync(fixture, { recursive: true });
  writeFileSync(fixtureAllowlist, 'index.html\n');
  writeFileSync(fixtureFile, 'safe');
  const safe = buildPagesPackage({ source: fixture, output: join(temporary, 'safe'), allowlist: fixtureAllowlist });
  writeFileSync(fixtureFile, '-----BEGIN PRIVATE KEY-----');
  assert.throws(() => buildPagesPackage({ source: fixture, output: join(temporary, 'unsafe'), allowlist: fixtureAllowlist }), /Secret-like value/);
  passed++;
  assert.throws(() => buildPagesPackage({ source: fixture, output: temporary, allowlist: fixtureAllowlist }), /Unsafe output directory/);
  passed++;
  writeFileSync(fixtureFile, 'changed');
  const changed = buildPagesPackage({ source: fixture, output: join(temporary, 'changed'), allowlist: fixtureAllowlist });
  check(safe.package_sha256 !== changed.package_sha256, 'content change updates package hash');
  console.log(`${passed}/${passed} pages package checks passed`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
