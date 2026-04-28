# VISION CORE Backend V2.3.9 Complete EB SSE

Deploy no Elastic Beanstalk: compacte os arquivos da raiz deste diretório, não a pasta por cima.

Testes:

```bash
curl http://SEU_EB/api/version
curl http://SEU_EB/api/health
curl -N "http://SEU_EB/api/run-live-stream?input=corrigir%20erro%20CORS"
curl -X POST http://SEU_EB/api/run-live -H "Content-Type: application/json" -d '{"input":"corrigir erro CORS"}'
```

Rotas compatíveis: `/api/*` e aliases sem `/api`.
