#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const ROOT = resolve(process.cwd(), 'frontend');
const assets = {
  '/vision-core-next.html': 45 * 1024,
  '/assets/vision-core-next-clean.css': 80 * 1024,
  '/assets/vision-core-next-clean.js': 256 * 1024,
  '/assets/mascote-reading-final.png': 64 * 1024,
};
const TOTAL_BUDGET = 450 * 1024;
const P95_ASSET_MS = 100;
const ROUND_MS = 500;
const samples = Object.fromEntries(Object.keys(assets).map((name) => [name, []]));
let passed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  ✓ ${message}`);
  passed++;
}

const files = Object.fromEntries(Object.keys(assets).map((name) => {
  const bytes = readFileSync(resolve(ROOT, name.slice(1)));
  return [name, { bytes, sha256: createHash('sha256').update(bytes).digest('hex') }];
}));

const server = createServer((request, response) => {
  const name = new URL(request.url, 'http://127.0.0.1').pathname;
  const file = files[name];
  if (!file) { response.writeHead(404).end(); return; }
  const type = extname(name) === '.css' ? 'text/css' : extname(name) === '.js' ? 'text/javascript' : extname(name) === '.png' ? 'image/png' : 'text/html';
  response.writeHead(200, { 'Content-Type': type, 'Content-Length': file.bytes.length, 'Cache-Control': 'no-store' });
  response.end(file.bytes);
});

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const base = `http://127.0.0.1:${server.address().port}`;

try {
  const total = Object.values(files).reduce((sum, file) => sum + file.bytes.length, 0);
  for (const [name, budget] of Object.entries(assets)) {
    assert(files[name].bytes.length <= budget, `${name} ${files[name].bytes.length}B <= ${budget}B`);
  }
  assert(total <= TOTAL_BUDGET, `carga inicial ${total}B <= ${TOTAL_BUDGET}B`);

  for (let round = 0; round < 10; round++) {
    const roundStart = performance.now();
    for (const name of Object.keys(assets)) {
      const start = performance.now();
      const response = await fetch(base + name, { cache: 'no-store' });
      const bytes = Buffer.from(await response.arrayBuffer());
      samples[name].push(performance.now() - start);
      assert(response.status === 200 && bytes.equals(files[name].bytes), `${name} round ${round + 1} íntegro`);
    }
    assert(performance.now() - roundStart <= ROUND_MS, `round ${round + 1} <= ${ROUND_MS}ms`);
  }

  const report = Object.entries(files).map(([name, file]) => {
    const ordered = [...samples[name]].sort((a, b) => a - b);
    const p95 = ordered[Math.ceil(ordered.length * 0.95) - 1];
    assert(p95 <= P95_ASSET_MS, `${name} p95 ${p95.toFixed(2)}ms <= ${P95_ASSET_MS}ms`);
    return { name, bytes: file.bytes.length, sha256: file.sha256, p95_ms: Number(p95.toFixed(2)) };
  });
  console.log(JSON.stringify({ total_bytes: total, assets: report }, null, 2));
  console.log(`\n${passed}/${passed} PASS`);
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}
