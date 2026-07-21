#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const required = [
  'docs/VISION_AI_INSTALLER_SPEC.md',
  'docs/VISION_AI_INSTALLER_ARCHITECTURE.md',
  'docs/VISION_AI_INSTALLER_SECURITY.md',
  'docs/VISION_AI_INSTALLER_HERMES_RCA.md',
  'docs/VISION_AI_INSTALLER_RUNBOOK.md',
  'docs/VISION_AI_INSTALLER_TEST_PLAN.md',
];
for (const file of required) assert(read(file).length > 200, `${file} must be substantive`);

const about = read('frontend/about.html');
assert.match(about, /id="vision-ai-installer"/);
assert.match(about, /EM DESENVOLVIMENTO/);
assert.match(about, /Nenhum download ou instalador está disponível ainda/);
const section = about.match(/<section id="vision-ai-installer"[\s\S]*?<\/section>/)?.[0] || '';
assert(section && !/href=|download=/i.test(section), 'installer section must not link to a nonexistent download');

const spec = read(required[0]);
assert.match(spec, /BLOCKED_CONTRACT/);
assert.match(spec, /Nenhum instalador funcional/);
const testPlan = read(required[5]);
assert.match(testPlan, /PONYTAIL-VAI-001/);
assert.match(testPlan, /NOT_RUN/);

console.log('vision-ai-installer-phase0: 13/13 PASS');
