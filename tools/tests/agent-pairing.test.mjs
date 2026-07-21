#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const DB = resolve(ROOT, 'data', 'agent-queue.sqlite');
const backup = existsSync(DB) ? readFileSync(DB) : null;
const PAIRINGS_DB = resolve(ROOT, 'data', 'agent-pairings.json');
const pairingsBackup = existsSync(PAIRINGS_DB) ? readFileSync(PAIRINGS_DB) : null;
const PORT = 18738;
const BASE = `http://127.0.0.1:${PORT}`;
let passed = 0;
let serverLog = '';

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  ✓ ${message}`);
  passed++;
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

async function spawnServer() {
  const proc = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      AWS_S3_BUCKET: '',
      SESSION_SECRET: 'agent-pairing-test-session-secret-32chars',
      PROVIDER_VAULT_SECRET: 'agent-pairing-test-vault-secret-32chars',
      SF_REAL_EXECUTION_ENABLED: 'true', // §208: precisa passar do gate isSfRealExecutionEnabled() pra chegar no claim de dono em /api/sf/execute-project; allowlist fica vazia de propósito, o claim acontece ANTES desse gate
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (data) => { serverLog += data; });
  proc.stderr.on('data', (data) => { serverLog += data; });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(BASE + '/api/health')).ok) return proc; } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error('server did not become healthy in time');
}

async function killServer(proc) {
  proc.kill('SIGTERM');
  await new Promise((resolveWait) => proc.once('exit', resolveWait));
}

let child = await spawnServer();

try {
  const a = await request('/api/agent/register', { method: 'POST' });
  const b = await request('/api/agent/register', { method: 'POST' });
  assert(a.status === 200 && b.status === 200, 'dois agentes registram pares distintos');
  assert(a.body.agent_id !== b.body.agent_id && a.body.agent_secret !== b.body.agent_secret, 'IDs e secrets não colidem');

  const payload = { type: 'apply_patch', file: 'fixture.txt', patch: 'before => after', agent_id: a.body.agent_id };
  const missing = await request('/api/agent/mission/queue', { method: 'POST', body: payload });
  const crossed = await request('/api/agent/mission/queue', { method: 'POST', body: { ...payload, agent_secret: b.body.agent_secret } });
  assert(missing.status === 401 && missing.body.error === 'agent_pairing_required', 'queue rejeita ausência de secret com 401');
  assert(crossed.status === 401 && crossed.body.error === 'agent_pairing_required', 'queue rejeita secret de outro agente com 401');

  const queued = await request('/api/agent/mission/queue', { method: 'POST', body: { ...payload, agent_secret: a.body.agent_secret } });
  assert(queued.status === 200 && queued.body.queued === true, 'par correto enfileira missão endereçada');

  const pendingB = await request(`/api/agent/mission/pending?agent_id=${b.body.agent_id}&agent_secret=${b.body.agent_secret}`);
  const pendingA = await request(`/api/agent/mission/pending?agent_id=${a.body.agent_id}&agent_secret=${a.body.agent_secret}`);
  assert(pendingB.status === 200 && pendingB.body.mission === null, 'agente B não consome missão do agente A');
  assert(pendingA.status === 200 && pendingA.body.mission?.id === queued.body.mission_id, 'agente A consome a própria missão');
  assert(!JSON.stringify(pendingA.body).includes(a.body.agent_secret), 'secret não aparece na missão entregue');

  const resultBase = { mission_id: queued.body.mission_id, agent_id: a.body.agent_id, ok: true, action: 'certification_only' };
  const resultMissing = await request('/api/agent/mission/result', { method: 'POST', body: resultBase });
  const resultCrossed = await request('/api/agent/mission/result', { method: 'POST', body: { ...resultBase, agent_secret: b.body.agent_secret } });
  const resultOk = await request('/api/agent/mission/result', { method: 'POST', body: { ...resultBase, agent_secret: a.body.agent_secret } });
  assert(resultMissing.status === 401 && resultCrossed.status === 401, 'resultado rejeita ausência e troca de secret');
  assert(resultOk.status === 200 && resultOk.body.received === true, 'resultado aceita o par correto');

  const stored = await request(`/api/agent/mission/result/${queued.body.mission_id}`);
  assert(stored.status === 200 && stored.body.action === 'certification_only', 'resultado completa o round-trip público');
  assert(!JSON.stringify(stored.body).includes(a.body.agent_secret) && !('agent_secret' in stored.body), 'evidência persistida é redigida');

  const status = await request('/api/agent/status');
  assert(status.status === 200 && status.body.connected === true && status.body.agent_id === a.body.agent_id, 'status reflete o último polling autenticado');

  // Achado real 2026-07-20: agentPairings vivia só em memória, então qualquer restart do
  // processo (no EB, disparado até por uma simples mudança de env var) apagava o pareamento
  // ativo — o Agent Local reagia se re-registrando sozinho com um agent_id novo, que nunca
  // convergia com a allowlist configurada. Este bloco simula exatamente esse cenário: mata o
  // processo, sobe um novo (recarregando agentPairings do disco) e confirma que o par antigo
  // continua válido sem nenhum re-registro.
  await killServer(child);
  child = await spawnServer();
  const pendingAfterRestart = await request(`/api/agent/mission/pending?agent_id=${a.body.agent_id}&agent_secret=${a.body.agent_secret}`);
  assert(pendingAfterRestart.status === 200, 'pareamento sobrevive a restart do processo (sem novo /register)');
  const reRegisterAttempt = await request('/api/agent/mission/pending?agent_id=' + a.body.agent_id + '&agent_secret=wrong-secret-simulating-fresh-pairing');
  assert(reRegisterAttempt.status === 401, 'secret errado continua rejeitado após restart (persistência não afrouxa a checagem)');

  // §208 — TTL + revogação real (não presumida: cada cenário abaixo confirma o
  // efeito via uma chamada HTTP real, nunca só "o código parece certo").

  // Auto-revogação: o próprio agente, com o secret correto, encerra o pareamento.
  const c = await request('/api/agent/register', { method: 'POST' });
  const selfUnregister = await request('/api/agent/unregister', { method: 'POST', body: { agent_id: c.body.agent_id, agent_secret: c.body.agent_secret } });
  assert(selfUnregister.status === 200 && selfUnregister.body.via === 'self', 'auto-revogação com secret correto funciona (via:self)');
  const pendingAfterSelfUnregister = await request(`/api/agent/mission/pending?agent_id=${c.body.agent_id}&agent_secret=${c.body.agent_secret}`);
  assert(pendingAfterSelfUnregister.status === 401, 'agente auto-revogado não consegue mais fazer mission/pending');

  // Pareamento nunca reivindicado (sem sessão de usuário associada) não pode ser
  // revogado só com o agent_id — não existe dono real pra autorizar essa via.
  const d = await request('/api/agent/register', { method: 'POST' });
  const unclaimedUnregister = await request('/api/agent/unregister', { method: 'POST', body: { agent_id: d.body.agent_id } });
  assert(unclaimedUnregister.status === 403 && unclaimedUnregister.body.error === 'agent_unregister_not_authorized', 'pareamento não reivindicado rejeita revogação sem secret nem dono');

  // Revogação por dono: sessão real de usuário reivindica o pareamento ao usar
  // /api/sf/execute-project (mesmo que a missão em si seja bloqueada depois pela
  // allowlist, que fica vazia neste teste de propósito) e depois revoga sem
  // precisar do agent_secret (cenário real: secret vazado/perdido).
  const e = await request('/api/agent/register', { method: 'POST' });
  const ownerEmail = `agent-pairing-owner-${Date.now()}@example.com`;
  const ownerRegister = await request('/api/auth/register', { method: 'POST', body: { email: ownerEmail, password: 'AgentPairingTTL!2026x', name: 'Owner Test' } });
  assert(ownerRegister.status === 200 && ownerRegister.body.token, 'usuário dono real registrado com sucesso');
  const ownerToken = ownerRegister.body.token;
  async function requestAsOwner(path, opts = {}) {
    const response = await fetch(BASE + path, {
      method: opts.method || 'GET',
      headers: Object.assign({ Authorization: `Bearer ${ownerToken}` }, opts.body ? { 'Content-Type': 'application/json' } : {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    return { status: response.status, body: await response.json() };
  }
  const claimAttempt = await requestAsOwner('/api/sf/execute-project', { method: 'POST', body: { agent_id: e.body.agent_id, agent_secret: e.body.agent_secret, project_id: 'ttl-claim-test', description: 'claim ownership test', files: [{ name: 'src/index.js', content: 'module.exports = {};\n' }] } });
  assert(claimAttempt.status === 403 && claimAttempt.body.error === 'sf_real_execution_agent_not_allowed', 'claim acontece antes do gate de allowlist (allowlist vazia bloqueia a missão em si, como esperado)');
  const ownerUnregisterWithoutSecret = await requestAsOwner('/api/agent/unregister', { method: 'POST', body: { agent_id: e.body.agent_id } });
  assert(ownerUnregisterWithoutSecret.status === 200 && ownerUnregisterWithoutSecret.body.via === 'owner', 'dono revoga sem precisar do agent_secret (cenário real: secret vazado/perdido)');
  const pendingAfterOwnerUnregister = await request(`/api/agent/mission/pending?agent_id=${e.body.agent_id}&agent_secret=${e.body.agent_secret}`);
  assert(pendingAfterOwnerUnregister.status === 401, 'agente revogado pelo dono não consegue mais fazer mission/pending');

  // Um usuário diferente (não-dono) não consegue revogar o pareamento de outro.
  const f = await request('/api/agent/register', { method: 'POST' });
  await requestAsOwner('/api/sf/execute-project', { method: 'POST', body: { agent_id: f.body.agent_id, agent_secret: f.body.agent_secret, project_id: 'cross-user-test', description: 'x', files: [{ name: 'a.js', content: 'x' }] } });
  const intruderEmail = `agent-pairing-intruder-${Date.now()}@example.com`;
  const intruderRegister = await request('/api/auth/register', { method: 'POST', body: { email: intruderEmail, password: 'AgentPairingTTL!2026y', name: 'Intruder Test' } });
  const intruderToken = intruderRegister.body.token;
  const crossUserUnregister = await (async () => {
    const response = await fetch(BASE + '/api/agent/unregister', { method: 'POST', headers: { Authorization: `Bearer ${intruderToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_id: f.body.agent_id }) });
    return { status: response.status, body: await response.json() };
  })();
  assert(crossUserUnregister.status === 403 && crossUserUnregister.body.error === 'agent_unregister_not_authorized', 'usuário diferente do dono não consegue revogar o pareamento de outro');

  // TTL real (pareamento COM dono — 30 dias): expira depois de 30 dias sem uso,
  // renovado a cada mission/pending bem-sucedido. Sem esperar tempo real — manipula
  // o timestamp persistido em disco entre kill/restart, mesmo padrão já usado acima
  // pro teste de restart. Reivindicados via execute-project pra usar o TTL de 30
  // dias (o de pareamento nunca reivindicado, 48h, tem teste próprio mais abaixo).
  const TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const g = await request('/api/agent/register', { method: 'POST' }); // vai expirar
  const hAgent = await request('/api/agent/register', { method: 'POST' }); // vai renovar
  await requestAsOwner('/api/sf/execute-project', { method: 'POST', body: { agent_id: g.body.agent_id, agent_secret: g.body.agent_secret, project_id: 'ttl-g-claim', description: 'x', files: [{ name: 'a.js', content: 'x' }] } });
  await requestAsOwner('/api/sf/execute-project', { method: 'POST', body: { agent_id: hAgent.body.agent_id, agent_secret: hAgent.body.agent_secret, project_id: 'ttl-h-claim', description: 'x', files: [{ name: 'a.js', content: 'x' }] } });
  await killServer(child);
  const pairingsOnDisk = JSON.parse(readFileSync(PAIRINGS_DB, 'utf8'));
  pairingsOnDisk[g.body.agent_id].last_used_at = Date.now() - (TTL_MS + 60_000); // 30 dias + 1min atrás -> expirado
  pairingsOnDisk[hAgent.body.agent_id].last_used_at = Date.now() - (TTL_MS - 5_000); // faltam 5s pro TTL -> ainda válido, por enquanto
  writeFileSync(PAIRINGS_DB, JSON.stringify(pairingsOnDisk, null, 2));
  child = await spawnServer();

  const expiredPending = await request(`/api/agent/mission/pending?agent_id=${g.body.agent_id}&agent_secret=${g.body.agent_secret}`);
  assert(expiredPending.status === 401, 'pareamento expira de verdade depois de 30 dias sem uso (401, não silencioso)');

  const nearExpiryPending = await request(`/api/agent/mission/pending?agent_id=${hAgent.body.agent_id}&agent_secret=${hAgent.body.agent_secret}`);
  assert(nearExpiryPending.status === 200, 'pareamento a 5s do TTL ainda é válido antes da renovação');
  await killServer(child);
  const pairingsAfterTouch = JSON.parse(readFileSync(PAIRINGS_DB, 'utf8'));
  const renewedGapMs = Date.now() - pairingsAfterTouch[hAgent.body.agent_id].last_used_at;
  assert(renewedGapMs < 10_000, `uso recente renova o TTL de verdade — last_used_at persistido reflete a chamada recente (gap real: ${renewedGapMs}ms), não o timestamp antigo pré-restart`);
  child = await spawnServer();
  const afterRenewalPending = await request(`/api/agent/mission/pending?agent_id=${hAgent.body.agent_id}&agent_secret=${hAgent.body.agent_secret}`);
  assert(afterRenewalPending.status === 200, 'pareamento renovado continua válido, longe do TTL de novo');

  // Achado da revisão adversarial (Ponytail/LLM, ver docs/CURRENT_STATE.md): a
  // revisão apontou risco teórico de race condition em claimAgentPairingOwner (dois
  // usuários reivindicando o mesmo agent_id "ao mesmo tempo", um roubando a posse
  // do outro). Verificado aqui empiricamente, não só argumentado por texto:
  // claimAgentPairingOwner não tem nenhum `await` entre a leitura de `user_id` e a
  // escrita — em JS de thread única, isso roda até o fim sem ceder o event loop pra
  // outra requisição, então duas chamadas concorrentes não podem intercalar no meio
  // da função. Este teste dispara as 2 reivindicações de verdade em paralelo
  // (Promise.all, não sequencial) e confirma que exatamente 1 dono vence sempre,
  // nunca os 2 nem nenhum.
  const i = await request('/api/agent/register', { method: 'POST' });
  const raceEmail1 = `agent-pairing-race1-${Date.now()}@example.com`;
  const raceEmail2 = `agent-pairing-race2-${Date.now()}@example.com`;
  const raceUser1 = await request('/api/auth/register', { method: 'POST', body: { email: raceEmail1, password: 'AgentPairingRace!2026a', name: 'Race 1' } });
  const raceUser2 = await request('/api/auth/register', { method: 'POST', body: { email: raceEmail2, password: 'AgentPairingRace!2026b', name: 'Race 2' } });
  function requestAsToken(token) {
    return async (path, opts = {}) => {
      const response = await fetch(BASE + path, {
        method: opts.method || 'GET',
        headers: Object.assign({ Authorization: `Bearer ${token}` }, opts.body ? { 'Content-Type': 'application/json' } : {}),
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      return { status: response.status, body: await response.json() };
    };
  }
  const claimBody = { agent_id: i.body.agent_id, agent_secret: i.body.agent_secret, project_id: 'race-claim-test', description: 'x', files: [{ name: 'a.js', content: 'x' }] };
  const [raceClaim1, raceClaim2] = await Promise.all([
    requestAsToken(raceUser1.body.token)('/api/sf/execute-project', { method: 'POST', body: claimBody }),
    requestAsToken(raceUser2.body.token)('/api/sf/execute-project', { method: 'POST', body: claimBody }),
  ]);
  assert(raceClaim1.status === 403 && raceClaim2.status === 403, 'as 2 reivindicações concorrentes chegam no mesmo bloqueio esperado da allowlist (claim já rodou antes desse gate nas 2)');
  const unregisterAsUser1 = await requestAsToken(raceUser1.body.token)('/api/agent/unregister', { method: 'POST', body: { agent_id: i.body.agent_id } });
  const unregisterAsUser2 = await requestAsToken(raceUser2.body.token)('/api/agent/unregister', { method: 'POST', body: { agent_id: i.body.agent_id } });
  const winners = [unregisterAsUser1, unregisterAsUser2].filter(r => r.status === 200 && r.body.via === 'owner');
  assert(winners.length === 1, `exatamente 1 dono venceu a reivindicação concorrente (JS de thread única sem await no meio da função previne intercalação) — vencedores reais: ${winners.length}`);

  // Mitigação real do achado #4 da revisão adversarial: pareamento nunca
  // reivindicado expira bem mais rápido (48h) que um já reivindicado (30 dias) —
  // fecha a janela de um secret vazado-e-nunca-usado ficando válido por semanas.
  const UNCLAIMED_TTL_MS = 48 * 60 * 60 * 1000;
  const j = await request('/api/agent/register', { method: 'POST' }); // nunca reivindicado, vai expirar rápido
  await killServer(child);
  const pairingsForUnclaimedTest = JSON.parse(readFileSync(PAIRINGS_DB, 'utf8'));
  pairingsForUnclaimedTest[j.body.agent_id].last_used_at = Date.now() - (UNCLAIMED_TTL_MS + 60_000); // 48h + 1min atrás
  writeFileSync(PAIRINGS_DB, JSON.stringify(pairingsForUnclaimedTest, null, 2));
  child = await spawnServer();
  const unclaimedExpiredPending = await request(`/api/agent/mission/pending?agent_id=${j.body.agent_id}&agent_secret=${j.body.agent_secret}`);
  assert(unclaimedExpiredPending.status === 401, 'pareamento nunca reivindicado expira em 48h (bem antes do TTL de 30 dias de um pareamento com dono)');

  console.log(`\n${passed}/${passed} PASS`);
} catch (error) {
  console.error(error.message);
  if (serverLog) console.error(serverLog.slice(-2000));
  process.exitCode = 1;
} finally {
  await killServer(child);
  if (backup) writeFileSync(DB, backup);
  else if (existsSync(DB)) unlinkSync(DB);
  if (pairingsBackup) writeFileSync(PAIRINGS_DB, pairingsBackup);
  else if (existsSync(PAIRINGS_DB)) unlinkSync(PAIRINGS_DB);
}
