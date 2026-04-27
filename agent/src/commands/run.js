'use strict';

const api    = require('../lib/api');
const ui     = require('../lib/ui');
const { startAndPoll } = require('../lib/stream');

/**
 * vision-agent run <project-id> "<descrição>" [opções]
 *
 * Modos:
 *   dry-run    → diagnóstico, zero arquivo alterado
 *   safe-patch → patch com snapshot (padrão)
 *   pr         → safe-patch + PR no GitHub
 *
 * Flags:
 *   --log <path>       → log file para contexto adicional
 *   --force-high-risk  → forçar patches de alto risco
 *   --force-squad      → ativar OpenClaw Squad mesmo em erros simples
 *   --timeout <ms>     → timeout máximo de polling (padrão 180000)
 */

const MODES = ['dry-run', 'safe-patch', 'pr'];

async function run(args) {
  ui.header('VISION AGENT v1.1 — Executar Missão');

  // ── Parse de argumentos ─────────────────────────────────────────────────
  const positional = args.filter(a => !a.startsWith('--'));
  if (positional.length < 2) {
    ui.error('Uso: vision-agent run <project-id> "descrição" [--mode dry-run|safe-patch|pr]');
    ui.detail('Exemplo: vision-agent run technetgame "corrigir erro de mimetype"');
    process.exit(1);
  }

  const projectId   = positional[0];
  const description = positional[1];

  const idx = (flag) => args.indexOf(flag);

  let mode          = idx('--mode')    !== -1 ? args[idx('--mode')    + 1] : 'safe-patch';
  const logPath     = idx('--log')     !== -1 ? args[idx('--log')     + 1] : null;
  const timeoutMs   = idx('--timeout') !== -1 ? Number(args[idx('--timeout') + 1]) : 180_000;
  const forceHighRisk = idx('--force-high-risk') !== -1;
  const forceSquad    = idx('--force-squad')      !== -1;

  if (!MODES.includes(mode)) {
    ui.warn(`Modo inválido "${mode}" — usando safe-patch`);
    mode = 'safe-patch';
  }

  ui.info(`Projeto:  ${projectId}`);
  ui.info(`Modo:     ${mode.toUpperCase()}`);
  ui.info(`Problema: ${description}`);
  if (logPath)     ui.info(`Log:      ${logPath}`);
  if (forceSquad)  ui.info('Squad:    forçado (OpenClaw multi-agente)');
  console.log('');

  // ── Verificar conectividade ─────────────────────────────────────────────
  ui.working('Conectando ao Vision Core Server');
  try {
    const ok = await api.health();
    if (!ok) throw new Error('Server offline');
    ui.done('online');
  } catch (e) {
    process.stdout.write('\n');
    ui.error(`Server inacessível: ${e.message}`);
    ui.detail('Suba o vision-core-server: npm start');
    process.exit(1);
  }

  // ── DRY RUN ─────────────────────────────────────────────────────────────
  if (mode === 'dry-run') {
    ui.step('DRY RUN — apenas diagnóstico, zero alteração de arquivo');
    console.log('');

    let missionId, pollResult, finalResult;
    try {
      ({ missionId, pollResult, finalResult } = await startAndPoll(
        projectId, description,
        { log_path: logPath, dry_run: true, force_squad: forceSquad },
        { maxWaitMs: timeoutMs }
      ));
    } catch (e) {
      ui.error(e.message);
      process.exit(1);
    }

    // Extrair rca tolerando todos os formatos do server v1.1
    const rca = finalResult?.rca
             || finalResult?.result?.rca
             || finalResult?.mission?.rca
             || null;

    if (rca) {
      ui.dryRun(rca);
      if (rca.scanResult) {
        console.log('');
        ui.info(`Arquivo alvo identificado: ${rca.scanResult.file}`);
        ui.detail(`Score: ${rca.scanResult.score} | Sinais: ${rca.scanResult.matched?.join(', ')}`);
      }
    } else {
      // Mostrar o que foi recebido para diagnóstico
      ui.warn('RCA não disponível no formato esperado.');
      const cause = finalResult?.rca_cause || pollResult?.status;
      if (cause) {
        ui.detail(`Causa registrada: ${cause}`);
      }
      ui.detail('Verifique se o projeto está registrado: vision-agent status');
    }

    if (missionId) {
      console.log('');
      ui.detail(`Mission ID: ${missionId}`);
      ui.detail(`Status: ${finalResult?.status || pollResult?.status || '?'}`);
    }
    return;
  }

  // ── SAFE PATCH / PR MODE — com polling em tempo real ────────────────────
  ui.step(`Missão ${mode.toUpperCase()} iniciando...`);
  console.log('');

  let missionId, pollResult, finalResult;
  try {
    ({ missionId, pollResult, finalResult } = await startAndPoll(
      projectId, description,
      {
        log_path:        logPath,
        force_high_risk: forceHighRisk,
        force_squad:     forceSquad,
        dry_run:         false,
      },
      { maxWaitMs: timeoutMs }
    ));
  } catch (e) {
    ui.error(`Falha na missão: ${e.message}`);
    process.exit(1);
  }

  if (pollResult.timedOut) {
    ui.warn(`Timeout — missão ${missionId} ainda rodando no server.`);
    ui.detail(`Acompanhe: vision-agent missions ${projectId}`);
    ui.detail(`Rollback:  vision-agent rollback ${missionId}`);
    process.exit(1);
  }

  // Extrair campos normalizados tolerando todos os formatos do server v1.1
  const rca  = finalResult?.rca
            || finalResult?.result?.rca
            || finalResult?.mission?.rca
            || null;

  const gold = finalResult?.gold
            || finalResult?.result?.gold
            || finalResult?.mission?.gold
            || null;

  // ── PASS GOLD ────────────────────────────────────────────────────────────
  console.log('');
  if (gold) {
    ui.passGold(gold);
  } else {
    const level = pollResult.gold_level || 'NEEDS_REVIEW';
    const score = pollResult.gold_score || 0;
    const icons = { GOLD: '✔', SILVER: '◎', NEEDS_REVIEW: '✗' };
    console.log(`  ${icons[level] || '?'} ${level} — ${score}/100`);
  }

  // ── Resultado principal ───────────────────────────────────────────────────
  if (finalResult) {
    ui.missionResult(finalResult);
  }

  // ── Scanner info ─────────────────────────────────────────────────────────
  if (rca?.scanResult) {
    const sr = rca.scanResult;
    console.log('');
    ui.info(`Arquivo alvo: ${sr.file} (score=${sr.score})`);
    if (sr.matched?.length) ui.detail(`Sinais: ${sr.matched.join(', ')}`);
  }

  // ── Ações pós-missão ─────────────────────────────────────────────────────
  const status = finalResult?.status || pollResult.status;

  if (status === 'success') {
    if (mode === 'safe-patch') {
      console.log('');
      ui.info('Para criar PR:');
      ui.detail(`vision-agent pr ${missionId}`);
    }

  } else if (status === 'requires_review' || status === 'no_patch') {
    console.log('');
    ui.info('O Hermes diagnosticou mas não conseguiu aplicar patch automático.');
    ui.detail('1. Adicione --log <path> para mais contexto');
    ui.detail('2. Verifique o arquivo alvo detectado e tente novamente');
    ui.detail('3. Use --force-squad para ativar análise multi-agente');

  } else if (status === 'high_risk') {
    console.log('');
    ui.warn('Patch de alto risco. Para forçar (use com cuidado):');
    ui.detail(`vision-agent run ${projectId} "${description}" --force-high-risk`);

  } else if (status === 'patch_failed' || status === 'validation_failed') {
    console.log('');
    ui.ok('Rollback automático foi executado — projeto restaurado.');
    ui.detail(`Rollback manual: vision-agent rollback ${missionId}`);
  }

  console.log('');
  if (status !== 'success') process.exit(1);
}

module.exports = { run };
