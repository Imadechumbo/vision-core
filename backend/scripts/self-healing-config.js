#!/usr/bin/env node
'use strict';

const path = require('path');
const { enforceConfigGold } = require('../vision_core/config/selfHealingConfig');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const rootIndex = args.indexOf('--root');
const root = rootIndex >= 0 && args[rootIndex + 1] ? path.resolve(args[rootIndex + 1]) : process.cwd();

const result = enforceConfigGold(root, { apply });
console.log(JSON.stringify({
  layer: 'VISION CORE V3 SELF-HEALING CONFIG LAYER',
  root,
  apply,
  ...result
}, null, 2));

if (!result.pass_gold) process.exit(1);
process.exit(0);
