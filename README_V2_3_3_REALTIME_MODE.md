# VISION CORE V2.3.4 — REAL-TIME MODE

Patch preserva o layout escolhido no print 1 e adiciona execução viva com SSE.

## Mantido
- Layout base do print 1.
- Olho pequeno no canto superior esquerdo.
- Fundo preto/roxo.
- Campo de missão/chat cinza.
- Sidebar, right rail, timeline e logs no mesmo desenho.

## Adicionado
- `POST /api/missions/run-live`
  - Retorna `mission_id` imediatamente.
  - Executa `runMission()` em background.
  - Usa `options.mission_id` para amarrar execução, polling e SSE.
- `GET /api/missions/:id/stream`
  - Agora aceita conexão antes da missão aparecer no banco.
  - Evita 404 no pré-connect da UI.
- Frontend `assets/v233-realtime.js`
  - Substitui o clique do botão executar por execução live.
  - Conecta `EventSource` em `/api/missions/:id/stream`.
  - Fallback automático para polling.
  - Atualiza logs, timeline, core/orb e runtime monitor.
- Frontend `assets/v233-realtime.css`
  - Animação leve do olho/orb conforme estado: running, gold, fail.
  - Restaura botões e menus nas cores preto/roxo + botão agent verde/ciano.
  - Mantém chat cinza.

## Regra mantida
Sem PASS GOLD continua sem promoção, sem PR e sem aprendizado validado.

## Validação técnica executada
- `node --check server/src/routes/index.js`
- `node --check server/src/services/missionRunner.js`
- `node --check web/assets/v233-realtime.js`

