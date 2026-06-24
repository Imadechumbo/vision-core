/**
 * _test146_s3_unit.cjs — §146 S3 persistence layer
 */
'use strict';
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log('  PASS', label); pass++; }
  else       { console.error('  FAIL', label); fail++; }
}

const server = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');

console.log('\n=== §146 S3 PERSISTENCE UNIT TESTS ===\n');

// --- server.js: S3 layer ---
console.log('[ server.js — S3 layer functions ]');
ok('S3_BUCKET const defined',      server.includes("const S3_BUCKET = process.env.AWS_S3_BUCKET"));
ok('S3_PREFIX const defined',      server.includes("const S3_PREFIX = process.env.AWS_S3_PREFIX"));
ok('_exec146 defined',             server.includes("const { exec: _exec146 }"));
ok('_s3Key function exists',       server.includes('function _s3Key('));
ok('_s3LoadSync function exists',  server.includes('function _s3LoadSync('));
ok('_s3PutAsync function exists',  server.includes('function _s3PutAsync('));
ok('writeAndSyncS3 function exists', server.includes('function writeAndSyncS3('));
ok('writeAndSyncS3 calls writeJsonFile', (() => {
  const idx = server.indexOf('function writeAndSyncS3(');
  return idx >= 0 && server.slice(idx, idx + 200).includes('writeJsonFile(');
})());
ok('writeAndSyncS3 calls _s3PutAsync', (() => {
  const idx = server.indexOf('function writeAndSyncS3(');
  return idx >= 0 && server.slice(idx, idx + 200).includes('_s3PutAsync(');
})());

// --- server.js: startup load ---
console.log('\n[ server.js — startup S3 load ]');
ok('startup S3 load block exists', server.includes('startup load done'));
ok('_s3LoadSync(USERS_DB) in startup', (() => {
  const idx = server.indexOf('startup: loading from bucket');
  return idx >= 0 && server.slice(idx, idx + 400).includes('_s3LoadSync(USERS_DB)');
})());
ok('_s3LoadSync(PROJECTS_DB) in startup', (() => {
  const idx = server.indexOf('startup: loading from bucket');
  return idx >= 0 && server.slice(idx, idx + 400).includes('_s3LoadSync(PROJECTS_DB)');
})());

// --- server.js: write replacements ---
console.log('\n[ server.js — write replacements ]');
ok('register uses writeAndSyncS3(USERS_DB)', (() => {
  const idx = server.indexOf("db.users.push(user);");
  return idx >= 0 && server.slice(idx, idx + 80).includes('writeAndSyncS3(USERS_DB');
})());
ok('login uses writeAndSyncS3(USERS_DB)', (() => {
  const idx = server.indexOf("user.last_login = now();");
  return idx >= 0 && server.slice(idx, idx + 80).includes('writeAndSyncS3(USERS_DB');
})());
ok('projects POST uses writeAndSyncS3(PROJECTS_DB)', (() => {
  const idx = server.indexOf("db.projects.push(project)");
  return idx >= 0 && server.slice(idx, idx + 100).includes('writeAndSyncS3(PROJECTS_DB');
})());
ok('updateUserPlan uses writeAndSyncS3(USERS_DB)', (() => {
  const idx = server.indexOf('function updateUserPlan(');
  return idx >= 0 && server.slice(idx, idx + 600).includes('writeAndSyncS3(USERS_DB');
})());
ok('no raw writeJsonFile(USERS_DB) left', !server.includes('writeJsonFile(USERS_DB,'));
ok('no raw writeJsonFile(PROJECTS_DB) left', !server.includes('writeJsonFile(PROJECTS_DB,'));

// --- S3 bucket exists ---
console.log('\n[ AWS S3 bucket ]');
try {
  const out = execSync('aws s3 ls s3://vision-core-data-prod/ --no-verify-ssl 2>&1', { encoding: 'utf8' });
  ok('bucket vision-core-data-prod accessible', !out.includes('NoSuchBucket') && !out.includes('does not exist'));
  ok('users.json uploaded to S3', out.includes('users.json') || (() => {
    const inner = execSync('aws s3 ls s3://vision-core-data-prod/data/ --no-verify-ssl 2>&1', { encoding: 'utf8' });
    return inner.includes('users.json');
  })());
} catch(e) {
  ok('bucket vision-core-data-prod accessible', false);
  ok('users.json uploaded to S3', false);
}

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
