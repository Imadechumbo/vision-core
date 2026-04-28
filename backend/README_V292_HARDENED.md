# VISION CORE V2.9.2 HARDENED

Correções principais:

- CORS inteligente com auto-detect de origin.
- `Origin: null` tratado sem bloquear health checks, file://, sandbox e probes.
- Headers CORS aplicados antes de qualquer rota.
- Preflight OPTIONS blindado.
- SSE com headers CORS e `X-Accel-Buffering: no`.
- Validation gate atualizado para sintaxe + contrato + CORS.

Rotas de validação:

- `GET /api/health`
- `GET /api/cors/diagnostic`
- `GET /api/run-live-stream`
- `POST /api/run-live`
- `POST /api/copilot`

Regra: sem PASS GOLD, nada é promovido.
