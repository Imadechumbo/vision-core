#!/usr/bin/env node
/**
 * §109 — Etapa D: testes estáticos de wiring (sem servidor, sem git real)
 * Uso: node _test109_static_wiring.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, 'backend', 'server.js');
const AGENT  = path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js');
const serverSrc = fs.readFileSync(SERVER, 'utf8');
const agentSrc  = fs.readFileSync(AGENT, 'utf8');

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

function assertIncludes(label, src, needle) {
  if (!src.includes(needle)) {
    throw new Error(label + ' — trecho esperado não encontrado: ' + JSON.stringify(needle.slice(0, 60)) + '...');
  }
}

console.log('§109 Static Wiring — apply_patch_multi (backend + vision-agent.js)\n');

test('server.js: valida type === \'apply_patch_multi\'', () => {
  assertIncludes('server.js', serverSrc, "type === 'apply_patch_multi'");
});

test('server.js: exige body.files como array não-vazio', () => {
  assertIncludes('server.js', serverSrc, 'apply_patch_multi_requires_files_array');
});

test('server.js: valida cada item do array tem file+patch', () => {
  assertIncludes('server.js', serverSrc, 'apply_patch_multi_each_file_requires_file_and_patch');
});

test('vision-agent.js: resolveTargetFile() existe', () => {
  assertIncludes('vision-agent.js', agentSrc, 'function resolveTargetFile(fileRef)');
});

test('vision-agent.js: rollbackFiles() existe', () => {
  assertIncludes('vision-agent.js', agentSrc, 'function rollbackFiles(relPaths)');
});

test('vision-agent.js: gitCommitMulti() existe e usa git add com múltiplos caminhos', () => {
  assertIncludes('vision-agent.js', agentSrc, 'function gitCommitMulti(filePaths, message)');
  assertIncludes('vision-agent.js', agentSrc, "spawnSync('git', ['add'].concat(rels)");
});

test('vision-agent.js: applyPatchMultiMission() existe', () => {
  assertIncludes('vision-agent.js', agentSrc, 'function applyPatchMultiMission(m)');
});

test('vision-agent.js: falha de patch dispara rollback de TODOS antes de retornar', () => {
  const fnStart = agentSrc.indexOf('function applyPatchMultiMission(m)');
  const fnSrc = agentSrc.slice(fnStart, fnStart + 6000);
  assertIncludes('applyPatchMultiMission', fnSrc, "rollbackFiles(applied.map(function(a) { return a.rel; }));");
  assertIncludes('applyPatchMultiMission', fnSrc, "action: 'patch_multi_failed'");
});

test('vision-agent.js: falha de validação Aegis também dispara rollback de TODOS', () => {
  const fnStart = agentSrc.indexOf('function applyPatchMultiMission(m)');
  const fnSrc = agentSrc.slice(fnStart, fnStart + 6000);
  assertIncludes('applyPatchMultiMission', fnSrc, "action: 'patch_multi_rollback'");
});

test('vision-agent.js: caminho feliz usa gitCommitMulti', () => {
  const fnStart = agentSrc.indexOf('function applyPatchMultiMission(m)');
  const fnSrc = agentSrc.slice(fnStart, fnStart + 8000);
  assertIncludes('applyPatchMultiMission', fnSrc, 'gitCommitMulti(applied.map(');
  assertIncludes('applyPatchMultiMission', fnSrc, "action:     commitResult.ok ? 'patch_multi_applied_committed'");
});

test('vision-agent.js: apply_patch_multi registrado no dispatcher do poll()', () => {
  assertIncludes('vision-agent.js', agentSrc, "m.type === 'apply_patch_multi' ? applyPatchMultiMission :");
});

test('vision-agent.js: applyPatchMission (§105) NÃO foi tocada', () => {
  assertIncludes('vision-agent.js', agentSrc, 'function applyPatchMission(m)');
  assertIncludes('vision-agent.js', agentSrc, "action:      commitResult.ok ? 'patch_applied_committed' : 'patch_applied_no_commit'");
});

console.log('\nTotal: ' + (passed + failed) + ' | Passou: ' + passed + ' | Falhou: ' + failed);
if (failed === 0) {
  console.log('=== TODOS OS TESTES PASSARAM ===');
  process.exit(0);
} else {
  console.log('=== ALGUNS TESTES FALHARAM ===');
  process.exit(1);
}
