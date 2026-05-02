'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_DIRECTIVES = [
  'gzip',
  'gzip_comp_level',
  'gzip_min_length',
  'gzip_types',
  'client_max_body_size'
];

function exists(file) {
  try { return fs.existsSync(file); } catch { return false; }
}

function walk(dir, predicate, out = []) {
  if (!exists(dir)) return out;
  for (const item of fs.readdirSync(dir)) {
    if (item === 'node_modules' || item === '.git' || item === '.elasticbeanstalk') continue;
    const full = path.join(dir, item);
    let stat;
    try { stat = fs.statSync(full); } catch { continue; }
    if (stat.isDirectory()) walk(full, predicate, out);
    else if (!predicate || predicate(full)) out.push(full);
  }
  return out;
}

function findConfigFiles(root) {
  const files = [];
  const candidates = [
    path.join(root, '.platform'),
    path.join(root, '.ebextensions'),
    path.join(root, 'nginx.conf'),
    path.join(root, 'server.js'),
    path.join(root, 'package.json'),
    path.join(root, 'Dockerfile'),
    path.join(root, 'docker-compose.yml'),
    path.join(root, 'docker-compose.yaml')
  ];

  for (const candidate of candidates) {
    if (!exists(candidate)) continue;
    const stat = fs.statSync(candidate);
    if (stat.isDirectory()) {
      files.push(...walk(candidate, file => /\.(conf|config|json|js|yml|yaml|env|txt)$/i.test(file)));
    } else {
      files.push(candidate);
    }
  }

  return [...new Set(files)].filter(exists);
}

function normalizeDirectiveLine(line) {
  return String(line || '').replace(/#.*/, '').trim().replace(/\s+/g, ' ');
}

function directiveName(line) {
  const clean = normalizeDirectiveLine(line);
  const match = clean.match(/^([a-zA-Z_][\w]*)\b/);
  return match ? match[1] : null;
}

function isNginxFile(file) {
  return /nginx|\.conf$/i.test(file) || file.includes(`${path.sep}.platform${path.sep}`);
}

function scanNginxDuplicateDirectives(file, content) {
  const issues = [];
  const seen = new Map();
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const name = directiveName(line);
    if (!name || !DEFAULT_DIRECTIVES.includes(name)) return;
    const clean = normalizeDirectiveLine(line);
    if (!clean.endsWith(';')) return;

    // Track exact directive/value pairs. This avoids removing different valid values blindly.
    const key = clean;
    if (!seen.has(key)) {
      seen.set(key, index + 1);
      return;
    }

    issues.push({
      type: 'nginx_duplicate_directive',
      severity: name === 'gzip' ? 'critical' : 'warning',
      directive: name,
      value: clean,
      file,
      line: index + 1,
      firstLine: seen.get(key),
      fixable: true
    });
  });

  return issues;
}

function scanNodePortBinding(file, content) {
  if (!/server\.js$/i.test(file)) return [];
  const hasListen = /\.listen\s*\(/.test(content);
  if (!hasListen) return [];
  const usesEnvPort = /process\.env\.PORT/.test(content);
  const bindsAllInterfaces = /\.listen\s*\([^\)]*['\"]0\.0\.0\.0['\"]/.test(content);
  const issues = [];
  if (!usesEnvPort) {
    issues.push({
      type: 'node_missing_process_env_port',
      severity: 'critical',
      file,
      fixable: false,
      message: 'Node/Express must listen on process.env.PORT on Elastic Beanstalk.'
    });
  }
  if (!bindsAllInterfaces) {
    issues.push({
      type: 'node_not_bound_to_all_interfaces',
      severity: 'warning',
      file,
      fixable: false,
      message: 'Recommended EB binding is app.listen(PORT, "0.0.0.0").'
    });
  }
  return issues;
}

function scanFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const issues = [];
  if (isNginxFile(file)) issues.push(...scanNginxDuplicateDirectives(file, content));
  issues.push(...scanNodePortBinding(file, content));
  return issues;
}

function scanConfig(root = process.cwd()) {
  const files = findConfigFiles(root);
  const issues = [];
  for (const file of files) {
    try { issues.push(...scanFile(file)); } catch (error) {
      issues.push({ type: 'config_scan_error', severity: 'warning', file, fixable: false, message: error.message });
    }
  }
  return {
    ok: !issues.some(issue => issue.severity === 'critical'),
    status: issues.some(issue => issue.severity === 'critical') ? 'FAIL' : 'PASS',
    pass_gold_ready: !issues.some(issue => issue.severity === 'critical'),
    files_scanned: files.length,
    issues
  };
}

function dedupeExactDirectiveLines(content) {
  const seen = new Set();
  const removed = [];
  const lines = content.split(/\r?\n/);
  const next = lines.filter((line, index) => {
    const name = directiveName(line);
    const clean = normalizeDirectiveLine(line);
    if (!name || !DEFAULT_DIRECTIVES.includes(name) || !clean.endsWith(';')) return true;
    if (!seen.has(clean)) {
      seen.add(clean);
      return true;
    }
    removed.push({ line: index + 1, directive: name, value: clean });
    return false;
  });
  return { content: next.join('\n'), removed };
}

function applyConfigFixes(root = process.cwd()) {
  const before = scanConfig(root);
  const patched = [];

  for (const issue of before.issues) {
    if (issue.type !== 'nginx_duplicate_directive' || !issue.fixable) continue;
    if (!exists(issue.file)) continue;
    if (patched.some(item => item.file === issue.file)) continue;

    const original = fs.readFileSync(issue.file, 'utf8');
    const fixed = dedupeExactDirectiveLines(original);
    if (fixed.removed.length > 0 && fixed.content !== original) {
      fs.writeFileSync(issue.file, fixed.content, 'utf8');
      patched.push({ file: issue.file, removed: fixed.removed });
    }
  }

  const after = scanConfig(root);
  return {
    ok: after.ok,
    status: after.status,
    pass_gold_ready: after.pass_gold_ready,
    patched,
    before,
    after
  };
}

function enforceConfigGold(root = process.cwd(), options = {}) {
  const result = options.apply ? applyConfigFixes(root) : { after: scanConfig(root), patched: [] };
  const finalReport = result.after || result;
  const critical = finalReport.issues.filter(issue => issue.severity === 'critical');
  return {
    ok: critical.length === 0,
    status: critical.length === 0 ? 'GOLD' : 'FAIL',
    pass_gold: critical.length === 0,
    promotion_allowed: critical.length === 0,
    patched: result.patched || [],
    report: finalReport,
    critical
  };
}

module.exports = {
  scanConfig,
  applyConfigFixes,
  enforceConfigGold
};
