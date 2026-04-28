'use strict';

const fs = require('fs');
const path = require('path');

const MAX_FILE_BYTES = 250 * 1024;
const SAFE_EXT = new Set(['.js', '.mjs', '.cjs', '.json', '.html', '.css', '.md', '.yml', '.yaml', '.txt']);

function safeRoot(context = {}) {
  const root = context.project_root || context.projectPath || process.env.PROJECT_ROOT || process.cwd();
  return path.resolve(root);
}

function isSafeFile(file) {
  const base = path.basename(file);
  if (base.startsWith('.env')) return false;
  if (file.includes(`${path.sep}node_modules${path.sep}`) || file.includes(`${path.sep}.git${path.sep}`)) return false;
  return SAFE_EXT.has(path.extname(file).toLowerCase());
}

function readSnippet(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES || !isSafeFile(file)) return null;
    const text = fs.readFileSync(file, 'utf8');
    return text.slice(0, 4000);
  } catch (_) { return null; }
}

function resolveHint(root, hint) {
  const clean = String(hint || '').replace(/^\/+/, '');
  const p = path.resolve(root, clean);
  if (!p.startsWith(root)) return null;
  return p;
}

function walk(root, limit = 80) {
  const out = [];
  const stack = [root];
  while (stack.length && out.length < limit) {
    const dir = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { continue; }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'dist' || ent.name === 'build') continue;
      if (ent.isDirectory()) stack.push(p);
      else if (isSafeFile(p)) out.push(p);
      if (out.length >= limit) break;
    }
  }
  return out;
}

function extractRoutes(snippets) {
  const routes = new Set(['/api/health', '/api/version']);
  for (const item of snippets) {
    const text = item.snippet || '';
    const re = /(?:router|app)\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/g;
    let m;
    while ((m = re.exec(text))) routes.add(m[2].startsWith('/api') ? m[2] : '/api' + m[2]);
  }
  return Array.from(routes).sort();
}

function detectContracts(snippets) {
  const joined = snippets.map(s => s.snippet).join('\n');
  return {
    cors: /Access-Control-Allow-Origin|cors\(/i.test(joined) ? 'detected' : 'missing_or_external',
    sse: /text\/event-stream|EventSource|run-live-stream/i.test(joined) ? 'detected' : 'missing_or_external',
    github_pr: /pulls|githubPr|GITHUB_TOKEN/i.test(joined) ? 'detected' : 'not_detected',
    pass_gold: /PASS GOLD|pass_gold|promotion_allowed/i.test(joined) ? 'detected' : 'missing_or_external'
  };
}

function scan(orchestration, context = {}) {
  const root = safeRoot(context);
  const hints = orchestration.targetHints || [];
  let files = hints.map(h => resolveHint(root, h)).filter(Boolean);
  if (!files.some(f => fs.existsSync(f))) files = walk(root, 100);
  const inspected = [];
  for (const abs of files) {
    const exists = fs.existsSync(abs);
    const snippet = exists ? readSnippet(abs) : null;
    inspected.push({
      path: path.relative(root, abs).replace(/\\/g, '/'),
      exists,
      inspected: !!snippet,
      confidence: exists ? (snippet ? 0.92 : 0.72) : 0.25,
      snippet
    });
  }
  const inspectedWithContent = inspected.filter(f => f.snippet);
  const routes = extractRoutes(inspectedWithContent);
  const contracts = detectContracts(inspectedWithContent);
  return {
    ok: true,
    real_scan: true,
    root,
    files: inspected.map(({ snippet, ...rest }) => rest),
    evidence: inspectedWithContent.slice(0, 12).map(f => ({ path: f.path, excerpt: f.snippet.slice(0, 600) })),
    routes,
    contracts,
    target_locked: inspected.find(f => f.exists)?.path || 'src/routes/api.js',
    confidence: inspectedWithContent.length ? 0.91 : 0.66
  };
}

module.exports = { scan };
