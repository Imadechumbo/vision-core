(function () {
  'use strict';

  var fallbackBase = 'https://visioncore-api-gateway.weiganlight.workers.dev';

  function readMetaBase() {
    var meta = document.querySelector('meta[name="vision-api-base"]');
    return meta ? meta.getAttribute('content') : '';
  }

  function cleanBase(value) {
    var raw = String(value || '').trim() || fallbackBase;
    return raw.replace(/\/+$/, '').replace(/\/api\/api$/i, '/api');
  }

  function normalizePath(path) {
    var value = String(path || '/').trim();
    if (!value) { value = '/'; }
    if (/^https?:\/\//i.test(value)) {
      return value
        .replace(/\/api\/api\//i, '/api/')
        .replace(/^https?:\/\/\/api\//i, '/api/');
    }
    var withSlash = value.charAt(0) === '/' ? value : '/' + value;
    return withSlash
      .replace(/^\/api\/api(\/|$)/i, '/api$1')
      .replace(/^\/api\/(https?:\/\/)/i, '$1');
  }

  function configuredBase() {
    return cleanBase(window.API_BASE_URL || window.__VISION_API__ || readMetaBase());
  }

  function apiUrl(path) {
    var normalized = normalizePath(path);
    if (/^https?:\/\//i.test(normalized)) {
      return normalized;
    }
    return configuredBase() + normalized;
  }

  function parseMaybeJson(response) {
    var contentType = response.headers.get('content-type') || '';
    if (contentType.indexOf('application/json') >= 0) {
      return response.json();
    }
    return response.text().then(function (text) {
      try { return text ? JSON.parse(text) : {}; } catch (_) { return text; }
    });
  }

  async function request(method, path, body) {
    var options = {
      method: method,
      headers: { Accept: 'application/json' },
      credentials: 'omit'
    };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    var response = await fetch(apiUrl(path), options);
    var payload = await parseMaybeJson(response);
    if (!response.ok) {
      var detail = typeof payload === 'string' ? payload : (payload && (payload.error || payload.message)) || response.statusText;
      throw new Error('HTTP ' + response.status + ': ' + detail);
    }
    return payload;
  }

  function streamUrl(missionId) {
    if (!missionId || typeof missionId !== 'string') {
      throw new Error('mission_id required for stream');
    }
    return apiUrl('/api/run-live-stream') + '?mission_id=' + encodeURIComponent(missionId);
  }

  function download(path) {
    window.location.assign(apiUrl(path));
  }

  function safeGet(path, fallback) {
    return request('GET', path).catch(function () { return fallback === undefined ? null : fallback; });
  }

  window.VisionApi = {
    get: function (path) { return request('GET', path); },
    post: function (path, body) { return request('POST', path, body); },
    safeGet: safeGet,
    apiUrl: apiUrl,
    streamUrl: streamUrl,
    download: download,
    contracts: function () { return safeGet('/api/runtime/contracts', null); },
    agentMetrics: function () { return safeGet('/api/metrics/agents', null); },
    agentsCatalog: function () { return safeGet('/api/agents/catalog', null); },
    harnessStats: function () { return safeGet('/api/runtime/harness-stats', null); },
    workersStatus: function () { return safeGet('/api/workers/status', null); },
    passGoldScore: function () { return safeGet('/api/pass-gold/score', null); },
    githubStatus: function () { return safeGet('/api/github/status', null); }
  };
}());
