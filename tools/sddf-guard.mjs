#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const failures = [];
const read = (path) => readFileSync(path, 'utf8');
const index = read('frontend/index.html');
const spec = read('SDDF_SPEC.md');
const uiCommand = read('frontend/assets/vision-ui-command.js');

function fail(message) {
  failures.push(message);
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

const requiredSpecTerms = [
  'runtime_ownership_gate',
  'report_truth_gate',
  'post_deploy_completion_gate',
  'observed_final_state_gate',
  'Estados oficiais de missão',
  'Regra de novos runtimes',
  'TechNetGame Marvel Tokon',
  'Proibições absolutas',
  'Complemento V13.1'
];

for (const term of requiredSpecTerms) {
  if (!spec.includes(term)) fail(`SDDF_SPEC.md perdeu termo obrigatório: ${term}`);
}

const legacyRuntimeLoads = [
  'assets/vision-runtime-v297.js',
  'assets/vision-v297-interactions.js',
  'assets/vision-v298-command-chat.js',
  'assets/vision-v299-fullstack-runtime.js',
  'assets/vision-v2910-clean-runtime.js',
  'assets/vision-v32-orbit-runtime.js',
  'assets/vision-v34-enterprise.js',
  'assets/vision-v35-telemetry.js',
  'assets/vision-v44-runtime-consistency.js',
  'assets/vision-runtime-owner.js?v=83',
  'assets/vision-ui-command.js?v=83'
];

for (const runtime of legacyRuntimeLoads) {
  if (index.includes(runtime)) fail(`index.html carrega runtime legado: ${runtime}`);
}

const allowedRuntimeLoads = [
  'assets/v23-ui-system.js',
  'assets/v231-backend-agents.js',
  'assets/vision-ui-command.js?v=131',
  'assets/vision-runtime-owner.js?v=131'
];

for (const runtime of allowedRuntimeLoads) {
  if (!index.includes(runtime)) fail(`index.html não carrega runtime permitido obrigatório: ${runtime}`);
}

const scriptSrcs = Array.from(index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi), (match) => match[1]);
for (const src of scriptSrcs) {
  const normalized = src.replace(/\?.*$/, '');
  const isAllowed = allowedRuntimeLoads.some((allowed) => src === allowed || normalized === allowed.replace(/\?.*$/, ''));
  if (!isAllowed) fail(`index.html possui script ativo fora da lista V13.1: ${src}`);
}

if (count(index, 'vision-runtime-owner.js') !== 1) {
  fail('index.html deve conter exatamente uma ocorrência de vision-runtime-owner.js');
}

if (count(index, 'vision-ui-command.js') !== 1) {
  fail('index.html deve conter exatamente uma ocorrência de vision-ui-command.js');
}

const duplicateVersionPattern = /<script\b[^>]*\bsrc=["']([^"'?]+)(?:\?v=([^"']+))?["'][^>]*>/gi;
const versions = new Map();
for (const [, path, version = 'unversioned'] of index.matchAll(duplicateVersionPattern)) {
  if (!versions.has(path)) versions.set(path, new Set());
  versions.get(path).add(version);
}
for (const [path, seen] of versions) {
  if (seen.size > 1) fail(`index.html carrega versões duplicadas para ${path}: ${Array.from(seen).join(', ')}`);
}

const prohibitedIndexTerms = [
  'RUN_PATH',
  'STREAM_PATH',
  'EventSource',
  "fetch('/api/run-live')",
  'executeBtn.onclick',
  'pass_gold',
  'promotion_allowed'
];

for (const term of prohibitedIndexTerms) {
  if (index.includes(term)) fail(`index.html contém termo proibido: ${term}`);
}

const prohibitedUiCommandTerms = [
  'EventSource',
  '/api/run-live',
  '/api/github/create-pr',
  'promotion_allowed',
  'pass_gold:true'
];

for (const term of prohibitedUiCommandTerms) {
  if (uiCommand.includes(term)) fail(`vision-ui-command.js contém termo proibido: ${term}`);
}

if (failures.length) {
  console.error('SDDF Guard failed:');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('SDDF Guard passed.');
