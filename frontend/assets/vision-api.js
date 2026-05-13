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
    var value = String(path || '/');
    if (/^https?:\/\//i.test(value)) {
      return value.replace(/\/api\/api\//i, '/api/');
    }
    var withSlash = value.charAt(0) === '/' ? value : '/' + value;
    return withSlash.replace(/^\/api\/api(\/|$)/i, '/api$1');
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
    var contentType = response.headers.get('content-type') || '';
    var payload = contentType.indexOf('application/json') >= 0 ? await response.json() : await response.text();
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

  window.VisionApi = {
    get: function (path) { return request('GET', path); },
    post: function (path, body) { return request('POST', path, body); },
    apiUrl: apiUrl,
    streamUrl: streamUrl,
    download: download
  };
}());
