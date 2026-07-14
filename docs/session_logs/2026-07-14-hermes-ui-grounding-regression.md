# Chat real — regressão do grounding do Hermes

## Causa raiz

A UI Next envia a pergunta para `https://visioncore-api-gateway.weiganlight.workers.dev/api/chat` com `mode: "vision-geral"`, `model: "auto"` e `display_input`. Esse payload ativa o mesmo branch testado diretamente. A frase exata `sobre o fine tuning do hermes no vision core?` casa com o detector `fine[\s-]?tun`.

O Worker não armazena respostas: a resposta observada trouxe `CF-Cache-Status: DYNAMIC` e `Cache-Control: no-store`, e o código do Gateway força `no-store`.

O EB estava em `v115-712cf4dd227ffa20294befccb2129a1853ec2612`, publicado depois do deploy especial `v5.9.64b`. O `server.js` de `v115` continha o detector, mas o workflow genérico copiava somente `docs/spec-library`; `docs/HERMES_FINE_TUNING_DATASET.md` não entrava no ZIP. O `catch` registrava warning e seguia com `groundingAddendum` vazio, reabrindo a alucinação.

## Evidência ao vivo antes da correção

- POST com a frase exata pelo Gateway: resposta inventou `confidence_threshold`, `max_depth`, `penalty_overfit` e métricas inexistentes.
- Mesmo POST direto no EB: resposta inventou `hermes-large-v2`, `config/hermes.yaml`, `evidence_cache_enabled` e outros contratos inexistentes.
- Navegação pela UI pública, preenchendo o composer e clicando Executar: resposta inventou `learning_rate`, `epochs`, `batch_size` e um diff de configuração.

## Correção

- `.github/workflows/deploy-backend-eb.yml`: mudanças no documento agora disparam o workflow; o arquivo é copiado para `backend/docs/` e sua presença é verificada dentro de `deploy.zip`.
- `backend/server.js`: ausência do documento retorna `503 hermes_grounding_unavailable`, com mensagem honesta e `anti_stub: true`; a LLM não é chamada sem grounding.
- `tools/tests/chat-grounding-contract.test.mjs`: regressão permanente cobrindo frase exata, payload real da UI, Gateway sem cache, empacotamento e fail-closed.

## Validação

- `node --check backend/server.js`: PASS.
- `npm run test:chat-grounding-unit`: PASS.
- Suíte Next: 114/114 PASS em 1,4 min.
- `npm run test:quick`: avançou até `test:local-launcher-unit`, onde parou por `unsettled top-level await`, falha preexistente de Node 24 já registrada e não relacionada ao patch.

## Deploy e confirmação ponta a ponta

- Versão EB: `v116-a8189457-hermes-grounding`, estado final `Ready/Green`.
- Gateway com a frase exata: HTTP 200, `CF-Cache-Status: DYNAMIC`, `Cache-Control: no-store`; resposta informa honestamente que nenhum treinamento foi implementado e não contém as invenções reportadas.
- UI pública: página aberta no navegador, pergunta digitada no composer e enviada pelo botão Executar. Resposta cita apenas os artefatos reais do dataset e diz explicitamente que não há job/comando de treinamento.
- Screenshot: `artifacts/hermes-ui-grounded-v116.png`.
