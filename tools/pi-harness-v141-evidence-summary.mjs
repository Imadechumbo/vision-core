#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const probes = [
  ['BACKEND_EVIDENCE_AUDIT', 'tools/pi-harness-v141-audit.mjs'],
  ['BACKEND_RUNTIME_PROBE', 'tools/pi-harness-v141-backend-probe.mjs'],
  ['BACKEND_ENDPOINT_CONTRACT', 'tools/pi-harness-v141-endpoint-contract-audit.mjs'],
  ['BACKEND_GOLD_GATE_AUDIT', 'tools/pi-harness-v141-gold-gate-audit.mjs'],
  ['FINAL_BACKEND_AUDIT', 'tools/pi-harness-v141-final-audit.mjs'],
  ['RELEASE_READINESS', 'tools/pi-harness-v141-release-readiness-audit.mjs'],
  ['NO_FAKE_GOLD_AUDIT', 'tools/pi-harness-v141-no-fake-gold-audit.mjs']
];

const summary = {
  result: 'PASS',
  backend_evidence_ready: true,
  no_fake_gold_confirmed: true,
  pass_gold_candidate: false,
  promotion_allowed: false,
  deploy_allowed: false,
  probes: []
};

for (const [name, file] of probes) {
  if (!fs.existsSync(file)) {
    summary.result = 'BLOCKED';
    summary.backend_evidence_ready = false;
    if (name === 'NO_FAKE_GOLD_AUDIT') summary.no_fake_gold_confirmed = false;
    summary.probes.push({ name, status: 'BLOCKED', reason: `missing ${file}` });
    continue;
  }
  const r = spawnSync(process.execPath, [file], { encoding: 'utf8', shell: false });
  const output = `${r.stdout || ''}${r.stderr || ''}`;
  const status = r.status === 0 && !/\bBLOCKED\b|\bFAIL\b/i.test(output) ? 'PASS' : 'BLOCKED';
  if (status !== 'PASS') {
    summary.result = 'BLOCKED';
    summary.backend_evidence_ready = false;
    if (name === 'NO_FAKE_GOLD_AUDIT') summary.no_fake_gold_confirmed = false;
  }
  const evidenceLine = output.split(/\r?\n/).find((line) => /EVIDENCE|RELEASE|READINESS|NO FAKE|RESULT/.test(line)) || '';
  summary.probes.push({ name, status, evidence: evidenceLine });
}

console.log('=== PI HARNESS V14.1 EVIDENCE SUMMARY ===');
console.log(`RESULT: ${summary.result}`);
console.log(`BACKEND_EVIDENCE_READY: ${summary.backend_evidence_ready}`);
console.log(`NO_FAKE_GOLD_CONFIRMED: ${summary.no_fake_gold_confirmed}`);
console.log(`PASS_GOLD_CANDIDATE: ${summary.pass_gold_candidate}`);
console.log(`PROMOTION_ALLOWED: ${summary.promotion_allowed}`);
console.log(`DEPLOY_ALLOWED: ${summary.deploy_allowed}`);
for (const probe of summary.probes) {
  console.log(`${probe.name}: ${probe.status}${probe.reason ? ' — ' + probe.reason : ''}`);
}
process.exit(summary.result === 'PASS' ? 0 : 1);
