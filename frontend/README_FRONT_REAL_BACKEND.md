# VISION CORE Front conectado ao backend real

Este pacote usa proxy do Cloudflare Pages:

/api/* -> http://tngh-aws-final-v2-env.eba-fi8g5gme.us-east-1.elasticbeanstalk.com/api/*

Assim o frontend HTTPS chama /api no mesmo domínio Pages, evitando Mixed Content e CORS.

Teste:
- https://visioncoreai.pages.dev/api/health
- clicar EXECUTAR LIVE no UI
