# Vision Core — Stress Test ARCH (Agente Arquiteto) Results

**Data:** 2026-06-13T12:27:58.498Z
**Resultado:** 16/16 PASS automáticos (100%) — 3 MANUAL pendentes

## Cenários

| ID | Categoria | Descrição | Status | Tempo | Conf | Provider |
|---|---|---|---|---|---|---|
| ARCH-01 | CAT-1 | Leigo: "quero um site para minha padaria" | ✅ PASS | 2810ms | 75% | cerebras |
| ARCH-02 | CAT-1 | Técnico: API REST Python FastAPI + PostgreSQL + JWT | ✅ PASS | 19749ms | 95% | openrouter |
| ARCH-03 | CAT-1 | Semi-leigo: "aquele negócio de loja online com botão de comprar" | ✅ PASS | 15523ms | 60% | openrouter |
| ARCH-04 | CAT-1 | Técnico: migração monolito Node para microsserviços com message queue | ✅ PASS | 13775ms | 85% | openrouter |
| ARCH-05 | CAT-2 | Vago: "quero um app" → baixa confiança + perguntas + sem specs | ✅ PASS | 6197ms | 30% | openrouter |
| ARCH-06 | CAT-2 | Mínimo: "oi" → confiança muito baixa + perguntas | ✅ PASS | 2823ms | 30% | openrouter |
| ARCH-07 | CAT-2 | Ambíguo: "quero algo parecido com o que fizeram para outro cliente" | ✅ PASS | 10862ms | 35% | openrouter |
| ARCH-08 | CAT-3 | SaaS fullstack Node+React → specs SF-01 | ✅ PASS | 4450ms | 90% | openrouter |
| ARCH-09 | CAT-3 | CLI utilitário: "ferramenta de linha de comando para renomear arquivos" | ✅ PASS | 3516ms | 85% | openrouter |
| ARCH-10 | CAT-3 | Dashboard admin: "gerenciar usuários e relatórios" | ✅ PASS | 6401ms | 75% | openrouter |
| ARCH-11 | CAT-3 | Billing: "SaaS com assinatura mensal e pagamento recorrente" | ✅ PASS | 4552ms | 85% | openrouter |
| ARCH-12 | CAT-3 | Segurança: "sistema seguro contra invasão e vazamento de dados" | ✅ PASS | 7520ms | 55% | openrouter |
| ARCH-13 | CAT-4 | Fallback título: "agendamento para salão de beleza" | ✅ PASS | 4539ms | 73% | cerebras |
| ARCH-14 | CAT-5 | Manual: clicar spec sugerida → módulo SF correto ativa + highlight | 🔲 MANUAL | — | — | — |
| ARCH-15 | CAT-5 | Manual: "Pacote Completo" → cards de stack com ícone+label+tooltip | 🔲 MANUAL | — | — | — |
| ARCH-16 | CAT-5 | Manual: "Enviar para SF-03" → módulo muda, Arquiteto desativa, textarea populado | 🔲 MANUAL | — | — | — |
| ARCH-17 | CAT-6 | Erro: { message: "" } → status 400, error=message_required | ✅ PASS | 148ms | — | — |
| ARCH-18 | CAT-6 | Erro: { message: "a".repeat(4001) } → status 400, error=message_too_long | ✅ PASS | 147ms | — | — |
| ARCH-19 | CAT-6 | Erro: {} sem campo message → status 400, error presente | ✅ PASS | 148ms | — | — |

## Checks por cenário

**ARCH-01:** ✅ PASS
  - ✓ confidence in [0.55, 0.92]
  - ✓ stack has frontend tag
  - ✓ explanation not empty
  - ✓ status 2xx

**ARCH-02:** ✅ PASS
  - ✓ confidence >= 0.75
  - ✓ stack has python+db+auth groups
  - ✓ specs_suggested not empty
  - ✓ status 2xx

**ARCH-03:** ✅ PASS
  - ✓ confidence in [0.40, 0.85]
  - ✓ stack suggests ecommerce/billing or webapp
  - ✓ status 2xx

**ARCH-04:** ✅ PASS
  - ✓ tags contain microservices or node-js
  - ✓ specs_suggested not empty
  - ✓ status 2xx

**ARCH-05:** ✅ PASS
  - ✓ confidence < 0.65
  - ✓ open_questions >= 2
  - ✓ specs vazio (confiança baixa)
  - ✓ status 2xx

**ARCH-06:** ✅ PASS
  - ✓ confidence < 0.55
  - ✓ open_questions > 0
  - ✓ status 2xx

**ARCH-07:** ✅ PASS
  - ✓ confidence < 0.72
  - ✓ open_questions > 0
  - ✓ status 2xx

**ARCH-08:** ✅ PASS
  - ✓ specs_suggested has SF-01-xxx
  - ✓ stack has saas/node/react
  - ✓ status 2xx

**ARCH-09:** ✅ PASS
  - ✓ tags contain cli-utility or backend lang
  - ✓ status 2xx

**ARCH-10:** ✅ PASS
  - ✓ tags contain dashboard-admin or auth
  - ✓ status 2xx

**ARCH-11:** ✅ PASS
  - ✓ tags contain billing-enabled or stripe
  - ✓ status 2xx

**ARCH-12:** ✅ PASS
  - ✓ tags contain security or auth
  - ✓ status 2xx

**ARCH-13:** ✅ PASS
  - ✓ specs not empty OR confidence < 0.60 (fallback ok)
  - ✓ status 2xx

**ARCH-17:** ✅ PASS
  - ✓ status == 400
  - ✓ error field present
  - ✓ error="message_required"

**ARCH-18:** ✅ PASS
  - ✓ status == 400
  - ✓ error field present
  - ✓ error="message_too_long"

**ARCH-19:** ✅ PASS
  - ✓ status == 400
  - ✓ error field present
