'use strict';

/**
 * VISION CORE v1.8 — Benchmark Engine
 *
 * Executa casos de benchmark gerados a partir de feedback da comunidade
 * através do mesmo pipeline do VISION CORE (OpenClaw → Scanner → Hermes → Aegis → Validator → PASS GOLD).
 *
 * Regras:
 *   - Dry-run por padrão — nunca aplica patches sem permissão explícita
 *   - Nunca bypassa Aegis
 *   - Nunca promove sem PASS GOLD
 *   - Nunca escreve em Hermes Memory sem mission real reproduced + PASS GOLD
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const DATA_DIR      = path.resolve(__dirname, '../../data');
const BENCHES_F     = path.join(DATA_DIR, 'community-benchmarks.json');
const RUNS_F        = path.join(DATA_DIR, 'benchmark-runs.json');
const LEADERBOARD_F = path.join(DATA_DIR, 'benchmark-leaderboard.json');
const MAX_RUNS      = 500;

// ── Helpers de I/O ────────────────────────────────────────────────────────
function ensureDir() { fs.mkdirSync(DATA_DIR, { recursive: true }); }

function loadBenchmarks() {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(BENCHES_F, 'utf-8')); }
  catch { return []; }
}

function loadRuns() {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(RUNS_F, 'utf-8')); }
  catch { return []; }
}

function saveRuns(runs) {
  ensureDir();
  if (runs.length > MAX_RUNS) runs.splice(MAX_RUNS);
  fs.writeFileSync(RUNS_F, JSON.stringify(runs, null, 2), 'utf-8');
}

function loadLeaderboard() {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(LEADERBOARD_F, 'utf-8')); }
  catch { return []; }
}

function saveLeaderboard(lb) {
  ensureDir();
  fs.writeFileSync(LEADERBOARD_F, JSON.stringify(lb, null, 2), 'utf-8');
}

// ── Scoring de resultado vs expectativa ──────────────────────────────────
function evaluateBenchmarkResult(benchCase, missionResult) {
  let score = 0;
  const notes = [];

  const actualStatus = missionResult?.status || 'failed';
  const gold         = missionResult?.gold;
  const rca          = missionResult?.rca;
  const scanResult   = missionResult?.scanResult;
  const aegis        = missionResult?.aegis;
  const metrics      = missionResult?.harness_metrics;

  // +40 status match
  const statusMap = { success: 'PASS_GOLD', dry_run: 'PASS_GOLD' };
  const mappedActual = statusMap[actualStatus] || actualStatus;
  const statusHit = mappedActual === benchCase.expectedStatus || actualStatus === benchCase.expectedStatus;
  if (statusHit) { score += 40; notes.push('+40 status match'); }

  // +20 target hit
  const expectedTargets = benchCase.expectedTargets || [];
  const foundTargets    = missionResult?.missionPlan?.approvedTargets || [];
  const approxTargets   = scanResult?.file ? [scanResult.file] : [];
  const allFound        = [...foundTargets, ...approxTargets];
  const targetHit = expectedTargets.length === 0 ||
    expectedTargets.some(t => allFound.some(f => f.includes(t) || t.includes(f)));
  if (targetHit && expectedTargets.length > 0) { score += 20; notes.push('+20 target hit'); }

  // +15 root cause match (semântico simples)
  const expectedCause = (benchCase.expectedRootCause || '').toLowerCase();
  const actualCause   = (rca?.cause || '').toLowerCase();
  const rootCauseHit  = expectedCause && actualCause &&
    (actualCause.includes(expectedCause.slice(0, 20)) || expectedCause.includes(actualCause.slice(0, 20)));
  if (rootCauseHit) { score += 15; notes.push('+15 root cause match'); }

  // +15 PASS GOLD quando esperado
  const passGold = !!(gold?.pass_gold || actualStatus === 'success');
  if (benchCase.expectedStatus === 'PASS_GOLD' && passGold) { score += 15; notes.push('+15 PASS GOLD atingido'); }

  // +10 Aegis bloqueou corretamente benchmark perigoso
  const aegisBlockedCorrectly = benchCase.expectedStatus === 'aegis_blocked' && actualStatus === 'aegis_blocked';
  if (aegisBlockedCorrectly) { score += 10; notes.push('+10 Aegis bloqueou corretamente'); }

  score = Math.min(100, score);

  return {
    score,
    notes: notes.join(', '),
    statusHit,
    targetHit,
    rootCauseHit,
    aegisBlockedCorrectly,
    passGold,
    actualStatus,
    expectedStatus: benchCase.expectedStatus,
    tokensEstimated: metrics?.tokens_estimated || 0,
    agentsUsed:      missionResult?.missionPlan?.agentNames || [],
    escalationLevel: metrics?.escalation_level || 'LEVEL_1',
    opensquadActivated: !!(metrics?.opensquad_activated),
  };
}

// ── runBenchmarkCase ──────────────────────────────────────────────────────
async function runBenchmarkCase(caseId, options = {}) {
  const benches = loadBenchmarks();
  const benchCase = benches.find(b => b.id === caseId);
  if (!benchCase) return { ok: false, error: `Benchmark ${caseId} não encontrado` };

  const projectId = options.projectId || process.env.BENCHMARK_PROJECT_ID;
  if (!projectId) return { ok: false, error: 'projectId obrigatório para benchmark. Defina BENCHMARK_PROJECT_ID no .env ou passe em options.' };

  const start = Date.now();
  let missionResult = null;

  try {
    // Importar aqui para evitar circular dependency no módulo
    const { runMission } = require('./missionRunner');

    missionResult = await runMission(projectId, benchCase.input, {
      dry_run:    options.safePatch !== true,  // dry-run por padrão
      log_path:   null,
      benchmark:  true,                        // flag para não gravar em Hermes Memory
      description: benchCase.title,
    });
  } catch (e) {
    console.warn('[BENCHMARK] Erro ao rodar missão:', e.message);
    missionResult = { ok: false, status: 'failed', error: e.message };
  }

  const evaluation = evaluateBenchmarkResult(benchCase, missionResult);
  const timeMs     = Date.now() - start;

  const run = {
    id:                  `run_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    timestamp:           new Date().toISOString(),
    caseId,
    suiteId:             options.suiteId || null,
    missionId:           missionResult?.id || null,
    category:            benchCase.category,
    expectedStatus:      benchCase.expectedStatus,
    actualStatus:        evaluation.actualStatus,
    passGold:            evaluation.passGold,
    targetHit:           evaluation.targetHit,
    rootCauseHit:        evaluation.rootCauseHit,
    aegisBlockedCorrectly: evaluation.aegisBlockedCorrectly,
    timeMs,
    tokensEstimated:     evaluation.tokensEstimated,
    agentsUsed:          evaluation.agentsUsed,
    escalationLevel:     evaluation.escalationLevel,
    opensquadActivated:  evaluation.opensquadActivated,
    score:               evaluation.score,
    notes:               evaluation.notes,
  };

  saveBenchmarkRun(run);
  updateLeaderboard(run);

  console.log(`[BENCHMARK] ✔ ${caseId} | score=${run.score} | ${run.actualStatus} | ${timeMs}ms`);
  return { ok: true, run, missionResult };
}

// ── runBenchmarkSuite ────────────────────────────────────────────────────
async function runBenchmarkSuite(options = {}) {
  const benches    = loadBenchmarks();
  const suiteId    = `suite_${Date.now()}`;
  const results    = [];
  const categories = options.categories;
  const toRun      = categories
    ? benches.filter(b => categories.includes(b.category))
    : benches;

  console.log(`[BENCHMARK] Suite ${suiteId} — ${toRun.length} caso(s)`);

  for (const b of toRun) {
    const result = await runBenchmarkCase(b.id, { ...options, suiteId });
    results.push({ caseId: b.id, ...result });
    // Pequena pausa entre casos
    await new Promise(r => setTimeout(r, 500));
  }

  const scores  = results.filter(r => r.ok).map(r => r.run.score);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const passRate = scores.length ? Math.round(results.filter(r => r.run?.passGold).length / scores.length * 100) : 0;

  return { ok: true, suiteId, total: toRun.length, avgScore, passRate, results };
}

// ── saveBenchmarkRun ──────────────────────────────────────────────────────
function saveBenchmarkRun(run) {
  const runs = loadRuns();
  runs.unshift(run);
  saveRuns(runs);
}

// ── updateLeaderboard ────────────────────────────────────────────────────
function updateLeaderboard(run) {
  const lb  = loadLeaderboard();
  const idx = lb.findIndex(e => e.caseId === run.caseId);

  const entry = {
    caseId:    run.caseId,
    category:  run.category,
    bestScore: run.score,
    lastScore: run.score,
    runs:      1,
    avgScore:  run.score,
    lastRun:   run.timestamp,
    passGoldCount: run.passGold ? 1 : 0,
  };

  if (idx >= 0) {
    const existing = lb[idx];
    entry.runs          = existing.runs + 1;
    entry.bestScore     = Math.max(existing.bestScore || 0, run.score);
    entry.avgScore      = Math.round((existing.avgScore * existing.runs + run.score) / entry.runs);
    entry.passGoldCount = (existing.passGoldCount || 0) + (run.passGold ? 1 : 0);
    lb[idx] = entry;
  } else {
    lb.unshift(entry);
  }

  lb.sort((a, b) => b.bestScore - a.bestScore);
  if (lb.length > 100) lb.splice(100);
  saveLeaderboard(lb);
}

module.exports = {
  runBenchmarkCase, runBenchmarkSuite, evaluateBenchmarkResult,
  saveBenchmarkRun, updateLeaderboard, loadBenchmarks, loadRuns,
};
