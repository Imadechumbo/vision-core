'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ignoredDirs = new Set(['node_modules', '.git', '.elasticbeanstalk', 'dist', 'build', 'coverage']);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
  }
}

walk(root);

const failures = [];
for (const file of files) {
  try {
    const code = fs.readFileSync(file, 'utf8');
    new vm.Script(code, { filename: file, displayErrors: true });
  } catch (error) {
    failures.push({ file: path.relative(root, file), error });
  }
}

if (failures.length) {
  console.error('[VISION VALIDATION GATE] FAIL: JavaScript syntax validation failed.');
  for (const failure of failures) {
    console.error(`\n--- ${failure.file} ---\n${failure.error.stack || failure.error.message}`);
  }
  process.exit(1);
}

console.log(`[VISION VALIDATION GATE] PASS: ${files.length} JavaScript files parsed successfully.`);
