#!/usr/bin/env node
/**
 * ST-01 — Vision Agent Local end-to-end stress test
 * Validates: ok=true for all /run call variants
 * §98-A requirement: stress test must pass before Tutorial T2 creation
 *
 * Run: node tests/st-01-agent-local.cjs
 * Prereq: Vision Agent Local running on localhost:7070
 */
'use strict';

const http = require('http');

const AGENT_URL = process.env.VC_AGENT_URL || 'http://localhost:7070';
let passed = 0;
let failed = 0;

/* ── HTTP helper ──────────────────────────────────────────────── */
function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(AGENT_URL + path);
    const req = http.request({
      hostname: u.hostname, port: u.port || 7070,
      path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        try   { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const u = new URL(AGENT_URL + path);
    const req = http.request({ hostname: u.hostname, port: u.port || 7070, path: u.pathname, method: 'GET' }, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        try   { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/* ── Test runner ──────────────────────────────────────────────── */
function assert(label, condition, detail) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

/* ── Tests ────────────────────────────────────────────────────── */
async function runTests() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  ST-01 — Vision Agent Local Stress Test  ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // T1 — Health check
  console.log('T1: Health check (GET /)');
  try {
    const r = await get('/');
    assert('status 200',   r.status === 200);
    assert('ok=true',      r.body.ok === true, JSON.stringify(r.body.ok));
    assert('agent field',  r.body.agent === 'vision-agent-local');
    assert('version 1.0.0', r.body.version === '1.0.0');
    assert('project set',  typeof r.body.project === 'string' && r.body.project.length > 0);
  } catch (e) {
    assert('health reachable', false, e.message);
  }

  // T2 — /run with `input` field (canonical)
  console.log('\nT2: POST /run with canonical {input} field');
  try {
    const r = await post('/run', { input: 'fix quota endpoint middleware checkMissionQuota' });
    assert('ok=true',          r.body.ok === true, JSON.stringify(r.body.ok));
    assert('has steps',        Array.isArray(r.body.steps) && r.body.steps.length >= 3);
    assert('scan ok',          r.body.steps.find(s => s.step === 'scan')?.ok === true);
    assert('search ok',        r.body.steps.find(s => s.step === 'search')?.ok === true);
    assert('read ok',          r.body.steps.find(s => s.step === 'read')?.ok === true, JSON.stringify(r.body.steps));
    assert('output non-empty', typeof r.body.output === 'string' && r.body.output.length > 10);
    assert('mission_id set',   typeof r.body.mission_id === 'string');
    assert('agent field',      r.body.agent === 'vision-agent-local');
  } catch (e) {
    assert('/run reachable', false, e.message);
  }

  // T3 — /run with `mission` alias (legacy field name)
  console.log('\nT3: POST /run with legacy {mission} alias field');
  try {
    const r = await post('/run', { mission: 'corrigir erro de autenticação JWT' });
    assert('ok=true (alias)',  r.body.ok === true, JSON.stringify(r.body.ok));
    assert('read ok (alias)',  r.body.steps?.find(s => s.step === 'read')?.ok === true,
      JSON.stringify(r.body.steps));
  } catch (e) {
    assert('/run alias reachable', false, e.message);
  }

  // T4 — /run with short keywords (< 4 chars) — should fallback to structure listing with ok=true
  console.log('\nT4: POST /run with short/unmatched keywords — fallback to structure listing');
  try {
    const r = await post('/run', { input: 'xyz_unmatched_keyword_zzz_9999' });
    assert('ok=true (fallback)', r.body.ok === true, JSON.stringify(r.body.ok));
    const readStep = r.body.steps?.find(s => s.step === 'read');
    assert('read ok (fallback)', readStep?.ok === true, JSON.stringify(readStep));
    assert('output has estrutura', (r.body.output || '').includes('Estrutura') || r.body.output.length > 50);
  } catch (e) {
    assert('/run fallback reachable', false, e.message);
  }

  // T5 — /run with `message` alias
  console.log('\nT5: POST /run with {message} alias field');
  try {
    const r = await post('/run', { message: 'server.js quota backend route' });
    assert('ok=true (message alias)', r.body.ok === true, JSON.stringify(r.body.ok));
  } catch (e) {
    assert('/run message alias', false, e.message);
  }

  // T6 — Health check on /health path
  console.log('\nT6: GET /health alias');
  try {
    const r = await get('/health');
    assert('/health ok=true', r.body.ok === true);
  } catch (e) {
    assert('/health reachable', false, e.message);
  }

  // T7 — Empty input should not crash — returns structure
  console.log('\nT7: POST /run with empty input — should not crash');
  try {
    const r = await post('/run', { input: '' });
    assert('no crash',    r.status === 200);
    assert('ok=true',     r.body.ok === true, JSON.stringify(r.body.ok));
    assert('has output',  typeof r.body.output === 'string' && r.body.output.length > 0);
  } catch (e) {
    assert('empty input handled', false, e.message);
  }

  /* ── Results ──────────────────────────────────────────────── */
  const total = passed + failed;
  console.log('\n══════════════════════════════════════════════');
  console.log(`ST-01 RESULT: ${passed}/${total} PASS — ${failed} FAIL`);
  if (failed === 0) {
    console.log('✅ ST-01 PASSED — Vision Agent Local end-to-end ok');
  } else {
    console.log('❌ ST-01 FAILED — fix issues above before creating Tutorial T2');
  }
  console.log('══════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('ST-01 fatal error:', e.message);
  process.exit(2);
});
