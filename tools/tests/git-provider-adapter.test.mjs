import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { GIT_PROVIDER_METHODS, registerGitProvider, getGitProvider, listGitProviders } =
  require('../../backend/git-provider-adapter.js');
const { githubAdapter } = require('../../backend/github-pr-adapter.js');

let n = 0;

function jsonResponse(status, data, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    headers: { get: (k) => headers[k.toLowerCase()] || null }
  };
}

/* registro: interface, fail-closed, wiring real com o adapter GitHub */

{
  assert.deepEqual(GIT_PROVIDER_METHODS, [
    'testConnection', 'createBranch', 'commitFiles', 'createPullRequest',
    'getPullRequestStatus', 'mergePullRequest', 'getCIStatus'
  ]);
  n++;
}

{
  assert.throws(() => registerGitProvider('incomplete', { testConnection: () => {} }), /git_provider_adapter_incomplete/);
  n++;
}

{
  assert.throws(() => getGitProvider('does-not-exist'), /git_provider_not_registered/);
  n++;
}

{
  // github-pr-adapter.js se auto-registra ao ser importado (wiring real, sem tocar server.js)
  const adapter = getGitProvider('github');
  assert.equal(adapter, githubAdapter);
  assert.ok(listGitProviders().includes('github'));
  for (const method of GIT_PROVIDER_METHODS) assert.equal(typeof adapter[method], 'function');
  n++;
}

/* githubAdapter.testConnection */

{
  const result = await githubAdapter.testConnection('tok', {
    fetch: async () => jsonResponse(200, { login: 'octocat' }, { 'x-oauth-scopes': 'repo, workflow' }),
    now: () => 'now'
  });
  assert.equal(result.connected, true);
  assert.equal(result.user, 'octocat');
  assert.deepEqual(result.scopes, ['repo', 'workflow']);
  n++;
}

{
  const result = await githubAdapter.testConnection(null, { now: () => 'now' });
  assert.equal(result.connected, false);
  assert.equal(result.error, 'github_token_not_configured');
  n++;
}

{
  const result = await githubAdapter.testConnection('bad', {
    fetch: async () => jsonResponse(401, { message: 'Bad credentials' }),
    now: () => 'now'
  });
  assert.equal(result.connected, false);
  assert.equal(result.status, 401);
  n++;
}

/* githubAdapter.createBranch */

{
  const calls = [];
  const result = await githubAdapter.createBranch('o/r', 'main', 'feat/x', {
    githubToken: 'tok',
    now: () => 'now',
    fetch: async (url, opts) => {
      calls.push(url);
      if (url.includes('/git/ref/heads/main')) return jsonResponse(200, { object: { sha: 'base-sha' } });
      if (url.includes('/git/refs')) return jsonResponse(201, {});
      throw new Error(`unexpected: ${url}`);
    }
  });
  assert.equal(result.branch, 'feat/x');
  assert.equal(result.sha, 'base-sha');
  assert.equal(calls.length, 2);
  n++;
}

{
  await assert.rejects(
    () => githubAdapter.createBranch('o/r', 'main', 'feat/x', { githubToken: '', now: () => 'now' }),
    (err) => err.code === 'github_token_not_configured'
  );
  n++;
}

/* githubAdapter.commitFiles */

{
  const result = await githubAdapter.commitFiles('o/r', 'feat/x', [{ path: 'a.txt', content: 'hi' }], 'msg', {
    githubToken: 'tok',
    now: () => 'now',
    fetch: async (url) => {
      if (url.includes('/contents/a.txt?')) return jsonResponse(404, {});
      if (url.includes('/contents/a.txt')) return jsonResponse(201, { commit: { sha: 'commit-sha' } });
      throw new Error(`unexpected: ${url}`);
    }
  });
  assert.equal(result.commitSha, 'commit-sha');
  n++;
}

/* githubAdapter.createPullRequest */

{
  const result = await githubAdapter.createPullRequest('o/r', 'feat/x', 'main', 'Title', 'Body', {
    githubToken: 'tok',
    now: () => 'now',
    fetch: async (url) => {
      assert.ok(url.endsWith('/pulls'));
      return jsonResponse(201, { number: 9, html_url: 'https://github.com/o/r/pull/9', state: 'open' });
    }
  });
  assert.equal(result.id, 9);
  assert.equal(result.url, 'https://github.com/o/r/pull/9');
  assert.equal(result.status, 'open');
  n++;
}

/* githubAdapter.getPullRequestStatus */

{
  const result = await githubAdapter.getPullRequestStatus('o/r', 9, {
    githubToken: 'tok',
    now: () => 'now',
    fetch: async (url) => {
      if (url.endsWith('/pulls/9')) return jsonResponse(200, { state: 'open', mergeable: true, head: { sha: 'head-sha' } });
      if (url.includes('/check-runs')) return jsonResponse(200, { check_runs: [{ name: 'ci', status: 'completed', conclusion: 'success' }] });
      throw new Error(`unexpected: ${url}`);
    }
  });
  assert.equal(result.status, 'open');
  assert.equal(result.mergeable, true);
  assert.deepEqual(result.checks, [{ name: 'ci', status: 'completed', conclusion: 'success' }]);
  n++;
}

/* githubAdapter.mergePullRequest */

{
  const result = await githubAdapter.mergePullRequest('o/r', 9, 'squash', {
    githubToken: 'tok',
    now: () => 'now',
    fetch: async (url, opts) => {
      assert.ok(url.endsWith('/pulls/9/merge'));
      assert.equal(opts.method, 'PUT');
      return jsonResponse(200, { merged: true, sha: 'merge-sha' });
    }
  });
  assert.equal(result.merged, true);
  assert.equal(result.sha, 'merge-sha');
  n++;
}

/* githubAdapter.getCIStatus */

{
  const result = await githubAdapter.getCIStatus('o/r', 'main', {
    githubToken: 'tok',
    now: () => 'now',
    fetch: async () => jsonResponse(200, {
      check_runs: [
        { name: 'build', status: 'completed', conclusion: 'success' },
        { name: 'test', status: 'completed', conclusion: 'success' }
      ]
    })
  });
  assert.equal(result.status, 'success');
  assert.deepEqual(result.jobs, [{ name: 'build', status: 'success' }, { name: 'test', status: 'success' }]);
  n++;
}

{
  const result = await githubAdapter.getCIStatus('o/r', 'main', {
    githubToken: 'tok',
    now: () => 'now',
    fetch: async () => jsonResponse(200, { check_runs: [{ name: 'build', status: 'completed', conclusion: 'failure' }] })
  });
  assert.equal(result.status, 'failed');
  n++;
}

console.log(`git-provider-adapter: ${n}/${n} PASS`);
