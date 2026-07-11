import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../../backend/server.js', import.meta.url), 'utf8');

assert.match(server, /function isAllowedCorsOrigin\(origin\)/);
assert.doesNotMatch(
  server,
  /Access-Control-Allow-Origin['"],\s*origin\s*===\s*['"]null['"]\s*\?\s*['"]\*['"]\s*:\s*origin/,
  'CORS must not reflect arbitrary Origin while credentials are enabled'
);
assert.doesNotMatch(
  server,
  /['"]Access-Control-Allow-Origin['"]\s*:\s*req\.headers\.origin/,
  'CORS must not reflect req.headers.origin directly'
);

for (const route of [
  '/api/providers',
  '/api/providers/save',
  '/api/providers/list',
  '/api/providers/delete',
  '/api/providers/test',
  '/api/providers/default'
]) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(
    server,
    new RegExp(`app\\.(?:get|all)\\('${escaped}',\\s*requireVisionAuth,`),
    `${route} must require auth`
  );
}

assert.match(
  server,
  /app\.post\('\/api\/sf\/fetch-url',\s*requireVisionAuth,\s*async/,
  '/api/sf/fetch-url must require auth'
);
assert.match(server, /async function assertPublicFetchTarget\(parsedUrl\)/);
assert.match(server, /private_target_blocked/);
assert.match(server, /lookup:\s*\(_hostname,\s*_opts,\s*cb\)\s*=>\s*cb\(null,\s*resolvedTarget\.address,\s*resolvedTarget\.family\)/);

console.log('PASS rc-security-hardening');
