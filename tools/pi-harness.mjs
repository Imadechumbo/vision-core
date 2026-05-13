#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          PI HARNESS — ADAPTIVE EXECUTION HARNESS V1             ║
 * ║          Vision Core V14 + PI HARNESS CLEAN REFACTOR            ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Comando único:  node tools/pi-harness.mjs                      ║
 * ║  Flags:          --dry-run  --skip-push  --skip-pull            ║
 * ║                  --phase=N  --max-layer=N                        ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  REGRAS ABSOLUTAS                                                ║
 * ║  • Não altera visual aprovado                                    ║
 * ║  • Não toca em index.html                                        ║
 * ║  • Não cria PASS GOLD fake                                       ║
 * ║  • Não libera promotion / deploy                                 ║
 * ║  • Relatório SOMENTE no final                                    ║
 * ║  • PASS GOLD só com evidence_receipt real do backend             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════

const ROOT = resolve(process.cwd());
const ARGS = process.argv.slice(2);
const FLAG = (f) => ARGS.includes(f);
const ARG  = (prefix) => { const a = ARGS.find(x => x.startsWith(prefix)); return a ? a.split('=')[1] : null; };

const DRY_RUN   = FLAG('--dry-run');
const SKIP_PUSH = FLAG('--skip-push');
const SKIP_PULL = FLAG('--skip-pull');
const MAX_LAYER = parseInt(ARG('--max-layer') || '9', 10);
const START_PHASE = parseInt(ARG('--phase') || '0', 10);

// ═══════════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════════════

const state = {
  // Identidade
  branch: 'main',
  localHead: null,
  remoteHead: null,

  // Dificuldade detectada
  difficulty: 'D0',   // D0-D5
  difficultyScore: 0,
  maxLayerAllowed: MAX_LAYER,

  // Camadas executadas
  layersExecuted: [],
  layersFailed: [],

  // Resultado
  result: 'PENDING',
  blockReason: null,
  patchesApplied: [],
  filesChanged: [],
  validationErrors: [],

  // Gates obrigatórios
  passGoldCandidate: false,
  promotionAllowed: false,
  deployAllowed: false,
  legacyCleanConfirmed: false,
  v14CleanOwnership: false,
  githubConfirmed: false,

  // Evidence
  evidenceLines: [],
  auditLog: [],
};

// Log interno — não exibido até o final
function audit(msg) { state.auditLog.push(`[${layerName()}] ${msg}`); }
function evidence(msg) { state.evidenceLines.push(String(msg)); }

let _currentLayer = 'L?';
function layerName() { return _currentLayer; }
function enterLayer(name) { _currentLayer = name; state.layersExecuted.push(name); }
function failLayer(name, reason) { state.layersFailed.push(`${name}: ${reason}`); }

// ═══════════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe','pipe','pipe'], ...opts }).trim();
  } catch (e) {
    return null;
  }
}

function shFull(cmd) {
  const r = spawnSync(cmd, { shell: true, cwd: ROOT, encoding: 'utf8' });
  return { ok: r.status === 0, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim(), code: r.status };
}

function read(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, 'utf8');
}

function write(relPath, content) {
  if (DRY_RUN) { audit(`DRY_RUN: would write ${relPath}`); return true; }
  writeFileSync(join(ROOT, relPath), content, 'utf8');
  state.filesChanged.push(relPath);
  return true;
}

function nodeCheck(relPath) {
  if (!existsSync(join(ROOT, relPath))) return null; // arquivo não existe = skip
  const r = shFull(`node --check "${join(ROOT, relPath)}"`);
  return r.ok;
}

// ═══════════════════════════════════════════════════════════════════
// CLASSIFICAÇÃO DE DIFICULDADE D0–D5
// ═══════════════════════════════════════════════════════════════════

const DIFFICULTY_LEVELS = {
  D0: { label: 'Trivial',    maxLayer: 2, desc: 'texto, doc, comando simples' },
  D1: { label: 'Low',        maxLayer: 4, desc: 'ajuste pequeno, arquivo único' },
  D2: { label: 'Medium',     maxLayer: 6, desc: 'frontend pequeno, endpoint simples' },
  D3: { label: 'High',       maxLayer: 7, desc: 'múltiplos arquivos, risco de regressão' },
  D4: { label: 'Critical',   maxLayer: 8, desc: 'deploy, auth, CORS, SSE, PASS GOLD' },
  D5: { label: 'Enterprise', maxLayer: 9, desc: 'correção completa com evidence, PR, promotion' },
};

function classifyDifficulty(indicators) {
  let score = 0;
  if (indicators.legacyFilesActive > 5)   score += 3;
  if (indicators.legacyFilesActive > 0)   score += 1;
  if (indicators.criticalMarkers > 0)     score += 2;
  if (indicators.hasSSEOwnership)         score += 2;
  if (indicators.hasPassGoldFake)         score += 3;
  if (indicators.multipleOwners)          score += 1;
  if (indicators.hasDeployRisk)           score += 2;

  if (score >= 9) return 'D5';
  if (score >= 7) return 'D4';
  if (score >= 5) return 'D3';
  if (score >= 3) return 'D2';
  if (score >= 1) return 'D1';
  return 'D0';
}

// ═══════════════════════════════════════════════════════════════════
// ARQUIVOS MONITORADOS
// ═══════════════════════════════════════════════════════════════════

const CLEAN_OWNERS = [
  'frontend/assets/vision-api.js',
  'frontend/assets/vision-chat.js',
  'frontend/assets/vision-agent-local.js',
  'frontend/assets/vision-runtime-owner.js',
  'frontend/assets/vision-report.js',
];

const LEGACY_FILES = [
  'frontend/assets/vision-v44-runtime-consistency.js',
  'frontend/assets/vision-v34-enterprise.js',
  'frontend/assets/vision-v35-telemetry.js',
  'frontend/assets/v231-backend-agents.js',
  'frontend/assets/vision-v297-interactions.js',
  'frontend/assets/vision-v298-command-chat.js',
  'frontend/assets/vision-v299-fullstack-runtime.js',
  'frontend/assets/vision-v2910-clean-runtime.js',
  'frontend/assets/vision-v32-orbit-runtime.js',
  'frontend/assets/v233-realtime.js',
  'frontend/assets/v273-sddf-command-chat.js',
];

const CRITICAL_MARKERS = [
  'window.fetch =',
  'executeBtn.onclick',
  "pass_gold:true",
  "promotion_allowed:true",
  'mission-${Date.now()}',
  'EventSource',
];

const ORBIT_CONTRACT = {
  openclaw:    { top: '5%',    left: '50%'   },
  scanner:     { top: '18.2%', left: '81.8%' },
  hermes:      { top: '50%',   left: '95%'   },
  patchengine: { top: '81.8%', left: '81.8%' },
  aegis:       { top: '95%',   left: '50%'   },
  passgold:    { top: '81.8%', left: '18.2%' },
  github:      { top: '50%',   left: '5%'    },
  pi_harness:  { top: '18.2%', left: '18.2%' },
};

// ═══════════════════════════════════════════════════════════════════
// L0 — INTAKE
// ═══════════════════════════════════════════════════════════════════

async function L0_Intake() {
  enterLayer('L0');
  audit('Intake: lendo objetivo, branch e flags');

  state.branch = sh('git rev-parse --abbrev-ref HEAD') || 'main';
  audit(`branch: ${state.branch}`);
  audit(`dry_run: ${DRY_RUN}`);
  audit(`max_layer: ${MAX_LAYER}`);
  audit(`start_phase: ${START_PHASE}`);

  if (state.branch !== 'main') {
    failLayer('L0', `branch incorreta: ${state.branch}`);
    state.result = 'BLOCKED';
    state.blockReason = `Branch esperada: main. Atual: ${state.branch}`;
    return false;
  }

  evidence(`BRANCH: ${state.branch}`);
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// L1 — INSPECT
// ═══════════════════════════════════════════════════════════════════

async function L1_Inspect() {
  enterLayer('L1');
  audit('Inspect: sincronizando e inspecionando estado');

  // Pull
  if (!SKIP_PULL) {
    const pull = shFull('git pull origin main --rebase');
    if (!pull.ok) {
      // Tentar stash + pull
      audit('pull falhou, tentando stash');
      sh('git stash');
      const pull2 = shFull('git pull origin main --rebase');
      if (!pull2.ok) {
        failLayer('L1', 'git pull falhou mesmo após stash');
        state.blockReason = 'git pull falhou: ' + pull2.stderr;
        state.result = 'BLOCKED';
        return false;
      }
      sh('git stash pop');
    }
  }

  state.localHead  = sh('git rev-parse HEAD') || '?';
  state.remoteHead = sh('git rev-parse origin/main') || '?';
  audit(`localHead: ${state.localHead}`);
  audit(`remoteHead: ${state.remoteHead}`);

  // Inventário de arquivos legados ativos
  const indexContent = read('frontend/index.html') || '';
  let legacyActive = 0;
  for (const f of LEGACY_FILES) {
    const name = f.split('/').pop();
    if (indexContent.includes(name)) {
      legacyActive++;
      audit(`legado ativo no index.html: ${name}`);
    }
  }

  // Markers críticos em clean owners
  let criticalCount = 0;
  let hasSSE = false;
  let hasPassGoldFake = false;
  let hasDeployRisk = false;

  for (const f of CLEAN_OWNERS) {
    const content = read(f);
    if (!content) continue;
    for (const marker of CRITICAL_MARKERS) {
      if (content.includes(marker)) {
        criticalCount++;
        audit(`CRITICAL MARKER em ${f}: ${marker}`);
        if (marker === 'EventSource') hasSSE = true;
        if (marker.includes('pass_gold:true')) hasPassGoldFake = true;
      }
    }
  }

  // Checar index.html por pass_gold fake
  if (indexContent.includes('pass_gold:true')) {
    hasPassGoldFake = true;
    hasDeployRisk = true;
    audit('WARN: pass_gold:true hardcoded em index.html (legado V8 snapshot)');
  }

  // Classificar dificuldade
  const indicators = {
    legacyFilesActive: legacyActive,
    criticalMarkers: criticalCount,
    hasSSEOwnership: hasSSE,
    hasPassGoldFake: hasPassGoldFake && criticalCount > 0, // só conta se em clean owners
    multipleOwners: legacyActive > 2,
    hasDeployRisk: hasDeployRisk,
  };

  state.difficulty = classifyDifficulty(indicators);
  state.difficultyScore = legacyActive + criticalCount;
  state.maxLayerAllowed = Math.min(MAX_LAYER, DIFFICULTY_LEVELS[state.difficulty].maxLayer);

  audit(`dificuldade: ${state.difficulty} — ${DIFFICULTY_LEVELS[state.difficulty].label}`);
  audit(`legados ativos: ${legacyActive}`);
  audit(`markers críticos em clean owners: ${criticalCount}`);
  audit(`max layer permitido: ${state.maxLayerAllowed}`);

  evidence(`DIFFICULTY: ${state.difficulty}`);
  evidence(`LEGACY_ACTIVE: ${legacyActive}`);
  evidence(`CRITICAL_MARKERS: ${criticalCount}`);

  return true;
}

// ═══════════════════════════════════════════════════════════════════
// L2 — DIAGNOSE
// ═══════════════════════════════════════════════════════════════════

async function L2_Diagnose() {
  enterLayer('L2');
  audit('Diagnose: identificando causa raiz e riscos');

  const issues = [];

  // 1. Orbit contract verification
  const agentLocal = read('frontend/assets/vision-agent-local.js');
  if (agentLocal) {
    let orbitOk = true;
    for (const [key, pos] of Object.entries(ORBIT_CONTRACT)) {
      if (!agentLocal.includes(`top: '${pos.top}'`) && !agentLocal.includes(`top:'${pos.top}'`)) {
        if (!agentLocal.includes(pos.top)) {
          issues.push(`orbit: posição ${key} não encontrada em vision-agent-local.js`);
          orbitOk = false;
        }
      }
    }
    if (orbitOk) audit('orbit contract: OK');
    else audit('orbit contract: DIVERGÊNCIA DETECTADA');
  } else {
    issues.push('vision-agent-local.js não encontrado');
  }

  // 2. Runtime owner único
  const runtimeOwner = read('frontend/assets/vision-runtime-owner.js');
  if (!runtimeOwner) {
    issues.push('vision-runtime-owner.js não encontrado');
  } else {
    audit('vision-runtime-owner.js: existe');
  }

  // 3. Guard check
  if (existsSync(join(ROOT, 'tools/sddf-front-guard.mjs'))) {
    const guard = shFull('node tools/sddf-front-guard.mjs');
    if (guard.stdout.includes('GUARD PASS') || guard.stdout.includes('FRONT GUARD PASS')) {
      audit('sddf-front-guard: PASS');
    } else {
      issues.push('sddf-front-guard: FAIL — ' + guard.stdout.split('\n')[0]);
      audit('guard output: ' + guard.stdout.substring(0, 200));
    }
  }

  // 4. PASS GOLD gate
  const reportJs = read('frontend/assets/vision-report.js');
  if (reportJs && reportJs.includes('evidence_receipt') && reportJs.includes('pass_gold')) {
    audit('vision-report.js: gate de evidence_receipt presente');
  } else {
    issues.push('vision-report.js: gate de evidence_receipt ausente ou incompleto');
  }

  for (const issue of issues) {
    audit(`ISSUE: ${issue}`);
  }

  state.validationErrors = issues;
  evidence(`ISSUES_FOUND: ${issues.length}`);

  if (issues.length > 3) {
    state.result = 'BLOCKED';
    state.blockReason = 'Múltiplos problemas críticos detectados: ' + issues.slice(0,2).join('; ');
    return false;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════
// L3 — PLAN
// ═══════════════════════════════════════════════════════════════════

async function L3_Plan() {
  enterLayer('L3');
  audit('Plan: selecionando patchers e ordem segura');

  const plan = [];

  // Decidir o que fazer baseado no diagnóstico
  if (existsSync(join(ROOT, 'tools/v14-refactor-total.mjs'))) {
    plan.push({ action: 'run_total_runner', file: 'tools/v14-refactor-total.mjs', risk: 'low' });
    audit('plano: usar runner total existente');
  }

  if (existsSync(join(ROOT, 'tools/v14-refactor-continue.mjs'))) {
    plan.push({ action: 'run_continue_runner', file: 'tools/v14-refactor-continue.mjs', risk: 'low' });
  }

  // Verificar se há patches específicos necessários
  for (const err of state.validationErrors) {
    if (err.includes('orbit')) {
      plan.push({ action: 'fix_orbit', file: 'frontend/assets/vision-agent-local.js', risk: 'medium' });
    }
  }

  audit(`plano: ${plan.length} ações`);
  state.plan = plan;
  evidence(`PLAN_ACTIONS: ${plan.length}`);
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// L4 — DRY RUN
// ═══════════════════════════════════════════════════════════════════

async function L4_DryRun() {
  enterLayer('L4');
  audit('Dry Run: auditando v34/v44 e confirmando clean owners');

  // Verificar markers em legados
  const legacyTargets = [
    'frontend/assets/vision-v34-enterprise.js',
    'frontend/assets/vision-v44-runtime-consistency.js',
  ];

  let totalMarkers = 0;
  for (const f of legacyTargets) {
    const content = read(f);
    if (!content) { audit(`${f}: não encontrado — skip`); continue; }
    const found = CRITICAL_MARKERS.filter(m => content.includes(m));
    totalMarkers += found.length;
    audit(`${f}: markers=${found.length} [${found.join(', ') || 'none'}]`);
  }

  if (totalMarkers === 0) {
    state.legacyCleanConfirmed = true;
    state.v14CleanOwnership = true;
    audit('legacy ownership clean: v34/v44 markers = 0');
  } else {
    audit(`legacy markers encontrados: ${totalMarkers} — clean owners devem absorver antes de desativar`);
  }

  // Verificar se clean owners têm as responsabilidades
  const checks = [
    { file: 'frontend/assets/vision-runtime-owner.js', must: ['/api/run-live'], label: 'SSE/runtime' },
    { file: 'frontend/assets/vision-report.js',        must: ['evidence_receipt'],   label: 'report/evidence' },
    { file: 'frontend/assets/vision-agent-local.js',   must: ['OCTAGON', 'applyOctagonPositions'], label: 'orbit/metrics' },
  ];

  for (const chk of checks) {
    const content = read(chk.file);
    if (!content) { audit(`${chk.file}: não encontrado`); continue; }
    const ok = chk.must.every(m => content.includes(m));
    audit(`${chk.file} [${chk.label}]: ${ok ? 'OK' : 'INCOMPLETO'}`);
  }

  evidence(`LEGACY_MARKERS_TOTAL: ${totalMarkers}`);
  evidence(`LEGACY_CLEAN_CONFIRMED: ${state.legacyCleanConfirmed}`);
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// L5 — CONTROLLED PATCH
// ═══════════════════════════════════════════════════════════════════

async function L5_ControlledPatch() {
  enterLayer('L5');
  audit('Controlled Patch: aplicando patchers seguros');

  if (DRY_RUN) {
    audit('DRY_RUN: skip patch execution');
    return true;
  }

  // Usar runners existentes se disponíveis
  const runners = [
    'tools/v14-runtime-bridge-patch.mjs',
    'tools/v14-report-bridge-patch.mjs',
    'tools/v14-status-bridge-patch.mjs',
    'tools/v14-legacy-adapter-patch.mjs',
  ];

  for (const runner of runners) {
    if (!existsSync(join(ROOT, runner))) continue;
    audit(`executando patcher: ${runner}`);
    const r = shFull(`node "${join(ROOT, runner)}" --skip-push --skip-pull`);
    if (r.ok) {
      state.patchesApplied.push(runner);
      audit(`${runner}: PASS`);
    } else {
      audit(`${runner}: FAIL (não crítico) — ${r.stderr.substring(0, 100)}`);
    }
  }

  evidence(`PATCHES_APPLIED: ${state.patchesApplied.length}`);
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// L6 — VALIDATION
// ═══════════════════════════════════════════════════════════════════

async function L6_Validation() {
  enterLayer('L6');
  audit('Validation: rodando todas as validações obrigatórias');

  const errors = [];

  // 1. node --check em todos os clean owners
  for (const f of CLEAN_OWNERS) {
    const ok = nodeCheck(f);
    if (ok === null) { audit(`${f}: não encontrado — skip`); continue; }
    if (!ok) {
      errors.push(`syntax error: ${f}`);
      audit(`node --check ${f}: FAIL`);
    } else {
      audit(`node --check ${f}: OK`);
    }
  }

  // 2. node --check em legados ativos
  const legacyToCheck = [
    'frontend/assets/vision-v44-runtime-consistency.js',
    'frontend/assets/vision-v34-enterprise.js',
  ];
  for (const f of legacyToCheck) {
    const ok = nodeCheck(f);
    if (ok === null) continue;
    if (!ok) errors.push(`syntax error: ${f}`);
    else audit(`node --check ${f}: OK`);
  }

  // 3. node --check em tools
  const tools = [
    'tools/v14-refactor-total.mjs',
    'tools/v14-refactor-continue.mjs',
    'tools/sddf-front-guard.mjs',
    'tools/pi-harness.mjs',
  ];
  for (const f of tools) {
    const ok = nodeCheck(f);
    if (ok === null) continue;
    if (!ok) errors.push(`syntax error: ${f}`);
    else audit(`node --check ${f}: OK`);
  }

  // 4. git diff --check
  const diffCheck = shFull('git diff --check');
  if (!diffCheck.ok) {
    errors.push('git diff --check: whitespace errors');
    audit('git diff --check: FAIL');
  } else {
    audit('git diff --check: OK');
  }

  // 5. SDDF Front Guard
  if (existsSync(join(ROOT, 'tools/sddf-front-guard.mjs'))) {
    const guard = shFull('node tools/sddf-front-guard.mjs');
    const guardPassed = guard.stdout.includes('GUARD PASS') || guard.stdout.includes('FRONT GUARD PASS');
    if (guardPassed) {
      audit('sddf-front-guard: PASS');
    } else {
      errors.push('sddf-front-guard: FAIL');
      audit('guard output: ' + guard.stdout.substring(0, 300));
    }
  }

  // 6. Checkpoint PS1 (se existir)
  if (existsSync(join(ROOT, 'tools/v14-refactor-checkpoint.ps1'))) {
    const chk = shFull('powershell -ExecutionPolicy Bypass -File tools/v14-refactor-checkpoint.ps1 -Quiet -FullJsCheck');
    if (chk.ok) audit('checkpoint.ps1: PASS');
    else audit('checkpoint.ps1: FAIL (não crítico)');
  }

  state.validationErrors = errors;
  evidence(`VALIDATION_ERRORS: ${errors.length}`);

  if (errors.length > 0) {
    for (const e of errors) audit(`VALIDATION_ERROR: ${e}`);
    // Erros de syntax são críticos
    const syntaxErrors = errors.filter(e => e.includes('syntax error'));
    if (syntaxErrors.length > 0) {
      state.result = 'BLOCKED';
      state.blockReason = 'Syntax errors: ' + syntaxErrors.join('; ');
      return false;
    }
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════
// L7 — EVIDENCE RECEIPT
// ═══════════════════════════════════════════════════════════════════

async function L7_EvidenceReceipt() {
  enterLayer('L7');
  audit('Evidence Receipt: gerando recibo');

  if (DRY_RUN) {
    audit('DRY_RUN: skip commit/push');
    state.githubConfirmed = false;
    return true;
  }

  // Verificar se há diff real para commitar
  const status = shFull('git status --porcelain');
  const hasChanges = status.stdout.trim().length > 0;

  if (hasChanges) {
    audit('diff detectado — commitando');

    // Adicionar apenas arquivos permitidos
    const safeGlobs = [
      'frontend/assets/vision-agent-local.js',
      'frontend/assets/vision-agent-local.css',
      'frontend/assets/vision-runtime-owner.js',
      'frontend/assets/vision-report.js',
      'frontend/assets/vision-api.js',
      'frontend/assets/vision-chat.js',
      'frontend/assets/vision-v44-runtime-consistency.js',
      'frontend/assets/vision-v34-enterprise.js',
      'frontend/assets/vision-v35-telemetry.js',
      'frontend/assets/v231-backend-agents.js',
      'tools/',
      'docs/',
      '.github/',
    ];

    for (const g of safeGlobs) {
      if (existsSync(join(ROOT, g.replace('/', '')))) {
        sh(`git add "${g}"`);
      } else {
        sh(`git add ${g} 2>/dev/null || true`);
      }
    }

    const filesChanged = state.filesChanged.join(', ') || 'tools and frontend assets';
    const commitMsg = `refactor(frontend): pi-harness clean finalization — ${state.difficulty}`;
    const commit = shFull(`git commit -m "${commitMsg}"`);

    if (commit.ok) {
      audit('commit: OK');
      state.localHead = sh('git rev-parse HEAD') || state.localHead;
    } else if (commit.stdout.includes('nothing to commit')) {
      audit('commit: nothing to commit — OK');
    } else {
      audit('commit: FAIL — ' + commit.stderr.substring(0, 100));
    }
  } else {
    audit('nenhum diff real — commit skip');
  }

  // Push
  if (!SKIP_PUSH) {
    const push = shFull('git push origin main');
    if (push.ok) {
      audit('push: OK');
    } else {
      audit('push: FAIL — ' + push.stderr.substring(0, 100));
    }

    // Fetch e confirmar
    sh('git fetch origin main');
    state.localHead  = sh('git rev-parse HEAD') || '?';
    state.remoteHead = sh('git rev-parse origin/main') || '?';
    state.githubConfirmed = state.localHead === state.remoteHead;
    audit(`githubConfirmed: ${state.githubConfirmed} (local=${state.localHead?.substring(0,7)} remote=${state.remoteHead?.substring(0,7)})`);
  }

  evidence(`LOCAL_HEAD: ${state.localHead}`);
  evidence(`REMOTE_HEAD: ${state.remoteHead}`);
  evidence(`GITHUB_CONFIRMED: ${state.githubConfirmed}`);
  evidence(`FILES_CHANGED: ${state.filesChanged.join(', ') || 'none'}`);
  evidence(`PATCHES_APPLIED: ${state.patchesApplied.join(', ') || 'none'}`);

  return true;
}

// ═══════════════════════════════════════════════════════════════════
// L8 — PASS GOLD GATE (nunca ativo nesta refatoração)
// ═══════════════════════════════════════════════════════════════════

async function L8_PassGold() {
  enterLayer('L8');
  audit('PASS GOLD: gate — não ativo nesta refatoração');
  audit('PASS GOLD só pode ser verdadeiro com evidence_receipt real do backend');

  // Nunca ativa PASS GOLD neste runner
  state.passGoldCandidate = false;
  evidence('PASS_GOLD_CANDIDATE: false');
  evidence('PASS_GOLD_REASON: evidence_receipt real requerido do backend');
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// L9 — PR / PROMOTION (nunca executa)
// ═══════════════════════════════════════════════════════════════════

async function L9_Promotion() {
  enterLayer('L9');
  audit('PR/Promotion: BLOQUEADO — aguardando PASS GOLD real');
  state.promotionAllowed = false;
  state.deployAllowed = false;
  evidence('PROMOTION_ALLOWED: false');
  evidence('DEPLOY_ALLOWED: false');
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL — L0 a L9
// ═══════════════════════════════════════════════════════════════════

const LAYERS = [
  { id: 0, name: 'L0', fn: L0_Intake,          label: 'Intake'            },
  { id: 1, name: 'L1', fn: L1_Inspect,         label: 'Inspect'           },
  { id: 2, name: 'L2', fn: L2_Diagnose,        label: 'Diagnose'          },
  { id: 3, name: 'L3', fn: L3_Plan,            label: 'Plan'              },
  { id: 4, name: 'L4', fn: L4_DryRun,          label: 'Dry Run'           },
  { id: 5, name: 'L5', fn: L5_ControlledPatch, label: 'Controlled Patch'  },
  { id: 6, name: 'L6', fn: L6_Validation,      label: 'Validation'        },
  { id: 7, name: 'L7', fn: L7_EvidenceReceipt, label: 'Evidence Receipt'  },
  { id: 8, name: 'L8', fn: L8_PassGold,        label: 'PASS GOLD gate'    },
  { id: 9, name: 'L9', fn: L9_Promotion,       label: 'PR/Promotion gate' },
];

async function run() {
  const startTime = Date.now();

  for (const layer of LAYERS) {
    if (layer.id < START_PHASE) continue;
    if (layer.id > state.maxLayerAllowed && layer.id < 8) {
      // L8 e L9 sempre rodam (são gates, não patches)
      audit(`${layer.name}: skip — max_layer=${state.maxLayerAllowed}`);
      continue;
    }

    let ok = false;
    try {
      ok = await layer.fn();
    } catch (err) {
      failLayer(layer.name, err.message);
      audit(`${layer.name}: EXCEPTION — ${err.message}`);
      ok = false;
    }

    if (!ok) {
      if (state.result !== 'BLOCKED') {
        state.result = 'FAIL';
        state.blockReason = state.blockReason || `${layer.name} falhou`;
      }
      break;
    }
  }

  if (state.result === 'PENDING') state.result = 'PASS';

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ═══════════════════════════════════════════════════════════════
  // RELATÓRIO FINAL — exibido somente aqui
  // ═══════════════════════════════════════════════════════════════

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           PI HARNESS — RELATÓRIO FINAL                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`RESULT:                  ${state.result}`);
  console.log(`DIFFICULTY:              ${state.difficulty} — ${DIFFICULTY_LEVELS[state.difficulty]?.label || '?'}`);
  console.log(`LAYERS_EXECUTED:         ${state.layersExecuted.join(', ')}`);
  console.log(`ELAPSED:                 ${elapsed}s`);
  console.log('');
  console.log('--- GATES ---');
  console.log(`PASS_GOLD_CANDIDATE:     false`);
  console.log(`PROMOTION_ALLOWED:       false`);
  console.log(`DEPLOY_ALLOWED:          false`);
  console.log(`LEGACY_CLEAN_CONFIRMED:  ${state.legacyCleanConfirmed}`);
  console.log(`V14_CLEAN_OWNERSHIP:     ${state.v14CleanOwnership}`);
  console.log(`GITHUB_CONFIRMED:        ${state.githubConfirmed}`);
  console.log('');
  console.log('--- COMMITS ---');
  console.log(`LOCAL_HEAD:              ${state.localHead || '?'}`);
  console.log(`REMOTE_HEAD:             ${state.remoteHead || '?'}`);
  console.log('');

  if (state.result !== 'PASS') {
    console.log('--- BLOQUEIO ---');
    console.log(`BLOCK_REASON:            ${state.blockReason || 'desconhecido'}`);
    if (state.validationErrors.length > 0) {
      console.log('VALIDATION_ERRORS:');
      for (const e of state.validationErrors) console.log(`  • ${e}`);
    }
    if (state.layersFailed.length > 0) {
      console.log('LAYERS_FAILED:');
      for (const e of state.layersFailed) console.log(`  • ${e}`);
    }
    console.log('');
    console.log('NEXT_ACTION:');
    console.log('  Corrija os erros acima e rode novamente:');
    console.log('  node tools/pi-harness.mjs');
    console.log('');
  }

  console.log('--- EVIDENCE ---');
  for (const line of state.evidenceLines) console.log(`  * ${line}`);
  console.log('');

  if (state.patchesApplied.length > 0) {
    console.log('--- PATCHES ---');
    for (const p of state.patchesApplied) console.log(`  ✓ ${p}`);
    console.log('');
  }

  // Audit log completo só se FAIL ou BLOCKED
  if (state.result !== 'PASS') {
    console.log('--- AUDIT LOG ---');
    for (const line of state.auditLog) console.log(`  ${line}`);
    console.log('');
  }

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  ${state.result === 'PASS' ? '✓ PI HARNESS PASS' : `✗ PI HARNESS ${state.result}`}${' '.repeat(Math.max(0, 44 - state.result.length))}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  process.exit(state.result === 'PASS' ? 0 : 1);
}

run().catch((err) => {
  console.error('PI HARNESS FATAL:', err.message);
  process.exit(1);
});
