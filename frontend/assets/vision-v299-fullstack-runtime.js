/* VISION CORE V2.9.9 — LEGACY FULLSTACK ADAPTER
 * Fase 4 V14 + PI HARNESS CLEAN:
 * Chat ownership belongs to frontend/assets/vision-chat.js.
 * API ownership belongs to frontend/assets/vision-api.js.
 * Runtime execution belongs to frontend/assets/vision-runtime-owner.js.
 * This adapter must not inject UI, call run-live, override fetch/EventSource, or decide PASS GOLD.
 */
(function () {
  'use strict';
  if (window.__VISION_V299_RUNTIME__) return;
  window.__VISION_V299_RUNTIME__ = true;

  function delegate() {
    var chatReady = !!(window.VisionChat && typeof window.VisionChat.appendMessage === 'function');
    var apiReady = !!window.VisionApi;
    var runtimeReady = !!window.VisionRuntimeOwner;
    if (chatReady || apiReady || runtimeReady) {
      console.log('[V299] delegated to clean owners', {
        chat: chatReady,
        api: apiReady,
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
