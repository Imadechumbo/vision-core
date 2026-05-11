/**
 * VISION CORE V2.9.7 — LEGACY UI OBSERVER
 * ─────────────────────────────────────────────────────────────────
 * RUNTIME ROLE  : observer / legacy-ui
 * OWNER         : false
 * DOMAINS       : timeline-visual (read bridge only)
 * DEPENDS ON    : window.__V32_OWNER__ = true
 *
 * REGRAS (SDDF SPEC V8.1.0):
 * - Quando __V32_OWNER__ = true: NENHUMA ação de execução
 * - Nunca chamar /run-live
 * - Nunca criar EventSource
 * - Nunca registrar listener em executeBtn
 * - Nunca renderizar Mission Report
 * - Nunca emitir PASS GOLD
 * - Pode prover window.v297SetTimeline como ponte visual para V32
 * ─────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── GUARD: só registra uma vez ── */
  if (window.__V297_OBSERVER__) return;
  window.__V297_OBSERVER__ = true;

  /* ── HELPER: acessa elemento por id ── */
  function $(id) { return document.getElementById(id); }

  /* ── HELPER: adiciona mensagem no chat legado (se existir) ── */
  function appendChat(text, type) {
    var log = $('v297ChatLog');
    if (!log) return;
    var div = document.createElement('div');
    div.className = 'v297-msg ' + (type || 'bot');
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  /* ── HELPER: atualiza badge de estado ── */
  function setBodyState(state) {
    document.body.classList.remove(
      'v297-pipeline-fail',
      'v297-pipeline-gold',
      'v297-pipeline-ok',
      'v297-pipeline-running'
    );
    if (state) document.body.classList.add('v297-pipeline-' + state);

    var badge = $('mcLiveBadge');
    if (!badge) return;
    badge.classList.remove('fail', 'gold', 'ok');
    if (state === 'fail') {
      badge.textContent = '● FAIL';
      badge.classList.add('fail');
    } else if (state === 'gold') {
      badge.textContent = '● PASS GOLD';
      badge.classList.add('gold');
    } else {
      badge.textContent = '● LIVE';
      badge.classList.add('ok');
    }
  }

  /* ── TIMELINE BRIDGE: expõe v297SetTimeline para V32 usar ── */
  function setTimeline(stage, status) {
    var aliases = {
      'Patch': 'PatchEngine',
      'Patch Engine': 'PatchEngine',
      'PASS_GOLD': 'PASS GOLD',
      'pass_gold': 'PASS GOLD'
    };
    var normalized = aliases[stage] || stage;

    document.querySelectorAll('.v236-tl-step').forEach(function (el) {
      if (el.dataset.stage !== normalized) return;
      el.classList.remove('running', 'done', 'fail');
      if (status === 'running') {
        el.classList.add('running');
      } else if (status === 'fail' || status === 'error') {
        el.classList.add('fail');
      } else {
        el.classList.add(normalized === 'PASS GOLD' ? 'gold' : 'done');
      }
      var sm = el.querySelector('small');
      if (sm) {
        sm.textContent = status === 'fail'
          ? 'erro'
          : (normalized === 'PASS GOLD' ? 'GOLD' : 'ok');
      }
    });

    if (status === 'fail') setBodyState('fail');
    else if (normalized === 'PASS GOLD') setBodyState('gold');
    else setBodyState('ok');
  }

  /* Expõe como bridge global para V32 */
  window.v297SetTimeline = setTimeline;

  /* ── INIT: sem qualquer ação de execução ── */
  document.addEventListener('DOMContentLoaded', function () {
    /* V32 é o owner — este runtime não registra executeBtn nem startSSE */
    if (window.__V32_OWNER__) {
      console.log('[V297] observer read-only ativo — V32 é execution owner');
      return;
    }

    /* Fallback: V32 não carregou (situação de emergência) */
    console.warn('[V297] __V32_OWNER__ não detectado — modo standby');
    appendChat('V2.9.7 carregado em modo standby (aguardando V32).', 'bot');
  });

})();
