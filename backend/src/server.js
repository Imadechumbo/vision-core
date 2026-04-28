'use strict';
const app = require('./app');
const PORT = Number(process.env.PORT || 8080);
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log('================================================================');
  console.log('VISION CORE SERVER V2.9.4 FULL REAL');
  console.log('================================================================');
  console.log('URL:', `http://${HOST}:${PORT}`);
  console.log('Contrato: POST /api/copilot | POST /api/run-live | GET /api/run-live-stream | GET /api/health | GET /api/readiness');
  console.log('CORS: intelligent auto-detect + origin null safe + SSE hardened + diagnostic reflection');
  console.log('PASS GOLD: obrigatório para promoção');
  console.log('================================================================');
});

server.keepAliveTimeout = 75_000;
server.headersTimeout = 80_000;

function shutdown(signal) {
  console.log(`[SERVER] encerrando ${signal}`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
