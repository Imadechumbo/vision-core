'use strict';

/**
 * VISION CORE v2.0 — Auto Mission Queue
 *
 * Fila de missões automáticas enfileiradas pelo incidentWatcher.
 * O orchestrator consome a fila e roda o pipeline completo.
 *
 * Prioridades: critical > high > normal > low
 * Deduplicação: mesma description + projectId não é re-enfileirada em 5min
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR   = path.resolve(__dirname, '../../data');
const QUEUE_FILE = path.join(DATA_DIR, 'auto-mission-queue.json');
const MAX_ITEMS  = 100;
const DEDUP_MS   = 5 * 60 * 1000; // 5 minutos

const PRIORITY_ORDER = ['critical', 'high', 'normal', 'low'];

// ── I/O ───────────────────────────────────────────────────────────────────
function load() {
  try {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  } catch { return []; }
}

function save(items) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(items.slice(0, MAX_ITEMS), null, 2), 'utf-8');
}

// ── Enfileirar missão ─────────────────────────────────────────────────────
function enqueue(item) {
  const queue = load();

  // Deduplicação
  const recent = Date.now() - DEDUP_MS;
  const dup = queue.find(q =>
    q.projectId   === item.projectId &&
    q.description === item.description &&
    new Date(q.enqueuedAt).getTime() > recent &&
    q.status === 'pending'
  );

  if (dup) {
    console.log(`[QUEUE] ⟳ Deduplicado: ${item.id} (já na fila: ${dup.id})`);
    return dup;
  }

  const entry = {
    ...item,
    status:     'pending',
    enqueuedAt: new Date().toISOString(),
    startedAt:  null,
    completedAt: null,
    result:     null,
  };

  queue.unshift(entry);
  save(queue);
  console.log(`[QUEUE] ▶ Enfileirado: ${entry.id} | priority=${entry.priority || 'normal'}`);
  return entry;
}

// ── Desenfileirar próxima missão (maior prioridade) ───────────────────────
function dequeue() {
  const queue   = load();
  const pending = queue.filter(q => q.status === 'pending');
  if (!pending.length) return null;

  // Ordenar por prioridade e tempo
  pending.sort((a, b) => {
    const pa = PRIORITY_ORDER.indexOf(a.priority || 'normal');
    const pb = PRIORITY_ORDER.indexOf(b.priority || 'normal');
    if (pa !== pb) return pa - pb;
    return new Date(a.enqueuedAt) - new Date(b.enqueuedAt);
  });

  const next = pending[0];
  const idx  = queue.findIndex(q => q.id === next.id);
  queue[idx].status    = 'processing';
  queue[idx].startedAt = new Date().toISOString();
  save(queue);

  console.log(`[QUEUE] ← Desenfileirado: ${next.id} | priority=${next.priority || 'normal'}`);
  return next;
}

// ── Marcar como concluído ────────────────────────────────────────────────
function complete(id, result) {
  const queue = load();
  const idx   = queue.findIndex(q => q.id === id);
  if (idx < 0) return;
  queue[idx].status      = result?.ok ? 'completed' : 'failed';
  queue[idx].completedAt = new Date().toISOString();
  queue[idx].result      = { ok: result?.ok, reason: result?.reason };
  save(queue);
}

// ── Stats ─────────────────────────────────────────────────────────────────
function stats() {
  const queue = load();
  return {
    total:      queue.length,
    pending:    queue.filter(q => q.status === 'pending').length,
    processing: queue.filter(q => q.status === 'processing').length,
    completed:  queue.filter(q => q.status === 'completed').length,
    failed:     queue.filter(q => q.status === 'failed').length,
  };
}

const autoMissionQueue = { enqueue, dequeue, complete, stats, load };
module.exports = { autoMissionQueue };
