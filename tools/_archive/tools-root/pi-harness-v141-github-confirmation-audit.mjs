#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function git(args) {
  return spawnSync('git', args, { encoding: 'utf8', shell: false });
}

const lines = [];
let blocked = false;

const fetch = git(['fetch', 'origin', 'main']);
if (fetch.status !== 0) {
  blocked = true;
  lines.push('GIT_FETCH: BLOCKED');
} else {
  lines.push('GIT_FETCH: PASS');
}

const local = git(['rev-parse', 'HEAD']);
const remote = git(['rev-parse', 'origin/main']);
const localHead = (local.stdout || '').trim();
const remoteHead = (remote.stdout || '').trim();

if (!localHead || !remoteHead || localHead !== remoteHead) blocked = true;

lines.push('LOCAL_HEAD: ' + (localHead || 'unknown'));
lines.push('REMOTE_HEAD: ' + (remoteHead || 'unknown'));
lines.push('GITHUB_CONFIRMED: ' + Boolean(localHead && remoteHead && localHead === remoteHead));

console.log('=== PI HARNESS V14.1 GITHUB CONFIRMATION AUDIT ===');
console.log(`RESULT: ${blocked ? 'BLOCKED' : 'PASS'}`);
for (const line of lines) console.log(line);
console.log('PASS_GOLD_CANDIDATE: false');
console.log('PROMOTION_ALLOWED: false');
console.log('DEPLOY_ALLOWED: false');
process.exit(blocked ? 1 : 0);
