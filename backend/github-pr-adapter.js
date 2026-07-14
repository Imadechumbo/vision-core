'use strict';

const DEFAULT_MCP_TOOLS = 'get_file_contents,create_pull_request';
const DEFAULT_MCP_TOOLSETS = 'repos,pull_requests';

function isMcpEnabled(env = process.env) {
  return env.GITHUB_PR_MODE === 'mcp' || env.GITHUB_MCP_ENABLED === '1';
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'vision-core-backend/3.0.0'
  };
}

function validateInput(input) {
  if (!input.repo || !input.baseBranch || !input.headBranch || !input.title) {
    const err = new Error('repo, base_branch, head_branch e title sao obrigatorios');
    err.status = 400;
    err.code = 'missing_required_fields';
    throw err;
  }
}

async function createGithubPullRequestRest(input, options = {}) {
  validateInput(input);
  const fetchFn = options.fetch || fetch;
  const token = options.githubToken || process.env.GITHUB_TOKEN;
  const now = options.now || (() => new Date().toISOString());
  if (!token) {
    const err = new Error('GITHUB_TOKEN not configured');
    err.status = 500;
    err.code = 'github_token_not_configured';
    throw err;
  }

  const headers = ghHeaders(token);
  const refRes = await fetchFn(`https://api.github.com/repos/${input.repo}/git/ref/heads/${input.baseBranch}`, { headers });
  if (!refRes.ok) return { ok: false, status: refRes.status, error: 'base_branch_not_found', detail: await readGhError(refRes), time: now() };
  const refData = await refRes.json();

  const createBranchRes = await fetchFn(`https://api.github.com/repos/${input.repo}/git/refs`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${input.headBranch}`, sha: refData.object.sha })
  });
  if (!createBranchRes.ok && createBranchRes.status !== 422) {
    return { ok: false, status: createBranchRes.status, error: 'create_branch_failed', detail: await readGhError(createBranchRes), time: now() };
  }

  for (const file of input.files || []) {
    if (!file.path || file.content === undefined) continue;
    let existingSha;
    const existRes = await fetchFn(`https://api.github.com/repos/${input.repo}/contents/${file.path}?ref=${input.headBranch}`, { headers });
    if (existRes.ok) existingSha = (await existRes.json().catch(() => ({}))).sha;

    const putPayload = {
      message: input.title,
      content: Buffer.from(String(file.content), 'utf8').toString('base64'),
      branch: input.headBranch
    };
    if (existingSha) putPayload.sha = existingSha;

    const putRes = await fetchFn(`https://api.github.com/repos/${input.repo}/contents/${file.path}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(putPayload)
    });
    if (!putRes.ok) return { ok: false, status: putRes.status, error: 'commit_file_failed', path: file.path, detail: await readGhError(putRes), time: now() };
  }

  const prRes = await fetchFn(`https://api.github.com/repos/${input.repo}/pulls`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: input.title,
      body: input.body || `PR criado automaticamente pelo Vision Core\n\nBranch: \`${input.headBranch}\` -> \`${input.baseBranch}\``,
      head: input.headBranch,
      base: input.baseBranch
    })
  });
  if (!prRes.ok) return { ok: false, status: prRes.status, error: 'create_pr_failed', detail: await readGhError(prRes), time: now() };
  const prData = await prRes.json();

  return {
    ok: true,
    mode: 'rest',
    pr_url: prData.html_url,
    pr_number: prData.number,
    branch: input.headBranch,
    files_committed: (input.files || []).length,
    time: now()
  };
}

async function createGithubPullRequestMcp(input, options = {}) {
  validateInput(input);
  if ((input.files || []).length > 0) {
    const err = new Error('mcp_minimal_toolset_cannot_commit_files');
    err.code = 'mcp_minimal_toolset_cannot_commit_files';
    throw err;
  }

  const callTool = options.callTool || await createMcpToolCaller(options);
  const result = await callTool('create_pull_request', {
    owner: input.repo.split('/')[0],
    repo: input.repo.split('/').slice(1).join('/'),
    base: input.baseBranch,
    head: input.headBranch,
    title: input.title,
    body: input.body || `PR criado automaticamente pelo Vision Core\n\nBranch: \`${input.headBranch}\` -> \`${input.baseBranch}\``
  });
  const data = normalizeMcpResult(result);

  return {
    ok: true,
    mode: 'mcp',
    pr_url: data.html_url || data.url || data.pr_url,
    pr_number: data.number || data.pr_number || null,
    branch: input.headBranch,
    files_committed: 0,
    time: (options.now || (() => new Date().toISOString()))()
  };
}

async function createGithubPullRequest(input, options = {}) {
  const env = options.env || process.env;
  if (isMcpEnabled(env)) {
    try {
      return await createGithubPullRequestMcp(input, options);
    } catch (err) {
      const rest = await createGithubPullRequestRest(input, options);
      return { ...rest, mode: 'rest_fallback', mcp_error: err.code || err.message };
    }
  }
  return createGithubPullRequestRest(input, options);
}

async function createMcpToolCaller(options) {
  const token = options.githubToken || process.env.GITHUB_TOKEN;
  if (!token) {
    const err = new Error('GITHUB_TOKEN not configured');
    err.code = 'github_token_not_configured';
    throw err;
  }

  const { Client } = require('@modelcontextprotocol/sdk/client');
  const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
  const client = new Client({ name: 'vision-core-github-agent', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.env.GITHUB_MCP_COMMAND || 'github-mcp-server',
    args: (process.env.GITHUB_MCP_ARGS || '').split(/\s+/).filter(Boolean),
    env: {
      ...process.env,
      GITHUB_PERSONAL_ACCESS_TOKEN: token,
      GITHUB_TOOLSETS: process.env.GITHUB_TOOLSETS || DEFAULT_MCP_TOOLSETS,
      GITHUB_TOOLS: process.env.GITHUB_TOOLS || DEFAULT_MCP_TOOLS
    },
    stderr: 'pipe'
  });
  await client.connect(transport);
  return async (name, args) => {
    try {
      return await client.callTool({ name, arguments: args });
    } finally {
      await client.close();
    }
  };
}

async function readGhError(response) {
  const data = await response.json().catch(() => ({}));
  return data.message || response.status;
}

function normalizeMcpResult(result) {
  if (result && result.structuredContent) return result.structuredContent;
  const text = result && Array.isArray(result.content)
    ? result.content.map((item) => item && item.text).filter(Boolean).join('\n')
    : '';
  try { return text ? JSON.parse(text) : {}; } catch (_) { return { url: text }; }
}

module.exports = {
  DEFAULT_MCP_TOOLS,
  DEFAULT_MCP_TOOLSETS,
  isMcpEnabled,
  createGithubPullRequest,
  createGithubPullRequestRest,
  createGithubPullRequestMcp
};
