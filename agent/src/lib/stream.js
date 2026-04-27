'use strict';

/**
 * VISION AGENT v1.1 — Live Stream
 *
 * Faz polling contínuo no endpoint /api/missions/:id/poll
 * e exibe cada step e log em tempo real no terminal.
 *
 * Estratégia:
 *   - Poll a cada 800ms enquanto status for running/pending
 *   - Exibe apenas steps novos (since = último elapsed_ms visto)
 *   - Timeout máximo configurável (padrão 3 min)
 *   - Se SSE estiver disponível, usa SSE via EventSource nativo do Node 18+
 */

const http  = require('http');
const https = require('https');
const config = require('./config');
const ui     = require('./ui');

const ANSI = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
  cyan:  '\x1b[36m', purple: '\x1b[35m', gray: '\x1b[90m',
};
const c = (col, t) => `${ANSI[col] || ''}${t}${ANSI.reset}`;

// ── Ícone por status de step ──────────────────────────────────────────────
function stepIcon(status) {
  return status === 'ok'      ? c('green',  '✔')
       : status === 'fail'    ? c('red',    '✗')
       : status === 'running' ? c('yellow', '⟳')
       :                        c('gray',   '○');
}

// ── Formatar step para terminal ───────────────────────────────────────────
function renderStep(s) {
  const icon    = stepIcon(s.status);
  const elapsed = s.elapsed_ms != null ? c('gray', `  +${s.elapsed_ms}ms`) : '';
  const line    = `  ${icon} ${s.step}${elapsed}`;
  const detail  = s.detail ? `\n     ${c('gray', s.detail.slice(0, 100))}` : '';
  return line + detail;
}

// ── HTTP GET helper leve ──────────────────────────────────────────────────
function httpGet(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const tok    = config.token();
    const req    = lib.get(
      {
        hostname: parsed.hostname,
        port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path:     parsed.pathname + parsed.search,
        headers:  { ...(tok ? { 'X-Vision-Token': tok } : {}), 'Accept': 'application/json' },
      },
      res => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode, data: null }); }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('poll timeout')); });
  });
}

// ── Poll contínuo ─────────────────────────────────────────────────────────
async function pollMission(missionId, options = {}) {
  const {
    intervalMs  = 800,
    maxWaitMs   = Number(process.env.MISSION_TIMEOUT_MS || 180_000), // 3 min
    onStep,    // callback(step) opcional
    onLog,     // callback(log) opcional
    silent     = false,
  } = options;

  const base    = config.serverUrl();
  const startedAt = Date.now();
  let   lastElapsed = 0;
  let   seenSteps   = 0;

  if (!silent) {
    console.log('');
    console.log(c('purple', '  ─── Timeline ao vivo ───────────────────────────────'));
  }

  while (true) {
    // Timeout global
    if (Date.now() - startedAt > maxWaitMs) {
      if (!silent) ui.warn(`Timeout de ${maxWaitMs / 1000}s — missão ainda em execução no server`);
      return { timedOut: true, missionId };
    }

    let pollData;
    try {
      const url = `${base}/api/missions/${missionId}/poll?since=${lastElapsed}`;
      const res = await httpGet(url);
      if (res.status !== 200 || !res.data?.ok) {
        await sleep(intervalMs * 2);
        continue;
      }
      pollData = res.data;
    } catch {
      await sleep(intervalMs * 2);
      continue;
    }

    // Exibir novos steps
    for (const s of (pollData.steps || [])) {
      if (s.elapsed_ms > lastElapsed) lastElapsed = s.elapsed_ms;
      seenSteps++;

      if (!silent) {
        process.stdout.write(renderStep(s) + '\n');
      }
      onStep?.(s);
    }

    // Missão terminou
    if (pollData.done) {
      if (!silent) {
        console.log(c('purple', '  ─────────────────────────────────────────────────'));
      }
      return {
        timedOut:   false,
        missionId,
        status:     pollData.status,
        done:       true,
        pass_gold:  pollData.pass_gold,
        gold_score: pollData.gold_score,
        gold_level: pollData.gold_level,
        steps:      seenSteps,
      };
    }

    await sleep(intervalMs);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Normalizar resultado do server — aceita qualquer formato ─────────────
// Formatos possíveis do server v1.1:
//   result.rca                 → missão retornada direto do runMission
//   result.result.rca          → wrapper duplo
//   mission.rca_cause (flat)   → linha do banco via GET /api/missions/:id
function normalizeResult(data) {
  if (!data) return null;

  // Formato 1: objeto com rca direto (resposta do runMission ou SSE result)
  if (data.rca && typeof data.rca === 'object') return data;

  // Formato 2: wrapper duplo { result: { rca: ... } }
  if (data.result?.rca && typeof data.result.rca === 'object') {
    return { ...data, ...data.result };
  }

  // Formato 3: linha plana do banco (GET /api/missions/:id)
  // tem rca_cause, rca_fix, rca_confidence, rca_risk como campos planos
  if (data.rca_cause || data.rca_fix) {
    return {
      ...data,
      rca: {
        cause:      data.rca_cause      || null,
        fix:        data.rca_fix        || null,
        confidence: data.rca_confidence || 0,
        risk:       data.rca_risk       || 'unknown',
        source:     data.rca_source     || null,
        patches:    [],
        scanResult: null,
      },
      gold: data.gold_score != null ? {
        final:     data.gold_score,
        level:     data.gold_level || 'NEEDS_REVIEW',
        pass_gold: data.pass_gold  === 1,
        verdict:   data.gold_level === 'GOLD' ? 'PASS GOLD — deploy seguro'
                 : data.gold_level === 'SILVER' ? 'PASS SILVER — revisão recomendada'
                 : 'NEEDS REVIEW — aprovação manual necessária',
      } : null,
    };
  }

  // Retornar como está — melhor esforço
  return data;
}

// ── Iniciar missão + poll integrado ──────────────────────────────────────
async function startAndPoll(projectId, errorText, runOptions, pollOptions = {}) {
  const api  = require('./api');

  // Lançar missão — o server v1.1 responde imediatamente com { id, status, rca, ... }
  let missionId;
  let launchData = null;
  try {
    const res = await api.runMission(projectId, errorText, runOptions);

    // Capturar dados do launch antes de qualquer coisa
    launchData = res.data || null;

    if (!launchData?.id) throw new Error(launchData?.error || 'Sem mission_id na resposta');
    missionId = launchData.id;
  } catch (e) {
    throw new Error(`Falha ao iniciar missão: ${e.message}`);
  }

  ui.info(`Mission ID: ${c('cyan', missionId)}`);

  // Polling em tempo real
  const pollResult = await pollMission(missionId, pollOptions);

  // Buscar resultado completo do server via GET /api/missions/:id
  let finalResult = null;
  try {
    const res = await api.get(`/api/missions/${missionId}`);
    // GET /api/missions/:id retorna { ok, mission } com campos planos do banco
    const raw = res.data?.mission || res.data || null;
    finalResult = normalizeResult(raw);
  } catch { /* fallback abaixo */ }

  // Se GET falhou ou rca ainda não está disponível, tentar o launchData
  // O server v1.1 já retorna o resultado completo na resposta do POST /run
  if (!finalResult?.rca && launchData) {
    finalResult = normalizeResult(launchData);
  }

  // Último fallback: montar rca mínimo a partir do pollResult
  if (!finalResult?.rca && pollResult.status) {
    finalResult = finalResult || {};
    finalResult.status = finalResult.status || pollResult.status;
    finalResult.id     = finalResult.id     || missionId;
  }

  return { missionId, pollResult, finalResult };
}

module.exports = { pollMission, startAndPoll, normalizeResult, sleep, renderStep };
