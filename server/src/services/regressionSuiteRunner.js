'use strict';

/**
 * VISION CORE v1.8 — Regression Suite Runner
 *
 * Roda benchmarks com casos históricos de falha para garantir que
 * soluções validadas não regridam com novos patches.
 *
 * Cada regressão detectada:
 *   1. Registra na regressionMemory
 *   2. Bloqueia promoção de soluções similares
 *   3. Emite alerta para o operador
 *   4. NÃO bypassa Aegis nem PASS GOLD
 */

const { runBenchmarkSuite, loadBenchmarks, loadRuns } = require('./benchmarkEngine');
const { recordRegression, checkRegression }           = require('./regressionMemory');
const { generateScorecard }                           = require('./agentScorecard');
const { generateOptimizationReport }                  = require('./benchmarkOptimizer');

// ── Rodar suite de regressão ──────────────────────────────────────────────
async function runRegressionSuite(options = {}) {
  const projectId = options.projectId || process.env.BENCHMARK_PROJECT_ID;
  if (!projectId) {
    return { ok: false, error: 'projectId obrigatório. Defina BENCHMARK_PROJECT_ID ou passe em options.' };
  }

  console.log('[REGRESSION_SUITE] Iniciando suite de regressão...');

  // Filtrar apenas benchmarks marcados como casos de regressão (expectedStatus != PASS_GOLD)
  const allBenches = loadBenchmarks();
  const regressionCases = allBenches.filter(b =>
    b.expectedStatus !== 'PASS_GOLD' ||
    b.tags?.includes('regression') ||
    b.tags?.includes('historical_failure')
  );

  console.log(`[REGRESSION_SUITE] ${regressionCases.length} caso(s) de regressão`);

  const suiteResult = await runBenchmarkSuite({
    projectId,
    categories: options.categories,
  });

  // Analisar resultados em busca de regressões
  const regressions = [];
  for (const r of (suiteResult.results || [])) {
    if (!r.ok || !r.run) continue;

    // Regressão = benchmark que deveria passar mas falhou
    if (r.run.expectedStatus === 'PASS_GOLD' && !r.run.passGold) {
      const reg = recordRegression(r.missionResult, 'pass_gold_failed');
      regressions.push({ caseId: r.caseId, regressionId: reg.id, type: 'pass_gold_regression' });
    }

    // Regressão = target não encontrado quando deveria ser encontrado
    if (!r.run.targetHit && (r.run.expectedStatus === 'PASS_GOLD' || r.run.expectedStatus === 'needs_target')) {
      const reg = recordRegression(r.missionResult, 'target_miss_regression');
      regressions.push({ caseId: r.caseId, regressionId: reg.id, type: 'target_miss' });
    }
  }

  // Gerar scorecard e otimização pós-suite
  const allRuns  = loadRuns();
  const scorecard = generateScorecard(allRuns);
  const optReport = generateOptimizationReport(allRuns);

  const report = {
    ok:               true,
    suiteId:          suiteResult.suiteId,
    total:            suiteResult.total,
    avgScore:         suiteResult.avgScore,
    passRate:         suiteResult.passRate,
    regressions:      regressions.length,
    regressionDetails: regressions,
    scorecard:        scorecard.slice(0, 10),
    topRecommendations: (optReport.recommendations || []).slice(0, 3),
    // Regra registrada no relatório
    pass_gold_rule:   'Regressions block future promotions. PASS GOLD required to unblock.',
  };

  console.log(`[REGRESSION_SUITE] ✔ Concluído: ${regressions.length} regressão(ões) | avgScore=${suiteResult.avgScore}`);
  return report;
}

// ── Verificar regressão antes de promover ─────────────────────────────────
function checkBeforePromotion(missionResult) {
  const check = checkRegression(missionResult);
  if (check.hasRegression) {
    console.warn(`[REGRESSION_SUITE] ⚠ ${check.matches.length} regressão(ões) ativa(s) — promoção em risco`);
  }
  return check;
}

module.exports = { runRegressionSuite, checkBeforePromotion };
