'use strict';

/**
 * VISION CORE — Critical File Guard
 *
 * Protege arquivos críticos contra reescrita completa por IA/Codex/Claude.
 * A IA só pode propor patches pequenos, auditáveis e reversíveis.
 *
 * Integrado no PatchEngine: antes de gravar qualquer arquivo crítico,
 * assertCriticalPatchAllowed() é chamado e bloqueia com CRITICAL_FILE_GUARD_BLOCKED
 * se qualquer regra falhar.
 *
 * As regras são carregadas de server/config/critical-files.json.
 */

const fs      = require('fs');
const path    = require('path');

const CFG_PATH = path.resolve(__dirname, '../../config/critical-files.json');

// ── Carregar configuração ──────────────────────────────────────────────────
function loadCriticalFileConfig() {
  try {
    return JSON.parse(fs.readFileSync(CFG_PATH, 'utf-8'));
  } catch {
    // Se não existir, retornar config segura (tudo desabilitado para não bloquear)
    console.warn('[GUARD] critical-files.json não encontrado — guard desabilitado');
    return { enabled: false, protectedFiles: [], protectedGlobs: [], rules: {}, forbiddenPatterns: [], requiredExports: {} };
  }
}

// ── Normalizar path para comparação cross-platform ────────────────────────
function norm(p) { return p.replace(/\\/g, '/'); }

// ── Verificar se arquivo é crítico ───────────────────────────────────────
function isCriticalFile(filePath) {
  const cfg  = loadCriticalFileConfig();
  if (!cfg.enabled) return false;

  const normalized = norm(filePath);

  // Match exato contra protectedFiles
  for (const p of (cfg.protectedFiles || [])) {
    if (normalized.endsWith(norm(p)) || norm(p).endsWith(normalized)) return true;
  }

  // Match glob contra protectedGlobs (sem micromatch como fallback manual)
  for (const glob of (cfg.protectedGlobs || [])) {
    // Simplificação: suporte a ** e *
    const re = new RegExp(
      '^' + norm(glob).replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
    );
    if (re.test(normalized)) return true;
  }

  return false;
}

// ── Contar linhas alteradas entre dois conteúdos ─────────────────────────
function countChangedLines(oldContent, newContent) {
  const oldLines = (oldContent || '').split('\n');
  const newLines = (newContent || '').split('\n');
  let changed = 0;
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) changed++;
  }
  return { changed, oldTotal: oldLines.length, newTotal: newLines.length };
}

// ── Detectar padrões proibidos no novo conteúdo ───────────────────────────
function detectForbiddenPatterns(newContent, cfg) {
  const found = [];
  for (const pat of (cfg.forbiddenPatterns || [])) {
    if (newContent.includes(pat)) found.push(pat);
  }
  return found;
}

// ── Verificar exports essenciais ainda presentes ─────────────────────────
function checkRequiredExports(filePath, newContent, cfg) {
  const normalized = norm(filePath);
  const missing    = [];

  for (const [cfgPath, exports] of Object.entries(cfg.requiredExports || {})) {
    if (!normalized.endsWith(norm(cfgPath))) continue;
    for (const exp of exports) {
      // O nome do export deve aparecer no arquivo (função ou módulo.exports)
      const namePresent = newContent.includes(exp);
      if (!namePresent) missing.push(exp);
    }
  }

  return missing;
}

// ── Verificar invariantes do missionRunner ────────────────────────────────
function checkMissionRunnerInvariants(filePath, newContent, cfg) {
  if (!norm(filePath).includes('missionRunner')) return [];
  if (!cfg.rules?.requireOpenClawBeforeHermes)    return [];

  // Só verificar em arquivos reais (> 100 linhas) — evitar falsos positivos em testes
  if (newContent.split('\n').length < 50) return [];

  const issues = [];

  if (!newContent.includes('openclawRouter') && !newContent.includes("require('./openclawRouter')")) {
    issues.push('missionRunner não importa/usa openclawRouter');
  }

  if (cfg.rules?.requireScanResultForHermes) {
    const hasScanResult = newContent.includes('scanResult,') ||
                          newContent.includes('scanResult:') ||
                          newContent.includes('scanResult)');
    if (!hasScanResult) {
      issues.push('analyzeError (Hermes) deve receber scanResult obrigatório');
    }
  }

  return issues;
}

// ── Analisar risco de um patch ────────────────────────────────────────────
function analyzePatchRisk(filePath, oldContent, newContent) {
  const cfg = loadCriticalFileConfig();

  if (!isCriticalFile(filePath)) {
    return { risk: 'none', critical: false, issues: [], score: 0 };
  }

  const issues = [];
  let   score  = 0;

  // 1. Rewrite completo
  const isFullRewrite = !oldContent || oldContent.trim().length === 0 ||
                        (newContent.length > 100 && oldContent.trim() !== newContent.trim() &&
                         countChangedLines(oldContent, newContent).changed / Math.max(countChangedLines(oldContent, newContent).oldTotal, 1) > 0.9);
  if (isFullRewrite && cfg.rules?.noFullRewrite) {
    issues.push({ type: 'full_rewrite', message: `Rewrite completo do arquivo crítico detectado`, severity: 'high' });
    score += 50;
  }

  // 2. Tamanho do patch (linhas)
  const { changed, oldTotal } = countChangedLines(oldContent, newContent);
  const changedPct = oldTotal > 0 ? (changed / oldTotal) * 100 : 100;

  if (changed > (cfg.maxPatchLines || 80)) {
    issues.push({ type: 'too_many_lines', message: `Patch altera ${changed} linhas (máx: ${cfg.maxPatchLines})`, severity: 'high' });
    score += 30;
  }

  if (changedPct > (cfg.maxChangedPercent || 25)) {
    issues.push({ type: 'too_large_percent', message: `Patch altera ${Math.round(changedPct)}% do arquivo (máx: ${cfg.maxChangedPercent}%)`, severity: 'medium' });
    score += 20;
  }

  // 3. Padrões proibidos
  const forbidden = detectForbiddenPatterns(newContent, cfg);
  for (const p of forbidden) {
    issues.push({ type: 'forbidden_pattern', message: `Padrão proibido detectado: "${p}"`, severity: 'high' });
    score += 25;
  }

  // 4. Exports essenciais removidos
  const missingExports = checkRequiredExports(filePath, newContent, cfg);
  for (const e of missingExports) {
    issues.push({ type: 'missing_export', message: `Export essencial removido: "${e}"`, severity: 'high' });
    score += 40;
  }

  // 5. Invariantes do missionRunner
  const invariantIssues = checkMissionRunnerInvariants(filePath, newContent, cfg);
  for (const msg of invariantIssues) {
    issues.push({ type: 'invariant_violation', message: msg, severity: 'high' });
    score += 35;
  }

  // Determinar risco
  const hasHigh   = issues.some(i => i.severity === 'high');
  const hasMedium = issues.some(i => i.severity === 'medium');
  const risk = score >= 50 || hasHigh ? 'blocked'
             : score >= 30 || hasMedium ? 'high'
             : score >= 10 ? 'medium'
             : 'low';

  return { risk, critical: true, issues, score, changed, changedPct: Math.round(changedPct) };
}

// ── Gate principal — bloqueia se necessário ───────────────────────────────
function assertCriticalPatchAllowed(filePath, oldContent, newContent, options = {}) {
  const cfg = loadCriticalFileConfig();
  if (!cfg.enabled) return { ok: true, skipped: true };

  if (!isCriticalFile(filePath)) return { ok: true, critical: false };

  const analysis = analyzePatchRisk(filePath, oldContent, newContent);

  if (analysis.risk === 'blocked') {
    const errorMsg = `CRITICAL_FILE_GUARD_BLOCKED: ${path.basename(filePath)} — ` +
      analysis.issues.map(i => i.message).join('; ');

    console.error(`[GUARD] 🔴 ${errorMsg}`);
    console.error(`[GUARD]   score=${analysis.score} | changed=${analysis.changed} linhas (${analysis.changedPct}%)`);

    return {
      ok:      false,
      blocked: true,
      error:   errorMsg,
      code:    'CRITICAL_FILE_GUARD_BLOCKED',
      analysis,
    };
  }

  if (analysis.issues.length > 0) {
    console.warn(`[GUARD] 🟡 Patch em arquivo crítico: ${path.basename(filePath)}`);
    for (const i of analysis.issues) {
      console.warn(`[GUARD]   ${i.severity.toUpperCase()} ${i.message}`);
    }
  } else {
    console.log(`[GUARD] ✔ Patch em arquivo crítico autorizado: ${path.basename(filePath)} (score=${analysis.score})`);
  }

  return { ok: true, critical: true, analysis, warned: analysis.issues.length > 0 };
}

module.exports = {
  loadCriticalFileConfig,
  isCriticalFile,
  analyzePatchRisk,
  assertCriticalPatchAllowed,
};
