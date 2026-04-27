# VISION CORE V2.3.4 HARDENED REAL-TIME — Relatório de Patch

## Itens aplicados

- Versão consolidada para `2.3.4-hardened-realtime` em `package.json`, `server/package.json`, `agent/package.json` e documentação principal.
- Removida a árvore local vazada `server/C__/Users/...`.
- Front real-time agora exige `API_BASE_URL` explícito e exibe falha visual `API OFF` se a API não for configurada.
- `POST /api/missions/run-live` retorna `PROJECT_NOT_FOUND` com lista de projetos disponíveis e hint operacional quando o `project_id` não existe.
- `/api/metrics/summary` deixou de usar `Math.random()` e passou a usar CPU real via `process.cpuUsage`, memória real via `process.memoryUsage` e disco via `df` quando disponível.
- PASS GOLD endurecido em `passGoldEngine.js`: exige sintaxe, testes configurados/aprovados, healthcheck configurado/aprovado, snapshot, patch aplicado, confiança mínima e risco aceitável.
- Endpoints de demonstração foram marcados como `demo` nos contracts; endpoints reais continuam `real`.
- Adicionados `server/src/boot-check.js` e `server/src/self-test-live.js`.
- CI recebeu job `vision-boot-check` para validar Node 20, boot HTTP, contracts, métricas reais, SSE e polling.
- Node fixado como `>=20.0.0 <21.0.0`.

## Validação local executada neste ambiente

```txt
node --check server/src/routes/index.js
node --check server/src/services/missionRunner.js
node --check server/src/services/passGoldEngine.js
node --check server/src/services/commandRunner.js
node --check web/assets/v233-realtime.js
node --check server/src/boot-check.js
node --check server/src/self-test-live.js
```

## Observação

Não rodei `npm ci`, `boot-check` ou `self-test-live` completos porque o pacote enviado não contém `node_modules` e este ambiente não deve depender de instalação externa. O CI incluído executa esses passos com Node 20.

## V2.3.4 Docker/Bootstrap Hardening Addendum

Adicionado nesta revisão:

1. `Dockerfile` com runtime Node 20 fixo.
2. `docker-compose.yml` com Redis 7 + API Vision Core.
3. `bootstrap.ps1` para Windows: sobe containers, aguarda healthcheck, roda boot-check e valida SSE/polling.
4. `server/scripts/docker-healthcheck.js` para healthcheck nativo sem curl.
5. `server/src/postinstall-sddf.js` executado automaticamente no `npm ci` do servidor.
6. `server/package.json` agora contém `postinstall`, `healthcheck`, `boot-check` e `self-test:live`.
7. `package.json` raiz ganhou comandos Docker e bootstrap.

### Comando Windows recomendado

```powershell
powershell -ExecutionPolicy Bypass -File .\bootstrap.ps1 -Rebuild
```

### Regra operacional

Sem Node 20, boot-check e healthcheck válidos, o ambiente deve falhar cedo. O live self-test valida `/api/missions/run-live`, `/stream` e `/poll`.
