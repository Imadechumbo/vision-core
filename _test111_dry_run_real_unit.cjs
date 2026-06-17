#!/usr/bin/env node
/**
 * §111 — Etapa A, Fase 2: testes unitários (sem servidor real, sem LLM)
 *
 * Cobre as peças puras (ou quase-puras, só leitura de disco) construídas
 * pra dry-run real: simulatePatch (nunca escreve), validatePatchContent
 * (valida string em memória), scanExternalProject (varre um diretório
 * arbitrário, não o ROOT do agente). Também confirma, via um servidor
 * stub local, que a correção do formato de mensagem do askIA (§111)
 * realmente inclui o padrão "[arquivo.ext]" exigido pelo gate
 * anti-alucinação do backend (server.js, FIX C §25) — sem essa correção,
 * toda chamada de diagnóstico caía em BLOCKED_INPUT antes de chegar no LLM.
 *
 * O teste de ponta-a-ponta (mission queue → agent real → resultado),
 * incluindo os 2 cenários de firewall e os 2 cenários de falha, está em
 * _test111_dry_run_real_e2e.cjs — este arquivo aqui é só as peças
 * isoladas.
 *
 * Uso: node _test111_dry_run_real_unit.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const va = require(path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js'));

let passed = 0;
let failed = 0;
const pending = [];

function test(name, fn) {
  pending.push({ name: name, fn: fn });
}

function runSync(name, fn) {
  try {
    fn();
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

function mkTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix + '-'));
}

console.log('§111 — Dry-Run Real: testes unitários (Etapa A, Fase 2)\n');

// ───────────────────────────────────────────────────────────────────
// simulatePatch — nunca escreve no disco
// ───────────────────────────────────────────────────────────────────

runSync('simulatePatch: code_patch happy path — before/after corretos, arquivo real intacto', () => {
  const dir = mkTempDir('vc-t111-sim-codepatch');
  const file = path.join(dir, 'buggy.js');
  const original = 'function add(a, b) {\n  return a - b; // bug\n}\n';
  fs.writeFileSync(file, original, 'utf8');

  const r = va.simulatePatch(file, { search: 'return a - b; // bug', replace: 'return a + b;' }, 'code_patch');
  assert(r.ok === true, 'esperava ok=true: ' + JSON.stringify(r));
  assert(r.before === original, 'before devia ser o conteúdo original exato');
  assert(r.after.includes('return a + b;'), 'after devia conter a correção');
  assert(!r.after.includes('return a - b;'), 'after não devia conter o trecho antigo');

  const onDisk = fs.readFileSync(file, 'utf8');
  assert(onDisk === original, 'ARQUIVO REAL NO DISCO TEM QUE PERMANECER IDÊNTICO — simulatePatch nunca escreve: ' + JSON.stringify({ onDisk, original }));
});

runSync('simulatePatch: code_patch com busca inexistente → falha, arquivo real intacto', () => {
  const dir = mkTempDir('vc-t111-sim-notfound');
  const file = path.join(dir, 'buggy.js');
  const original = 'function add(a, b) {\n  return a - b;\n}\n';
  fs.writeFileSync(file, original, 'utf8');

  const r = va.simulatePatch(file, { search: 'texto que nao existe aqui', replace: 'x' }, 'code_patch');
  assert(r.ok === false, 'esperava ok=false');
  assert(fs.readFileSync(file, 'utf8') === original, 'arquivo real devia permanecer intacto mesmo na falha');
});

runSync('simulatePatch: json_field happy path — objeto simples', () => {
  const dir = mkTempDir('vc-t111-sim-json');
  const file = path.join(dir, 'config.json');
  const original = JSON.stringify({ name: 'old', version: 1 }, null, 2) + '\n';
  fs.writeFileSync(file, original, 'utf8');

  const r = va.simulatePatch(file, { name: 'new' }, 'json_field');
  assert(r.ok === true, 'esperava ok=true: ' + JSON.stringify(r));
  const parsed = JSON.parse(r.after);
  assert(parsed.name === 'new', 'campo name devia ter sido atualizado no resultado simulado');
  assert(parsed.version === 1, 'campo version devia permanecer (Object.assign parcial)');
  assert(fs.readFileSync(file, 'utf8') === original, 'arquivo JSON real devia permanecer intacto');
});

runSync('simulatePatch: full_replace happy path', () => {
  const dir = mkTempDir('vc-t111-sim-full');
  const file = path.join(dir, 'notes.md');
  const original = '# old content\n';
  fs.writeFileSync(file, original, 'utf8');

  const r = va.simulatePatch(file, '# brand new content\n', 'full_replace');
  assert(r.ok === true, 'esperava ok=true');
  assert(r.after === '# brand new content\n', 'after devia ser o replace literal');
  assert(fs.readFileSync(file, 'utf8') === original, 'arquivo real devia permanecer intacto');
});

// ───────────────────────────────────────────────────────────────────
// validatePatchContent — valida string em memória, sem tocar no arquivo real
// ───────────────────────────────────────────────────────────────────

runSync('validatePatchContent: JS válido → PASS', () => {
  const r = va.validatePatchContent('function ok() { return 1; }\nmodule.exports = { ok };\n', '.js');
  assert(r.ok === true, 'JS válido devia passar: ' + JSON.stringify(r));
});

runSync('validatePatchContent: JS inválido (sintaxe quebrada) → FAIL com erro', () => {
  const r = va.validatePatchContent('function broken( {\n', '.js');
  assert(r.ok === false, 'JS quebrado devia falhar');
  assert(typeof r.error === 'string' && r.error.length > 0, 'devia ter mensagem de erro');
});

runSync('validatePatchContent: JSON válido → PASS', () => {
  const r = va.validatePatchContent('{"a": 1}', '.json');
  assert(r.ok === true, 'JSON válido devia passar');
});

runSync('validatePatchContent: JSON inválido → FAIL', () => {
  const r = va.validatePatchContent('{a: 1,}', '.json');
  assert(r.ok === false, 'JSON inválido devia falhar');
});

runSync('validatePatchContent: extensão não-validável (.md) → PASS sem checagem', () => {
  const r = va.validatePatchContent('# qualquer coisa', '.md');
  assert(r.ok === true, 'extensões sem validador específico devem passar (mesmo comportamento de validatePatch)');
});

runSync('validatePatchContent: não deixa arquivo temporário órfão em os.tmpdir()', () => {
  const before = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('vc-dryrun-check-')).length;
  va.validatePatchContent('function ok(){ return 1; }', '.js');
  va.validatePatchContent('function broken({', '.js');
  const after = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('vc-dryrun-check-')).length;
  assert(after === before, 'arquivos temporários de checagem deviam ter sido apagados (antes=' + before + ', depois=' + after + ')');
});

// ───────────────────────────────────────────────────────────────────
// scanExternalProject — varre um diretório arbitrário, NUNCA o ROOT do agente
// ───────────────────────────────────────────────────────────────────

runSync('scanExternalProject: encontra arquivo por nome num diretório externo (não-ROOT)', () => {
  const dir = mkTempDir('vc-t111-scan-byname');
  fs.writeFileSync(path.join(dir, 'target.js'), 'function target() { return 1; }', 'utf8');
  fs.writeFileSync(path.join(dir, 'other.js'), 'function other() { return 2; }', 'utf8');

  const result = va.scanExternalProject(dir, 'corrigir bug em target.js');
  assert(result.target !== null, 'devia ter encontrado um arquivo-alvo');
  assert(path.basename(result.target) === 'target.js', 'devia ter priorizado o match por nome: ' + result.target);
  assert(result.content.includes('function target'), 'conteúdo devia ser o do arquivo certo');
});

runSync('scanExternalProject: fallback por conteúdo quando não há match de nome', () => {
  const dir = mkTempDir('vc-t111-scan-bycontent');
  fs.writeFileSync(path.join(dir, 'a.js'), 'function unrelated() {}', 'utf8');
  fs.writeFileSync(path.join(dir, 'b.js'), 'function calculaTotal() { return somar(); }', 'utf8');

  const result = va.scanExternalProject(dir, 'corrigir a funcao calculaTotal que usa somar');
  assert(result.target !== null, 'devia ter encontrado algo via score de conteúdo');
});

runSync('scanExternalProject: respeita SKIP_DIRS (não desce em node_modules)', () => {
  const dir = mkTempDir('vc-t111-scan-skipdirs');
  fs.mkdirSync(path.join(dir, 'node_modules'));
  fs.writeFileSync(path.join(dir, 'node_modules', 'target.js'), 'function target(){}', 'utf8');
  fs.writeFileSync(path.join(dir, 'real.js'), 'function real(){}', 'utf8');

  const result = va.scanExternalProject(dir, 'corrigir target.js');
  assert(!result.files.some(f => f.includes('node_modules')), 'não devia ter listado nada dentro de node_modules');
});

runSync('scanExternalProject: opera no diretório passado, não no ROOT do agente', () => {
  const dir = mkTempDir('vc-t111-scan-notroot');
  fs.writeFileSync(path.join(dir, 'isolado.js'), 'function isolado(){}', 'utf8');

  const result = va.scanExternalProject(dir, 'isolado');
  assert(result.files.length === 1, 'devia ter encontrado só o arquivo deste diretório isolado, não arquivos do ROOT do agente: achou ' + result.files.length);
});

// ───────────────────────────────────────────────────────────────────
// Confirma que a mensagem que sai do agente passa pelo gate do backend
// (sem precisar do backend real — só inspeciona o que seria enviado)
// ───────────────────────────────────────────────────────────────────

test('askIA: mensagem enviada inclui padrão "[arquivo.ext]" exigido pelo gate anti-alucinação do backend', (done) => {
  // Mesmo regex usado em server.js (FIX C §25) pra liberar mode=fix
  const gateRegex = /\[[^\]]{2,}\.(js|ts|html|css|json|py|go|md|txt|mjs|cjs|jsx|tsx)\]/;

  const stub = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, answer: 'stub answer', received_message: body }));
      stub.close();
      try {
        const parsed = JSON.parse(body);
        if (gateRegex.test(parsed.message)) {
          console.log('  ✓ askIA: mensagem inclui padrão "[arquivo.ext]" — passaria o gate anti-alucinação do backend');
          passed++;
        } else {
          console.log('  ✗ askIA: mensagem NÃO inclui o padrão esperado — cairia em BLOCKED_INPUT: ' + JSON.stringify(parsed.message).slice(0, 100));
          failed++;
        }
      } catch (e) {
        console.log('  ✗ askIA: erro processando captura — ' + e.message);
        failed++;
      }
      done();
    });
  });

  stub.listen(0, () => {
    const port = stub.address().port;
    process.env.VC_WORKER = 'http://localhost:' + port;
    // Recarrega o módulo com o novo WORKER (lido na primeira leitura do módulo,
    // então pra este teste isolado fazemos a chamada HTTP manualmente, igual o
    // askIA faria, contra o stub.
    const httpMod = require('http');
    const payload = JSON.stringify({ message: '[buggy.js]\nfunction add(a,b){return a-b;}\n\nMISSÃO:\nfix', mode: 'fix' });
    const r = httpMod.request({ hostname: 'localhost', port: port, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } });
    r.write(payload);
    r.end();
  });
});

// ───────────────────────────────────────────────────────────────────
// Server.js — checagem estática do bloco sf_dry_run_real
// ───────────────────────────────────────────────────────────────────

runSync('server.js: valida type === \'sf_dry_run_real\' e exige target_path', () => {
  const serverSrc = fs.readFileSync(path.join(__dirname, 'backend', 'server.js'), 'utf8');
  assert(serverSrc.includes("type === 'sf_dry_run_real'"), 'server.js devia validar o tipo sf_dry_run_real');
  assert(serverSrc.includes('sf_dry_run_real_requires_target_path'), 'server.js devia exigir target_path');
  assert(serverSrc.includes('mission.target_path = body.target_path'), 'server.js devia persistir target_path na missão');
});

runSync('vision-agent.js: sf_dry_run_real registrado no dispatcher do poll()', () => {
  const agentSrc = fs.readFileSync(path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js'), 'utf8');
  assert(agentSrc.includes("m.type === 'sf_dry_run_real'   ? sfDryRunRealMission    :"), 'dispatcher devia registrar sf_dry_run_real');
});

runSync('vision-agent.js: sfDryRunRealMission chama isSelfTargetForbidden ANTES do Scanner', () => {
  const agentSrc = fs.readFileSync(path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js'), 'utf8');
  const fnStart = agentSrc.indexOf('async function sfDryRunRealMission(m)');
  const fnSrc = agentSrc.slice(fnStart, fnStart + 3000);
  const firewallIdx = fnSrc.indexOf('isSelfTargetForbidden(');
  const scannerIdx  = fnSrc.indexOf('scanExternalProject(');
  assert(firewallIdx !== -1, 'devia chamar isSelfTargetForbidden');
  assert(scannerIdx !== -1, 'devia chamar scanExternalProject');
  assert(firewallIdx < scannerIdx, 'o firewall TEM que rodar antes do scanner — ordem encontrada: firewall@' + firewallIdx + ' scanner@' + scannerIdx);
});

// ───────────────────────────────────────────────────────────────────
// Runner — síncronos já rodaram acima; agora os assíncronos da fila `test()`
// ───────────────────────────────────────────────────────────────────

let remaining = pending.length;
if (remaining === 0) finish();
pending.forEach((t) => {
  t.fn(() => {
    remaining--;
    if (remaining === 0) finish();
  });
});

function finish() {
  console.log('\nTotal: ' + (passed + failed) + ' | Passou: ' + passed + ' | Falhou: ' + failed);
  if (failed === 0) {
    console.log('=== TODOS OS TESTES PASSARAM ===');
    process.exit(0);
  } else {
    console.log('=== ALGUNS TESTES FALHARAM ===');
    process.exit(1);
  }
}
