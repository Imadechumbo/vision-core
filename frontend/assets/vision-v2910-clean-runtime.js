/**
 * VISION CORE V2.9.10 — LEGACY COMPAT / NETWORK OBSERVER
 * ─────────────────────────────────────────────────────────────────
 * RUNTIME ROLE  : observer / legacy-compat
 * OWNER         : false
 * DOMAINS       : VisionApi (copilot bridge), network helpers
 * DEPENDS ON    : window.__V32_OWNER__ = true
 *
 * REGRAS (SDDF SPEC V8.1.0):
 * - Quando __V32_OWNER__ = true: NENHUMA ação de execução
 * - Nunca chamar /run-live
 * - Nunca criar EventSource
 * - Nunca sobrescrever window.fetch ou window.EventSource
 * - Nunca registrar listener em executeBtn
 * - Nunca renderizar Mission Report
 * - Nunca emitir PASS GOLD
 * - Expõe window.VisionApi com sendCopilot() apenas
 * - Expõe window.VisionCoreRuntime.apiUrl() como utilitário
 * ─────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── GUARD ── */
  if (window.__V2910_OBSERVER__) return;
  window.__V2910_OBSERVER__ = true;

  /* ── API BASE UTIL ── */
  var API = (window.__VISION_API__ || window.API_BASE_URL || '').replace(/\/$/, '');

  function apiUrl(p) {
    if (/^https?:\/\//.test(p)) return p;
    if (p.indexOf('/api') === 0) return API + p;
    return API + '/api' + (p.charAt(0) === '/' ? p : '/' + p);
  }

  /* Expõe utilitário para runtimes legados que usam VisionCoreRuntime.apiUrl */
  window.VisionCoreRuntime = window.VisionCoreRuntime || { apiUrl: apiUrl };

  function $(id) { return document.getElementById(id); }

  /* ── HELPERS DE REDE (sem sobrescrever fetch/EventSource) ── */
  async function postJson(path, payload) {
    var res = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    var text = await res.text();
    try { return JSON.parse(text || '{}'); } catch { return { ok: false, raw: text, status: res.status }; }
  }

  async function getJson(path) {
    var res = await fetch(apiUrl(path));
    var text = await res.text();
    try { return JSON.parse(text || '{}'); } catch { return { ok: false, raw: text, status: res.status }; }
  }

  /* ── COPILOT: único endpoint de ação permitido ── */
  async function sendCopilot(message, mode) {
    return postJson('/api/copilot', { message: message || '', mode: mode || 'general' });
  }

  /* ── WINDOW.VISIONAPI: contrato legado — só copilot e utilitários ── */
  window.VisionApi = {
    apiUrl:      apiUrl,
    postJson:    postJson,
    getJson:     getJson,
    sendCopilot: sendCopilot,
    /* runMission bloqueado — V32 é execution owner */
    runMission: function () {
      console.log('[V2910] runMission ignorado: V32 é o owner da execução (SDDF SPEC V8.1.0)');
    },
    /* startSSE bloqueado — V32 é sse owner */
    startSSE: function () {
      console.log('[V2910] startSSE ignorado: V32 é o owner do SSE (SDDF SPEC V8.1.0)');
    }
  };

  /* ── INIT ── */
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.__V32_OWNER__) {
      console.warn('[V2910] __V32_OWNER__ não detectado — modo standby');
      return;
    }

    console.log('[V2910] legacy-compat observer ativo — V32 é execution owner');
    /* Nenhum listener de execução registrado */
  });

})();
