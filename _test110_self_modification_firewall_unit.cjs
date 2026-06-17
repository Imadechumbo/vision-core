#!/usr/bin/env node
/**
 * §110 — Etapa A (Fase 1): testes do firewall de auto-modificação
 * Uso: node _test110_self_modification_firewall_unit.cjs
 * Requer: node, git.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const va = require(path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js'));

let passed = 0;
let failed = 0;

function test(name, fn) {
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

function gitInit(dir) {
  execSync('git init -q', { cwd: dir });
  execSync('git config user.email "test@vc.test"', { cwd: dir });
  execSync('git config user.name "VC Test"', { cwd: dir });
}

function gitAddRemote(dir, url) {
  execSync('git remote add origin ' + JSON.stringify(url), { cwd: dir });
}

const REAL_ROOT = path.resolve(__dirname);

console.log('§110 — Firewall de Auto-Modificação (Etapa A, Fase 1)\n');
console.log('ROOT detectado pelo vision-agent.js: ' + REAL_ROOT + '\n');

test('CAMADA 1: caminho idêntico ao ROOT → bloqueado', () => {
  const r = va.isSelfTargetForbidden(REAL_ROOT);
  assert(r.forbidden === true, 'esperava forbidden=true, recebeu ' + JSON.stringify(r));
  assert(r.reason.includes('próprio vision-core'), 'reason inesperado: ' + r.reason);
});

test('CAMADA 1: caminho idêntico ao ROOT com barra final → bloqueado (normalização)', () => {
  const r = va.isSelfTargetForbidden(REAL_ROOT + path.sep);
  assert(r.forbidden === true, 'esperava forbidden=true');
});

test('CAMADA 1: subpasta do ROOT (ex: backend/) → bloqueada', () => {
  const r = va.isSelfTargetForbidden(path.join(REAL_ROOT, 'backend'));
  assert(r.forbidden === true, 'esperava forbidden=true');
});

test('CAMADA 1: sub-subpasta do ROOT (ex: frontend/downloads/) → bloqueada', () => {
  const r = va.isSelfTargetForbidden(path.join(REAL_ROOT, 'frontend', 'downloads'));
  assert(r.forbidden === true, 'esperava forbidden=true');
});

test('CAMADA 2: pasta-pai que contém o ROOT → bloqueada', () => {
  const r = va.isSelfTargetForbidden(path.dirname(REAL_ROOT));
  assert(r.forbidden === true, 'esperava forbidden=true (pasta-pai do vision-core)');
  assert(r.reason.includes('pasta-pai'), 'reason inesperado: ' + r.reason);
});

test('CAMADA 1/2: diretório completamente não-relacionado → NÃO bloqueado (negativo)', () => {
  const unrelated = mkTempDir('vc-t110-unrelated');
  const r = va.isSelfTargetForbidden(unrelated);
  assert(r.forbidden === false, 'NÃO devia bloquear um diretório legítimo e não-relacionado: ' + JSON.stringify(r));
});

test('CAMADA 1/2: symlink apontando pra dentro do ROOT → bloqueado (resolve symlink)', () => {
  const linkParent = mkTempDir('vc-t110-symlink-parent');
  const linkPath = path.join(linkParent, 'sneaky-link');
  try {
    fs.symlinkSync(path.join(REAL_ROOT, 'backend'), linkPath, 'dir');
  } catch (e) {
    console.log('    (symlink não suportado neste ambiente, pulando assert real)');
    return;
  }
  const r = va.isSelfTargetForbidden(linkPath);
  assert(r.forbidden === true, 'symlink pro vision-core devia ser bloqueado após resolução: ' + JSON.stringify(r));
});

test('CAMADA 3: remote git https com .git → bloqueado', () => {
  const dir = mkTempDir('vc-t110-remote-https-git');
  gitInit(dir);
  gitAddRemote(dir, 'https://github.com/Imadechumbo/vision-core.git');
  const r = va.isSelfTargetForbidden(dir);
  assert(r.forbidden === true, 'esperava bloqueio por remote git (https+.git)');
  assert(r.reason.includes('remote git'), 'reason inesperado: ' + r.reason);
});

test('CAMADA 3: remote git https SEM .git → bloqueado (normalização de sufixo)', () => {
  const dir = mkTempDir('vc-t110-remote-https-nogit');
  gitInit(dir);
  gitAddRemote(dir, 'https://github.com/Imadechumbo/vision-core');
  const r = va.isSelfTargetForbidden(dir);
  assert(r.forbidden === true, 'esperava bloqueio mesmo sem sufixo .git');
});

test('CAMADA 3: remote git formato SSH (git@host:org/repo.git) → bloqueado (normalização ssh→https)', () => {
  const dir = mkTempDir('vc-t110-remote-ssh');
  gitInit(dir);
  gitAddRemote(dir, 'git@github.com:Imadechumbo/vision-core.git');
  const r = va.isSelfTargetForbidden(dir);
  assert(r.forbidden === true, 'esperava bloqueio mesmo em formato ssh');
});

test('CAMADA 3: remote do segundo repo conhecido (gitlab pages) → bloqueado', () => {
  const dir = mkTempDir('vc-t110-remote-gitlab');
  gitInit(dir);
  gitAddRemote(dir, 'https://gitlab.com/imadechumbo/vision-core-pages.git');
  const r = va.isSelfTargetForbidden(dir);
  assert(r.forbidden === true, 'esperava bloqueio pro segundo remote conhecido (gitlab)');
});

test('CAMADA 3: remote git de um projeto totalmente diferente → NÃO bloqueado (negativo)', () => {
  const dir = mkTempDir('vc-t110-remote-other');
  gitInit(dir);
  gitAddRemote(dir, 'https://github.com/someoneelse/totally-different-project.git');
  const r = va.isSelfTargetForbidden(dir);
  assert(r.forbidden === false, 'NÃO devia bloquear um remote git legítimo e não-relacionado: ' + JSON.stringify(r));
});

test('CAMADA 3: repo git sem remote nenhum → NÃO bloqueado por esta camada (negativo)', () => {
  const dir = mkTempDir('vc-t110-remote-none');
  gitInit(dir);
  const r = va.isSelfTargetForbidden(dir);
  assert(r.forbidden === false, 'repo git local sem remote não devia ser bloqueado: ' + JSON.stringify(r));
});

test('CAMADA 4: CLAUDE.md + SDDF_SPEC.md juntos (sem git, sem relação de caminho) → bloqueado', () => {
  const dir = mkTempDir('vc-t110-fingerprint-full');
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# copia ou clone sem remote');
  fs.writeFileSync(path.join(dir, 'SDDF_SPEC.md'), '# copia ou clone sem remote');
  const r = va.isSelfTargetForbidden(dir);
  assert(r.forbidden === true, 'esperava bloqueio por fingerprint (os 2 arquivos juntos)');
  assert(r.reason.includes('fingerprint'), 'reason inesperado: ' + r.reason);
});

test('CAMADA 4: só CLAUDE.md, sem SDDF_SPEC.md → NÃO bloqueado (negativo — precisa dos 2 juntos)', () => {
  const dir = mkTempDir('vc-t110-fingerprint-partial-a');
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# qualquer outro projeto pode ter um CLAUDE.md');
  const r = va.isSelfTargetForbidden(dir);
  assert(r.forbidden === false, 'um único arquivo não devia disparar o fingerprint: ' + JSON.stringify(r));
});

test('CAMADA 4: só SDDF_SPEC.md, sem CLAUDE.md → NÃO bloqueado (negativo — precisa dos 2 juntos)', () => {
  const dir = mkTempDir('vc-t110-fingerprint-partial-b');
  fs.writeFileSync(path.join(dir, 'SDDF_SPEC.md'), '# qualquer outro projeto pode ter um SDDF_SPEC.md');
  const r = va.isSelfTargetForbidden(dir);
  assert(r.forbidden === false, 'um único arquivo não devia disparar o fingerprint: ' + JSON.stringify(r));
});

test('Caminho que ainda não existe no disco → não lança exceção, resolve graciosamente', () => {
  const hypothetical = path.join(os.tmpdir(), 'vc-t110-does-not-exist-' + Date.now());
  let r;
  let threw = false;
  try { r = va.isSelfTargetForbidden(hypothetical); } catch (e) { threw = true; }
  assert(!threw, 'não devia lançar exceção pra um caminho hipotético/inexistente');
  assert(r.forbidden === false, 'caminho hipotético não-relacionado não devia ser bloqueado');
});

test('isPathInside: caso base (parent === child) → true', () => {
  assert(va.isPathInside('/a/b/c', '/a/b/c') === true, 'parent igual a child devia retornar true');
});

test('isPathInside: child genuinamente fora do parent → false', () => {
  assert(va.isPathInside('/a/b/c', '/x/y/z') === false, 'caminhos não-relacionados devia retornar false');
});

test('normalizeGitUrl: https+.git, https sem .git, e ssh todos normalizam pro mesmo valor', () => {
  const a = va.normalizeGitUrl('https://github.com/Imadechumbo/vision-core.git');
  const b = va.normalizeGitUrl('https://github.com/Imadechumbo/vision-core');
  const c = va.normalizeGitUrl('git@github.com:Imadechumbo/vision-core.git');
  assert(a === b && b === c, 'as 3 variações deviam normalizar pro mesmo valor: ' + JSON.stringify([a, b, c]));
});

console.log('\nTotal: ' + (passed + failed) + ' | Passou: ' + passed + ' | Falhou: ' + failed);
if (failed === 0) {
  console.log('=== TODOS OS TESTES PASSARAM ===');
  process.exit(0);
} else {
  console.log('=== ALGUNS TESTES FALHARAM ===');
  process.exit(1);
}
