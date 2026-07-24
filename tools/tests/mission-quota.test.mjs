#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { DEFAULT_FREE_MISSION_LIMIT, missionQuota } = require('../../backend/mission-quota');
const serverSource = await readFile(new URL('../../backend/server.js', import.meta.url), 'utf8');

assert.equal(DEFAULT_FREE_MISSION_LIMIT, 5);
assert.deepEqual(missionQuota('free', 0), { plan: 'free', used: 0, limit: 5, remaining: 5, unlimited: false, allowed: true });
assert.equal(missionQuota('free', 4).allowed, true);
assert.equal(missionQuota('free', 5).allowed, false);
assert.equal(missionQuota('free', 6).remaining, 0);
assert.equal(missionQuota('pro', 999).unlimited, true);
assert.equal(missionQuota('enterprise', 999).unlimited, true);
assert.equal(missionQuota('invalid', 5).allowed, false);
assert.equal(missionQuota('free', 2, '3').limit, 3);
assert.equal(missionQuota('free', 5, 'invalid').limit, 5);
assert.match(serverSource, /app\.all\('\/api\/copilot', checkMissionQuota/);
assert.match(serverSource, /app\.all\('\/api\/run-live', checkMissionQuota/);
// 838f618a (2026-07-20, "fix(s3): serialize read-modify-write per store to
// close concurrent lost-update race") replaced the direct
// writeAndSyncS3(MISSION_LOG_PATH, log) call with atomicStoreUpdate(), a
// serialized queue wrapper that still calls writeAndSyncS3(storeKey, db)
// internally (backend/server.js:742) — the S3 sync guarantee itself didn't
// change, only how concurrent writes to the same store are ordered.
assert.match(serverSource, /atomicStoreUpdate\(MISSION_LOG_PATH,/);
assert.match(serverSource, /function atomicStoreUpdate[\s\S]{0,300}?writeAndSyncS3\(storeKey, db\)/);
assert.match(serverSource, /_s3LoadSync\(MISSION_LOG_PATH\)/);

console.log('mission-quota: 15 passed, 0 failed');
