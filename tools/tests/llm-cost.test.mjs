#!/usr/bin/env node
/**
 * llm-cost — testa as funções puras de backend/llm-cost.js (DECISION-032)
 * de verdade (sem mock de rede, sem Express) — extractUsage/computeCostUsd/
 * recordAgentCost são funções puras, testáveis diretamente.
 */
import { extractUsage, computeCostUsd, recordAgentCost, PRICE_PER_1M_TOKENS } from '../../backend/llm-cost.js';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

console.log('=== llm-cost ===\n');

// extractUsage — cada provider tem um formato diferente de usage
assert(
  JSON.stringify(extractUsage('anthropic', { usage: { input_tokens: 100, output_tokens: 50 } })) === JSON.stringify({ tokens_in: 100, tokens_out: 50 }),
  'anthropic: usage.input_tokens/output_tokens'
);
assert(
  JSON.stringify(extractUsage('gemini', { usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 80 } })) === JSON.stringify({ tokens_in: 200, tokens_out: 80 }),
  'gemini: usageMetadata.promptTokenCount/candidatesTokenCount'
);
for (const id of ['openrouter', 'openai', 'groq', 'deepseek']) {
  assert(
    JSON.stringify(extractUsage(id, { usage: { prompt_tokens: 10, completion_tokens: 5 } })) === JSON.stringify({ tokens_in: 10, tokens_out: 5 }),
    `${id}: usage.prompt_tokens/completion_tokens (formato OpenAI-style)`
  );
}
assert(JSON.stringify(extractUsage('openai', null)) === JSON.stringify({ tokens_in: 0, tokens_out: 0 }), 'extractUsage nunca lança com data ausente');
assert(JSON.stringify(extractUsage('openai', {})) === JSON.stringify({ tokens_in: 0, tokens_out: 0 }), 'extractUsage nunca lança com usage ausente');

// computeCostUsd
assert(computeCostUsd('unknown-provider', 1000, 1000) === null, 'provider sem preço cadastrado retorna null (nunca inventa custo)');
assert(computeCostUsd('openai', 0, 0) === null, 'zero tokens retorna null (nunca fabrica custo de nada)');
const cost = computeCostUsd('openai', 1_000_000, 1_000_000);
const expected = PRICE_PER_1M_TOKENS.openai.in + PRICE_PER_1M_TOKENS.openai.out;
assert(Math.abs(cost - expected) < 1e-9, `1M in + 1M out pro openai = preço tabelado exato (${expected})`);
assert(typeof computeCostUsd('anthropic', 500, 200) === 'number', 'usage parcial real retorna número');

for (const id of Object.keys(PRICE_PER_1M_TOKENS)) {
  const p = PRICE_PER_1M_TOKENS[id];
  assert(typeof p.in === 'number' && p.in > 0, `${id}: preço de entrada > 0`);
  assert(typeof p.out === 'number' && p.out > 0, `${id}: preço de saída > 0`);
}

// recordAgentCost — puro, não muta o ledger recebido
const ledger0 = {};
const ledger1 = recordAgentCost(ledger0, 'Hermes RCA', { tokens_in: 100, tokens_out: 50, cost_usd: 0.001 });
assert(JSON.stringify(ledger0) === '{}', 'recordAgentCost não muta o ledger original (função pura)');
assert(ledger1['Hermes RCA'].calls === 1, 'primeira chamada registra calls=1');
assert(ledger1['Hermes RCA'].cost_usd_total === 0.001, 'primeira chamada acumula cost_usd_total correto');

const ledger2 = recordAgentCost(ledger1, 'Hermes RCA', { tokens_in: 200, tokens_out: 100, cost_usd: 0.002 });
assert(ledger2['Hermes RCA'].calls === 2, 'segunda chamada incrementa calls para 2');
assert(Math.abs(ledger2['Hermes RCA'].cost_usd_total - 0.003) < 1e-9, 'segunda chamada acumula cost_usd_total (0.001+0.002=0.003)');
assert(ledger2['Hermes RCA'].tokens_in_total === 300, 'tokens_in_total acumula (100+200=300)');
assert(ledger1['Hermes RCA'].calls === 1, 'ledger1 permanece intacto após gerar ledger2 (imutabilidade real)');

const ledger3 = recordAgentCost(ledger2, 'OpenClaw', { tokens_in: 10, tokens_out: 5, cost_usd: 0.0001 });
assert(ledger3['Hermes RCA'].calls === 2 && ledger3['OpenClaw'].calls === 1, 'agentes diferentes acumulam em chaves separadas, sem interferência');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
