'use strict';

/**
 * VISION CORE — Hermes RCA Service
 * Cliente LLM multi-provider com fallback automático.
 * Padrão reaproveitado do TechNetGame qwenService (OpenAI-style API).
 * Providers: OpenRouter, Groq, Gemini, Anthropic, Ollama
 */

const https = require('https');
const http  = require('http');

const DEFAULT_TIMEOUT = Number(process.env.HERMES_TIMEOUT_MS || 20000);
const DEFAULT_TOKENS  = Number(process.env.HERMES_MAX_TOKENS || 1024);

// ── Registry de providers ─────────────────────────────────────────────────
function getProviders() {
  const order = (process.env.AI_PROVIDER_ORDER || 'groq,openrouter,gemini,anthropic,ollama')
    .split(',').map(s => s.trim()).filter(Boolean);

  const registry = {
    groq: {
      name: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY || '',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      style: 'openai',
    },
    openrouter: {
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      style: 'openai',
      extraHeaders: { 'HTTP-Referer': 'https://visioncore.dev', 'X-Title': 'VISION CORE' },
    },
    gemini: {
      name: 'Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      style: 'openai',
    },
    anthropic: {
      name: 'Anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      style: 'anthropic',
    },
    ollama: {
      name: 'Ollama',
      baseUrl: `http://${process.env.OLLAMA_HOST || 'localhost'}:${process.env.OLLAMA_PORT || 11434}/v1`,
      apiKey: 'ollama',
      model: process.env.OLLAMA_MODEL || 'mistral',
      style: 'openai',
    },
  };

  return order
    .map(k => registry[k])
    .filter(p => p && p.apiKey);
}

// ── HTTP helper sem dependências externas ─────────────────────────────────
function httpPost(urlStr, headers, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method: 'POST', headers },
      (res) => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode, data: { raw } }); }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

// ── Chamar provider OpenAI-style ──────────────────────────────────────────
async function callOpenAI(provider, system, userPrompt) {
  const body = JSON.stringify({
    model: provider.model,
    max_tokens: DEFAULT_TOKENS,
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt },
    ],
  });
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    Authorization: `Bearer ${provider.apiKey}`,
    ...(provider.extraHeaders || {}),
  };
  const { status, data } = await httpPost(
    `${provider.baseUrl}/chat/completions`, headers, body, DEFAULT_TIMEOUT
  );
  if (status !== 200) throw new Error(`${provider.name} HTTP ${status}`);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${provider.name} resposta vazia`);
  return text;
}

// ── Chamar provider Anthropic ─────────────────────────────────────────────
async function callAnthropic(provider, system, userPrompt) {
  const body = JSON.stringify({
    model: provider.model,
    max_tokens: DEFAULT_TOKENS,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'x-api-key': provider.apiKey,
    'anthropic-version': '2023-06-01',
  };
  const { status, data } = await httpPost(
    `${provider.baseUrl}/messages`, headers, body, DEFAULT_TIMEOUT
  );
  if (status !== 200) throw new Error(`Anthropic HTTP ${status}`);
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Anthropic resposta vazia');
  return text;
}

// ── System prompt de RCA técnico — V1.4 Patch Attribution ────────────────
const HERMES_SYSTEM = `
Você é HERMES, agente especialista em diagnóstico e reparo autônomo de software Node.js/Express.
Analise o erro, logs, plano da missão e arquivo(s) alvo fornecidos. Gere patches com base no código REAL.

REGRAS ABSOLUTAS:
1. Responda SOMENTE com JSON puro. Zero markdown. Zero texto antes ou depois.
2. "patches" é ARRAY — pode ter 0, 1 ou mais itens.
3. "file" DEVE ser o arquivo onde o código foi encontrado (fornecido no contexto como TARGET).
4. "find" DEVE ser um trecho que EXISTE NO ARQUIVO fornecido — copie literalmente.
5. Se não encontrar o trecho exato, use patches: [] e confidence < 50.
6. NUNCA use "server.js" se o contexto mostrar outro arquivo como alvo.
7. "agentKey" DEVE ser o agente responsável por aquele arquivo (ver Plano da Missão).
8. "targetConfidence" é o quanto você tem certeza que o arquivo correto foi alvo (0-100).
9. "reason" explica brevemente por que esse agente é responsável por esse patch.
10. Use VALIDATED PATTERNS como referência quando o contexto atual bater com o código real.
11. Evite FAILED PATTERNS; não repita estratégia que já falhou validação.
12. NUNCA repita BLOCKED PATTERNS do Aegis.
13. Se houver TARGET MISS PATTERNS parecidos, seja mais conservador no arquivo alvo.

FORMATO OBRIGATÓRIO:
{
  "cause": "descrição precisa da causa raiz",
  "fix": "estratégia de correção",
  "confidence": 85,
  "explanation": "raciocínio detalhado",
  "risk": "low|medium|high",
  "requires_manual_review": false,
  "patches": [
    {
      "file": "src/routes/aiRoutes.js",
      "find": "trecho exato do código fornecido no contexto",
      "replace": "trecho corrigido",
      "description": "o que esse patch faz",
      "agentKey": "upload",
      "reason": "req.file é acessado neste arquivo pelo upload handler",
      "targetConfidence": 92,
      "order": 1,
      "allowMultiple": false
    }
  ]
}
`.trim();

// ── Fallback offline — com suporte a scanResult e agentTargets ───────────
function fallbackRca(error, scanResult = null, agentTargets = {}) {

  // Anotar agentKey em um patch usando inferAgentKey
  const annotate = (patch) => ({
    ...patch,
    agentKey:         inferAgentKey(patch.file, agentTargets) || 'unknown',
    reason:           patch.reason || 'padrão offline — agente inferido pelo target',
    targetConfidence: patch.targetConfidence ?? (inferAgentKey(patch.file, agentTargets) ? 80 : 40),
  });
  const patterns = [
    {
      match: /Cannot read propert\w+ of null.*mimetype/i,
      cause: 'req.file é null — middleware de upload não processou o arquivo',
      fix: 'Validar presença de req.file antes de acessar suas propriedades',
      confidence: 90, risk: 'low',
      buildPatch: (scan) => {
        // Se scanner encontrou o arquivo real, usar trechos reais
        if (scan?.found && scan.content) {
          const targetFile = scan.relativePath;

          // Tentar encontrar o ponto exato de acesso ao mimetype no arquivo real
          const lines = scan.content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (/req\.file\.mimetype|req\.file\[.mimetype.\]/.test(line)) {
              // Pegar contexto de 1 linha antes para o find
              const findLine = lines[i];
              const replaceLine = `  if (!req.file) return res.status(400).json({ error: 'file required' });\n${findLine}`;
              return [{
                file: targetFile, find: findLine.trimStart(),
                replace: replaceLine.trimStart(),
                description: 'Guard clause: req.file nulo antes de acessar mimetype',
                order: 1,
              }];
            }
            if (/req\.file\b/.test(line) && !/if.*req\.file/.test(line)) {
              const findLine = lines[i];
              const indent = findLine.match(/^(\s*)/)[1];
              return [{
                file: targetFile,
                find: findLine.trimStart(),
                replace: `if (!req.file) return res.status(400).json({ error: 'file required' });\n${findLine.trimStart()}`,
                description: `Guard clause: req.file nulo em ${targetFile}`,
                order: 1,
              }];
            }
          }

          // Snippet encontrado mas sem linha exata — patch genérico com arquivo correto
          return [{
            file: targetFile,
            find: 'const file = req.file;',
            replace: "const file = req.file;\nif (!file) return res.status(400).json({ error: 'file required' });",
            description: `Guard clause para req.file nulo em ${targetFile}`,
            order: 1,
          }];
        }

        // Sem scanner — patch genérico em server.js
        return [{
          file: 'server.js',
          find: 'const file = req.file;',
          replace: "const file = req.file;\nif (!file) return res.status(400).json({ error: 'file required' });",
          description: 'Guard clause para req.file nulo',
          order: 1,
        }];
      },
    },
    {
      match: /EADDRINUSE/i,
      cause: 'Porta já em uso por outro processo',
      fix: 'Alterar porta padrão ou matar processo conflitante',
      confidence: 95, risk: 'low',
      buildPatch: (scan) => {
        const targetFile = scan?.found ? scan.relativePath : 'server.js';
        return [{
          file: targetFile,
          find: 'process.env.PORT || 3000',
          replace: 'process.env.PORT || 3001',
          description: 'Alterar porta padrão',
          order: 1,
        }];
      },
    },
    {
      match: /Cannot find module/i,
      cause: 'Módulo não encontrado — dependência ausente ou path incorreto',
      fix: 'Executar npm install ou corrigir o import',
      confidence: 80, risk: 'medium',
      buildPatch: () => [],
    },
    {
      match: /ECONNREFUSED/i,
      cause: 'Conexão recusada — serviço externo offline',
      fix: 'Verificar banco de dados ou API externa',
      confidence: 75, risk: 'medium',
      buildPatch: () => [],
    },
  ];

  for (const p of patterns) {
    if (p.match.test(error)) {
      const patches = p.buildPatch(scanResult).map(annotate);
      return {
        cause: p.cause, fix: p.fix, confidence: p.confidence,
        risk: p.risk, patches,
        explanation: `Padrão offline: ${p.match.source}`,
        source: 'hermes_fallback',
        scanResult: scanResult ? {
          file: scanResult.file,
          score: scanResult.score,
          matched: scanResult.matched,
        } : null,
      };
    }
  }

  return {
    cause: 'Causa desconhecida', fix: 'Revisão manual necessária',
    confidence: 0, explanation: '', patches: [], risk: 'high',
    requires_manual_review: true, source: 'hermes_fallback',
  };
}

// ── Normalizar resposta JSON do LLM ───────────────────────────────────────
// ── Inferir agentKey quando o LLM não o forneceu ─────────────────────────
// Usa agentTargets do missionPlan para mapear file → agentKey
function inferAgentKey(patchFile, agentTargets) {
  if (!agentTargets || !patchFile) return null;
  const normalize = s => s.replace(/\\/g, '/');
  const pnorm     = normalize(patchFile);
  for (const [key, target] of Object.entries(agentTargets)) {
    if (normalize(target) === pnorm) return key;
  }
  return null;
}

// ── Normalizar RCA — V1.4: preservar campos de atribuição por agente ─────
function normalizeRca(parsed, source, agentTargets = {}) {
  const patches = (Array.isArray(parsed.patches) ? parsed.patches
    : parsed.patch ? [{ ...parsed.patch, order: 1 }] : [])
    .map((p, i) => ({
      // Campos originais
      file:             p.file             || null,
      find:             p.find             || '',
      replace:          p.replace          || '',
      description:      p.description      || '',
      order:            Number(p.order)    || i + 1,
      allowMultiple:    !!p.allowMultiple,
      // V1.4: campos de atribuição por agente
      agentKey:         p.agentKey         || inferAgentKey(p.file, agentTargets) || 'unknown',
      reason:           p.reason           || '',
      targetConfidence: typeof p.targetConfidence === 'number'
                          ? Math.min(100, Math.max(0, p.targetConfidence))
                          : null,
    }));

  return {
    cause:                  parsed.cause    || 'causa não identificada',
    fix:                    parsed.fix      || 'revisão manual',
    confidence:             Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
    explanation:            parsed.explanation || '',
    patches,
    risk:                   ['low', 'medium', 'high'].includes(parsed.risk) ? parsed.risk : 'medium',
    requires_manual_review: parsed.requires_manual_review ?? (parsed.confidence < 60),
    source:                 source || 'hermes_llm',
  };
}

// ── Análise principal com fallback automático ────────────────────────────
async function analyzeError(errorInput, context = {}) {
  const { scanProject, buildFileContext } = require('./fileScanner');

  // 1. Escanear projeto se não veio scanResult pronto do missionRunner
  let scanResult = context.scanResult || null;
  if (!scanResult && context.projectPath) {
    try {
      scanResult = scanProject(context.projectPath, errorInput, {
        missionPlan: context.missionPlan,
      });
    } catch (e) {
      console.warn('[HERMES] Scanner falhou:', e.message);
    }
  }

  // Gate V1.6.4: Hermes exige scanResult válido POR PADRÃO.
  // Só dispensa quando context.enforceScanResult === false
  // OU missionPlan.gates.hermesRequiresScanResult === false (opt-out explícito).
  const requiresScanResult =
    context.enforceScanResult !== false &&
    context.missionPlan?.gates?.hermesRequiresScanResult !== false;

  if (requiresScanResult && (!scanResult || scanResult.found !== true)) {
    console.warn('[HERMES] Gate V1.6.4: scanResult ausente ou found=false — fallback (enforce por padrão)');
    return fallbackRca(errorInput, null, context.agentTargets || {});
  }
  // System prompt: CLAUDE.md + SKILLS (se disponível) + schema obrigatório do Hermes SEMPRE
  const effectiveSystem = context.skillSystemPrompt
    ? `${context.skillSystemPrompt}\n\n=== HERMES RCA REQUIRED SCHEMA ===\n${HERMES_SYSTEM}`
    : HERMES_SYSTEM;

  // 2. Montar prompt com todas as camadas de contexto
  const parts = [`=== ERRO ===\n${errorInput}`];
  if (context.logContext)   parts.push(context.logContext);
  if (context.planContext)    parts.push(context.planContext);  // ← plano do OpenClaw
  if (context.memoryContext)  parts.push(context.memoryContext); // ← V1.5 Hermes Learning Harness
  if (context.memoryHint)     parts.push(context.memoryHint);

  // Contexto do arquivo: priorizar fileContext (já montado pelo missionRunner)
  // ou montar aqui via scanResult
  if (context.fileContext) {
    parts.push(context.fileContext);
  } else if (scanResult?.found) {
    parts.push(buildFileContext(scanResult));
  } else if (context.fileContent) {
    parts.push(`=== ARQUIVO ${context.file || 'server.js'} ===\n${context.fileContent.slice(0, 2500)}`);
  }

  parts.push('\nAnalise e responda com o JSON de RCA.');
  const prompt = parts.join('\n\n');

  const providers = getProviders();
  if (!providers.length) {
    console.warn('[HERMES] Nenhum provider configurado — usando fallback offline');
    return fallbackRca(errorInput, scanResult, context.agentTargets || {});
  }

  for (const provider of providers) {
    try {
      console.log(`[HERMES] Tentando ${provider.name} (${provider.model})...`);
      const raw = provider.style === 'anthropic'
        ? await callAnthropic(provider, effectiveSystem, prompt)
        : await callOpenAI(provider, effectiveSystem, prompt);

      const cleaned = raw
        .replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim();

      let parsed;
      try { parsed = JSON.parse(cleaned); }
      catch {
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (m) try { parsed = JSON.parse(m[0]); } catch { parsed = null; }
      }

      if (!parsed) {
        console.warn(`[HERMES] JSON inválido de ${provider.name}`);
        continue;
      }

      const rca = normalizeRca(parsed, `hermes_${provider.name.toLowerCase()}`,
                               context.agentTargets || {});

      // Pós-processar: corrigir arquivo dos patches se LLM usou server.js genérico
      if (scanResult?.found) {
        rca.patches = correctPatchFiles(rca.patches, scanResult, errorInput,
                                        context.agentTargets || {});
      }

      rca.scanResult = scanResult ? {
        file: scanResult.file, score: scanResult.score,
        matched: scanResult.matched,
        allCandidates: scanResult.allCandidates,
        category: scanResult.category,
      } : null;

      console.log(`[HERMES] ✔ ${provider.name} — confiança: ${rca.confidence}%`);
      return rca;

    } catch (err) {
      console.warn(`[HERMES] ✗ ${provider.name}: ${err.message}`);
    }
  }

  console.warn('[HERMES] Todos providers falharam — fallback offline');
  return fallbackRca(errorInput, scanResult, context.agentTargets || {});
}

// ── Corrigir arquivo + inferir agentKey dos patches ───────────────────────
function correctPatchFiles(patches, scanResult, errorInput, agentTargets = {}) {
  if (!patches?.length || !scanResult?.found) return patches;

  return patches.map(patch => {
    const isGeneric = !patch.file || patch.file === 'server.js' || patch.file === 'index.js';

    if (!isGeneric) {
      // Arquivo já específico — inferir agentKey se ausente
      if (!patch.agentKey || patch.agentKey === 'unknown') {
        const inferred = inferAgentKey(patch.file, agentTargets);
        if (inferred) return { ...patch, agentKey: inferred };
      }
      return patch;
    }

    // Arquivo genérico — tentar corrigir pelo find
    const content = scanResult.content || '';
    if (patch.find && content.includes(patch.find)) {
      const correctedFile = scanResult.relativePath;
      const inferredKey   = inferAgentKey(correctedFile, agentTargets)
                         || patch.agentKey
                         || 'unknown';
      console.log(`[HERMES] ✔ Patch corrigido: ${patch.file} → ${correctedFile} | agentKey: ${inferredKey}`);
      return { ...patch, file: correctedFile, agentKey: inferredKey };
    }

    if (patch.find) {
      console.log(`[HERMES] ⚠ find não encontrado em ${scanResult.relativePath}, mantendo ${patch.file}`);
    }

    return patch;
  });
}

module.exports = { analyzeError, fallbackRca, getProviders, correctPatchFiles, inferAgentKey };
