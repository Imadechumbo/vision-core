import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../../backend/server.js', import.meta.url), 'utf8');
const frontend = fs.readFileSync(new URL('../../frontend/assets/vision-core-next-clean.js', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../../worker/src/index.js', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../../.github/workflows/deploy-backend-eb.yml', import.meta.url), 'utf8');

const detector = server.match(/const isHermesFineTuningQuestion = (\/.*\/i)\.test\(message\);/);
assert.ok(detector, 'Hermes fine-tuning detector must remain explicit in /api/chat');
const detectorRegex = Function(`return ${detector[1]}`)();
assert.equal(detectorRegex.test('sobre o fine tuning do hermes no vision core?'), true, 'exact UI report must activate grounding');

assert.match(frontend, /var CHAT_BACKEND_URL = API_BASE_URL;/, 'real UI chat must use the Worker Gateway');
assert.match(frontend, /bodyPayload = \{ message: fullMessage, mode: 'vision-geral', model: 'auto', display_input:/, 'real UI payload contract changed');
assert.match(worker, /headers\.set\("Cache-Control", "no-store"\)/, 'Gateway responses must never be cached');
assert.match(workflow, /cp docs\/HERMES_FINE_TUNING_DATASET\.md backend\/docs\/HERMES_FINE_TUNING_DATASET\.md/, 'EB package must include the grounding document');
assert.match(workflow, /unzip -l \.\.\/deploy\.zip docs\/HERMES_FINE_TUNING_DATASET\.md/, 'EB package must verify the grounding document');
assert.match(server, /error: 'hermes_grounding_unavailable'/, 'missing grounding must fail closed');

console.log('chat-grounding-contract: PASS');
