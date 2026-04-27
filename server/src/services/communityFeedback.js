'use strict';

/**
 * VISION CORE v1.7 — Community Feedback
 *
 * Armazenamento e fluxo de status do feedback da comunidade.
 * JSON puro — sem dependência de SQLite.
 *
 * Fluxo de status:
 *   submitted → triaged → reproduced → converted_to_benchmark
 *   → solved_PASS_GOLD   (única rota para Hermes Memory)
 *   submitted → rejected_sensitive  (conteúdo inseguro)
 *
 * REGRA: feedback nunca vira Hermes Memory automaticamente.
 * Só reproduced + PASS GOLD confirmado promove.
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { sanitizeCommunityPayload } = require('./communityAnonymizer');
const vault  = require('./obsidianVault');

const DATA_DIR   = path.resolve(__dirname, '../../data');
const FEEDBACK_F = path.join(DATA_DIR, 'community-feedback.json');
const BENCH_F    = path.join(DATA_DIR, 'community-benchmarks.json');

const VALID_STATUSES = [
  'submitted', 'triaged', 'reproduced',
  'converted_to_benchmark', 'solved_PASS_GOLD', 'rejected_sensitive',
];

// ── I/O helpers ───────────────────────────────────────────────────────────
function ensureDir() { fs.mkdirSync(DATA_DIR, { recursive: true }); }

function loadFeedback() {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(FEEDBACK_F, 'utf-8')); }
  catch { return []; }
}

function saveFeedback(list) {
  ensureDir();
  fs.writeFileSync(FEEDBACK_F, JSON.stringify(list, null, 2), 'utf-8');
}

function loadBenchmarks() {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(BENCH_F, 'utf-8')); }
  catch { return []; }
}

function saveBenchmarks(list) {
  ensureDir();
  fs.writeFileSync(BENCH_F, JSON.stringify(list, null, 2), 'utf-8');
}

// ── submitFeedback ────────────────────────────────────────────────────────
function submitFeedback(payload) {
  const anonResult = sanitizeCommunityPayload(payload);

  // Conteúdo perigoso → rejeitar com stub
  if (!anonResult.safe) {
    vault.saveRejectedStub(payload, anonResult.reason);
    const list = loadFeedback();
    const stub = {
      id:        `fb_rej_${Date.now()}`,
      status:    'rejected_sensitive',
      reason:    anonResult.reason,
      category:  payload?.category || 'unknown',
      submittedAt: new Date().toISOString(),
    };
    list.unshift(stub);
    if (list.length > 500) list.splice(500);
    saveFeedback(list);
    console.log(`[FEEDBACK] ⛔ Rejeitado: ${anonResult.reason}`);
    return { ok: false, rejected: true, reason: anonResult.reason, id: stub.id };
  }

  // Safe → salvar registro sanitizado
  const id       = `fb_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const record   = {
    id,
    status:      'submitted',
    submittedAt: new Date().toISOString(),
    redactions:  anonResult.redactions,
    obsidianNote: null,
    benchmarkId:  null,
    missionId:    null,
    promotedToHermes: false,
    ...anonResult.sanitizedPayload,
  };

  // Criar nota Obsidian
  const noteResult = vault.createMarkdownNote({
    ...record,
    id,
    openclawClassification: null,
    benchmarkCandidate: false,
    passGoldResult: 'pending',
    promotedToHermes: false,
  }, 'inbox');

  if (noteResult.ok) record.obsidianNote = noteResult.fileName;

  const list = loadFeedback();
  list.unshift(record);
  if (list.length > 500) list.splice(500);
  saveFeedback(list);

  console.log(`[FEEDBACK] ✔ Submetido: ${id} | ${record.category}`);
  return { ok: true, id, record, obsidian: noteResult };
}

// ── listFeedback ──────────────────────────────────────────────────────────
function listFeedback(filters = {}) {
  let list = loadFeedback();
  if (filters.status) list = list.filter(f => f.status === filters.status);
  if (filters.category) list = list.filter(f => f.category === filters.category);
  if (filters.limit) list = list.slice(0, Number(filters.limit));
  return list;
}

// ── triageFeedback ────────────────────────────────────────────────────────
function triageFeedback(id, status, notes = '') {
  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: `Status inválido: ${status}` };
  }
  const list   = loadFeedback();
  const idx    = list.findIndex(f => f.id === id);
  if (idx < 0) return { ok: false, error: `Feedback ${id} não encontrado` };

  const record   = list[idx];
  record.status  = status;
  record.triagedAt = new Date().toISOString();
  if (notes) record.triageNotes = notes;

  // Mover nota Obsidian se existir
  if (record.obsidianNote) {
    const folderMap = { triaged: 'triaged', reproduced: 'triaged' };
    const folder    = folderMap[status];
    if (folder) vault.moveNote(record.obsidianNote, 'inbox', folder, status);
  }

  list[idx] = record;
  saveFeedback(list);
  console.log(`[FEEDBACK] Triagem: ${id} → ${status}`);
  return { ok: true, record };
}

// ── convertToBenchmark ────────────────────────────────────────────────────
function convertToBenchmark(id) {
  const list = loadFeedback();
  const idx  = list.findIndex(f => f.id === id);
  if (idx < 0) return { ok: false, error: `Feedback ${id} não encontrado` };

  const record = list[idx];

  const benchId = `bm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const bench   = {
    id:                benchId,
    title:             record.title || `Benchmark from ${id}`,
    category:          record.category || 'generic',
    framework:         record.framework || '',
    language:          record.language  || '',
    severity:          record.severity  || 'medium',
    input:             record.errorSignature || '',
    sanitizedStackTrace: record.stackTraceSanitized || '',
    expectedRootCause: '',
    expectedTargets:   [],
    expectedStatus:    'PASS_GOLD',
    tags:              record.tags || [],
    sourceFeedbackId:  id,
    createdAt:         new Date().toISOString(),
  };

  const benches = loadBenchmarks();
  benches.unshift(bench);
  if (benches.length > 200) benches.splice(200);
  saveBenchmarks(benches);

  // Atualizar feedback
  record.status        = 'converted_to_benchmark';
  record.benchmarkId   = benchId;
  record.convertedAt   = new Date().toISOString();
  list[idx] = record;
  saveFeedback(list);

  // Mover nota Obsidian
  if (record.obsidianNote) {
    vault.moveNote(record.obsidianNote, 'inbox', 'benchmarks', 'converted_to_benchmark');
  }

  console.log(`[FEEDBACK] ✔ Convertido para benchmark: ${benchId}`);
  return { ok: true, benchmarkId: benchId, benchmark: bench };
}

// ── promoteToSolved ───────────────────────────────────────────────────────
// PASS GOLD obrigatório — única porta para Hermes Memory
function promoteToSolved(id, passGoldResult) {
  if (!passGoldResult?.pass_gold) {
    return { ok: false, error: 'PASS GOLD não atingido — promoção negada', pass_gold: false };
  }

  const list = loadFeedback();
  const idx  = list.findIndex(f => f.id === id);
  if (idx < 0) return { ok: false, error: `Feedback ${id} não encontrado` };

  const record = list[idx];
  record.status           = 'solved_PASS_GOLD';
  record.solvedAt         = new Date().toISOString();
  record.promotedToHermes = true;
  record.passGoldResult   = passGoldResult;
  list[idx] = record;
  saveFeedback(list);

  // Mover nota Obsidian para solved
  if (record.obsidianNote) {
    vault.moveNote(record.obsidianNote, 'benchmarks', 'solved', 'solved_PASS_GOLD');
  }

  // NÃO escrever diretamente em validated_memory — quem faz isso é o missionRunner
  // quando hermesMemory.recordMission é chamado com finalStatus='success'
  console.log(`[FEEDBACK] ✔ Promovido a SOLVED_PASS_GOLD: ${id} | promoted_to_hermes=true`);
  return { ok: true, record, promoted_to_hermes: true };
}

// ── promoteIfLinked ───────────────────────────────────────────────────────
// Chamado pelo missionRunner quando uma missão ligada ao feedback termina com PASS GOLD
function promoteIfLinked(missionId, missionResult) {
  if (!missionResult?.gold?.pass_gold) return null;

  const list = loadFeedback();
  const linked = list.find(f => f.missionId === missionId && f.status === 'converted_to_benchmark');
  if (!linked) return null;

  return promoteToSolved(linked.id, missionResult.gold);
}

// ── exportPublicBenchmarks ────────────────────────────────────────────────
// Retorna benchmarks sem dados privados — seguro para publicação
function exportPublicBenchmarks() {
  return loadBenchmarks().map(b => ({
    id:               b.id,
    title:            b.title,
    category:         b.category,
    framework:        b.framework,
    language:         b.language,
    severity:         b.severity,
    expectedStatus:   b.expectedStatus,
    tags:             b.tags,
    createdAt:        b.createdAt,
    // Não exportar: input raw, stack trace, sourceFeedbackId
  }));
}

module.exports = {
  submitFeedback, listFeedback, triageFeedback,
  convertToBenchmark, promoteToSolved, promoteIfLinked,
  exportPublicBenchmarks, loadBenchmarks,
};
