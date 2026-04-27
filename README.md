# VISION CORE V2.3.4 HARDENED REAL-TIME

Pacote corrigido para consolidar a linha V2.3.4.

## Regra-mestra

```txt
SEM PASS GOLD → não promove, não aprende, não abre PR e não faz deploy.
```

## Hardening aplicado

1. Versões antigas V2.2.2/V2.3.1 normalizadas para V2.3.4.
2. Paths locais `C__/Users/...` removidos do pacote.
3. Front exige `API_BASE_URL` explícito via `window.RUNTIME_CONFIG.API_BASE_URL`, `window.API_BASE_URL` ou `<meta name="vision-api-base">`.
4. Fallback visual quando `project_id` não existe.
5. `/api/metrics/summary` não usa mais `Math.random()`: usa CPU real por `process.cpuUsage`, memória real e disco real via `df` quando disponível.
6. PASS GOLD endurecido: exige sintaxe, testes configurados e aprovados, healthcheck aprovado, snapshot, confiança e risco aceitável.
7. Endpoints demo foram separados no contrato como `demo`, e os endpoints reais permanecem marcados como `real`.
8. CI ganhou `Boot Check` com migração, self-test, boot HTTP, `/api/health`, `/api/runtime/contracts` e `/api/metrics/summary`.
9. Node fixado em `>=20 <21` no root, server e agent.
10. Self-test vivo valida `run-live`, SSE e polling.

## Execução local

```powershell
cd server
npm install
npm run migrate
npm run boot-check
npm run self-test
npm run self-test:live
npm start
```

## Frontend

Antes de abrir o dashboard em deploy estático, defina a API real:

```html
<script>
window.RUNTIME_CONFIG = { API_BASE_URL: "http://localhost:8787" };
</script>
```

Em produção, use a URL pública do backend.
