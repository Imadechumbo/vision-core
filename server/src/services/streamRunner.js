'use strict';

/**
 * VISION CORE v1.1 — Stream Runner
 *
 * Wraps o missionRunner existente e emite eventos SSE linha a linha
 * durante a execução. O agent faz polling ou conecta via SSE e vê
 * cada passo aparecer em tempo real — sem esperar terminar.
 *
 * Protocolo SSE:
 *   event: step     → cada passo da timeline
 *   event: log      → linha de console capturada
 *   event: result   → resultado final completo
 *   event: error    → falha fatal
 *   event: ping     → keepalive a cada 15s
 */

const { EventEmitter } = require('events');
const { helpers }      = require('../db/sqlite');

// Registro de streams ativos: missionId → Set<res>
const activeStreams = new Map();

// ── Emitir evento SSE para todos os clientes conectados ──────────────────
function emit(missionId, eventName, data) {
  const clients = activeStreams.get(missionId);
  if (!clients || clients.size === 0) return;

  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); }
    catch { clients.delete(res); }
  }
}

// ── Registrar cliente SSE ─────────────────────────────────────────────────
function addClient(missionId, res) {
  if (!activeStreams.has(missionId)) activeStreams.set(missionId, new Set());
  activeStreams.get(missionId).add(res);

  // Ping keepalive
  const ping = setInterval(() => {
    try { res.write(`event: ping\ndata: ${Date.now()}\n\n`); }
    catch { clearInterval(ping); }
  }, 15000);

  res.on('close', () => {
    clearInterval(ping);
    activeStreams.get(missionId)?.delete(res);
  });

  // Replay de passos já executados (reconexão)
  try {
    const steps = helpers.getSteps.all(missionId);
    for (const s of steps) {
      res.write(`event: step\ndata: ${JSON.stringify(s)}\n\n`);
    }
    const mission = helpers.getMission.get(missionId);
    if (mission && !['running', 'pending'].includes(mission.status)) {
      res.write(`event: result\ndata: ${JSON.stringify({ status: mission.status, id: missionId })}\n\n`);
    }
  } catch { /* ignorar */ }
}

// ── Remover todos os clientes de uma missão ───────────────────────────────
function closeStream(missionId) {
  const clients = activeStreams.get(missionId);
  if (!clients) return;
  for (const res of clients) {
    try {
      res.write('event: done\ndata: {}\n\n');
      res.end();
    } catch { /* ignorar */ }
  }
  activeStreams.delete(missionId);
}

// ── Interceptar console.log durante a missão ─────────────────────────────
// Redireciona logs para SSE sem perder o output no terminal do server
function withLogCapture(missionId, fn) {
  const origLog  = console.log.bind(console);
  const origWarn = console.warn.bind(console);

  const capture = (level) => (...args) => {
    const text = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    origLog(...args);
    emit(missionId, 'log', { level, text, ts: Date.now() });
  };

  console.log  = capture('info');
  console.warn = capture('warn');

  const restore = () => {
    console.log  = origLog;
    console.warn = origWarn;
  };

  return { restore };
}

// ── Emitir step e persistir ───────────────────────────────────────────────
function emitStep(missionId, step, status, detail, elapsedMs) {
  const payload = { step, status, detail, elapsed_ms: elapsedMs, ts: Date.now() };
  emit(missionId, 'step', payload);

  try {
    helpers.insertStep.run({
      mission_id: missionId, step, status,
      detail: String(detail || '').slice(0, 500),
      elapsed_ms: elapsedMs,
    });
  } catch { /* não bloquear */ }

  return payload;
}

module.exports = { emit, addClient, closeStream, emitStep, withLogCapture, activeStreams };
