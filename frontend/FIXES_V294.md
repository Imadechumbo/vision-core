# Correções de Conexão Frontend ↔ Backend — v2.9.4

## O que foi alterado

### index.html
- `window.RUNTIME_CONFIG.API_BASE_URL` agora usa `"/"` como padrão (modo proxy Cloudflare)
- `<meta name="vision-api-base" content="/">` atualizado

### assets/v294-runtime-ultra.js
- `rewriteUrl()` agora detecta modo proxy (base = "/") e mantém chamadas relativas
- Evita que o runtime substitua chamadas relativas por URLs absolutas do fallback

## O que foi removido

### backend: .platform/nginx/conf.d/elasticbeanstalk/00_vision_ultra_cors.conf
- Removido para evitar headers CORS duplicados (Nginx + Express)
- O Express (security.js) já trata CORS corretamente

## Como funciona agora

```
Browser → /api/run-live
  ↓ (Cloudflare Pages _redirects proxy)
EB: tngh-aws-final-v2-env.eba-fi8g5gme.us-east-1.elasticbeanstalk.com/api/run-live
  ↓ (Express responde com CORS headers corretos — apenas 1x)
Browser recebe resposta ✓
```

## Para mudar de modo (CORS direto sem proxy)
Se preferir chamar o EB diretamente sem proxy:
1. Restaure `API_BASE_URL` com a URL completa do EB ou seu domínio
2. Delete ou esvazie o `_redirects`
3. O CORS do Express já aceita as origens configuradas em ALLOWED_ORIGINS
