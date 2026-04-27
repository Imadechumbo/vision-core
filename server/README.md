# VISION CORE SERVER V2.3.4 STABLE

Motor universal de correção autônoma de software. Backend próprio, independente do TechNetGame.

## Início rápido

```bash
npm install
cp .env.example .env   # editar com suas chaves (só GROQ_API_KEY é obrigatória)
npm run self-test      # validar integridade antes de subir
npm start
```

O banco SQLite é criado automaticamente em `.vault/vision_core.db`.

## Self-test (8 verificações)

```bash
npm run self-test
# ou via HTTP depois de subir:
GET http://localhost:8787/api/runtime/self-test
```

Valida: imports críticos · SQLite write/read · patch em arquivo temporário · snapshot no banco · rollback restaura original · PASS GOLD server-side · Hermes fallback sem chave LLM.

**O servidor só deve receber missões reais depois de passar no self-test.**

## Changelog V2.3.4

- ✔ `githubService.js` separado — import fatal em `missionRunner.js` corrigido
- ✔ `logCollector.js` limpo — GitHub removido, só logs e adapters
- ✔ `patchEngine.js` — patches marcados como `applied=1` no SQLite após aplicar
- ✔ rollback corrigido — restaura do banco (fonte de verdade), sem no-op
- ✔ `self-test.js` — 8 testes locais sem LLM
- ✔ `GET /api/runtime/self-test` — endpoint HTTP do self-test

## Endpoints

### Health
```
GET  /api/health
```

### Projetos
```
GET  /api/projects
POST /api/projects          { id, name, stack, path, health_url, adapter, config }
GET  /api/projects/:id
GET  /api/projects/:id/health
DELETE /api/projects/:id
```

### Missões (fluxo principal)
```
POST /api/missions/run      { project_id, error, log_path?, force_squad?, force_high_risk? }
GET  /api/missions
GET  /api/missions/:id
GET  /api/missions/:id/timeline
GET  /api/missions/:id/patches
GET  /api/missions/project/:projectId
```

### Vault / Snapshot / Rollback
```
GET  /api/vault/snapshots
GET  /api/vault/snapshots/:missionId
POST /api/vault/rollback    { mission_id }
```

### PASS GOLD (calculado no servidor)
```
GET  /api/pass-gold/:missionId
POST /api/pass-gold/evaluate   { mission_id }
```

### GitHub
```
GET  /api/github/status
```

### Workers
```
GET  /api/workers/status
POST /api/workers/enqueue   { project_id, type, payload }
```

### Runtime / Logs
```
GET  /api/runtime/status
GET  /api/hermes/memory
```

## Registrar TechNetGame

```bash
curl -X POST http://localhost:8787/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "id": "technetgame",
    "name": "TechNetGame",
    "stack": "node_express_static_front",
    "path": "C:/Users/imadechumbo/Desktop/technetgamev2-main/backend",
    "health_url": "https://api.technetgame.com.br/api/health",
    "adapter": "technetgame"
  }'
```

## Enviar missão

```bash
curl -X POST http://localhost:8787/api/missions/run \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "technetgame",
    "error": "Cannot read properties of null (reading '\''mimetype'\'')"
  }'
```

## Fluxo real da missão

```
1.  Carregar projeto do banco
2.  Coletar logs reais (arquivo/PM2/Docker)
3.  Hermes RCA ou OpenClaw Squad (se erro complexo)
4.  Confidence Gate (< 60% → requires_review)
5.  Risk Gate (high → aguarda aprovação)
6.  Criar snapshots de todos os arquivos afetados
7.  Aplicar patches (transacional — rollback automático se falhar)
8.  Validar sintaxe (node --check) + testes (npm test)
9.  PASS GOLD calculado no servidor (nunca pelo frontend)
10. Criar PR no GitHub (se GOLD + AUTO_PR=true)
11. Rollback automático se validação falhar
12. Salvar tudo no SQLite
13. Retornar resultado completo
```

## PASS GOLD — Critérios do servidor

| Dimensão           | Peso | O que mede                          |
|--------------------|------|-------------------------------------|
| LLM Confidence     | 30%  | Confiança retornada pelo Hermes     |
| Data Quality       | 15%  | Logs reais presentes?               |
| Patch Specificity  | 20%  | Patches com localização exata?      |
| Risk Level         | 15%  | low=90 / medium=65 / high=30        |
| Build Passed       | 10%  | node --check passou?                |
| Snapshot Exists    | 10%  | Rollback disponível?                |

**Gates obrigatórios para GOLD:** build passou + snapshot existe + confiança ≥ 60% + risco não é high.

## Estrutura de arquivos

```
src/
  server.js          ← entry point, migração automática, worker loop
  app.js             ← Express configurado (CORS, helmet, rate limit)
  routes/index.js    ← todos os endpoints
  services/
    missionRunner.js   ← orquestra os 13 passos
    hermesRca.js       ← cliente LLM multi-provider
    openclawSquad.js   ← agentes paralelos para casos complexos
    patchEngine.js     ← multi-patch transacional + rollback
    passGoldEngine.js  ← PASS GOLD calculado no servidor
    logCollector.js    ← coleta logs + GitHub service + adapters
  db/
    sqlite.js          ← conexão + helpers prepared statements
    schema.sql         ← schema completo
    migrate.js         ← script de migração standalone
```
