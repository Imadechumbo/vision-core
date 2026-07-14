import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  createGithubPullRequest,
  createGithubPullRequestMcp,
  createGithubPullRequestRest,
  isMcpEnabled
} = require('../../backend/github-pr-adapter.js');

function jsonResponse(status, data) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function makeFetchRecorder() {
  const calls = [];
  const fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes('/git/ref/heads/main')) return jsonResponse(200, { object: { sha: 'base-sha' } });
    if (url.includes('/git/refs')) return jsonResponse(201, {});
    if (url.includes('/contents/README.md?')) return jsonResponse(404, { message: 'not found' });
    if (url.includes('/contents/README.md')) return jsonResponse(201, {});
    if (url.endsWith('/pulls')) return jsonResponse(201, { html_url: 'https://github.com/o/r/pull/7', number: 7 });
    throw new Error(`unexpected fetch: ${url}`);
  };
  return { fetch, calls };
}

const input = {
  repo: 'o/r',
  baseBranch: 'main',
  headBranch: 'vc-test',
  title: 'Fix',
  body: 'Body',
  files: [{ path: 'README.md', content: 'hello' }]
};

{
  assert.equal(isMcpEnabled({}), false);
  assert.equal(isMcpEnabled({ GITHUB_MCP_ENABLED: '1' }), true);
  assert.equal(isMcpEnabled({ GITHUB_PR_MODE: 'mcp' }), true);
}

{
  const rec = makeFetchRecorder();
  const result = await createGithubPullRequestRest(input, {
    fetch: rec.fetch,
    githubToken: 'token',
    now: () => 'now'
  });
  assert.equal(result.mode, 'rest');
  assert.equal(result.pr_url, 'https://github.com/o/r/pull/7');
  assert.equal(result.files_committed, 1);
  assert.deepEqual(rec.calls.map((c) => new URL(c.url).pathname), [
    '/repos/o/r/git/ref/heads/main',
    '/repos/o/r/git/refs',
    '/repos/o/r/contents/README.md',
    '/repos/o/r/contents/README.md',
    '/repos/o/r/pulls'
  ]);
}

{
  const toolCalls = [];
  const result = await createGithubPullRequestMcp({ ...input, files: [] }, {
    now: () => 'now',
    callTool: async (name, args) => {
      toolCalls.push({ name, args });
      return { structuredContent: { html_url: 'https://github.com/o/r/pull/8', number: 8 } };
    }
  });
  assert.equal(result.mode, 'mcp');
  assert.equal(result.pr_number, 8);
  assert.equal(toolCalls.length, 1);
  assert.equal(toolCalls[0].name, 'create_pull_request');
  assert.equal(toolCalls[0].args.owner, 'o');
  assert.equal(toolCalls[0].args.repo, 'r');
}

{
  const rec = makeFetchRecorder();
  const result = await createGithubPullRequest(input, {
    env: { GITHUB_MCP_ENABLED: '1' },
    fetch: rec.fetch,
    githubToken: 'token',
    now: () => 'now',
    callTool: async () => { throw new Error('should not be called for file commits'); }
  });
  assert.equal(result.mode, 'rest_fallback');
  assert.equal(result.mcp_error, 'mcp_minimal_toolset_cannot_commit_files');
  assert.equal(result.pr_url, 'https://github.com/o/r/pull/7');
}

console.log('github-pr-adapter: 4/4 PASS');
