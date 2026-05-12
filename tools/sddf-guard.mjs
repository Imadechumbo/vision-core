import { readFileSync } from 'node:fs';

const files = {
  index: 'frontend/index.html',
  owner: 'frontend/assets/vision-runtime-owner.js',
  command: 'frontend/assets/vision-ui-command.js',
  worker: 'worker/src/index.js',
};

const src = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(file, 'utf8')]),
);

const failures = [];
function fail(message) { failures.push(message); }
function requireMatch(name, text, pattern, message) { if (!pattern.test(text)) fail(`${name}: ${message}`); }
function forbidMatch(name, text, pattern, message) { if (pattern.test(text)) fail(`${name}: ${message}`); }

forbidMatch('frontend/index.html', src.index, /\bRUN_PATH\b/, 'contém RUN_PATH');
forbidMatch('frontend/index.html', src.index, /\bSTREAM_PATH\b/, 'contém STREAM_PATH');
forbidMatch('frontend/index.html', src.index, /new\s+EventSource\s*\(/, 'contém new EventSource');
forbidMatch('frontend/index.html', src.index, /fetch\(\s*['"]\/api\/run-live['"]/, "contém fetch('/api/run-live')");
forbidMatch('frontend/index.html', src.index, /executeBtn\.onclick/, 'contém executeBtn.onclick');
forbidMatch('frontend/index.html', src.index, /\bpass_gold\b/, 'contém lógica pass_gold');
forbidMatch('frontend/index.html', src.index, /\bpromotion_allowed\b/, 'contém lógica promotion_allowed');
forbidMatch('frontend/index.html', src.index, /__VISION_SSE_EVIDENCE__/, 'contém evidence runtime');

requireMatch('vision-runtime-owner.js', src.owner, /async\s+function\s+runMission\s*\(/, 'deve implementar runMission');
requireMatch('vision-runtime-owner.js', src.owner, /addEventListener\(\s*['"]click['"]\s*,\s*runMission\s*\)/, 'deve registrar runMission no click do executeBtn');
requireMatch('vision-runtime-owner.js', src.owner, /missionLock/, 'deve possuir lock contra execução concorrente');
requireMatch('vision-runtime-owner.js', src.owner, /fetch\(\s*apiUrl\(RUN_LIVE_PATH\)/, 'deve chamar POST /api/run-live pelo runtime owner');
requireMatch('vision-runtime-owner.js', src.owner, /mission_id/, 'deve ler mission_id da resposta');
requireMatch('vision-runtime-owner.js', src.owner, /RUN_LIVE_STREAM_PATH\)\s*\+\s*['"]\?mission_id=/, 'deve montar SSE apenas com mission_id');
requireMatch('vision-runtime-owner.js', src.owner, /new\s+EventSource\(\s*streamUrl\s*\)/, 'deve abrir EventSource a partir da URL mission_id-only');
requireMatch('vision-runtime-owner.js', src.owner, /__VISION_SSE_EVIDENCE__/, 'deve manter array global de evidências');
requireMatch('vision-runtime-owner.js', src.owner, /__VISION_SSE_EVIDENCE__\.push/, 'deve acumular evidências do SSE');
requireMatch('vision-runtime-owner.js', src.owner, /addEventListener\(\s*['"]done['"][\s\S]*?releaseLock\(\s*['"]done['"]\s*\)/, 'deve liberar lock em done');
requireMatch('vision-runtime-owner.js', src.owner, /addEventListener\(\s*['"]fail['"][\s\S]*?releaseLock\(\s*['"]fail['"]\s*\)/, 'deve liberar lock em fail');
requireMatch('vision-runtime-owner.js', src.owner, /onerror\s*=\s*function[\s\S]*?releaseLock\(\s*['"]error['"]\s*\)/, 'deve liberar lock em error');
forbidMatch('vision-runtime-owner.js', src.owner, /\?mission=/, 'não pode enviar texto da missão na query string');

forbidMatch('vision-ui-command.js', src.command, /new\s+EventSource\s*\(/, 'não pode abrir SSE');
forbidMatch('vision-ui-command.js', src.command, /fetch\(\s*.*\/api\/run-live/, 'não pode ser dono da execução real');
forbidMatch('vision-ui-command.js', src.command, /pass_gold|promotion_allowed/, 'não pode decidir PASS GOLD');

requireMatch('worker/src/index.js', src.worker, /VISION_PAGES_SUBDOMAIN_RE/, 'deve ter CORS dinâmico para subdomínios pages.dev');
requireMatch('worker/src/index.js', src.worker, /status:\s*204/, 'OPTIONS deve retornar 204');
requireMatch('worker/src/index.js', src.worker, /request\.method\s*===\s*['"]POST['"]\s*&&\s*url\.pathname\s*===\s*['"]\/api\/run-live['"]/, 'deve implementar POST /api/run-live');
requireMatch('worker/src/index.js', src.worker, /request\.method\s*===\s*['"]GET['"]\s*&&\s*url\.pathname\s*===\s*['"]\/api\/run-live-stream['"]/, 'deve implementar GET /api/run-live-stream');
requireMatch('worker/src/index.js', src.worker, /url\.searchParams\.get\(\s*['"]mission_id['"]\s*\)/, 'stream deve aceitar mission_id');
requireMatch('worker/src/index.js', src.worker, /url\.searchParams\.has\(\s*['"]mission['"]\s*\)/, 'stream deve recusar texto sensível na query');
for (const event of ['open', 'step', 'gate', 'done']) {
  requireMatch('worker/src/index.js', src.worker, new RegExp(`sseFrame\\(\\s*['"]${event}['"]`), `deve emitir SSE ${event}`);
}
requireMatch('worker/src/index.js', src.worker, /pass_gold:\s*false/, 'deve retornar pass_gold:false sem evidência real');
requireMatch('worker/src/index.js', src.worker, /promotion_allowed:\s*false/, 'deve bloquear promoção sem evidência real');
requireMatch('worker/src/index.js', src.worker, /status:\s*['"]INSUFFICIENT_EVIDENCE['"]/, 'deve retornar INSUFFICIENT_EVIDENCE');
forbidMatch('worker/src/index.js', src.worker, /promotion_allowed:\s*true/, 'não pode liberar promoção em stub');
forbidMatch('worker/src/index.js', src.worker, /status:\s*['"]GOLD['"]/, '/api/pass-gold/score não pode retornar GOLD sem evidência real');

if (failures.length) {
  console.error('SDDF Guard failed:');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('SDDF Guard passed. V13.1 contract enforced.');
