'use strict';
const fs = require('fs');
const path = require('path');

function walk(dir) {
  const out = [];
  for (const item of fs.readdirSync(dir)) {
    if (item === 'node_modules' || item === '.git') continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = walk(process.cwd());
for (const file of files) {
  require('child_process').execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}
console.log(`[VISION VALIDATION GATE] PASS: ${files.length} JavaScript files parsed successfully.`);
