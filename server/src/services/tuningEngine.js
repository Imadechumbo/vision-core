'use strict';

/**
 * VISION CORE — Tuning Engine
 *
 * Responsável por carregar o tuning ativo e aplicá-lo ao MissionPlan
 * produzido pelo OpenClaw Router.
 *
 * REGRAS:
 *   - NÃO altera a estrutura base do route
 *   - NÃO bypassa Aegis, PASS GOLD ou Scanner
 *   - NÃO escreve em Hermes Memory
 *   - Apenas ADICIONA signals e ajusta pesos de agentes
 *   - Reversível: remover tuning-active.json desfaz tudo
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR      = path.resolve(__dirname, '../../data');
const ACTIVE_FILE   = path.join(DATA_DIR, 'tuning-active.json');

// ── Carregar tuning ativo ─────────────────────────────────────────────────
function loadActiveTuning() {
  try {
    if (!fs.existsSync(ACTIVE_FILE)) return null;
    const tuning = JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf-8'));
    // Fix 2: simulation nunca vira tuning ativo real
    if (!tuning?.applied || tuning?.rolled_back || tuning?._simulation_only) return null;
    return tuning;
  } catch { return null; }
}

// ── Aplicar tuning ao route (patch mínimo — só adiciona, nunca remove) ────
function applyTuningToRoute(plan, tuning) {
  if (!tuning?.actions?.length || !plan) return;

  // GUARD: verificar que nenhuma ação de tuning viola restrições críticas
  const guard = require('./moduleGuard');
  guard.assertTuningIsSafe(tuning);

  for (const action of tuning.actions) {

    // UPDATE_SCAN_HINTS — adicionar sinais extras por categoria
    if (action.type === 'UPDATE_SCAN_HINTS') {
      // Fix 1: compatibilidade com os três campos de categoria do MissionPlan
      const planCategory = plan.category || plan.primaryCategory || plan.classification;
      if (action.category && action.category !== planCategory) continue;

      // Adicionar ao scanHints global
      if (Array.isArray(action.addSignals)) {
        plan.scanHints = [...new Set([...(plan.scanHints || []), ...action.addSignals])];
      }

      // Adicionar aos agentScanHints de cada agente
      if (Array.isArray(action.addSignals) && plan.agentScanHints) {
        for (const key of Object.keys(plan.agentScanHints)) {
          plan.agentScanHints[key] = [
            ...new Set([...(plan.agentScanHints[key] || []), ...action.addSignals]),
          ];
        }
      }

      // Adicionar caminhos preferidos
      if (Array.isArray(action.addPaths)) {
        plan.tunedPaths = [...new Set([...(plan.tunedPaths || []), ...action.addPaths])];
      }
    }

    // ADJUST_AGENT_WEIGHT — reordenar agentes por peso
    if (action.type === 'ADJUST_AGENT_WEIGHT' && action.agent && typeof action.delta === 'number') {
      // Registrar peso no plan (scanner usa para boost de score)
      plan.agentWeights = plan.agentWeights || {};
      plan.agentWeights[action.agent] = (plan.agentWeights[action.agent] || 0) + action.delta;

      // Se o agente tem peso alto e existe nos agentes do plan, mover para frente
      if (action.delta > 0 && Array.isArray(plan.agents)) {
        const idx = plan.agents.findIndex(a => a.key === action.agent);
        if (idx > 0) {
          const [agent] = plan.agents.splice(idx, 1);
          plan.agents.unshift(agent);
          plan.agentNames = plan.agents.map(a => a.name);
        }
      }
    }
  }

  console.log(`[TUNING] ✔ Aplicado ao route: categoria=${plan.category} hints+=${tuning.actions.filter(a=>a.type==='UPDATE_SCAN_HINTS').length}`);
}

module.exports = { loadActiveTuning, applyTuningToRoute };
