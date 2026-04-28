# VISION CORE Backend V2.5 REAL COMPLETO

Contrato oficial de produção:

- `POST /api/run-live` inicia missão.
- `GET /api/run-live-stream?mission=...` abre SSE/timeline vivo.
- `GET /api/health` health check.
- `GET /api/version` versão.

Inclui:

- CORS global antes das rotas.
- SSE com headers corretos para Cloudflare/EB.
- Aliases antigos para evitar 405 (`/api/missions/run-live`, `/api/workers/enqueue`).
- Rotas esperadas pelo front: billing, github, runtime, metrics, agents.
- Pipeline real heurístico: OpenClaw → Scanner → Hermes → PatchEngine → Aegis → SDDF → PASS GOLD.
- Regra: sem PASS GOLD nada promove.

## Deploy EB

Suba o conteúdo deste diretório como ZIP no Elastic Beanstalk.

Teste:

```bash
curl -I https://api.technetgame.com.br/api/health
curl https://api.technetgame.com.br/api/version
```

O header `Access-Control-Allow-Origin` deve aparecer.
