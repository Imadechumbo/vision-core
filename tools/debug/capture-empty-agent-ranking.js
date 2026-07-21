/*
 * Vision Core Next — diagnóstico manual do Ranking de Atividade vazio.
 *
 * Uso: copie este arquivo inteiro, cole no Console do DevTools e pressione Enter.
 * Não é carregado pelo produto. Para encerrar: window.__vcRankingDiagnostic.stop()
 */
(function installVcRankingDiagnostic() {
  'use strict';

  var KEY = '__vcRankingDiagnostic';
  if (window[KEY] && window[KEY].stop) window[KEY].stop();

  var KEEP_MS = 2 * 60 * 1000;
  var POLL_MS = 2500;
  var network = [];
  var errors = [];
  var snapshots = [];
  var originalFetch = window.fetch;
  var originalConsoleError = console.error;
  var bugActive = false;
  var latestAgentsResponse = null;
  var lastTabChangeAt = performance.now();

  function serialize(value) {
    if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return String(value); }
  }

  function trim() {
    var cutoff = Date.now() - KEEP_MS;
    network = network.filter(function (entry) { return entry.timeMs >= cutoff; });
  }

  function recordError(source, values) {
    errors.push({
      time: new Date().toISOString(),
      timeMs: Date.now(),
      source: source,
      values: Array.prototype.map.call(values, serialize)
    });
    trim();
  }

  console.error = function () {
    recordError('console.error', arguments);
    return originalConsoleError.apply(console, arguments);
  };

  function onWindowError(event) {
    recordError('window.error', [event.message, event.error || null, event.filename, event.lineno, event.colno]);
  }

  function onUnhandledRejection(event) {
    recordError('unhandledrejection', [event.reason]);
  }

  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  window.fetch = function (input, init) {
    var started = Date.now();
    var url = typeof input === 'string' ? input : input && input.url;
    var method = (init && init.method) || (input && input.method) || 'GET';
    return originalFetch.apply(this, arguments).then(function (response) {
      return response.clone().text().catch(function (error) {
        return '[response body unavailable: ' + error.message + ']';
      }).then(function (body) {
        var entry = {
          time: new Date(started).toISOString(),
          timeMs: started,
          durationMs: Date.now() - started,
          method: method,
          url: url,
          status: response.status,
          ok: response.ok,
          responseBody: body
        };
        network.push(entry);
        if (url && url.indexOf('/api/metrics/agents') !== -1) latestAgentsResponse = entry;
        trim();
        return response;
      });
    }, function (error) {
      network.push({
        time: new Date(started).toISOString(),
        timeMs: started,
        durationMs: Date.now() - started,
        method: method,
        url: url,
        status: null,
        ok: false,
        fetchError: serialize(error)
      });
      trim();
      throw error;
    });
  };

  function rankingCard(root) {
    return Array.prototype.find.call(root.querySelectorAll('.vc-metric-chart'), function (card) {
      var title = card.querySelector('h6');
      return title && title.textContent.trim().toLowerCase() === 'ranking de atividade';
    });
  }

  function rectOf(element) {
    var rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  function cardState(card) {
    var title = card.querySelector('h6');
    var rows = card.querySelectorAll('.vc-bar-row');
    return {
      title: title ? title.textContent.trim() : null,
      barRows: rows.length,
      emptyState: Boolean(card.querySelector('.vc-metric-chart-empty')),
      geometry: rectOf(card),
      rowGeometry: Array.prototype.map.call(rows, rectOf),
      outerHTML: card.outerHTML
    };
  }

  function noteTabChange() {
    lastTabChangeAt = performance.now();
  }

  function onFeatureClick(event) {
    if (event.target.closest('[data-feature]')) noteTabChange();
  }

  window.addEventListener('hashchange', noteTabChange);
  document.addEventListener('click', onFeatureClick, true);

  function download(snapshot) {
    var blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'vc-ranking-diagnostic-' + snapshot.capturedAt.replace(/[:.]/g, '-') + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function poll() {
    trim();
    var root = document.querySelector('#vcMetricsAgentList');
    var card = root && rankingCard(root);
    if (!root || !card) return;

    if (root.getClientRects().length === 0) {
      bugActive = false;
      return;
    }

    var totalBarRows = root.querySelectorAll('.vc-bar-row').length;
    var rankingRows = card.querySelectorAll('.vc-bar-row');
    var rankingBarRows = rankingRows.length;
    var rankingGeometry = Array.prototype.map.call(rankingRows, rectOf);
    var zeroGeometryRows = rankingGeometry.filter(function (rect) {
      return rect.width === 0 || rect.height === 0;
    }).length;
    var detailCards = root.querySelectorAll('.vc-metrics-agent-row').length;
    var isBug = rankingBarRows === 0 || zeroGeometryRows > 0;

    if (isBug && !bugActive) {
      var now = performance.now();
      var snapshot = {
        diagnostic: 'Vision Core Next — empty agent activity ranking',
        capturedAt: new Date().toISOString(),
        timing: {
          millisecondsSincePageLoad: Math.round(now),
          millisecondsSinceLastTabChange: Math.round(now - lastTabChangeAt)
        },
        pageUrl: location.href,
        userAgent: navigator.userAgent,
        dom: {
          totalBarRows: totalBarRows,
          rankingBarRows: rankingBarRows,
          rankingGeometry: rankingGeometry,
          zeroGeometryRows: zeroGeometryRows,
          detailCards: detailCards,
          metricsAgentListOuterHTML: root.outerHTML,
          rankingCardOuterHTML: card.outerHTML,
          cards: Array.prototype.map.call(root.querySelectorAll('.vc-metric-chart'), cardState)
        },
        latestMetricsAgentsResponse: latestAgentsResponse,
        networkLastTwoMinutes: network.slice(),
        errorsSincePageLoad: errors.slice()
      };
      snapshots.push(snapshot);
      download(snapshot);
      originalConsoleError.call(console, '[VC ranking diagnostic] Bug flagrado; snapshot salvo.', snapshot);
    }
    bugActive = isBug;
  }

  var timer = setInterval(poll, POLL_MS);
  window[KEY] = {
    network: function () { return network.slice(); },
    errors: function () { return errors.slice(); },
    snapshots: snapshots,
    captureNow: poll,
    stop: function () {
      clearInterval(timer);
      window.fetch = originalFetch;
      console.error = originalConsoleError;
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('hashchange', noteTabChange);
      document.removeEventListener('click', onFeatureClick, true);
      originalConsoleError.call(console, '[VC ranking diagnostic] Monitoramento encerrado.');
    }
  };

  console.info('[VC ranking diagnostic] Ativo. Navegue normalmente; o JSON será baixado quando o Ranking esvaziar.');
  poll();
}());
