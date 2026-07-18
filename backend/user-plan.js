'use strict';

const USER_PLANS = Object.freeze(['free', 'pro', 'enterprise']);

function normalizeUserPlan(plan) {
  return USER_PLANS.includes(plan) ? plan : 'free';
}

module.exports = { USER_PLANS, normalizeUserPlan };
