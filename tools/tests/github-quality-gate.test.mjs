#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { evaluateGithubQualityGate } = require('../../backend/github-quality-gate');
const serverSource = await readFile(new URL('../../backend/server.js', import.meta.url), 'utf8');

const evidence = { user_id: 'u1', mission_id: 'm1', source: 'run-live', pass_gold: true, promotion_allowed: true, evidence_source: 'go-core', evidence_receipt_id: 'receipt-123' };

assert.equal(evaluateGithubQualityGate({ plan: 'free', userId: 'u1', missionId: 'm1', entries: [evidence] }).error, 'pro_plan_required');
assert.equal(evaluateGithubQualityGate({ plan: 'pro', userId: 'u1', missionId: '', entries: [evidence] }).error, 'quality_gate_mission_required');
assert.equal(evaluateGithubQualityGate({ plan: 'pro', userId: 'other', missionId: 'm1', entries: [evidence] }).error, 'pass_gold_evidence_required');
assert.equal(evaluateGithubQualityGate({ plan: 'pro', userId: 'u1', missionId: 'm1', entries: [{ ...evidence, source: 'sf-autopilot' }] }).error, 'pass_gold_evidence_required');
assert.equal(evaluateGithubQualityGate({ plan: 'pro', userId: 'u1', missionId: 'm1', entries: [{ ...evidence, evidence_source: 'backend' }] }).error, 'pass_gold_evidence_required');
assert.equal(evaluateGithubQualityGate({ plan: 'pro', userId: 'u1', missionId: 'm1', entries: [evidence] }).ok, true);
assert.equal(evaluateGithubQualityGate({ plan: 'enterprise', userId: 'u1', missionId: 'm1', entries: [evidence] }).ok, true);
assert.match(serverSource, /app\.post\('\/api\/github\/create-pr', requireVisionAuth/);
assert.match(serverSource, /const passGoldVerified = Boolean\(passGoldCandidateFromResult\(payload\)/);
// 838f618a (2026-07-20, "fix(s3): serialize read-modify-write per store to
// close concurrent lost-update race") replaced the direct
// writeAndSyncS3(MISSION_TIMELINE_PATH, log) call with atomicStoreUpdate(), a
// serialized queue wrapper that still calls writeAndSyncS3(storeKey, db)
// internally (backend/server.js:742) — same fix as mission-quota.test.mjs,
// the S3 sync guarantee itself didn't change.
assert.match(serverSource, /atomicStoreUpdate\(MISSION_TIMELINE_PATH,/);
assert.match(serverSource, /function atomicStoreUpdate[\s\S]{0,300}?writeAndSyncS3\(storeKey, db\)/);
assert.match(serverSource, /_s3LoadSync\(MISSION_TIMELINE_PATH\)/);

console.log('github-quality-gate: 12 passed, 0 failed');
