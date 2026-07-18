import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  appendHermesDecisionPair,
  appendModoTotalRca,
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

{
  const readyEntry = appendModoTotalRca(timelinePath, {
    userId: 'u-1',
    sintoma: 'Endpoint novo devolve 200 sem checar auth token=abc123456789',
    causa: 'Guard de auth foi copiado de outro endpoint sem adaptar o middleware',
    verificacao: 'node --check backend/server.js; curl -i sem header Authorization -> 401 confirmado',
    achado: 'nenhum, guard corrigido e confirmado por curl real',
    decisao: 'READY'
  });
  assert.equal(readyEntry.source, 'modo-total-rca');
  assert.equal(readyEntry.hermes_dataset.decision.label, 'PASS');
  assert.equal(readyEntry.hermes_dataset.outcome.status, 'success');
  assert.notEqual(readyEntry.hermes_dataset.outcome.validated_at, null);
  assert.doesNotMatch(JSON.stringify(readyEntry), /abc123456789/);

  const needsFixEntry = appendModoTotalRca(timelinePath, {
    userId: 'u-1',
    sintoma: 'Endpoint aceita payload sem validar tamanho',
    causa: 'validação de tamanho esquecida',
    verificacao: 'teste com payload de 50MB -> travou o processo',
    achado: 'falta guard de payloadLimit',
    decisao: 'NEEDS_FIX'
  });
  assert.equal(needsFixEntry.hermes_dataset.decision.label, 'NEEDS_FIX');
  assert.equal(needsFixEntry.hermes_dataset.outcome.status, 'failure');

  assert.throws(() => appendModoTotalRca(timelinePath, {
    sintoma: 'x', verificacao: 'y', decisao: 'BLOCKED_INPUT'
  }), /decisao inesperada/);

  const log = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
  const bySource = {};
  for (const e of log.entries) bySource[e.hermes_dataset.source] = (bySource[e.hermes_dataset.source] || 0) + 1;
  assert.equal(bySource['modo-total-rca'], 2);
  assert.equal(bySource['hermes-analyze'], 1);

  const examples = completeHermesExamples(log.entries);
  const modoTotalExamples = examples.filter((ex) => ex.source === 'modo-total-rca');
  assert.equal(modoTotalExamples.length, 2, 'ambos os RCAs de modo-total já devem estar completos sem depender de run-live');
}

console.log('hermes-dataset-collector: PASS');
