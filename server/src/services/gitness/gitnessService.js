'use strict';

/**
 * VISION CORE — Gitness Service
 *
 * Cliente HTTP para o Gitness (Harness Open Source) self-hosted.
 * Gitness expõe uma API REST em /api/v1/ compatível com Swagger.
 *
 * Responsabilidades:
 *   - Criar branch no repositório Gitness
 *   - Abrir Pull Request (Gitness usa "pull_request")
 *   - Push via git CLI (mesmo protocolo HTTP/SSH)
 *   - Status check de pipelines
 *   - Mirror de repositório GitHub → Gitness
 */

const https = require('https');
const http  = require('http');
const { execSync } = require('child_process');

// ── Config padrão via env ─────────────────────────────────────────────────
function getConfig() {
  return {
    host:     process.env.GITNESS_HOST     || 'localhost',
    port:     Number(process.env.GITNESS_PORT || 3000),
    token:    process.env.GITNESS_TOKEN    || '',
    account:  process.env.GITNESS_ACCOUNT  || '',
    repo:     process.env.GITNESS_REPO     || '',
    protocol: process.env.GITNESS_PROTOCOL || 'http',
    base:     process.env.GITNESS_BASE_BRANCH || 'main',
    space:    process.env.GITNESS_SPACE    || 'default',
  };
}

// ── HTTP helper genérico ──────────────────────────────────────────────────
function gitnessRequest(method, path, body, cfg) {
  return new Promise((resolve, reject) => {
    const c    = cfg || getConfig();
    const data = body ? JSON.stringify(body) : null;
    const isHttps = c.protocol === 'https';
    const mod  = isHttps ? https : http;

    const opts = {
      hostname: c.host,
      port:     c.port,
      path:     `/api/v1${path}`,
      method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${c.token}`,
        'User-Agent':    'VISION-CORE/1.0',
      },
    };

    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);

    const req = mod.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: { raw } }); }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Gitness API timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

// ── Verificar se Gitness está acessível ──────────────────────────────────
async function ping() {
  try {
    const c   = getConfig();
    const res = await gitnessRequest('GET', '/system/health', null, c);
    return { ok: res.status < 300, status: res.status };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Verificar status de configuração ─────────────────────────────────────
function gitnessStatus() {
  const c = getConfig();
  return {
    configured: !!(c.token && c.account && c.repo),
    host:     c.host,
    port:     c.port,
    protocol: c.protocol,
    account:  c.account,
    repo:     c.repo,
    space:    c.space,
    base:     c.base,
  };
}

// ── Criar Pull Request no Gitness ─────────────────────────────────────────
// Endpoint: POST /api/v1/repos/{repo_ref}/pullreq
async function createPullRequest(branch, title, body, cfg) {
  const c     = cfg || getConfig();
  const ref   = `${c.space}/${c.account}/${c.repo}`;
  const encRef = encodeURIComponent(ref);

  const payload = {
    title,
    description: body,
    source_repo_ref: ref,
    source_branch:   branch,
    target_branch:   c.base,
    is_draft:        false,
  };

  const res = await gitnessRequest('POST', `/repos/${encRef}/pullreq`, payload, c);

  if (res.status < 300) {
    return {
      ok:      true,
      pr_id:   res.data?.number,
      pr_url:  `${c.protocol}://${c.host}:${c.port}/${ref}/pulls/${res.data?.number}`,
      method:  'gitness_api',
    };
  }

  throw new Error(`Gitness PR falhou ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
}

// ── Listar Pull Requests abertos ─────────────────────────────────────────
async function listPullRequests(state = 'open', cfg) {
  const c   = cfg || getConfig();
  const ref = encodeURIComponent(`${c.space}/${c.account}/${c.repo}`);
  const res = await gitnessRequest('GET', `/repos/${ref}/pullreq?state=${state}&limit=20`, null, c);
  return res.data || [];
}

// ── Status do pipeline de um commit ──────────────────────────────────────
async function getPipelineStatus(commitSha, cfg) {
  const c   = cfg || getConfig();
  const ref = encodeURIComponent(`${c.space}/${c.account}/${c.repo}`);
  const res = await gitnessRequest('GET', `/repos/${ref}/commits/${commitSha}/check-suites`, null, c);
  if (res.status < 300 && Array.isArray(res.data)) {
    const all     = res.data;
    const passing = all.every(s => s.conclusion === 'success' || s.status === 'success');
    return { ok: passing, checks: all, commitSha };
  }
  return { ok: null, raw: res.data };
}

// ── Mirror: importar repositório do GitHub para Gitness ──────────────────
// Endpoint: POST /api/v1/repos/import
async function importFromGitHub(githubUrl, cfg) {
  const c = cfg || getConfig();

  const payload = {
    identifier:  c.repo,
    parent_ref:  `${c.space}/${c.account}`,
    description: 'VISION CORE mirror from GitHub',
    clone_url:   githubUrl,
    mirror:      true,
    pipelines:   [],
  };

  const res = await gitnessRequest('POST', '/repos/import', payload, c);
  return {
    ok:     res.status < 300,
    status: res.status,
    data:   res.data,
  };
}

// ── Push para Gitness via git remoto ──────────────────────────────────────
// Adiciona remote gitness se não existir e faz push da branch
function pushToGitness(repoPath, branch, cfg) {
  const c         = cfg || getConfig();
  const gitUrl    = `${c.protocol}://${c.account}:${c.token}@${c.host}:${c.port}/${c.space}/${c.account}/${c.repo}.git`;

  function git(cmd) {
    return execSync(`git ${cmd}`, { cwd: repoPath, stdio: 'pipe', encoding: 'utf-8' });
  }

  try {
    // Verificar se remote gitness já existe
    const remotes = git('remote').split('\n').map(r => r.trim());
    if (!remotes.includes('gitness')) {
      git(`remote add gitness ${gitUrl}`);
    } else {
      git(`remote set-url gitness ${gitUrl}`);
    }

    git(`push gitness ${branch}`);
    return { ok: true, remote: 'gitness', branch };
  } catch (e) {
    return { ok: false, error: e.message, remote: 'gitness', branch };
  }
}

module.exports = {
  ping, gitnessStatus, gitnessRequest,
  createPullRequest, listPullRequests,
  getPipelineStatus, importFromGitHub,
  pushToGitness, getConfig,
};
