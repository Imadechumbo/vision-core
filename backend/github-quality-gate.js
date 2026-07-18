'use strict';

const { normalizeUserPlan } = require('./user-plan');

function evaluateGithubQualityGate({ plan, userId, missionId, entries }) {
  const normalizedPlan = normalizeUserPlan(plan);
  if (normalizedPlan !== 'pro' && normalizedPlan !== 'enterprise') {
    return { ok: false, status: 403, error: 'pro_plan_required' };
  }
  if (!missionId) return { ok: false, status: 400, error: 'quality_gate_mission_required' };
  const evidence = (Array.isArray(entries) ? entries : []).find(entry =>
    entry.user_id === userId && entry.mission_id === missionId && entry.source === 'run-live' &&
    entry.pass_gold === true && entry.promotion_allowed === true &&
    entry.evidence_source === 'go-core' && typeof entry.evidence_receipt_id === 'string' && entry.evidence_receipt_id.length >= 8
  );
  if (!evidence) return { ok: false, status: 403, error: 'pass_gold_evidence_required' };
  return { ok: true, plan: normalizedPlan, mission_id: missionId, evidence_receipt_id: evidence.evidence_receipt_id, evidence_source: 'go-core' };
}

module.exports = { evaluateGithubQualityGate };
