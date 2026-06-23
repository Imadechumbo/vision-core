#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const path = 'frontend/assets/vision-runtime-owner.js';
let changed = false;

function runProbe(label, file, limit = 12) {
  if (!fs.existsSync(file)) return;
  const run = spawnSync(process.execPath, [file], { encoding: 'utf8', shell: false });
  const output = `${run.stdout || ''}${run.stderr || ''}`.trim();
  if (output) {
    const lines = output.split(/\r?\n/).filter(Boolean).slice(0, limit);
    for (const line of lines) console.log(label + ': ' + line);
  }
  if (run.status !== 0) console.log(label + ': BLOCKED');
}

if (!fs.existsSync(path)) {
  console.log('SKIP: runtime owner file not found');
} else {
  let s = fs.readFileSync(path, 'utf8');

  const hasBridge = s.includes('streamState: streamState') &&
    s.includes('handleEvent: handleEvent') &&
    s.includes('normalizePayload: normalizePayload') &&
    s.includes('report: report');

  if (hasBridge) {
    console.log('SKIP: runtime bridge already absorbed');
  } else {
    const streamState = `  function streamState() {
    return {
      running: running,
      connected: !!source,
      mission_id: activeMissionId || '',
      source: source ? 'eventsource' : 'idle'
    };
  }
`;

    if (!s.includes('function streamState()')) {
      const realMissionMatch = /\n\s*function\s+realMissionId\s*\(payload\)\s*\{/.exec(s);
      if (!realMissionMatch) {
        console.error('BLOCKED: realMissionId marker not found');
        process.exit(1);
      }
      s = s.slice(0, realMissionMatch.index + 1) + streamState + s.slice(realMissionMatch.index + 1);
    }

    const exportRegex = /window\.VisionRuntimeOwner\s*=\s*\{[\s\S]*?\n\s*\};/;
    const exportMatch = exportRegex.exec(s);
    if (!exportMatch) {
      console.error('BLOCKED: VisionRuntimeOwner export marker not found');
      process.exit(1);
    }

    const requiredExports = [
      'executeMission: executeMission',
      'realMissionId: realMissionId',
      'release: release',
      'handleEvent: handleEvent',
      'normalizePayload: normalizePayload',
      'report: report',
      'streamState: streamState'
    ];
    const newExport = `window.VisionRuntimeOwner = {\n    ${requiredExports.join(',\n    ')}\n  };`;

    s = s.replace(exportMatch[0], newExport);
    fs.writeFileSync(path, s, 'utf8');
    changed = true;
    console.log('PATCHED: runtime bridge absorbed into VisionRuntimeOwner');
  }
}

runProbe('V14.1_HARNESS_PATCH', 'tools/v14-pi-harness-backend-validation-patch.mjs', 8);
runProbe('V14.1_NORMALIZER', 'tools/v14-backend-receipt-normalizer.mjs', 8);
runProbe('V14.2_STRICT_PASSGOLD', 'tools/v142-strict-passgold-gate-patch.mjs', 8);
runProbe('V14.1_TOTAL_FINAL', 'tools/pi-harness-v141-total-final.mjs', 16);

if (!changed) process.exit(0);
