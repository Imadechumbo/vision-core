'use strict';

/**
 * VISION CORE v1.8 — Benchmark Optimizer
 *
 * Analisa resultados de benchmark e gera recomendações concretas
 * para melhorar a qualidade dos agentes e do pipeline.
 *
 * Cada erro resolvido vira benchmark.
 * Cada benchmark mede qualidade dos agentes.
 * Cada regressão bloqueia promoção futura.
 */

const { loadRuns } = require('./benchmarkEngine');

const SCORE_THRESHOLDS = {
  excellent: 85,
  good:      65,
  poor:      40,
};

// ── Classificar score ─────────────────────────────────────────────────────
function scoreLabel(score) {
  if (score >= SCORE_THRESHOLDS.excellent) return 'excellent';
  if (score >= SCORE_THRESHOLDS.good)      return 'good';
  if (score >= SCORE_THRESHOLDS.poor)      return 'poor';
  return 'failing';
}

// ── Analisar fraquezas por categoria ─────────────────────────────────────
function analyzeWeakCategories(runs) {
  const byCategory = {};

  for (const r of runs) {
    const cat = r.category || 'unknown';
    if (!byCategory[cat]) {
      byCategory[cat] = { runs: 0, totalScore: 0, targetMisses: 0, causeMisses: 0, passGoldFails: 0 };
    }
    const c = byCategory[cat];
    c.runs++;
    c.totalScore    += r.score || 0;
    if (!r.targetHit)    c.targetMisses++;
    if (!r.rootCauseHit) c.causeMisses++;
    if (!r.passGold)     c.passGoldFails++;
  }

  return Object.entries(byCategory).map(([category, data]) => ({
    category,
    avgScore:       Math.round(data.totalScore / data.runs),
    label:          scoreLabel(Math.round(data.totalScore / data.runs)),
    runs:           data.runs,
    targetMissRate: Math.round(data.targetMisses / data.runs * 100),
    causeMissRate:  Math.round(data.causeMisses  / data.runs * 100),
    passGoldRate:   Math.round((data.runs - data.passGoldFails) / data.runs * 100),
  })).sort((a, b) => a.avgScore - b.avgScore); // pior primeiro
}

// ── Gerar recomendações de melhoria ───────────────────────────────────────
function generateRecommendations(runs) {
  if (!runs?.length) return [];

  const recs           = [];
  const weakCategories = analyzeWeakCategories(runs).filter(c => c.label === 'poor' || c.label === 'failing');
  const total          = runs.length;

  // Scanner targeting fraco
  const targetMissTotal = runs.filter(r => !r.targetHit).length;
  if (targetMissTotal / total > 0.3) {
    recs.push({
      priority: 'high',
      component: 'FileScanner',
      issue:    `${Math.round(targetMissTotal/total*100)}% de target miss — scanner não localiza arquivos`,
      action:   'Adicionar scanHints mais específicos por categoria no OpenClaw Router',
      metric:   'target_hit_rate',
    });
  }

  // Hermes RCA fraco
  const causeMissTotal = runs.filter(r => !r.rootCauseHit).length;
  if (causeMissTotal / total > 0.3) {
    recs.push({
      priority: 'high',
      component: 'HermesRCA',
      issue:    `${Math.round(causeMissTotal/total*100)}% de causa raiz não identificada`,
      action:   'Enriquecer fileContext e memoryContext passado ao Hermes. Verificar skill hermes-rca.',
      metric:   'root_cause_hit_rate',
    });
  }

  // PASS GOLD baixo
  const passGoldTotal = runs.filter(r => r.passGold).length;
  if (passGoldTotal / total < 0.5) {
    recs.push({
      priority: 'critical',
      component: 'Pipeline',
      issue:    `PASS GOLD rate abaixo de 50% (${Math.round(passGoldTotal/total*100)}%)`,
      action:   'Revisar patchEngine match engine. Verificar se find/replace bate no código real.',
      metric:   'pass_gold_rate',
    });
  }

  // Categorias fracas
  for (const cat of weakCategories.slice(0, 3)) {
    recs.push({
      priority: cat.label === 'failing' ? 'critical' : 'medium',
      component: `Category:${cat.category}`,
      issue:    `Score médio: ${cat.avgScore}/100 (${cat.label})`,
      action:   `Adicionar benchmark cases específicos para ${cat.category}. Enriquecer skill scanner-targeting.`,
      metric:   'category_avg_score',
    });
  }

  // OpenSquad acionamento alto (sinal de complexidade excessiva)
  const opensquadRate = runs.filter(r => r.opensquadActivated).length / total;
  if (opensquadRate > 0.7) {
    recs.push({
      priority: 'medium',
      component: 'EscalationPolicy',
      issue:    `${Math.round(opensquadRate*100)}% das missões acionam OpenSquad — pipeline muito escalado`,
      action:   'Revisar thresholds de escalação. Verificar se scanner hints estão gerando targets de baixa confiança.',
      metric:   'opensquad_rate',
    });
  }

  return recs.sort((a, b) =>
    ['critical','high','medium','low'].indexOf(a.priority) -
    ['critical','high','medium','low'].indexOf(b.priority)
  );
}

// ── Relatório de otimização ───────────────────────────────────────────────
function generateOptimizationReport(runs) {
  if (!runs?.length) return { ok: true, message: 'Sem runs para analisar' };

  const weakCategories    = analyzeWeakCategories(runs);
  const recommendations   = generateRecommendations(runs);
  const total             = runs.length;
  const passGoldRate      = Math.round(runs.filter(r => r.passGold).length / total * 100);
  const avgScore          = Math.round(runs.reduce((a, r) => a + (r.score || 0), 0) / total);

  return {
    ok:               true,
    generated_at:     new Date().toISOString(),
    total_runs:       total,
    avg_score:        avgScore,
    pass_gold_rate:   passGoldRate,
    overall_label:    scoreLabel(avgScore),
    weak_categories:  weakCategories.slice(0, 5),
    strong_categories: [...weakCategories].reverse().slice(0, 3),
    recommendations,
    // Nunca incluir: secrets, paths absolutos, código, stack traces
    pass_gold_rule:   'PASS GOLD is mandatory for all promotions. No bypass allowed.',
  };
}

module.exports = { generateOptimizationReport, analyzeWeakCategories, generateRecommendations, scoreLabel };
