'use strict';

const fs   = require('fs');
const path = require('path');
const { syncLegacyCatalog: syncLegacyMultiProviders } = require('./multiproviders-runtime');

/**
 * §49 — HERMES MULTI-PROVIDER FALLBACK
 * §72 — Evidence-Gated Escalation (Fase 1)
 *
 * Ref: SDDF_SPEC.md § PIPELINE CANÔNICO — Lei Arquitetural
 * Restaurado e adaptado da V2.2.2 para V3.0.0.
 *
 * Providers (ordem padrão via AI_PROVIDER_ORDER env):
 *   anthropic → cerebras → groq → openrouter → deepseek → gemini → ollama
 *
 * Fallback automático com logs [HERMES §49].
 * Se todos falharem: { ok: false, requires_manual_review: true }.
 * Groq: payload guard (>20K chars → skip; STRESS-11 fix §66).
 * Timeout por provider: 30s padrão (adaptável via opts.timeout).
 *
 * §72 Escalation: se provider anterior timeoutou E resultado atual
 * fix_type==='none' E há próximo provider disponível → escalar.
 * Cada escalação registrada em .vision-memory/hermes_low_confidence.jsonl.
 */

/* ── Registry de providers ─────────────────────────────────────── */
const PROVIDER_REGISTRY = {
  anthropic: {
    name:      'Anthropic',
    model:     () => process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    type:      'anthropic'
  },
  cerebras: {
    name:      'Cerebras',
    model:     () => process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    baseUrl:   'https://api.cerebras.ai/v1',
    type:      'openai'
  },
  groq: {
    name:      'Groq',
    model:     () => process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    apiKeyEnv: 'GROQ_API_KEY',
    baseUrl:   'https://api.groq.com/openai/v1',
    type:      'openai',
    payloadLimit: 20000   /* free tier ≤6K tokens — margem segura 20K chars (STRESS-11 fix) */
  },
  openrouter: {
    name:      'OpenRouter',
    model:     () => process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    baseUrl:   'https://openrouter.ai/api/v1',
    type:      'openai'
  },
  deepseek: {
    name:      'DeepSeek',
    model:     () => process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseUrl:   'https://api.deepseek.com/v1',
    type:      'openai'
  },
  gemini: {
    name:      'Gemini',
    model:     () => process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    apiKeyEnv: 'GEMINI_API_KEY',
    baseUrl:   'https://generativelanguage.googleapis.com/v1beta/openai',
    type:      'openai'
  },
  ollama: {
    name:      'Ollama',
    model:     () => process.env.OLLAMA_MODEL || 'mistral',
    apiKeyEnv: null,
    baseUrl:   () => {
      const base = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      return base.replace(/\/$/, '') + '/v1';
    },
    type:      'openai'
  }
};

/* ── §72 Evidence-Gated Escalation helpers ─────────────────────── */

/** Detecta se erro foi timeout (AbortSignal.timeout ou mensagem) */
function isTimeoutError(err) {
  return err.name === 'TimeoutError' ||
         err.name === 'AbortError'   ||
         (err.message && /timeout/i.test(err.message));
}

/** Extrai fix_type do JSON embutido na resposta do LLM */
function extractFixType(answer) {
  try {
    const m = answer.match(/```json\s*([\s\S]*?)```/);
    const parsed = JSON.parse(m ? m[1] : answer);
    return (parsed.fix_type || '').toLowerCase();
  } catch (_) {
    return null;
  }
}

/** Append de entrada no log de baixa confiança (.vision-memory) */
function appendLowConfidenceLog(entry) {
  try {
    const dir = path.join(process.cwd(), '.vision-memory');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(
      path.join(dir, 'hermes_low_confidence.jsonl'),
      JSON.stringify(entry) + '\n',
      'utf8'
    );
  } catch (e) {
    console.log('[HERMES §72] low-confidence log write failed: ' + e.message);
  }
}

/* ── §72 Fase 2 — Memory: encontrar casos similares de baixa confiança ───
 * Princípio: se o payload atual "lembra" um caso passado que precisou
 * escalar, despriorizar (nunca remover — o contrato de fallback total
 * precisa continuar valendo) o provider que falhou naquele caso, em vez
 * de repetir o mesmo caminho perdedor antes de chegar num provider robusto.
 * Matching por overlap de tokens (sem embeddings/vetores pesados) — barato,
 * determinístico e fácil de testar sem rede/LLM real. */

/** Tokeniza texto em um Set de palavras significativas (>=4 chars, minúsculas) */
function tokenize(text) {
  const tokens = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúâêôãõàèìòùç_]+/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 4);
  return new Set(tokens);
}

/** Similaridade de Jaccard entre dois Sets de tokens (0 = nada em comum, 1 = idênticos) */
function jaccardOverlap(setA, setB) {
  if (!setA || !setB || setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) { if (setB.has(t)) intersection++; }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Lê .vision-memory/hermes_low_confidence.jsonl — até maxEntries, mais recente primeiro */
function readLowConfidenceLog(maxEntries) {
  const limit = maxEntries || 200;
  try {
    const filePath = path.join(process.cwd(), '.vision-memory', 'hermes_low_confidence.jsonl');
    if (!fs.existsSync(filePath)) return [];
    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
    const entries = [];
    for (const line of lines) {
      try { entries.push(JSON.parse(line)); } catch (_) { /* linha corrompida — pula, não quebra */ }
    }
    return entries.slice(-limit).reverse();
  } catch (e) {
    console.log('[HERMES §72] low-confidence log read failed: ' + e.message);
    return [];
  }
}

/**
 * findSimilarLowConfidenceCases(input, entries, opts) → entradas similares (>= threshold)
 * @param {object} [opts.minOverlap=0.15] — threshold de similaridade Jaccard
 */
function findSimilarLowConfidenceCases(input, entries, opts) {
  const minOverlap  = (opts && opts.minOverlap != null) ? opts.minOverlap : 0.15;
  const inputTokens = tokenize(input);
  if (inputTokens.size === 0 || !Array.isArray(entries)) return [];
  return entries.filter(e => {
    if (!e || !Array.isArray(e.keywords) || e.keywords.length === 0) return false;
    return jaccardOverlap(inputTokens, new Set(e.keywords)) >= minOverlap;
  });
}

/**
 * applyMemoryReordering(order, similarCases) → array reordenado de provider ids
 * Move (nunca remove) os providers que apareceram como `escalated_from` em
 * casos similares de baixa confiança pro final da fila — preserva o contrato
 * de fallback total (todos os providers continuam sendo tentados, só a ordem
 * muda). Função pura, sem I/O — fácil de testar sem rede/LLM real.
 */
function applyMemoryReordering(order, similarCases) {
  if (!Array.isArray(similarCases) || similarCases.length === 0) return order.slice();
  const weakProviders = new Set(similarCases.map(c => c && c.escalated_from).filter(Boolean));
  if (weakProviders.size === 0) return order.slice();
  return order.filter(id => !weakProviders.has(id))
    .concat(order.filter(id => weakProviders.has(id)));
}

/**
 * computeMemoryMetrics(entries) → estatísticas agregadas do log de baixa confiança
 * Usado pelo endpoint /api/metrics/memory (§108 — observabilidade). Função
 * pura, sem I/O — recebe as entradas já lidas por readLowConfidenceLog().
 */
function computeMemoryMetrics(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const byProvider = {};
  let withKeywords = 0;
  let withoutKeywords = 0;
  let lastEscalationAt = null;

  list.forEach(e => {
    if (!e) return;
    const provider = e.escalated_from || 'unknown';
    byProvider[provider] = (byProvider[provider] || 0) + 1;
    if (Array.isArray(e.keywords) && e.keywords.length > 0) withKeywords++;
    else withoutKeywords++;
    if (e.timestamp && (!lastEscalationAt || e.timestamp > lastEscalationAt)) lastEscalationAt = e.timestamp;
  });

  return {
    total_escalations:             list.length,
    by_provider:                   byProvider,
    memory_capable_entries:        withKeywords,
    legacy_entries_without_keywords: withoutKeywords,
    last_escalation_at:            lastEscalationAt
  };
}

/* ── Ordem dos providers ────────────────────────────────────────── */
function getProviderOrder() {
  return (process.env.AI_PROVIDER_ORDER || 'anthropic,cerebras,groq,openrouter,deepseek,gemini,ollama')
    .split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * callProvider(id, systemPrompt, userMessage, opts) → { answer, provider_used, model_used }
 * @throws {Error} se provider falhar
 */
async function callProvider(id, systemPrompt, userMessage, opts) {
  const cfg = PROVIDER_REGISTRY[id];
  if (!cfg) throw new Error('provider desconhecido: ' + id);

  const model   = typeof cfg.model === 'function' ? cfg.model() : cfg.model;
  const apiKey  = cfg.apiKeyEnv ? (process.env[cfg.apiKeyEnv] || '') : 'ollama';
  const baseUrl = typeof cfg.baseUrl === 'function' ? cfg.baseUrl() : (cfg.baseUrl || '');
  const timeout = (opts && opts.timeout) || 30000;

  if (cfg.apiKeyEnv && (!apiKey || apiKey.includes('placeholder'))) {
    throw new Error(cfg.name + ': API key ausente ou placeholder');
  }

  const signal = AbortSignal.timeout(timeout);

  /* ── Anthropic Messages API ────────────────────────────────────── */
  if (cfg.type === 'anthropic') {
    const body = {
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    };
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json'
      },
      body:   JSON.stringify(body),
      signal
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => String(r.status));
      throw new Error(cfg.name + ': HTTP ' + r.status + ' — ' + errText.slice(0, 120));
    }
    const data   = await r.json();
    const answer = data?.content?.[0]?.text || '';
    if (!answer) throw new Error(cfg.name + ': resposta vazia');
    return { answer, provider_used: id, model_used: model };
  }

  /* ── OpenAI-compatible (groq, openrouter, gemini, ollama) ──────── */
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userMessage });

  const r = await fetch(baseUrl + '/chat/completions', {
    method:  'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'content-type':  'application/json'
    },
    body:   JSON.stringify({ model, messages, max_tokens: 4096 }),
    signal
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => String(r.status));
    throw new Error(cfg.name + ': HTTP ' + r.status + ' — ' + errText.slice(0, 120));
  }
  const data   = await r.json();
  const answer = data?.choices?.[0]?.message?.content || '';
  if (!answer) throw new Error(cfg.name + ': resposta vazia');
  return { answer, provider_used: id, model_used: data.model || model };
}

/**
 * callHermes(systemPrompt, userMessage, opts) → HermesResult
 *
 * Tenta providers em ordem até um funcionar.
 * Retorna { answer, provider_used, model_used }
 * ou { ok: false, requires_manual_review: true } se todos falharem.
 *
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {object} [opts]
 * @param {number}  [opts.timeout=30000]  — timeout por provider (ms)
 */
async function callHermes(systemPrompt, userMessage, opts) {
  let   order          = getProviderOrder();
  const msgLen         = userMessage.length;
  let   prevWasTimeout = false;
  const providersTried = [];

  /* §72 Fase 2 — Memory: payload parecido com caso passado que escalou →
   * despriorizar (não remover) o provider que falhou naquele caso. Nunca
   * bloqueante — qualquer erro aqui é só logado, o fluxo principal segue. */
  try {
    const similarCases = findSimilarLowConfidenceCases(userMessage, readLowConfidenceLog());
    const reordered     = applyMemoryReordering(order, similarCases);
    if (reordered.join(',') !== order.join(',')) {
      console.log(
        '[HERMES §72] payload similar a ' + similarCases.length + ' caso(s) de baixa confiança anterior(es) — ' +
        'despriorizando: ' + Array.from(new Set(similarCases.map(c => c.escalated_from))).join(', ')
      );
      order = reordered;
    }
  } catch (e) {
    console.log('[HERMES §72] memory lookup falhou (não bloqueante): ' + e.message);
  }

  const canonicalReceipt = syncLegacyMultiProviders('hermes-rca.callHermes', order
    .filter(id => Boolean(PROVIDER_REGISTRY[id]))
    .map(id => {
      const cfg = PROVIDER_REGISTRY[id];
      return {
        id,
        display_name: cfg.name || id,
        vendor: id,
        model: cfg.model(),
        configured: cfg.apiKeyEnv ? Boolean(process.env[cfg.apiKeyEnv]) : true,
        endpoint_ref: 'legacy-provider://' + id,
        configuration_ref: 'legacy-config://' + id,
        transport_type: 'legacy',
        source_ref: 'hermes-rca.callHermes',
        execution_ref: 'callHermes:' + id,
      };
    }));
  const canonicalProviderIds = new Set(canonicalReceipt.translated.map(item => item.provider_id));
  order = order.filter(id => !PROVIDER_REGISTRY[id] || canonicalProviderIds.has(id));

  for (let i = 0; i < order.length; i++) {
    const id  = order[i];
    const cfg = PROVIDER_REGISTRY[id];
    if (!cfg) {
      console.log('[HERMES §49] Provider desconhecido: "' + id + '" — skip');
      continue;
    }

    /* Payload guard: Groq free tier */
    if (cfg.payloadLimit && msgLen > cfg.payloadLimit) {
      console.log('[HERMES §49] ' + cfg.name + ': payload ' + msgLen + ' chars > ' + cfg.payloadLimit + ' — skip');
      continue;
    }

    console.log('[HERMES §49] Tentando provider: ' + cfg.name + '...');
    try {
      const result = await callProvider(id, systemPrompt, userMessage, opts);
      providersTried.push(id);

      /* §72 Evidence-Gate: se anterior timeoutou e este respondeu "nenhum bug"
       * sem evidência, não é confiável — escalar para o próximo provider.      */
      if (prevWasTimeout && extractFixType(result.answer) === 'none') {
        const hasNext = order.slice(i + 1).some(nid => {
          const ncfg = PROVIDER_REGISTRY[nid];
          return ncfg && !(ncfg.payloadLimit && msgLen > ncfg.payloadLimit);
        });

        if (hasNext) {
          console.log(
            '[HERMES §72] ' + cfg.name + ': fix_type=none após timeout anterior — ' +
            'baixa confiança, escalando para próximo provider...'
          );
          appendLowConfidenceLog({
            timestamp:      new Date().toISOString(),
            providers_tried: providersTried.slice(),
            escalated_from:  id,
            final_decision:  'none_low_confidence',
            payload_size:    msgLen,
            keywords:        Array.from(tokenize(userMessage)).slice(0, 40) /* §72 Fase 2 */
          });
          prevWasTimeout = false;
          continue;
        }
      }

      console.log('[HERMES §49] Respondido por: ' + cfg.name + ' (' + result.model_used + ')');
      return result;
    } catch (err) {
      providersTried.push(id);
      prevWasTimeout = isTimeoutError(err);
      const nextId   = order[i + 1];
      const nextName = nextId ? (PROVIDER_REGISTRY[nextId] ? PROVIDER_REGISTRY[nextId].name : nextId) : null;
      console.log(
        '[HERMES §49] ' + cfg.name + ' falhou (' + err.message.slice(0, 80) + ')' +
        (prevWasTimeout ? ' [TIMEOUT]' : '') +
        (nextName ? ' — tentando ' + nextName + '...' : '')
      );
    }
  }

  /* §69: retorna structured error — server.js converte para HTTP 503 */
  console.log('[HERMES §49] Todos os providers falharam — ALL_PROVIDERS_EXHAUSTED. tried=' + providersTried.join(','));
  return {
    ok:                   false,
    code:                 'ALL_PROVIDERS_EXHAUSTED',
    providers_tried:      providersTried,
    requires_manual_review: true
  };
}

module.exports = {
  callHermes, callProvider, PROVIDER_REGISTRY, getProviderOrder,
  tokenize, jaccardOverlap, readLowConfidenceLog, findSimilarLowConfidenceCases, applyMemoryReordering,
  computeMemoryMetrics
};
