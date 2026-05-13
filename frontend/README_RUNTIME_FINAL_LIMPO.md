# VISION CORE Front V2.3.6 — Runtime Final Limpo

Correções aplicadas:
- Adicionado helper `el(id)` em `assets/v233-realtime.js` para remover `ReferenceError: el is not defined`.
- API base agora não cai em `visioncoreai.pages.dev` quando está no Cloudflare Pages; fallback aponta para o backend Elastic Beanstalk.
- Runtime alinhado ao backend V2.3.9: `/api/run-live` e `/api/run-live-stream`.
- `safeFetchJson/api()` com fallback automático POST → GET quando o backend responder 405.
- Parse JSON blindado: resposta vazia/HTML não quebra o painel.
- UI V2.3.6 preservada.

Backend alvo padrão:
`https://Tngh-aws-final-v2-env.eba-fi8g5gme.us-east-1.elasticbeanstalk.com`

Para mudar, defina antes dos scripts:
```html
<script>window.RUNTIME_CONFIG={API_BASE_URL:'https://SEU_BACKEND'};</script>
```
