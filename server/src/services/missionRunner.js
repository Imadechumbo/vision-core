'use strict';

/**
 * VISION CORE V2.3.4 — Mission Runner
 *
 * Pipeline completo com todos os módulos integrados:
 *
 *  1. OpenClaw Router → interpreta missão, produz MissionPlan
 *  2. Log Collector   → logs reais do projeto
 *  3. File Scanner    → consume MissionPlan (hints + categoria)
 *  4. Hermes RCA      → recebe scanResult obrigatório + planContext
 *  5. Aegis           → verifica risco dos patches antes de aplicar
 *  6. Patch Engine    → só aplica patch com target validado pelo Aegis
 *  7. Validator       → node --check + npm test com streaming
 *  8. PASS GOLD       → baseado em execução real
 *  9. GitHub PR       → se GOLD + AUTO_PR
 * 10. Streaming SSE   → cada passo emitido em tempo real
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const { helpers }                    = require('../db/sqlite');
const { analyzeError }               = require('./hermesRca');
const { route, buildPlanContext }    = require('./openclawRouter');
const { scanProject, scanAllAgents, buildFileContext } = require('./fileScanner');
const { applyPatches, rollbackMission } = require('./patchEngine');
const { verify: aegisVerify }        = require('./aegis');
const { evaluate }                   = require('./passGoldEngine');
const { collectLogs }                = require('./logCollector');
const { createPR }                   = require('./githubService');
const { emitStep, emit, withLogCapture, closeStream } = require('./streamRunner');
const { checkSyntax, runTests, runHealthCheck } = require('./commandRunner');
const memory        = require('./hermesMemory');
const harness       = require('./harnessMetrics');
const { evaluate: escalate, selectReserveAgents } = require('./escalationPolicy');
const openSquad     = require('./openSquadReserve');
const { buildSkillContext } = require('./skillContextBuilder');
const guard                  = require('./moduleGuard');

const CONFIDENCE_THRESHOLD = Number(process.env.CONFIDENCE_THRESHOLD || 60);
const AUTO_PR              = process.env.AUTO_PR !== 'false';

function missionId() {
  return `mission_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// ── Pipeline principal ────────────────────────────────────────────────────
async function runMission(projectId, errorInput, options = {}) {
  const id        = options.mission_id || missionId();
  const startedAt = Date.now();
  const timeline  = [];
  const dryRun    = !!options.dry_run;

  function step(label, status = 'ok', detail = '') {
    const elapsed = Date.now() - startedAt;
    const entry   = emitStep(id, label, status, detail, elapsed);
    timeline.push(entry);
    return elapsed;
  }

  // Carregar projeto
  const project = helpers.getProject.get(projectId);
  if (!project) return { ok: false, error: `Projeto '${projectId}' não encontrado` };

  const projectPath = project.path;
  if (!fs.existsSync(projectPath)) return { ok: false, error: `Path não existe: ${projectPath}` };

  helpers.insertMission.run({ id, project_id: projectId, status: 'running', error_input: errorInput.slice(0, 2000) });
  step('Missão iniciada', 'ok', `${project.name} | ${dryRun ? 'DRY RUN' : 'SAFE PATCH'}`);

  const { restore: restoreLog } = withLogCapture(id);
  try {
    return await _pipeline(id, project, projectPath, errorInput, options, dryRun, step, timeline, startedAt);
  } finally {
    restoreLog();
    closeStream(id);
  }
}

async function _pipeline(id, project, projectPath, errorInput, options, dryRun, step, timeline, startedAt) {

  // ── 1. OPENCLAW ROUTER ───────────────────────────────────────────────────
  step('OpenClaw Router — interpretando missão...', 'running');
  const missionPlan = route(errorInput, { description: options.description });
  step('Plano criado', 'ok',
    `${missionPlan.category} | ${missionPlan.priority.toUpperCase()} | agentes: ${missionPlan.agentNames.join(', ')}`
  );
  emit(id, 'plan', missionPlan);

  // ── 2. LOGS REAIS ────────────────────────────────────────────────────────
  step('Coletando logs...', 'running');
  let logResult = null;
  try {
    logResult = await collectLogs(projectPath, { logPath: options.logPath });
    step(
      logResult ? 'Logs coletados' : 'Sem logs detectados', 'ok',
      logResult ? `${logResult.errors?.length || 0} erros via ${logResult.source}` : ''
    );
  } catch (e) {
    step('Logs indisponíveis', 'ok', e.message);
  }

  // ── 3. FILE SCANNER V1.3 — scan por agente + multi-target ──────────────
  //
  // Fix 4: OpenSquad Locator roda ANTES do scanner quando needs_target é provável.
  // Pré-avaliação rápida: se scanner pode falhar (categoria genérica ou erros
  // com sinais fracos), acionar locator para enriquecer scanHints ANTES do scan.
  const preScanEscalation = escalate({
    hermesConfidence: null,
    rcaRootCause:     null,
    targetCount:      0,
    patchCount:       0,
    aegisRisk:        null,
    aegisScore:       0,
    validationStatus: null,
    scanFound:        null,          // ainda não sabemos
    blockedPatterns:  0,
    retryCount:       options.retryCount || 0,
    skipUnknownCause: true,
  });

  // Se categoria genérica ou sem hints fortes → acionar locator pré-scan
  const categoryIsWeak = missionPlan.category === 'generic' || missionPlan.scanHints.length < 3;
  if (categoryIsWeak) {
    const locatorAgents = ['locator', 'memory'];
    step('OpenSquad Locator — enriquecendo hints pré-scan...', 'running');
    const locatorResult = openSquad.activate(locatorAgents, {
      errorInput, missionPlan, rca: null,
      patchResult: null, validation: null, aegisResult: null, scanResult: null,
    });
    if (locatorResult.extraHints.length) {
      missionPlan.scanHints = [...new Set([...missionPlan.scanHints, ...locatorResult.extraHints])];
      // Também injetar nos agentScanHints de cada agente do plano
      for (const key of Object.keys(missionPlan.agentScanHints || {})) {
        missionPlan.agentScanHints[key] = [
          ...new Set([...(missionPlan.agentScanHints[key] || []), ...locatorResult.extraHints]),
        ];
      }
      step('Locator: hints enriquecidos', 'ok',
        `+${locatorResult.extraHints.length} hints: ${locatorResult.extraHints.slice(0, 5).join(', ')}`
      );
    }
  }

  step('File Scanner — localizando targets por agente...', 'running');
  let scanResult   = null;
  let multiScan    = null;

  try {
    multiScan  = scanAllAgents(projectPath, errorInput, missionPlan);
    scanResult = multiScan.primary;
    missionPlan.approvedTargets = multiScan.approvedTargets;
    missionPlan.agentTargets    = multiScan.agentTargets;
  } catch (e) {
    step('Scanner falhou', 'fail', e.message);
  }

  emit(id, 'scan', {
    found:          scanResult?.found      ?? false,
    file:           scanResult?.file       ?? null,
    score:          scanResult?.score      ?? 0,
    category:       scanResult?.category   ?? missionPlan.category,
    approvedTargets: missionPlan.approvedTargets,
    agentTargets:    missionPlan.agentTargets,
    candidates:     scanResult?.allCandidates ?? [],
  });

  // ── NEEDS_TARGET GATE ────────────────────────────────────────────────────
  // Fix 4: se scanner ainda falhou após locator, acionar re-scan com hints extras
  if (!scanResult?.found) {
    // Tentar re-scan com locator se ainda não tentamos (categoria forte)
    if (!categoryIsWeak) {
      step('NEEDS_TARGET — tentando re-scan com OpenSquad Locator...', 'running');
      const locatorRetry = openSquad.activate(['locator', 'memory'], {
        errorInput, missionPlan, rca: null,
        patchResult: null, validation: null, aegisResult: null, scanResult: null,
      });

      if (locatorRetry.extraHints.length) {
        missionPlan.scanHints = [...new Set([...missionPlan.scanHints, ...locatorRetry.extraHints])];
        // Re-scan com hints enriquecidos
        try {
          const reScan = scanAllAgents(projectPath, errorInput, missionPlan);
          if (reScan.primary?.found) {
            scanResult = reScan.primary;
            multiScan  = reScan;
            missionPlan.approvedTargets = reScan.approvedTargets;
            missionPlan.agentTargets    = reScan.agentTargets;
            step('Re-scan localizou target', 'ok',
              `${scanResult.relativePath} (score=${scanResult.score})`
            );
          }
        } catch { /* re-scan falhou silenciosamente */ }
      }
    }

    // Se ainda não encontrou — bloquear
    if (!scanResult?.found) {
      step(
        'NEEDS_TARGET — scanner não encontrou arquivo alvo validado',
        'fail',
        'Nenhum arquivo com sinais suficientes. Forneça mais contexto ou --log.'
      );
      return finalize(id, 'needs_target', {
        errorInput, scanResult, missionPlan, timeline,
        duration_ms: Date.now() - startedAt,
      });
    }
  }

  // ── TARGET LOCK ──────────────────────────────────────────────────────────
  const targetsStr = missionPlan.approvedTargets.length > 1
    ? `${missionPlan.approvedTargets.length} targets: ${missionPlan.approvedTargets.join(', ')}`
    : `${scanResult.relativePath} (score=${scanResult.score})`;

  step('Target Lock — arquivo(s) validado(s) pelo scanner', 'ok',
    `${targetsStr} | sinais: ${scanResult.matched.slice(0, 3).join(', ')}`
  );

  // ── V1.6.3: SKILL CONTEXT — montar systemPrompt antes do Hermes ──────────
  let skillContext = null;
  try {
    skillContext = buildSkillContext(missionPlan, {
      projectRoot:  projectPath,
      scanResult,
      mode:         options.benchmark ? 'benchmark' : options.learning ? 'learning' : 'mission',
      missionInput: errorInput,
    });
    if (skillContext.warnings.length) {
      console.warn('[SKILL] Warnings:', skillContext.warnings.join('; '));
    }
    step('Skill context montado', 'ok',
      `skills=[${skillContext.skillNames.join(', ')}] refs=${skillContext.referencesUsed.length}`
    );
  } catch (e) {
    console.warn('[SKILL] skillContextBuilder falhou — usando fallback interno mínimo:', e.message);
    // Fallback mínimo garantido: nunca seguir sem nenhum contexto de skill
    skillContext = {
      systemPrompt: null,          // hermesRca usará HERMES_SYSTEM padrão
      skillNames:   ['pass-gold-validation', 'aegis-enforcement'],
      referencesUsed: [],
      warnings: [`skillContextBuilder falhou: ${e.message}`],
    };
  }

  // Garantia: skillContext nunca undefined a partir daqui
  if (!skillContext || !skillContext.skillNames) {
    skillContext = { systemPrompt: null, skillNames: [], referencesUsed: [], warnings: [] };
  }

  // ── 4. HERMES RCA — contexto de múltiplos targets + agentTargets ────────
  step('Hermes RCA — analisando com contexto real...', 'running');

  // V1.5: signals reais (matched pelo scanner) + scanHints do plano
  const memorySignals = [
    ...(scanResult?.matched    || []),
    ...(missionPlan.scanHints  || []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const relevantMemory = memory.findRelevantMemory({
    category: missionPlan.category,
    signals:  memorySignals,
  });
  const memoryContext  = memory.formatForPrompt(relevantMemory);
  const memInfluence   = memory.getMemoryInfluence(relevantMemory);

  // ── ESCALATION — avaliar complexidade e acionar reserva se necessário ──
  const preEscalation = escalate({
    hermesConfidence: null,          // ainda não temos RCA
    rcaRootCause:     null,
    targetCount:      missionPlan.approvedTargets.length,
    patchCount:       0,
    aegisRisk:        null,
    aegisScore:       0,
    validationStatus: null,
    scanFound:        scanResult?.found,
    blockedPatterns:  relevantMemory.blocked.length,
    retryCount:       options.retryCount || 0,
    skipUnknownCause: true,         // Fix 3: sem RCA ainda, não avaliar causa desconhecida
  });

  // Acionar OpenSquad Reserve se necessário antes do Hermes
  let opensquadPre = null;
  if (preEscalation.needsOpenSquad || preEscalation.needsLocator) {
    const reserveAgents = selectReserveAgents(preEscalation, {
      errorInput, missionPlan, rca: null, patchResult: null,
      validation: null, aegisResult: null, scanResult,
    });
    if (reserveAgents.length) {
      step(`OpenSquad Reserve — ${reserveAgents.join(', ')}`, 'running');
      opensquadPre = openSquad.activate(reserveAgents, {
        errorInput, missionPlan, rca: null,
        patchResult: null, validation: null, aegisResult: null, scanResult,
      });
      // Injetar hints extras do OpenSquad no contexto do scanner
      if (opensquadPre.extraHints.length) {
        missionPlan.scanHints = [...new Set([...missionPlan.scanHints, ...opensquadPre.extraHints])];
      }
      emit(id, 'opensquad_reserve', { phase: 'pre_hermes', ...opensquadPre });
      step(`OpenSquad: ${opensquadPre.recommendation}`, opensquadPre.recommendation.startsWith('BLOCK') ? 'fail' : 'ok',
        `agents: ${opensquadPre.agentsUsed.join(', ')} | +${opensquadPre.extraHints.length} hints`);
    }
  }

  if (memoryContext) {
    const parts = [
      `validated=${relevantMemory.validated.length}`,
      `failures=${relevantMemory.failures.length}`,
      `blocked=${relevantMemory.blocked.length}`,
      `targetMiss=${relevantMemory.targetMiss.length}`,
      memInfluence.reuseStrategy  ? '▶ estratégia reutilizável'  : null,
      memInfluence.forbidPatterns.length ? `⛔ ${memInfluence.forbidPatterns.length} padrão(ões) proibido(s)` : null,
    ].filter(Boolean).join(' | ');
    step('Memória carregada', 'ok', parts);
  }

  let fileContext = buildFileContext(scanResult);
  if (multiScan && missionPlan.approvedTargets.length > 1) {
    const extra = [];
    for (const [agentKey, agResult] of Object.entries(multiScan.byAgent)) {
      if (agResult.found && agResult.relativePath !== scanResult.relativePath) {
        extra.push(`=== TARGET ADICIONAL (${agentKey}): ${agResult.relativePath} ===`);
        extra.push((agResult.content || '').slice(0, 800));
      }
    }
    if (extra.length) fileContext += '\n\n' + extra.join('\n');
  }

  let memoryInfluenceContext = '';
  if (memInfluence.hasInfluence) {
    const lines = [];
    if (memInfluence.reuseStrategy) {
      lines.push(`=== ESTRATÉGIA VALIDADA (reutilize) ===`);
      lines.push(`Causa: ${memInfluence.reuseStrategy.rootCause}`);
      lines.push(`Patch: ${memInfluence.reuseStrategy.patchSummary}`);
      if (memInfluence.reuseStrategy.patchFiles.length) {
        lines.push(`Arquivos alvo: ${memInfluence.reuseStrategy.patchFiles.join(', ')}`);
      }
    }
    if (memInfluence.forbidPatterns.length) {
      lines.push(`=== PADRÕES PROIBIDOS (nunca repita) ===`);
      for (const fp of memInfluence.forbidPatterns) {
        lines.push(`• ${fp.rootCause}`);
        for (const i of fp.aegisIssues.slice(0, 1)) {
          lines.push(`  Bloqueio: ${i.rule} — ${i.msg}`);
        }
      }
    }
    memoryInfluenceContext = lines.join('\n');
  }

  // ── GUARD: Hermes só roda com scanResult válido (ModuleGuard enforced) ──
  guard.assertHermesCanRun(scanResult);
  guard.logPipelineState('pre-Hermes', { scanResult, module: 'Hermes' });

  let rca;
  try {
    rca = await analyzeError(errorInput, {
      projectPath,
      logContext:       logResult ? buildLogContext(logResult) : '',
      memoryContext:    [memoryContext, memoryInfluenceContext].filter(Boolean).join('\n\n'),
      planContext:      buildPlanContext(missionPlan),
      fileContext,
      scanResult,
      missionPlan,                                              // V1.6.3: gate hermesRequiresScanResult
      agentTargets:     missionPlan.agentTargets,
      projectStack:     project.stack,
      skillSystemPrompt: skillContext?.systemPrompt || null,
      skillNames:        skillContext?.skillNames    || [],
    });
  } catch (e) {
    step('Hermes falhou', 'fail', e.message);
    return finalize(id, 'failed', { error: e.message, timeline, duration_ms: Date.now() - startedAt });
  }

  step('RCA concluído', 'ok',
    `${rca.cause?.slice(0, 70)} | ${rca.confidence}% | risco: ${rca.risk} | ${rca.patches?.length || 0} patch(es)`
  );

  // ── ESCALATION FINAL — agora com RCA completo ─────────────────────────
  const finalEscalation = escalate({
    hermesConfidence: rca.confidence,
    rcaRootCause:     rca.cause,
    targetCount:      missionPlan.approvedTargets.length,
    patchCount:       rca.patches?.length || 0,
    aegisRisk:        null,    // Aegis ainda não rodou
    aegisScore:       0,
    validationStatus: null,
    scanFound:        scanResult?.found,
    blockedPatterns:  relevantMemory.blocked.length,
    retryCount:       options.retryCount || 0,
  });

  emit(id, 'escalation_policy', finalEscalation);
  if (finalEscalation.level !== 'LEVEL_0' && finalEscalation.level !== 'LEVEL_1') {
    step(`Escalação: ${finalEscalation.level}`, 'ok',
      finalEscalation.reasons.map(r => r.reason).join(' | ')
    );
  }

  // ── Confidence Gate ──────────────────────────────────────────────────────
  if (rca.confidence < CONFIDENCE_THRESHOLD) {
    step(`Confidence gate: ${rca.confidence}% < ${CONFIDENCE_THRESHOLD}%`, 'fail');
    const gold = evaluate(id, rca, logResult, null, null, []);
    return finalize(id, 'requires_review', { rca, gold, scanResult, errorInput, missionPlan, timeline, escalation: finalEscalation, relevantMemory, memInfluence, duration_ms: Date.now() - startedAt });
  }

  // ── Sem patches ──────────────────────────────────────────────────────────
  if (!rca.patches?.length) {
    step('Sem patches automáticos — revisão manual', 'fail');
    const gold = evaluate(id, rca, logResult, null, null, []);
    return finalize(id, 'no_patch', { rca, gold, scanResult, errorInput, missionPlan, timeline, escalation: finalEscalation, relevantMemory, memInfluence, duration_ms: Date.now() - startedAt });
  }

  // ── 5. AEGIS ─────────────────────────────────────────────────────────────
  step('Aegis — verificando risco, target lock e autorização por agente...', 'running');
  const scanResultForAegis = {
    ...scanResult,
    approvedTargets: missionPlan.approvedTargets,
    agentTargets:    missionPlan.agentTargets,
  };
  const aegisResult = aegisVerify(rca.patches, projectPath, rca.risk, scanResultForAegis);
  step(
    `Aegis: ${aegisResult.risk.toUpperCase()} (score=${aegisResult.score})`,
    aegisResult.ok ? 'ok' : 'fail',
    aegisResult.verdict
  );
  emit(id, 'aegis', aegisResult);

  // ── DRY RUN — depois do Aegis (Fix 1) ───────────────────────────────────
  // Simula bloqueio do Aegis em dry-run — não aplica nada mas reporta o que aconteceria
  if (dryRun) {
    const wouldBlock = !aegisResult.ok;
    step(
      wouldBlock ? 'DRY RUN — Aegis bloquearia este patch' : 'DRY RUN — nenhum arquivo alterado',
      wouldBlock ? 'fail' : 'ok',
      wouldBlock
        ? `wouldBlock: ${aegisResult.verdict}`
        : `wouldPatch: ${rca.patches?.length || 0} patch(es) em ${scanResult.relativePath}`
    );
    return finalize(id, 'dry_run', {
      rca, scanResult, missionPlan, errorInput,
      aegis:     aegisResult,
      wouldPatch: !wouldBlock && rca.patches?.length > 0
        ? { count: rca.patches.length, files: rca.patches.map(p => p.file), target: scanResult.relativePath }
        : null,
      wouldBlock,
      escalation: finalEscalation,
      relevantMemory, memInfluence,
      timeline, duration_ms: Date.now() - startedAt,
    });
  }

  // Escalação pós-Aegis — agora com risco real
  const postAegisEscalation = escalate({
    hermesConfidence: rca.confidence,
    rcaRootCause:     rca.cause,
    targetCount:      missionPlan.approvedTargets.length,
    patchCount:       rca.patches?.length || 0,
    aegisRisk:        aegisResult.risk,
    aegisScore:       aegisResult.score,
    validationStatus: null,
    scanFound:        scanResult?.found,
    blockedPatterns:  relevantMemory.blocked.length,
    retryCount:       options.retryCount || 0,
  });

  // OpenSquad reserva pós-Aegis se necessário
  let opensquadPost = null;
  if (postAegisEscalation.needsOpenSquad && !aegisResult.ok) {
    const postAgents = selectReserveAgents(postAegisEscalation, {
      errorInput, missionPlan, rca, patchResult: null, validation: null, aegisResult, scanResult,
    });
    if (postAgents.length) {
      opensquadPost = openSquad.activate(postAgents, {
        errorInput, missionPlan, rca, patchResult: null, validation: null, aegisResult, scanResult,
      });
      emit(id, 'opensquad_reserve', { phase: 'post_aegis', ...opensquadPost });
    }
  }

  if (!aegisResult.ok) {
    step('Aegis bloqueou — PatchEngine não executado', 'fail', aegisResult.verdict);
    const gold = evaluate(id, rca, logResult, null, null, []);
    return finalize(id, 'aegis_blocked', {
      rca, gold, aegis: aegisResult, scanResult, errorInput, missionPlan, timeline,
      escalation: postAegisEscalation, opensquad: opensquadPost,
      relevantMemory, memInfluence, duration_ms: Date.now() - startedAt,
    });
  }

  // ── 6. PATCH ENGINE — target validado pelo Aegis ─────────────────────────
  // GUARD: Aegis deve ter aprovado — fail fast se não ─────────────────────
  guard.assertAegisOk(aegisResult);
  guard.logPipelineState('pre-PatchEngine', { scanResult, aegisResult, module: 'PatchEngine' });
  step(`Aplicando ${rca.patches.length} patch(es) em ${scanResult.relativePath}...`, 'running');
  const patchResult = applyPatches(projectPath, rca.patches, id, project.id);

  if (!patchResult.ok) {
    step('Patch falhou — rollback automático', 'fail', patchResult.error);
    const gold = evaluate(id, rca, logResult, patchResult, null, []);
    return finalize(id, 'patch_failed', {
      rca, patchResult, gold, aegis: aegisResult, scanResult, errorInput, missionPlan, timeline,
      duration_ms: Date.now() - startedAt,
    });
  }

  step('Patches aplicados', 'ok',
    `${patchResult.applied} arquivo(s): ${patchResult.filesAffected?.join(', ')}`
  );

  // ── 7. VALIDATOR ─────────────────────────────────────────────────────────
  step('Validação de sintaxe...', 'running');
  const syntaxResults = [];
  for (const pf of [...new Set(rca.patches.map(p => p.file))]) {
    const fp = path.join(projectPath, pf);
    const r  = await checkSyntax(fp, (line, stream) => {
      emit(id, 'log', { level: stream === 'stderr' ? 'warn' : 'info', text: line, ts: Date.now() });
    });
    syntaxResults.push({ file: pf, ok: r.ok, error: r.stderr?.slice(0, 200) });
  }

  const syntaxOk = syntaxResults.every(r => r.ok);
  if (!syntaxOk) {
    const bad = syntaxResults.find(r => !r.ok);
    step('Sintaxe inválida — rollback automático', 'fail', bad?.error || '');
    rollbackMission(id);
    const validation = { ok: false, files: syntaxResults, tests: { configured: false, ok: false }, health: { configured: !!project.health_url, ok: false } };
    const gold = evaluate(id, rca, logResult, patchResult, validation, patchResult.snapshots || []);
    return finalize(id, 'validation_failed', {
      rca, patchResult, validation, gold, aegis: aegisResult, scanResult, errorInput, missionPlan, timeline,
      duration_ms: Date.now() - startedAt,
    });
  }
  step('Sintaxe OK ✔', 'ok', syntaxResults.map(r => r.file).join(', '));

  // npm test
  let testResult = null;
  const pkgPath  = path.join(projectPath, 'package.json');
  let   hasTests = false;
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      hasTests = !!(pkg.scripts?.test && !pkg.scripts.test.includes('no test'));
    } catch { /* ignorar */ }
  }

  if (hasTests) {
    step('Rodando testes (npm test)...', 'running');
    const testLines = [];
    const testRes   = await runTests(projectPath, (line, stream) => {
      testLines.push(line);
      emit(id, 'log', { level: stream === 'stderr' ? 'warn' : 'info', text: line, ts: Date.now() });
    });
    testResult = { configured: true, ok: testRes.ok, output: testLines.slice(-20).join('\n'), code: testRes.code };

    if (!testResult.ok) {
      step('Testes falharam — rollback automático', 'fail', `exit ${testRes.code}`);
      rollbackMission(id);
      const validation = { ok: false, files: syntaxResults, tests: testResult, health: { configured: !!project.health_url, ok: false } };
      const gold = evaluate(id, rca, logResult, patchResult, validation, patchResult.snapshots || []);
      return finalize(id, 'validation_failed', {
        rca, patchResult, validation, gold, aegis: aegisResult, scanResult, errorInput, missionPlan, timeline,
        duration_ms: Date.now() - startedAt,
      });
    }
    step('Testes passaram ✔', 'ok', `${testLines.length} linha(s)`);
  } else {
    testResult = { configured: false, ok: false, skipped: true, error: 'package.json sem script test válido' };
    step('Sem suite de testes configurada — GOLD bloqueado', 'fail', 'PASS GOLD exige npm test real');
  }

  step('Healthcheck do projeto...', 'running');
  const healthResult = await runHealthCheck(project.health_url, (line, stream) => {
    emit(id, 'log', { level: stream === 'stderr' ? 'warn' : 'info', text: line, ts: Date.now() });
  });
  step(healthResult.ok ? 'Healthcheck OK ✔' : 'Healthcheck indisponível — GOLD bloqueado', healthResult.ok ? 'ok' : 'fail', healthResult.error || project.health_url || 'health_url ausente');

  const validation = { ok: syntaxOk && testResult.ok === true && healthResult.ok === true, files: syntaxResults, tests: testResult, health: healthResult };

  // ── 8. PASS GOLD ─────────────────────────────────────────────────────────
  step('Calculando PASS GOLD...', 'running');
  const gold = evaluate(id, rca, logResult, patchResult, validation, patchResult.snapshots || []);
  step(`PASS GOLD: ${gold.level} — ${gold.final}/100`, gold.pass_gold ? 'ok' : 'fail', gold.verdict);
  emit(id, 'gold', gold);

  // ── 9. PR ────────────────────────────────────────────────────────────────
  let pr = { ok: false, skipped: !AUTO_PR };
  if (AUTO_PR && gold.pass_gold) {
    // GUARD: PR só criado com PASS GOLD confirmado ─────────────────────────
    guard.assertPassGold(gold);
    guard.logPipelineState('pre-PR', { scanResult, aegisResult, goldResult: gold, module: 'PassGold' });
    step('Criando PR no GitHub...', 'running');
    try {
      const branch = `vision-core/${id.slice(-12)}`;
      pr = await createPR(projectPath, branch, rca, gold);
      step(pr.ok ? 'PR criada ✔' : 'PR falhou (patches OK)', pr.ok ? 'ok' : 'fail', pr.branch || pr.error);
    } catch (e) {
      step('PR falhou', 'fail', e.message);
      pr = { ok: false, error: e.message };
    }
  }

  // ── 10. FINALIZAR ────────────────────────────────────────────────────────
  step('Missão concluída', 'ok');
  const status = gold.pass_gold ? 'success' : 'requires_review';
  return finalize(id, status, {
    rca, patchResult, validation, gold, pr,
    aegis: aegisResult, scanResult, errorInput, missionPlan, timeline,
    escalation: postAegisEscalation, opensquad: opensquadPost || opensquadPre,
    relevantMemory, memInfluence,
    duration_ms: Date.now() - startedAt,
  });
}

// ── Finalizar e persistir ─────────────────────────────────────────────────
function finalize(id, status, data) {
  const { rca, patchResult, validation, gold, pr, timeline, duration_ms } = data;

  try {
    helpers.updateMission.run({
      id, status,
      rca_cause:     rca?.cause    || null,
      rca_fix:       rca?.fix      || null,
      rca_confidence: rca?.confidence || 0,
      rca_risk:      rca?.risk     || 'unknown',
      rca_source:    rca?.source   || null,
      patches_count: patchResult?.applied || 0,
      pass_gold:     gold?.pass_gold ? 1 : 0,
      gold_score:    gold?.final   || 0,
      gold_level:    gold?.level   || 'NEEDS_REVIEW',
      pr_branch:     pr?.branch    || null,
      pr_url:        pr?.pr_url    || null,
      duration_ms:   duration_ms  || 0,
      log_source:    null,
      narrative:     null,
    });
  } catch (e) {
    console.error('[MISSION] Erro ao finalizar no banco:', e.message);
  }

  const result = {
    ok: status === 'success',
    id, status,
    rca:         rca         || null,
    patchResult: patchResult || null,
    validation:  validation  || null,
    gold:        gold        || null,
    pr:          pr          || null,
    aegis:       data.aegis  || null,
    missionPlan: data.missionPlan || null,
    scanResult:  data.scanResult  || null,
    timeline:    timeline    || [],
    duration_ms: duration_ms || 0,
  };

  try { emit(id, 'result', result); } catch { /* ignorar */ }

  // V2.3.4: Aprendizado controlado — PASS GOLD obrigatório para validated_memory
  // Regra: SEM PASS GOLD → nada aprende como estratégia válida
  // Falhas e bloqueios ainda gravam para fins de diagnóstico (failure/blocked/target_miss)
  // mas NÃO influenciam a reutilização de estratégias (validated_memory fica protegido).
  try {
    const isGold = result.gold?.pass_gold === true && status === 'success';
    if (isGold) {
      // PASS GOLD confirmado → grava em validated_memory via recordMission
      guard.assertPassGold(result.gold); // assertiva dupla — fail fast se inconsistente
      memory.recordMission({
        input:        data.errorInput   || null,
        missionPlan:  data.missionPlan  || null,
        scanResult:   data.scanResult   || null,
        rcaResult:    result.rca        || null,
        aegisResult:  result.aegis      || null,
        finalStatus:  status,
        gold:         result.gold,
      });
    } else {
      // SEM PASS GOLD → grava apenas como histórico negativo (failure/blocked/target_miss)
      // validated_memory NÃO é tocado — estratégia NÃO é aprendida
      memory.recordMission({
        input:        data.errorInput   || null,
        missionPlan:  data.missionPlan  || null,
        scanResult:   data.scanResult   || null,
        rcaResult:    result.rca        || null,
        aegisResult:  result.aegis      || null,
        finalStatus:  status,
        gold:         null, // forçar classificação como failure/blocked/target_miss
      });
    }
  } catch { /* não bloquear pipeline por erro de memória */ }

  // Harness Metrics — observabilidade completa da missão
  try {
    const harnessCtx = {
      errorInput:      data.errorInput,
      missionPlan:     data.missionPlan,
      scanResult:      data.scanResult,
      multiScan:       null,
      rca:             result.rca,
      patchResult:     result.patchResult,
      validation:      result.validation,
      aegis:           result.aegis,
      gold:            result.gold,
      relevantMemory:  data.relevantMemory,
      escalation:      data.escalation,
      opensquad:       data.opensquad,
      memInfluence:    data.memInfluence,
      duration_ms:     data.duration_ms,
      status,
      retryCount:      0,
    };
    const metrics = harness.record(id, harnessCtx);
    if (metrics) {
      emit(id, 'harness_metrics', metrics);
      // Gerar relatório público do OpenSquad se foi acionado
      if (data.opensquad?.activated) {
        const report = openSquad.generateReport(id, data.escalation, data.opensquad, metrics);
        emit(id, 'opensquad_report', report);
      }
    }
  } catch { /* não bloquear */ }

  return result;
}

// ── Helpers internos ──────────────────────────────────────────────────────
function buildLogContext(logResult, maxChars = 2500) {
  if (!logResult) return '';
  const lines = [`=== LOGS (${logResult.source}) ===`];
  for (const err of (logResult.errors || []).slice(-5)) {
    lines.push(`[${err.timestamp || '?'}] ${err.message}`);
    if (err.stack?.length) lines.push(err.stack.slice(0, 3).join('\n'));
  }
  lines.push('\n--- ÚLTIMAS LINHAS ---');
  lines.push((logResult.lines || []).slice(-20).join('\n'));
  const full = lines.join('\n');
  return full.length > maxChars ? full.slice(-maxChars) : full;
}

function buildMemoryHint(errorSnippet) {
  try {
    const memories = helpers.searchMemory.all();
    const words    = errorSnippet.toLowerCase().split(/\W+/).filter(Boolean);
    const scored   = memories
      .map(m => {
        const text  = (m.error_snippet + ' ' + m.cause).toLowerCase();
        const score = words.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
        return { ...m, score };
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (!scored.length) return '';
    const lines = ['=== MISSÕES ANTERIORES SIMILARES ==='];
    for (const m of scored) {
      lines.push(`- Erro: "${m.error_snippet}"`);
      lines.push(`  Causa: ${m.cause} | Fix: ${m.fix} | ${m.validation_passed ? '✔' : '✗'}`);
    }
    return lines.join('\n');
  } catch { return ''; }
}

function saveMemory(missionId, projectId, errorInput, rca) {
  try {
    helpers.insertMemory.run({
      id:               `mem_${Date.now()}`,
      project_id:       projectId,
      error_snippet:    errorInput.slice(0, 120),
      cause:            rca.cause || '',
      fix:              rca.fix   || '',
      patch_applied:    (rca.patches?.length > 0) ? 1 : 0,
      validation_passed: 0,
      confidence:       rca.confidence || 0,
    });
  } catch { /* ignorar */ }
}

module.exports = { runMission, runMissionPipeline: runMission };
