#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function validReceipt(value) {
  return typeof value === 'string' && value.trim().length >= 8;
}

async function main() {
  console.log('=== PI HARNESS V14.1 BACKEND EVIDENCE PROBE ===');
  let runtime;
  try {
    runtime = require('../backend/src/runtime/goRunner.js');
  } catch (error) {
    console.log('RESULT: BLOCKED');
    console.log('REASON: cannot load goRunner.js');
    console.log('ERROR: ' + error.message);
    console.log('PASS_GOLD_CANDIDATE: false');
    console.log('PROMOTION_ALLOWED: false');
    console.log('DEPLOY_ALLOWED: false');
    process.exit(1);
  }

  if (!runtime || typeof runtime.runGoMission !== 'function') {
    console.log('RESULT: BLOCKED');
    console.log('REASON: runGoMission export missing');
    console.log('PASS_GOLD_CANDIDATE: false');
    console.log('PROMOTION_ALLOWED: false');
    console.log('DEPLOY_ALLOWED: false');
    process.exit(1);
  }

  let result;
  try {
    result = await runtime.runGoMission({
      root: process.cwd(),
      input: 'pi-harness-v141-backend-evidence-probe',
      dryRun: true
    });
  } catch (error) {
    console.log('RESULT: BLOCKED');
    console.log('REASON: runGoMission threw');
    console.log('ERROR: ' + error.message);
    console.log('PASS_GOLD_CANDIDATE: false');
    console.log('PROMOTION_ALLOWED: false');
    console.log('DEPLOY_ALLOWED: false');
    process.exit(1);
  }

  const receiptOk = validReceipt(result && result.evidence_receipt);
  const passGold = result && result.pass_gold === true;
  const promotion = result && result.promotion_allowed === true;
  const candidate = receiptOk && passGold && promotion;

  console.log('RESULT: ' + (receiptOk ? 'PASS' : 'BLOCKED'));
  console.log('BACKEND_EVIDENCE_RECEIPT: ' + (receiptOk ? 'true' : 'false'));
  console.log('GO_STATUS: ' + (result && result.status ? result.status : 'unknown'));
  console.log('GO_ENGINE: ' + (result && result.engine ? result.engine : 'unknown'));
  console.log('PASS_GOLD_CANDIDATE: ' + (candidate ? 'true' : 'false'));
  console.log('PROMOTION_ALLOWED: ' + (candidate ? 'true' : 'false'));
  console.log('DEPLOY_ALLOWED: false');

  if (!receiptOk) process.exit(1);
  process.exit(0);
}

main();
