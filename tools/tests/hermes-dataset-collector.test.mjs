import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  appendHermesDecisionPair,
  updateHermesOutcome,
  completeHermesExamples,
  redactValue
} = require('../../backend/hermes-dataset.js');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-dataset-'));
const timelinePath = path.join(dir, 'mission-timeline.json');

{
  const redacted = redactValue({
    message: 'bug report OPENAI_API_KEY=sk-1234567890abcdef1234567890 and email user@example.com',
    nested: { client_secret: 'super-secret-value' },
    auth: 'Bearer abcdefghijklmnopqrstuvwxyz123456'
  });
  assert.match(redacted.message, /\[REDACTED_SECRET\]/);
  assert.match(redacted.message, /\[REDACTED_EMAIL\]/);
  assert.equal(redacted.nested.client_secret, '[REDACTED_SECRET]');
  assert.match(redacted.auth, /Bearer \[REDACTED_SECRET\]/);
}

const entry = appendHermesDecisionPair(timelinePath, {
  userId: 'u-1',
  missionId: 'mission-1',
  source: 'hermes-analyze',
  previewInput: 'Fix API token=abc123456789',
  input: { message: 'Fix API token=abc123456789', mode: 'debug' },
  context: { endpoint: '/api/hermes/analyze' },
  decision: {
    label: 'NEEDS_FIX',
    diagnosis: 'Root cause found. Use env var instead of token=abc123456789.'
  },
  provider: 'local',
  model: 'hermes-local'
});

{
  const log = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
  assert.equal(log.entries.length, 1);
  assert.equal(log.entries[0].id, entry.id);
  assert.equal(log.entries[0].hermes_dataset.outcome.status, 'pending');
  assert.equal(completeHermesExamples(log.entries).length, 0);
  assert.doesNotMatch(JSON.stringify(log), /abc123456789/);
}

{
  const result = updateHermesOutcome(timelinePath, {
    userId: 'u-1',
    datasetId: entry.id,
    missionId: 'mission-1',
    input: 'Fix API token=abc123456789',
    payload: {
      ok: true,
      pass_gold: true,
      mission_id: 'mission-1',
      evidence_receipt: { id: 'evr-12345678', issued_at: 'now', source: 'go-core' }
    }
  });
  assert.equal(result.updated, true);
  assert.equal(result.outcome.status, 'success');
  const log = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
  const examples = completeHermesExamples(log.entries);
  assert.equal(examples.length, 1);
  assert.equal(examples[0].outcome.pass_gold, true);
}

{
  const miss = updateHermesOutcome(timelinePath, {
    userId: 'u-1',
    datasetId: 'missing',
    missionId: 'missing',
    payload: { ok: false, status: 'FAIL', message: 'failed' }
  });
  assert.equal(miss.updated, false);
}

console.log('hermes-dataset-collector: PASS');
