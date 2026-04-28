'use strict';
const express = require('express');
const api = require('./routes/api');
const { installSecurity, installCorsHeaders } = require('./middleware/security');

const app = express();
installSecurity(app);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use('/api', api);
app.use('/', api); // compatibility for old front calls without /api

app.get('/', (req, res) => res.json({
  ok: true,
  service: 'vision-core-server',
  version: '2.9.4-ultra',
  status: 'online',
  contract: {
    run: 'POST /api/run-live',
    stream: 'GET /api/run-live-stream?mission_id=...',
    health: 'GET /api/health',
    version: 'GET /api/version'
  }
}));

app.use((req, res) => res.status(404).json({ ok: false, error: 'not_found', path: req.originalUrl, version:'2.9.4-ultra', available:['GET /api/health','POST /api/copilot','POST /api/run-live','GET /api/run-live-stream','GET /api/harness-stats'] }));
app.use((err, req, res, next) => {
  installCorsHeaders(req, res);
  console.error('[APP_ERROR]', err && err.stack ? err.stack : err);
  res.status(err.status || 500).json({ ok: false, error: err.code || 'internal_error', message: err.message || 'internal error', version:'2.9.4-ultra' });
});

module.exports = app;
