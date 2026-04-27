'use strict';
// ════════════════════════════════════════════════════════════
// LOG COLLECTOR
// ════════════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ERROR_PATTERNS = [
  /Error:/i, /TypeError:/i, /ReferenceError:/i, /SyntaxError:/i,
  /UnhandledPromiseRejection/i, /EADDRINUSE/i, /ECONNREFUSED/i,
  /Cannot read propert/i, /Cannot find module/i, /\[ERROR\]/i, /\[FATAL\]/i,
];

function extractErrors(raw) {
  const lines = raw.split('\n');
  const errors = [];
  let cur = null;
  for (const line of lines) {
    if (ERROR_PATTERNS.some(p => p.test(line)) && !/^\s+at\s+/.test(line)) {
      if (cur) errors.push(cur);
      cur = { message: line.trim(), stack: [], timestamp: extractTs(line) };
    } else if (/^\s+at\s+/.test(line) && cur) {
      cur.stack.push(line.trim());
    } else if (cur && !line.trim()) {
      errors.push(cur); cur = null;
    }
  }
  if (cur) errors.push(cur);
  return errors;
}

function extractTs(line) {
  const m = line.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/);
  return m ? m[1] : null;
}

async function collectLogs(projectPath, options = {}) {
  if (options.logPath && fs.existsSync(options.logPath)) {
    const raw = fs.readFileSync(options.logPath, 'utf-8');
    const errors = extractErrors(raw);
    return { source: 'file', path: options.logPath, raw, lines: raw.split('\n').filter(Boolean), errors, lastError: errors.at(-1) || null };
  }

  const candidates = [
    path.join(projectPath, 'logs', 'app.log'),
    path.join(projectPath, 'logs', 'error.log'),
    path.join(projectPath, 'logs', 'combined.log'),
    path.join(projectPath, 'app.log'),
    path.join(projectPath, 'error.log'),
    process.env.LOG_PATH,
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const raw = fs.readFileSync(c, 'utf-8');
      const errors = extractErrors(raw);
      return { source: 'file', path: c, raw, lines: raw.split('\n').filter(Boolean), errors, lastError: errors.at(-1) || null };
    }
  }

  try {
    execSync('pm2 --version', { stdio: 'pipe' });
    const raw = execSync('pm2 logs --nostream --lines 100', { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] });
    const errors = extractErrors(raw);
    return { source: 'pm2', raw, lines: raw.split('\n').filter(Boolean), errors, lastError: errors.at(-1) || null };
  } catch { /* PM2 não disponível */ }

  return null;
}

// ════════════════════════════════════════════════════════════
// ADAPTER — TechNetGame
// ════════════════════════════════════════════════════════════
const https = require('https');
const http  = require('http');

async function checkUrl(url, timeoutMs = 8000) {
  return new Promise(resolve => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ ok: res.statusCode < 400, status: res.statusCode, body: raw.slice(0, 500) }));
    });
    req.on('error', e => resolve({ ok: false, error: e.message }));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
  });
}

async function runTechNetGameChecks(project) {
  const cfg = JSON.parse(project.config || '{}');
  const healthUrl = project.health_url || cfg.health_url;
  const results = {};

  if (healthUrl) results.health = await checkUrl(healthUrl);

  const extraUrls = cfg.check_urls || [];
  for (const u of extraUrls) {
    const key = new URL(u).pathname.replace(/\//g, '_').slice(1) || 'root';
    results[key] = await checkUrl(u);
  }

  return {
    adapter: 'technetgame',
    project: project.id,
    checks: results,
    ok: Object.values(results).every(r => r.ok),
  };
}

module.exports = { collectLogs, extractErrors, runTechNetGameChecks };
