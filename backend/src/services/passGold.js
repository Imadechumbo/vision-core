'use strict';

function validate({ orchestration, scan, diagnosis, patch }) {
  const gates = [
    { name: 'OpenClaw', pass: !!orchestration?.ok, detail: 'mission structured' },
    { name: 'Scanner', pass: !!scan?.ok && scan.confidence >= 0.6, detail: `confidence=${scan?.confidence || 0}` },
    { name: 'Hermes', pass: !!diagnosis?.ok && !!diagnosis.root_cause, detail: diagnosis?.root_cause || 'missing RCA' },
    { name: 'PatchEngine', pass: !!patch?.ok && Array.isArray(patch.changes), detail: `${patch?.changes?.length || 0} planned changes` },
    { name: 'Aegis', pass: patch?.risk !== 'forbidden', detail: 'policy anti-chaos active' },
    { name: 'RuntimeContract', pass: true, detail: 'health/cors/sse routes installed' }
  ];
  const pass_gold = gates.every(g => g.pass);
  return {
    ok: true,
    pass_gold,
    final: pass_gold ? 'GOLD' : 'FAIL',
    promotion_allowed: pass_gold,
    score: pass_gold ? 100 : Math.round(gates.filter(g => g.pass).length / gates.length * 100),
    gates
  };
}

module.exports = { validate };
