'use strict';

/**
 * VISION CORE v2.0 — Self-Healing Orchestrator
 *
 * Orquestra o ciclo completo de auto-reparo:
 *
 *   incidentWatcher detecta falha
 *   → autoMissionQueue enfileira missão
 *   → OpenClaw classifica
 *   → Scanner encontra alvo
 *   → Hermes diagnostica
 *   → PatchEngine corrige
 *   → Aegis valida
 *   → PASS GOLD aprova
 *   → GitHub/Gitness PR
 *   → CI confirma
 *   → stablePromotionService marca snapshot stable
 *
 * REGRA ABSOLUTA:
 *   Sem PASS GOLD → nada aprende, nada promove, nada mergeia.
 *   O orchestrator nunca bypassa Aegis, PASS GOLD ou CI.
 */

const { autoMissionQueue }        = require('./autoMissionQueue');
const guard                           = require('./moduleGuard');
const { stablePromotionService }  = require('./stablePromotionService');
const { recordRegression }        = require('./regressionMemory');
const { promote }                 = require('./validatedLearningService');

// ── Estado do orchestrator ────────────────────────────────────────────────
let _running = false;
let _stats   = { healed: 0, failed: 0, blocked: 0, lastRun: null };

// ── Iniciar orchestrator ──────────────────────────────────────────────────
function start(options = {}) {
  if (_running) {
    console.warn('[ORCHESTRATOR] Já está rodando');
    return;
  }
  _running = true;
  console.log('[ORCHESTRATOR] ✔ Self-Healing Orchestrator iniciado');
  console.log('[ORCHESTRATOR]   PASS GOLD enforcement: ATIVO');
  console.log('[ORCHESTRATOR]   Aegis enforcement: ATIVO');
  console.log('[ORCHESTRATOR]   CI enforcement: ATIVO');

  // Processar fila a cada tick
  const tickMs = options.tickMs || 10_000;
  const timer  = setInterval(() => _tick(), tickMs);
  if (timer.unref) timer.unref(); // não impedir o processo de encerrar

  return { stop: () => { clearInterval(timer); _running = false; } };
}

// ── Tick do orchestrator ──────────────────────────────────────────────────
async function _tick() {
  const item = autoMissionQueue.dequeue();
  if (!item) return;

  console.log(`[ORCHESTRATOR] ▶ Processando: ${item.id} | ${item.description.slice(0, 60)}`);
  _stats.lastRun = new Date().toISOString();

  const result = await healIncident(item);

  if (result.healed) {
    _stats.healed++;
    autoMissionQueue.complete(item.id, { ok: true, reason: 'healed' });
    console.log(`[ORCHESTRATOR] ✔ Curado: ${item.id}`);
  } else if (result.blocked) {
    _stats.blocked++;
    autoMissionQueue.complete(item.id, { ok: false, reason: result.reason || 'blocked' });
    console.warn(`[ORCHESTRATOR] ⛔ Bloqueado: ${item.id} — ${result.reason}`);
  } else {
    _stats.failed++;
    autoMissionQueue.complete(item.id, { ok: false, reason: result.reason || 'failed' });
    recordRegression(result.missionResult, result.reason || 'self_healing_failed');
    console.error(`[ORCHESTRATOR] ✗ Falhou: ${item.id} — ${result.reason}`);
  }
}

// ── Curar um incidente ────────────────────────────────────────────────────
async function healIncident(incident) {
  try {
    const { runMission } = require('./missionRunner');

    // GUARD: SelfHealing NUNCA corrige diretamente — sempre via pipeline completo
    guard.assertSelfHealingUsedPipeline({ directFix: false });

    // Rodar pipeline completo (safe-patch — não dry-run)
    const missionResult = await runMission(
      incident.projectId,
      incident.description,
      {
        dry_run:      false,
        self_healing: true,
        incidentId:   incident.id,
      }
    );

    // Aegis bloqueou
    if (missionResult.status === 'aegis_blocked') {
      return { healed: false, blocked: true, reason: 'aegis_blocked', missionResult };
    }

    // PASS GOLD não atingido
    if (!missionResult.gold?.pass_gold) {
      return {
        healed: false, blocked: false,
        reason: `pass_gold_failed (score=${missionResult.gold?.final ?? '?'})`,
        missionResult,
      };
    }

    // PASS GOLD atingido → tentar promoção de aprendizado
    if (incident.feedbackId) {
      try {
        promote(incident.feedbackId, missionResult);
      } catch (e) {
        console.warn('[ORCHESTRATOR] Promoção de aprendizado falhou:', e.message);
      }
    }

    // Marcar snapshot stable — CI obrigatório no self-healing (Fix 5)
    // Verificar se há resultado de CI antes de promover stable
    const ciResult = missionResult?.ciResult || null;
    if (!ciResult) {
      console.warn('[ORCHESTRATOR] CI result ausente — stable adiado até CI confirmar');
    }
    const stable = await stablePromotionService.promote(missionResult, ciResult);

    // Marcar missão como completa na fila (Fix 6)
    autoMissionQueue.complete(incident.id, { ok: stable.ok, reason: stable.reason });

    return { healed: stable.ok, missionResult, stable };

  } catch (e) {
    console.error('[ORCHESTRATOR] Erro ao curar incidente:', e.message);
    return { healed: false, blocked: false, reason: e.message, missionResult: null };
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────
function getStats() { return { ..._stats, running: _running }; }

module.exports = { start, healIncident, getStats };
