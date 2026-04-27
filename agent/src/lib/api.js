'use strict';

/**
 * VISION AGENT — API Client
 * Comunica com o Vision Core Server via HTTP.
 * Zero dependências externas — só Node built-ins.
 */

const https  = require('https');
const http   = require('http');
const config = require('./config');

function request(method, urlPath, body = null, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const base   = config.serverUrl();
    const fullUrl = `${base}${urlPath}`;
    const url    = new URL(fullUrl);
    const lib    = url.protocol === 'https:' ? https : http;
    const tok    = config.token();

    const payload = body ? JSON.stringify(body) : null;

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': `vision-agent/0.1.0`,
      ...(tok ? { 'X-Vision-Token': tok } : {}),
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
    };

    const req = lib.request(
      {
        hostname: url.hostname,
        port:     url.port || (url.protocol === 'https:' ? 443 : 80),
        path:     url.pathname + url.search,
        method,
        headers,
      },
      res => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, data: { raw } });
          }
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout ao conectar em ${base} (${timeoutMs}ms)\nVerifique se o Vision Core Server está rodando.`));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

const api = {
  get:    (path)       => request('GET',  path),
  post:   (path, body) => request('POST', path, body),
  delete: (path)       => request('DELETE', path),

  // Helpers com verificação de status
  async health() {
    const res = await request('GET', '/api/health');
    return res.status === 200 && res.data?.ok;
  },

  async registerProject(project) {
    return request('POST', '/api/projects', project);
  },

  async runMission(projectId, error, options = {}) {
    return request('POST', '/api/missions/run', {
      project_id: projectId,
      error,
      ...options,
    }, 120000); // 2 min timeout para missão
  },

  async getMission(id) {
    return request('GET', `/api/missions/${id}`);
  },

  async getTimeline(id) {
    return request('GET', `/api/missions/${id}/timeline`);
  },

  async rollback(missionId) {
    return request('POST', '/api/vault/rollback', { mission_id: missionId });
  },

  async listProjects() {
    return request('GET', '/api/projects');
  },

  async runtimeStatus() {
    return request('GET', '/api/runtime/status');
  },
};

module.exports = api;
