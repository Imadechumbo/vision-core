# VISION CORE Backend Compatibility Hotfix

Objetivo: eliminar 405 por desalinhamento entre front e backend.

Rotas aceitas agora:
- POST/GET /api/run-live
- POST/GET /api/missions/run-live
- POST/GET /api/workers/enqueue
- GET /api/run-live-stream
- GET /api/missions/run-live-stream
- GET /api/missions/timeline
- GET /api/workers/status

Também aceita aliases sem /api por causa do app.use('/', api).
