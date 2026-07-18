'use strict';

const { normalizeUserPlan } = require('./user-plan');

const DEFAULT_FREE_MISSION_LIMIT = 5;

function missionQuota(plan, used, configuredLimit) {
  const normalizedPlan = normalizeUserPlan(plan);
  if (normalizedPlan === 'pro' || normalizedPlan === 'enterprise') {
    return { plan: normalizedPlan, used: null, limit: null, remaining: null, unlimited: true, allowed: true };
  }
  const parsedLimit = Number.parseInt(configuredLimit, 10);
  const limit = Number.isInteger(parsedLimit) && parsedLimit >= 0 ? parsedLimit : DEFAULT_FREE_MISSION_LIMIT;
  const normalizedUsed = Number.isInteger(used) && used >= 0 ? used : 0;
  return { plan: 'free', used: normalizedUsed, limit, remaining: Math.max(0, limit - normalizedUsed), unlimited: false, allowed: normalizedUsed < limit };
}

module.exports = { DEFAULT_FREE_MISSION_LIMIT, missionQuota };
