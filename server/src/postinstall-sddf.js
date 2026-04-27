'use strict';

/**
 * VISION CORE — SDDF postinstall gate
 * Executa após npm ci/install no server para impedir ambiente quebrado.
 */

const { spawnSync } = require('child_process');
const path = require('path');

function run(label, command, args, options = {}) {
  console.log(`\n[SDDF postinstall] ${label}`);
  const r = spawnSync(command, args, {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'test', AUTO_PR: 'false', PORT: options.port || process.env.PORT || '9999' },
  });
  if (r.status !== 0) throw new Error(`${label} falhou com exit=${r.status}`);
}

function main() {
  if (process.env.SKIP_VISION_POSTINSTALL === '1') {
    console.log('[SDDF postinstall] ignorado por SKIP_VISION_POSTINSTALL=1');
    return;
  }

  const major = Number(process.versions.node.split('.')[0]);
  if (major !== 20) throw new Error(`Node 20 obrigatório. Atual: ${process.version}`);

  run('syntax: server', 'node', ['--check', 'src/server.js']);
  run('syntax: app', 'node', ['--check', 'src/app.js']);
  run('syntax: missionRunner', 'node', ['--check', 'src/services/missionRunner.js']);
  run('boot-check HTTP real', 'node', ['src/boot-check.js'], { port: '9999' });

  if (process.env.VISION_POSTINSTALL_LIVE_TEST === '1') {
    run('SSE + polling live self-test', 'node', ['src/self-test-live.js'], { port: '9998' });
  }

  console.log('\n[SDDF postinstall] PASSOU — ambiente válido para boot.');
}

try {
  main();
} catch (err) {
  console.error(`\n[SDDF postinstall] FAIL — ${err.message}`);
  process.exit(1);
}
