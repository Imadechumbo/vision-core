#!/usr/bin/env node
/**
 * §116 — Dry-run multi-arquivo: testes unitários (sem servidor real, sem LLM)
 *
 * Combina o núcleo do dry-run real (§110 firewall / §111 simulação / §113 UI,
 * até aqui só 1 arquivo por missão) com a atomicidade multi-arquivo que o
 * apply_patch_multi (§109/§115) já entrega pra aplicação real. A peça nova é
 * um ramo dentro de sfDryRunRealMission (vision-agent.js) que detecta o
 * formato "files": [...] (§115) na resposta do LLM e simula CADA arquivo em
 * memória, com a mesma semântica tudo-ou-nada do apply_patch_multi real: se
 * qualquer arquivo falhar a simulação ou a validação, a missão inteira é
 * reportada como falha, sem nunca escrever em disco (single ou multi).
 *
 * Esta suíte cobre as peças isoladas: resolveTargetFileInRoot (novo helper,
 * extraído de resolveTargetFile pra reaproveitar a busca "caminho direto,
 * senão por nome" contra um target_path externo em vez do ROOT do agente) e
 * checagens estáticas confirmando a posição do novo ramo no código-fonte
 * (tem que vir ANTES do fallback de análise-só, senão o formato multi-arquivo
 * cairia em sf_dry_run_analysis_only por engano) e a presença das 3 novas
 * actions tanto no agente quanto no frontend.
 *
 * O fluxo assíncrono completo (mission queue → agent real → resultado),
 * incluindo os cenários de caminho feliz e as 2 falhas multi-arquivo, está em
 * _test116_dry_run_multi_e2e.cjs — este arquivo aqui é só as peças isoladas
 * e a regressão de que o caminho single-file (§111) continua intacto.
 *
 * Uso: node _test116_dry_run_multi_unit.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const va = require(path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js'));

let passed = 0;
let failed = 0;

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

console.log('§116 — Dry-Run Multi-Arquivo: testes unitários\n');

// ───────────────────────────────────────────────────────────────────
// resolveTargetFileInRoot — resolve contra um root explícito, NUNCA o
// ROOT fixo do agente (diferente de resolveTargetFile, que é só um atalho
// desta função com targetRoot=ROOT)
// ───────────────────────────────────────────────────────────────────

runSync('resolveTargetFileInRoot: caminho relativo direto resolve sem busca', () => {
  const dir = mkTempDir('vc-t116-resolve-direto');
  fs.writeFileSync(path.join(dir, 'a.js'), 'function a(){}', 'utf8');

  const r = va.resolveTargetFileInRoot(dir, 'a.js');
  assert(r.path === path.join(dir, 'a.js'), 'devia resolver pro caminho direto: ' + JSON.stringify(r));
  assert(r.via === 'direto', 'via devia ser "direto": ' + r.via);
});

runSync('resolveTargetFileInRoot: caminho relativo direto com subpasta resolve sem busca', () => {
  const dir = mkTempDir('vc-t116-resolve-subpasta');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'b.js'), 'function b(){}', 'utf8');

  const r = va.resolveTargetFileInRoot(dir, 'src/b.js');
  assert(r.path === path.join(dir, 'src', 'b.js'), 'devia resolver o caminho relativo com subpasta: ' + JSON.stringify(r));
  assert(r.via === 'direto', 'via devia ser "direto": ' + r.via);
});

runSync('resolveTargetFileInRoot: caminho relativo errado cai no fallback de busca por nome', () => {
  const dir = mkTempDir('vc-t116-resolve-fallback');
  fs.mkdirSync(path.join(dir, 'lib'));
  fs.writeFileSync(path.join(dir, 'lib', 'c.js'), 'function c(){}', 'utf8');

  // LLM mandou um caminho que não existe ("src/c.js"), mas o arquivo existe em "lib/c.js"
  const r = va.resolveTargetFileInRoot(dir, 'src/c.js');
  assert(r.path === path.join(dir, 'lib', 'c.js'), 'devia ter achado via busca por nome: ' + JSON.stringify(r));
  assert(r.via === 'busca por nome', 'via devia ser "busca por nome": ' + r.via);
});

runSync('resolveTargetFileInRoot: arquivo inexistente em qualquer lugar → path null + error', () => {
  const dir = mkTempDir('vc-t116-resolve-notfound');
  fs.writeFileSync(path.join(dir, 'existente.js'), 'function x(){}', 'utf8');

  const r = va.resolveTargetFileInRoot(dir, 'fantasma.js');
  assert(r.path === null, 'path devia ser null: ' + JSON.stringify(r));
  assert(typeof r.error === 'string' && r.error.length > 0, 'devia ter mensagem de erro');
});

runSync('resolveTargetFileInRoot: respeita SKIP_DIRS (não encontra dentro de node_modules)', () => {
  const dir = mkTempDir('vc-t116-resolve-skipdirs');
  fs.mkdirSync(path.join(dir, 'node_modules'));
  fs.writeFileSync(path.join(dir, 'node_modules', 'd.js'), 'function d(){}', 'utf8');

  const r = va.resolveTargetFileInRoot(dir, 'd.js');
  assert(r.path === null, 'não devia ter achado um arquivo só presente dentro de node_modules: ' + JSON.stringify(r));
});

runSync('resolveTargetFileInRoot: campo file ausente → error claro, sem exceção', () => {
  const dir = mkTempDir('vc-t116-resolve-empty');
  const r = va.resolveTargetFileInRoot(dir, null);
  assert(r.path === null, 'path devia ser null pra fileRef ausente');
  assert(r.error === 'campo file ausente', 'mensagem de erro devia ser específica: ' + r.error);
});

runSync('resolveTargetFileInRoot: opera no root passado, nunca no ROOT do agente (dois roots distintos)', () => {
  const rootA = mkTempDir('vc-t116-resolve-rootA');
  const rootB = mkTempDir('vc-t116-resolve-rootB');
  fs.writeFileSync(path.join(rootA, 'so-no-a.js'), 'function a(){}', 'utf8');
  fs.writeFileSync(path.join(rootB, 'so-no-b.js'), 'function b(){}', 'utf8');

  const rA = va.resolveTargetFileInRoot(rootA, 'so-no-b.js');
  assert(rA.path === null, 'arquivo só presente em rootB não devia ser achado resolvendo contra rootA: ' + JSON.stringify(rA));

  const rB = va.resolveTargetFileInRoot(rootB, 'so-no-b.js');
  assert(rB.path === path.join(rootB, 'so-no-b.js'), 'devia achar corretamente dentro do próprio root: ' + JSON.stringify(rB));
});

// ───────────────────────────────────────────────────────────────────
// simulatePatch + validatePatchContent reaproveitados sem modificação —
// regressão rápida confirmando que continuam puros e síncronos (a peça
// nova só os chama em loop, não muda a lógica interna deles)
// ───────────────────────────────────────────────────────────────────

runSync('simulatePatch: ainda 100% em memória quando chamado em sequência (loop multi-arquivo não introduz I/O real)', () => {
  const dir = mkTempDir('vc-t116-sim-loop');
  const fileA = path.join(dir, 'a.js');
  const fileB = path.join(dir, 'b.js');
  const origA = 'function a() { return 1 - 1; }\n';
  const origB = 'function b() { return 2 - 2; }\n';
  fs.writeFileSync(fileA, origA, 'utf8');
  fs.writeFileSync(fileB, origB, 'utf8');

  const rA = va.simulatePatch(fileA, { search: 'return 1 - 1;', replace: 'return 1 + 1;' }, 'code_patch');
  const rB = va.simulatePatch(fileB, { search: 'return 2 - 2;', replace: 'return 2 + 2;' }, 'code_patch');
  assert(rA.ok && rB.ok, 'os dois deviam simular com sucesso: ' + JSON.stringify({ rA, rB }));
  assert(fs.readFileSync(fileA, 'utf8') === origA, 'arquivo A real devia continuar intacto após o loop');
  assert(fs.readFileSync(fileB, 'utf8') === origB, 'arquivo B real devia continuar intacto após o loop');
});

// ───────────────────────────────────────────────────────────────────
// Checagens estáticas — vision-agent.js: ordem do novo ramo, exports,
// e as garantias de "nunca escreve" no bloco de sucesso multi-arquivo
// ───────────────────────────────────────────────────────────────────

runSync('vision-agent.js: ramo multi-arquivo (§116) vem ANTES do fallback de análise-só (§111)', () => {
  const agentSrc = fs.readFileSync(path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js'), 'utf8');
  const fnStart = agentSrc.indexOf('async function sfDryRunRealMission(m)');
  const fnEnd   = agentSrc.indexOf('\n/* ── Polling loop', fnStart);
  const fnSrc   = agentSrc.slice(fnStart, fnEnd === -1 ? fnStart + 8000 : fnEnd);

  const multiIdx        = fnSrc.indexOf("Array.isArray(patchJson.files)");
  const analysisOnlyIdx = fnSrc.indexOf("sf_dry_run_analysis_only");
  assert(multiIdx !== -1, 'devia checar Array.isArray(patchJson.files) dentro de sfDryRunRealMission');
  assert(analysisOnlyIdx !== -1, 'devia conter o fallback sf_dry_run_analysis_only (§111, não pode ter sido removido)');
  assert(multiIdx < analysisOnlyIdx, 'o ramo multi-arquivo TEM que vir antes do fallback de análise-só, senão o formato files[] cairia em analysis_only por engano — ramo@' + multiIdx + ' fallback@' + analysisOnlyIdx);
});

runSync('vision-agent.js: as 3 novas actions multi-arquivo existem no código', () => {
  const agentSrc = fs.readFileSync(path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js'), 'utf8');
  assert(agentSrc.includes("action:          'sf_dry_run_multi_completed'") || agentSrc.includes("action: 'sf_dry_run_multi_completed'"), 'devia ter a action sf_dry_run_multi_completed');
  assert(agentSrc.includes("action: 'sf_dry_run_multi_patch_failed'"), 'devia ter a action sf_dry_run_multi_patch_failed');
  assert(agentSrc.includes("action: 'sf_dry_run_multi_validation_failed'"), 'devia ter a action sf_dry_run_multi_validation_failed');
});

runSync('vision-agent.js: bloco de sucesso multi-arquivo declara written_to_disk:false e committed:false', () => {
  const agentSrc = fs.readFileSync(path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js'), 'utf8');
  const idx = agentSrc.indexOf("action:          'sf_dry_run_multi_completed'");
  assert(idx !== -1, 'devia achar o bloco de sucesso multi-arquivo');
  const block = agentSrc.slice(idx, idx + 600);
  assert(block.includes('written_to_disk: false'), 'bloco multi-completed devia declarar written_to_disk:false: ' + block.slice(0, 200));
  assert(block.includes('committed:       false'), 'bloco multi-completed devia declarar committed:false: ' + block.slice(0, 200));
});

runSync('vision-agent.js: ramo multi-arquivo usa resolveTargetFileInRoot contra resolvedTargetRoot (nunca ROOT do agente)', () => {
  const agentSrc = fs.readFileSync(path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js'), 'utf8');
  const fnStart = agentSrc.indexOf('async function sfDryRunRealMission(m)');
  const fnSrc   = agentSrc.slice(fnStart, fnStart + 8000);
  assert(fnSrc.includes('resolveTargetFileInRoot(resolvedTargetRoot, mf.file)'), 'devia resolver cada arquivo da leva contra resolvedTargetRoot, nunca ROOT');
});

runSync('vision-agent.js: module.exports inclui resolveTargetFileInRoot', () => {
  const agentSrc = fs.readFileSync(path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js'), 'utf8');
  const idx = agentSrc.lastIndexOf('module.exports');
  const block = agentSrc.slice(idx);
  assert(block.includes('resolveTargetFileInRoot'), 'module.exports devia incluir resolveTargetFileInRoot');
});

runSync('vision-agent.js: resolveTargetFile (usado por applyPatchMultiMission, §109) agora delega pra resolveTargetFileInRoot com ROOT — refactor sem mudança de comportamento', () => {
  const agentSrc = fs.readFileSync(path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js'), 'utf8');
  const idx = agentSrc.indexOf('function resolveTargetFile(fileRef)');
  assert(idx !== -1, 'devia ainda existir a função resolveTargetFile (não pode ter sido removida — apply_patch_multi depende dela)');
  const block = agentSrc.slice(idx, idx + 200);
  assert(block.includes('resolveTargetFileInRoot(ROOT, fileRef)'), 'resolveTargetFile devia delegar pra resolveTargetFileInRoot(ROOT, fileRef): ' + block);
});

// ───────────────────────────────────────────────────────────────────
// Checagens estáticas — vision-core-bundle.js: o frontend sabe exibir
// o caso multi-arquivo, sem regredir o caso single-file (§113)
// ───────────────────────────────────────────────────────────────────

runSync('vision-core-bundle.js: renderSfDryRunResult reconhece sf_dry_run_multi_completed como sucesso', () => {
  const bundleSrc = fs.readFileSync(path.join(__dirname, 'frontend', 'assets', 'vision-core-bundle.js'), 'utf8');
  const idx = bundleSrc.indexOf('function renderSfDryRunResult(rd)');
  assert(idx !== -1, 'devia existir renderSfDryRunResult');
  const block = bundleSrc.slice(idx, idx + 2200);
  assert(block.includes("rd.action === 'sf_dry_run_multi_completed'"), 'renderSfDryRunResult devia checar a nova action multi-arquivo');
  assert(block.includes('rd.files.forEach'), 'renderSfDryRunResult devia iterar rd.files pra renderizar um grid de diff por arquivo');
  assert(block.includes("rd.action === 'sf_dry_run_completed' && rd.diff_preview"), 'caminho single-file (§113) devia continuar intacto, sem regressão');
});

runSync('vision-core-bundle.js: renderSfDryRunPanel trata sf_dry_run_multi_completed como sucesso na mensagem de status', () => {
  const bundleSrc = fs.readFileSync(path.join(__dirname, 'frontend', 'assets', 'vision-core-bundle.js'), 'utf8');
  const idx = bundleSrc.indexOf('function renderSfDryRunPanel(');
  assert(idx !== -1, 'devia existir renderSfDryRunPanel');
  const block = bundleSrc.slice(idx, idx + 3000);
  assert(block.includes("sf_dry_run_multi_completed"), 'mensagem de status do painel devia reconhecer a nova action multi-arquivo');
});

runSync('vision-core-bundle.js: vcQueueSfDryRunViaAgent não foi tocado (agnóstico a single/multi por design, §113)', () => {
  const bundleSrc = fs.readFileSync(path.join(__dirname, 'frontend', 'assets', 'vision-core-bundle.js'), 'utf8');
  const idx = bundleSrc.indexOf('function vcQueueSfDryRunViaAgent(');
  assert(idx !== -1, 'devia existir vcQueueSfDryRunViaAgent');
  const block = bundleSrc.slice(idx, idx + 1500);
  assert(!block.includes('sf_dry_run_multi'), 'a função de enfileiramento/poll não precisa saber de single vs multi — a decisão é só do agente, não do frontend nesta etapa');
});

console.log('\nTotal: ' + (passed + failed) + ' | Passou: ' + passed + ' | Falhou: ' + failed);
if (failed === 0) {
  console.log('=== TODOS OS TESTES PASSARAM ===');
  process.exit(0);
} else {
  console.log('=== ALGUNS TESTES FALHARAM ===');
  process.exit(1);
}
