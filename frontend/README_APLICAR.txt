VISION CORE V2.9.10 FRONT corrigido para V3.1 API GATEWAY

Gateway:
https://visioncore-api-gateway.weiganlight.workers.dev

Arquivos:
- index.html
- _redirects

Aplicar:
1. Copie index.html para:
   C:\Users\imadechumbo\Desktop\vision-core\frontend\index.html

2. Copie _redirects para:
   C:\Users\imadechumbo\Desktop\vision-core\frontend\_redirects

3. Redeploy:
   cd C:\Users\imadechumbo\Desktop\vision-core\frontend
   npx wrangler pages deploy . --project-name visioncoreai --commit-dirty=true

Resultado:
Frontend → Worker Gateway → Elastic Beanstalk
Sem proxy /api via _redirects.
