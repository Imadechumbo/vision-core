# VISION CORE Front V2.9.4 ULTRA

- Runtime resolver exige `/api/health` JSON real; não aceita HTML 200 de Pages como API.
- Reescreve chamadas antigas para `api.technetgame.com.br` usando a API ativa.
- Remove `credentials: include` por padrão para evitar incompatibilidade CORS.
- Patch de `fetch` e `EventSource` aplicado antes das chamadas do dashboard.

Deploy: suba este ZIP no Cloudflare Pages.
