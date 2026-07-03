/**
 * §130 — PI Harness V3.0.0: primeira execução real em staging
 * Testa: infra do pi-harness, fixes de goRunner/server, produção com Go Core.
 *
 * Padrão: curl direto contra produção + grep em arquivos locais.
 * Sem jsdom, sem Playwright.
 */
'use strict';

const https = require('https');
const http  = require('http');
const assert = require('assert');
const fs   = require('fs');
const path = require('path');

const GW = 'visioncore-api-gateway.weiganlight.workers.dev';
const TIMEOUT = 35000;

let pass = 0;
let fail = 0;

function log(label, ok, detail) {
  if (ok) { console.log(`  OK  ${label}`); pass++; }
  else     { console.log(`  FAIL ${label}: ${detail}`); fail++; }
}

function postHttps(endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts = {
      hostname: GW, path: endpoint, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      rejectUnauthorized: false
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(TIMEOUT, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(payload);
    req.end();
  });
}

function postHttp(port, path_, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port, path: path_, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(TIMEOUT, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(payload);
    req.end();
  });
}

function getHttps(endpoint) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: GW, path: endpoint, method: 'GET', rejectUnauthorized: false };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(TIMEOUT, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

// ─── T1: pi-harness.mjs existe e tem >3000 linhas ───────────────────────────
function t1_piharness_file() {
  console.log('\nT1: tools/pi-harness.mjs existe e tem >3000 linhas');
  const src = fs.readFileSync(path.join(__dirname, 'tools/pi-harness.mjs'), 'utf8');
  const lines = src.split('\n').length;
  log('pi-harness.mjs existe', true, '');
  log(`pi-harness.mjs >3000 linhas (${lines})`, lines > 3000, `${lines} linhas`);
  log('D0-D7 definidos', /runLayerD0/.test(src) && /runLayerD7/.test(src), 'funções não encontradas');
  log('httpPost fix (tmp file)', /pi-harness-post-.*\.json/.test(src), 'fix não encontrado');
}

// ─── T2: grep fixes em goRunner.js e server.js ──────────────────────────────
function t2_fixes_grep() {
  console.log('\nT2: Fixes goRunner.js + server.js');
  const goRunner = fs.readFileSync(path.join(__dirname, 'backend/src/runtime/goRunner.js'), 'utf8');
  log('goRunner: --dry-run comentado', /\/\/ if \(dryRun\) missionArgs\.push/.test(goRunner), 'fix não encontrado');

  const server = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');
  log('server.js: missionRoot sem ..',
      !(/path\.resolve.*ROOT.*,\s*'\.\.'\s*\)/).test(server) || /VISION_PROJECT_ROOT \|\| ROOT \|\| process\.cwd\(\)\)/.test(server),
      'missionRoot ainda tem ".."');
  log('server.js: archivist presente (reg §129)', /archivistSearch/.test(server), 'regressão');
}

// ─── T3: binário Linux existe localmente ────────────────────────────────────
function t3_linux_bin() {
  console.log('\nT3: Binário Linux existe localmente');
  const binPath = path.join(__dirname, 'bin/vision-core-linux');
  const exists = fs.existsSync(binPath);
  log('bin/vision-core-linux existe', exists, 'binário não encontrado');
  if (exists) {
    const size = fs.statSync(binPath).size;
    log('binário >10MB', size > 10_000_000, `size=${size}`);
  }
}

// ─── T4: D2 output (JSON salvo) tem D0-D2 PASS ──────────────────────────────
function t4_d2_output() {
  console.log('\nT4: D2 output JSON salvo');
  const p = path.join(__dirname, '_s130_piharness_d2_output.json');
  if (!fs.existsSync(p)) { log('_s130_piharness_d2_output.json existe', false, 'arquivo não encontrado'); return; }
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  log('D2 result=PASS', d.result === 'PASS', `result=${d.result}`);
  log('D0 executado', (d.layers_executed || []).includes('D0'), JSON.stringify(d.layers_executed));
  log('D2 executado', (d.layers_executed || []).includes('D2'), JSON.stringify(d.layers_executed));
  log('D0 syntax_ok', (d.gates || {}).syntax_ok === true, 'syntax_ok não true');
}

// ─── T5: D4 output (JSON salvo) tem D4 executado com evidence_receipt ────────
function t5_d4_output() {
  console.log('\nT5: D4 output JSON salvo — evidence_receipt real');
  const p = path.join(__dirname, '_s130_piharness_d4_output.json');
  if (!fs.existsSync(p)) { log('_s130_piharness_d4_output.json existe', false, 'arquivo não encontrado'); return; }
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  log('D4 executado', (d.layers_executed || []).includes('D4'), JSON.stringify(d.layers_executed));
  log('backend_alive=true', (d.gates || {}).backend_alive === true, 'backend_alive não true');
  log('backend_mission_id=true', (d.gates || {}).backend_mission_id === true,
      `backend_mission_id=${(d.gates||{}).backend_mission_id}`);
  log('backend_evidence_receipt=true', (d.gates || {}).backend_evidence_receipt === true,
      `backend_evidence_receipt=${(d.gates||{}).backend_evidence_receipt}`);
  log('evidence_source_go_core=true', (d.gates || {}).evidence_source_go_core === true,
      `evidence_source_go_core=${(d.gates||{}).evidence_source_go_core}`);
  log('run_live_mission_id presente', !!(d.run_live_mission_id || '').startsWith('mission_'),
      `run_live_mission_id=${d.run_live_mission_id}`);
  log('evidence_source=go-core', d.evidence_source === 'go-core',
      `evidence_source=${d.evidence_source}`);
}

// ─── T6: /api/health produção não quebrou ───────────────────────────────────
async function t6_health() {
  console.log('\nT6: /api/health produção');
  try {
    const r = await getHttps('/api/health');
    log('health ok:true', r.body && r.body.ok === true, JSON.stringify(r.body).slice(0, 100));
  } catch (e) {
    log('health reachable', false, e.message);
  }
}

// ─── T7: /api/run-live produção com Go Core (após deploy EB §130) ────────────
async function t7_production_run_live() {
  console.log('\nT7: /api/run-live producao (Go Core deve executar apos deploy)');
  try {
    const r = await postHttps('/api/run-live', {
      input: 's130-smoke-test',
      dry_run: true,
      mode: 'runtime-probe'
    });
    const b = r.body;
    const goRan = b && b.go_core_executed === true;
    const hasMissionId = b && typeof b.mission_id === 'string' && b.mission_id.startsWith('mission_');
    const hasEvidence = b && b.evidence_receipt && b.evidence_receipt.source === 'go-core';

    log('/api/run-live status 200', r.status === 200, `status=${r.status}`);
    log('go_core_executed:true', goRan, `go_core_executed=${b && b.go_core_executed}`);
    log('mission_id real', hasMissionId, `mission_id=${b && b.mission_id}`);
    log('evidence_receipt.source=go-core', hasEvidence,
        `source=${b && b.evidence_receipt && b.evidence_receipt.source}`);
    if (b) {
      log('nao retornou go_core_unavailable', b.error_type !== 'go_core_unavailable',
          `error_type=${b.error_type}`);
    }
  } catch (e) {
    log('/api/run-live reachable', false, e.message);
    log('go_core_executed', false, 'request failed');
    log('mission_id real', false, 'request failed');
    log('evidence_receipt', false, 'request failed');
    log('nao unavailable', false, 'request failed');
  }
}

// ─── Runner ─────────────────────────────────────────────────────────────────
(async () => {
  console.log('=== S130 -- PI Harness V3.0.0 ===\n');

  t1_piharness_file();
  t2_fixes_grep();
  t3_linux_bin();
  t4_d2_output();
  t5_d4_output();
  await t6_health();
  await t7_production_run_live();

  console.log(`\n=== RESULTADO: ${pass}/${pass + fail} PASS ===`);
  if (fail > 0) process.exit(1);
})();
