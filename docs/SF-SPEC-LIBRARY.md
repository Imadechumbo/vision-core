# Vision Core — Software Factory Spec Library
**Versão:** V3.0.0
**Data:** 2026-06-06
**Módulos:** 9 (SF-01 a SF-09)
**Objetivo:** Biblioteca de specs para testar, validar e evoluir a Software Factory

---

## Estrutura de uma Spec

Cada spec tem:
- ID: SF-MM-NNN (módulo-número)
- Pré-condições
- Input
- Output esperado
- Critério PASS/FAIL
- Gate de segurança (se aplicável)

---

## SF-01 — Montar Projeto do Zero

### SF-01-001 HAPPY PATH — SaaS Fullstack + Node.js + Hermes Review
Pré: módulo 01 ativo
Input: tipo=SaaS Fullstack, stack=Node.js, orquestração=Hermes Review
Output esperado:
  - resumo mostra tipo/stack/orquestração corretos
  - modo = LOCAL PREVIEW
  - exec_real = BLOQUEADA
  - PASS GOLD REAL = NÃO REIVINDICADO
PASS: todos os campos corretos
FAIL: qualquer campo errado ou exec_real desbloqueada

### SF-01-002 — API Backend + Python + Full Software Factory
### SF-01-003 — Game/Indie + TypeScript + OpenSquad
### SF-01-004 — Dashboard Admin + React + Solo Agent
### SF-01-005 EDGE — tipo não selecionado → próxima ação deve bloquear
### SF-01-006 SECURITY — exec real nunca pode ser TRUE no módulo 01
### SF-01-007 — Tamanho/Risco: Prototype vs Enterprise High Risk muda modo sugerido
### SF-01-008 — Matriz de agentes: ON/AUTO/OFF persiste ao trocar tipo
### SF-01-009 — GERAR SETUP produz output com tipo+stack+orquestração corretos
### SF-01-010 — Orquestração OpenSquad ativa aviso de escala

---

## SF-02 — Templates de Projeto

### SF-02-001 HAPPY PATH — SDDF Standard gera blueprint completo
Input: template=SDDF Standard
Output: agentes Backend+DB+Auth+Frontend listados, estrutura de pastas presente
PASS: preview gerado com todos os campos

### SF-02-002 — SaaS Baseline template
### SF-02-003 — API Microservice template
### SF-02-004 — CLI Utility template
### SF-02-005 EDGE — template sem tipo selecionado no SF-01
### SF-02-006 — Blueprint inclui: stack, pastas, arquivos iniciais, agentes reserva
### SF-02-007 — Blueprint inclui: sequência de prompts, checklist validação
### SF-02-008 — Blueprint inclui: avisos de risco, ações proibidas, próxima ação segura
### SF-02-009 SECURITY — blueprint nunca inclui comandos de execução real
### SF-02-010 — Mudar template reseta preview anterior

---

## SF-03 — Compositor de Missão

### SF-03-001 HAPPY PATH — Claude Code + SaaS Fullstack gera prompt completo
Input: worker=Claude Code, seções=Contexto+Objetivo+Restrições+Stack+Contratos
Output: prompt com todas seções, COPY-READY, sem comandos proibidos
PASS: prompt ≥ 10 linhas, contém objetivo e restrições

### SF-03-002 — Worker Cursor AI gera prompt adaptado para Cursor
### SF-03-003 — Worker GitHub Copilot
### SF-03-004 — Worker Humano gera checklist em vez de prompt técnico
### SF-03-005 EDGE — seções vazias → prompt deve indicar campos faltando
### SF-03-006 SECURITY — prompt não contém comandos rm, drop, delete real
### SF-03-007 — Prompt inclui: stack, contratos SDDF, modo de orquestração
### SF-03-008 — Prompt inclui: restrições de autoridade (no_deploy, no_release)
### SF-03-009 — Diferentes combinações de seções geram outputs diferentes
### SF-03-010 — COPIAR salva o prompt correto no clipboard

---

## SF-04 — Pacotes para Workers

### SF-04-001 HAPPY PATH — Missão Completa gera pacote com contexto+contratos+arquivos
### SF-04-002 — Patch Cirúrgico gera pacote menor e focado
### SF-04-003 — Nova Feature gera pacote com spec de feature
### SF-04-004 — Revisão de Código gera checklist de revisão
### SF-04-005 EDGE — pacote sem missão composta no SF-03
### SF-04-006 SECURITY — pacote nunca inclui chaves de API ou secrets
### SF-04-007 — Pacote inclui: target worker, modo, contratos, proibições
### SF-04-008 — Pacote diferente para cada tipo de projeto
### SF-04-009 — COPIAR funciona corretamente
### SF-04-010 — Output marcado como MANUAL HANDOFF

---

## SF-05 — Preview de Criação

### SF-05-001 HAPPY PATH — preview lista arquivos esperados sem criar nada
Output: lista de arquivos, status BLOQUEADO em todas as capacidades
PASS: file_creation_allowed=false, file_write_enabled=false

### SF-05-002 — Preview diferente para cada tipo de projeto
### SF-05-003 — Preview diferente para cada template
### SF-05-004 EDGE — preview sem SF-01 e SF-02 completos
### SF-05-005 SECURITY CRÍTICO — file_creation_allowed nunca pode ser true no frontend
### SF-05-006 SECURITY CRÍTICO — frontend_file_write nunca pode ser true
### SF-05-007 SECURITY CRÍTICO — backend_write_allowed nunca pode ser true
### SF-05-008 — Labels LOCKED visíveis para todas as capacidades
### SF-05-009 — Preview inclui estrutura de pastas esperada
### SF-05-010 — Resetar contexto limpa preview

---

## SF-06 — Comando para Criação Real

### SF-06-001 HAPPY PATH — pacote de comando gerado é texto apenas, sem execução
Output: command_execution_allowed=false, texto copyable
PASS: nenhum comando executado, output é string local

### SF-06-002 — Pacote inclui declaração de não-autoridade
### SF-06-003 — Pacote referencia worker externo como executor
### SF-06-004 EDGE — pacote sem SF-05 completo
### SF-06-005 SECURITY CRÍTICO — command_execution_allowed sempre false
### SF-06-006 SECURITY CRÍTICO — real_file_creation_enabled sempre false
### SF-06-007 SECURITY CRÍTICO — deploy/release/tag bloqueados
### SF-06-008 — Pacote inclui checklist de autorização humana
### SF-06-009 — Diferentes tipos geram comandos diferentes
### SF-06-010 — DECLARAÇÃO DE NÃO-AUTORIDADE presente no output

---

## SF-07 — Recibo do Worker

### SF-07-001 HAPPY PATH — colar recibo válido gera análise com 13 campos
Input: recibo com execução confirmada, arquivos listados
Output: 13/13 campos analisados, evidências verificadas
PASS: análise completa gerada

### SF-07-002 — Recibo inválido → análise indica campos faltando
### SF-07-003 — Recibo parcial → análise identifica gaps
### SF-07-004 EDGE — recibo vazio → output indica ausência
### SF-07-005 SECURITY — análise não executa comandos do recibo
### SF-07-006 — Campos verificados: real_execution, pass_gold_real, file_creation
### SF-07-007 — Campos verificados: backend_write, command_execution, deploy, production
### SF-07-008 — GERAR RECIBO DE EVIDÊNCIA produz documento completo
### SF-07-009 — Recibo com FALSE em campos críticos → gate não passa
### SF-07-010 — Análise é local apenas, sem backend

---

## SF-08 — Painel Final

### SF-08-001 HAPPY PATH — painel mostra cadeia completa de 9 módulos
Output: todos os 9 módulos listados com status
PASS: product_chain_complete reflete estado real

### SF-08-002 — Com cadeia incompleta mostra quais módulos faltam
### SF-08-003 — pass_gold_real_claimed sempre false no frontend
### SF-08-004 — production_touched sempre false no frontend
### SF-08-005 SECURITY CRÍTICO — nenhuma das 11 capacidades pode ser true
### SF-08-006 — Decisão do operador é campo obrigatório
### SF-08-007 — Relatório final inclui todos os artefatos gerados
### SF-08-008 — Relatório inclui matriz de autoridade com todos FALSE
### SF-08-009 EDGE — relatório sem cadeia completa
### SF-08-010 — SUMMARY ONLY label visível

---

## SF-09 — SaaS & API Roadmap

### SF-09-001 — Todos os 6 controles estão LOCKED
### SF-09-002 — saas_signup_enabled sempre false
### SF-09-003 — login_enabled sempre false
### SF-09-004 — billing_enabled sempre false
### SF-09-005 — api_connectors_enabled sempre false
### SF-09-006 — secrets_access_enabled sempre false
### SF-09-007 — Declaração de não-autoridade presente
### SF-09-008 — Planos SaaS e API marcados como Pending
### SF-09-009 — Secrets Boundary: local only
### SF-09-010 SECURITY CRÍTICO — nenhum controle pode ser ativado no frontend

---

## SPECS DE INTEGRAÇÃO (cross-módulo)

### SF-INT-001 — Estado do SF-01 persiste em todos os módulos posteriores
### SF-INT-002 — Trocar tipo em SF-01 reseta módulos 02-09
### SF-INT-003 — 12 confirmações no engineer gate são cumulativas
### SF-INT-004 — Agentes Hermes/Backend/Auth respondem no modo correto por orquestração
### SF-INT-005 — LLM output do compositor (SF-03) é consistente com template (SF-02)
### SF-INT-006 — Pacote SF-04 é derivado do compositor SF-03
### SF-INT-007 — Preview SF-05 é consistente com template SF-02
### SF-INT-008 — Recibo SF-07 pode ser analisado mesmo sem SF-06 completo
### SF-INT-009 — Painel final SF-08 agrega estado de todos os módulos
### SF-INT-010 — Cadeia completa: SF-01→02→03→04→05→06→07→08 = produto entregável

---

## SPECS DE SEGURANÇA (security wall)

### SF-SEC-001 CRÍTICO — file_creation_allowed NUNCA true no frontend
### SF-SEC-002 CRÍTICO — command_execution_allowed NUNCA true no frontend
### SF-SEC-003 CRÍTICO — backend_write_allowed NUNCA true no frontend
### SF-SEC-004 CRÍTICO — pass_gold_real_claimed NUNCA true no frontend
### SF-SEC-005 CRÍTICO — production_touched NUNCA true no frontend
### SF-SEC-006 CRÍTICO — deploy/release/tag NUNCA ativos no frontend
### SF-SEC-007 — Engineer gate exige 12/12 confirmações para recibo
### SF-SEC-008 — LLM outputs não contêm secrets, tokens ou chaves reais
### SF-SEC-009 — Modo LOCAL PREVIEW é o único modo ativo
### SF-SEC-010 — Qualquer tentativa de bypass deve ser bloqueada e logada

---

## SPECS LLM (qualidade de output)

### SF-LLM-001 — Compositor gera prompt ≥ 10 linhas para qualquer combinação
### SF-LLM-002 — Setup gerado contém tipo + stack + modo de orquestração
### SF-LLM-003 — Template preview contém estrutura de pastas real
### SF-LLM-004 — Pacote worker contém contratos SDDF e proibições
### SF-LLM-005 — Recibo análise identifica campos faltando corretamente
### SF-LLM-006 — Relatório final cobre todos os 9 módulos
### SF-LLM-007 — Outputs diferentes para diferentes combinações de input
### SF-LLM-008 — Outputs em português, coerentes com o contexto do projeto
### SF-LLM-009 — Nenhum output contém alucinação de execução real
### SF-LLM-010 — Prompts para Claude Code vs Worker Humano são distintos
