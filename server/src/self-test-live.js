'use strict';

/** VISION CORE V2.3.4 — Live SSE/Poll Self-Test */

require('dotenv').config();
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.AUTO_PR = 'false';

const fs = require('fs');
const os = require('os');
const path = require('path');
const app = require('./app');
const { helpers, db } = require('./db/sqlite');

const PORT = Number(process.env.PORT || 9998);
const HOST = '127.0.0.1';
const BASE = `http://${HOST}:${PORT}`;

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vision-live-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ scripts: { test: 'node --check index.js' } }, null, 2));
  fs.writeFileSync(path.join(tmp, 'index.js'), 'const ok = true;\nconsole.log(ok);\n');
  helpers.upsertProject.run({ id: 'selftest-live', name: 'SelfTest Live', stack: 'node', path: tmp, health_url: `${BASE}/api/health`, adapter: 'generic', config: '{}' });

  const server = app.listen(PORT, HOST);
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const start = await fetch(`${BASE}/api/missions/run-live`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: 'selftest-live', error: 'diagnosticar runtime', dry_run: true }) });
    const data = await start.json();
    if (!start.ok || !data.ok || !data.mission_id) throw new Error(`run-live falhou: ${JSON.stringify(data)}`);

    const sse = await fetch(`${BASE}/api/missions/${data.mission_id}/stream`);
    if (!sse.ok || !String(sse.headers.get('content-type') || '').includes('text/event-stream')) throw new Error('SSE não abriu como text/event-stream');
    sse.body.cancel().catch(() => {});

    let poll;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 300));
      poll = await fetch(`${BASE}/api/missions/${data.mission_id}/poll`).then(r => r.json());
      if (poll.done) break;
    }
    if (!poll || !poll.ok) throw new Error('poll falhou');
    if (!Array.isArray(poll.steps)) throw new Error('poll sem steps');
    console.log('✔ Live self-test OK', { mission_id: data.mission_id, status: poll.status, steps: poll.steps.length });
  } finally {
    helpers.deleteProject.run('selftest-live');
    fs.rmSync(tmp, { recursive: true, force: true });
    await new Promise(resolve => server.close(resolve));
    try { db.close(); } catch {}
  }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(err => { console.error('✗ Live self-test FAIL:', err.message); process.exit(1); });
}

module.exports = { main };
