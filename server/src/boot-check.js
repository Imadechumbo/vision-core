'use strict';

/** VISION CORE V2.3.4 — Boot Check CI
 * Valida boot HTTP real sem depender de API externa.
 */

require('dotenv').config();
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.AUTO_PR = 'false';

const app = require('./app');
const { db } = require('./db/sqlite');

const PORT = Number(process.env.PORT || 9999);
const HOST = '127.0.0.1';

async function hit(path) {
  const res = await fetch(`http://${HOST}:${PORT}${path}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) throw new Error(`${path} falhou: HTTP ${res.status} ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  const server = app.listen(PORT, HOST);
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const health = await hit('/api/health');
    const contracts = await hit('/api/runtime/contracts');
    const metrics = await hit('/api/metrics/summary');
    if (contracts.contracts['/api/metrics/summary'].status !== 'real') throw new Error('metrics/summary precisa estar marcado como real');
    if (metrics.mock === true) throw new Error('metrics/summary não pode retornar mock:true');
    if (typeof metrics.runtime.cpu !== 'number') throw new Error('CPU real ausente');
    console.log('✔ Boot check OK', { service: health.service, version: health.version, cpu: metrics.runtime.cpu });
  } finally {
    await new Promise(resolve => server.close(resolve));
    try { db.close(); } catch {}
  }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(err => { console.error('✗ Boot check FAIL:', err.message); process.exit(1); });
}

module.exports = { main };
