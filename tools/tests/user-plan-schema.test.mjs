#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { USER_PLANS, normalizeUserPlan } = require('../../backend/user-plan');
const serverSource = await readFile(new URL('../../backend/server.js', import.meta.url), 'utf8');

assert.deepEqual(USER_PLANS, ['free', 'pro', 'enterprise']);
assert.equal(normalizeUserPlan('free'), 'free');
assert.equal(normalizeUserPlan('pro'), 'pro');
assert.equal(normalizeUserPlan('enterprise'), 'enterprise');
assert.equal(normalizeUserPlan(), 'free');
assert.equal(normalizeUserPlan('invalid'), 'free');

assert.match(serverSource, /function publicUser\(u\).*plan: normalizeUserPlan\(u\.plan\)/);
assert.match(serverSource, /const user = \{[^\n]+password_hash:[^\n]+plan: 'free'/);
assert.match(serverSource, /oauth_provider: 'google'[^\n]+plan: 'free'|plan: 'free'[^\n]+oauth_provider: 'google'/);
assert.match(serverSource, /oauth_provider: 'github'[^\n]+plan: 'free'|plan: 'free'[^\n]+oauth_provider: 'github'/);

console.log('user-plan-schema: 10 passed, 0 failed');
