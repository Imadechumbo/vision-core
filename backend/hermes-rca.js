'use strict';

/**
 * §49 — HERMES MULTI-PROVIDER FALLBACK
 *
 * Ref: SDDF_SPEC.md § PIPELINE CANÔNICO — Lei Arquitetural
 * Restaurado e adaptado da V2.2.2 para V3.0.0.
 *
 * Providers (ordem padrão via AI_PROVIDER_ORDER env):
 *   anthropic → groq → openrouter → gemini → ollama
 *
 * Fallback automático com logs [HERMES §49].
 * Se todos falharem: { ok: false, requires_manual_review: true }.
 * Groq: payload guard (>24K chars → skip).
 * Timeout por provider: 30s padrão (adaptável via opts.timeout).
 */

/* ── Registry de providers ─────────────────────────────────────── */
const PROVIDER_REGISTRY = {
  anthropic: {
    name:      'Anthropic',
    model:     () => process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    type:      'anthropic'
  },
  groq: {
    name:      'Groq',
    model:     () => process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    apiKeyEnv: 'GROQ_API_KEY',
    baseUrl:   'https://api.groq.com/openai/v1',
    type:      'openai',
    payloadLimit: 24000   /* free tier ≤6K tokens ≈ 24K chars */
  },
  openrouter: {
    name:      'OpenRouter',
    model:     () => process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    baseUrl:   'https://openrouter.ai/api/v1',
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

/* ── Ordem dos providers ────────────────────────────────────────── */
function getProviderOrder() {
  return (process.env.AI_PROVIDER_ORDER || 'anthropic,groq,openrouter,gemini,ollama')
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
  const order  = getProviderOrder();
  const msgLen = userMessage.length;

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
      console.log('[HERMES §49] Respondido por: ' + cfg.name + ' (' + result.model_used + ')');
      return result;
    } catch (err) {
      const nextId   = order[i + 1];
      const nextName = nextId ? (PROVIDER_REGISTRY[nextId] ? PROVIDER_REGISTRY[nextId].name : nextId) : null;
      console.log(
        '[HERMES §49] ' + cfg.name + ' falhou (' + err.message.slice(0, 80) + ')' +
        (nextName ? ' — tentando ' + nextName + '...' : '')
      );
    }
  }

  console.log('[HERMES §49] Todos os providers falharam — requires_manual_review');
  return { ok: false, requires_manual_review: true };
}

module.exports = { callHermes, callProvider, PROVIDER_REGISTRY, getProviderOrder };
