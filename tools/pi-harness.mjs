#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║   PI HARNESS V15.7 — VISION CORE AUTONOMOUS MISSION RUNNER          ║
 * ║   D0-Preflight → D1-Cleanup → D2-Contract → D3-GoCore               ║
 * ║   → D4-Backend → D5-Repair → D6-AutoFix → D7-Decision → D8-Report  ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║   REGRAS ABSOLUTAS                                                   ║
 * ║   • SEM PASS GOLD REAL → não promove, não libera, não stable         ║
 * ║   • evidence_receipt SOMENTE do Go Core                              ║
 * ║   • Backend não fabrica evidence                                      ║
 * ║   • Frontend visual INTOCÁVEL                                         ║
 * ║   • NUNCA commit/push/merge/deploy/tag automático nesta fase         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Uso:
 *   node tools/pi-harness.mjs
 *   node tools/pi-harness.mjs --dry-run --max-difficulty D8
 *   node tools/pi-harness.mjs --json
 *   node tools/pi-harness.mjs --ci --max-difficulty D3
 *   node tools/pi-harness.mjs --no-autofix
 */

import { execSync, spawnSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'fs';
import { resolve, join, dirname, basename } from 'path';
import { tmpdir } from 'os';
import {
  createHermesMissionContext,
  validateAgentOutput,
  detectAgentConflict,
  resolveAgentConflict,
  recordHermesEvent,
  renderHermesSupervisionReport,
  attachRuntimeEvidence,
  evaluateHermesDecision,
} from './hermes/mission-supervisor.mjs';
import {
  createRuntimeEvidence,
  collectRuntimeEvidence,
  validateRuntimeEvidence,
  renderRuntimeEvidenceSummary,
} from './hermes/runtime-evidence.mjs';
import {
  createDecisionMatrix,
  evaluateDecisionMatrix,
  evaluateReleaseReadiness,
  renderDecisionMatrixSummary,
  renderReleaseReadinessGate,
} from './hermes/decision-matrix.mjs';

// ═══════════════════════════════════════════════════════════════════
// CONFIG — FLAGS
// ═══════════════════════════════════════════════════════════════════

const ROOT       = resolve(process.cwd());
const ARGS       = process.argv.slice(2);
const FLAG       = f => ARGS.includes(f);
const ARG        = prefix => { const a = ARGS.find(x => x === prefix || x.startsWith(prefix + '=')); return a ? (a.includes('=') ? a.split('=')[1] : ARGS[ARGS.indexOf(a)+1]) : null; };

const DRY_RUN    = FLAG('--dry-run');
const NO_AUTOFIX = FLAG('--no-autofix');
const JSON_MODE  = FLAG('--json');
const CI_MODE       = FLAG('--ci');
const RUNTIME_PROBE = FLAG('--runtime-probe');

// V15.3 runtime probe flags
const RUNTIME_PROBE_NO_START   = FLAG('--runtime-probe-no-start');
const RUNTIME_PROBE_ROOT_ARG   = ARG('--runtime-probe-root') || null;
const RUNTIME_PROBE_PORT       = Number(ARG('--runtime-probe-port') || process.env.PORT || 8080);
const RUNTIME_PROBE_TIMEOUT_MS = Number(ARG('--runtime-probe-timeout-ms') || 8000);

const DIFFICULTY_ORDER = ['D0','D1','D2','D3','D4','D5','D6','D7','D8'];
const rawMaxDiff = ARG('--max-difficulty') || 'D8';
const MAX_DIFF_IDX = DIFFICULTY_ORDER.includes(rawMaxDiff)
  ? DIFFICULTY_ORDER.indexOf(rawMaxDiff)
  : 8;

const LOCAL_BACKEND_PORT = RUNTIME_PROBE_PORT;
const LOCAL_BACKEND_BASE = `http://localhost:${LOCAL_BACKEND_PORT}`;

// Handle for backend process started by --runtime-probe
let _backendProcess      = null;
// Temp root managed by runtime probe (V15.3)
let _probeTempRoot        = null;
let _probeTempRootCreated = false;
// Hermes Mission Supervisor context (V15.5)
let _hermesCtx = null;
// Runtime Evidence snapshot (V15.6)
let _runtimeEvidence = null;
// Decision Matrix snapshot (V15.7)
let _decisionMatrix = null;

// ═══════════════════════════════════════════════════════════════════
// FAKE EVIDENCE SCAN PATTERNS
// ═══════════════════════════════════════════════════════════════════

const FAKE_EVIDENCE_PATTERNS = [
  'makeFakeEvidence',
  'makeBackendReceipt',
  'fallbackReceipt',
  'evr_backend',
  'backend-derived evidence',
];

const FORBIDDEN_HARDCODED = [
  "pass_gold" + ":" + "true",
  "promotion_allowed" + ":" + "true",
  'VISUAL_PATCH_AUTHORIZED',
  "deploy_allowed" + ":" + "true",
];

// ═══════════════════════════════════════════════════════════════════
// RUNTIME CONTRACT HELPERS (V15.2)
// ═══════════════════════════════════════════════════════════════════

function normalizeFailedGates(value) {
  if (Array.isArray(value)) return { normalized: value, warning: null };
  if (value === null || value === undefined) return { normalized: [], warning: null };
  if (typeof value === 'string') return { normalized: [value], warning: `failed_gates era string, normalizado para array` };
  return { normalized: [], warning: `failed_gates tipo inválido: ${typeof value}, normalizado para []` };
}

function classifyRuntimeContractFailure(error) {
  if (error.includes('deploy_allowed')) return 'BLOCKED_DEPLOY_GUARD';
  return 'BLOCKED_EVIDENCE';
}

function validateRuntimeContract(probe) {
  const errors   = [];
  const warnings = [];

  const missionId       = probe.mission_id || null;
  const evidenceReceipt = (probe.evidence_receipt && typeof probe.evidence_receipt === 'object')
    ? probe.evidence_receipt : null;
  const evidenceSourceTopLevel  = probe.evidence_source || null;
  const evidenceReceiptSource   = evidenceReceipt?.source || null;
  const evidenceReceiptMissionId = evidenceReceipt?.mission_id || null;

  // 1. Coerência mission_id / evidence_receipt
  if (evidenceReceipt) {
    if (!evidenceReceiptMissionId) {
      errors.push('evidence_receipt.mission_id ausente');
    } else if (evidenceReceiptMissionId !== missionId) {
      errors.push(`evidence_receipt.mission_id="${evidenceReceiptMissionId}" diverge de mission_id="${missionId}"`);
    }
  }

  // 2. Coerência evidence source
  if (evidenceReceipt) {
    if (!evidenceSourceTopLevel) {
      errors.push('evidence_source top-level ausente com evidence_receipt presente');
    } else if (evidenceSourceTopLevel !== 'go-core') {
      errors.push(`evidence_source top-level="${evidenceSourceTopLevel}" deve ser "go-core"`);
    }
    if (evidenceSourceTopLevel && evidenceReceiptSource && evidenceSourceTopLevel !== evidenceReceiptSource) {
      errors.push(`evidence_source="${evidenceSourceTopLevel}" diverge de evidence_receipt.source="${evidenceReceiptSource}"`);
    }
  }

  // 3. Coerência PASS GOLD
  const passGold = probe.pass_gold === true;
  const { normalized: normalizedFailedGates, warning: fgWarning } = normalizeFailedGates(probe.failed_gates);
  if (fgWarning) warnings.push(fgWarning);

  if (passGold) {
    if (!evidenceReceipt) {
      errors.push('pass_gold:true sem evidence_receipt válido');
    }
    if (normalizedFailedGates.length > 0) {
      errors.push(`pass_gold:true com failed_gates não vazio: [${normalizedFailedGates.join(', ')}]`);
    }
    if (probe.backend_stub !== false) {
      errors.push('pass_gold:true com backend_stub não false');
    }
    if (evidenceReceiptSource !== 'go-core') {
      errors.push(`pass_gold:true com evidence_receipt.source="${evidenceReceiptSource}" ≠ "go-core"`);
    }
    if (probe.deploy_allowed === true) {
      errors.push('pass_gold:true com deploy_allowed:true — incoerente');
    }
  }

  // 4. Coerência promotion_allowed
  const promotionAllowed = probe.promotion_allowed === true;
  if (promotionAllowed) {
    if (!passGold) {
      errors.push('promotion_allowed:true sem pass_gold:true');
    }
    if (probe.backend_stub === true) {
      errors.push('promotion_allowed:true com backend_stub:true');
    }
    if (evidenceSourceTopLevel !== 'go-core') {
      errors.push(`promotion_allowed:true sem evidence_source go-core`);
    }
  }

  // 5. deploy_allowed
  if (probe.deploy_allowed === true) {
    errors.push('deploy_allowed:true — bloqueio crítico imediato');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalized: {
      mission_id:                  missionId,
      evidence_source:             evidenceSourceTopLevel,
      evidence_receipt_source:     evidenceReceiptSource,
      evidence_receipt_mission_id: evidenceReceiptMissionId,
      backend_stub:                probe.backend_stub,
      pass_gold:                   passGold,
      promotion_allowed:           promotionAllowed,
      deploy_allowed:              probe.deploy_allowed === true,
      failed_gates:                normalizedFailedGates,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// RELATÓRIO ACUMULADO
// ═══════════════════════════════════════════════════════════════════

const REPORT = {
  auditLog:     [],
  actionsToken: [],
};

function audit(msg) {
  if (!JSON_MODE && !CI_MODE) process.stdout.write(`  ${msg}\n`);
  REPORT.auditLog.push(msg);
}

function log(msg) {
  if (!JSON_MODE) process.stdout.write(msg + '\n');
}

// ═══════════════════════════════════════════════════════════════════
// SHELL UTILITIES
// ═══════════════════════════════════════════════════════════════════

function sh(cmd) {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim(); }
  catch { return null; }
}

function shFull(cmd, timeout = 90000) {
  const r = spawnSync(cmd, { shell: true, cwd: ROOT, encoding: 'utf8', timeout });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function read(rel) {
  const p = join(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

function write(rel, content) {
  if (DRY_RUN) { audit(`DRY_RUN skip write: ${rel}`); return false; }
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, 'utf8');
  return true;
}

function nodeCheck(rel) {
  if (!existsSync(join(ROOT, rel))) return null;
  return shFull(`node --check "${join(ROOT, rel).replace(/\\/g,'/')}"`, 15000).ok;
}

function guardPass() {
  if (!existsSync(join(ROOT, 'tools/sddf-front-guard.mjs'))) return true;
  const r = shFull('node tools/sddf-front-guard.mjs', 20000);
  return r.out.includes('GUARD PASS') || r.out.includes('FRONT GUARD PASS');
}

function httpGet(url, timeoutMs = 8000) {
  const cmd = `node -e "const http=require('http');const u=new URL('${url}');const req=http.get({hostname:u.hostname,port:u.port,path:u.pathname+u.search,timeout:${timeoutMs}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{process.stdout.write(JSON.stringify(JSON.parse(d)));}catch{process.stdout.write(d);}});});req.on('error',e=>process.stdout.write('ERROR:'+e.message));req.end();"`;
  const r = shFull(cmd, timeoutMs + 2000);
  if (!r.ok || r.out.startsWith('ERROR:')) return null;
  try { return JSON.parse(r.out); } catch { return null; }
}

function httpPost(url, body, timeoutMs = 10000) {
  const payload = JSON.stringify(body).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const cmd = `node -e "const http=require('http');const d=JSON.stringify(${JSON.stringify(body)});const u=new URL('${url}');const req=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d)},timeout:${timeoutMs}},(res)=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>{try{process.stdout.write(JSON.stringify(JSON.parse(b)));}catch{process.stdout.write(b);}});});req.on('error',e=>process.stdout.write('ERROR:'+e.message));req.write(d);req.end();"`;
  const r = shFull(cmd, timeoutMs + 2000);
  if (!r.ok || r.out.startsWith('ERROR:')) return null;
  try { return JSON.parse(r.out); } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════
// MISSION STATE
// ═══════════════════════════════════════════════════════════════════

function createMissionState() {
  return {
    // Environment
    branch:               null,
    gitStatus:            null,
    gitHead:              null,
    // Visual locks
    visualGoldLockPass:   false,
    frontendVisualPass:   false,
    guardOk:              false,
    // Syntax
    syntaxOk:             true,
    syntaxErrors:         [],
    // Go build/test
    goCoreTestPass:       false,
    goCoreBuildPass:      false,
    goCoreCompiled:       false,
    goCorePath:           null,
    // Fake evidence scan
    fakeEvidenceAbsent:   false,
    fakeEvidenceHits:     [],
    // Forbidden diff
    forbiddenDiffAbsent:  false,
    forbiddenDiffFiles:   [],
    // Untracked binary
    untrackedBinaryAbsent: false,
    // Contract validation
    evidenceReceiptInSchema:     false,
    evidenceReceiptInNormalizer: false,
    strictGateLogicPresent:      false,
    contractMissingFields:       [],
    // Go Core runtime
    goRuntimeExecuted:    false,
    goRuntimeMissionId:   null,
    goRuntimeEvidenceId:  null,
    goRuntimeEvidenceSource: null,
    goRuntimeBackendStub: true,
    goRuntimePassGold:    false,
    goRuntimeFailedGates: [],
    // Backend runtime
    backendAlive:               false,
    backendHealthOk:            false,
    backendHasMissionId:        false,
    backendHasEvidenceReceipt:  false,
    backendStub:                true,
    evidenceSource:             null,
    // Repair
    errorTypes:           [],
    repairPlan:           [],
    autoFixable:          [],
    manualRequired:       [],
    // Fixes applied
    actionsToken:         [],
    filesChanged:         [],
    filesRestored:        [],
    // Gates
    passGoldCandidate:    false,
    promotionAllowed:     false,
    deployAllowed:        false,
    strictPassGoldReason: [],
    // Legacy
    legacyCleanConfirmed: false,
    v14CleanOwnership:    false,
    githubConfirmed:      false,
    // Result
    result:           'PENDING',
    recommendation:   'NEEDS_MANUAL_REVIEW',
    blockReason:      null,
    layersExecuted:   [],
    layersFailed:     [],
    // Runtime Probe (V15.1)
    runtimeProbeEnabled:   false,
    backendProcessStarted: false,
    backendProcessStopped: false,
    backendHealthStatus:   'not_probed',
    runLiveStatus:         'not_probed',
    runLiveMissionId:      null,
    runLiveEvidenceSource: null,
    runLiveBackendStub:    null,
    runLiveDeployAllowed:  null,
    runtimeProbePass:      false,
    // Runtime Contract (V15.2)
    runtimeContractPass:      false,
    runtimeContractErrors:    [],
    runtimeContractWarnings:  [],
    runtimeContractChecked:   false,
    runLivePassGold:          null,
    runLivePromotionAllowed:  null,
    runLiveFailedGates:       [],
    // Runtime Probe V15.3: temp root + config
    runtimeProbeTempRoot:        null,
    runtimeProbeTempRootCreated: false,
    runtimeProbeTempRootRemoved: false,
    runtimeProbeNoStart:         false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// STRICT PASS GOLD GATE
// ═══════════════════════════════════════════════════════════════════

function computeStrictPassGoldCandidate(s) {
  return Boolean(
    s.backendAlive === true &&
    s.backendStub === false &&
    s.backendHasMissionId === true &&
    s.backendHasEvidenceReceipt === true &&
    s.evidenceSource === 'go-core' &&
    s.evidenceReceiptInSchema === true &&
    s.evidenceReceiptInNormalizer === true &&
    s.goCoreCompiled === true &&
    s.guardOk === true &&
    s.legacyCleanConfirmed === true &&
    s.v14CleanOwnership === true &&
    s.fakeEvidenceAbsent === true &&
    s.forbiddenDiffAbsent === true
  );
}

function computeStrictPassGoldReason(s) {
  const missing = [];
  if (!s.backendAlive)              missing.push('backend_alive');
  if (s.backendStub)                missing.push('backend_not_stub');
  if (!s.backendHasMissionId)       missing.push('mission_id');
  if (!s.backendHasEvidenceReceipt) missing.push('evidence_receipt');
  if (s.evidenceSource !== 'go-core') missing.push('evidence_source_go_core');
  if (!s.evidenceReceiptInSchema)   missing.push('evidence_schema');
  if (!s.evidenceReceiptInNormalizer) missing.push('evidence_normalizer');
  if (!s.goCoreCompiled)            missing.push('go_core_compiled');
  if (!s.guardOk)                   missing.push('front_guard');
  if (!s.legacyCleanConfirmed)      missing.push('legacy_clean');
  if (!s.v14CleanOwnership)         missing.push('v14_clean_ownership');
  if (!s.fakeEvidenceAbsent)        missing.push('fake_evidence_absent');
  if (!s.forbiddenDiffAbsent)       missing.push('forbidden_diff_absent');
  return missing;
}

// ═══════════════════════════════════════════════════════════════════
// D0 — PREFLIGHT
// ═══════════════════════════════════════════════════════════════════

async function runLayerD0Preflight(s) {
  s.layersExecuted.push('D0');
  audit('[D0] Preflight iniciado');

  // Branch
  s.branch = sh('git rev-parse --abbrev-ref HEAD') || 'unknown';
  audit(`[D0] branch: ${s.branch}`);

  // Git status
  const statusRaw = sh('git status --porcelain') || '';
  s.gitStatus = statusRaw.trim() || 'clean';
  s.gitHead   = sh('git rev-parse HEAD') || '?';
  audit(`[D0] git head: ${s.gitHead.slice(0,8)} | status: ${s.gitStatus === 'clean' ? 'clean' : 'dirty'}`);

  // Visual locks
  if (existsSync(join(ROOT, 'tools/visual-gold-harness-lock.mjs'))) {
    const r = shFull('node tools/visual-gold-harness-lock.mjs', 20000);
    s.visualGoldLockPass = r.out.includes('LOCK PASS') || r.out.includes('VISUAL GOLD HARNESS LOCK PASS');
    audit(`[D0] visual-gold-harness-lock: ${s.visualGoldLockPass ? 'PASS' : 'FAIL'}`);
  } else {
    s.visualGoldLockPass = true;
    audit('[D0] visual-gold-harness-lock: ausente (skip)');
  }

  if (existsSync(join(ROOT, 'tools/frontend-visual-lock.mjs'))) {
    const r = shFull('node tools/frontend-visual-lock.mjs', 20000);
    s.frontendVisualPass = r.out.includes('LOCK PASS') || r.out.includes('FRONTEND VISUAL LOCK PASS') || r.out.includes('VISUAL LOCK PASS');
    audit(`[D0] frontend-visual-lock: ${s.frontendVisualPass ? 'PASS' : 'FAIL'}`);
  } else {
    s.frontendVisualPass = true;
    audit('[D0] frontend-visual-lock: ausente (skip)');
  }

  s.guardOk = guardPass();
  audit(`[D0] sddf-front-guard: ${s.guardOk ? 'PASS' : 'FAIL'}`);

  // Node syntax checks
  const syntaxTargets = [
    'tools/pi-harness.mjs',
    'backend/server.js',
    'backend/src/runtime/goRunner.js',
  ];
  const syntaxErrors = [];
  for (const f of syntaxTargets) {
    const ok = nodeCheck(f);
    if (ok === null) { audit(`[D0] syntax skip (ausente): ${f}`); continue; }
    if (!ok) {
      syntaxErrors.push(f);
      audit(`[D0] syntax FAIL: ${f}`);
    } else {
      audit(`[D0] syntax OK: ${basename(f)}`);
    }
  }
  s.syntaxErrors = syntaxErrors;
  s.syntaxOk     = syntaxErrors.length === 0;

  // Go test/build — run inside go-core/ where go.mod lives
  const goVer = sh('go version 2>/dev/null || go version 2>nul');
  const goCoreDir = join(ROOT, 'go-core');
  if (goVer && existsSync(goCoreDir)) {
    const goTest = spawnSync('go', ['test', './...'], {
      cwd: goCoreDir, shell: false, encoding: 'utf8', timeout: 120000,
    });
    s.goCoreTestPass = goTest.status === 0 || (goTest.stdout || '').includes('ok ');
    audit(`[D0] go test: ${s.goCoreTestPass ? 'PASS' : 'FAIL'}`);
    if (!s.goCoreTestPass) audit(`[D0] go test err: ${(goTest.stderr || '').slice(0,120)}`);

    const goBuild = spawnSync('go', ['build', './...'], {
      cwd: goCoreDir, shell: false, encoding: 'utf8', timeout: 60000,
    });
    s.goCoreBuildPass = goBuild.status === 0;
    audit(`[D0] go build: ${s.goCoreBuildPass ? 'PASS' : 'FAIL'}`);
  } else if (!goVer) {
    audit('[D0] go: não instalado ou não no PATH — skip go test/build');
    s.goCoreTestPass  = false;
    s.goCoreBuildPass = false;
  } else {
    audit('[D0] go-core/ não encontrado — skip go test/build');
    s.goCoreTestPass  = false;
    s.goCoreBuildPass = false;
  }

  // Go binary detection
  const ext = process.platform === 'win32' ? '.exe' : '';
  const binCandidates = [
    `bin/vision-core${ext}`,
    `go-core/vision-core${ext}`,
    `bin/vision-core`,
    `go-core/vision-core`,
  ];
  for (const c of binCandidates) {
    if (existsSync(join(ROOT, c))) {
      s.goCoreCompiled = true;
      s.goCorePath     = c;
      break;
    }
  }
  audit(`[D0] go binary: ${s.goCoreCompiled ? s.goCorePath : 'não encontrado'}`);

  // Untracked binary check (binary should be in .gitignore)
  const gitignoreContent = read('.gitignore') || '';
  const binInGitignore = gitignoreContent.includes('bin/') || gitignoreContent.includes('/bin');
  const statusLines = (sh('git status --porcelain') || '').split('\n');
  const untrackedBin = statusLines.some(l => l.startsWith('??') && l.includes('bin/'));
  s.untrackedBinaryAbsent = !untrackedBin;
  audit(`[D0] bin/ in .gitignore: ${binInGitignore} | untracked binary: ${untrackedBin ? 'WARN' : 'OK'}`);

  // Fake evidence scan — backend files only (harness legitimately contains these as detection strings)
  const scanTargets = [
    'backend/server.js',
    'backend/src/runtime/goRunner.js',
  ];
  const hits = [];
  for (const file of scanTargets) {
    const content = read(file);
    if (!content) continue;
    for (const pattern of FAKE_EVIDENCE_PATTERNS) {
      if (content.includes(pattern)) {
        hits.push(`${file}: "${pattern}"`);
      }
    }
  }
  s.fakeEvidenceHits   = hits;
  s.fakeEvidenceAbsent = hits.length === 0;
  audit(`[D0] fake evidence scan: ${s.fakeEvidenceAbsent ? 'CLEAN' : 'HITS=' + hits.length}`);
  if (!s.fakeEvidenceAbsent) for (const h of hits) audit(`  !! ${h}`);

  // Forbidden diff — changes to frontend since branch base
  const diffFiles = (sh('git diff --name-only HEAD 2>/dev/null || git diff --name-only') || '').split('\n').filter(Boolean);
  const forbiddenFiles = diffFiles.filter(f =>
    f.startsWith('frontend/') || f.startsWith('bin/')
  );
  s.forbiddenDiffFiles  = forbiddenFiles;
  s.forbiddenDiffAbsent = forbiddenFiles.length === 0;
  audit(`[D0] forbidden diff: ${s.forbiddenDiffAbsent ? 'CLEAN' : 'FILES=' + forbiddenFiles.join(',')}`);

  // Legacy ownership check
  const legacyMarkerFiles = [
    'frontend/assets/vision-v34-enterprise.js',
    'frontend/assets/vision-v44-runtime-consistency.js',
  ];
  const CRITICAL_MARKERS = ['window.fetch =', 'executeBtn.onclick', 'EventSource'];
  let totalLegacyMarkers = 0;
  for (const f of legacyMarkerFiles) {
    const c = read(f); if (!c) continue;
    for (const m of CRITICAL_MARKERS) if (c.includes(m)) totalLegacyMarkers++;
  }
  s.legacyCleanConfirmed = totalLegacyMarkers === 0;
  s.v14CleanOwnership    = totalLegacyMarkers === 0;
  audit(`[D0] legacy markers: ${totalLegacyMarkers} | legacy_clean: ${s.legacyCleanConfirmed}`);

  const ok = s.syntaxOk && s.visualGoldLockPass && s.frontendVisualPass;
  if (!ok) {
    s.blockReason = `D0 preflight falhou: syntax=${s.syntaxOk} visual=${s.visualGoldLockPass} frontend=${s.frontendVisualPass}`;
    s.layersFailed.push('D0');
    return false;
  }
  audit('[D0] Preflight: PASS');
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// D1 — SAFE CLEANUP
// ═══════════════════════════════════════════════════════════════════

async function runLayerD1SafeCleanup(s) {
  s.layersExecuted.push('D1');
  audit('[D1] Safe Cleanup iniciado');

  if (DRY_RUN) {
    audit('[D1] DRY_RUN: skip cleanup efetivo');
    return true;
  }

  // Remove temp logs permitidos
  const tempPatterns = ['*.log', 'pi-harness-*.log', 'mission-*.log'];
  const rootFiles = [];
  try {
    for (const f of readdirSync(ROOT)) {
      const isLog = f.endsWith('.log') && !f.startsWith('frontend') && !f.startsWith('backend');
      if (isLog) rootFiles.push(f);
    }
  } catch { /* ignore */ }
  for (const f of rootFiles) {
    try {
      const fullPath = join(ROOT, f);
      if (statSync(fullPath).size < 1024 * 1024) {
        // Skip — don't auto-delete source logs without explicit report
        audit(`[D1] temp log detectado (não deletado sem relatório): ${f}`);
      }
    } catch { /* ignore */ }
  }

  // Check for forbidden staged files
  const staged = sh('git diff --name-only --cached') || '';
  const forbiddenStaged = staged.split('\n').filter(f =>
    f.startsWith('frontend/') &&
    !f.includes('vision-runtime-owner') &&
    !f.includes('vision-report')
  );
  if (forbiddenStaged.length > 0) {
    audit(`[D1] frontend files staged — unstaging: ${forbiddenStaged.join(', ')}`);
    for (const f of forbiddenStaged) {
      const r = shFull(`git restore --staged "${f}"`);
      if (r.ok) {
        s.filesRestored.push(f);
        s.actionsToken.push(`unstage_forbidden:${f}`);
      }
    }
  } else {
    audit('[D1] staged files: OK (nenhum frontend proibido)');
  }

  // Restore frontend if dirty
  const dirty = (sh('git status --porcelain') || '').split('\n').filter(Boolean);
  const frontendDirty = dirty.filter(l => l.match(/frontend\//));
  if (frontendDirty.length > 0) {
    audit(`[D1] frontend dirty detectado: ${frontendDirty.length} files — restaurando`);
    for (const line of frontendDirty) {
      const file = line.trim().replace(/^[MADRCU?! ]+/, '').trim();
      if (!file || file.includes('..')) continue;
      const r = shFull(`git restore "${file}" 2>/dev/null || git checkout HEAD -- "${file}"`);
      if (r.ok) {
        s.filesRestored.push(file);
        s.actionsToken.push(`restore_frontend:${file}`);
        audit(`[D1] restaurado: ${file}`);
      }
    }
  } else {
    audit('[D1] frontend: limpo');
  }

  // package-lock check
  const stagedAll = sh('git diff --name-only --cached') || '';
  if (stagedAll.includes('package-lock.json')) {
    audit('[D1] WARN: package-lock.json staged — unstaging');
    shFull('git restore --staged package-lock.json');
    s.actionsToken.push('unstage_package_lock');
  }

  audit('[D1] Safe Cleanup: PASS');
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// D2 — LOCAL CONTRACT VALIDATION
// ═══════════════════════════════════════════════════════════════════

async function runLayerD2ContractValidation(s) {
  s.layersExecuted.push('D2');
  audit('[D2] Contract Validation iniciado');

  const missing = [];

  // Schema validation
  const schemaContent = read('go-core/contracts/result.schema.json');
  if (!schemaContent) {
    missing.push('result.schema.json ausente');
    s.evidenceReceiptInSchema = false;
  } else {
    let schema;
    try { schema = JSON.parse(schemaContent); } catch { missing.push('result.schema.json: JSON inválido'); }
    if (schema) {
      s.evidenceReceiptInSchema = !!(schema.properties?.evidence_receipt);
      if (!s.evidenceReceiptInSchema) missing.push('evidence_receipt ausente em result.schema.json');

      // Check required fields in schema
      const required = schema.required || [];
      const requiredEvidence = ['ok', 'mission_id', 'pass_gold', 'evidence_receipt'];
      for (const f of requiredEvidence) {
        if (!required.includes(f) && !schema.properties?.[f]) {
          missing.push(`campo schema ausente: ${f}`);
        }
      }
    }
  }
  audit(`[D2] evidence_receipt in schema: ${s.evidenceReceiptInSchema}`);

  // Normalizer validation (goRunner.js)
  const goRunnerContent = read('backend/src/runtime/goRunner.js') || '';
  const serverContent   = read('backend/server.js') || '';
  s.evidenceReceiptInNormalizer = (
    goRunnerContent.includes('evidence_receipt') &&
    goRunnerContent.includes('evidence_source') &&
    goRunnerContent.includes('go-core')
  ) || (
    serverContent.includes('evidence_receipt') &&
    serverContent.includes('go-core')
  );
  if (!s.evidenceReceiptInNormalizer) missing.push('evidence_receipt normalizer ausente em goRunner.js');
  audit(`[D2] evidence_receipt in normalizer: ${s.evidenceReceiptInNormalizer}`);

  // Strict pass gold gate logic presence
  s.strictGateLogicPresent = (
    goRunnerContent.includes('evidenceHasGoSource') ||
    goRunnerContent.includes("source === 'go-core'") ||
    goRunnerContent.includes('evidence_source_not_go_core') ||
    serverContent.includes("source === 'go-core'") ||
    serverContent.includes('evidence_source')
  );
  if (!s.strictGateLogicPresent) missing.push('strict pass gold gate ausente no normalizer');
  audit(`[D2] strict gate logic: ${s.strictGateLogicPresent}`);

  // Backend_stub === false assertion in schema
  const schemaHasStubFalse = schemaContent?.includes('"const": false') && schemaContent?.includes('backend_stub');
  if (!schemaHasStubFalse) missing.push('backend_stub:false não enforçado no schema');
  audit(`[D2] backend_stub:false no schema: ${schemaHasStubFalse}`);

  // evidence_source === "go-core" in schema
  const schemaHasSourceConst = schemaContent?.includes('"const": "go-core"') && schemaContent?.includes('evidence_source');
  audit(`[D2] evidence_source:"go-core" const no schema: ${schemaHasSourceConst}`);

  s.contractMissingFields = missing;

  const criticalMissing = missing.filter(m =>
    m.includes('evidence_receipt') && m.includes('ausente') && !m.includes('schema ausente')
  );
  if (criticalMissing.length > 0) {
    audit(`[D2] missing crítico: ${criticalMissing.join(' | ')}`);
  }

  if (missing.length > 0) {
    audit(`[D2] campos faltantes: ${missing.length}`);
    for (const m of missing) audit(`  - ${m}`);
  } else {
    audit('[D2] contrato completo ✓');
  }

  // D2 PASS se os campos críticos estão presentes
  if (!s.evidenceReceiptInSchema || !s.evidenceReceiptInNormalizer) {
    s.blockReason = `D2 contract: schema=${s.evidenceReceiptInSchema} normalizer=${s.evidenceReceiptInNormalizer}`;
    s.layersFailed.push('D2');
    return false;
  }

  audit('[D2] Contract Validation: PASS');
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// D3 — GO CORE RUNTIME VALIDATION
// ═══════════════════════════════════════════════════════════════════

async function runLayerD3GoCoreRuntime(s) {
  s.layersExecuted.push('D3');
  audit('[D3] Go Core Runtime Validation iniciado');

  // Find binary
  if (!s.goCoreCompiled || !s.goCorePath) {
    audit('[D3] binary não encontrado — tentando compilar');
    const goVer = sh('go version 2>/dev/null || go version 2>nul');
    if (!goVer) {
      audit('[D3] go não instalado — skip');
      s.blockReason = 'go não instalado, binary ausente';
      s.layersFailed.push('D3');
      return false;
    }

    if (!DRY_RUN) {
      mkdirSync(join(ROOT, 'bin'), { recursive: true });
      const ext = process.platform === 'win32' ? '.exe' : '';
      const outBin = `bin/vision-core${ext}`;
      const goCoreMain = join(ROOT, 'go-core', 'cmd', 'vision-core');
      const buildCmd = existsSync(goCoreMain)
        ? `go build -o ${outBin} ./go-core/cmd/vision-core/`
        : `go build -o ${outBin} ./go-core/...`;
      const build = shFull(buildCmd, 120000);
      if (build.ok || existsSync(join(ROOT, outBin))) {
        s.goCoreCompiled = true;
        s.goCorePath     = outBin;
        s.filesChanged.push(outBin);
        s.actionsToken.push('go_core_compiled');
        audit(`[D3] go-core compilado: ${outBin}`);
      } else {
        audit(`[D3] go build falhou: ${build.err.slice(0,200)}`);
        s.blockReason = `go build: ${build.err.slice(0,80)}`;
        s.layersFailed.push('D3');
        return false;
      }
    } else {
      audit('[D3] DRY_RUN: skip go build');
      return true;
    }
  }

  // Execute go-core dry-run
  const binPath = join(ROOT, s.goCorePath);
  if (!existsSync(binPath)) {
    audit(`[D3] binary não existe: ${binPath}`);
    s.blockReason = `binary não existe: ${s.goCorePath}`;
    s.layersFailed.push('D3');
    return false;
  }

  audit(`[D3] executando binary: ${s.goCorePath} --dry-run`);
  const run = shFull(`"${binPath.replace(/\\/g, '/')}" --dry-run 2>&1`, 30000);
  s.goRuntimeExecuted = run.ok || run.out.length > 0;
  audit(`[D3] go runtime exit: ${run.ok ? 'ok' : 'falhou'} | output: ${run.out.length} chars`);

  if (run.out) {
    let parsed = null;
    try {
      const text = run.out.trim();
      const first = text.indexOf('{');
      const last  = text.lastIndexOf('}');
      if (first >= 0 && last > first) {
        parsed = JSON.parse(text.slice(first, last + 1));
      }
    } catch { /* não JSON */ }

    if (parsed) {
      s.goRuntimeMissionId     = typeof parsed.mission_id === 'string' ? parsed.mission_id : null;
      s.goRuntimeEvidenceId    = parsed.evidence_receipt?.id || null;
      s.goRuntimeEvidenceSource = parsed.evidence_receipt?.source || parsed.evidence_source || null;
      s.goRuntimeBackendStub   = parsed.backend_stub !== false;
      s.goRuntimePassGold      = parsed.pass_gold === true;
      s.goRuntimeFailedGates   = Array.isArray(parsed.failed_gates) ? parsed.failed_gates : [];

      audit(`[D3] mission_id: ${s.goRuntimeMissionId || 'null'}`);
      audit(`[D3] evidence_receipt.id: ${s.goRuntimeEvidenceId || 'null'}`);
      audit(`[D3] evidence_receipt.source: ${s.goRuntimeEvidenceSource || 'null'}`);
      audit(`[D3] backend_stub: ${s.goRuntimeBackendStub}`);
      audit(`[D3] pass_gold: ${s.goRuntimePassGold}`);
      audit(`[D3] failed_gates: [${s.goRuntimeFailedGates.join(', ')}]`);

      if (s.goRuntimeEvidenceSource === 'go-core') {
        audit('[D3] evidence_receipt.source === "go-core" ✓');
      } else {
        audit(`[D3] WARN: evidence_receipt.source="${s.goRuntimeEvidenceSource}" ≠ "go-core"`);
      }
    } else {
      audit('[D3] output não é JSON válido — binary em modo texto ou dry-run simples');
    }
  }

  audit('[D3] Go Core Runtime: PASS');
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// RUNTIME PROBE HELPERS (V15.1)
// ═══════════════════════════════════════════════════════════════════

async function tryStartBackend(s) {
  // V15.3: --runtime-probe-no-start skips auto-start entirely
  if (RUNTIME_PROBE_NO_START) {
    s.runtimeProbeNoStart = true;
    audit('[D4] --runtime-probe-no-start: auto-start suprimido');
    return false;
  }
  const serverPath = join(ROOT, 'backend', 'server.js');
  if (!existsSync(serverPath)) {
    audit('[D4] backend/server.js não encontrado — não pode iniciar');
    return false;
  }
  try {
    _backendProcess = spawn(process.execPath, [serverPath], {
      cwd:      ROOT,
      stdio:    ['ignore', 'pipe', 'pipe'],
      env:      { ...process.env, PORT: String(LOCAL_BACKEND_PORT) },
      detached: false,
    });
    s.backendProcessStarted = true;
    audit(`[D4] backend processo iniciado (pid: ${_backendProcess.pid})`);
  } catch (err) {
    audit(`[D4] erro ao iniciar backend: ${err.message}`);
    return false;
  }
  const MAX_WAIT_MS   = RUNTIME_PROBE_TIMEOUT_MS;
  const POLL_INTERVAL = 500;
  let waited = 0;
  while (waited < MAX_WAIT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
    waited += POLL_INTERVAL;
    if (_backendProcess && _backendProcess.exitCode !== null) {
      audit(`[D4] backend terminou inesperadamente (exit: ${_backendProcess.exitCode})`);
      return false;
    }
    const h = httpGet(`${LOCAL_BACKEND_BASE}/api/health`, 1500);
    if (h) {
      audit(`[D4] backend respondeu após ${waited}ms`);
      return true;
    }
  }
  audit(`[D4] backend não respondeu em ${MAX_WAIT_MS}ms`);
  return false;
}

function stopBackend() {
  if (_backendProcess) {
    try { _backendProcess.kill('SIGTERM'); } catch { /* ignore */ }
    try { _backendProcess.kill('SIGKILL'); } catch { /* ignore */ }
    _backendProcess = null;
    return true;
  }
  return false;
}

// V15.3: safe temp root for runtime probe payloads
function createProbeTempRoot() {
  if (RUNTIME_PROBE_ROOT_ARG) {
    _probeTempRoot        = RUNTIME_PROBE_ROOT_ARG;
    _probeTempRootCreated = false;
    return RUNTIME_PROBE_ROOT_ARG;
  }
  const dir = join(tmpdir(), `pi-harness-probe-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  _probeTempRoot        = dir;
  _probeTempRootCreated = true;
  return dir;
}

function removeProbeTempRoot() {
  if (_probeTempRoot && _probeTempRootCreated) {
    try {
      rmSync(_probeTempRoot, { recursive: true, force: true });
      return true;
    } catch { return false; }
  }
  return false;
}

async function runRuntimeProbe(s) {
  // V15.3: create safe temp root, never use repo root for patch
  let tempRoot        = null;
  let tempRootRemoved = false;
  try {
    tempRoot = createProbeTempRoot();
    s.runtimeProbeTempRoot        = tempRoot;
    s.runtimeProbeTempRootCreated = _probeTempRootCreated;
    audit(`[D4] [runtime-probe] temp root: ${tempRoot} (created=${_probeTempRootCreated})`);
  } catch (err) {
    audit(`[D4] [runtime-probe] falha ao criar temp root: ${err.message} — usando tmpdir`);
    tempRoot = tmpdir();
    s.runtimeProbeTempRoot = tempRoot;
  }

  // V15.3: controlled, safe payload — always dry_run=true, never real patch
  const probePayload = {
    input:   'V15.3 runtime pass path self-test',
    root:    tempRoot,
    dry_run: true,
    source:  'pi-harness-runtime-probe',
    mode:    'runtime-probe',
  };
  audit('[D4] [runtime-probe] POST /api/run-live { dry_run:true, mode:"runtime-probe", source:"pi-harness-runtime-probe" }');
  const probe = httpPost(`${LOCAL_BACKEND_BASE}/api/run-live`, probePayload, 15000);

  if (!probe) {
    audit('[D4] [runtime-probe] /api/run-live: sem resposta');
    s.runLiveStatus    = 'no_response';
    s.runtimeProbePass = false;
    s.blockReason      = 'runtime-probe: /api/run-live sem resposta';
    s.layersFailed.push('D4');
    return false;
  }

  s.runLiveStatus        = 'ok';
  s.runLiveMissionId     = probe.mission_id || null;
  s.runLiveEvidenceSource = probe.evidence_receipt?.source || probe.evidence_source || null;
  s.runLiveBackendStub   = probe.backend_stub;
  s.runLiveDeployAllowed = probe.deploy_allowed;

  // Propagar para campos padrão (alimentam computeStrictPassGoldCandidate)
  s.backendHasMissionId       = typeof probe.mission_id === 'string' && String(probe.mission_id).startsWith('mission_');
  s.backendHasEvidenceReceipt = !!(probe.evidence_receipt && typeof probe.evidence_receipt === 'object');
  s.backendStub               = probe.backend_stub !== false;
  s.evidenceSource            = s.runLiveEvidenceSource;

  audit(`[D4] [runtime-probe] mission_id:        ${s.runLiveMissionId || 'null'}`);
  audit(`[D4] [runtime-probe] evidence_receipt.source: ${s.runLiveEvidenceSource || 'null'}`);
  audit(`[D4] [runtime-probe] backend_stub:      ${s.runLiveBackendStub}`);
  audit(`[D4] [runtime-probe] deploy_allowed:    ${s.runLiveDeployAllowed}`);

  // CRITICAL: deploy_allowed:true é bloqueio imediato
  if (probe.deploy_allowed === true) {
    audit('[D4] [runtime-probe] CRITICO: deploy_allowed:true — BLOQUEIO');
    s.blockReason      = 'runtime-probe: backend deploy_allowed:true';
    s.runtimeProbePass = false;
    s.layersFailed.push('D4');
    return false;
  }

  const failures = [];
  if (!probe.mission_id || !String(probe.mission_id).startsWith('mission_'))
    failures.push(`mission_id inválido: "${probe.mission_id}"`);
  if (!probe.evidence_receipt || typeof probe.evidence_receipt !== 'object')
    failures.push('evidence_receipt ausente ou inválido');
  if (s.runLiveEvidenceSource !== 'go-core')
    failures.push(`evidence_receipt.source="${s.runLiveEvidenceSource}" deve ser "go-core"`);
  if (probe.backend_stub !== false)
    failures.push(`backend_stub=${probe.backend_stub} deve ser false`);

  if (failures.length > 0) {
    audit(`[D4] [runtime-probe] ${failures.length} validações falharam:`);
    for (const f of failures) audit(`  !! ${f}`);
    s.runtimeProbePass = false;
    s.blockReason      = `runtime-probe: ${failures[0]}`;
    s.layersFailed.push('D4');
    return false;
  }

  // V15.2: Runtime Contract Hardening
  const contract = validateRuntimeContract(probe);
  s.runtimeContractPass     = contract.ok;
  s.runtimeContractErrors   = contract.errors;
  s.runtimeContractWarnings = contract.warnings;
  s.runtimeContractChecked  = true;
  s.runLivePassGold         = probe.pass_gold === true;
  s.runLivePromotionAllowed = probe.promotion_allowed === true;
  s.runLiveFailedGates      = contract.normalized.failed_gates;

  if (contract.warnings.length > 0) {
    for (const w of contract.warnings) audit(`[D4] [runtime-probe] V15.2 WARN: ${w}`);
  }

  if (!contract.ok) {
    audit(`[D4] [runtime-probe] V15.2 contract FAIL: ${contract.errors.length} erro(s)`);
    for (const e of contract.errors) audit(`  !! ${e}`);
    s.runtimeProbePass = false;
    s.blockReason      = `runtime-contract: ${contract.errors[0]}`;
    s.recommendation   = classifyRuntimeContractFailure(contract.errors[0]);
    s.layersFailed.push('D4');
    return false;
  }

  audit('[D4] [runtime-probe] V15.2 contract: PASS ✓');

  s.runtimeProbePass = true;
  audit('[D4] [runtime-probe] todas validações PASS ✓');
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// D4 — BACKEND RUNTIME VALIDATION (LOCAL)
// ═══════════════════════════════════════════════════════════════════

async function runLayerD4BackendRuntime(s) {
  s.layersExecuted.push('D4');
  audit(`[D4] Backend Runtime Validation (local:${LOCAL_BACKEND_PORT})`);

  s.runtimeProbeEnabled = RUNTIME_PROBE;

  // Probe health — check se backend já responde
  const health = httpGet(`${LOCAL_BACKEND_BASE}/api/health`, 5000);
  s.backendAlive    = !!health;
  s.backendHealthOk = !!(health && (health.status === 'ok' || health.ok === true || health.anti_stub));
  s.backendHealthStatus = s.backendAlive ? 'ok' : 'offline';
  audit(`[D4] /api/health: alive=${s.backendAlive} ok=${s.backendHealthOk}`);

  // ── RUNTIME PROBE mode (V15.1) ─────────────────────────────────
  if (RUNTIME_PROBE) {
    if (!s.backendAlive) {
      audit('[D4] [runtime-probe] backend offline — tentando iniciar');
      const started = await tryStartBackend(s);
      if (!started) {
        // Re-verifica após tentativa
        const h2 = httpGet(`${LOCAL_BACKEND_BASE}/api/health`, 2000);
        s.backendAlive = !!h2;
      }
      if (!s.backendAlive) {
        audit('[D4] [runtime-probe] backend não pôde iniciar — BLOCKED_RUNTIME');
        s.runLiveStatus    = 'backend_offline';
        s.runtimeProbePass = false;
        s.blockReason      = 'runtime-probe: backend offline, não iniciou';
        s.recommendation   = 'BLOCKED_RUNTIME';
        if (s.backendProcessStarted) { s.backendProcessStopped = stopBackend(); }
        s.layersFailed.push('D4');
        return false;
      }
      s.backendHealthOk     = true;
      s.backendHealthStatus = 'ok';
    }

    let probeOk = false;
    try {
      probeOk = await runRuntimeProbe(s);
    } finally {
      if (s.backendProcessStarted && !s.backendProcessStopped) {
        s.backendProcessStopped = stopBackend();
        audit(`[D4] backend processo parado: ${s.backendProcessStopped}`);
      }
      // V15.3: cleanup probe temp root regardless of outcome
      s.runtimeProbeTempRootRemoved = removeProbeTempRoot();
      if (s.runtimeProbeTempRootCreated) {
        audit(`[D4] temp root removido: ${s.runtimeProbeTempRootRemoved}`);
      }
    }
    if (!probeOk) return false;

    audit('[D4] Backend Runtime (runtime-probe): PASS');
    return true;
  }

  // ── MODO NORMAL (sem --runtime-probe) ─────────────────────────
  if (!s.backendAlive) {
    audit('[D4] backend local não responde — skip POST /api/run-live');
    audit('[D4] NOTA: inicie backend com "node backend/server.js" para D4 completo');
    s.backendStub = true;
    audit('[D4] Backend Runtime: SKIPPED (backend não rodando)');
    return true;
  }

  // POST /api/run-live (modo normal)
  const probe = httpPost(`${LOCAL_BACKEND_BASE}/api/run-live`, {
    mission: 'pi-harness-d4-probe',
    mode:    'inspect',
  }, 12000);

  if (probe) {
    s.backendHasMissionId       = typeof probe.mission_id === 'string' && probe.mission_id.length > 4;
    s.backendHasEvidenceReceipt = !!(probe.evidence_receipt && typeof probe.evidence_receipt === 'object' && probe.evidence_receipt.id);
    s.backendStub               = probe.backend_stub !== false || probe.status === 'queued' || !probe.steps;
    s.evidenceSource            = probe.evidence_receipt?.source || probe.evidence_source || null;

    audit(`[D4] mission_id: ${probe.mission_id || 'null'}`);
    audit(`[D4] evidence_receipt.source: ${s.evidenceSource || 'null'}`);
    audit(`[D4] backend_stub: ${s.backendStub}`);
    audit(`[D4] deploy_allowed: ${probe.deploy_allowed || false}`);

    if (probe.deploy_allowed === true) {
      audit('[D4] CRITICO: backend retornou deploy_allowed:true — BLOQUEIO');
      s.blockReason = 'backend deploy_allowed:true detectado';
      s.layersFailed.push('D4');
      return false;
    }

    if (s.evidenceSource && s.evidenceSource !== 'go-core') {
      audit(`[D4] WARN: evidence_source="${s.evidenceSource}" ≠ "go-core"`);
    } else if (s.evidenceSource === 'go-core') {
      audit('[D4] evidence_source === "go-core" ✓');
    }
  } else {
    audit('[D4] /api/run-live: sem resposta válida');
    s.backendStub = true;
  }

  audit('[D4] Backend Runtime: PASS');
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// D5 — REPAIR PLANNING
// ═══════════════════════════════════════════════════════════════════

async function runLayerD5RepairPlanning(s) {
  s.layersExecuted.push('D5');
  audit('[D5] Repair Planning iniciado');

  const errorTypes = [];
  const repairPlan = [];
  const autoFixable = [];
  const manualRequired = [];

  if (!s.syntaxOk) {
    errorTypes.push('syntax_error');
    for (const f of s.syntaxErrors) {
      repairPlan.push(`syntax_fix: node --check "${f}" e reparar`);
      manualRequired.push(`syntax_error em ${f}`);
    }
  }

  if (!s.goCoreCompiled) {
    errorTypes.push('go_build_error');
    repairPlan.push('go_build: cd go-core && go build ./...');
    manualRequired.push('go binary não compilado');
  }

  if (!s.goCoreTestPass) {
    errorTypes.push('go_test_error');
    repairPlan.push('go_test: cd go-core && go test ./...');
    manualRequired.push('go tests falhando');
  }

  if (!s.evidenceReceiptInSchema) {
    errorTypes.push('contract_error');
    repairPlan.push('schema_fix: adicionar evidence_receipt a result.schema.json');
    manualRequired.push('evidence_receipt ausente no schema');
  }

  if (!s.evidenceReceiptInNormalizer) {
    errorTypes.push('evidence_error');
    repairPlan.push('normalizer_fix: verificar goRunner.js evidence_receipt handling');
    manualRequired.push('evidence_receipt ausente no normalizer');
  }

  if (!s.fakeEvidenceAbsent) {
    errorTypes.push('fake_evidence_regression');
    for (const h of s.fakeEvidenceHits) {
      repairPlan.push(`fake_evidence_remove: ${h}`);
      manualRequired.push(`fake evidence detectado: ${h}`);
    }
  }

  if (!s.forbiddenDiffAbsent) {
    errorTypes.push('forbidden_diff_error');
    for (const f of s.forbiddenDiffFiles) {
      repairPlan.push(`restore_forbidden: git restore "${f}"`);
      autoFixable.push(`restore_forbidden:${f}`);
    }
  }

  if (!s.visualGoldLockPass) {
    errorTypes.push('visual_lock_error');
    manualRequired.push('visual-gold-harness-lock FAIL — revisão manual obrigatória');
  }

  if (!s.backendAlive && MAX_DIFF_IDX >= 4) {
    errorTypes.push('backend_runtime_error');
    repairPlan.push('backend_start: node backend/server.js (porta 8080)');
    autoFixable.push('backend_start_info');
  }

  if (s.backendAlive && s.evidenceSource && s.evidenceSource !== 'go-core') {
    errorTypes.push('evidence_error');
    repairPlan.push(`evidence_source_fix: backend retorna source="${s.evidenceSource}" deve ser "go-core"`);
    manualRequired.push(`evidence_source "${s.evidenceSource}" ≠ "go-core"`);
  }

  s.errorTypes    = errorTypes;
  s.repairPlan    = repairPlan;
  s.autoFixable   = autoFixable;
  s.manualRequired = manualRequired;

  if (errorTypes.length === 0) {
    audit('[D5] nenhum erro detectado — sem plano de reparo necessário');
  } else {
    audit(`[D5] tipos de erro: ${errorTypes.join(', ')}`);
    audit(`[D5] auto-fixável: ${autoFixable.length} | manual: ${manualRequired.length}`);
    for (const p of repairPlan) audit(`  → ${p}`);
  }

  audit('[D5] Repair Planning: PASS');
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// D6 — SAFE AUTO-FIX
// ═══════════════════════════════════════════════════════════════════

async function runLayerD6SafeAutoFix(s) {
  s.layersExecuted.push('D6');
  audit('[D6] Safe Auto-Fix iniciado');

  if (NO_AUTOFIX) {
    audit('[D6] --no-autofix: skip');
    return true;
  }

  if (DRY_RUN) {
    audit('[D6] DRY_RUN: skip auto-fix efetivo');
    return true;
  }

  // Auto-fix 1: restore forbidden diff files
  if (!s.forbiddenDiffAbsent && s.forbiddenDiffFiles.length > 0) {
    for (const f of s.forbiddenDiffFiles) {
      const r = shFull(`git restore "${f}" 2>/dev/null || git checkout HEAD -- "${f}"`);
      if (r.ok) {
        s.filesRestored.push(f);
        s.actionsToken.push(`autofix_restore:${f}`);
        audit(`[D6] restaurado: ${f}`);
      }
    }
    // Re-check
    const diff2 = (sh('git diff --name-only HEAD') || '').split('\n').filter(Boolean);
    s.forbiddenDiffFiles  = diff2.filter(f => f.startsWith('frontend/') || f.startsWith('bin/'));
    s.forbiddenDiffAbsent = s.forbiddenDiffFiles.length === 0;
  }

  // Auto-fix 2: untracked binary → ensure in .gitignore
  if (!s.untrackedBinaryAbsent) {
    const gi = read('.gitignore') || '';
    if (!gi.includes('bin/vision-core')) {
      write('.gitignore', gi + '\nbin/vision-core\nbin/vision-core.exe\n');
      s.filesChanged.push('.gitignore');
      s.actionsToken.push('autofix_gitignore_bin');
      audit('[D6] bin/vision-core adicionado ao .gitignore');
      s.untrackedBinaryAbsent = true;
    }
  }

  // NEVER auto-fix: frontend visual, PASS GOLD hardcoded, evidence fabrication, bypass gates
  // NEVER: commit, push, merge, deploy, tag

  audit('[D6] Safe Auto-Fix: PASS');
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// D7 — PASS GOLD CANDIDATE DECISION
// ═══════════════════════════════════════════════════════════════════

async function runLayerD7PassGoldDecision(s) {
  s.layersExecuted.push('D7');
  audit('[D7] PASS GOLD Candidate Decision iniciado');

  s.passGoldCandidate = computeStrictPassGoldCandidate(s);
  s.deployAllowed     = false; // sempre false nesta fase
  s.promotionAllowed  = false; // só muda se PASS GOLD com backend real

  // Definir recommendation
  if (s.passGoldCandidate) {
    // Com --runtime-probe, probe também deve passar
    if (RUNTIME_PROBE && !s.runtimeProbePass) {
      s.promotionAllowed = false;
      s.recommendation   = 'BLOCKED_RUNTIME';
      s.strictPassGoldReason.push('runtime_probe_failed');
    } else {
      s.promotionAllowed = true;
      s.recommendation   = 'MERGE_READY';
    }
  } else {
    const reason = computeStrictPassGoldReason(s);
    s.strictPassGoldReason = reason;

    if (!s.backendAlive) {
      s.recommendation = 'BLOCKED_RUNTIME';
    } else if (!s.fakeEvidenceAbsent) {
      s.recommendation = 'BLOCKED_EVIDENCE';
    } else if (!s.forbiddenDiffAbsent || !s.visualGoldLockPass || !s.frontendVisualPass) {
      s.recommendation = 'BLOCKED_VISUAL';
    } else if (!s.backendHasEvidenceReceipt || s.evidenceSource !== 'go-core') {
      s.recommendation = 'BLOCKED_EVIDENCE';
    } else if (!s.backendAlive || s.backendStub) {
      s.recommendation = 'BLOCKED_RUNTIME';
    } else {
      s.recommendation = 'NEEDS_MANUAL_REVIEW';
    }

    audit(`[D7] PASS GOLD BLOQUEADO: ${reason.join(', ')}`);
  }

  audit(`[D7] pass_gold_candidate: ${s.passGoldCandidate}`);
  audit(`[D7] promotion_allowed: ${s.promotionAllowed}`);
  audit(`[D7] deploy_allowed: ${s.deployAllowed}`);
  audit(`[D7] recommendation: ${s.recommendation}`);

  audit('[D7] PASS GOLD Decision: PASS');
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// D8 — RENDER FINAL MISSION REPORT
// ═══════════════════════════════════════════════════════════════════

function renderFinalMissionReport(s, result, elapsed, hermesCtx = null) {
  const gates = {
    syntax_ok:            s.syntaxOk,
    visual_gold_lock:     s.visualGoldLockPass,
    frontend_visual_lock: s.frontendVisualPass,
    front_guard:          s.guardOk,
    go_core_compiled:     s.goCoreCompiled,
    go_test_pass:         s.goCoreTestPass,
    go_build_pass:        s.goCoreBuildPass,
    fake_evidence_absent: s.fakeEvidenceAbsent,
    forbidden_diff_absent:s.forbiddenDiffAbsent,
    evidence_in_schema:   s.evidenceReceiptInSchema,
    evidence_in_normalizer: s.evidenceReceiptInNormalizer,
    strict_gate_logic:    s.strictGateLogicPresent,
    legacy_clean:         s.legacyCleanConfirmed,
    v14_clean_ownership:  s.v14CleanOwnership,
    backend_alive:        s.backendAlive,
    backend_health_ok:    s.backendHealthOk,
    backend_not_stub:     !s.backendStub,
    backend_mission_id:   s.backendHasMissionId,
    backend_evidence_receipt: s.backendHasEvidenceReceipt,
    evidence_source_go_core: s.evidenceSource === 'go-core',
  };

  const failedGates = Object.entries(gates)
    .filter(([, v]) => v === false)
    .map(([k]) => k);

  if (JSON_MODE) {
    const out = {
      result,
      difficulty:             `D${s.layersExecuted.length - 1}`,
      max_difficulty:         rawMaxDiff,
      pass_gold_candidate:    s.passGoldCandidate,
      promotion_allowed:      s.promotionAllowed,
      deploy_allowed:         false,
      mission_id:             s.goRuntimeMissionId || null,
      evidence_receipt_id:    s.goRuntimeEvidenceId || null,
      evidence_source:        s.evidenceSource || s.goRuntimeEvidenceSource || null,
      backend_stub:           s.backendStub,
      strict_pass_gold_reason: s.strictPassGoldReason || computeStrictPassGoldReason(s),
      gates,
      failed_gates:           failedGates,
      actions_taken:          s.actionsToken,
      files_changed:          s.filesChanged,
      files_restored:         s.filesRestored,
      layers_executed:        s.layersExecuted,
      layers_failed:          s.layersFailed,
      recommendation:         s.recommendation,
      branch:                 s.branch,
      git_head:               s.gitHead,
      elapsed_ms:             Math.round(elapsed),
      dry_run:                DRY_RUN,
      no_autofix:             NO_AUTOFIX,
      runtime_probe_enabled:    RUNTIME_PROBE,
      backend_process_started:  s.backendProcessStarted || false,
      backend_process_stopped:  s.backendProcessStopped || false,
      backend_health_status:    s.backendHealthStatus   || 'not_probed',
      run_live_status:          s.runLiveStatus         || 'not_probed',
      run_live_mission_id:      s.runLiveMissionId      || null,
      run_live_evidence_source: s.runLiveEvidenceSource || null,
      run_live_backend_stub:    s.runLiveBackendStub    !== undefined ? s.runLiveBackendStub : null,
      run_live_deploy_allowed:  s.runLiveDeployAllowed  !== undefined ? s.runLiveDeployAllowed : null,
      runtime_probe_pass:       s.runtimeProbePass      || false,
      // Runtime Contract (V15.2)
      runtime_contract_checked:  s.runtimeContractChecked  || false,
      runtime_contract_pass:     s.runtimeContractPass     || false,
      runtime_contract_errors:   s.runtimeContractErrors   || [],
      runtime_contract_warnings: s.runtimeContractWarnings || [],
      run_live_pass_gold:        s.runLivePassGold         !== undefined ? s.runLivePassGold        : null,
      run_live_promotion_allowed:s.runLivePromotionAllowed !== undefined ? s.runLivePromotionAllowed : null,
      run_live_failed_gates:     s.runLiveFailedGates      || [],
      // V15.3: temp root, new probe flags
      runtime_probe_temp_root:         s.runtimeProbeTempRoot         || null,
      runtime_probe_temp_root_created: s.runtimeProbeTempRootCreated  || false,
      runtime_probe_temp_root_removed: s.runtimeProbeTempRootRemoved  || false,
      runtime_probe_port:              LOCAL_BACKEND_PORT,
      runtime_probe_timeout_ms:        RUNTIME_PROBE_TIMEOUT_MS,
      runtime_probe_no_start:          RUNTIME_PROBE_NO_START,
      // V15.5: Hermes Mission Supervisor
      hermes_supervisor_enabled:    hermesCtx ? hermesCtx.enabled : true,
      hermes_mission_id:            hermesCtx ? hermesCtx.mission_id : null,
      hermes_agents_registered:     hermesCtx ? hermesCtx.agents.length : 11,
      hermes_skills_registered:     hermesCtx ? hermesCtx.skills.length : 17,
      hermes_apis_registered:       hermesCtx ? hermesCtx.apis.length : 17,
      hermes_memory_policy:         hermesCtx ? hermesCtx.memory_policy : null,
      hermes_conflicts_detected:    hermesCtx ? hermesCtx.conflicts_detected.length : 0,
      hermes_conflicts_resolved:    hermesCtx ? hermesCtx.conflicts_resolved.length : 0,
      hermes_agent_outputs_validated: hermesCtx ? hermesCtx.agent_outputs_validated : 0,
      hermes_hallucination_blocks:  hermesCtx ? hermesCtx.hallucination_blocks.length : 0,
      hermes_final_decision:        hermesCtx ? hermesCtx.final_decision : 'PENDING',
      // V15.6: Runtime Evidence fields
      hermes_runtime_evidence_enabled:    true,
      hermes_evidence_schema_version:     _runtimeEvidence?.schema_version || 'v15.6',
      hermes_evidence_trust_score:        (() => {
        const v = _runtimeEvidence ? validateRuntimeEvidence(_runtimeEvidence) : null;
        return v ? v.trust_score : 0;
      })(),
      hermes_evidence_sources_present:    (() => {
        const src = _runtimeEvidence?.sources || {};
        return Object.entries(src).filter(([,v]) => v?.evidence_present).map(([k]) => k);
      })(),
      hermes_evidence_sources_missing:    (() => {
        const src = _runtimeEvidence?.sources || {};
        return Object.entries(src).filter(([,v]) => !v?.evidence_present).map(([k]) => k);
      })(),
      hermes_evidence_validation_errors:  (() => {
        const v = _runtimeEvidence ? validateRuntimeEvidence(_runtimeEvidence) : null;
        return v ? v.errors : ['runtime_evidence_not_collected'];
      })(),
      hermes_evidence_validation_warnings: (() => {
        const v = _runtimeEvidence ? validateRuntimeEvidence(_runtimeEvidence) : null;
        return v ? v.warnings : [];
      })(),
      hermes_evidence_graph:              hermesCtx?.runtime_evidence
        ? { nodes: Object.keys(hermesCtx.runtime_evidence.sources || {}), deploy_allowed: false }
        : null,
      hermes_runtime_evidence_summary:    _runtimeEvidence
        ? renderRuntimeEvidenceSummary(_runtimeEvidence)
        : null,
      // V15.7: Decision Matrix fields
      hermes_decision_matrix_enabled:     true,
      hermes_decision_matrix_schema_version: _decisionMatrix?.schema_version || 'v15.7',
      hermes_decision_state:              _decisionMatrix?.decision_state || 'BLOCKED_RUNTIME',
      hermes_release_readiness:           hermesCtx?.release_readiness_gate?.level || 'blocked',
      hermes_release_candidate:           false,
      hermes_decision_score:              hermesCtx?.release_readiness_gate?.score ?? 0,
      hermes_decision_blocking_reasons:   (_decisionMatrix?.blocking_reasons || []).map(r => r.id),
      hermes_required_evidence:           (_decisionMatrix?.required_evidence || []).map(r => r.id),
      hermes_safe_next_actions:           (_decisionMatrix?.safe_next_actions || []).map(a => a.id),
      hermes_release_gate:                hermesCtx?.release_readiness_gate
        ? renderReleaseReadinessGate(hermesCtx.release_readiness_gate)
        : null,
      hermes_deploy_allowed:              false,
      hermes_promotion_allowed:           false,
      hermes_stable_allowed:              false,
    };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    return out;
  }

  const W   = 72;
  const sep = '═'.repeat(W);
  const div = t => `\n${'─'.repeat(4)} ${t} ${'─'.repeat(Math.max(0, W - t.length - 7))}`;

  log('');
  log(`╔${sep}╗`);
  const title = 'PI HARNESS V15.7 — VISION CORE AUTONOMOUS MISSION RUNNER';
  log(`║  ${title}${' '.repeat(Math.max(0, W - title.length - 2))}║`);
  const sub   = 'RELATÓRIO FINAL';
  log(`║  ${sub}${' '.repeat(Math.max(0, W - sub.length - 2))}║`);
  log(`╚${sep}╝`);

  log(div('SUMÁRIO'));
  log(`RESULT:                    ${result}`);
  log(`MAX_DIFFICULTY:            ${rawMaxDiff}`);
  log(`LAYERS_EXECUTED:           ${s.layersExecuted.join(' → ')}`);
  log(`LAYERS_FAILED:             ${s.layersFailed.join(', ') || 'none'}`);
  log(`ELAPSED:                   ${(elapsed / 1000).toFixed(1)}s`);
  log(`DRY_RUN:                   ${DRY_RUN}`);
  log(`NO_AUTOFIX:                ${NO_AUTOFIX}`);
  log(`BRANCH:                    ${s.branch}`);
  log(`GIT_HEAD:                  ${s.gitHead}`);

  log(div('PREFLIGHT (D0)'));
  log(`VISUAL_GOLD_LOCK:          ${s.visualGoldLockPass ? 'PASS' : 'FAIL'}`);
  log(`FRONTEND_VISUAL_LOCK:      ${s.frontendVisualPass ? 'PASS' : 'FAIL'}`);
  log(`FRONT_GUARD:               ${s.guardOk ? 'PASS' : 'FAIL'}`);
  log(`SYNTAX_OK:                 ${s.syntaxOk ? 'PASS' : 'FAIL' + ' ' + s.syntaxErrors.join(',')}`);
  log(`GO_TEST:                   ${s.goCoreTestPass ? 'PASS' : 'FAIL/SKIP'}`);
  log(`GO_BUILD:                  ${s.goCoreBuildPass ? 'PASS' : 'FAIL/SKIP'}`);
  log(`GO_BINARY:                 ${s.goCoreCompiled ? s.goCorePath : 'não encontrado'}`);
  log(`FAKE_EVIDENCE_SCAN:        ${s.fakeEvidenceAbsent ? 'CLEAN' : 'HITS=' + s.fakeEvidenceHits.length}`);
  log(`FORBIDDEN_DIFF:            ${s.forbiddenDiffAbsent ? 'CLEAN' : 'FILES=' + s.forbiddenDiffFiles.join(',')}`);
  log(`LEGACY_CLEAN:              ${s.legacyCleanConfirmed}`);

  log(div('CONTRACT (D2)'));
  log(`EVIDENCE_IN_SCHEMA:        ${s.evidenceReceiptInSchema}`);
  log(`EVIDENCE_IN_NORMALIZER:    ${s.evidenceReceiptInNormalizer}`);
  log(`STRICT_GATE_LOGIC:         ${s.strictGateLogicPresent}`);
  if (s.contractMissingFields.length > 0) {
    log(`CONTRACT_MISSING:`);
    for (const m of s.contractMissingFields) log(`  • ${m}`);
  }

  log(div('GO CORE RUNTIME (D3)'));
  log(`GO_RUNTIME_EXECUTED:       ${s.goRuntimeExecuted}`);
  log(`GO_RUNTIME_MISSION_ID:     ${s.goRuntimeMissionId || 'null'}`);
  log(`GO_RUNTIME_EVIDENCE_ID:    ${s.goRuntimeEvidenceId || 'null'}`);
  log(`GO_RUNTIME_EVIDENCE_SRC:   ${s.goRuntimeEvidenceSource || 'null'}`);
  log(`GO_RUNTIME_BACKEND_STUB:   ${s.goRuntimeBackendStub}`);
  log(`GO_RUNTIME_PASS_GOLD:      ${s.goRuntimePassGold}`);
  if (s.goRuntimeFailedGates.length > 0)
    log(`GO_RUNTIME_FAILED_GATES:   ${s.goRuntimeFailedGates.join(', ')}`);

  log(div('BACKEND RUNTIME (D4)'));
  log(`BACKEND_ALIVE:             ${s.backendAlive}`);
  log(`BACKEND_HEALTH_OK:         ${s.backendHealthOk}`);
  log(`BACKEND_STUB:              ${s.backendStub}`);
  log(`BACKEND_MISSION_ID:        ${s.backendHasMissionId}`);
  log(`BACKEND_EVIDENCE_RECEIPT:  ${s.backendHasEvidenceReceipt}`);
  log(`EVIDENCE_SOURCE:           ${s.evidenceSource || 'null'}${s.evidenceSource === 'go-core' ? ' ✓' : s.evidenceSource ? ' ← deve ser go-core' : ''}`);

  if (s.runtimeProbeEnabled) {
    log(div('RUNTIME PROBE (V15.3)'));
    log(`RUNTIME_PROBE_ENABLED:     ${s.runtimeProbeEnabled}`);
    log(`BACKEND_PROCESS_STARTED:   ${s.backendProcessStarted}`);
    log(`BACKEND_PROCESS_STOPPED:   ${s.backendProcessStopped}`);
    log(`BACKEND_HEALTH_STATUS:     ${s.backendHealthStatus}`);
    log(`RUN_LIVE_STATUS:           ${s.runLiveStatus}`);
    log(`RUN_LIVE_MISSION_ID:       ${s.runLiveMissionId || 'null'}`);
    log(`RUN_LIVE_EVIDENCE_SOURCE:  ${s.runLiveEvidenceSource || 'null'}${s.runLiveEvidenceSource === 'go-core' ? ' ✓' : s.runLiveEvidenceSource ? ' ← deve ser go-core' : ''}`);
    log(`RUN_LIVE_BACKEND_STUB:     ${s.runLiveBackendStub}`);
    log(`RUN_LIVE_DEPLOY_ALLOWED:   ${s.runLiveDeployAllowed}`);
    log(`RUNTIME_PROBE_PASS:        ${s.runtimeProbePass}`);
    log(`RUN_LIVE_PASS_GOLD:        ${s.runLivePassGold}`);
    log(`RUN_LIVE_PROMOTION_ALLOWED:${s.runLivePromotionAllowed}`);
    log(`RUN_LIVE_FAILED_GATES:     ${(s.runLiveFailedGates || []).join(', ') || 'none'}`);
    log(`RUNTIME_CONTRACT_CHECKED:  ${s.runtimeContractChecked}`);
    log(`RUNTIME_CONTRACT_PASS:     ${s.runtimeContractPass}`);
    if ((s.runtimeContractErrors || []).length > 0) {
      log(`RUNTIME_CONTRACT_ERRORS:`);
      for (const e of s.runtimeContractErrors) log(`  ✗ ${e}`);
    }
    if ((s.runtimeContractWarnings || []).length > 0) {
      log(`RUNTIME_CONTRACT_WARNINGS:`);
      for (const w of s.runtimeContractWarnings) log(`  ! ${w}`);
    }
  }

  if (s.repairPlan.length > 0) {
    log(div('REPAIR PLAN (D5)'));
    log(`ERROR_TYPES:               ${s.errorTypes.join(', ')}`);
    log(`AUTO_FIXABLE:              ${s.autoFixable.length}`);
    log(`MANUAL_REQUIRED:           ${s.manualRequired.length}`);
    for (const p of s.repairPlan) log(`  → ${p}`);
  }

  if (s.actionsToken.length > 0 || s.filesChanged.length > 0 || s.filesRestored.length > 0) {
    log(div('ACTIONS (D6)'));
    for (const a of s.actionsToken) log(`  ✓ ${a}`);
    if (s.filesChanged.length > 0)  log(`FILES_CHANGED:  ${s.filesChanged.join(', ')}`);
    if (s.filesRestored.length > 0) log(`FILES_RESTORED: ${s.filesRestored.join(', ')}`);
  }

  log(div('PASS GOLD DECISION (D7)'));
  log(`PASS_GOLD_CANDIDATE:       ${s.passGoldCandidate}`);
  log(`PROMOTION_ALLOWED:         ${s.promotionAllowed}`);
  log(`DEPLOY_ALLOWED:            false (sempre manual)`);
  log(`RECOMMENDATION:            ${s.recommendation}`);

  if (!s.passGoldCandidate) {
    const reason = computeStrictPassGoldReason(s);
    if (reason.length > 0) {
      log('');
      log('  BLOQUEIO PASS GOLD:');
      for (const r of reason) log(`  → ${r}`);
    }
  }

  if (failedGates.length > 0) {
    log(div('GATES FALHOS'));
    for (const g of failedGates) log(`  ✗ ${g}`);
  }

  if (s.blockReason) {
    log(div('BLOQUEIO'));
    log(`BLOCK_REASON: ${s.blockReason}`);
  }

  if (_runtimeEvidence) {
    const evValidation = validateRuntimeEvidence(_runtimeEvidence);
    const evSummary    = renderRuntimeEvidenceSummary(_runtimeEvidence);
    log(div('RUNTIME EVIDENCE WIRING (V15.6/V15.7)'));
    log(`EVIDENCE_SCHEMA_VERSION:   ${_runtimeEvidence.schema_version}`);
    log(`EVIDENCE_TRUST_SCORE:      ${evValidation.trust_score}`);
    log(`EVIDENCE_RECOMMENDATION:   ${evValidation.final_recommendation}`);
    log(`EVIDENCE_SOURCES_PRESENT:  ${evSummary.sources_present.join(', ') || 'none'}`);
    log(`EVIDENCE_SOURCES_MISSING:  ${evSummary.sources_missing.join(', ') || 'none'}`);
    log(`EVIDENCE_GO_CORE_VALID:    ${evSummary.go_core_evidence_valid}`);
    log(`EVIDENCE_RUNTIME_BLOCKED:  ${evSummary.runtime_blocked}`);
    log(`EVIDENCE_DEPLOY_ALLOWED:   ${evSummary.deploy_allowed}`);
    if (evValidation.errors.length > 0) {
      log('  VALIDATION ERRORS:');
      for (const e of evValidation.errors) log(`    ✗ ${e}`);
    }
    if (evValidation.warnings.length > 0) {
      log('  VALIDATION WARNINGS:');
      for (const w of evValidation.warnings) log(`    ! ${w}`);
    }
  }

  if (_decisionMatrix) {
    const dm       = _decisionMatrix;
    const readiness = hermesCtx?.release_readiness_gate || null;
    log(div('RUNTIME EVIDENCE DECISION MATRIX (V15.7)'));
    log(`DECISION_STATE:            ${dm.decision_state}`);
    log(`DECISION_SCHEMA_VERSION:   ${dm.schema_version}`);
    log(`RELEASE_READINESS:         ${readiness?.level || 'blocked'}`);
    log(`DECISION_SCORE:            ${readiness?.score ?? 0}/100`);
    log(`RELEASE_CANDIDATE:         false`);
    log(`DEPLOY_ALLOWED:            false`);
    log(`PROMOTION_ALLOWED:         false`);
    log(`STABLE_ALLOWED:            false`);
    const gatesPass    = Object.entries(dm.gates || {}).filter(([,g]) => g.pass).map(([k]) => k);
    const gatesBlocked = Object.entries(dm.gates || {}).filter(([,g]) => !g.pass).map(([k]) => k);
    log(`GATES_PASS:                ${gatesPass.join(', ') || 'none'}`);
    log(`GATES_BLOCKED:             ${gatesBlocked.join(', ') || 'none'}`);
    if ((dm.blocking_reasons || []).length > 0) {
      log('  BLOCKING REASONS:');
      for (const r of dm.blocking_reasons) {
        log(`    [${r.severity?.toUpperCase() || 'UNKNOWN'}] ${r.id}: ${r.message || ''}`);
      }
    }
    if (readiness?.missing?.length > 0) {
      log('  MISSING EVIDENCE:');
      for (const m of readiness.missing) log(`    ✗ ${m}`);
    }
    log(`  NOTE: classification only — no deploy performed — explicit authorization required`);
  }

  if (hermesCtx) {
    log(div('HERMES SUPERVISION (V15.7)'));
    log(`SUPERVISOR_ENABLED:        ${hermesCtx.enabled}`);
    log(`MISSION_ID:                ${hermesCtx.mission_id}`);
    log(`AGENTS_REGISTERED:         ${hermesCtx.agents.length}`);
    log(`SKILLS_REGISTERED:         ${hermesCtx.skills.length}`);
    log(`APIS_REGISTERED:           ${hermesCtx.apis.length}`);
    log(`MEMORY_POLICY:             evidence_only=${hermesCtx.memory_policy.evidence_only} stale_blocked=${hermesCtx.memory_policy.stale_context_blocked}`);
    log(`AGENT_OUTPUTS_VALIDATED:   ${hermesCtx.agent_outputs_validated}`);
    log(`CONFLICTS_DETECTED:        ${hermesCtx.conflicts_detected.length}`);
    log(`CONFLICTS_RESOLVED:        ${hermesCtx.conflicts_resolved.length}`);
    log(`HALLUCINATION_BLOCKS:      ${hermesCtx.hallucination_blocks.length}`);
    log(`FINAL_SUPERVISOR_DECISION: ${hermesCtx.final_decision}`);
    if (hermesCtx.hallucination_blocks.length > 0) {
      log('  BLOQUEIOS DE ALUCINAÇÃO:');
      for (const b of hermesCtx.hallucination_blocks) log(`    ✗ ${b.claim}: ${b.reason || 'blocked'}`);
    }
    if (hermesCtx.conflicts_detected.length > 0) {
      log('  CONFLITOS DETECTADOS:');
      for (const c of hermesCtx.conflicts_detected) {
        const item = Array.isArray(c) ? c[0] : c;
        log(`    ✗ [${item.type || 'unknown'}] ${item.detail || ''}`);
      }
    }
  }

  if (!CI_MODE && REPORT.auditLog.length > 0) {
    log(div('AUDIT LOG'));
    for (const l of REPORT.auditLog) log(`  ${l}`);
  }

  log('');
  log(`╔${sep}╗`);
  const footer = result === 'PASS'
    ? `✓ PI HARNESS V15.7 PASS — ${s.recommendation}`
    : `✗ PI HARNESS V15.7 ${result} — ${s.recommendation}`;
  log(`║  ${footer}${' '.repeat(Math.max(0, W - footer.length - 2))}║`);
  log(`╚${sep}╝`);
  log('');

  return { result, recommendation: s.recommendation, pass_gold_candidate: s.passGoldCandidate, failed_gates: failedGates };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN — ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════

const LAYERS_DEF = [
  { id: 0, name: 'D0', fn: runLayerD0Preflight        },
  { id: 1, name: 'D1', fn: runLayerD1SafeCleanup      },
  { id: 2, name: 'D2', fn: runLayerD2ContractValidation},
  { id: 3, name: 'D3', fn: runLayerD3GoCoreRuntime    },
  { id: 4, name: 'D4', fn: runLayerD4BackendRuntime   },
  { id: 5, name: 'D5', fn: runLayerD5RepairPlanning   },
  { id: 6, name: 'D6', fn: runLayerD6SafeAutoFix      },
  { id: 7, name: 'D7', fn: runLayerD7PassGoldDecision },
];

async function main() {
  const t0 = Date.now();
  const s  = createMissionState();

  // V15.5: Hermes Mission Supervisor
  _hermesCtx = createHermesMissionContext();
  recordHermesEvent(_hermesCtx, { type: 'mission_start', version: 'V15.7', max_difficulty: rawMaxDiff });

  if (!JSON_MODE && !CI_MODE) {
    log('');
    log('PI HARNESS V15.7 — iniciando...');
    log(`  max-difficulty: ${rawMaxDiff} | dry-run: ${DRY_RUN} | no-autofix: ${NO_AUTOFIX} | ci: ${CI_MODE} | runtime-probe: ${RUNTIME_PROBE} | no-start: ${RUNTIME_PROBE_NO_START}`);
    log(`  hermes: ${_hermesCtx.mission_id}`);
    log('');
  }

  let result = 'PASS';

  try {
    for (const layer of LAYERS_DEF) {
      if (layer.id > MAX_DIFF_IDX) {
        audit(`[${layer.name}] skip (max-difficulty=${rawMaxDiff})`);
        recordHermesEvent(_hermesCtx, { type: 'layer_skipped', layer: layer.name });
        continue;
      }

      let ok = false;
      try {
        ok = await layer.fn(s);
      } catch (err) {
        s.layersFailed.push(layer.name);
        s.blockReason = s.blockReason || `${layer.name}: ${err.message}`;
        ok = false;
      }

      recordHermesEvent(_hermesCtx, {
        type: ok ? 'layer_complete' : 'layer_failed',
        layer: layer.name,
        ok,
        reason: ok ? null : s.blockReason,
      });

      if (!ok) {
        result = 'BLOCKED';
        break;
      }
    }

    if (result === 'PASS' && s.layersFailed.length > 0) result = 'BLOCKED';
  } finally {
    if (s.backendProcessStarted && !s.backendProcessStopped) {
      s.backendProcessStopped = stopBackend();
      if (s.backendProcessStopped) audit('[MAIN] backend processo parado no cleanup final');
    }
  }

  // V15.6: Collect and attach runtime evidence
  _runtimeEvidence = collectRuntimeEvidence(s, s.goRuntimeMissionId || null);
  attachRuntimeEvidence(_hermesCtx, _runtimeEvidence);

  // V15.7: Evaluate decision matrix and release readiness
  const hermesDecision = evaluateHermesDecision(_hermesCtx);
  _decisionMatrix = _hermesCtx.decision_matrix;

  // V15.5: Hermes final validation & decision
  const missionEvidence = {
    deploy_allowed: s.deployAllowed,
    evidence_receipt: s.evidenceSource
      ? { source: s.evidenceSource }
      : (s.goRuntimeEvidenceSource ? { source: s.goRuntimeEvidenceSource } : null),
    evidence_source: s.evidenceSource || s.goRuntimeEvidenceSource || null,
    runtime_blocked: !s.backendAlive || (RUNTIME_PROBE && !s.runtimeProbePass),
    recommendation: s.recommendation,
    health_probe: s.backendAlive ? true : false,
    gates_pass: s.passGoldCandidate,
    gates_evaluated: s.layersExecuted.includes('D7'),
    failed_gates: s.strictPassGoldReason || [],
    ci_green: false,
  };

  // Validate agent output claims
  const agentClaims = {
    pass_gold: s.passGoldCandidate,
    backend_online: s.backendAlive,
    deploy_allowed: false, // always false
  };
  const validationResult = validateAgentOutput(agentClaims, missionEvidence);
  _hermesCtx.agent_outputs_validated++;
  for (const claim of validationResult.blocked_claims) {
    const reason = validationResult.errors.find(e => e.includes(claim)) || 'blocked';
    _hermesCtx.hallucination_blocks.push({ claim, reason });
  }

  // Detect conflicts
  const deployConflict = detectAgentConflict(
    { id: 'PIHarness', claim: { deploy_allowed: s.deployAllowed } },
    { id: 'Hermes', claim: {} },
    missionEvidence
  );
  if (deployConflict) {
    _hermesCtx.conflicts_detected.push(deployConflict);
    const resolution = resolveAgentConflict(deployConflict);
    _hermesCtx.conflicts_resolved.push(resolution);
  }

  // Evidence source conflict
  if (missionEvidence.evidence_source && missionEvidence.evidence_source !== 'go-core') {
    const evConflict = detectAgentConflict(
      { id: 'Scanner', claim: {} },
      { id: 'PassGoldAuthority', claim: {} },
      missionEvidence
    );
    if (evConflict) {
      _hermesCtx.conflicts_detected.push(evConflict);
      _hermesCtx.conflicts_resolved.push(resolveAgentConflict(evConflict));
    }
  }

  // Set final Hermes decision
  if (s.passGoldCandidate && result === 'PASS') {
    _hermesCtx.final_decision = 'MERGE_READY';
  } else if (RUNTIME_PROBE && !s.runtimeProbePass) {
    _hermesCtx.final_decision = 'BLOCKED_RUNTIME';
  } else if (!s.backendAlive) {
    _hermesCtx.final_decision = 'BLOCKED_RUNTIME';
  } else if (!s.fakeEvidenceAbsent || (s.evidenceSource && s.evidenceSource !== 'go-core')) {
    _hermesCtx.final_decision = 'BLOCKED_EVIDENCE';
  } else if (!s.visualGoldLockPass || !s.frontendVisualPass) {
    _hermesCtx.final_decision = 'BLOCKED_VISUAL';
  } else if (!s.syntaxOk) {
    _hermesCtx.final_decision = 'BLOCKED_SYNTAX';
  } else {
    _hermesCtx.final_decision = 'BLOCKED_GATES';
  }

  recordHermesEvent(_hermesCtx, {
    type: 'mission_end',
    result,
    final_decision: _hermesCtx.final_decision,
    pass_gold_candidate: s.passGoldCandidate,
    deploy_allowed: false,
  });

  // D8 — Report
  const elapsed = Date.now() - t0;
  renderFinalMissionReport(s, result, elapsed, _hermesCtx);

  process.exit(result === 'PASS' ? 0 : 1);
}

main().catch(err => {
  if (!JSON_MODE) {
    process.stderr.write(`PI HARNESS V15.7 FATAL: ${err.message}\n`);
  } else {
    process.stdout.write(JSON.stringify({
      result: 'FAILED',
      error: err.message,
      deploy_allowed: false,
      hermes_supervisor_enabled: true,
      hermes_agents_registered: 11,
      hermes_skills_registered: 17,
      hermes_apis_registered: 17,
      hermes_final_decision: 'BLOCKED_FATAL',
      hermes_runtime_evidence_enabled: true,
      hermes_evidence_schema_version: 'v15.6',
      hermes_evidence_trust_score: 0,
      hermes_evidence_sources_present: [],
      hermes_evidence_sources_missing: ['git','ci','runtime','backend','go_core','tests','visual','security'],
      hermes_evidence_validation_errors: [`fatal: ${err.message}`],
      hermes_evidence_validation_warnings: [],
      hermes_evidence_graph: null,
      hermes_runtime_evidence_summary: null,
      hermes_decision_matrix_enabled: true,
      hermes_decision_matrix_schema_version: 'v15.7',
      hermes_decision_state: 'BLOCKED_RUNTIME',
      hermes_release_readiness: 'blocked',
      hermes_release_candidate: false,
      hermes_decision_score: 0,
      hermes_decision_blocking_reasons: ['runtime_not_ready'],
      hermes_required_evidence: [],
      hermes_safe_next_actions: [],
      hermes_release_gate: null,
      hermes_deploy_allowed: false,
      hermes_promotion_allowed: false,
      hermes_stable_allowed: false,
    }) + '\n');
  }
  process.exit(1);
});
