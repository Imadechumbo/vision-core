# VISION CORE FRONT V2.3.6 alinhado com BACKEND V2.3.9

Correções aplicadas:

- EXECUTAR LIVE usa `POST /api/run-live`.
- SSE usa `GET /api/run-live-stream`.
- Removidas chamadas críticas antigas para `/api/missions/run-live` e `/api/workers/enqueue`.
- Parse JSON blindado para evitar `Unexpected end of JSON input`.
- Poll fallback agora lê `/api/mission/:id` e aceita `mission.timeline`.
- UI V2.3.6 preservada, sem redesign.

Configuração obrigatória no Cloudflare Pages:

```html
<script>
window.RUNTIME_CONFIG = {
  API_BASE_URL: "https://SEU_BACKEND_ELASTIC_BEANSTALK"
};
</script>
```

Teste esperado:

1. Abrir dashboard.
2. Selecionar projeto.
3. Clicar EXECUTAR LIVE.
4. Ver logs sem 405 e timeline animando.
