# VISION CORE V2.9.9 FRONTEND FINAL FIXED

Correção final de frontend para 405 em `/api/copilot`.

## O que faz
- Intercepta botões de envio antes dos scripts antigos.
- Bloqueia submit GET acidental.
- Força POST JSON.
- Corrige `/api/api`.
- Usa proxy `/api/*`.
- Se Cloudflare responder 405/HTML, faz fallback direto para EB:
  https://tngh-aws-final-v2-env.eba-fi8g5gme.us-east-1.elasticbeanstalk.com

## Deploy
```powershell
cd frontend
npx wrangler pages deploy . --project-name visioncoreai --commit-dirty=true
```

Depois limpar cache do navegador e Cloudflare.
