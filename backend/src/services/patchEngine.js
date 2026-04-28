'use strict';

function plan(orchestration, diagnosis, scanResult) {
  const changes = [];
  const intent = orchestration.intent;

  if (intent === 'fix_cors') {
    changes.push({ path: 'src/middleware/security.js', type: 'verified_contract', summary: 'CORS inteligente: origin permitido, origin null, preflight global e headers SSE.' });
  }
  if (intent === 'fix_sse_pipeline') {
    changes.push({ path: 'src/routes/api.js', type: 'verified_contract', summary: 'SSE blindado com heartbeat, close handler e X-SSE-Status.' });
  }
  if (intent === 'fix_eb_bundle') {
    changes.push({ path: 'package.json', type: 'bundle_gate', summary: 'package.json precisa estar na raiz do ZIP EB-ready.' });
    changes.push({ path: 'server.js', type: 'bundle_gate', summary: 'server.js precisa estar na raiz do ZIP EB-ready.' });
  }
  if (intent === 'github_pr_after_pass_gold') {
    changes.push({ path: 'src/services/githubPr.js', type: 'integration_gate', summary: 'PR real/dry-run somente após PASS GOLD.' });
  }

  if (!changes.length) {
    changes.push({ path: scanResult.target_locked || 'src/routes/api.js', type: 'diagnostic_patch_plan', summary: 'Plano seguro baseado no Scanner e Hermes.' });
  }

  return {
    ok: true,
    mode: 'safe-patch-plan',
    applied: false,
    real_targets: true,
    target_locked: scanResult.target_locked,
    changes,
    rollback: { required: true, strategy: 'snapshot_before_write' },
    risk: diagnosis.severity === 'critical' ? 'high' : 'controlled'
  };
}

module.exports = { plan };
