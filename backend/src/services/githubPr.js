'use strict';

const store = require('../store/jsonStore');

function b64(content) {
  return Buffer.from(String(content || ''), 'utf8').toString('base64');
}

function ghHeaders() {
  return {
    Authorization: 'Bearer ' + (process.env.GITHUB_TOKEN || ''),
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };
}

function repoCfg() {
  return {
    owner: process.env.GITHUB_OWNER || 'Imadechumbo',
    repo: process.env.GITHUB_REPO || 'vision-core',
    base: process.env.GITHUB_BASE_BRANCH || 'main'
  };
}

async function readJsonOrThrow(response, label) {
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (_) {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${label}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function createGithubPr({ title, message, changes, pass_gold, mission_id }) {
  const cfg = repoCfg();
  const token = process.env.GITHUB_TOKEN;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const branch = (`vision/pass-gold-${mission_id || stamp}`).replace(/[^a-zA-Z0-9_/-]/g, '-');

  const prRecord = {
    ok: false,
    dry_run: !token,
    owner: cfg.owner,
    repo: cfg.repo,
    branch,
    base: cfg.base,
    title,
    mission_id,
    pass_gold: !!pass_gold,
    createdAt: new Date().toISOString()
  };

  if (!pass_gold) {
    prRecord.blocked = true;
    prRecord.message = 'PR bloqueado: PASS GOLD obrigatório.';
    store.addPr(prRecord);
    return prRecord;
  }

  if (!token) {
    prRecord.ok = true;
    prRecord.dry_run = true;
    prRecord.pr_url = `https://github.com/${cfg.owner}/${cfg.repo}/pulls`;
    prRecord.message = 'GITHUB_TOKEN ausente: PR simulado, PASS GOLD validado.';
    store.addPr(prRecord);
    return prRecord;
  }

  const api = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}`;
  const headers = ghHeaders();
  const baseRefResponse = await fetch(`${api}/git/ref/heads/${cfg.base}`, { headers });
  const baseRef = await readJsonOrThrow(baseRefResponse, 'Falha obtendo SHA da branch base');

  if (!baseRef.object || !baseRef.object.sha) {
    throw new Error('Não foi possível obter SHA da branch base do GitHub.');
  }

  const createRefResponse = await fetch(`${api}/git/refs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseRef.object.sha })
  });
  await readJsonOrThrow(createRefResponse, 'Falha criando branch');

  for (const change of (changes || [])) {
    const filePath = change.path || `VISION_CORE_${stamp}.md`;
    const putResponse = await fetch(`${api}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: message || title || 'VISION CORE PASS GOLD patch',
        content: b64(change.content || ''),
        branch
      })
    });
    await readJsonOrThrow(putResponse, `Falha criando arquivo ${filePath}`);
  }

  const prBody = [
    'PASS GOLD confirmado.',
    '',
    `mission_id: ${mission_id || 'manual'}`,
    '',
    'Sem PASS GOLD nada é promovido.'
  ].join('\n');

  const prResponse = await fetch(`${api}/pulls`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: title || 'VISION CORE PASS GOLD PR',
      head: branch,
      base: cfg.base,
      body: prBody
    })
  });
  const pr = await readJsonOrThrow(prResponse, 'Falha criando PR');

  prRecord.ok = true;
  prRecord.dry_run = false;
  prRecord.pr_url = pr.html_url;
  prRecord.number = pr.number;
  store.addPr(prRecord);
  return prRecord;
}

module.exports = { createGithubPr, repoCfg };
