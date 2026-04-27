'use strict';

/**
 * VISION CORE v1.2 — Aegis (Risk Verifier)
 *
 * Aegis verifica o risco de um patch ANTES de aplicar.
 * Roda entre o Hermes (que gerou o patch) e o PatchEngine (que aplica).
 *
 * Checks:
 *   1. Path safety    — arquivo dentro do projeto, não em paths protegidos
 *   2. Scope check    — find/replace não são idênticos, replace não está vazio
 *   3. Danger patterns — patch não deleta autenticação, não expõe secrets
 *   4. Size check     — replace não é mais de 3x o tamanho do find (patch explosivo)
 *   5. Protected files — .env, secrets/, node_modules, .git bloqueados
 *   6. Risk score     — retorna LOW / MEDIUM / HIGH com justificativa
 *
 * Resultado: { ok, risk, score, issues, verdict }
 * Se ok=false → PatchEngine não executa.
 */

const path = require('path');
const fs   = require('fs');

// ── Arquivos e padrões protegidos ─────────────────────────────────────────
const PROTECTED_PATHS = [
  /\.env$/i,
  /\.env\./i,
  /secrets?\//i,
  /node_modules\//i,
  /\.git\//i,
  /\.vault\//i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
];

// ── Padrões perigosos no replace ──────────────────────────────────────────
const DANGER_PATTERNS = [
  { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/i, label: 'child_process import no replace', severity: 'high' },
  { pattern: /exec\s*\(\s*['"`]/i,                          label: 'exec() call no replace',          severity: 'high' },
  { pattern: /process\.exit/i,                               label: 'process.exit no replace',         severity: 'medium' },
  { pattern: /fs\.unlink|fs\.rmdir|fs\.rm\b/i,              label: 'operação de deleção no replace',  severity: 'high' },
  { pattern: /eval\s*\(/i,                                   label: 'eval() no replace',               severity: 'high' },
  { pattern: /\bpassword\s*=\s*['"]/i,                       label: 'senha hardcoded no replace',      severity: 'high' },
  { pattern: /\bsecret\s*=\s*['"]/i,                        label: 'secret hardcoded no replace',     severity: 'high' },
  { pattern: /AUTH_\w+\s*=\s*false/i,                        label: 'desabilitando auth no replace',   severity: 'high' },
  { pattern: /skipAuth|bypassAuth|authDisabled/i,             label: 'bypass de autenticação',          severity: 'high' },
];

// ── Verificar um patch individual ─────────────────────────────────────────
function checkPatch(patch, projectPath) {
  const issues = [];
  let riskScore = 0;

  const filePath = path.resolve(projectPath, patch.file || '');
  const relPath  = patch.file || '';

  // 1. Path safety
  if (!filePath.startsWith(path.resolve(projectPath))) {
    issues.push({ severity: 'high', msg: `Path traversal: "${relPath}" fora do projeto` });
    riskScore += 40;
  }

  // 2. Arquivos protegidos
  for (const p of PROTECTED_PATHS) {
    if (p.test(relPath)) {
      issues.push({ severity: 'high', msg: `Arquivo protegido: "${relPath}"` });
      riskScore += 35;
      break;
    }
  }

  // 3. Find e replace idênticos
  if (patch.find && patch.replace && patch.find.trim() === patch.replace.trim()) {
    issues.push({ severity: 'medium', msg: 'find e replace idênticos — patch não teria efeito' });
    riskScore += 20;
  }

  // 4. Replace vazio
  if (patch.find && (!patch.replace || !patch.replace.trim())) {
    issues.push({ severity: 'high', msg: 'replace vazio — patch deletaria código' });
    riskScore += 30;
  }

  // 5. Padrões perigosos no replace
  const replaceText = patch.replace || '';
  for (const danger of DANGER_PATTERNS) {
    if (danger.pattern.test(replaceText)) {
      issues.push({ severity: danger.severity, msg: danger.label });
      riskScore += danger.severity === 'high' ? 30 : 15;
    }
  }

  // 6. Size explosion (replace muito maior que find)
  const findLen    = (patch.find    || '').length;
  const replaceLen = (patch.replace || '').length;
  if (findLen > 0 && replaceLen > findLen * 4) {
    issues.push({ severity: 'medium', msg: `Replace ${Math.round(replaceLen / findLen)}x maior que find — verifique escopo` });
    riskScore += 15;
  }

  // 7. Arquivo não existe (não é bloqueante — pode ser criação, mas logar)
  const fileExists = fs.existsSync(filePath);
  if (!fileExists) {
    issues.push({ severity: 'low', msg: `Arquivo não encontrado: "${relPath}" — será criado ou erro de path` });
    riskScore += 5;
  }

  return { issues, riskScore, fileExists };
}

// ── Verificador principal — V1.4 ──────────────────────────────────────────
// Assinatura: verify(patches, projectPath, rcaRisk, scanResult)
// scanResult: { found, relativePath, approvedTargets?, agentTargets? }
//
// V1.4: além de verificar patch.file ∈ approvedTargets (target lock),
// verifica também patch.agentKey tem permissão para aquele target:
//   agentTargets[patch.agentKey] === patch.file   → autorizado
//   agentKey === 'unknown' com targetConfidence ≥ 70 → aceito com aviso
//   agentKey ausente / 'unknown' + confidence baixa → issue medium
function verify(patches, projectPath, rcaRisk = 'low', scanResult = null) {
  if (!patches || patches.length === 0) {
    return { ok: true, risk: 'low', score: 0, issues: [], verdict: 'Sem patches para verificar' };
  }

  const allIssues  = [];
  let   totalScore = 0;

  const normalize = s => (s || '').replace(/\\/g, '/');

  // ── Target Lock + Agent Authorization ────────────────────────────────────
  if (scanResult?.found) {
    const approved     = scanResult.approvedTargets?.length
      ? scanResult.approvedTargets
      : [scanResult.relativePath];
    const agentTargets = scanResult.agentTargets || {};

    for (let i = 0; i < patches.length; i++) {
      const patch     = patches[i];
      const pf        = patch.file || '';
      const agentKey  = patch.agentKey || 'unknown';
      const patchIdx  = i + 1;

      // 1. Target lock — patch.file deve estar na lista aprovada
      const targetOk = approved.some(t => normalize(t) === normalize(pf));
      if (!targetOk) {
        allIssues.push({
          severity: 'high', patch: patchIdx, file: pf,
          msg: `Target lock: "${pf}" não está nos targets aprovados (${approved.join(', ')})`,
          rule: 'target_lock',
        });
        totalScore += 50;
        console.log(`[AEGIS] 🔴 [patch ${patchIdx}] Target mismatch: "${pf}" ∉ {${approved.join(', ')}}`);
        continue; // não checar agentKey se o target já é inválido
      }

      // 2. Agent authorization — agentKey deve ter aquele target mapeado
      if (agentKey === 'unknown') {
        // Sem agentKey: aceitar se targetConfidence ≥ 70, senão issue medium
        const tc = typeof patch.targetConfidence === 'number' ? patch.targetConfidence : 0;
        if (tc >= 70) {
          console.log(`[AEGIS] 🟡 [patch ${patchIdx}] agentKey ausente mas targetConfidence=${tc}% — aceito com aviso`);
          allIssues.push({
            severity: 'low', patch: patchIdx, file: pf,
            msg: `agentKey não declarado (targetConfidence=${tc}%) — patch aceito com rastreabilidade reduzida`,
            rule: 'agent_attribution',
          });
          totalScore += 5;
        } else {
          allIssues.push({
            severity: 'medium', patch: patchIdx, file: pf,
            msg: `agentKey ausente e targetConfidence baixo (${tc}%) — origin do patch não verificada`,
            rule: 'agent_attribution',
          });
          totalScore += 20;
          console.log(`[AEGIS] 🟡 [patch ${patchIdx}] agentKey=unknown, targetConfidence=${tc}%`);
        }
      } else {
        // Com agentKey declarado: verificar se aquele agente existe no MissionPlan
        // e se tem autorização para o target específico
        const authorizedTarget = agentTargets[agentKey];

        if (!authorizedTarget) {
          // agentKey inventado pelo LLM — não existe no MissionPlan
          allIssues.push({
            severity: 'high', patch: patchIdx, file: pf,
            msg: `Agent "${agentKey}" não existe no MissionPlan ou não possui target autorizado`,
            rule: 'agent_authorization',
          });
          totalScore += 40;
          console.log(`[AEGIS] 🔴 [patch ${patchIdx}] agentKey="${agentKey}" não encontrado em agentTargets`);
        } else if (normalize(authorizedTarget) !== normalize(pf)) {
          // agentKey existe mas o target não bate
          allIssues.push({
            severity: 'high', patch: patchIdx, file: pf,
            msg: `Agent "${agentKey}" não tem autorização para "${pf}" (target autorizado: "${authorizedTarget}")`,
            rule: 'agent_authorization',
          });
          totalScore += 40;
          console.log(`[AEGIS] 🔴 [patch ${patchIdx}] ${agentKey} → "${pf}" não autorizado (esperado: "${authorizedTarget}")`);
        } else {
          // agente autorizado e target correto
          const tc = patch.targetConfidence;
          const tcStr = typeof tc === 'number' ? ` | targetConfidence=${tc}%` : '';
          console.log(`[AEGIS] ✔ [patch ${patchIdx}] ${agentKey} → "${pf}"${tcStr}`);
        }
      }
    }
  }

  // ── Checks individuais de risco ──────────────────────────────────────────
  for (let i = 0; i < patches.length; i++) {
    const { issues, riskScore } = checkPatch(patches[i], projectPath);
    for (const issue of issues) {
      allIssues.push({ patch: i + 1, file: patches[i].file, ...issue });
    }
    totalScore += riskScore;
  }

  // RCA boost
  const rcaBoost = { high: 25, medium: 10, low: 0 };
  totalScore += rcaBoost[rcaRisk] || 0;
  totalScore  = Math.min(100, totalScore);

  // Risco final
  const hasHighIssue = allIssues.some(i => i.severity === 'high');
  const risk = hasHighIssue || totalScore >= 60 ? 'high'
             : totalScore >= 30                  ? 'medium'
             :                                    'low';

  const ok      = risk !== 'high';
  const verdict = risk === 'high'
    ? `BLOQUEADO — ${allIssues.filter(i => i.severity === 'high').map(i => i.msg).join('; ')}`
    : risk === 'medium' ? 'APROVADO com ressalvas — revisão recomendada'
    :                    'APROVADO — risco baixo';

  console.log(`[AEGIS] Resultado: score=${totalScore} | risk=${risk.toUpperCase()} | patches=${patches.length} | ok=${ok}`);
  for (const i of allIssues) {
    const icon = i.severity === 'high' ? '🔴' : i.severity === 'medium' ? '🟡' : '🟢';
    if (i.severity !== 'low') console.log(`[AEGIS] ${icon} [patch ${i.patch}] ${i.msg}`);
  }
  if (!allIssues.length) console.log('[AEGIS] ✔ Todos os checks passaram');

  return { ok, risk, score: totalScore, issues: allIssues, verdict };
}

module.exports = { verify, checkPatch, PROTECTED_PATHS, DANGER_PATTERNS };
