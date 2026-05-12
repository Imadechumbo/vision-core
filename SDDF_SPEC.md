# VISION CORE V8.4 — SDDF CLEAN SPEC BASELINE

Esta SPEC é vinculante para impedir regressões de runtime duplicado, scripts legados, CORS instável, PASS GOLD falso e SSE sem contrato final.

## 1. Frontend — runtime único

`frontend/index.html` é o shell visual e não pode voltar a controlar a execução diretamente. Ele deve carregar somente estes scripts de runtime/comando:

1. `assets/v23-ui-system.js`
2. `assets/v231-backend-agents.js`
3. `assets/vision-runtime-owner.js`
4. `assets/vision-ui-command.js`

`frontend/index.html` não pode conter os marcadores legados abaixo:

- `executeBtn.onclick`
- `new EventSource`
- `RUN_PATH`
- `STREAM_PATH`
- `vision-runtime-v297`
- `vision-v297-interactions`
- `vision-v298-command-chat.js`
- `vision-v299`
- `vision-v2910`
- `vision-v32`
- `vision-v34`
- `vision-v35`
- `vision-v44`

## 2. Frontend — owner de execução

`frontend/assets/vision-runtime-owner.js` é o único owner do botão `executeBtn` e deve:

- controlar `executeBtn` via listener único;
- chamar `POST /api/run-live`;
- abrir SSE em `/api/run-live-stream` usando apenas `mission_id` na query string;
- nunca colocar texto da missão na URL do SSE;
- liberar lock em eventos `done`, `fail` e `error`;
- acumular evidência recebida do SSE em `window.__VISION_SSE_EVIDENCE__`.

## 3. Worker — gateway e contrato SSE

`worker/src/index.js` deve:

- aplicar CORS dinâmico para `https://*.visioncoreai.pages.dev` e `https://visioncoreai.pages.dev`;
- responder `OPTIONS` com HTTP `204`;
- preservar as rotas existentes;
- implementar `POST /api/run-live` sem conceder PASS GOLD no stub;
- implementar SSE em `/api/run-live-stream` com eventos `open`, `step`, `gate` e `done`;
- retornar `pass_gold:false` quando a evidência for insuficiente;
- nunca retornar `promotion_allowed:true` em stub.

## 4. PASS GOLD

`/api/pass-gold/score` não pode retornar `GOLD` quando não houver evidência real. Sem evidência suficiente, o retorno obrigatório é bloqueante:

- `status: "INSUFFICIENT_EVIDENCE"` ou equivalente não-GOLD;
- `pass_gold: false`;
- `promotion_allowed: false`.

## 5. Guard obrigatório

O comando abaixo é obrigatório antes de mudanças que toquem runtime, frontend shell ou gateway:

```bash
node tools/sddf-guard.mjs
```

O guard deve falhar se qualquer regra desta SPEC for violada.
