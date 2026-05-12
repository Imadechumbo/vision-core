# VISION CORE V2.9.10 CLEAN FRONT

Runtime único limpo para encerrar conflitos de v297/v298/v299.

## Correções
- Neutraliza runtimes legados conflitantes.
- Centraliza chamadas em `assets/vision-v2910-clean-runtime.js`.
- Remove `/api/api`.
- Bloqueia `/api/https://`.
- Remove `localhost` hardcoded.
- Mantém UI existente.
- Mantém Cloudflare Pages proxy:
  `/api/* -> https://tngh-aws-final-v2-env.eba-fi8g5gme.us-east-1.elasticbeanstalk.com/api/:splat`

## Deploy

```powershell
cd C:\Users\imadechumbo\Desktop\vision-core\frontend
npx wrangler pages deploy . --project-name visioncoreai --commit-dirty=true
```

Depois:
Cloudflare -> Caching -> Purge Everything

## Teste

```js
fetch('/api/copilot', {
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({message:'teste'})
}).then(r=>r.json()).then(console.log)
```

## Scan local
[FOUND] /api/api :: README_V298_FINAL_HARDENED.md
[FOUND] api.technetgame.com.br :: README_V294_FRONT.md
[FOUND] /api/api :: README_V298_FIX2.md
[FOUND] /api/api :: README_V299_HOTFIX.md
[FOUND] /api/api :: README_V299_FRONTEND_FINAL_FIXED.md
[FOUND] /api/https :: assets/vision-v2910-clean-runtime.js
[FOUND] /api/http :: assets/vision-v2910-clean-runtime.js
[FOUND] /api/api :: assets/vision-v2910-clean-runtime.js
[FOUND] localhost: :: assets/vision-v2910-clean-runtime.js
