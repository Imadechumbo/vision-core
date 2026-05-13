import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const s = (...parts) => parts.join('');
const activeFiles = [
  'frontend/index.html',
  'frontend/assets/vision-gold.css',
  'frontend/assets/vision-api.js',
  'frontend/assets/vision-chat.js',
  'frontend/assets/vision-agent-local.js',
  'frontend/assets/vision-runtime-owner.js',
  'frontend/assets/vision-report.js',
  'frontend/_headers',
  'frontend/_redirects',
  'frontend/_legacy_quarantine/README.md',
  'tools/sddf-front-guard.mjs'
];
const allowedScripts = [
  'assets/vision-api.js',
  'assets/vision-report.js',
  'assets/vision-agent-local.js',
  'assets/vision-runtime-owner.js',
  'assets/vision-chat.js'
];
const forbidden = [
  s('RUN', '_PATH'),
  s('STREAM', '_PATH'),
  s('executeBtn', '.onclick'),
  /window\.fetch\s*=/,
  s('/api/github/', 'create', '-', 'pr'),
  s('create', '-', 'pr'),
  /pass_gold\s*:\s*true/,
  /promotion_allowed\s*:\s*true/,
  s('mission-', '${', 'Date', '.', 'now', '()}'),
  s('signup', 'Btn'),
  s('oa', 'uth'),
  s('auth', 'Backdrop'),
  s('vision-runtime-', 'v297'),
  s('vision-', 'v297'),
  s('vision-', 'v298'),
  s('vision-', 'v299'),
  s('vision-', 'v2910'),
  s('vision-', 'v32'),
  s('vision-', 'v34'),
  s('vision-', 'v35'),
  s('vision-', 'v44')
];
const allowedSet = new Set(activeFiles);
const failures = [];

function file(path) {
  return readFileSync(join(root, path), 'utf8');
}
function fail(message) {
  failures.push(message);
}
function walk(dir, out = []) {
  if (!existsSync(join(root, dir))) return out;
  for (const entry of readdirSync(join(root, dir))) {
    const full = join(root, dir, entry);
    const rel = relative(root, full).replaceAll('\\', '/');
    const stat = statSync(full);
    if (stat.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}
function scanForbidden(path) {
  if (!existsSync(join(root, path))) return;
  const text = file(path);
  for (const pattern of forbidden) {
    if (pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern)) {
      fail(`${path}: forbidden legacy marker detected`);
    }
  }
}

for (const path of activeFiles) {
  if (!existsSync(join(root, path))) fail(`${path}: required active file missing`);
  scanForbidden(path);
}

for (const path of walk('frontend')) {
  const isAsset = path.startsWith('frontend/assets/');
  const isAllowed = allowedSet.has(path);
  if ((isAsset || path.endsWith('.html') || path === 'frontend/_headers' || path === 'frontend/_redirects') && !isAllowed) {
    fail(`${path}: active frontend file is not in the V14 allowlist`);
  }
}

const html = file('frontend/index.html');
const scriptTags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const scriptSrcs = scriptTags.map((match) => {
  const attrs = match[1];
  const src = attrs.match(/\bsrc=["']([^"']+)["']/i);
  if (!src && match[2].trim()) fail('frontend/index.html: executable inline script detected');
  return src ? src[1] : '';
}).filter(Boolean);
if (JSON.stringify(scriptSrcs) !== JSON.stringify(allowedScripts)) {
  fail(`frontend/index.html: scripts must be exactly ${allowedScripts.join(', ')}`);
}

const chat = file('frontend/assets/vision-chat.js');
if (chat.includes(s('/api/run', '-live'))) fail('vision-chat.js: chat cannot call runtime endpoint');
if (chat.includes('EventSource')) fail('vision-chat.js: chat cannot open event streams');

const owner = file('frontend/assets/vision-runtime-owner.js');
if (!/mission_id/.test(owner) || !/realMissionId/.test(owner) || !/BLOCKED/.test(owner)) {
  fail('vision-runtime-owner.js: mission_id requirement or blocked path missing');
}
if (owner.includes(s('Date', '.', 'now'))) fail('vision-runtime-owner.js: timestamp ids are forbidden');
if (!owner.includes(s('/api/run', '-live')) || !owner.includes('streamUrl')) {
  fail('vision-runtime-owner.js: runtime endpoint or stream helper missing');
}

const agent = file('frontend/assets/vision-agent-local.js');
if (!/evidence_receipt/.test(agent) || !/promotion_allowed/.test(agent) || !/hasGold/.test(agent)) {
  fail('vision-agent-local.js: gold gate must require promotion flag and evidence receipt');
}

const report = file('frontend/assets/vision-report.js');
if (!report.includes('evidence missing') || !report.includes('INCOMPLETE / BLOCKED')) {
  fail('vision-report.js: evidence-missing blocked rendering is required');
}

if (failures.length) {
  console.error('SDDF FRONT GUARD FAILED');
  for (const message of failures) console.error('- ' + message);
  process.exit(1);
}
console.log('SDDF FRONT GUARD PASS');
