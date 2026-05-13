/* VISION CORE V2.9.10 — LEGACY CLEAN RUNTIME ADAPTER
 * Fase 4 V14 + PI HARNESS CLEAN:
 * API ownership belongs to frontend/assets/vision-api.js.
 * Chat ownership belongs to frontend/assets/vision-chat.js.
 * Runtime execution and SSE ownership belong to frontend/assets/vision-runtime-owner.js.
 * This adapter must not override fetch/EventSource, call run-live, open SSE, or decide PASS GOLD.
 */
(function(){
  'use strict';
  if (window.__VISION_V2910_RUNTIME_ADAPTER__) return;
  window.__VISION_V2910_RUNTIME_ADAPTER__ = true;

  function delegate() {
    var apiReady = !!window.VisionApi;
    var chatReady = !!window.VisionChat;
    var runtimeReady = !!window.VisionRuntimeOwner;
    if (apiReady || chatReady || runtimeReady) {
      console.log('[V2910] delegated to clean owners', {
        api: apiReady,
        chat: chatReady,
        runtime: runtimeReady
      });
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
