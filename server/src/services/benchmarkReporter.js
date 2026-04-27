'use strict';

/**
 * VISION CORE v1.8 — Benchmark Reporter
 *
 * Gera relatórios públicos e seguros dos runs de benchmark.
 * Nunca expõe: secrets, paths privados, código-fonte, stack traces raw.
 */

const { sanitizeText } = require('./communityAnonymizer');

// ── Sanitizar relatório final ─────────────────────────────────────────────
function sanitizeReport(obj) {
  const s = JSON.stringify(obj);
  // Falhar hard se secrets detectados
  const dangerPatterns = [/sk-[A-Za-z0-9]{20,}/, /ghp_[A-Za-z0-9]{36,}/, /gsk_[A-Za-z0-9]{20,}/,
                          /password\s*[:=]\s*\S+/i, /secret\s*[:=]\s*\S+/i];
  for (const p of dangerPatterns) {
    if (p.test(s)) throw new Error(`SECRET DETECTADO NO RELATÓRIO — abortando publicação: ${p.source}`);
  }
  return obj;
}

// ── Estatísticas por categoria ────────────────────────────────────────────
function statsByCategory(runs) {
  const map = {};
  for (const r of runs) {
    const cat = r.category || 'unknown';
    if (!map[cat]) map[cat] = { category: cat, runs: 0, totalScore: 0, passGold: 0 };
    map[cat].runs++;
    map[cat].totalScore += r.score || 0;
    if (r.passGold) map[cat].passGold++;
  }
  return Object.values(map)
    .map(c => ({ ...c, avgScore: Math.round(c.totalScore / c.runs) }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

// ── generatePublicBenchmarkReport ─────────────────────────────────────────
function generatePublicBenchmarkReport(runs) {
  if (!runs || !runs.length) return { ok: true, total: 0, message: 'Sem runs disponíveis' };

  const total        = runs.length;
  const passGoldRate = Math.round(runs.filter(r => r.passGold).length / total * 100);
  const avgScore     = Math.round(runs.reduce((a, r) => a + (r.score || 0), 0) / total);
  const avgTime      = Math.round(runs.reduce((a, r) => a + (r.timeMs || 0), 0) / total);
  const avgTokens    = Math.round(runs.reduce((a, r) => a + (r.tokensEstimated || 0), 0) / total);

  const byCategory    = statsByCategory(runs);
  const bestCategory  = byCategory[0]?.category || 'N/A';
  const worstCategory = byCategory[byCategory.length - 1]?.category || 'N/A';

  const escalationDist = {};
  for (const r of runs) {
    const lvl = r.escalationLevel || 'LEVEL_1';
    escalationDist[lvl] = (escalationDist[lvl] || 0) + 1;
  }

  const opensquadRate = Math.round(runs.filter(r => r.opensquadActivated).length / total * 100);

  const aegisCorrect  = runs.filter(r => r.aegisBlockedCorrectly).length;
  const aegisDangerous = runs.filter(r => r.expectedStatus === 'aegis_blocked').length;
  const aegisCorrectness = aegisDangerous > 0 ? Math.round(aegisCorrect / aegisDangerous * 100) : null;

  const statusHitRate = Math.round(runs.filter(r => r.actualStatus === r.expectedStatus ||
    (r.passGold && r.expectedStatus === 'PASS_GOLD')).length / total * 100);

  const report = {
    generated_at:       new Date().toISOString(),
    total_cases:        total,
    pass_gold_rate:     passGoldRate,
    avg_score:          avgScore,
    avg_time_ms:        avgTime,
    avg_tokens:         avgTokens,
    status_hit_rate:    statusHitRate,
    best_category:      bestCategory,
    worst_category:     worstCategory,
    categories:         byCategory,
    escalation_distribution: escalationDist,
    opensquad_activation_rate: opensquadRate,
    aegis_block_correctness:   aegisCorrectness,
    // Sem paths, sem secrets, sem stack traces
    pass_gold_rule: 'Only PASS GOLD validation can approve. Benchmark runs do not bypass Aegis.',
  };

  return sanitizeReport({ ok: true, report });
}

// ── generateMarkdownReport ────────────────────────────────────────────────
function generateMarkdownReport(runs) {
  if (!runs?.length) return '# Benchmark Report\n\nSem dados disponíveis.';

  const rep = generatePublicBenchmarkReport(runs).report;

  const lines = [
    '# VISION CORE — Benchmark Report',
    '',
    `> Generated: ${rep.generated_at}`,
    '',
    '## Summary',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Cases | ${rep.total_cases} |`,
    `| PASS GOLD Rate | ${rep.pass_gold_rate}% |`,
    `| Avg Score | ${rep.avg_score}/100 |`,
    `| Avg Time | ${rep.avg_time_ms}ms |`,
    `| Avg Tokens Estimated | ${rep.avg_tokens} |`,
    `| Status Hit Rate | ${rep.status_hit_rate}% |`,
    `| OpenSquad Activation | ${rep.opensquad_activation_rate}% |`,
    `| Aegis Block Correctness | ${rep.aegis_block_correctness ?? 'N/A'}% |`,
    '',
    '## Performance by Category',
    `| Category | Runs | Avg Score | PASS GOLD |`,
    `|----------|------|-----------|-----------|`,
    ...(rep.categories || []).map(c =>
      `| ${c.category} | ${c.runs} | ${c.avgScore}/100 | ${c.passGold}/${c.runs} |`
    ),
    '',
    '## Escalation Distribution',
    ...Object.entries(rep.escalation_distribution || {}).map(([k, v]) => `- ${k}: ${v} runs`),
    '',
    '---',
    '_VISION CORE Benchmark Engine — report contains no secrets or private paths._',
    `_Rule: ${rep.pass_gold_rule}_`,
  ];

  return lines.join('\n');
}

// ── generateLeaderboard ───────────────────────────────────────────────────
function generateLeaderboard(runs) {
  const map = {};
  for (const r of runs) {
    if (!map[r.caseId]) {
      map[r.caseId] = { caseId: r.caseId, category: r.category, runs: 0, totalScore: 0, bestScore: 0, passGold: 0 };
    }
    const e = map[r.caseId];
    e.runs++;
    e.totalScore += r.score;
    if (r.score > e.bestScore) e.bestScore = r.score;
    if (r.passGold) e.passGold++;
  }

  return sanitizeReport(
    Object.values(map)
      .map(e => ({ ...e, avgScore: Math.round(e.totalScore / e.runs) }))
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, 50)
  );
}

module.exports = { generatePublicBenchmarkReport, generateMarkdownReport, generateLeaderboard };
