'use strict';

/**
 * VISION CORE — Skill Context Builder
 *
 * Toda chamada de LLM recebe contexto operacional controlado:
 *   1. CLAUDE.md  — contrato global de comportamento da IA
 *   2. SKILL.md   — skills relevantes conforme OpenClaw classification
 *   3. References — canonical-pipeline.md, pass-gold-doctrine.md, etc.
 *   4. Missão atual + scanResult quando disponível
 *
 * REGRA: segurança real é Aegis + Critical File Guard + PASS GOLD + CI.
 * CLAUDE.md é contrato de comportamento, não mecanismo de segurança.
 */

const fs   = require('fs');
const path = require('path');

// ── Paths base ────────────────────────────────────────────────────────────
const SERVER_ROOT  = path.resolve(__dirname, '../..');
const SKILLS_ROOT  = path.resolve(SERVER_ROOT, '..', 'vision-core-skills');
const SKILL_MAP_F  = path.resolve(__dirname, '../../config/skill-map.json');

// Limites de tamanho (chars) para evitar context window gigante
const MAX_SKILL_CHARS   = 800;
const MAX_REF_CHARS     = 600;
const MAX_CONTEXT_CHARS = 12_000;

// ── Fallback CLAUDE.md mínimo caso arquivo não exista ─────────────────────
const CLAUDE_MD_FALLBACK = `# CLAUDE Instructions — VISION CORE (fallback)

You are a senior software engineer working under VISION CORE governance.

## Required behavior
- Prefer small patches over full rewrites.
- Never rewrite critical files from scratch.
- Keep OpenClaw before Scanner/Hermes.
- Aegis and PASS GOLD are mandatory.
- Do not run Hermes without scanResult.

## Forbidden
- bypassAegis, forceHighRisk, bypassAllowed: true
- allowPromotionWithoutPassGold, skipValidation, noValidate
- Disabling scanner before Hermes
- Promoting community data directly to Hermes Memory
`.trim();

// ── 1. Carregar skill-map.json ────────────────────────────────────────────
function loadSkillMap() {
  try {
    return JSON.parse(fs.readFileSync(SKILL_MAP_F, 'utf-8'));
  } catch (e) {
    console.warn('[SKILL] skill-map.json não encontrado — usando default mínimo');
    return {
      default: ['pass-gold-validation', 'aegis-enforcement'],
      always:  ['pass-gold-validation', 'aegis-enforcement'],
      gates:   { hermesRequiresScanResult: true },
      references: ['canonical-pipeline.md', 'pass-gold-doctrine.md'],
    };
  }
}

// ── 2. Detectar intent da missão ──────────────────────────────────────────
function detectIntent(openclawRoute) {
  // Se o router já classificou, usar
  if (openclawRoute?.intent_class) return openclawRoute.intent_class;

  const input = (openclawRoute?.raw || openclawRoute?.intent || '').toLowerCase();
  const map   = loadSkillMap();
  const kws   = map.intentDetection?.keywords || {};

  for (const [intent, words] of Object.entries(kws)) {
    if (words.some(w => input.includes(w.toLowerCase()))) return intent;
  }

  return 'bug_fix'; // padrão seguro
}

// ── 3. Resolver skills para a missão ─────────────────────────────────────
function resolveSkillsForMission(openclawRoute, mode) {
  const map      = loadSkillMap();
  const category = openclawRoute?.category || 'generic';
  const intent   = detectIntent(openclawRoute);
  const skills   = new Set();

  // Always (pass-gold + aegis — nunca removíveis)
  for (const s of (map.always || [])) skills.add(s);

  // Por intent
  for (const s of (map.byIntent?.[intent] || map.default || [])) skills.add(s);

  // Por category (ex: upload_multer, cors, learning, memory)
  for (const s of (map.byCategory?.[category] || [])) skills.add(s);

  // Modos especiais
  if (mode === 'benchmark') {
    skills.add('benchmark-engine');
    skills.add('pass-gold-validation');
  }
  if (mode === 'learning') {
    skills.add('validated-learning');
    skills.add('hermes-memory');
    skills.add('regression-memory');
  }
  if (mode === 'tuning') {
    skills.add('benchmark-engine');
    skills.add('pass-gold-validation');
    skills.add('aegis-enforcement');
  }

  // unknown_target: forçar scanner-targeting
  const isUnknown = !openclawRoute?.approvedTargets?.length && openclawRoute?.category === 'generic';
  if (isUnknown) skills.add('scanner-targeting');

  console.log(`[SKILL] Resolved: intent=${intent} category=${category} skills=[${[...skills].join(', ')}]`);
  return { skills: [...skills], intent, category };
}

// ── 4. Carregar SKILL.md ──────────────────────────────────────────────────
function loadSkillFile(skillName) {
  const p = path.join(SKILLS_ROOT, 'skills', skillName, 'SKILL.md');
  try {
    const content = fs.readFileSync(p, 'utf-8');
    return { ok: true, name: skillName, content: content.slice(0, MAX_SKILL_CHARS) };
  } catch {
    return { ok: false, name: skillName, content: '', warning: `SKILL.md não encontrado: ${skillName}` };
  }
}

// ── 5. Carregar reference file ────────────────────────────────────────────
function loadReferenceFile(fileName) {
  const p = path.join(SKILLS_ROOT, 'references', fileName);
  try {
    const content = fs.readFileSync(p, 'utf-8');
    return { ok: true, name: fileName, content: content.slice(0, MAX_REF_CHARS) };
  } catch {
    return { ok: false, name: fileName, content: '', warning: `Reference não encontrado: ${fileName}` };
  }
}

// ── 6. Carregar CLAUDE.md ─────────────────────────────────────────────────
function loadClaudeMd() {
  const p = path.join(SKILLS_ROOT, 'CLAUDE.md');
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    console.warn('[SKILL] CLAUDE.md não encontrado — usando fallback interno');
    return CLAUDE_MD_FALLBACK;
  }
}

// ── 7. Sanitizar scanResult para incluir no prompt (sem secrets) ──────────
function sanitizeScanResult(scanResult) {
  if (!scanResult) return null;
  return {
    found:          scanResult.found,
    file:           scanResult.file,
    relativePath:   scanResult.relativePath,
    score:          scanResult.score,
    matched:        (scanResult.matched || []).slice(0, 8),
    category:       scanResult.category,
    allCandidates:  (scanResult.allCandidates || []).slice(0, 3).map(c => ({
      relativePath: c.relativePath, score: c.score,
    })),
    // NUNCA incluir content completo do arquivo
  };
}

// ── 8. buildSkillContext — função principal ───────────────────────────────
function buildSkillContext(openclawRoute, options = {}) {
  const {
    projectRoot,
    scanResult,
    mode = 'mission',
    missionInput = '',
  } = options;

  const map      = loadSkillMap();
  const warnings = [];

  // Resolver skills
  const { skills, intent, category } = resolveSkillsForMission(openclawRoute, mode);

  // Deduplicar e garantir always
  const dedupedSkills = [...new Set([...skills, ...(map.always || [])])];

  // Carregar CLAUDE.md
  const claudeMd = loadClaudeMd();

  // Carregar SKILLs
  const skillBlocks = [];
  for (const skillName of dedupedSkills) {
    const r = loadSkillFile(skillName);
    if (!r.ok) {
      warnings.push(r.warning);
    } else {
      skillBlocks.push(`\n### SKILL: ${skillName}\n${r.content}`);
    }
  }

  // Carregar references
  const refs = map.references || [];
  const refBlocks = [];
  for (const refName of refs) {
    const r = loadReferenceFile(refName);
    if (!r.ok) {
      warnings.push(r.warning);
    } else {
      refBlocks.push(`\n### REF: ${refName}\n${r.content}`);
    }
  }

  // Bloco de missão atual
  const missionBlock = [
    '\n=== MISSÃO ATUAL ===',
    `Input: ${(missionInput || openclawRoute?.intent || '').slice(0, 300)}`,
    `Categoria: ${category}`,
    `Intent: ${intent}`,
    `Agentes: ${(openclawRoute?.agentNames || []).join(', ')}`,
    `Prioridade: ${openclawRoute?.priority || 'N/A'}`,
  ].join('\n');

  // Bloco de scanResult (sanitizado)
  let scanBlock = '';
  const safeScan = sanitizeScanResult(scanResult);
  if (safeScan) {
    scanBlock = [
      '\n=== SCAN RESULT (obrigatório para Hermes) ===',
      `Arquivo alvo: ${safeScan.file || 'não encontrado'}`,
      `Score: ${safeScan.score}`,
      `Sinais: ${safeScan.matched.join(', ')}`,
      `Categoria: ${safeScan.category}`,
      `Candidatos: ${safeScan.allCandidates.map(c => `${c.relativePath}(${c.score})`).join(', ')}`,
    ].join('\n');
  }

  // Restrições de saída conforme mode
  const restrictions = buildRestrictions(mode, openclawRoute, scanResult, map);

  // Montar systemPrompt na ordem correta
  const parts = [
    claudeMd,
    '\n\n=== REGRAS ABSOLUTAS (compactas) ===',
    '1. NUNCA rodar Hermes sem scanResult.',
    '2. NUNCA aprovar patch sem Aegis.',
    '3. NUNCA promover sem PASS GOLD.',
    '4. OpenClaw SEMPRE antes do Scanner/Hermes.',
    '5. patches devem ser pequenos, auditáveis e reversíveis.',
    ...skillBlocks,
    ...refBlocks,
    missionBlock,
    scanBlock,
    restrictions,
  ].filter(Boolean);

  let systemPrompt = parts.join('\n');

  // Limitar tamanho total
  if (systemPrompt.length > MAX_CONTEXT_CHARS) {
    systemPrompt = systemPrompt.slice(0, MAX_CONTEXT_CHARS) +
      '\n\n[... context truncated — max_context_chars reached ...]';
    warnings.push(`systemPrompt truncado em ${MAX_CONTEXT_CHARS} chars`);
  }

  const contextBlocks = {
    claudeMd:     claudeMd.slice(0, 200) + '…',
    skills:       skillBlocks.length,
    references:   refBlocks.length,
    hasScanResult: !!safeScan,
  };

  return {
    systemPrompt,
    skillNames:     dedupedSkills,
    referencesUsed: refs,
    contextBlocks,
    warnings,
    meta: { intent, category, mode, gates: map.gates },
  };
}

// ── Restrições conforme mode e estado ────────────────────────────────────
function buildRestrictions(mode, openclawRoute, scanResult, map) {
  const lines = ['\n=== RESTRIÇÕES DE SAÍDA ==='];

  // Gate: Hermes sem scanResult
  if (!scanResult?.found && map.gates?.hermesRequiresScanResult) {
    lines.push('⛔ SCAN INCOMPLETO: Hermes não pode propor patches sem arquivo alvo validado.');
    lines.push('   Responda APENAS com diagnóstico — sem patches.');
  }

  // Mode: benchmark — proibir promoção de memória
  if (mode === 'benchmark') {
    lines.push('⛔ BENCHMARK MODE: não promover resultados para Hermes Memory automaticamente.');
    lines.push('   Apenas avaliar o resultado contra o benchmark esperado.');
  }

  if (mode === 'tuning') {
    lines.push('⚙ TUNING MODE ativo — não promover mudanças sem PASS GOLD.');
    lines.push('  Tuning NÃO escreve em Hermes Memory. Aegis continua obrigatório.');
  }

  // Mode: learning — incluir rastreabilidade
  if (mode === 'learning') {
    lines.push('✅ LEARNING MODE: incluir rastreabilidade de aprendizado no resultado.');
    lines.push('   validated-learning, hermes-memory e regression-memory estão ativos.');
  }

  // unknown_target: proibir patch direto
  const isUnknown = !openclawRoute?.approvedTargets?.length;
  if (isUnknown) {
    lines.push('⛔ TARGET DESCONHECIDO: patch direto proibido sem arquivo alvo confirmado.');
  }

  lines.push('✅ Formato de resposta: JSON puro conforme schema Hermes. Zero markdown externo.');

  return lines.join('\n');
}

module.exports = {
  loadSkillMap,
  resolveSkillsForMission,
  loadSkillFile,
  loadReferenceFile,
  buildSkillContext,
};
