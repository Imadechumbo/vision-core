/* VISION CORE V2.9.8 — LEGACY COMMAND CHAT ADAPTER
 * Fase 4 V14 + PI HARNESS CLEAN:
 * Chat ownership belongs to frontend/assets/vision-chat.js.
 * Runtime execution belongs to frontend/assets/vision-runtime-owner.js.
 * This adapter must not call /api/run-live, open SSE, create mission_id, or decide PASS GOLD.
 */
(function(){
  'use strict';
  if (window.__V298_COMMAND_CHAT_ADAPTER__) return;
  window.__V298_COMMAND_CHAT_ADAPTER__ = true;

  function delegate() {
    if (window.VisionChat && typeof window.VisionChat.appendMessage === 'function') {
      console.log('[V298] delegated to VisionChat clean owner');
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
