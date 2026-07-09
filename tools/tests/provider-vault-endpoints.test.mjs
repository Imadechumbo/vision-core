#!/usr/bin/env node
/**
 * provider-vault-endpoints — integration test contra o backend REAL
 *
 * Sobe backend/server.js de verdade (child process, porta isolada) e bate
 * nos endpoints /api/providers/* com fetch real — sem chamar nenhuma API de
 * LLM (zero custo). O único ponto que faria uma chamada de rede real
 * (/api/providers/test com uma chave válida) é deliberadamente NÃO testado
 * aqui — cobrimos só o caminho determinístico (sem chave), que é o que essa
 * mudança de fato altera (leitura da chave cifrada do vault). O caminho
 * "conectou de verdade" já era coberto pelo endpoint original, intocado.
 *
 * Limpa data/ai-providers-vault.json ao final — é o único arquivo que este
 * teste cria (o resto do estado do servidor real não é tocado).
 */
import { spawn } from 'child_process';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());
const VAULT_FILE = resolve(ROOT, 'data', 'ai-providers-vault.json');
const PORT = 18734; // porta alta, improvável de colidir
const BASE = `http://127.0.0.1:${PORT}`;

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

function apiCall(path, body) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  }).then(r => r.json().then(json => ({ status: r.status, body: json })));
}

async function waitForHealth(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

const preExisted = existsSync(VAULT_FILE);
const preExistedContent = preExisted ? readFileSync(VAULT_FILE, 'utf8') : null;

// Remove chaves de provider reais do ambiente do processo filho — esta
// máquina de dev tem GROQ_API_KEY/OPENROUTER_API_KEY reais no shell (usadas
// pelo callLLM em uso normal). Sem isolar isso, o teste "sem chave" fica não
// determinístico e, pior, pode disparar uma chamada real com uma chave paga
// de verdade. O único provider com chave nesta suíte é o 'openai' fake que
// o próprio teste salva no vault.
const childEnv = {
  ...process.env,
  PORT: String(PORT),
  AWS_S3_BUCKET: '',
  SESSION_SECRET: 'provider-vault-test-session-secret-32chars-min',
};
for (const prefix of ['OPENROUTER', 'OPENAI', 'ANTHROPIC', 'GROQ', 'DEEPSEEK', 'GEMINI']) {
  delete childEnv[`${prefix}_API_KEY`];
  delete childEnv[`${prefix}_API_KEY_2`];
}

const child = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
  cwd: ROOT,
  env: childEnv, // S3 desligado (só disco local) + zero chave de provider real herdada
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', d => { serverLog += d.toString(); });
child.stderr.on('data', d => { serverLog += d.toString(); });

try {
  const up = await waitForHealth();
  assert(up, 'backend real sobe e responde /api/health dentro de 15s');
  if (!up) throw new Error('backend did not start:\n' + serverLog.slice(-2000));

  // --- salvar um provider com chave real ---
  const save1 = await apiCall('/api/providers/save', { provider: 'openai', api_key: 'sk-test-1234567890abcdef', model: 'gpt-4o-mini', priority: 2 });
  assert(save1.status === 200 && save1.body.saved === true, 'POST /save cria entrada nova');
  assert(save1.body.api_key_masked === 'sk-t****cdef', 'resposta traz só a chave mascarada');
  assert(JSON.stringify(save1.body).indexOf('sk-test-1234567890abcdef') === -1, 'chave completa NUNCA aparece na resposta de /save');

  // --- listar ---
  let list = await fetch(`${BASE}/api/providers/list`).then(r => r.json());
  const openaiEntry = list.providers.find(p => p.provider === 'openai');
  assert(!!openaiEntry, '/list mostra o provider salvo');
  assert(openaiEntry.api_key_masked === 'sk-t****cdef', '/list mostra chave mascarada');
  assert(openaiEntry.has_key === true, '/list expõe has_key=true sem expor a chave');
  assert(openaiEntry.status === 'untested', 'status inicial é untested');
  assert(openaiEntry.priority === 2, 'prioridade salva corretamente');
  assert(JSON.stringify(list).indexOf('sk-test-1234567890abcdef') === -1, 'chave completa NUNCA aparece em /list');
  assert(!('api_key_encrypted' in openaiEntry), '/list não expõe o campo cifrado bruto');

  // --- atualização parcial (só prioridade) preserva a chave ---
  const save2 = await apiCall('/api/providers/save', { provider: 'openai', priority: 1 });
  assert(save2.status === 200 && save2.body.priority === 1, 'atualização parcial muda a prioridade');
  list = await fetch(`${BASE}/api/providers/list`).then(r => r.json());
  const openaiAfter = list.providers.find(p => p.provider === 'openai');
  assert(openaiAfter.api_key_masked === 'sk-t****cdef', 'atualização parcial (sem api_key) PRESERVA a chave mascarada existente');
  assert(openaiAfter.has_key === true, 'atualização parcial PRESERVA has_key=true (não apaga a chave real)');

  // --- segundo provider, para testar ordenação por prioridade ---
  await apiCall('/api/providers/save', { provider: 'anthropic', api_key: 'sk-ant-zzzz999988887777', priority: 5 });
  list = await fetch(`${BASE}/api/providers/list`).then(r => r.json());
  const order = list.providers.map(p => p.provider);
  assert(order.indexOf('openai') < order.indexOf('anthropic'), '/list retorna ordenado por prioridade ascendente (openai=1 antes de anthropic=5)');

  // --- teste sem chave (caminho determinístico, zero rede) ---
  const testNoKey = await apiCall('/api/providers/test', { provider: 'groq' });
  assert(testNoKey.body.status === 'no_key' && testNoKey.body.connected === false, '/test sem chave salva nem env var retorna no_key');

  // --- teste decripta a chave do vault (openai tem chave salva) ---
  // Chave é falsa (sk-test-...), então a API real vai rejeitar (401) ou a
  // rede pode estar indisponível no sandbox — ambos são fins aceitáveis;
  // o que importa aqui é que o endpoint NÃO trava e devolve uma resposta.
  const testWithVaultKey = await apiCall('/api/providers/test', { provider: 'openai' });
  assert(testWithVaultKey.status === 200 && typeof testWithVaultKey.body.status === 'string', '/test com chave do vault (openai) responde sem travar, mesmo com chave inválida/rede fechada');
  list = await fetch(`${BASE}/api/providers/list`).then(r => r.json());
  const openaiTested = list.providers.find(p => p.provider === 'openai');
  assert(openaiTested.last_tested_at !== null, '/test grava last_tested_at real na entrada testada');
  assert(openaiTested.status !== 'untested', 'status sai de untested após rodar o teste');

  // --- remover ---
  const del = await apiCall('/api/providers/delete', { provider: 'anthropic' });
  assert(del.status === 200 && del.body.deleted === true, '/delete remove a entrada');
  list = await fetch(`${BASE}/api/providers/list`).then(r => r.json());
  assert(!list.providers.some(p => p.provider === 'anthropic'), 'entrada removida não aparece mais em /list');

  const delMissing = await apiCall('/api/providers/delete', { provider: 'nao-existe' });
  assert(delMissing.status === 404, '/delete de provider inexistente retorna 404, não 200 silencioso');

} finally {
  child.kill();
  // restaura o estado anterior do arquivo (ou remove, se não existia antes)
  try {
    if (preExisted) {
      const fs = await import('fs');
      fs.writeFileSync(VAULT_FILE, preExistedContent, 'utf8');
    } else if (existsSync(VAULT_FILE)) {
      unlinkSync(VAULT_FILE);
    }
  } catch {}
}

console.log(`\nprovider-vault-endpoints: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
