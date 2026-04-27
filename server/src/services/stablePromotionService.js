'use strict';

/**
 * VISION CORE v2.0 — Stable Promotion Service
 *
 * Marca um estado do sistema como "stable" após:
 *   1. PASS GOLD confirmado no servidor (nunca pelo cliente)
 *   2. Aegis não bloqueou
 *   3. CI passou (GitHub Actions + Gitness se configurado)
 *   4. Merge realizado no branch principal
 *
 * Um snapshot stable é o único ponto de rollback seguro.
 * REGRA: Sem PASS GOLD, nada é marcado como stable.
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const DATA_DIR     = path.resolve(__dirname, '../../data');
const SNAPSHOTS_F  = path.join(DATA_DIR, 'stable-snapshots.json');
const MAX_SNAPSHOTS = 100;

// ── I/O ───────────────────────────────────────────────────────────────────
function load() {
  try {
    if (!fs.existsSync(SNAPSHOTS_F)) return [];
    return JSON.parse(fs.readFileSync(SNAPSHOTS_F, 'utf-8'));
  } catch { return []; }
}

function save(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SNAPSHOTS_F, JSON.stringify(list.slice(0, MAX_SNAPSHOTS), null, 2), 'utf-8');
}

// ── Promover para stable ──────────────────────────────────────────────────
async function promote(missionResult, ciResult = null) {
  // Gate 1: PASS GOLD obrigatório — sem exceção
  const gold = missionResult?.gold;
  if (!gold?.pass_gold) {
    const reason = `PASS GOLD não atingido (score=${gold?.final ?? '?'}/100)`;
    console.warn(`[STABLE] ⛔ Promoção bloqueada: ${reason}`);
    return { ok: false, stable: false, reason };
  }

  // Gate 2: Aegis não pode ter bloqueado
  const aegis = missionResult?.aegis;
  if (aegis && !aegis.ok) {
    const reason = `Aegis bloqueou: ${aegis.verdict}`;
    console.warn(`[STABLE] ⛔ Promoção bloqueada: ${reason}`);
    return { ok: false, stable: false, reason };
  }

  // Gate 3: CI (verificação não-bloqueante se não disponível)
  const ciPassed = ciResult?.passed ?? null;
  if (ciResult && !ciPassed) {
    const reason = `CI falhou: ${ciResult.reason || 'pipeline reprovado'}`;
    console.warn(`[STABLE] ⛔ Promoção bloqueada: ${reason}`);
    return { ok: false, stable: false, reason };
  }

  // Criar snapshot stable
  const snapshot = {
    id:            `snap_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    missionId:     missionResult?.id      || null,
    projectId:     missionResult?.projectId || null,
    category:      missionResult?.missionPlan?.category || 'generic',
    goldScore:     gold.final,
    goldLevel:     gold.level,
    passGold:      true,
    aegisOk:       !aegis || aegis.ok,
    ciPassed:      ciPassed,
    promotedAt:    new Date().toISOString(),
    rca: {
      cause:      (missionResult?.rca?.cause || '').slice(0, 120),
      confidence: missionResult?.rca?.confidence || 0,
      risk:       missionResult?.rca?.risk || null,
    },
    // NUNCA incluir: patches com find/replace, file content, secrets
  };

  const list = load();
  list.unshift(snapshot);
  save(list);

  console.log(`[STABLE] ✔ Stable snapshot criado: ${snapshot.id} | gold=${gold.final}/100 | ${snapshot.category}`);
  return { ok: true, stable: true, snapshot };
}

// ── Listar snapshots stable ───────────────────────────────────────────────
function listSnapshots(projectId) {
  const list = load();
  return projectId ? list.filter(s => s.projectId === projectId) : list;
}

// ── Último snapshot stable de um projeto ─────────────────────────────────
function latest(projectId) {
  return listSnapshots(projectId)[0] || null;
}

// ── Stats ─────────────────────────────────────────────────────────────────
function stats() {
  const list = load();
  return {
    total:    list.length,
    byProject: list.reduce((acc, s) => {
      acc[s.projectId] = (acc[s.projectId] || 0) + 1;
      return acc;
    }, {}),
    latestAt: list[0]?.promotedAt || null,
  };
}

const stablePromotionService = { promote, listSnapshots, latest, stats };
module.exports = { stablePromotionService };
