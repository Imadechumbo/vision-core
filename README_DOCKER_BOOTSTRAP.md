# VISION CORE V2.3.4 — Docker + Bootstrap

## Objetivo

Executar o VISION CORE com ambiente reproduzível:

- Node 20 fixo
- Redis 7
- API em `http://localhost:8787`
- healthcheck automático
- validação SDDF no `postinstall`
- self-test real de SSE + polling

## Windows — 1 comando

```powershell
powershell -ExecutionPolicy Bypass -File .\bootstrap.ps1 -Rebuild
```

Para pular o teste SSE/polling:

```powershell
powershell -ExecutionPolicy Bypass -File .\bootstrap.ps1 -Rebuild -SkipLiveSelfTest
```

## Docker manual

```bash
docker compose up -d --build
docker compose logs -f api
```

## Healthcheck

```bash
curl http://localhost:8787/api/health
```

Sem curl:

```bash
docker compose exec api npm run healthcheck
```

## Validações internas

```bash
docker compose exec api npm run boot-check
docker compose exec api npm run self-test:live
```

## Postinstall SDDF

Ao rodar dentro de `server`:

```bash
npm ci
```

O script `postinstall` executa:

1. trava Node 20;
2. valida sintaxe de arquivos críticos;
3. sobe boot HTTP local temporário;
4. valida `/api/health`, `/api/runtime/contracts` e `/api/metrics/summary`.

Para desativar somente em emergência:

```bash
SKIP_VISION_POSTINSTALL=1 npm ci
```

No PowerShell:

```powershell
$env:SKIP_VISION_POSTINSTALL="1"; npm ci
```
