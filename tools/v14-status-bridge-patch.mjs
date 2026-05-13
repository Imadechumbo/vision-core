#!/usr/bin/env node
import fs from 'node:fs';

const path = 'frontend/assets/vision-agent-local.js';
if (!fs.existsSync(path)) {
  console.log('SKIP: agent local owner file not found');
  process.exit(0);
}

let s = fs.readFileSync(path, 'utf8');
const hasBridge = s.includes('statusSnapshot: statusSnapshot') && s.includes('receiveStatus: update');
if (hasBridge) {
  console.log('SKIP: status bridge already absorbed');
  process.exit(0);
}

const updateMarker = '  function update(payload) {';
if (!s.includes(updateMarker)) {
  console.error('BLOCKED: update marker not found');
  process.exit(1);
}

const statusSnapshot = `  function statusSnapshot() {
    return {
      state: lastPayload.state || lastPayload.status || 'WAITING',
      gold: hasGold(lastPayload),
      evidence: hasEvidence(lastPayload),
      mission_id: lastPayload.mission_id || lastPayload.missionId || lastPayload.id || '',
      difficulty: lastPayload.difficulty || lastPayload.pi_difficulty || '',
      layer: lastPayload.layer || lastPayload.current_layer || lastPayload.max_layer || ''
    };
  }

`;

if (!s.includes('function statusSnapshot()')) {
  s = s.replace(updateMarker, statusSnapshot + updateMarker);
}

const exportRegex = /window\.VisionAgentLocal\s*=\s*\{[\s\S]*?\n\s*\};/;
const match = exportRegex.exec(s);
if (!match) {
  console.error('BLOCKED: VisionAgentLocal export marker not found');
  process.exit(1);
}

let block = match[0];
function addExport(line) {
  if (block.includes(line)) return;
  block = block.replace(/\n\s*STAGE_MAP: STAGE_MAP\n\s*\};/, `\n    ${line},\n    STAGE_MAP: STAGE_MAP\n  };`);
}
addExport('statusSnapshot: statusSnapshot');
addExport('receiveStatus: update');

s = s.replace(match[0], block);
fs.writeFileSync(path, s, 'utf8');
console.log('PATCHED: status bridge absorbed into VisionAgentLocal');
