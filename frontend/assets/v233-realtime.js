/* VISION CORE V2.3.3 - LEGACY REALTIME ADAPTER
 * V14 CLEAN: runtime execution and stream ownership belong to vision-runtime-owner.js.
 * This adapter keeps load compatibility only.
 */
(function(){
  'use strict';
  if (window.__V233_REALTIME_ADAPTER__) return;
  window.__V233_REALTIME_ADAPTER__ = true;

  function delegate() {
    if (window.VisionRuntimeOwner && typeof window.VisionRuntimeOwner.executeMission === 'function') {
      console.log('[V233] delegated to VisionRuntimeOwner clean owner');
      return true;
    }
    return false;
  }

  function boot() {
    if (delegate()) return;
    setTimeout(delegate, 300);
    setTimeout(delegate, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
