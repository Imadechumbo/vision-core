/**
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
