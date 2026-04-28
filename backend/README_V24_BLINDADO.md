# VISION CORE Backend V2.4 Blindado CORS/SSE

Corrige CORS entre Cloudflare Pages e Elastic Beanstalk.

## Origens liberadas
- https://visioncoreai.pages.dev
- https://visioncore.technetgame.com.br
- https://technetgame.com.br
- https://www.technetgame.com.br
- localhost para desenvolvimento
- previews Cloudflare Pages *.visioncoreai.pages.dev

## Endpoints oficiais
- GET /api/health
- GET /api/version
- POST /api/run-live
- GET /api/run-live-stream

## Aliases compatíveis
- /api/missions/run-live
- /api/workers/enqueue
- /api/missions/run-live-stream

## Variáveis recomendadas no Elastic Beanstalk
NODE_ENV=production
FRONTEND_URL=https://visioncore.technetgame.com.br
API_BASE_URL=https://api.technetgame.com.br
ALLOWED_ORIGINS=https://visioncoreai.pages.dev,https://visioncore.technetgame.com.br,https://technetgame.com.br,https://www.technetgame.com.br

## Teste
curl -i https://api.technetgame.com.br/api/health
curl -i -X OPTIONS https://api.technetgame.com.br/api/run-live -H "Origin: https://visioncoreai.pages.dev" -H "Access-Control-Request-Method: POST"

O OPTIONS deve retornar 204 com Access-Control-Allow-Origin.
