#!/usr/bin/env node
import fs from 'node:fs';

const path = 'frontend/assets/vision-report.js';
if (!fs.existsSync(path)) {
  console.log('SKIP: report owner file not found');
  process.exit(0);
}

let s = fs.readFileSync(path, 'utf8');
const hasBridge = s.includes('normalize: normalized') &&
  s.includes('renderMissionReport: render') &&
  s.includes('renderMissionReportChat: renderChat');

if (hasBridge) {
  console.log('SKIP: report bridge already absorbed');
  process.exit(0);
}

const exportRegex = /window\.VisionReport\s*=\s*\{[\s\S]*?\n\s*\};/;
const match = exportRegex.exec(s);
if (!match) {
  console.error('BLOCKED: VisionReport export marker not found');
  process.exit(1);
}

const newExport = `window.VisionReport = {
    render: render,
    renderChat: renderChat,
    normalize: normalized,
    renderMissionReport: render,
    renderMissionReportChat: renderChat,
    hasValidEvidence: validEvidence,
    hasGoldEvidence: function (payload) {
      var data = payload && typeof payload === 'object' ? payload : {};
      return data.pass_gold === true && data.promotion_allowed === true && validEvidence(data.evidence_receipt);
    }
  };`;

s = s.replace(match[0], newExport);
fs.writeFileSync(path, s, 'utf8');
console.log('PATCHED: report bridge absorbed into VisionReport');
