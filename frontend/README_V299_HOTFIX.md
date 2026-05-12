# VISION CORE V2.9.9 HOTFIX

Corrige o erro 405 no frontend:
- Força POST JSON em `/api/copilot`
- Força POST JSON em `/api/hermes/analyze`
- Força POST JSON em `/api/run-live`
- Bloqueia submit GET acidental de forms
- Protege contra `/api/api`
- Mantém SSE em `/api/run-live-stream`
- Não altera layout

Deploy:
```powershell
cd frontend
npx wrangler pages deploy . --project-name visioncoreai --commit-dirty=true
```
