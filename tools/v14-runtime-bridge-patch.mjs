#!/usr/bin/env node
import fs from 'node:fs';

const path = 'frontend/assets/vision-runtime-owner.js';
if (!fs.existsSync(path)) {
  console.log('SKIP: runtime owner file not found');
  process.exit(0);
}

let s = fs.readFileSync(path, 'utf8');
if (s.includes('streamState: streamState') && s.includes('handleEvent: handleEvent') && s.includes('normalizePayload: normalizePayload')) {
  console.log('SKIP: runtime bridge already absorbed');
  process.exit(0);
}

const marker = `  function realMissionId(payload) {\n`;
if (!s.includes(marker)) {
  console.error('BLOCKED: realMissionId marker not found');
  process.exit(1);
}

const streamState = `  function streamState() {\n    return {\n      running: running,\n      connected: !!source,\n      mission_id: activeMissionId || '',\n      source: source ? 'eventsource' : 'idle'\n    };\n  }\n`;

if (!s.includes('function streamState()')) {
  s = s.replace(marker, streamState + marker);
}

const oldExport = `  window.VisionRuntimeOwner = {\n    executeMission: executeMission,\n    realMissionId: realMissionId,\n    release: release\n  };`;
const newExport = `  window.VisionRuntimeOwner = {\n    executeMission: executeMission,\n    realMissionId: realMissionId,\n    release: release,\n    handleEvent: handleEvent,\n    normalizePayload: normalizePayload,\n    report: report,\n    streamState: streamState\n  };`;

if (!s.includes(oldExport)) {
  console.error('BLOCKED: VisionRuntimeOwner export marker not found');
  process.exit(1);
}

s = s.replace(oldExport, newExport);
fs.writeFileSync(path, s, 'utf8');
console.log('PATCHED: runtime bridge absorbed into VisionRuntimeOwner');
