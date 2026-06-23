import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function read(rel) {
  const path = resolve(root, rel);
  if (!existsSync(path)) {
    failures.push(`Arquivo obrigatório ausente: ${rel}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function allMatches(text, re) {
  return [...text.matchAll(re)];
}

const index = read('frontend/index.html');
const owner = read('frontend/assets/vision-runtime-owner.js');
const worker = read('worker/src/index.js');
read('SDDF_SPEC.md');

const forbiddenIndex = [
  'executeBtn.onclick',
  'new EventSource',
  'RUN_PATH',
  'STREAM_PATH',
  'vision-runtime-v297',
  'vision-v297-interactions',
  'vision-v298-command-chat.js',
  'vision-v299',
  'vision-v2910',
  'vision-v32',
  'vision-v34',
  'vision-v35',
  'vision-v44'
];

for (const token of forbiddenIndex) {
  assert(!index.includes(token), `frontend/index.html contém marcador legado proibido: ${token}`);
}

const expectedScripts = [
  'assets/v23-ui-system.js',
  'assets/v231-backend-agents.js',
  'assets/vision-runtime-owner.js',
  'assets/vision-ui-command.js'
];
const scripts = allMatches(index, /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi).map((m) => m[1].split('?')[0]);
assert(scripts.length === expectedScripts.length, `frontend/index.html deve carregar exatamente ${expectedScripts.length} scripts; encontrou ${scripts.length}: ${scripts.join(', ')}`);
for (const script of expectedScripts) {
  assert(scripts.includes(script), `frontend/index.html não carrega script obrigatório: ${script}`);
}
for (const script of scripts) {
  assert(expectedScripts.includes(script), `frontend/index.html carrega script não permitido: ${script}`);
}

assert(/executeBtn/.test(owner), 'vision-runtime-owner.js deve controlar executeBtn');
assert(/addEventListener\(\s*['"]click['"]\s*,\s*runMission/.test(owner), 'vision-runtime-owner.js deve registrar runMission no click do executeBtn');
assert(/\/api\/run-live['"]/.test(owner), 'vision-runtime-owner.js deve chamar POST /api/run-live');
assert(/method:\s*['"]POST['"]/.test(owner), 'vision-runtime-owner.js deve usar POST em /api/run-live');
assert(/\/api\/run-live-stream\?mission_id=/.test(owner), 'vision-runtime-owner.js deve abrir SSE usando apenas mission_id');
assert(!/run-live-stream\?[^'"`]*mission=/.test(owner), 'vision-runtime-owner.js não pode colocar texto da missão na URL SSE');
assert(/new\s+EventSource\(url\)/.test(owner), 'vision-runtime-owner.js deve abrir EventSource a partir da URL mission_id-only');
assert(/releaseLock\(['"]done['"]\)/.test(owner), 'vision-runtime-owner.js deve liberar lock em done');
assert(/releaseLock\(['"]fail['"]\)/.test(owner), 'vision-runtime-owner.js deve liberar lock em fail');
assert(/releaseLock\(['"]error['"]\)/.test(owner), 'vision-runtime-owner.js deve liberar lock em error');
assert(/__VISION_SSE_EVIDENCE__/.test(owner) && /evidence\.push/.test(owner), 'vision-runtime-owner.js deve acumular evidence do SSE');

assert(/PAGES_ORIGIN_RE\s*=\s*\/\^https:/.test(worker) && /visioncoreai\\\.pages\\\.dev/.test(worker), 'worker deve ter CORS dinâmico para https://*.visioncoreai.pages.dev');
assert(/request\.method\s*===\s*['"]OPTIONS['"][\s\S]*status:\s*204/.test(worker), 'worker deve responder OPTIONS com 204');
for (const eventName of ['open', 'step', 'gate', 'done']) {
  assert(new RegExp(`type:\\s*['"]${eventName}['"]`).test(worker), `worker deve emitir SSE ${eventName}`);
}
assert(/url\.pathname\s*===\s*['"]\/api\/run-live['"]/.test(worker), 'worker deve preservar/implementar POST /api/run-live');
assert(/url\.pathname\s*===\s*['"]\/api\/run-live-stream['"]/.test(worker), 'worker deve preservar/implementar /api/run-live-stream');
assert(/pass_gold:\s*false/.test(worker), 'worker deve retornar pass_gold:false quando evidência for insuficiente');
assert(!/promotion_allowed:\s*true/.test(worker), 'worker não pode retornar promotion_allowed:true em stub');

const hasPassGoldRoute =
  worker.includes('url.pathname === "/api/pass-gold/score"') ||
  worker.includes("url.pathname === '/api/pass-gold/score'");

assert(hasPassGoldRoute, 'worker deve conter rota /api/pass-gold/score');

if (hasPassGoldRoute) {
  assert(!/\/api\/pass-gold\/score[\s\S]{0,600}status:\s*['"]GOLD['"]/.test(worker), '/api/pass-gold/score não pode retornar GOLD sem evidência real');
  assert(/\/api\/pass-gold\/score[\s\S]{0,800}promotion_allowed:\s*false/.test(worker), '/api/pass-gold/score deve bloquear promoção sem evidência real');
  assert(/\/api\/pass-gold\/score[\s\S]{0,800}pass_gold:\s*false/.test(worker), '/api/pass-gold/score deve retornar pass_gold:false sem evidência real');
}

if (failures.length) {
  console.error('SDDF guard falhou:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('SDDF guard OK — V8.4 clean spec baseline preservado.');


