# Vision Agent Local

Ponte entre o **Vision Core** e projetos no seu PC.

## Como usar

```bash
# Rodar no projeto atual
node index.js

# Rodar em um projeto específico
node index.js C:\meu-projeto

# Com token (para auth futura)
VC_TOKEN=<token-do-vision-core> node index.js C:\meu-projeto
```

## Endpoints locais (porta 7070)

```
GET  http://localhost:7070/        → health check
POST http://localhost:7070/run     → executar missão local direta
```

Exemplo de missão local direta:
```bash
curl -X POST http://localhost:7070/run \
  -H "Content-Type: application/json" \
  -d '{"input":"onde está o bug de CORS no projeto?","type":"debug"}'
```

## Variáveis de ambiente

| Var | Padrão | Descrição |
|-----|--------|-----------|
| `VC_WORKER` | URL do worker prod | Worker URL |
| `VC_TOKEN` | `` | Bearer token |
| `VC_POLL_MS` | `3000` | Intervalo de polling |
| `VC_PORT` | `7070` | Porta do health server |

## Como funciona

1. Faz polling em `/api/agent/mission/pending` no worker
2. Ao receber missão: escaneia o projeto local, encontra arquivos relevantes
3. Retorna resultado em `/api/agent/mission/result`
4. Também aceita missões diretas via POST `/run` (sem worker)
