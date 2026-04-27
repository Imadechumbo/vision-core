'use strict';

/**
 * VISION CORE v1.8 — Agent Scorecard
 *
 * Mede a performance de cada agente do pipeline ao longo dos benchmarks.
 * Métricas por agente:
 *   - target_hit_rate (scanner/locator)
 *   - root_cause_hit_rate (hermes)
 *   - pass_gold_rate (pipeline completo)
 *   - aegis_correctness (aegis)
 *   - avg_score, avg_tokens, avg_time_ms
 *
 * PASS GOLD continua sendo obrigatório — scorecard é informativo,
 * não altera o fluxo de promoção.
 */

const fs   = require('fs');
const path = require('path');
const { loadRuns } = require('./benchmarkEngine');

const DATA_DIR      = path.resolve(__dirname, '../../data');
const SCORECARD_FILE = path.join(DATA_DIR, 'agent-scorecard.json');

// ── Calcular scorecard a partir dos runs ─────────────────────────────────
function computeScorecard(runs) {
  if (!runs?.length) return {};

  const agentData = {};

  for (const run of runs) {
    for (const agentName of (run.agentsUsed || [])) {
      if (!agentData[agentName]) {
        agentData[agentName] = {
          agent:        agentName,
          runs:         0,
          totalScore:   0,
          targetHits:   0,
          causeHits:    0,
          passGolds:    0,
          aegisCorrect: 0,
          totalTokens:  0,
          totalTime:    0,
        };
      }
      const d = agentData[agentName];
      d.runs++;
      d.totalScore   += run.score        || 0;
      d.targetHits   += run.targetHit    ? 1 : 0;
      d.causeHits    += run.rootCauseHit ? 1 : 0;
      d.passGolds    += run.passGold     ? 1 : 0;
      d.aegisCorrect += run.aegisBlockedCorrectly ? 1 : 0;
      d.totalTokens  += run.tokensEstimated || 0;
      d.totalTime    += run.timeMs          || 0;
    }
  }

  return Object.values(agentData).map(d => ({
    agent:               d.agent,
    runs:                d.runs,
    avg_score:           Math.round(d.totalScore   / d.runs),
    target_hit_rate:     Math.round(d.targetHits   / d.runs * 100),
    root_cause_hit_rate: Math.round(d.causeHits    / d.runs * 100),
    pass_gold_rate:      Math.round(d.passGolds    / d.runs * 100),
    aegis_correctness:   Math.round(d.aegisCorrect / d.runs * 100),
    avg_tokens:          Math.round(d.totalTokens  / d.runs),
    avg_time_ms:         Math.round(d.totalTime    / d.runs),
  })).sort((a, b) => b.avg_score - a.avg_score);
}

// ── Gerar e persistir scorecard ───────────────────────────────────────────
function generateScorecard(runs) {
  const scorecard = computeScorecard(runs || loadRuns());

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SCORECARD_FILE, JSON.stringify({
      generated_at: new Date().toISOString(),
      total_runs:   (runs || loadRuns()).length,
      agents:       scorecard,
      // Regra gravada no documento para rastreabilidade
      pass_gold_rule: 'Scorecard is informational only. PASS GOLD enforcement is not altered.',
    }, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[SCORECARD] Erro ao salvar:', e.message);
  }

  return scorecard;
}

// ── Carregar scorecard salvo ──────────────────────────────────────────────
function loadScorecard() {
  try {
    if (!fs.existsSync(SCORECARD_FILE)) return null;
    return JSON.parse(fs.readFileSync(SCORECARD_FILE, 'utf-8'));
  } catch { return null; }
}

// ── Identificar agentes com performance crítica ───────────────────────────
function criticalAgents(scorecard, threshold = 40) {
  return scorecard.filter(a => a.avg_score < threshold);
}

module.exports = { computeScorecard, generateScorecard, loadScorecard, criticalAgents };
