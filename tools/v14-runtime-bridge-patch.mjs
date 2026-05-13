#!/usr/bin/env node
import fs from 'node:fs';

const path = 'frontend/assets/vision-runtime-owner.js';
if (!fs.existsSync(path)) {
  console.log('SKIP: runtime owner file not found');
  process.exit(0);
}

let s = fs.readFileSync(path, 'utf8');

const hasBridge = s.includes('streamState: streamState') &&
  s.includes('handleEvent: handleEvent') &&
  s.includes('normalizePayload: normalizePayload') &&
  s.includes('report: report');

if (hasBridge) {
  console.log('SKIP: runtime bridge already absorbed');
  process.exit(0);
}

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
console.log('PATCHED: runtime bridge absorbed into VisionRuntimeOwner');
