'use strict';

/**
 * VISION CORE — GitHub Service (v2 — Hybrid-aware)
 *
 * Quando HYBRID_GIT_MODE=hybrid ou gitness_only, delega para
 * hybridGitService que coordena GitHub + Gitness simultaneamente.
 * Em modo github_only (padrão), comporta-se como antes.
 */

const https = require('https');
const { execSync } = require('child_process');

// ── HTTP helper para GitHub API ───────────────────────────────────────────
function ghPost(urlStr, token, body) {
  return new Promise((resolve, reject) => {
    const url  = new URL(urlStr);
    const data = JSON.stringify(body);
    const req  = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Authorization: `Bearer ${token}`,
        'User-Agent': 'VISION-CORE/1.0',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: { raw } }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('GitHub API timeout')); });
    req.write(data);
    req.end();
  });
}

// ── Criar PR (GitHub direto) ──────────────────────────────────────────────
async function createGithubPRDirect(repoPath, branch, rca, gold) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;
  const base  = process.env.GITHUB_BASE_BRANCH || 'main';

  function git(cmd) {
    return execSync(`git ${cmd}`, { cwd: repoPath, stdio: 'pipe', encoding: 'utf-8' });
  }

  try {
    const status = git('status --porcelain');
    if (!status.trim()) return { ok: false, error: 'Nenhuma mudança para commitar', branch };
    git(`checkout -b ${branch}`);
    git('add .');
    git(`commit -m "fix: ${(rca.cause || 'auto-patch').slice(0, 70)} [VISION CORE]"`);
    git(`push origin ${branch}`);
  } catch (e) {
    return { ok: false, error: `Git falhou: ${e.message}`, branch };
  }

  if (token && owner && repo) {
    try {
      const body = [
        '## VISION CORE Auto Repair',
        '',
        `**Score:** ${gold?.final ?? '??'}/100 — ${gold?.level ?? '?'}`,
        `**Causa:** ${rca.cause || '—'}`,
        `**Fix:** ${rca.fix || '—'}`,
        `**Risco:** ${rca.risk || '—'}`,
        `**Patches:** ${rca.patches?.length || 0}`,
        '',
        '### Explicação',
        (rca.explanation || rca.fix || '').slice(0, 500),
        '',
        '_Gerado automaticamente pelo VISION CORE Hermes_',
      ].join('\n');

      const res = await ghPost(
        `https://api.github.com/repos/${owner}/${repo}/pulls`,
        token,
        { title: `VISION CORE: ${(rca.cause || 'auto-patch').slice(0, 60)}`, body, head: branch, base }
      );

      if (res.status < 300) return { ok: true, branch, pr_url: res.data?.html_url, method: 'api' };
      console.warn(`[GITHUB] API retornou ${res.status}:`, JSON.stringify(res.data).slice(0, 200));
    } catch (e) {
      console.warn('[GITHUB] API falhou, tentando gh CLI:', e.message);
    }
  }

  try {
    const prBody = `VISION CORE Auto Repair | Score: ${gold?.final ?? '??'}/100 | ${gold?.level ?? '?'}`;
    execSync(
      `gh pr create --title "VISION CORE: ${(rca.cause || 'auto').slice(0, 60)}" --body "${prBody}" --base ${base}`,
      { cwd: repoPath, stdio: 'pipe' }
    );
    return { ok: true, branch, method: 'gh_cli' };
  } catch (e) {
    return { ok: false, error: `gh CLI falhou: ${e.message}`, branch };
  }
}

// ── createPR — ponto de entrada principal ────────────────────────────────
// Delega para hybridGitService quando modo != github_only
async function createPR(repoPath, branch, rca, gold) {
  const mode = process.env.HYBRID_GIT_MODE || 'github_only';

  if (mode === 'github_only') {
    return createGithubPRDirect(repoPath, branch, rca, gold);
  }

  // Delegar ao orquestrador híbrido
  try {
    const hybrid = require('./gitness/hybridGitService');
    return hybrid.createHybridPR(repoPath, branch, rca, gold);
  } catch (e) {
    console.warn('[GITHUB] hybridGitService indisponível, usando GitHub direto:', e.message);
    return createGithubPRDirect(repoPath, branch, rca, gold);
  }
}

// ── Status de configuração ────────────────────────────────────────────────
function githubStatus() {
  const mode = process.env.HYBRID_GIT_MODE || 'github_only';
  const base = {
    configured: !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO),
    owner:    process.env.GITHUB_OWNER           || null,
    repo:     process.env.GITHUB_REPO            || null,
    base:     process.env.GITHUB_BASE_BRANCH     || 'main',
    auto_pr:  process.env.AUTO_PR               !== 'false',
    mode,
  };

  if (mode !== 'github_only') {
    try {
      const hybrid = require('./gitness/hybridGitService');
      return { ...base, hybrid: hybrid.hybridStatus() };
    } catch { /* sem gitness */ }
  }

  return base;
}

module.exports = { createPR, createGithubPRDirect, githubStatus, ghPost };

