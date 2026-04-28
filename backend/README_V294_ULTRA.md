# VISION CORE V2.9.4 ULTRA

Correção de produção para CORS persistente e SSE.

- CORS fail-open diagnóstico: nunca omite `Access-Control-Allow-Origin`.
- `Origin: null` tratado como público sem credenciais.
- Preflight `OPTIONS` blindado.
- SSE com headers reforçados.
- Nginx safety-net para respostas de proxy/erro.
- Endpoint diagnóstico: `/api/cors/ultra`.
- Versão interna: `2.9.4-ultra`.

Validação:

```bash
curl -i https://api.technetgame.com.br/api/health
curl -i -H "Origin: https://visioncoreai.pages.dev" https://api.technetgame.com.br/api/cors/ultra
```
