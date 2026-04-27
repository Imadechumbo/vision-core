'use strict';

/**
 * VISION CORE — Escalation Policy
 *
 * Avalia o contexto da missão e determina o nível de escalação (0-4).
 * Só recomenda — quem aprova é o PASS GOLD. Quem executa é o pipeline.
 *
 * Regras em ordem de prioridade (maior nível vence):
 *   confidence < 40 ou causa desconhecida → LEVEL_4 (humano)
 *   confidence < 60                       → LEVEL_2
 *   blocked_pattern_match                 → LEVEL_3
 *   validation_failed repetido            → LEVEL_3
 *   aegis risk medium ou high             → LEVEL_3
 *   patch_count > 3                       → LEVEL_3
 *   target_count > 1                      → LEVEL_2
 *   needs_target                          → LEVEL_2 + locator reserve
 *   tudo OK                               → LEVEL_1
 */

const LEVELS = ['LEVEL_0', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'];

// ── Determinar nível de escalação ─────────────────────────────────────────
function evaluate(ctx) {
  const {
    hermesConfidence,
    rcaRootCause,
    targetCount,
    patchCount,
    aegisRisk,
    aegisScore,
    validationStatus,
    scanFound,
    blockedPatterns,
    retryCount,
    skipUnknownCause,  // Fix 3: true no pré-Hermes — RCA ainda não existe
  } = ctx;

  let level   = 1;
  const rules = [];

  // ── LEVEL_4: causa desconhecida ou confiança crítica ─────────────────────
  // Fix 3: só avaliar unknown_root_cause quando temos RCA real (skipUnknownCause=false)
  const unknownCause = !skipUnknownCause && (
    !rcaRootCause
    || rcaRootCause.toLowerCase().includes('desconhecid')
    || rcaRootCause.toLowerCase().includes('unknown')
    || rcaRootCause.toLowerCase().includes('causa não identificad')
  );

  if (unknownCause || (hermesConfidence !== null && hermesConfidence < 40)) {
    level = Math.max(level, 4);
    rules.push({
      rule: unknownCause ? 'unknown_root_cause' : 'confidence_below_40',
      reason: unknownCause
        ? 'Causa raiz desconhecida — revisão humana obrigatória'
        : `Confiança crítica: ${hermesConfidence}% < 40% — revisão humana`,
      escalate_to: 'LEVEL_4',
    });
  }

  // ── LEVEL_3: blocked pattern similar ─────────────────────────────────────
  if (blockedPatterns > 0) {
    level = Math.max(level, 3);
    rules.push({
      rule: 'blocked_pattern_match',
      reason: `${blockedPatterns} padrão(ões) bloqueado(s) similar(es) detectado(s)`,
      escalate_to: 'LEVEL_3',
    });
  }

  // ── LEVEL_3: validação falhou em repetição ────────────────────────────────
  if (validationStatus === 'failed' && retryCount >= 1) {
    level = Math.max(level, 3);
    rules.push({
      rule: 'validation_failed_repeat',
      reason: `Validação falhou ${retryCount + 1}x — OpenSquad Validator acionado`,
      escalate_to: 'LEVEL_3',
    });
  }

  // ── LEVEL_3: Aegis detectou risco médio ou alto ───────────────────────────
  if (aegisRisk === 'high' || aegisRisk === 'medium' || aegisScore >= 30) {
    level = Math.max(level, 3);
    rules.push({
      rule: aegisRisk === 'high' ? 'aegis_risk_high' : 'aegis_risk_medium',
      reason: `Aegis risk=${aegisRisk} score=${aegisScore} — Security reserve acionado`,
      escalate_to: 'LEVEL_3',
    });
  }

  // ── LEVEL_3: muitos patches → revisão multi-agente ────────────────────────
  if (patchCount > 3) {
    level = Math.max(level, 3);
    rules.push({
      rule: 'patch_count_gt_3',
      reason: `${patchCount} patches — revisão multi-agente recomendada`,
      escalate_to: 'LEVEL_3',
    });
  }

  // ── LEVEL_2: confiança abaixo do threshold normal ─────────────────────────
  if (hermesConfidence !== null && hermesConfidence < 60 && level < 4) {
    level = Math.max(level, 2);
    rules.push({
      rule: 'confidence_below_60',
      reason: `Confiança: ${hermesConfidence}% < 60% — contexto expandido`,
      escalate_to: 'LEVEL_2',
    });
  }

  // ── LEVEL_2: múltiplos targets ────────────────────────────────────────────
  if (targetCount > 1) {
    level = Math.max(level, 2);
    rules.push({
      rule: 'target_count_gt_1',
      reason: `${targetCount} targets aprovados — validação reforçada`,
      escalate_to: 'LEVEL_2',
    });
  }

  // ── LEVEL_2: scanner não encontrou target ─────────────────────────────────
  if (scanFound === false) {
    level = Math.max(level, 2);
    rules.push({
      rule: 'needs_target',
      reason: 'Scanner não encontrou target — Locator reserve recomendado',
      escalate_to: 'LEVEL_2',
      reserve: 'locator',
    });
  }

  // ── LEVEL_0: trivial (nenhuma regra acionada, confiança alta, patch simples)
  if (level === 1 && hermesConfidence >= 80 && patchCount <= 1 && targetCount <= 1) {
    level = 0;
  }

  const levelLabel = LEVELS[level] || 'LEVEL_1';

  console.log(`[ESCALATION] ${levelLabel} | ${rules.length} regra(s) | confidence=${hermesConfidence}% patches=${patchCount}`);
  for (const r of rules) {
    console.log(`[ESCALATION]   → ${r.rule}: ${r.reason}`);
  }

  return {
    level:           levelLabel,
    levelNum:        level,
    reasons:         rules,
    needsHuman:      level >= 4,
    needsOpenSquad:  level >= 3,
    needsLocator:    rules.some(r => r.reserve === 'locator'),
    needsExpanded:   level >= 2,
  };
}

// ── Determinar quais agentes do OpenSquad acionar ─────────────────────────
function selectReserveAgents(escalation, ctx) {
  // Fix 2: retornar agentes também quando só needsLocator (LEVEL_2 needs_target)
  if (!escalation.needsOpenSquad && !escalation.needsLocator) return [];

  const agents = new Set();

  // Locator: sempre incluir se needsLocator (needs_target)
  if (escalation.needsLocator) {
    agents.add('locator');
    // Em needs_target, também consultar memória para hints históricos
    agents.add('memory');
  }

  // LEVEL_3+: validator sempre presente
  if (escalation.needsOpenSquad) {
    agents.add('validator');

    for (const rule of escalation.reasons) {
      if (['aegis_risk_high', 'aegis_risk_medium', 'blocked_pattern_match'].includes(rule.rule)) {
        agents.add('security');
      }
      if (['validation_failed_repeat', 'patch_count_gt_3'].includes(rule.rule)) {
        agents.add('backend');
        agents.add('validator');
      }
      if (rule.rule === 'unknown_root_cause') {
        agents.add('architect');
        agents.add('memory');
      }
      if (rule.rule === 'needs_target') {
        agents.add('locator');
      }
    }

    // LEVEL_4: squad completo
    if (escalation.levelNum >= 4) {
      ['security', 'backend', 'validator', 'architect', 'memory'].forEach(a => agents.add(a));
    }
  }

  return [...agents];
}

module.exports = { evaluate, selectReserveAgents, LEVELS };
