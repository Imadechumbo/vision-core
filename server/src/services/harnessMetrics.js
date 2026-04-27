'use strict';

/**
 * VISION CORE — Harness Metrics
 *
 * Coleta métricas de observabilidade para cada missão.
 * Inclui: criticalFileGuardPassed, criticalFileGuardBlocks, criticalPatchRisk (V1.6.2)
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR     = path.resolve(__dirname, '../../data');
const METRICS_FILE = path.join(DATA_DIR, 'mission-metrics.json');
const CONFIG_FILE  = path.resolve(__dirname, '../../config/harness-metrics.json');
const MAX_RECORDS  = 200;

// ── Carregar config de harness (se existir) ───────────────────────────────
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); }
  catch {
    return {
      token_estimation: {
        base_prompt_tokens:     800,
        per_file_context_tokens: 600,
        per_memory_record_tokens: 80,
        per_log_line_tokens:     10,
        response_budget_tokens: 1024,
      },
    };
  }
}

// ── Estimativa de tokens ──────────────────────────────────────────────────
function estimateTokens(ctx) {
  const cfg = loadConfig().token_estimation;
  return (
    (cfg.base_prompt_tokens        || 800) +
    (ctx.fileCount     || 0) * (cfg.per_file_context_tokens   || 600) +
    (ctx.memoryHits    || 0) * (cfg.per_memory_record_tokens  || 80) +
    (ctx.logLines      || 0) * (cfg.per_log_line_tokens       || 10) +
    (cfg.response_budget_tokens    || 1024)
  );
}

// ── Complexity score (0-100) ──────────────────────────────────────────────
function complexityScore(ctx) {
  let score = 0;
  const e   = String(ctx.errorInput || '').toLowerCase();

  if (e.length > 500)  score += 10;
  if (e.length > 1000) score += 10;
  if (/at\s+\S+\s+\(/.test(e)) score += 10;

  const mods = (e.match(/\brequire\b|\bimport\b/g) || []).length;
  score += Math.min(mods * 5, 20);

  const complex = ['async', 'promise', 'middleware', 'database', 'migration', 'cors', 'auth', 'deploy'];
  score += complex.filter(w => e.includes(w)).length * 5;

  score += Math.min((ctx.targetCount || 0) * 5, 15);
  score += Math.min((ctx.patchCount  || 0) * 3, 15);

  return Math.min(100, score);
}

// ── Construir objeto de métricas ──────────────────────────────────────────
function buildMetrics(missionId, ctx) {
  const {
    errorInput, missionPlan, scanResult, multiScan,
    rca, patchResult, validation, aegis, gold,
    relevantMemory, escalation, opensquad,
    duration_ms, status,
    // V1.6.2: Critical File Guard metrics
    criticalFileGuardPassed,
    criticalFileGuardBlocks,
    criticalPatchRisk,
  } = ctx;

  const targetCount  = (missionPlan?.approvedTargets || []).length || (scanResult?.found ? 1 : 0);
  const filesScanned = Object.keys(multiScan?.byAgent || {}).length || (scanResult ? 1 : 0);
  const patchCount   = rca?.patches?.length || 0;
  const memoryHits   = (relevantMemory?.validated?.length || 0) +
                       (relevantMemory?.failures?.length  || 0) +
                       (relevantMemory?.blocked?.length   || 0);
  const blockedPatterns = relevantMemory?.blocked?.length || 0;

  const tokensEst = estimateTokens({ fileCount: filesScanned, memoryHits, logLines: 0 });
  const ctxNeeded = tokensEst > 8000 ? 'large' : tokensEst > 4000 ? 'medium' : 'small';

  return {
    mission_id:             missionId,
    timestamp:              new Date().toISOString(),
    status,

    // Complexidade
    input_complexity_score: complexityScore({ errorInput, targetCount, patchCount }),
    target_count:           targetCount,
    files_scanned:          filesScanned,
    scan_confidence:        scanResult?.score || 0,
    scan_found:             !!scanResult?.found,

    // Hermes
    hermes_confidence:      rca?.confidence || 0,
    hermes_risk:            rca?.risk       || null,
    hermes_source:          rca?.source     || null,
    patch_count:            patchCount,

    // Aegis
    aegis_risk_score:       aegis?.score || 0,
    aegis_risk_level:       aegis?.risk  || null,
    aegis_issues_count:     (aegis?.issues || []).length,

    // Validação
    validation_status:      validation ? (validation.ok ? 'passed' : 'failed') : 'skipped',
    validation_tests_ok:    validation?.tests?.ok ?? null,
    validation_syntax_ok:   validation?.files?.every(f => f.ok) ?? null,

    // PASS GOLD
    pass_gold:              gold?.pass_gold  || false,
    gold_score:             gold?.final      || 0,
    gold_level:             gold?.level      || null,

    // Memória
    memory_hits:            memoryHits,
    blocked_patterns:       blockedPatterns,
    memory_reuse:           !!(ctx.memInfluence?.reuseStrategy),

    // Tokens
    tokens_estimated:       tokensEst,
    context_window_needed:  ctxNeeded,

    // Agentes e escalação
    agents_used:            missionPlan?.agentNames || [],
    escalation_level:       escalation?.level       || 'LEVEL_1',
    escalation_reasons:     escalation?.reasons     || [],
    opensquad_activated:    !!(opensquad?.activated),
    opensquad_agents:       opensquad?.agentsUsed   || [],

    // Performance
    duration_ms:            duration_ms || 0,
    retry_count:            ctx.retryCount || 0,

    // ── V1.6.2: Critical File Guard ───────────────────────────────────────
    criticalFileGuardPassed:  criticalFileGuardPassed  ?? true,
    criticalFileGuardBlocks:  criticalFileGuardBlocks  || 0,
    criticalPatchRisk:        criticalPatchRisk        || 'low',
  };
}

// ── Carregar métricas ─────────────────────────────────────────────────────
function loadMetrics() {
  try {
    if (!fs.existsSync(METRICS_FILE)) return [];
    return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf-8'));
  } catch { return []; }
}

// ── Salvar métricas ───────────────────────────────────────────────────────
function saveMetrics(records) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(METRICS_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[HARNESS] Erro ao salvar métricas:', e.message);
  }
}

// ── Registrar métricas de uma missão ──────────────────────────────────────
function record(missionId, ctx) {
  try {
    const metrics = buildMetrics(missionId, ctx);
    const records = loadMetrics();
    records.unshift(metrics);
    if (records.length > MAX_RECORDS) records.splice(MAX_RECORDS);
    saveMetrics(records);
    console.log(`[HARNESS] level=${metrics.escalation_level} | conf=${metrics.hermes_confidence}% | tokens≈${metrics.tokens_estimated} | gold=${metrics.pass_gold} | guardPassed=${metrics.criticalFileGuardPassed}`);
    return metrics;
  } catch (e) {
    console.warn('[HARNESS] Erro ao registrar:', e.message);
    return null;
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────
function stats() {
  const records = loadMetrics();
  if (!records.length) return { total: 0 };

  const goldRate  = records.filter(r => r.pass_gold).length / records.length;
  const avgConf   = records.reduce((a, r) => a + (r.hermes_confidence || 0), 0) / records.length;
  const avgTokens = records.reduce((a, r) => a + (r.tokens_estimated   || 0), 0) / records.length;
  const guardBlocks = records.reduce((a, r) => a + (r.criticalFileGuardBlocks || 0), 0);
  const byLevel   = {};
  const byStatus  = {};

  for (const r of records) {
    byLevel[r.escalation_level] = (byLevel[r.escalation_level] || 0) + 1;
    byStatus[r.status]          = (byStatus[r.status]          || 0) + 1;
  }

  return {
    total:                records.length,
    pass_gold_rate:       Math.round(goldRate * 100),
    avg_confidence:       Math.round(avgConf),
    avg_tokens:           Math.round(avgTokens),
    by_level:             byLevel,
    by_status:            byStatus,
    opensquad_rate:       Math.round(records.filter(r => r.opensquad_activated).length / records.length * 100),
    critical_guard_blocks: guardBlocks,
  };
}

module.exports = { record, buildMetrics, loadMetrics, stats, estimateTokens, complexityScore };
