'use strict';

/**
 * VISION CORE V2.3.4 — PASS GOLD Engine Hardened
 *
 * PASS GOLD é calculado exclusivamente no servidor.
 * Regra: sem sintaxe OK + testes OK + healthcheck OK + snapshot + confiança + risco aceitável,
 * o nível máximo é SILVER, mesmo que o score ponderado seja alto.
 */

const { helpers } = require('../db/sqlite');

const WEIGHTS = {
  llm_confidence:    0.22,
  data_quality:      0.10,
  patch_specificity: 0.16,
  risk_level:        0.12,
  build_passed:      0.12,
  tests_passed:      0.12,
  health_passed:     0.08,
  snapshot_exists:   0.08,
};

function testGate(validation) {
  return validation?.tests?.ok === true && validation?.tests?.configured === true;
}

function healthGate(validation) {
  return validation?.health?.ok === true && validation?.health?.configured === true;
}

function computeDimensions(rca = {}, logResult, patchResult, validation, snapshotIds) {
  const dims = {};

  const confidence = Number(rca.confidence || 0);
  dims.llm_confidence = {
    score: confidence,
    label: confidence >= 80 ? 'Alta' : confidence >= 60 ? 'Média' : 'Baixa',
    note: `Hermes retornou ${confidence}% de confiança`,
    raw: confidence,
  };

  const hasLogs = !!logResult;
  const errCount = logResult?.errors?.length || 0;
  const logScore = hasLogs ? Math.min(100, 50 + errCount * 10) : 30;
  dims.data_quality = {
    score: logScore,
    label: hasLogs ? `Logs reais (${errCount} erros)` : 'Sem logs reais',
    note: hasLogs ? `${errCount} erro(s) extraído(s) de logs reais` : 'Análise apenas pelo texto da missão',
    raw: logScore,
  };

  const pCount = patchResult?.applied || 0;
  const patchScore = pCount > 0 ? Math.min(100, 60 + pCount * 15) : 0;
  dims.patch_specificity = {
    score: patchScore,
    label: pCount > 0 ? `${pCount} patch(es)` : 'Sem patch',
    note: pCount > 0 ? `${pCount} patch(es) com alvo validado` : 'Nenhum patch automático aplicado',
    raw: patchScore,
  };

  const riskMap = { low: 90, medium: 65, high: 0, unknown: 35 };
  const risk = rca.risk || 'unknown';
  const riskScore = riskMap[risk] ?? 35;
  dims.risk_level = {
    score: riskScore,
    label: { low: 'Baixo', medium: 'Médio', high: 'Alto', unknown: 'Desconhecido' }[risk] || 'Desconhecido',
    note: risk === 'high' ? 'Risco alto bloqueia GOLD' : 'Risco aceitável para validação controlada',
    raw: riskScore,
  };

  const buildPassed = validation?.ok === true && Array.isArray(validation?.files) && validation.files.every(f => f.ok === true);
  dims.build_passed = {
    score: buildPassed ? 100 : 0,
    label: buildPassed ? 'Sintaxe OK' : 'Sintaxe/build falhou',
    note: buildPassed ? 'Arquivos alterados passaram em node --check' : (validation?.files?.find(f => !f.ok)?.error || 'Validação técnica incompleta'),
    raw: buildPassed ? 100 : 0,
  };

  const testsPassed = testGate(validation);
  dims.tests_passed = {
    score: testsPassed ? 100 : 0,
    label: testsPassed ? 'Testes OK' : 'Testes ausentes/falharam',
    note: testsPassed ? 'npm test configurado e aprovado' : 'PASS GOLD exige suite de testes configurada e aprovada',
    raw: testsPassed ? 100 : 0,
  };

  const healthPassed = healthGate(validation);
  dims.health_passed = {
    score: healthPassed ? 100 : 0,
    label: healthPassed ? 'Healthcheck OK' : 'Healthcheck ausente/falhou',
    note: healthPassed ? `Healthcheck aprovado (${validation.health.status || 200})` : 'PASS GOLD exige health_url configurada e respondendo 2xx/3xx',
    raw: healthPassed ? 100 : 0,
  };

  const hasSnap = Array.isArray(snapshotIds) && snapshotIds.length > 0;
  dims.snapshot_exists = {
    score: hasSnap ? 100 : 0,
    label: hasSnap ? 'Snapshot criado' : 'Sem snapshot',
    note: hasSnap ? `${snapshotIds.length} snapshot(s) — rollback disponível` : 'Sem rollback disponível',
    raw: hasSnap ? 100 : 0,
  };

  return dims;
}

function computeFinalScore(dims) {
  return Math.round(Object.entries(dims).reduce((acc, [k, v]) => acc + v.raw * (WEIGHTS[k] || 0), 0));
}

function evaluate(missionId, rca = {}, logResult, patchResult, validation, snapshotIds) {
  const dims = computeDimensions(rca, logResult, patchResult, validation, snapshotIds);
  const finalScore = computeFinalScore(dims);

  const mandatoryGates = {
    syntax_passed: validation?.ok === true && Array.isArray(validation?.files) && validation.files.every(f => f.ok === true),
    tests_configured: validation?.tests?.configured === true,
    tests_passed: testGate(validation),
    healthcheck_configured: validation?.health?.configured === true,
    healthcheck_passed: healthGate(validation),
    snapshot_exists: Array.isArray(snapshotIds) && snapshotIds.length > 0,
    confidence_ok: Number(rca.confidence || 0) >= 60,
    risk_acceptable: rca.risk !== 'high',
    patch_applied: (patchResult?.applied || 0) > 0,
  };

  let level;
  if (finalScore >= 80 && Object.values(mandatoryGates).every(Boolean)) level = 'GOLD';
  else if (finalScore >= 60) level = 'SILVER';
  else level = 'NEEDS_REVIEW';

  const failedGates = Object.entries(mandatoryGates).filter(([, ok]) => !ok).map(([name]) => name);
  const verdict = level === 'GOLD'
    ? 'PASS GOLD — deploy seguro'
    : level === 'SILVER'
      ? `PASS SILVER — bloqueado para promoção; gates pendentes: ${failedGates.join(', ')}`
      : `NEEDS REVIEW — gates pendentes: ${failedGates.join(', ')}`;

  const id = `gold_${missionId}_${Date.now()}`;
  try {
    helpers.insertGold.run({
      id, mission_id: missionId,
      final_score: finalScore, level,
      llm_confidence: dims.llm_confidence.raw,
      data_quality: dims.data_quality.raw,
      patch_specificity: dims.patch_specificity.raw,
      risk_level: dims.risk_level.raw,
      memory_score: 0,
      build_passed: mandatoryGates.syntax_passed ? 1 : 0,
      tests_passed: mandatoryGates.tests_passed ? 1 : 0,
      lint_passed: mandatoryGates.healthcheck_passed ? 1 : 0,
      snapshot_exists: mandatoryGates.snapshot_exists ? 1 : 0,
      rollback_ready: mandatoryGates.snapshot_exists ? 1 : 0,
      verdict,
    });
  } catch (e) {
    console.warn('[PASS GOLD] Erro ao persistir avaliação:', e.message);
  }

  return { final: finalScore, level, verdict, pass_gold: level === 'GOLD', gates: mandatoryGates, failed_gates: failedGates, dimensions: dims };
}

module.exports = { evaluate, computeDimensions, computeFinalScore };
