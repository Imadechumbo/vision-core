#!/usr/bin/env node
import fs from 'node:fs';

const targets = [
  {
    path: 'frontend/assets/vision-v34-enterprise.js',
    marker: '__V34_LEGACY_ADAPTER__',
    label: 'v34 enterprise -> clean owners adapter',
    content: `/**
 * VISION CORE V3.4 - LEGACY ADAPTER
 * V14 CLEAN: ownership moved to clean owners.
 */
(function V34LegacyAdapter(){
  'use strict';
  if (window.__V34_LEGACY_ADAPTER__) return;
  window.__V34_LEGACY_ADAPTER__ = true;

  function boot(){
    if (window.VisionAgentLocal) {
      if (typeof window.VisionAgentLocal.ensurePiHarnessNode === 'function') window.VisionAgentLocal.ensurePiHarnessNode();
      if (typeof window.VisionAgentLocal.applyOctagonPositions === 'function') window.VisionAgentLocal.applyOctagonPositions();
    }
    if (window.VisionRuntimeOwner && typeof window.VisionRuntimeOwner.streamState === 'function') {
      window.__VISION_RUNTIME_STATUS__ = window.VisionRuntimeOwner.streamState();
    }
    console.log('[V34] delegated to clean owners');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
`
  },
  {
    path: 'frontend/assets/vision-v44-runtime-consistency.js',
    marker: '__V44_LEGACY_ADAPTER__',
    label: 'v44 runtime consistency -> clean owners adapter',
    content: `/**
 * VISION CORE V4.4 - LEGACY ADAPTER
 * V14 CLEAN: consistency ownership moved to clean owners.
 */
(function V44LegacyAdapter(){
  'use strict';
  if (window.__V44_LEGACY_ADAPTER__) return;
  window.__V44_LEGACY_ADAPTER__ = true;

  function boot(){
    if (window.VisionAgentLocal) {
      if (typeof window.VisionAgentLocal.ensurePiHarnessNode === 'function') window.VisionAgentLocal.ensurePiHarnessNode();
      if (typeof window.VisionAgentLocal.applyOctagonPositions === 'function') window.VisionAgentLocal.applyOctagonPositions();
    }
    if (window.VisionRuntimeOwner && typeof window.VisionRuntimeOwner.streamState === 'function') {
      window.__VISION_RUNTIME_STATUS__ = window.VisionRuntimeOwner.streamState();
    }
    console.log('[V44] delegated to clean owners');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
`
  }
];

let changed = 0;
for (const target of targets) {
  if (!fs.existsSync(target.path)) {
    console.log(`SKIP: ${target.path} not found`);
    continue;
  }
  const current = fs.readFileSync(target.path, 'utf8');
  if (current.includes(target.marker)) {
    console.log(`SKIP: ${target.label} already converted`);
    continue;
  }
  fs.writeFileSync(target.path, target.content, 'utf8');
  console.log(`PATCHED: ${target.label}`);
  changed += 1;
}

if (!changed) console.log('SKIP: legacy adapters already converted');
