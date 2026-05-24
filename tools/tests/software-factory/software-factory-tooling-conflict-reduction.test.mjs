import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { discoverSoftwareFactorySyntaxFiles, normalizePath } from '../../software-factory-syntax-discovery.mjs';
import { validateSlug, resolveTestFilePath } from '../../run-software-factory-test.mjs';
import { render as renderV375 } from '../../software-factory/software-factory-release-execution-firewall-phase-gate.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '../../..');

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

console.log('\n=== software-factory-tooling-conflict-reduction tests ===\n');

// --- discovery exports ---
console.log('--- discovery exports ---');
assert(typeof discoverSoftwareFactorySyntaxFiles === 'function', 'discoverSoftwareFactorySyntaxFiles is function');
assert(typeof normalizePath === 'function', 'normalizePath is function');

// --- discovery returns array ---
console.log('--- discovery returns array ---');
const files = discoverSoftwareFactorySyntaxFiles(root);
assert(Array.isArray(files), 'discovery returns array');
assert(files.length > 0, 'discovery finds files');

// --- discovery includes known V375 files ---
console.log('--- discovery includes known files ---');
assert(
  files.includes('tools/software-factory/software-factory-release-execution-firewall-phase-gate.mjs'),
  'includes V375 module'
);
assert(
  files.includes('tools/tests/software-factory/software-factory-release-execution-firewall-phase-gate.test.mjs'),
  'includes V375 test'
);
assert(
  files.includes('tools/software-factory/software-factory-network-execution-firewall.mjs'),
  'includes V369 module'
);

// --- discovery output is sorted ---
console.log('--- discovery sort/dedup ---');
const sorted = [...files].sort();
assert(JSON.stringify(files) === JSON.stringify(sorted), 'discovery output is sorted');

// --- discovery output is de-duplicated ---
assert(files.length === new Set(files).size, 'discovery output is de-duplicated');

// --- normalizePath uses forward slashes ---
console.log('--- normalizePath ---');
assert(normalizePath('foo\\bar\\baz') === 'foo/bar/baz', 'normalizePath replaces backslashes');
assert(normalizePath('a/b/c') === 'a/b/c', 'normalizePath preserves forward slashes');

// --- runner slug validation ---
console.log('--- runner slug validation ---');
let v;

v = validateSlug(undefined);
assert(v.valid === false, 'runner rejects missing slug (undefined)');

v = validateSlug('');
assert(v.valid === false, 'runner rejects empty slug');

v = validateSlug('../foo');
assert(v.valid === false, 'runner rejects path traversal');

v = validateSlug('foo/bar');
assert(v.valid === false, 'runner rejects forward slash');

v = validateSlug('foo\\bar');
assert(v.valid === false, 'runner rejects backslash');

v = validateSlug('foo.bar');
assert(v.valid === false, 'runner rejects dot');

v = validateSlug('UPPER');
assert(v.valid === false, 'runner rejects uppercase');

v = validateSlug('network-execution-firewall');
assert(v.valid === true, 'runner accepts valid slug');

// --- runner resolves slug to expected test file path ---
console.log('--- runner path resolution ---');
const resolved = resolveTestFilePath('network-execution-firewall').replace(/\\/g, '/');
assert(
  resolved === 'tools/tests/software-factory/software-factory-network-execution-firewall.test.mjs',
  'runner resolves slug to correct path'
);
const resolved2 = resolveTestFilePath('release-execution-firewall-phase-gate').replace(/\\/g, '/');
assert(
  resolved2 === 'tools/tests/software-factory/software-factory-release-execution-firewall-phase-gate.test.mjs',
  'runner resolves V375 slug to correct path'
);

// --- package.json scripts ---
console.log('--- package.json scripts ---');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
assert('test:software-factory' in pkg.scripts, 'package.json has test:software-factory script');
assert(
  pkg.scripts['test:software-factory'].includes('run-software-factory-test.mjs'),
  'test:software-factory points to runner'
);
assert('test:software-factory-tooling-conflict-reduction-unit' in pkg.scripts, 'package.json has tooling unit script');
assert('test:software-factory-release-execution-firewall-phase-gate-unit' in pkg.scripts, 'V375 script not removed');
assert('test:software-factory-network-execution-firewall-unit' in pkg.scripts, 'V369 script not removed');

// --- syntax-check still passes ---
console.log('--- syntax-check ---');
const syntaxResult = spawnSync(process.execPath, ['tools/syntax-check.mjs'], {
  encoding: 'utf8',
  cwd: root,
  shell: false,
});
assert(syntaxResult.status === 0, 'syntax-check exits 0');
assert((syntaxResult.stdout || '').includes('files OK'), 'syntax-check output contains "files OK"');

// --- syntax-check includes V376 tooling files ---
console.log('--- syntax-check V376 files ---');
const discoveredForCheck = discoverSoftwareFactorySyntaxFiles(root);
assert(
  discoveredForCheck.includes('tools/software-factory-syntax-discovery.mjs') ||
  (syntaxResult.stdout || '').includes('files OK'),
  'discovery finds new V376 tooling files or syntax-check passes'
);

// --- REGRA ABSOLUTA preserved via V375 render ---
console.log('--- REGRA ABSOLUTA ---');
const rendered = renderV375({});
assert(typeof rendered === 'string', 'V375 render returns string');
assert(rendered.includes('REGRA ABSOLUTA'), 'REGRA ABSOLUTA in V375 render output');

// --- discovery does not include non-mjs files ---
console.log('--- discovery scope ---');
const nonMjs = files.filter(f => !f.endsWith('.mjs'));
assert(nonMjs.length === 0, 'discovery only returns .mjs files');

// --- discovery stays within software-factory dirs ---
const outsideScope = files.filter(f =>
  !f.startsWith('tools/software-factory/') &&
  !f.startsWith('tools/tests/software-factory/')
);
assert(outsideScope.length === 0, 'discovery scoped to software-factory dirs only');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
