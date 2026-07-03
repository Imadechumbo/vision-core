#!/usr/bin/env node
/**
 * §112 — Etapa F: testes unitários da fila SQLite (sql.js) — sem servidor real
 *
 * Cobre agent-queue-db.js isoladamente: operações básicas de fila (push/shift/
 * length), resultados (storeResult/getResult/upsert), e a propriedade central
 * desta etapa — persistência real entre "reaberturas" do banco.
 *
 * IMPORTANTE sobre o design real do módulo: agent-queue-db.js mantém estado
 * de módulo (singleton — `let _db = null; let _dbPath = null;` no topo do
 * arquivo), não uma fábrica que retorna instâncias. Não há close() exposto.
 * Isso é correto pro processo do servidor real (só precisa de UMA conexão
 * por vida do processo), mas significa que testar "fechar e reabrir o mesmo
 * arquivo" dentro de UM ÚNICO processo de teste precisa de um truque: limpar
 * a entrada do módulo em require.cache antes de cada require() força o
 * Node a reexecutar o arquivo do zero, redeclarando _db/_dbPath como null —
 * o equivalente de um processo novo, sem precisar de child_process real.
 * (O teste com kill -9 de um processo REAL está em
 * _test112_persistent_queue_e2e.sh — este arquivo aqui é só o módulo isolado.)
 *
 * init() é assíncrono (carrega o WASM do sql.js), então os testes daqui
 * também são.
 *
 * Uso: node _test112_persistent_queue_unit.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const MODULE_PATH = path.join(__dirname, 'backend', 'agent-queue-db.js');

function freshModule() {
  try { delete require.cache[require.resolve(MODULE_PATH)]; } catch (e) { /* primeira vez, ainda não tem cache */ }
  return require(MODULE_PATH);
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log('  ✓ ' + name);
    passed++;
  } catch (e) {
    console.log('  ✗ ' + name + ' — ' + e.message);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function tmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vc-t112-' + label + '-'));
}

async function main() {
  console.log('§112 — Fila SQLite (sql.js) persistente: testes unitários (Etapa F)\n');

  await test('push + shift: retorna a missão exata que foi empurrada', async () => {
    const dir = tmpDir('basic');
    const db = freshModule();
    await db.init(dir);
    db.push({ id: 'm1', type: 'general', input: 'teste' });
    const out = db.shift();
    assert(out.id === 'm1', 'id devia bater');
    assert(out.type === 'general', 'type devia bater');
    assert(out.input === 'teste', 'input devia bater');
  });

  await test('FIFO: ordem de inserção é preservada (3 missões, ordem exata na saída)', async () => {
    const dir = tmpDir('fifo');
    const db = freshModule();
    await db.init(dir);
    db.push({ id: 'a', type: 'general' });
    db.push({ id: 'b', type: 'general' });
    db.push({ id: 'c', type: 'general' });
    assert(db.shift().id === 'a', 'primeira saída devia ser "a"');
    assert(db.shift().id === 'b', 'segunda saída devia ser "b"');
    assert(db.shift().id === 'c', 'terceira saída devia ser "c"');
  });

  await test('length(): reflete o tamanho real, atualizado a cada push/shift', async () => {
    const dir = tmpDir('length');
    const db = freshModule();
    await db.init(dir);
    assert(db.length() === 0, 'fila nova devia começar vazia');
    db.push({ id: 'x', type: 'general' });
    db.push({ id: 'y', type: 'general' });
    assert(db.length() === 2, 'devia ter 2 após 2 pushes');
    db.shift();
    assert(db.length() === 1, 'devia ter 1 após 1 shift');
  });

  await test('shift() em fila vazia retorna null (não lança erro)', async () => {
    const dir = tmpDir('empty');
    const db = freshModule();
    await db.init(dir);
    const out = db.shift();
    assert(out === null, 'fila vazia devia retornar null');
  });

  await test('storeResult + getResult: roundtrip básico', async () => {
    const dir = tmpDir('result');
    const db = freshModule();
    await db.init(dir);
    db.storeResult('mission_1', { ok: true, action: 'patch_applied' });
    const out = db.getResult('mission_1');
    assert(out.ok === true, 'ok devia bater');
    assert(out.action === 'patch_applied', 'action devia bater');
  });

  await test('storeResult: upsert (INSERT OR REPLACE) — segunda chamada substitui a primeira', async () => {
    const dir = tmpDir('upsert');
    const db = freshModule();
    await db.init(dir);
    db.storeResult('m1', { ok: true, v: 1 });
    db.storeResult('m1', { ok: true, v: 2 });
    const out = db.getResult('m1');
    assert(out.v === 2, 'devia ter o valor da segunda chamada, não a primeira');
  });

  await test('getResult em id inexistente retorna null (não lança erro)', async () => {
    const dir = tmpDir('missing');
    const db = freshModule();
    await db.init(dir);
    const out = db.getResult('nao_existe');
    assert(out === null, 'id inexistente devia retornar null');
  });

  await test('arquivo .sqlite real é criado no disco logo após init()', async () => {
    const dir = tmpDir('fileexists');
    const db = freshModule();
    await db.init(dir);
    const dbPath = path.join(dir, 'agent-queue.sqlite');
    assert(fs.existsSync(dbPath), 'arquivo .sqlite devia existir no disco em ' + dbPath);
  });

  await test('init() é idempotente — segunda chamada na mesma instância não recria nem quebra', async () => {
    const dir = tmpDir('idempotent');
    const db = freshModule();
    await db.init(dir);
    db.push({ id: 'before-second-init', type: 'general' });
    await db.init(dir); // segunda chamada — deve ser no-op (if (_db) return;)
    assert(db.length() === 1, 'segunda chamada de init() não devia ter resetado a fila');
  });

  await test('PERSISTÊNCIA CENTRAL: limpar require.cache e re-importar (simula processo novo) preserva fila E resultados', async () => {
    const dir = tmpDir('persist');

    // "Sessão 1" — antes do restart simulado
    const db1 = freshModule();
    await db1.init(dir);
    db1.push({ id: 'survivor_1', type: 'general', input: 'antes do restart' });
    db1.push({ id: 'survivor_2', type: 'general', input: 'tambem antes' });
    db1.storeResult('old_result', { ok: true, action: 'done' });
    // não há close() exposto — o módulo não precisa disso em produção (uma
    // única conexão por vida do processo de verdade). Aqui, "encerrar a
    // sessão" é deixar de usar db1 e pedir um módulo fresco a seguir.

    // "Sessão 2" — módulo reimportado do zero (_db/_dbPath voltam a null),
    // mesmo dataDir no disco
    const db2 = freshModule();
    await db2.init(dir); // recarrega o MESMO arquivo agent-queue.sqlite do disco
    assert(db2.length() === 2, 'fila devia ter as 2 missões da sessão anterior, achou ' + db2.length());

    const first = db2.shift();
    assert(first.id === 'survivor_1', 'ordem FIFO devia ser preservada entre sessões: ' + JSON.stringify(first));

    const second = db2.shift();
    assert(second.id === 'survivor_2', 'segunda missão da sessão anterior: ' + JSON.stringify(second));

    const result = db2.getResult('old_result');
    assert(result && result.action === 'done', 'resultado da sessão anterior devia estar acessível: ' + JSON.stringify(result));
  });

  await test('múltiplas reaberturas seguidas continuam consistentes (5 ciclos, não corrompe)', async () => {
    const dir = tmpDir('multireopen');
    for (let i = 0; i < 5; i++) {
      const db = freshModule();
      await db.init(dir);
      db.push({ id: 'm' + i, type: 'general' });
    }
    const dbFinal = freshModule();
    await dbFinal.init(dir);
    assert(dbFinal.length() === 5, 'devia ter acumulado 5 missões em 5 reaberturas, achou ' + dbFinal.length());
    assert(dbFinal.shift().id === 'm0', 'ordem ainda devia ser FIFO desde a primeira sessão');
  });

  // ───────────────────────────────────────────────────────────────────
  // Checagens estáticas — confirma que server.js de fato migrou, não
  // deixou metade em memória e metade em SQLite, e que app.listen
  // aguarda agentQueueDB.init() antes de aceitar requests
  // ───────────────────────────────────────────────────────────────────

  await test('server.js: não restam referências ao array/objeto antigos em memória', async () => {
    const src = fs.readFileSync(path.join(__dirname, 'backend', 'server.js'), 'utf8');
    assert(!/const _agentQueue\s*=\s*\[\]/.test(src), 'não devia mais existir "const _agentQueue = []"');
    assert(!/const _agentResults\s*=\s*\{\}/.test(src), 'não devia mais existir "const _agentResults = {}"');
  });

  await test('server.js: usa agentQueueDB.* em todos os 6 call-sites + aguarda init() antes de listen', async () => {
    const src = fs.readFileSync(path.join(__dirname, 'backend', 'server.js'), 'utf8');
    assert(src.includes("require('./agent-queue-db')"), 'devia importar agent-queue-db');
    assert(src.includes('agentQueueDB.push('), 'queue/push/revert devem chamar push()');
    assert(src.includes('agentQueueDB.shift()'), 'pending devia chamar shift()');
    assert(src.includes('agentQueueDB.length()'), 'queue_length/queue_remaining devem usar length()');
    assert(src.includes('agentQueueDB.storeResult('), 'result POST devia chamar storeResult()');
    assert(src.includes('agentQueueDB.getResult('), 'result GET devia chamar getResult()');
    assert(src.includes('await agentQueueDB.init('), 'app.listen devia esperar init() antes de aceitar requests');
  });

  console.log('\nTotal: ' + (passed + failed) + ' | Passou: ' + passed + ' | Falhou: ' + failed);
  if (failed === 0) {
    console.log('=== TODOS OS TESTES PASSARAM ===');
    process.exit(0);
  } else {
    console.log('=== ALGUNS TESTES FALHARAM ===');
    process.exit(1);
  }
}

main();
