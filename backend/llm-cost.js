'use strict';

// ---------------------------------------------------------------------------
// Custo real por agente (docs/ROADMAP.md Fase 2, docs/DECISIONS.md
// DECISION-032). Isolado do server.js pra ser testável sem Express/rede,
// mesmo racional de provider-vault-routing.js.
//
// ponytail: PRICE_PER_1M_TOKENS são preços de referência pública
// aproximados (USD por 1M tokens), não é billing/fatura real — servem só
// pra estimar cost_usd exibido em /api/metrics/agents. Teto conhecido: não
// captura desconto de cache/batch dos providers, nem mudança de tabela de
// preço deles ao vivo. Upgrade path: se algum dia isso precisar bater com
// fatura real, trocar por leitura da API de billing de cada provider.
// ---------------------------------------------------------------------------

const PRICE_PER_1M_TOKENS = {
  openrouter: { in: 0.80, out: 4.00 },  // proxy do claude-haiku-4-5 (mesma faixa Anthropic)
  anthropic:  { in: 0.80, out: 4.00 },  // claude-haiku-4-5
  openai:     { in: 0.15, out: 0.60 },  // gpt-4o-mini
  groq:       { in: 0.05, out: 0.08 },  // llama-3.1-8b-instant
  deepseek:   { in: 0.14, out: 0.28 },  // deepseek-chat
  gemini:     { in: 0.075, out: 0.30 }  // gemini-1.5-flash
};

// Cada provider devolve o usage num formato diferente — normaliza pros 2
// campos que interessam (tokens_in/tokens_out), sem nunca lançar.
function extractUsage(providerId, data) {
  if (!data || typeof data !== 'object') return { tokens_in: 0, tokens_out: 0 };
  if (providerId === 'anthropic') {
    const u = data.usage || {};
    return { tokens_in: Number(u.input_tokens) || 0, tokens_out: Number(u.output_tokens) || 0 };
  }
  if (providerId === 'gemini') {
    const u = data.usageMetadata || {};
    return { tokens_in: Number(u.promptTokenCount) || 0, tokens_out: Number(u.candidatesTokenCount) || 0 };
  }
  // openrouter/openai/groq/deepseek seguem o formato OpenAI-style usage
  const u = data.usage || {};
  return { tokens_in: Number(u.prompt_tokens) || 0, tokens_out: Number(u.completion_tokens) || 0 };
}

// null quando não há preço cadastrado pro provider OU quando não veio
// nenhum token real (nunca inventa custo pra um usage vazio/ausente).
function computeCostUsd(providerId, tokensIn, tokensOut) {
  const price = PRICE_PER_1M_TOKENS[providerId];
  if (!price || (!tokensIn && !tokensOut)) return null;
  const cost = (tokensIn / 1e6) * price.in + (tokensOut / 1e6) * price.out;
  return Math.round(cost * 1e6) / 1e6;
}

// Puro — recebe o ledger atual e devolve um NOVO objeto com o agente
// atualizado (não muta `ledger`). I/O (ler/escrever o arquivo) fica em
// server.js via readJsonFile/writeAndSyncS3, mesmo padrão do mission-timeline.
function recordAgentCost(ledger, agentName, usage) {
  const next = Object.assign({}, ledger);
  const prev = next[agentName] || { cost_usd_total: 0, tokens_in_total: 0, tokens_out_total: 0, calls: 0 };
  next[agentName] = {
    cost_usd_total: Math.round((prev.cost_usd_total + (usage.cost_usd || 0)) * 1e6) / 1e6,
    tokens_in_total: prev.tokens_in_total + (usage.tokens_in || 0),
    tokens_out_total: prev.tokens_out_total + (usage.tokens_out || 0),
    calls: prev.calls + 1,
    updated_at: new Date().toISOString()
  };
  return next;
}

module.exports = { PRICE_PER_1M_TOKENS, extractUsage, computeCostUsd, recordAgentCost };
