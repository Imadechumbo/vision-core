'use strict';

function has(signalSet, name) { return signalSet.has(name); }

function diagnose(orchestration, scanResult) {
  const signals = new Set(orchestration.signals || []);
  const contracts = scanResult.contracts || {};
  let root_cause = 'runtime_contract_drift';
  let severity = 'medium';
  const evidence = [];
  const actions = [];

  if (has(signals, 'cors') || contracts.cors !== 'detected') {
    root_cause = 'cors_contract_or_preflight_gap';
    severity = 'high';
    actions.push('Reflect allowed origin before route handlers', 'Handle OPTIONS globally', 'Expose SSE and diagnostic headers');
  }
  if (has(signals, 'sse') || contracts.sse !== 'detected') {
    root_cause = root_cause === 'runtime_contract_drift' ? 'sse_stream_contract_gap' : root_cause;
    severity = 'high';
    actions.push('Use text/event-stream headers', 'Heartbeat every 15s', 'Close interval on client disconnect');
  }
  if (has(signals, 'eb_bundle')) {
    root_cause = 'elastic_beanstalk_bundle_root_invalid';
    severity = 'critical';
    actions.push('Deploy backend ZIP with package.json/server.js at ZIP root', 'Do not upload integrated frontend/backend ZIP to EB');
  }
  if (has(signals, 'github_pr')) {
    actions.push('Create PR only after PASS GOLD', 'Fallback to dry-run when GITHUB_TOKEN is missing');
  }

  for (const file of scanResult.files || []) {
    if (file.exists) evidence.push(`${file.path}: exists`);
  }

  return {
    ok: true,
    source: 'Hermes RCA',
    root_cause,
    severity,
    confidence: scanResult.confidence || 0.8,
    evidence: evidence.slice(0, 10),
    actions: Array.from(new Set(actions.length ? actions : ['Run route contract gate', 'Run syntax gate', 'Run PASS GOLD gate'])),
    scanner_required: true,
    scanner_confidence: scanResult.confidence || 0
  };
}

module.exports = { diagnose };
