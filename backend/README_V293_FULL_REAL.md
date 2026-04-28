# VISION CORE V2.9.4 FULL REAL

Entrega focada em produção EB + Cloudflare Pages.

## Inclui
- OpenClaw Router real para intent/category/signals/targetHints.
- Scanner real de filesystem quando `PROJECT_ROOT` existe; fallback seguro quando não existe.
- Hermes RCA obrigatório depois do Scanner.
- PatchEngine em modo safe-plan com rollback obrigatório.
- Aegis/PASS GOLD: sem GOLD não há promoção nem PR.
- GitHub PR real quando `GITHUB_TOKEN` está configurado; dry-run seguro quando não está.
- CORS inteligente, `Origin: null` tratado, preflight global e reflexão diagnóstica.
- SSE blindado com heartbeat, close handler e headers corretos.
- EB-ready: `package.json`, `server.js` e `Procfile` na raiz do ZIP de backend.

## Deploy correto no Elastic Beanstalk
Use somente o ZIP `vision-core-v293-backend-eb-ready.zip`.
Não envie o ZIP integrado para o EB, porque o EB exige `package.json` ou `server.js` na raiz do pacote.

## Validação
```bash
npm run validate
npm start
```

Endpoints principais:
- `GET /api/health`
- `GET /api/readiness`
- `GET /api/validation/gates`
- `POST /api/copilot`
- `POST /api/run-live`
- `GET /api/run-live-stream`
- `POST /api/scanner/scan`
