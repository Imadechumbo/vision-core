#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const path = 'frontend/assets/vision-runtime-owner.js';
let changed = false;

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

    const oldExport = exportMatch[0];
    const requiredExports = [
      'executeMission: executeMission',
      'realMissionId: realMissionId',
      'release: release',
      'handleEvent: handleEvent',
      'normalizePayload: normalizePayload',
      'report: report',
      'streamState: streamState'
    ];

    const newExport = `window.VisionRuntimeOwner = {
    ${requiredExports.join(',\n    ')}
  };`;

    s = s.replace(oldExport, newExport);
    fs.writeFileSync(path, s, 'utf8');
    changed = true;
    console.log('PATCHED: runtime bridge absorbed into VisionRuntimeOwner');
  }
}

const auditPath = 'tools/pi-harness-v141-audit.mjs';
if (fs.existsSync(auditPath)) {
  const audit = spawnSync(process.execPath, [auditPath], { encoding: 'utf8', shell: false });
  const output = `${audit.stdout || ''}${audit.stderr || ''}`.trim();
  if (output) {
    const lines = output.split(/\r?\n/).filter(Boolean).slice(0, 8);
    for (const line of lines) console.log('V14.1_AUDIT: ' + line);
  }
  if (audit.status !== 0) {
    console.log('V14.1_AUDIT: BLOCKED until backend evidence receipt is absorbed locally by PI Harness');
  }
}

if (!changed) process.exit(0);
