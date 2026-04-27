'use strict';

/**
 * VISION CORE — Hybrid Git Service
 *
 * Orquestra GitHub (produção) + Gitness (laboratório interno).
 *
 * Fluxo:
 *   1. Patch gerado e validado localmente (PASS GOLD obrigatório)
 *   2. Push para branch no GitHub (produção)
 *   3. Push para branch no Gitness (lab de validação paralela)
 *   4. Abre PR no GitHub
 *   5. Abre PR no Gitness (para pipeline interno rodar)
 *   6. Aguarda checks do Gitness (opcional — configurável)
 *   7. Relatório híbrido com status de ambos
 *
 * Config via env:
 *   HYBRID_GIT_MODE = github_only | gitness_only | hybrid
 *   GITNESS_VALIDATION_REQUIRED = true | false
 *   GITNESS_WAIT_PIPELINE_MS = 30000
 */

const { execSync } = require('child_process');
const { createPR: createGithubPR, githubStatus } = require('../githubService');
const gitness = require('./gitnessService');

const HYBRID_MODE = () => process.env.HYBRID_GIT_MODE || 'github_only';
const GITNESS_REQUIRED = () => process.env.GITNESS_VALIDATION_REQUIRED === 'true';
const WAIT_MS = () => Number(process.env.GITNESS_WAIT_PIPELINE_MS || 0);

// ── Status consolidado das duas plataformas ───────────────────────────────
function hybridStatus() {
  const gh  = githubStatus();
  const gn  = gitness.gitnessStatus();
  const mode = HYBRID_MODE();

  return {
    mode,
    github: { ...gh, platform: 'github' },
    gitness: { ...gn, platform: 'gitness', pingable: gn.configured },
    validation_required: GITNESS_REQUIRED(),
    description: {
      github_only:  'GitHub = produção. Gitness desabilitado.',
      gitness_only: 'Gitness = único destino. GitHub desabilitado.',
      hybrid:       'GitHub = produção/PR oficial. Gitness = laboratório/validação interna.',
    }[mode] || 'Modo desconhecido',
  };
}

// ── Criar PR híbrido ──────────────────────────────────────────────────────
async function createHybridPR(repoPath, branch, rca, gold) {
  const mode   = HYBRID_MODE();
  const result = {
    mode,
    github:  { ok: false, skipped: true },
    gitness: { ok: false, skipped: true },
    hybrid_ok: false,
    branch,
  };

  const title = `VISION CORE: ${(rca.cause || 'auto-patch').slice(0, 60)}`;
  const body  = buildPRBody(rca, gold);

  // ── GitHub ────────────────────────────────────────────────────────────
  if (mode === 'github_only' || mode === 'hybrid') {
    try {
      const ghResult = await createGithubPR(repoPath, branch, rca, gold);
      result.github = { ...ghResult, platform: 'github', skipped: false };
    } catch (e) {
      result.github = { ok: false, error: e.message, platform: 'github', skipped: false };
    }
  }

  // ── Gitness ───────────────────────────────────────────────────────────
  if (mode === 'gitness_only' || mode === 'hybrid') {
    const gCfg = gitness.getConfig();

    if (!gCfg.token || !gCfg.account || !gCfg.repo) {
      result.gitness = { ok: false, skipped: true, reason: 'Gitness não configurado (.env)' };
    } else {
      try {
        // Push para Gitness
        const pushResult = gitness.pushToGitness(repoPath, branch);
        if (!pushResult.ok) throw new Error(pushResult.error || 'Push para Gitness falhou');

        // Abrir PR no Gitness
        const gnResult = await gitness.createPullRequest(branch, title, body);
        result.gitness = { ...gnResult, platform: 'gitness', skipped: false };

        // Aguardar pipeline Gitness se configurado
        if (WAIT_MS() > 0 && gnResult.ok) {
          result.gitness.pipeline = await waitForGitnessPipeline(WAIT_MS());
        }
      } catch (e) {
        result.gitness = { ok: false, error: e.message, platform: 'gitness', skipped: false };
      }
    }
  }

  // ── Avaliação final ───────────────────────────────────────────────────
  result.hybrid_ok = evaluateHybridOk(result, mode);

  logHybridResult(result);
  return result;
}

// ── Aguardar pipeline Gitness com polling ─────────────────────────────────
async function waitForGitnessPipeline(maxMs) {
  const start  = Date.now();
  const pollMs = 3000;

  console.log(`[HYBRID] Aguardando pipeline Gitness (max ${maxMs}ms)...`);

  while (Date.now() - start < maxMs) {
    await sleep(pollMs);
    try {
      // Pegar o commit HEAD do branch atual
      const sha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      const status = await gitness.getPipelineStatus(sha);
      if (status.ok === true) {
        console.log('[HYBRID] ✔ Pipeline Gitness: PASSOU');
        return { ok: true, elapsed_ms: Date.now() - start };
      }
      if (status.ok === false) {
        console.log('[HYBRID] ✗ Pipeline Gitness: FALHOU');
        return { ok: false, elapsed_ms: Date.now() - start, checks: status.checks };
      }
      console.log('[HYBRID] Pipeline Gitness: aguardando...');
    } catch (e) {
      console.warn('[HYBRID] Erro ao checar pipeline:', e.message);
    }
  }

  console.warn('[HYBRID] Timeout aguardando pipeline Gitness');
  return { ok: null, timed_out: true, elapsed_ms: maxMs };
}

// ── Avaliar se o resultado híbrido é OK ──────────────────────────────────
function evaluateHybridOk(result, mode) {
  if (mode === 'github_only') return result.github.ok;
  if (mode === 'gitness_only') return result.gitness.ok;

  // hybrid: GitHub obrigatório, Gitness required só se configurado
  const githubOk  = result.github.ok;
  const gitnessOk = result.gitness.skipped
    ? true  // Gitness não configurado — não bloqueia
    : GITNESS_REQUIRED()
      ? result.gitness.ok && (result.gitness.pipeline?.ok !== false)
      : true; // Gitness só informativo se GITNESS_VALIDATION_REQUIRED=false

  return githubOk && gitnessOk;
}

// ── Log consolidado ───────────────────────────────────────────────────────
function logHybridResult(result) {
  console.log(`[HYBRID] Modo: ${result.mode} | branch: ${result.branch}`);
  if (!result.github.skipped) {
    const icon = result.github.ok ? '✔' : '✗';
    console.log(`[HYBRID] GitHub: ${icon} ${result.github.pr_url || result.github.error || ''}`);
  }
  if (!result.gitness.skipped) {
    const icon = result.gitness.ok ? '✔' : '✗';
    console.log(`[HYBRID] Gitness: ${icon} ${result.gitness.pr_url || result.gitness.error || result.gitness.reason || ''}`);
    if (result.gitness.pipeline) {
      const pip = result.gitness.pipeline.ok ? '✔ PASSOU' : result.gitness.pipeline.timed_out ? '⏱ TIMEOUT' : '✗ FALHOU';
      console.log(`[HYBRID] Pipeline: ${pip}`);
    }
  }
  console.log(`[HYBRID] Resultado final: ${result.hybrid_ok ? '✔ OK' : '✗ FALHOU'}`);
}

// ── Corpo do PR ───────────────────────────────────────────────────────────
function buildPRBody(rca, gold) {
  return [
    '## VISION CORE Auto Repair',
    '',
    `**Score:** ${gold?.final ?? '??'}/100 — ${gold?.level ?? '?'}`,
    `**Causa:** ${rca.cause || '—'}`,
    `**Fix:** ${rca.fix || '—'}`,
    `**Risco:** ${rca.risk || '—'}`,
    `**Patches:** ${rca.patches?.length || 0}`,
    '',
    '### Validação',
    `- PASS GOLD: ${gold?.pass_gold ? '✔ SIM' : '✗ NÃO'}`,
    `- Aegis: ${rca.risk || 'low'}`,
    '',
    '### Explicação',
    (rca.explanation || rca.fix || '').slice(0, 500),
    '',
    '_Gerado automaticamente pelo VISION CORE — GitHub + Gitness Hybrid_',
  ].join('\n');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { createHybridPR, hybridStatus, waitForGitnessPipeline };
