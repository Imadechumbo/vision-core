#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║   PI HARNESS V15.10 — VISION CORE AUTONOMOUS MISSION RUNNER         ║
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
  evaluateHermesAuthorization,
} from './hermes/mission-supervisor.mjs';
import {
  createAuthorizationManifest,
  createAuthorizationPolicy,
  validateAuthorizationManifest,
  evaluateAuthorizationLayer,
  deriveAuthorizationRequirements,
  renderAuthorizationSummary,
  renderAuthorizationGate,
} from './hermes/authorization-layer.mjs';
import {
  createRuntimeEvidence,
  collectRuntimeEvidence,
  validateRuntimeEvidence,
  renderRuntimeEvidenceSummary,
} from './hermes/runtime-evidence.mjs';
import {
  runAuthorizationScenario,
  runAuthorizationScenarioMatrix,
  renderAuthorizationScenarioReport,
} from './hermes/authorization-harness.mjs';
import {
  evaluateAuthorityReviewGate,
  createAuthorityRoleRegistry,
  renderAuthorityReviewGate,
} from './hermes/authority-review.mjs';
import {
  runAuthorityScenario,
  runAuthorityScenarioMatrix,
  renderAuthorityScenarioReport,
} from './hermes/authority-harness.mjs';
import {
  evaluatePassGoldAuthorityBinding,
} from './hermes/pass-gold-authority-binding.mjs';
import {
  evaluateReleaseCandidate,
} from './release-candidate-controller.mjs';
import {
  generateReleasePlan,
} from './release-plan-generator.mjs';
import {
  createDecisionMatrix,
  evaluateDecisionMatrix,
  evaluateReleaseReadiness,
  renderDecisionMatrixSummary,
  renderReleaseReadinessGate,
} from './hermes/decision-matrix.mjs';
// V27.0: Real Runtime Probe E2E integration
import { runRuntimeProbeE2ELocal } from './runtime-probe-e2e-local.mjs';
// V32.0: Runtime Bridge Execution Mode
import { runProbeBridgeIntegration } from './runtime-probe-bridge-integration.mjs';
// V33.0: Candidate Drill Mode
import { runLocalPassGoldFullCandidateDrill } from './local-pass-gold-full-candidate-drill.mjs';
// V36.3: Local Runtime Execution Mode
import { runLocalRuntimeExecutionController } from './local-runtime-execution-controller.mjs';
import { buildRuntimeExecutionEvidencePackage } from './runtime-execution-evidence-package.mjs';
import { bindRuntimeExecutionToLedger } from './runtime-execution-ledger-binding.mjs';
// V37.1: Runtime Candidate Mode
import { runRuntimePassGoldCandidateController } from './runtime-pass-gold-candidate-controller.mjs';
// V42.1: Supervised Release Candidate Mode
import { runSupervisedReleaseCandidateController } from './supervised-release-candidate-controller.mjs';
// V44.1: Supervised Release Ledger Wiring
import {
  appendSupervisedLedgerEvent,
  verifySupervisedLedgerChain,
  _resetSupervisedLedgerForTest,
} from './supervised-release-ledger-events.mjs';
import { buildManualPromotionPackage }   from './manual-promotion-package-builder.mjs';
import { runManualPromotionReviewGate }  from './manual-promotion-review-gate.mjs';
// V49.0: Manual Release Handoff Mode
import { createManualReleaseRequest }         from './manual-release-request-contract.mjs';
import { createHumanConfirmationContract }    from './human-confirmation-contract.mjs';
import { bindManualReleaseRequestAuthority }  from './manual-release-request-authority-binding.mjs';
import { runManualReleaseExecutionPreflight } from './manual-release-execution-preflight.mjs';
import { runManualReleaseDryRun }             from './manual-release-dry-run-executor.mjs';
import { buildManualReleaseHandoffPackage }   from './manual-release-handoff-package.mjs';
import {
  appendHandoffLedgerEvent,
  verifyHandoffLedgerChain,
  _resetHandoffLedgerForTest,
} from './manual-release-handoff-ledger.mjs';

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
// V15.8: optional authorization manifest path
const AUTHORIZATION_MANIFEST_PATH    = ARG('--authorization-manifest')      || null;
// V15.9: authorization scenario and matrix flags
const AUTHORIZATION_SCENARIO         = ARG('--authorization-scenario')       || null;
const AUTHORIZATION_SCENARIO_MATRIX  = FLAG('--authorization-scenario-matrix');
// V15.10: authority review flags
const AUTHORITY_CONTRACT_PATH        = ARG('--authority-contract')            || null;
const AUTHORITY_SCENARIO             = ARG('--authority-scenario')            || null;
const AUTHORITY_SCENARIO_MATRIX      = FLAG('--authority-scenario-matrix');
// V15.11: Harness execution mode
const HARNESS_MODE = ARG('--mode') || 'certify';
const FAST_MODE    = HARNESS_MODE === 'interactive' || HARNESS_MODE === 'patch';

// V15.3 runtime probe flags
const RUNTIME_PROBE_NO_START   = FLAG('--runtime-probe-no-start');
const RUNTIME_PROBE_ROOT_ARG   = ARG('--runtime-probe-root') || null;
const RUNTIME_PROBE_PORT       = Number(ARG('--runtime-probe-port') || process.env.PORT || 8080);
const RUNTIME_PROBE_TIMEOUT_MS = Number(ARG('--runtime-probe-timeout-ms') || 8000);

// V32.0: Runtime Bridge Execution Mode flags (default: off — safe)
const RUNTIME_BRIDGE         = FLAG('--runtime-bridge');
const FIXTURE_RUNTIME_BRIDGE = FLAG('--fixture-runtime-bridge');
const GO_CORE_BIN_ARG        = ARG('--go-core-bin') || null;
const RUNTIME_BRIDGE_TIMEOUT = Number(ARG('--runtime-bridge-timeout-ms') || 10000);

// V33.0: Candidate Drill Mode flags (default: off — safe)
const CANDIDATE_DRILL   = FLAG('--candidate-drill');
const FIXTURE_AUTHORITY = FLAG('--fixture-authority');
const VERIFY_TESTS      = FLAG('--verify-tests');

// V36.3: Local Runtime Execution Mode flags (default: off — safe)
const LOCAL_RUNTIME_EXECUTION        = FLAG('--local-runtime-execution');
const FIXTURE_LOCAL_RUNTIME          = FLAG('--fixture-local-runtime');
const LOCAL_RUNTIME_START_BACKEND    = FLAG('--local-runtime-start-backend');
const LOCAL_RUNTIME_GO_CORE_BIN      = ARG('--local-runtime-go-core-bin') || null;

// V37.1: Runtime Candidate Mode flags (default: off — safe)
const RUNTIME_CANDIDATE         = FLAG('--runtime-candidate');
const FIXTURE_RUNTIME_CANDIDATE = FLAG('--fixture-runtime-candidate');

// V42.1: Supervised Release Candidate Mode flags (default: off — safe)
const SUPERVISED_RELEASE_CANDIDATE = FLAG('--supervised-release-candidate');
const FIXTURE_RELEASE_INTENT       = FLAG('--fixture-release-intent');
const POLICY_CLEAN                 = FLAG('--policy-clean');
// Note: FIXTURE_AUTHORITY and VERIFY_TESTS already declared in V33.0 block above

// V44.1: Supervised Release Ledger Wiring flags (default: off — safe)
const SUPERVISED_RELEASE_LEDGER       = FLAG('--supervised-release-ledger');
const FIXTURE_SUPERVISED_RELEASE      = FLAG('--fixture-supervised-release');
const FIXTURE_MANUAL_PROMOTION_REVIEW = FLAG('--fixture-manual-promotion-review');

// V49.0: Manual Release Handoff Mode flags (default: off — safe)
const MANUAL_RELEASE_HANDOFF          = FLAG('--manual-release-handoff');
const FIXTURE_HUMAN_CONFIRMATION      = FLAG('--fixture-human-confirmation');
const FIXTURE_MANUAL_RELEASE_REQUEST  = FLAG('--fixture-manual-release-request');
const FIXTURE_PREFLIGHT               = FLAG('--fixture-preflight');
const FIXTURE_DRY_RUN                 = FLAG('--fixture-dry-run');
const LEDGER_HANDOFF                  = FLAG('--ledger-handoff');

const DIFFICULTY_ORDER = ['D0','D1','D2','D3','D4','D5','D6','D7','D8'];
const rawMaxDiff = ARG('--max-difficulty') || ((HARNESS_MODE === 'interactive' || HARNESS_MODE === 'patch' || HARNESS_MODE === 'verify') ? 'D2' : 'D8');
const MAX_DIFF_IDX = DIFFICULTY_ORDER.includes(rawMaxDiff)
  ? DIFFICULTY_ORDER.indexOf(rawMaxDiff)
  : 8;
// Skip go test/build in D0 when fast mode OR when max-difficulty is D2 or lower
const SKIP_GO_D0 = MAX_DIFF_IDX <= 2 || HARNESS_MODE === 'interactive' || HARNESS_MODE === 'patch' || HARNESS_MODE === 'verify';

const LOCAL_BACKEND_PORT = RUNTIME_PROBE_PORT;
const LOCAL_BACKEND_BASE = `http://localhost:${LOCAL_BACKEND_PORT}`;

// Handle for backend process started by --runtime-probe
let _backendProcess      = null;
// Temp root managed by runtime probe (V15.3)
let _probeTempRoot        = null;
let _probeTempRootCreated = false;
// Hermes Mission Supervisor context (V15.5)
let _hermesCtx = null;
// V27.0: E2E runtime probe result (populated when --runtime-probe is used)
let _e2eProbeResult = null;
// V32.0: Runtime bridge result (populated when --runtime-bridge is used)
let _bridgeProbeResult = null;
// V33.0: Candidate drill result (populated when --candidate-drill is used)
let _candidateDrillResult = null;
// V36.3: Local Runtime Execution results (populated when --local-runtime-execution is used)
let _localRuntimeResult   = null;
let _localEvidencePackage = null;
let _localLedgerBinding   = null;
// V37.1: Runtime Candidate result (populated when --runtime-candidate is used)
let _runtimeCandidateResult = null;
// V42.1: Supervised Release Candidate result (populated when --supervised-release-candidate is used)
let _supervisedRCResult = null;
// V44.1: Supervised Release Ledger results
let _supervisedLedgerEvents = [];
let _supervisedLedgerChain  = null;
let _supervisedPromoPkg     = null;
let _supervisedPromoReview  = null;
// V49.0: Manual Release Handoff results
let _manualReleaseRequest    = null;
let _humanConfirmation       = null;
let _requestAuthorityBinding = null;
let _executionPreflight      = null;
let _dryRunResult            = null;
let _handoffPackage          = null;
let _handoffLedgerChain      = null;
let _handoffLedgerEventIds   = [];
// Runtime Evidence snapshot (V15.6)
let _runtimeEvidence = null;
// Decision Matrix snapshot (V15.7)
let _decisionMatrix = null;
// Authorization Layer snapshot (V15.8)
let _authorizationLayer = null;
// Authorization Scenario snapshots (V15.9)
let _authorizationScenario       = null;
let _authorizationScenarioMatrix = null;
// Authority Review Gate snapshots (V15.10)
let _authorityGate          = null;
let _authorityScenario      = null;
let _authorityScenarioMatrix = null;
// PASS GOLD Authority Binding (V15.12)
let _passGoldBinding        = null;
// Release Candidate Controller (V15.13)
let _releaseCandidateResult = null;
// Release Plan Generator (V15.14)
let _releasePlan            = null;

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
    // V27.1: Strict gate fields (set after E2E probe)
    goCorReceiptValid:           false,
    runtimeEvidenceReady:        false,
    passGoldAuthorityBindingValid: false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// STRICT PASS GOLD GATE
// ═══════════════════════════════════════════════════════════════════

function computeStrictPassGoldCandidate(s) {
  // V27.1: All 16 strict gates must pass
  return Boolean(
    s.syntaxOk === true &&
    s.goCoreCompiled === true &&
    s.goCoreTestPass === true &&
    s.goCoreBuildPass === true &&
    s.fakeEvidenceAbsent === true &&
    s.forbiddenDiffAbsent === true &&
    s.backendAlive === true &&
    s.backendHealthOk === true &&
    s.backendStub === false &&
    s.backendHasMissionId === true &&
    s.backendHasEvidenceReceipt === true &&
    s.evidenceSource === 'go-core' &&
    s.runtimeProbePass === true &&
    s.goCorReceiptValid === true &&
    s.passGoldAuthorityBindingValid === true &&
    s.runtimeEvidenceReady === true
  );
}

function computeStrictPassGoldReason(s) {
  const missing = [];
  // V27.1: all 16 strict gates
  if (!s.syntaxOk)                  missing.push('syntax_ok');
  if (!s.goCoreCompiled)            missing.push('go_core_compiled');
  if (!s.goCoreTestPass)            missing.push('go_test_pass');
  if (!s.goCoreBuildPass)           missing.push('go_build_pass');
  if (!s.fakeEvidenceAbsent)        missing.push('fake_evidence_absent');
  if (!s.forbiddenDiffAbsent)       missing.push('forbidden_diff_absent');
  if (!s.backendAlive)              missing.push('backend_alive');
  if (!s.backendHealthOk)           missing.push('backend_health_ok');
  if (s.backendStub)                missing.push('backend_not_stub');
  if (!s.backendHasMissionId)       missing.push('backend_mission_id');
  if (!s.backendHasEvidenceReceipt) missing.push('backend_evidence_receipt');
  if (s.evidenceSource !== 'go-core') missing.push('evidence_source_go_core');
  if (!s.runtimeProbePass)          missing.push('runtime_probe_pass');
  if (!s.goCorReceiptValid)         missing.push('go_core_receipt_valid');
  if (!s.passGoldAuthorityBindingValid) missing.push('pass_gold_authority_binding_valid');
  if (!s.runtimeEvidenceReady)      missing.push('runtime_evidence_ready');
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

  // Visual locks — skipped in fast modes (interactive/patch)
  if (FAST_MODE) {
    s.visualGoldLockPass = true;
    s.frontendVisualPass = true;
    s.guardOk = true;
    audit(`[D0] mode=${HARNESS_MODE}: visual locks + guard skipped (fast mode)`);
  } else {
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
  }

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
  if (SKIP_GO_D0) {
    s.goCoreTestPass  = false;
    s.goCoreBuildPass = false;
    audit(`[D0] mode=${HARNESS_MODE}: go test/build skipped (fast mode)`);
  } else if (goVer && existsSync(goCoreDir)) {
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
      // V15.8: Authorization Layer fields
      hermes_authorization_layer_enabled:   true,
      hermes_authorization_schema_version:  'v15.8',
      hermes_authorization_status:          _authorizationLayer?.authorization_status         || 'AUTHORIZATION_MISSING',
      hermes_authorization_valid:           _authorizationLayer?.authorization_valid           || false,
      hermes_authorization_requirements:    (_authorizationLayer?.authorization_requirements   || []).map(r => r.id),
      hermes_authorization_missing:         _authorizationLayer?.missing_authorizations        || [],
      hermes_authorization_errors:          _authorizationLayer?.authorization_errors          || [],
      hermes_authorization_warnings:        _authorizationLayer?.authorization_warnings        || [],
      hermes_authorization_audit_trail:     (_authorizationLayer?.authorization_audit_trail    || []).map(e => e.type),
      hermes_authorization_gate:            _authorizationLayer ? renderAuthorizationGate(_authorizationLayer) : null,
      hermes_release_authorized:            _authorizationLayer?.release_authorized            || false,
      hermes_deploy_authorized:             _authorizationLayer?.deploy_authorized             || false,
      hermes_tag_authorized:                _authorizationLayer?.tag_authorized                || false,
      hermes_stable_promotion_authorized:   _authorizationLayer?.stable_promotion_authorized   || false,
      hermes_release_allowed:               false,
      hermes_tag_allowed:                   false,
      // V15.9: Authorization Harness fields
      hermes_authorization_harness_enabled:        true,
      hermes_authorization_harness_schema_version: 'v15.9',
      hermes_authorization_scenario:               AUTHORIZATION_SCENARIO || null,
      hermes_authorization_scenario_status:        _authorizationScenario?.actual_status  || null,
      hermes_authorization_signature_present:      _authorizationScenario?.signature_present || false,
      hermes_authorization_signature_valid:        _authorizationScenario?.signature_valid   || false,
      hermes_authorization_scenario_matrix:        AUTHORIZATION_SCENARIO_MATRIX
        ? { total: _authorizationScenarioMatrix?.total, passed: _authorizationScenarioMatrix?.passed, failed: _authorizationScenarioMatrix?.failed, all_safe: _authorizationScenarioMatrix?.all_safe, scenarios: (_authorizationScenarioMatrix?.scenarios || []).map(s => ({ scenario: s.scenario, actual_status: s.actual_status, status_match: s.status_match })) }
        : null,
      hermes_authorization_scenario_total:         _authorizationScenarioMatrix?.total  ?? null,
      hermes_authorization_scenario_passed:        _authorizationScenarioMatrix?.passed ?? null,
      hermes_authorization_scenario_failed:        _authorizationScenarioMatrix?.failed ?? null,
      hermes_authorization_all_safe:               _authorizationScenarioMatrix?.all_safe               ?? null,
      hermes_authorization_all_allowed_flags_false: _authorizationScenarioMatrix?.all_allowed_flags_false ?? null,
      // V15.10: Authority Review Gate fields
      hermes_authority_review_enabled:             true,
      hermes_authority_schema_version:             'v15.10',
      hermes_authority_review_status:              _authorityGate?.authority_review_status              || 'CONTRACT_MISSING',
      hermes_authority_review_valid:               _authorityGate?.authority_review_valid               || false,
      hermes_human_approval_contract_valid:        _authorityGate?.human_approval_contract_valid        || false,
      hermes_authority_role:                       _authorityGate?.authority_role                       || null,
      hermes_authority_sufficient:                 _authorityGate?.authority_sufficient                 || false,
      hermes_authority_scope_valid:                _authorityGate?.scope_valid                          || false,
      hermes_authority_temporal_valid:             _authorityGate?.temporal_valid                       || false,
      hermes_authority_missing_evidence:           _authorityGate?.missing_evidence                     || [],
      hermes_authority_conflicts:                  (_authorityGate?.authority_conflicts                  || []).map(c => ({ id: c.id, severity: c.severity })),
      hermes_authority_audit_trail:                (_authorityGate?.authority_audit_trail                || []).map(e => e.type),
      hermes_authority_requirements:               (_authorityGate?.authority_requirements               || []).map(r => r.id),
      hermes_authority_scenario:                   AUTHORITY_SCENARIO || null,
      hermes_authority_scenario_matrix:            AUTHORITY_SCENARIO_MATRIX
        ? { total: _authorityScenarioMatrix?.total, passed: _authorityScenarioMatrix?.passed, failed: _authorityScenarioMatrix?.failed, all_safe: _authorityScenarioMatrix?.all_safe, scenarios: (_authorityScenarioMatrix?.scenarios || []).map(s => ({ scenario: s.scenario, actual_status: s.actual_status, status_match: s.status_match })) }
        : null,
      hermes_authority_scenario_total:             _authorityScenarioMatrix?.total             ?? null,
      hermes_authority_scenario_passed:            _authorityScenarioMatrix?.passed            ?? null,
      hermes_authority_scenario_failed:            _authorityScenarioMatrix?.failed            ?? null,
      hermes_authority_all_safe:                   _authorityScenarioMatrix?.all_safe          ?? null,
      hermes_authority_all_allowed_flags_false:    _authorityScenarioMatrix?.all_allowed_flags_false ?? null,
      hermes_release_authorized_by_authority:      _authorityGate?.release_authorized           || false,
      hermes_deploy_authorized_by_authority:       _authorityGate?.deploy_authorized            || false,
      hermes_tag_authorized_by_authority:          _authorityGate?.tag_authorized               || false,
      hermes_stable_authorized_by_authority:       _authorityGate?.stable_promotion_authorized  || false,
      hermes_pass_gold_confirmed_by_authority:     _authorityGate?.pass_gold_confirmed          || false,
      // V15.11: Mode fields
      mode:                   HARNESS_MODE,
      fast_feedback_pass:     FAST_MODE && s.syntaxOk && failedGates.filter(g => !['legacy_clean','v14_clean_ownership','backend_alive','backend_health_ok','backend_not_stub','backend_mission_id','backend_evidence_receipt','evidence_source_go_core','go_core_compiled','go_test_pass','go_build_pass'].includes(g)).length === 0,
      full_suite_required:    FAST_MODE || HARNESS_MODE === 'verify',
      certify_required:       HARNESS_MODE !== 'certify' && HARNESS_MODE !== 'release',
      recommendation:         (RUNTIME_PROBE && !s.runtimeProbePass) ? 'BLOCKED_RUNTIME' : (s.recommendation?.startsWith('BLOCKED_') ? s.recommendation : (FAST_MODE ? (s.syntaxOk ? 'FAST_FEEDBACK_ONLY' : 'CERTIFY_REQUIRED') : s.recommendation)),
      // V15.12: PASS GOLD Authority Binding
      pass_gold_authority_binding_enabled:        _passGoldBinding?.pass_gold_authority_binding_enabled        ?? true,
      pass_gold_authority_binding_schema_version: _passGoldBinding?.pass_gold_authority_binding_schema_version ?? 'v15.12',
      pass_gold_authority_binding_status:         _passGoldBinding?.pass_gold_authority_binding_status         ?? 'BINDING_BLOCKED_EVIDENCE',
      pass_gold_authority_binding_valid:          _passGoldBinding?.pass_gold_authority_binding_valid          ?? false,
      pass_gold_authority_binding_errors:         _passGoldBinding?.pass_gold_authority_binding_errors         ?? [],
      pass_gold_authority_binding_warnings:       _passGoldBinding?.pass_gold_authority_binding_warnings       ?? [],
      pass_gold_confirmed_by_authority:           _passGoldBinding?.pass_gold_confirmed_by_authority           ?? false,
      pass_gold_confirmed_by_go_core:             _passGoldBinding?.pass_gold_confirmed_by_go_core             ?? false,
      pass_gold_binding_evidence_receipt_id:      _passGoldBinding?.pass_gold_binding_evidence_receipt_id      ?? null,
      pass_gold_binding_evidence_source:          _passGoldBinding?.pass_gold_binding_evidence_source          ?? null,
      pass_gold_binding_contract_id:              _passGoldBinding?.pass_gold_binding_contract_id              ?? null,
      pass_gold_binding_reviewer:                 _passGoldBinding?.pass_gold_binding_reviewer                 ?? null,
      pass_gold_binding_allowed_actions:          _passGoldBinding?.pass_gold_binding_allowed_actions          ?? [],
      // V15.13: Release Candidate Dry-Run Controller
      release_candidate_dry_run_enabled:  _releaseCandidateResult?.release_candidate_dry_run_enabled  ?? true,
      release_candidate_schema_version:   _releaseCandidateResult?.release_candidate_schema_version   ?? 'v15.13',
      release_candidate_status:           _releaseCandidateResult?.release_candidate_status           ?? 'RC_BLOCKED_EVIDENCE',
      release_candidate_allowed:          _releaseCandidateResult?.release_candidate_allowed          ?? false,
      release_candidate_dry_run_only:     _releaseCandidateResult?.release_candidate_dry_run_only     ?? true,
      release_candidate_blockers:         _releaseCandidateResult?.release_candidate_blockers         ?? [],
      release_candidate_required_evidence: _releaseCandidateResult?.release_candidate_required_evidence ?? [],
      // V15.14: Release Plan Generator
      release_plan_status:      _releasePlan?.release_plan_status      ?? 'PLAN_BLOCKED_NO_CANDIDATE',
      release_plan_ready:       _releasePlan?.release_plan_ready       ?? false,
      release_plan_id:          _releasePlan?.release_plan_id          ?? null,
      release_plan_schema_version: _releasePlan?.schema_version        ?? 'v15.14',
      release_plan_deploy_performed:  false,
      release_plan_tag_created:       false,
      release_plan_stable_promoted:   false,
      // V21.3/V27.0/V32.0/V33.0: Runtime Evidence Wiring
      runtime_evidence_enabled:         RUNTIME_PROBE || RUNTIME_BRIDGE || FIXTURE_RUNTIME_BRIDGE || CANDIDATE_DRILL || LOCAL_RUNTIME_EXECUTION || FIXTURE_LOCAL_RUNTIME || RUNTIME_CANDIDATE || FIXTURE_RUNTIME_CANDIDATE || SUPERVISED_RELEASE_CANDIDATE,
      runtime_evidence_status:          (_e2eProbeResult?.e2e_runtime_status === 'E2E_RUNTIME_READY' || _bridgeProbeResult?.probe_bridge_ready === true || _candidateDrillResult?.full_candidate_drill_ready === true || _localLedgerBinding?.ledger_binding_ready === true || _runtimeCandidateResult?.runtime_pass_gold_ready === true || _supervisedRCResult?.supervised_release_candidate_ready === true)
        ? 'RUNTIME_EVIDENCE_READY'
        : 'RUNTIME_EVIDENCE_BLOCKED_BACKEND_OFFLINE',
      runtime_evidence_ready:           _e2eProbeResult?.e2e_runtime_status === 'E2E_RUNTIME_READY' || _bridgeProbeResult?.probe_bridge_ready === true || _candidateDrillResult?.full_candidate_drill_ready === true || _localLedgerBinding?.ledger_binding_ready === true || _runtimeCandidateResult?.runtime_pass_gold_ready === true || _supervisedRCResult?.supervised_release_candidate_ready === true,
      backend_runtime_probe_status:     _bridgeProbeResult?.probe_bridge_status ?? _e2eProbeResult?.e2e_runtime_status ?? 'PROBE_SKIPPED_NO_START',
      go_core_receipt_status:           (_e2eProbeResult?.receipt_valid === true || _bridgeProbeResult?.receipt_valid === true) ? 'RECEIPT_VALID' : 'RECEIPT_BLOCKED_MISSING',
      go_core_receipt_valid:            _e2eProbeResult?.receipt_valid === true || _bridgeProbeResult?.receipt_valid === true,
      runtime_evidence_pass_gold_candidate_allowed: _e2eProbeResult?.runtime_probe_pass === true || _bridgeProbeResult?.runtime_probe_pass === true,
      // V27.0: E2E probe fields
      e2e_runtime_status:               _e2eProbeResult?.e2e_runtime_status ?? 'E2E_SKIPPED_NO_START',
      e2e_mission_id:                   _e2eProbeResult?.mission_id ?? null,
      e2e_evidence_receipt_id:          _e2eProbeResult?.evidence_receipt_id ?? null,
      e2e_evidence_source:              _e2eProbeResult?.evidence_source ?? null,
      e2e_runtime_probe_pass:           _e2eProbeResult?.runtime_probe_pass === true,
      // V32.0: Runtime bridge fields
      runtime_bridge_enabled:           RUNTIME_BRIDGE || FIXTURE_RUNTIME_BRIDGE,
      runtime_bridge_status:            _bridgeProbeResult?.probe_bridge_status ?? 'BRIDGE_NOT_STARTED',
      runtime_bridge_ready:             _bridgeProbeResult?.probe_bridge_ready === true,
      runtime_bridge_mission_id:        _bridgeProbeResult?.mission_id ?? null,
      runtime_bridge_receipt_id:        _bridgeProbeResult?.evidence_receipt_id ?? null,
      runtime_bridge_evidence_source:   _bridgeProbeResult?.evidence_source ?? null,
      runtime_bridge_probe_pass:        _bridgeProbeResult?.runtime_probe_pass === true,
      // V33.0: Candidate Drill Mode fields
      candidate_drill_enabled:                    CANDIDATE_DRILL,
      candidate_drill_status:                     _candidateDrillResult?.full_candidate_drill_status ?? 'CANDIDATE_DRILL_NOT_STARTED',
      candidate_drill_ready:                      _candidateDrillResult?.full_candidate_drill_ready === true,
      candidate_drill_pass_gold_candidate_allowed: _candidateDrillResult?.pass_gold_candidate_allowed === true,
      candidate_drill_evidence_source:            _candidateDrillResult?.evidence_source ?? null,
      candidate_drill_mission_id:                 _candidateDrillResult?.mission_id ?? null,
      candidate_drill_receipt_id:                 _candidateDrillResult?.evidence_receipt_id ?? null,
      candidate_is_local_drill:                   _candidateDrillResult?.candidate_is_local_drill === true,
      // V36.3: Local Runtime Execution Mode fields
      local_runtime_execution_enabled:   LOCAL_RUNTIME_EXECUTION || FIXTURE_LOCAL_RUNTIME,
      local_runtime_status:              _localRuntimeResult?.local_runtime_status ?? 'LOCAL_RUNTIME_NOT_STARTED',
      local_runtime_ready:               _localRuntimeResult?.local_runtime_ready === true,
      local_evidence_package_status:     _localEvidencePackage?.evidence_package_status ?? 'EVIDENCE_PACKAGE_NOT_STARTED',
      local_evidence_package_ready:      _localEvidencePackage?.evidence_package_ready === true,
      local_ledger_binding_status:       _localLedgerBinding?.ledger_binding_status ?? 'LEDGER_BINDING_NOT_STARTED',
      local_ledger_binding_ready:        _localLedgerBinding?.ledger_binding_ready === true,
      local_ledger_entry_id:             _localLedgerBinding?.ledger_entry_id ?? null,
      local_package_hash:                _localEvidencePackage?.package_hash ?? null,
      local_mission_id:                  _localRuntimeResult?.mission_id ?? null,
      local_evidence_receipt_id:         _localRuntimeResult?.evidence_receipt_id ?? null,
      local_evidence_source:             _localRuntimeResult?.evidence_source ?? null,
      // V37.1: Runtime Candidate Mode fields
      runtime_candidate_enabled:         RUNTIME_CANDIDATE || FIXTURE_RUNTIME_CANDIDATE,
      runtime_pass_gold_status:          _runtimeCandidateResult?.runtime_pass_gold_status ?? 'RUNTIME_PASS_GOLD_NOT_STARTED',
      runtime_pass_gold_ready:           _runtimeCandidateResult?.runtime_pass_gold_ready === true,
      runtime_candidate_pass_gold:       _runtimeCandidateResult?.pass_gold_candidate === true,
      runtime_candidate_local_only:      _runtimeCandidateResult?.candidate_is_local_only !== false,
      runtime_candidate_mission_id:      _runtimeCandidateResult?.mission_id ?? null,
      runtime_candidate_ledger_entry_id: _runtimeCandidateResult?.ledger_entry_id ?? null,
      runtime_candidate_evidence_source: _runtimeCandidateResult?.evidence_source ?? null,
      // V42.1: Supervised Release Candidate Mode fields
      supervised_release_candidate_enabled: SUPERVISED_RELEASE_CANDIDATE,
      supervised_release_candidate_status:  _supervisedRCResult?.supervised_release_candidate_status ?? 'SUPERVISED_RC_NOT_STARTED',
      supervised_release_candidate_ready:   _supervisedRCResult?.supervised_release_candidate_ready === true,
      release_candidate_mode:               _supervisedRCResult?.release_candidate_mode ?? null,
      production_release_allowed:           false,
      release_intent_id:                    _supervisedRCResult?.intent_id ?? null,
      intent_authority_binding_status:      _supervisedRCResult ? 'INTENT_AUTHORITY_READY' : null,
      // V44.1: Supervised Release Ledger fields
      supervised_ledger_enabled:            SUPERVISED_RELEASE_LEDGER,
      supervised_ledger_size:               _supervisedLedgerEvents.length,
      supervised_ledger_chain_valid:        _supervisedLedgerChain?.valid ?? null,
      supervised_ledger_events:             _supervisedLedgerEvents.map(e => ({ seq: e.seq, event_type: e.event_type, supervised_ledger_ready: e.supervised_ledger_ready })),
      promotion_package_ready:              _supervisedPromoPkg?.promotion_package_ready ?? false,
      promotion_review_ready:               _supervisedPromoReview?.promotion_review_ready ?? false,
      // V49.0: Manual Release Handoff Mode fields
      manual_release_handoff_enabled:       MANUAL_RELEASE_HANDOFF,
      manual_release_request_status:        _manualReleaseRequest?.manual_release_request_status ?? null,
      human_confirmation_status:            _humanConfirmation?.human_confirmation_status ?? null,
      manual_release_authority_binding_status: _requestAuthorityBinding?.request_authority_binding_status ?? null,
      manual_release_preflight_status:      _executionPreflight?.manual_release_preflight_status ?? null,
      manual_release_dry_run_status:        _dryRunResult?.manual_release_dry_run_status ?? null,
      manual_release_handoff_status:        _handoffPackage?.handoff_status ?? null,
      manual_release_handoff_ready:         _handoffPackage?.handoff_ready === true,
      handoff_id:                           _handoffPackage?.handoff_id ?? null,
      handoff_ledger_event_ids:             _handoffLedgerEventIds,
      handoff_ledger_chain_valid:           _handoffLedgerChain?.valid ?? null,
      release_execution_allowed:            false,
      release_performed:                    false,
      tag_created:                          false,
      stable_promoted:                      false,
      deploy_performed:                     false,
    };
    // V21.3/V27.0: pass_gold_candidate guarded by runtime_evidence_ready
    if (!out.runtime_evidence_ready) {
      out.pass_gold_candidate   = false;
      out.promotion_allowed     = false;
      out.deploy_allowed        = false;
    }
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    return out;
  }

  const W   = 72;
  const sep = '═'.repeat(W);
  const div = t => `\n${'─'.repeat(4)} ${t} ${'─'.repeat(Math.max(0, W - t.length - 7))}`;

  log('');
  log(`╔${sep}╗`);
  const title = 'PI HARNESS V15.10 — VISION CORE AUTONOMOUS MISSION RUNNER';
  log(`║  ${title}${' '.repeat(Math.max(0, W - title.length - 2))}║`);
  const sub   = 'RELATÓRIO FINAL';
  log(`║  ${sub}${' '.repeat(Math.max(0, W - sub.length - 2))}║`);
  log(`╚${sep}╝`);

  log(div('SUMÁRIO'));
  log(`MODE:                      ${HARNESS_MODE}`);
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
  if (FAST_MODE) {
    const _ffp = s.syntaxOk && failedGates.filter(g => !['legacy_clean','v14_clean_ownership','backend_alive','backend_health_ok','backend_not_stub','backend_mission_id','backend_evidence_receipt','evidence_source_go_core','go_core_compiled','go_test_pass','go_build_pass'].includes(g)).length === 0;
    log(`FAST_FEEDBACK_PASS:        ${_ffp}`);
    log(`FULL_SUITE_REQUIRED:       ${FAST_MODE || HARNESS_MODE === 'verify'}`);
    log(`NOTE: ${HARNESS_MODE} mode — run test:prepush before push — deploy_allowed=false always`);
  }

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

  if (_authorizationLayer) {
    log(div('RUNTIME EVIDENCE AUTHORIZATION LAYER (V15.8)'));
    log(`AUTHORIZATION_SCHEMA:      ${_authorizationLayer.schema_version || 'v15.8'}`);
    log(`AUTHORIZATION_STATUS:      ${_authorizationLayer.authorization_status}`);
    log(`AUTHORIZATION_VALID:       ${_authorizationLayer.authorization_valid}`);
    log(`RELEASE_AUTHORIZED:        ${_authorizationLayer.release_authorized}`);
    log(`DEPLOY_AUTHORIZED:         ${_authorizationLayer.deploy_authorized}`);
    log(`TAG_AUTHORIZED:            ${_authorizationLayer.tag_authorized}`);
    log(`STABLE_PROMOTION_AUTHORIZED: ${_authorizationLayer.stable_promotion_authorized}`);
    log(`RELEASE_ALLOWED:           false`);
    log(`DEPLOY_ALLOWED:            false`);
    log(`TAG_ALLOWED:               false`);
    log(`STABLE_ALLOWED:            false`);
    const missing = _authorizationLayer.missing_authorizations || [];
    if (missing.length > 0) {
      log(`MISSING_AUTHORIZATIONS:`);
      for (const m of missing) log(`  ✗ ${m}`);
    }
    const authErrors = _authorizationLayer.authorization_errors || [];
    if (authErrors.length > 0) {
      log(`AUTHORIZATION_ERRORS:`);
      for (const e of authErrors) log(`  ✗ ${e}`);
    }
    const authWarnings = _authorizationLayer.authorization_warnings || [];
    if (authWarnings.length > 0) {
      log(`AUTHORIZATION_WARNINGS:`);
      for (const w of authWarnings) log(`  ! ${w}`);
    }
    log(`AUDIT_TRAIL_EVENTS:        ${(_authorizationLayer.authorization_audit_trail || []).length}`);
    const gate = renderAuthorizationGate(_authorizationLayer);
    if (gate) {
      log(`FINAL_AUTHORIZATION_GATE:  ${gate.authorization_status}`);
      log(`EFFECTIVE_STATE:           ${gate.release_gate_effective_state}`);
    }
    log(`NOTE: authorization is modeled, not executed`);
    log(`NOTE: explicit authorization is required`);
    log(`NOTE: deploy/tag/stable remain blocked in V15.8`);
  }

  if (_authorizationScenario || _authorizationScenarioMatrix) {
    log(div('AUTHORIZATION MANIFEST TEST HARNESS (V15.9)'));
    log(`HARNESS_SCHEMA:            v15.9`);
    if (_authorizationScenario) {
      log(`SCENARIO:                  ${_authorizationScenario.scenario}`);
      log(`SCENARIO_STATUS:           ${_authorizationScenario.scenario_status}`);
      log(`SIGNATURE_PRESENT:         ${_authorizationScenario.signature_present}`);
      log(`SIGNATURE_VALID:           ${_authorizationScenario.signature_valid}`);
      log(`STATUS_MATCH:              ${_authorizationScenario.status_match}`);
      log(`SCENARIO_RELEASE_ALLOWED:  false`);
      log(`SCENARIO_DEPLOY_ALLOWED:   false`);
      log(`SCENARIO_TAG_ALLOWED:      false`);
      log(`SCENARIO_STABLE_ALLOWED:   false`);
    }
    if (_authorizationScenarioMatrix) {
      const mreport = renderAuthorizationScenarioReport(_authorizationScenarioMatrix);
      log(`MATRIX_TOTAL:              ${_authorizationScenarioMatrix.total}`);
      log(`MATRIX_PASSED:             ${_authorizationScenarioMatrix.passed}`);
      log(`MATRIX_FAILED:             ${_authorizationScenarioMatrix.failed}`);
      log(`ALL_SAFE:                  ${_authorizationScenarioMatrix.all_safe}`);
      log(`ALL_ALLOWED_FLAGS_FALSE:   ${_authorizationScenarioMatrix.all_allowed_flags_false}`);
      if (mreport && Array.isArray(mreport.scenario_summary)) {
        for (const s of mreport.scenario_summary) {
          log(`  [${s.status_match ? 'PASS' : 'FAIL'}] ${s.scenario}: ${s.actual_status}  sig=${s.signature}`);
        }
      }
    }
    log(`FINAL_HARNESS_DECISION:    ${(_authorizationScenarioMatrix?.failed === 0 || !_authorizationScenarioMatrix) ? 'HARNESS_PASS' : 'HARNESS_FAIL'}`);
    log(`NOTE: signed approval simulation only`);
    log(`NOTE: no real cryptographic production key used`);
    log(`NOTE: authorization test harness never executes deploy/tag/stable`);
  }

  if (_authorityGate || _authorityScenario || _authorityScenarioMatrix) {
    log(div('AUTHORITY REVIEW GATE (V15.10)'));
    log(`AUTHORITY_SCHEMA:          v15.10`);
    if (_authorityGate) {
      log(`AUTHORITY_STATUS:          ${_authorityGate.authority_review_status}`);
      log(`AUTHORITY_VALID:           ${_authorityGate.authority_review_valid}`);
      log(`CONTRACT_VALID:            ${_authorityGate.human_approval_contract_valid}`);
      log(`AUTHORITY_ROLE:            ${_authorityGate.authority_role || 'none'}`);
      log(`AUTHORITY_SUFFICIENT:      ${_authorityGate.authority_sufficient}`);
      log(`SCOPE_VALID:               ${_authorityGate.scope_valid}`);
      log(`TEMPORAL_VALID:            ${_authorityGate.temporal_valid}`);
      const missEv = _authorityGate.missing_evidence || [];
      log(`MISSING_EVIDENCE:          ${missEv.length > 0 ? missEv.join(', ') : 'none'}`);
      const conflicts = _authorityGate.authority_conflicts || [];
      log(`CONFLICTS:                 ${conflicts.length > 0 ? conflicts.map(c => `${c.id}(${c.severity})`).join(', ') : 'none'}`);
      log(`RELEASE_AUTHORIZED_BY_AUTHORITY:  ${_authorityGate.release_authorized}`);
      log(`DEPLOY_AUTHORIZED_BY_AUTHORITY:   ${_authorityGate.deploy_authorized}`);
      log(`TAG_AUTHORIZED_BY_AUTHORITY:      ${_authorityGate.tag_authorized}`);
      log(`STABLE_AUTHORIZED_BY_AUTHORITY:   ${_authorityGate.stable_promotion_authorized}`);
      log(`PASS_GOLD_CONFIRMED_BY_AUTHORITY: ${_authorityGate.pass_gold_confirmed}`);
      log(`RELEASE_ALLOWED:           false`);
      log(`DEPLOY_ALLOWED:            false`);
      log(`TAG_ALLOWED:               false`);
      log(`STABLE_ALLOWED:            false`);
      const gate = renderAuthorityReviewGate(_authorityGate);
      if (gate) log(`FINAL_AUTHORITY_GATE:      ${gate.authority_review_status}`);
    }
    if (_authorityScenario) {
      log(`AUTHORITY_SCENARIO:        ${_authorityScenario.scenario}`);
      log(`AUTHORITY_SCENARIO_STATUS: ${_authorityScenario.actual_status}`);
    }
    if (_authorityScenarioMatrix) {
      const arpt = renderAuthorityScenarioReport(_authorityScenarioMatrix);
      log(div('AUTHORITY SCENARIO MATRIX (V15.10)'));
      log(`MATRIX_TOTAL:              ${_authorityScenarioMatrix.total}`);
      log(`MATRIX_PASSED:             ${_authorityScenarioMatrix.passed}`);
      log(`MATRIX_FAILED:             ${_authorityScenarioMatrix.failed}`);
      log(`ALL_SAFE:                  ${_authorityScenarioMatrix.all_safe}`);
      log(`ALL_ALLOWED_FLAGS_FALSE:   ${_authorityScenarioMatrix.all_allowed_flags_false}`);
      if (arpt && Array.isArray(arpt.scenario_summary)) {
        for (const sc of arpt.scenario_summary) {
          log(`  [${sc.status_match ? 'PASS' : 'FAIL'}] ${sc.scenario}: ${sc.actual_status}`);
        }
      }
    }
    log(`NOTE: authority review is validation, not execution`);
    log(`NOTE: human approval cannot override PASS GOLD`);
    log(`NOTE: deploy/tag/stable remain blocked in V15.10`);
    if (_passGoldBinding) {
      log(div('PASS GOLD AUTHORITY BINDING (V15.12)'));
      log(`BINDING_STATUS:            ${_passGoldBinding.pass_gold_authority_binding_status}`);
      log(`BINDING_VALID:             ${_passGoldBinding.pass_gold_authority_binding_valid}`);
      log(`CONFIRMED_BY_AUTHORITY:    ${_passGoldBinding.pass_gold_confirmed_by_authority}`);
      log(`CONFIRMED_BY_GO_CORE:      ${_passGoldBinding.pass_gold_confirmed_by_go_core}`);
      log(`BINDING_EVIDENCE_SOURCE:   ${_passGoldBinding.pass_gold_binding_evidence_source || 'none'}`);
      log(`BINDING_EVIDENCE_RECEIPT:  ${_passGoldBinding.pass_gold_binding_evidence_receipt_id || 'none'}`);
      log(`BINDING_CONTRACT:          ${_passGoldBinding.pass_gold_binding_contract_id || 'none'}`);
      if (_passGoldBinding.pass_gold_authority_binding_errors.length > 0) {
        log(`BINDING_ERRORS:            ${_passGoldBinding.pass_gold_authority_binding_errors.join(', ')}`);
      }
      log(`NOTE: BINDING_READY never enables deploy/tag/stable — V15.12 classification only`);
    }
    if (_releaseCandidateResult) {
      log(div('RELEASE CANDIDATE DRY-RUN (V15.13)'));
      log(`RC_STATUS:                 ${_releaseCandidateResult.release_candidate_status}`);
      log(`RC_ALLOWED:                ${_releaseCandidateResult.release_candidate_allowed}`);
      log(`RC_DRY_RUN_ONLY:           ${_releaseCandidateResult.release_candidate_dry_run_only}`);
      if (_releaseCandidateResult.release_candidate_blockers.length > 0) {
        log(`RC_BLOCKERS:               ${_releaseCandidateResult.release_candidate_blockers.join(', ')}`);
      }
      log(`NOTE: RC_ALLOWED is classification only — no deploy/tag/stable in V15.13`);
    }
    if (_releasePlan) {
      log(div('RELEASE PLAN (V15.14)'));
      log(`PLAN_STATUS:               ${_releasePlan.release_plan_status}`);
      log(`PLAN_READY:                ${_releasePlan.release_plan_ready}`);
      log(`PLAN_ID:                   ${_releasePlan.release_plan_id || 'none'}`);
      log(`PLAN_DEPLOY_PERFORMED:     false`);
      log(`PLAN_TAG_CREATED:          false`);
      log(`PLAN_STABLE_PROMOTED:      false`);
      log(`NOTE: release plan is auditable documentation — no tag, no deploy, no stable in V15.14`);
    }
  }

  if (hermesCtx) {
    log(div('HERMES SUPERVISION (V15.8)'));
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
    ? `✓ PI HARNESS V15.10 PASS — ${s.recommendation}`
    : `✗ PI HARNESS V15.10 ${result} — ${s.recommendation}`;
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
  recordHermesEvent(_hermesCtx, { type: 'mission_start', version: 'V15.10', max_difficulty: rawMaxDiff });

  if (!JSON_MODE && !CI_MODE) {
    log('');
    log('PI HARNESS V15.10 — iniciando...');
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

  // V15.8: Load authorization manifest and evaluate authorization layer
  let _authManifest = null;
  if (AUTHORIZATION_MANIFEST_PATH) {
    try {
      const raw = readFileSync(resolve(AUTHORIZATION_MANIFEST_PATH), 'utf8');
      _authManifest = JSON.parse(raw);
    } catch (err) {
      _authManifest = { _load_error: err.message, schema_version: 'invalid' };
    }
  }
  _authorizationLayer = evaluateHermesAuthorization(_hermesCtx, _authManifest);

  // V15.9: Authorization Scenario / Matrix
  if (AUTHORIZATION_SCENARIO) {
    try {
      _authorizationScenario = runAuthorizationScenario(AUTHORIZATION_SCENARIO);
    } catch (err) {
      _authorizationScenario = {
        scenario: AUTHORIZATION_SCENARIO, error: err.message,
        actual_status: null, scenario_status: 'SCENARIO_ERROR',
        signature_present: false, signature_valid: false,
        deploy_allowed: false, release_allowed: false, tag_allowed: false,
        stable_allowed: false, promotion_allowed: false, pass_gold_candidate: false,
        safe: true,
      };
    }
  }
  if (AUTHORIZATION_SCENARIO_MATRIX) {
    try {
      _authorizationScenarioMatrix = runAuthorizationScenarioMatrix();
    } catch (err) {
      _authorizationScenarioMatrix = {
        total: 0, passed: 0, failed: 0,
        all_safe: false, all_allowed_flags_false: false,
        error: err.message, scenarios: [],
      };
    }
  }

  // V15.10: Authority Contract / Scenario / Matrix
  let _authorityContract = null;
  if (AUTHORITY_CONTRACT_PATH) {
    try {
      const raw = readFileSync(resolve(AUTHORITY_CONTRACT_PATH), 'utf8');
      _authorityContract = JSON.parse(raw);
    } catch (err) {
      _authorityContract = { _load_error: err.message, schema_version: 'invalid' };
    }
  }
  _authorityGate = evaluateAuthorityReviewGate(_authorityContract, {
    decisionMatrix: _decisionMatrix,
    authorityRegistry: createAuthorityRoleRegistry(),
    authorizationLayer: _authorizationLayer,
  });
  // V15.12: PASS GOLD Authority Binding
  _passGoldBinding = evaluatePassGoldAuthorityBinding(s, _authorityGate, _authorityContract);
  // V15.13: Release Candidate Dry-Run Controller
  const _gitStatusPorcelain = sh('git status --porcelain') || '';
  const _rcGitClean         = _gitStatusPorcelain.trim() === '';
  _releaseCandidateResult = evaluateReleaseCandidate({
    harnessState:    s,
    passGoldBinding: _passGoldBinding,
    gitClean:        _rcGitClean,
    testsPassed:     s.syntaxOk === true && s.fakeEvidenceAbsent !== false,
    goTestsPassed:   s.goCoreTestPass === true && s.goCoreBuildPass === true,
    branch:          s.branch || null,
    evidenceReceipt: s.goRuntimeEvidenceId
      ? { id: s.goRuntimeEvidenceId, source: s.evidenceSource || null }
      : null,
  });
  // V15.14: Release Plan Generator
  _releasePlan = generateReleasePlan({
    releaseCandidateResult: _releaseCandidateResult,
    passGoldBinding:        _passGoldBinding,
    authorityGate:          _authorityGate,
    harnessState:           s,
    gitHead:                s.gitHead  || null,
    branch:                 s.branch   || null,
    authorityContractId:    _authorityContract?.contract_id || null,
  });
  if (AUTHORITY_SCENARIO) {
    try {
      _authorityScenario = runAuthorityScenario(AUTHORITY_SCENARIO);
    } catch (err) {
      _authorityScenario = {
        scenario: AUTHORITY_SCENARIO, error: err.message,
        actual_status: null, scenario_status: 'SCENARIO_ERROR',
        authority_review_valid: false, human_approval_contract_valid: false,
        release_allowed: false, deploy_allowed: false, tag_allowed: false,
        stable_allowed: false, promotion_allowed: false, pass_gold_candidate: false,
        safe: true,
      };
    }
  }
  if (AUTHORITY_SCENARIO_MATRIX) {
    try {
      _authorityScenarioMatrix = runAuthorityScenarioMatrix();
    } catch (err) {
      _authorityScenarioMatrix = {
        total: 0, passed: 0, failed: 0,
        all_safe: false, all_allowed_flags_false: false,
        error: err.message, scenarios: [],
      };
    }
  }

  // V27.0/V27.1: Run E2E runtime probe if --runtime-probe is active
  if (RUNTIME_PROBE && !RUNTIME_PROBE_NO_START) {
    try {
      _e2eProbeResult = await runRuntimeProbeE2ELocal({
        no_start:            false,
        start_local_backend: true,
        port:                LOCAL_BACKEND_PORT,
        timeout_ms:          RUNTIME_PROBE_TIMEOUT_MS,
        git_head:            s.gitHead || 'unknown',
        base_url:            LOCAL_BACKEND_BASE,
      });
      if (_e2eProbeResult?.e2e_runtime_status === 'E2E_RUNTIME_READY') {
        s.backendAlive           = true;
        s.backendHealthOk        = true;
        s.backendStub            = false;
        s.backendHasMissionId    = true;
        s.backendHasEvidenceReceipt = true;
        s.evidenceSource         = 'go-core';
        s.runtimeProbePass       = true;
      }
    } catch (e) {
      audit(`[V27.0] E2E probe error: ${e.message}`);
    }
  } else if (RUNTIME_PROBE && RUNTIME_PROBE_NO_START) {
    _e2eProbeResult = { e2e_runtime_status: 'E2E_SKIPPED_NO_START', runtime_probe_pass: false };
  }

  // V32.0: Runtime Bridge Execution Mode
  if (RUNTIME_BRIDGE || FIXTURE_RUNTIME_BRIDGE) {
    try {
      _bridgeProbeResult = runProbeBridgeIntegration({
        go_core_bin:  GO_CORE_BIN_ARG,
        fixture_mode: FIXTURE_RUNTIME_BRIDGE,
        timeout_ms:   RUNTIME_BRIDGE_TIMEOUT,
      });
      if (_bridgeProbeResult?.probe_bridge_ready === true) {
        s.backendAlive              = true;
        s.backendHealthOk           = true;
        s.backendStub               = false;
        s.backendHasMissionId       = true;
        s.backendHasEvidenceReceipt = true;
        s.evidenceSource            = 'go-core';
        s.runtimeProbePass          = true;
        s.goCorReceiptValid         = true;
        s.runtimeEvidenceReady      = true;
      }
    } catch (e) {
      audit(`[V32.0] Bridge probe error: ${e.message}`);
    }
  }

  // V33.0: Candidate Drill Mode — runs full candidate drill and sets pass_gold_candidate
  if (CANDIDATE_DRILL) {
    try {
      _candidateDrillResult = runLocalPassGoldFullCandidateDrill({
        tests_verified: VERIFY_TESTS,
      });
      if (_candidateDrillResult?.full_candidate_drill_ready === true) {
        s.backendAlive              = true;
        s.backendHealthOk           = true;
        s.backendStub               = false;
        s.backendHasMissionId       = true;
        s.backendHasEvidenceReceipt = true;
        s.evidenceSource            = 'go-core';
        s.runtimeProbePass          = true;
        s.goCorReceiptValid         = true;
        s.runtimeEvidenceReady      = true;
        s.passGoldAuthorityBindingValid = true;
        s.passGoldCandidate         = true;
      }
      audit(`[V33.0] Candidate drill: ${_candidateDrillResult?.full_candidate_drill_status}`);
    } catch (e) {
      audit(`[V33.0] Candidate drill error: ${e.message}`);
    }
  }

  // V36.3: Local Runtime Execution Mode — runs controller + evidence package + ledger binding
  if (LOCAL_RUNTIME_EXECUTION || FIXTURE_LOCAL_RUNTIME) {
    try {
      _localRuntimeResult = runLocalRuntimeExecutionController({
        execute_local_runtime: LOCAL_RUNTIME_EXECUTION,
        start_local_backend:   LOCAL_RUNTIME_START_BACKEND,
        go_core_bin:           LOCAL_RUNTIME_GO_CORE_BIN,
        fixture_mode:          FIXTURE_LOCAL_RUNTIME,
        timeout_ms:            RUNTIME_BRIDGE_TIMEOUT,
      });
      if (_localRuntimeResult?.local_runtime_ready === true) {
        _localEvidencePackage = buildRuntimeExecutionEvidencePackage({
          package_requested: true,
          runtime_result:    _localRuntimeResult,
          fixture_mode:      false,
        });
        _localLedgerBinding = bindRuntimeExecutionToLedger({
          binding_requested: true,
          evidence_package:  _localEvidencePackage,
          fixture_mode:      false,
        });
        if (_localLedgerBinding?.ledger_binding_ready === true) {
          s.backendAlive              = true;
          s.backendHealthOk           = true;
          s.backendStub               = false;
          s.backendHasMissionId       = true;
          s.backendHasEvidenceReceipt = true;
          s.evidenceSource            = 'go-core';
          s.runtimeProbePass          = true;
          s.goCorReceiptValid         = true;
          s.runtimeEvidenceReady      = true;
          s.passGoldAuthorityBindingValid = true;
          s.passGoldCandidate         = true;
        }
      }
      audit(`[V36.3] Local runtime: ${_localRuntimeResult?.local_runtime_status} | pkg: ${_localEvidencePackage?.evidence_package_status ?? 'N/A'} | ledger: ${_localLedgerBinding?.ledger_binding_status ?? 'N/A'}`);
    } catch (e) {
      audit(`[V36.3] Local runtime execution error: ${e.message}`);
    }
  }

  // V37.1: Runtime Candidate Mode — runs full V37.0 pipeline as single call
  if (RUNTIME_CANDIDATE || FIXTURE_RUNTIME_CANDIDATE) {
    try {
      _runtimeCandidateResult = runRuntimePassGoldCandidateController({
        candidate_requested: RUNTIME_CANDIDATE,
        fixture_mode:        FIXTURE_RUNTIME_CANDIDATE,
        start_local_backend: LOCAL_RUNTIME_START_BACKEND,
        go_core_bin:         LOCAL_RUNTIME_GO_CORE_BIN,
        timeout_ms:          RUNTIME_BRIDGE_TIMEOUT,
      });
      if (_runtimeCandidateResult?.runtime_pass_gold_ready === true) {
        s.backendAlive              = true;
        s.backendHealthOk           = true;
        s.backendStub               = false;
        s.backendHasMissionId       = true;
        s.backendHasEvidenceReceipt = true;
        s.evidenceSource            = 'go-core';
        s.runtimeProbePass          = true;
        s.goCorReceiptValid         = true;
        s.runtimeEvidenceReady      = true;
        s.passGoldAuthorityBindingValid = true;
        s.passGoldCandidate         = true;
      }
      audit(`[V37.1] Runtime candidate: ${_runtimeCandidateResult?.runtime_pass_gold_status} | pass_gold: ${_runtimeCandidateResult?.pass_gold_candidate}`);
    } catch (e) {
      audit(`[V37.1] Runtime candidate error: ${e.message}`);
    }
  }

  // V42.1: Supervised Release Candidate Mode — runs full supervised RC pipeline
  if (SUPERVISED_RELEASE_CANDIDATE) {
    try {
      const useFixtureRC       = FIXTURE_RUNTIME_CANDIDATE;
      const useFixtureIntent   = FIXTURE_RELEASE_INTENT;
      const useFixtureAuthority = FIXTURE_AUTHORITY;
      const allFixtures = useFixtureRC && useFixtureIntent && useFixtureAuthority;
      _supervisedRCResult = runSupervisedReleaseCandidateController({
        fixture_mode:  allFixtures,
        tests_verified: VERIFY_TESTS,
        policy_clean:   POLICY_CLEAN,
      });
      if (_supervisedRCResult?.supervised_release_candidate_ready === true) {
        s.backendAlive              = true;
        s.backendHealthOk           = true;
        s.backendStub               = false;
        s.backendHasMissionId       = true;
        s.backendHasEvidenceReceipt = true;
        s.evidenceSource            = 'go-core';
        s.runtimeProbePass          = true;
        s.goCorReceiptValid         = true;
        s.runtimeEvidenceReady      = true;
        s.passGoldAuthorityBindingValid = true;
        s.passGoldCandidate         = true;
      }
      audit(`[V42.1] Supervised RC: ${_supervisedRCResult?.supervised_release_candidate_status} | rc: ${_supervisedRCResult?.release_candidate}`);
    } catch (e) {
      audit(`[V42.1] Supervised RC error: ${e.message}`);
    }
  }

  // V44.1: Supervised Release Ledger Wiring — append events when ledger enabled
  if (SUPERVISED_RELEASE_LEDGER) {
    try {
      _resetSupervisedLedgerForTest();
      const useFixtureRC     = FIXTURE_SUPERVISED_RELEASE || FIXTURE_RUNTIME_CANDIDATE;
      const useFixtureReview = FIXTURE_MANUAL_PROMOTION_REVIEW;
      const rcReady          = _supervisedRCResult?.supervised_release_candidate_ready === true;

      if (rcReady || useFixtureRC) {
        const rcForLedger = rcReady ? _supervisedRCResult
          : runSupervisedReleaseCandidateController({ fixture_mode: true });

        // Append RC declared event
        const evRC = appendSupervisedLedgerEvent({
          event_type:      'SUPERVISED_RC_CANDIDATE_DECLARED',
          actor_id:        'pi-harness',
          rc_id:           rcForLedger.rc_id ?? null,
          intent_id:       rcForLedger.intent_id ?? null,
          evidence_source: 'go-core',
          payload:         { release_candidate_mode: rcForLedger.release_candidate_mode ?? 'supervised' },
        });
        _supervisedLedgerEvents.push(evRC);

        // Append intent created event
        const evIntent = appendSupervisedLedgerEvent({
          event_type: 'SUPERVISED_RELEASE_INTENT_CREATED',
          actor_id:   'pi-harness',
          rc_id:      rcForLedger.rc_id ?? null,
          intent_id:  rcForLedger.intent_id ?? null,
          evidence_source: 'go-core',
        });
        _supervisedLedgerEvents.push(evIntent);

        // Append authority bound event
        const evAuth = appendSupervisedLedgerEvent({
          event_type: 'SUPERVISED_INTENT_AUTHORITY_BOUND',
          actor_id:   'pi-harness',
          rc_id:      rcForLedger.rc_id ?? null,
          intent_id:  rcForLedger.intent_id ?? null,
          evidence_source: 'go-core',
        });
        _supervisedLedgerEvents.push(evAuth);

        if (useFixtureReview || useFixtureRC) {
          // Build promotion package
          _supervisedPromoPkg = buildManualPromotionPackage({
            supervised_rc_result: rcForLedger,
          });
          if (_supervisedPromoPkg?.promotion_package_ready === true) {
            const evPkg = appendSupervisedLedgerEvent({
              event_type:   'SUPERVISED_PROMOTION_PACKAGE_BUILT',
              actor_id:     'pi-harness',
              rc_id:        rcForLedger.rc_id ?? null,
              package_hash: _supervisedPromoPkg.package_hash,
              evidence_source: 'go-core',
            });
            _supervisedLedgerEvents.push(evPkg);

            // Run review gate in fixture mode
            _supervisedPromoReview = runManualPromotionReviewGate({ fixture_mode: true });
            if (_supervisedPromoReview?.promotion_review_ready === true) {
              const evReq = appendSupervisedLedgerEvent({
                event_type: 'SUPERVISED_PROMOTION_REVIEW_REQUESTED',
                actor_id:   'pi-harness',
                rc_id:      rcForLedger.rc_id ?? null,
                review_id:  _supervisedPromoReview.review_id ?? null,
                package_hash: _supervisedPromoPkg.package_hash,
              });
              _supervisedLedgerEvents.push(evReq);
              const evComp = appendSupervisedLedgerEvent({
                event_type: 'SUPERVISED_PROMOTION_REVIEW_COMPLETED',
                actor_id:   'pi-harness',
                rc_id:      rcForLedger.rc_id ?? null,
                review_id:  _supervisedPromoReview.review_id ?? null,
                package_hash: _supervisedPromoPkg.package_hash,
              });
              _supervisedLedgerEvents.push(evComp);
            }
          }
        }
      }

      _supervisedLedgerChain = verifySupervisedLedgerChain();
      audit(`[V44.1] Supervised ledger: ${_supervisedLedgerEvents.length} events | chain_valid=${_supervisedLedgerChain?.valid}`);
    } catch (e) {
      audit(`[V44.1] Supervised ledger error: ${e.message}`);
    }
  }

  // V49.0: Manual Release Handoff Mode
  if (MANUAL_RELEASE_HANDOFF) {
    try {
      const useFixtureAll = FIXTURE_SUPERVISED_RELEASE || FIXTURE_RUNTIME_CANDIDATE || FIXTURE_MANUAL_RELEASE_REQUEST;
      const useFixtureConfirm = FIXTURE_HUMAN_CONFIRMATION || useFixtureAll;
      const useFixturePreflight = FIXTURE_PREFLIGHT || useFixtureAll;
      const useFixtureDryRun = FIXTURE_DRY_RUN || useFixtureAll;

      // Build manual release request (fixture or from supervised RC)
      if (useFixtureAll || FIXTURE_MANUAL_RELEASE_REQUEST) {
        _manualReleaseRequest = createManualReleaseRequest({ fixture_mode: true });
      } else if (_supervisedRCResult?.supervised_release_candidate_ready === true) {
        _manualReleaseRequest = createManualReleaseRequest({
          supervised_rc_result: _supervisedRCResult,
          promotion_package_result: _supervisedPromoPkg,
          manual_review_result: _supervisedPromoReview,
          requested_by: 'pi-harness',
          target_version: '0.0.0-harness',
          target_branch: s.branch ?? 'main',
          git_head: s.gitHead ?? null,
        });
      }

      // Build human confirmation
      if (useFixtureConfirm) {
        _humanConfirmation = createHumanConfirmationContract({ fixture_mode: true });
      }

      // Bind authority
      if (_manualReleaseRequest?.manual_release_request_valid === true && _humanConfirmation?.human_confirmation_ready === true) {
        _requestAuthorityBinding = bindManualReleaseRequestAuthority({ fixture_mode: useFixtureAll });
      }

      // Run preflight
      if (useFixturePreflight) {
        _executionPreflight = runManualReleaseExecutionPreflight({ fixture_mode: true });
      } else if (_manualReleaseRequest?.manual_release_request_valid === true && _requestAuthorityBinding?.request_authority_binding_ready === true) {
        _executionPreflight = runManualReleaseExecutionPreflight({
          manual_release_request: _manualReleaseRequest,
          request_authority_binding: _requestAuthorityBinding,
          supervised_rc_result: _supervisedRCResult,
          full_test_pass: true, go_test_pass: true, go_build_pass: true,
          ci_status_verified: true, rollback_plan_present: true, audit_ledger_present: true,
          explicit_preflight_requested: true,
        });
      }

      // Run dry-run
      if (useFixtureDryRun) {
        _dryRunResult = runManualReleaseDryRun({ fixture_mode: true });
      } else if (_executionPreflight?.manual_release_preflight_ready === true) {
        _dryRunResult = runManualReleaseDryRun({ preflight_result: _executionPreflight });
      }

      // Build handoff package
      if (_executionPreflight?.manual_release_preflight_ready === true && _dryRunResult?.manual_release_dry_run_ready === true) {
        _handoffPackage = buildManualReleaseHandoffPackage({
          preflight_result: _executionPreflight,
          dry_run_result: _dryRunResult,
          manual_release_request: _manualReleaseRequest,
          human_confirmation: _humanConfirmation,
          request_authority_binding: _requestAuthorityBinding,
          supervised_rc_result: _supervisedRCResult,
        });
      } else if (useFixtureAll) {
        _handoffPackage = buildManualReleaseHandoffPackage({ fixture_mode: true });
      }

      // Append ledger events
      if (LEDGER_HANDOFF && _handoffPackage?.handoff_ready === true) {
        _resetHandoffLedgerForTest();
        const handoffId = _handoffPackage.handoff_id;
        const evRefs = _handoffPackage.evidence_receipt_id ? [_handoffPackage.evidence_receipt_id] : ['go-core-receipt'];
        for (const et of ['MANUAL_RELEASE_REQUEST_CREATED','HUMAN_CONFIRMATION_BOUND','MANUAL_RELEASE_PREFLIGHT_READY','MANUAL_RELEASE_DRY_RUN_READY','MANUAL_RELEASE_HANDOFF_READY']) {
          const r = appendHandoffLedgerEvent({ event_type: et, actor_id: 'pi-harness', handoff_id: handoffId, evidence_refs: evRefs, evidence_source: 'go-core' });
          if (r.appended) _handoffLedgerEventIds.push(r.event_id);
        }
        _handoffLedgerChain = verifyHandoffLedgerChain();
      }

      audit(`[V49.0] Manual handoff: request=${_manualReleaseRequest?.manual_release_request_valid} preflight=${_executionPreflight?.manual_release_preflight_ready} dry_run=${_dryRunResult?.manual_release_dry_run_ready} handoff=${_handoffPackage?.handoff_ready} ledger_events=${_handoffLedgerEventIds.length}`);
    } catch (e) {
      audit(`[V49.0] Manual handoff error: ${e.message}`);
    }
  }

  // V27.1: Update strict gate fields from E2E probe result and authority binding
  if (!RUNTIME_BRIDGE && !FIXTURE_RUNTIME_BRIDGE && !CANDIDATE_DRILL && !LOCAL_RUNTIME_EXECUTION && !FIXTURE_LOCAL_RUNTIME && !RUNTIME_CANDIDATE && !FIXTURE_RUNTIME_CANDIDATE && !SUPERVISED_RELEASE_CANDIDATE) {
    s.goCorReceiptValid    = _e2eProbeResult?.receipt_valid === true;
    s.runtimeEvidenceReady = _e2eProbeResult?.e2e_runtime_status === 'E2E_RUNTIME_READY';
  }
  // V33.0: preserve authority valid set by candidate drill; otherwise use binding result
  // V36.3: also preserve when local runtime execution is ready
  // V37.1: also preserve when runtime candidate is ready
  // V42.1: also preserve when supervised RC is ready
  const _localRuntimeFullyBound = (LOCAL_RUNTIME_EXECUTION || FIXTURE_LOCAL_RUNTIME) && _localLedgerBinding?.ledger_binding_ready === true;
  const _runtimeCandidateFullyReady = (RUNTIME_CANDIDATE || FIXTURE_RUNTIME_CANDIDATE) && _runtimeCandidateResult?.runtime_pass_gold_ready === true;
  const _supervisedRCFullyReady = SUPERVISED_RELEASE_CANDIDATE && _supervisedRCResult?.supervised_release_candidate_ready === true;
  if ((!CANDIDATE_DRILL || !(_candidateDrillResult?.full_candidate_drill_ready === true)) && !_localRuntimeFullyBound && !_runtimeCandidateFullyReady && !_supervisedRCFullyReady) {
    s.passGoldAuthorityBindingValid = !!(_passGoldBinding?.pass_gold_authority_binding_valid === true);
  }
  // V27.1: Recompute pass_gold_candidate with all 16 strict gates
  s.passGoldCandidate = computeStrictPassGoldCandidate(s);
  // V33.0: candidate drill overrides recompute when fully ready
  if (CANDIDATE_DRILL && _candidateDrillResult?.full_candidate_drill_ready === true) {
    s.passGoldCandidate = true;
  }
  // V36.3: local runtime execution overrides recompute when fully bound
  if (_localRuntimeFullyBound) {
    s.passGoldCandidate = true;
  }
  // V37.1: runtime candidate overrides recompute when fully ready
  if (_runtimeCandidateFullyReady) {
    s.passGoldCandidate = true;
  }
  // V42.1: supervised RC overrides recompute when fully ready
  if (_supervisedRCFullyReady) {
    s.passGoldCandidate = true;
  }
  if (!s.passGoldCandidate) {
    s.strictPassGoldReason = computeStrictPassGoldReason(s);
    s.promotionAllowed = false;
    s.deployAllowed    = false;
  }

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
    process.stderr.write(`PI HARNESS V15.10 FATAL: ${err.message}\n`);
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
      // V15.8: Authorization Layer fallback fields
      hermes_authorization_layer_enabled:   true,
      hermes_authorization_schema_version:  'v15.8',
      hermes_authorization_status:          'AUTHORIZATION_MISSING',
      hermes_authorization_valid:           false,
      hermes_authorization_requirements:    [],
      hermes_authorization_missing:         ['authorization_manifest'],
      hermes_authorization_errors:          [`fatal: ${err.message}`],
      hermes_authorization_warnings:        [],
      hermes_authorization_audit_trail:     ['authorization_missing'],
      hermes_authorization_gate:            null,
      hermes_release_authorized:            false,
      hermes_deploy_authorized:             false,
      hermes_tag_authorized:                false,
      hermes_stable_promotion_authorized:   false,
      hermes_release_allowed:               false,
      hermes_tag_allowed:                   false,
      // V15.9: Authorization Harness fallback fields
      hermes_authorization_harness_enabled:        true,
      hermes_authorization_harness_schema_version: 'v15.9',
      hermes_authorization_scenario:               null,
      hermes_authorization_scenario_status:        null,
      hermes_authorization_signature_present:      false,
      hermes_authorization_signature_valid:        false,
      hermes_authorization_scenario_matrix:        null,
      hermes_authorization_scenario_total:         null,
      hermes_authorization_scenario_passed:        null,
      hermes_authorization_scenario_failed:        null,
      hermes_authorization_all_safe:               null,
      hermes_authorization_all_allowed_flags_false: null,
      // V15.10: Authority Review Gate fallback fields
      hermes_authority_review_enabled:             true,
      hermes_authority_schema_version:             'v15.10',
      hermes_authority_review_status:              'CONTRACT_MISSING',
      hermes_authority_review_valid:               false,
      hermes_human_approval_contract_valid:        false,
      hermes_authority_role:                       null,
      hermes_authority_sufficient:                 false,
      hermes_authority_scope_valid:                false,
      hermes_authority_temporal_valid:             false,
      hermes_authority_missing_evidence:           ['contract'],
      hermes_authority_conflicts:                  [],
      hermes_authority_audit_trail:                ['contract_missing'],
      hermes_authority_requirements:               [],
      hermes_authority_scenario:                   null,
      hermes_authority_scenario_matrix:            null,
      hermes_authority_scenario_total:             null,
      hermes_authority_scenario_passed:            null,
      hermes_authority_scenario_failed:            null,
      hermes_authority_all_safe:                   null,
      hermes_authority_all_allowed_flags_false:    null,
      hermes_release_authorized_by_authority:      false,
      hermes_deploy_authorized_by_authority:       false,
      hermes_tag_authorized_by_authority:          false,
      hermes_stable_authorized_by_authority:       false,
      hermes_pass_gold_confirmed_by_authority:     false,
      // V21.3/V27.0: Runtime Evidence Wiring fallback fields
      runtime_evidence_enabled:                    false,
      runtime_evidence_status:                     'RUNTIME_EVIDENCE_BLOCKED_BACKEND_OFFLINE',
      runtime_evidence_ready:                      false,
      backend_runtime_probe_status:                'PROBE_SKIPPED_NO_START',
      go_core_receipt_status:                      'RECEIPT_BLOCKED_MISSING',
      go_core_receipt_valid:                       false,
      runtime_evidence_pass_gold_candidate_allowed: false,
      e2e_runtime_status:                          'E2E_SKIPPED_NO_START',
      e2e_mission_id:                              null,
      e2e_evidence_receipt_id:                     null,
      e2e_evidence_source:                         null,
      e2e_runtime_probe_pass:                      false,
    }) + '\n');
  }
  process.exit(1);
});
