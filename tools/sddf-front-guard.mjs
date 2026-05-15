import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

const requiredV14Scripts = [
  'frontend/assets/vision-api.js',
  'frontend/assets/vision-chat.js',
  'frontend/assets/vision-agent-local.js',
  'frontend/assets/vision-runtime-owner.js',
  'frontend/assets/vision-report.js'
];

function p(path) {
  return join(root, path);
}

function exists(path) {
  return existsSync(p(path));
}

function text(path) {
  return readFileSync(p(path), 'utf8');
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function walk(dir, out = []) {
  if (!exists(dir)) return out;

  for (const entry of readdirSync(p(dir))) {
    const full = join(p(dir), entry);
    const rel = relative(root, full).replaceAll('\\', '/');
    const stat = statSync(full);

    if (stat.isDirectory()) walk(rel, out);
    else out.push(rel);
  }

  return out;
}

function scriptSrcs(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .map((match) => {
      const src = match[1].match(/\bsrc=["']([^"']+)["']/i);
      return src ? src[1].replace(/\?.*$/, '') : '';
    })
    .filter(Boolean);
}

function hasInlineScript(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .some((match) => !/\bsrc=["'][^"']+["']/i.test(match[1]) && match[2].trim().length > 0);
}

function ensureRequiredV14Scripts() {
  for (const file of requiredV14Scripts) {
    if (!exists(file)) fail(`${file}: required V14 script missing`);
  }
}

function ensureV14Contracts() {
  if (exists('frontend/assets/vision-chat.js')) {
    const chat = text('frontend/assets/vision-chat.js');

    if (chat.includes('/api/run-live')) {
      fail('vision-chat.js: chat cannot call runtime endpoint');
    }

    if (chat.includes('EventSource')) {
      fail('vision-chat.js: chat cannot open event streams');
    }
  }

  if (exists('frontend/assets/vision-runtime-owner.js')) {
    const owner = text('frontend/assets/vision-runtime-owner.js');

    if (!/mission_id/.test(owner) || !/realMissionId/.test(owner) || !/BLOCKED/.test(owner)) {
      fail('vision-runtime-owner.js: mission_id requirement or blocked path missing');
    }

    if (owner.includes('Date.now')) {
      fail('vision-runtime-owner.js: timestamp ids are forbidden');
    }

    if (!owner.includes('/api/run-live') || !owner.includes('streamUrl')) {
      fail('vision-runtime-owner.js: runtime endpoint or stream helper missing');
    }
  }

  if (exists('frontend/assets/vision-agent-local.js')) {
    const agent = text('frontend/assets/vision-agent-local.js');

    if (!/evidence_receipt/.test(agent) || !/promotion_allowed/.test(agent) || !/hasGold/.test(agent)) {
      fail('vision-agent-local.js: gold gate must require promotion flag and evidence receipt');
    }
  }

  if (exists('frontend/assets/vision-report.js')) {
    const report = text('frontend/assets/vision-report.js');

    if (!report.includes('evidence missing') || !report.includes('INCOMPLETE / BLOCKED')) {
      fail('vision-report.js: evidence-missing blocked rendering is required');
    }
  }
}

function scanGoldHardcode(options = {}) {
  const files = walk('frontend').filter((file) => /\.(html|js)$/i.test(file));
  const snapshotMode = options.snapshotMode === true;

  for (const file of files) {
    const body = text(file);

    if (/pass_gold\s*:\s*true/.test(body)) {
      if (snapshotMode) {
        warn(`${file}: hardcoded pass_gold:true exists in V8 pure snapshot; PROMOTION/DEPLOY remain BLOCKED`);
      } else {
        fail(`${file}: hardcoded pass_gold:true is forbidden`);
      }
    }

    if (/promotion_allowed\s*:\s*true/.test(body)) {
      if (snapshotMode) {
        warn(`${file}: hardcoded promotion_allowed:true exists in V8 pure snapshot; PROMOTION/DEPLOY remain BLOCKED`);
      } else {
        fail(`${file}: hardcoded promotion_allowed:true is forbidden`);
      }
    }
  }
}

function isV8PureSnapshot() {
  if (!exists('frontend/index.html')) return false;

  const html = text('frontend/index.html');
  const srcs = scriptSrcs(html);

  const hasV8Brand =
    html.includes('VISION CORE V2.9.10') &&
    html.includes('MISSION CONTROL') &&
    (html.includes('VISION AGENT LOCAL') || html.includes('MISSION INPUT'));

  const hasV8VisualFiles =
    exists('frontend/assets/style.css') &&
    exists('frontend/assets/v23-ui-system.css') &&
    exists('frontend/assets/v231-colors-agents.css') &&
    exists('frontend/assets/v233-realtime.css') &&
    exists('frontend/assets/v273-sddf-command-chat.css') &&
    exists('frontend/assets/vision-v33-orbit.css');

  const hasLegacyRuntime =
    srcs.some((src) =>
      /vision-v29|vision-runtime-v297|v233-realtime|v273-sddf|vision-v32|vision-v34|vision-v35|vision-v44/i.test(src)
    );

  return hasV8Brand && hasV8VisualFiles && hasLegacyRuntime;
}

function runV8PureSnapshotMode() {
  ensureRequiredV14Scripts();
  ensureV14Contracts();

  scanGoldHardcode({ snapshotMode: true });

  if (exists('frontend/assets/vision-gold.css')) {
    warn('frontend/assets/vision-gold.css exists but is not required in V8_PURE_VISUAL_SNAPSHOT mode.');
  }

  if (exists('frontend/_legacy_quarantine/README.md')) {
    warn('frontend/_legacy_quarantine exists but is not required in V8_PURE_VISUAL_SNAPSHOT mode.');
  }

  const html = text('frontend/index.html');

  if (html.includes('/api/github/create-pr') || html.includes('create-pr')) {
    warn('frontend/index.html: direct GitHub create-pr marker exists in V8 pure snapshot; PR creation remains BLOCKED until clean migration');
  }

  warn('legacy V8 visual/runtime assets are temporarily allowed for visual parity only');
  warn('PROMOTION: BLOCKED');
  warn('DEPLOY: BLOCKED');
  warn('NEXT: audit legacy runtime before clean migration');
}

function runV14CleanMode() {
  const allowedScripts = [
    'assets/vision-api.js',
    'assets/vision-report.js',
    'assets/vision-agent-local.js',
    'assets/vision-runtime-owner.js',
    'assets/vision-chat.js'
  ];

  const requiredFiles = [
    'frontend/index.html',
    'frontend/assets/vision-gold.css',
    ...requiredV14Scripts,
    'frontend/_headers',
    'frontend/_redirects'
  ];

  for (const file of requiredFiles) {
    if (!exists(file)) fail(`${file}: required active file missing`);
  }

  const html = exists('frontend/index.html') ? text('frontend/index.html') : '';
  const srcs = scriptSrcs(html);

  if (hasInlineScript(html)) {
    fail('frontend/index.html: executable inline script detected');
  }

  if (JSON.stringify(srcs) !== JSON.stringify(allowedScripts)) {
    fail(`frontend/index.html: scripts must be exactly ${allowedScripts.join(', ')}`);
  }

  const forbiddenMarkers = [
    'RUN_PATH',
    'STREAM_PATH',
    'executeBtn.onclick',
    'window.fetch =',
    'create-pr',
    'signupBtn',
    'oauth',
    'authBackdrop',
    'mission-${Date.now()}',
    'vision-runtime-v297',
    'vision-v297',
    'vision-v298',
    'vision-v299',
    'vision-v2910',
    'vision-v32',
    'vision-v34',
    'vision-v35',
    'vision-v44'
  ];

  for (const file of requiredFiles.filter(exists)) {
    const body = text(file);

    for (const marker of forbiddenMarkers) {
      if (body.includes(marker)) {
        fail(`${file}: forbidden legacy marker detected`);
      }
    }
  }

  ensureV14Contracts();
  scanGoldHardcode();
}

if (isV8PureSnapshot()) {
  runV8PureSnapshotMode();

  if (failures.length) {
    console.error('SDDF FRONT GUARD FAILED — V8 PURE VISUAL SNAPSHOT MODE');
    for (const message of failures) console.error('- ' + message);
    process.exit(1);
  }

  console.log('SDDF FRONT GUARD PASS — V8 PURE VISUAL SNAPSHOT MODE');
  for (const message of warnings) console.warn('WARNING: ' + message);
  process.exit(0);
}

runV14CleanMode();

if (failures.length) {
  console.error('SDDF FRONT GUARD FAILED');
  for (const message of failures) console.error('- ' + message);
  process.exit(1);
}

console.log('SDDF FRONT GUARD PASS — V14 CLEAN RUNTIME MODE');
