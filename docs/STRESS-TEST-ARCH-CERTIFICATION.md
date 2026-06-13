# Vision Core — Stress Test ARCH Certification

**Data:** 2026-06-13T12:27:58.498Z
**Versão:** ARCH-V1.0
**Resultado:** 16/16 PASS automáticos (100%) — 3 manuais pendentes
**Status:** ✅ CERTIFIED

## Certification Summary

Stress Test do Agente Arquiteto executado contra o endpoint de produção (`/api/architect/interpret` via Cloudflare Worker). O teste valida interpretação de linguagem livre, calibração de confiança, cobertura da Spec Library (120 specs), fallback por título, e robustez de input.

## Cenários Certificados

| Categoria | ID | Descrição | Status | Conf | Specs | Provider |
|---|---|---|---|---|---|---|
| CAT-1 | ARCH-01 | Leigo: "quero um site para minha padaria" | ✅ PASS | 75% | 8 | cerebras |
| CAT-1 | ARCH-02 | Técnico: API REST Python FastAPI + PostgreSQL + JWT | ✅ PASS | 95% | 6 | openrouter |
| CAT-1 | ARCH-03 | Semi-leigo: "aquele negócio de loja online com botão de comprar" | ✅ PASS | 60% | 8 | openrouter |
| CAT-1 | ARCH-04 | Técnico: migração monolito Node para microsserviços com message queue | ✅ PASS | 85% | 4 | openrouter |
| CAT-2 | ARCH-05 | Vago: "quero um app" → baixa confiança + perguntas + sem specs | ✅ PASS | 30% | 0 | openrouter |
| CAT-2 | ARCH-06 | Mínimo: "oi" → confiança muito baixa + perguntas | ✅ PASS | 30% | 0 | openrouter |
| CAT-2 | ARCH-07 | Ambíguo: "quero algo parecido com o que fizeram para outro cliente" | ✅ PASS | 35% | 0 | openrouter |
| CAT-3 | ARCH-08 | SaaS fullstack Node+React → specs SF-01 | ✅ PASS | 90% | 5 | openrouter |
| CAT-3 | ARCH-09 | CLI utilitário: "ferramenta de linha de comando para renomear arquivos" | ✅ PASS | 85% | 8 | openrouter |
| CAT-3 | ARCH-10 | Dashboard admin: "gerenciar usuários e relatórios" | ✅ PASS | 75% | 8 | openrouter |
| CAT-3 | ARCH-11 | Billing: "SaaS com assinatura mensal e pagamento recorrente" | ✅ PASS | 85% | 4 | openrouter |
| CAT-3 | ARCH-12 | Segurança: "sistema seguro contra invasão e vazamento de dados" | ✅ PASS | 55% | 0 | openrouter |
| CAT-4 | ARCH-13 | Fallback título: "agendamento para salão de beleza" | ✅ PASS | 73% | 8 | cerebras |
| CAT-5 | ARCH-14 | Manual: clicar spec sugerida → módulo SF correto ativa + highlight | 🔲 MANUAL | — | — | — |
| CAT-5 | ARCH-15 | Manual: "Pacote Completo" → cards de stack com ícone+label+tooltip | 🔲 MANUAL | — | — | — |
| CAT-5 | ARCH-16 | Manual: "Enviar para SF-03" → módulo muda, Arquiteto desativa, textarea populado | 🔲 MANUAL | — | — | — |
| CAT-6 | ARCH-17 | Erro: { message: "" } → status 400, error=message_required | ✅ PASS | — | 0 | — |
| CAT-6 | ARCH-18 | Erro: { message: "a".repeat(4001) } → status 400, error=message_too_long | ✅ PASS | — | 0 | — |
| CAT-6 | ARCH-19 | Erro: {} sem campo message → status 400, error presente | ✅ PASS | — | 0 | — |

## Coverage

| Área | Status |
|---|---|
| Leigo vs Técnico (CAT-1) | 4/4 PASS |
| Confidence Gating (CAT-2) | 3/3 PASS |
| Cobertura Spec Library (CAT-3) | 5/5 PASS |
| Fallback por título (CAT-4) | 1/1 PASS |
| Robustez / validação (CAT-6) | 3/3 PASS |
| Frontend/E2E (CAT-5) | 🔲 MANUAL — ver checklist abaixo |

## ✅ Gates Validados

- Interpretação de linguagem livre (leigo e técnico) com confidence score
- Confidence Gating: perguntas geradas automaticamente quando confiança < limiar
- Matching automático contra Spec Library (120 specs, SF-01 a SF-09 + SEC + INT + LLM)
- Fallback por título quando matching por tag não encontra resultado
- Validação de input: mensagem vazia / muito longa / ausente → 400 com error code

## 🔲 Checklist Manual — Frontend/E2E

Execute no browser em http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com após enviar "quero um SaaS de gestão de projetos com Node.js" no modo 🏛️ Arquiteto:

### ARCH-14 — Spec sugerida clicável → módulo SF correto
- [ ] Specs sugeridas aparecem no painel Arquiteto com indicador "→ SF-0X"
- [ ] Clicar numa spec ativa o módulo SF correspondente (setSoftwareFactoryModule)
- [ ] Spec específica fica destacada (highlight azul) e scrollada até a view
- [ ] **Resultado:** [ ] PASS  [ ] FAIL  — Observação: _______________

### ARCH-15 — Pacote Completo: cards de stack com ícone+label+tooltip
- [ ] Botão "📦 VER CONFIGURAÇÃO COMPLETA SUGERIDA" aparece (confidence >= 0.6)
- [ ] Ao expandir, cards de stack mostram ícone + label legível (ex: 🖥️ Backend Node.js)
- [ ] Nenhum card mostra ⚙️ genérico para tags comuns (node-js, react, auth, database)
- [ ] Tooltip (hover) mostra explicação em português
- [ ] **Resultado:** [ ] PASS  [ ] FAIL  — Observação: _______________

### ARCH-16 — "Enviar para SF-03" → navegação + textarea populado
- [ ] Clicar "➡️ ENVIAR PARA COMPOSITOR DE MISSÃO (SF-03)" muda para módulo SF-03
- [ ] Modo Arquiteto é desativado automaticamente
- [ ] Textarea (#vcSfChatInput) é populado com resumo estruturado (Projeto / Stack / Specs)
- [ ] Focus vai para o textarea (scroll até ele)
- [ ] Mensagem NÃO é enviada automaticamente — usuário controla
- [ ] **Resultado:** [ ] PASS  [ ] FAIL  — Observação: _______________

## Gaps Identificados

Nenhum gap nos cenários automatizados.


## Performance

- **Endpoint:** http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com/api/architect/interpret
- **Timeout por cenário:** 45s
- **Retry:** 3 tentativas em 502/503 (§70)
- **Provider chain:** Groq → Cerebras → Gemini (fallback)
