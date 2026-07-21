# Vision AI Installer — Spec V0.1

**Estado:** FASE 0 / ESPECIFICADO. Nenhum instalador funcional, download ou integração foi implementado.

## Produto

O Vision AI Installer é o instalador e gerenciador oficial de runtimes e modelos locais do ecossistema Vision Core. Ele provisiona e opera modelos locais; não substitui Vision Agent Local, Vision Agent Desktop, Software Factory, Codex, Claude Code ou providers cloud.

## V0.1 fechada

- Windows 11 x64, NVIDIA, Colibri e GLM-5.2.
- Detecção explicável de CPU, RAM, NVIDIA/VRAM/driver, discos, permissões e dependências.
- Planejamento editável de runtime, modelos, cache e logs sem caminhos de máquina hardcoded.
- Diagnóstico de dependências antes de qualquer instalação e consentimento antes de elevação.
- Downloads retomáveis com arquivo parcial, checksum, retry/backoff e verificação prévia de espaço.
- Colibri gerenciado por adapter externo; nenhuma edição silenciosa de upstream ou de `download_fp8.py`.
- API OpenAI-compatible ligada somente a localhost, porta configurável e sem matar processo alheio.
- Lifecycle: `not_installed`, `installing`, `stopped`, `starting`, `healthy`, `degraded`, `failed`, `stopping`, `updating`.
- Evidência final conforme PONYTAIL-VAI-001; ausência de evidência nunca vira sucesso.

## Fora da V0.1

Linux, macOS, AMD, Intel GPU, Qwen, Kimi, benchmarks comparativos, troca avançada de runtime e rollback completo ficam registrados para V0.2, sem promessa de suporte.

## Contratos reais auditados

- `GET /api/runtime/providers` e `GET /api/runtime/provider-status` expõem provider `local` somente quando `OLLAMA_BASE_URL` existe; o probe atual usa `/api/tags`, não `/v1/models`.
- `/api/providers/save|list|delete|test|default` exige sessão, guarda chaves de providers cloud e não define contrato para base URL local arbitrária.
- Vision Agent Local usa `/api/agent/register`, `/api/agent/mission/*` e pareamento por `agent_secret`; não é um gerenciador de modelos.
- Software Factory pode entregar projetos ao Vision Agent Local, mas não provisiona runtimes de IA.

**Decisão:** o conector V0.1 fica `BLOCKED_CONTRACT` até existir contrato explícito, autenticado, reversível e localhost-only. A Fase 0 não altera backend nem inventa endpoint.

## Critérios de saída da Fase 0

Spec, arquitetura, threat model, RCA Hermes, runbook, plano de testes, filtros Ponytail, decisão arquitetural, About marcado “Em desenvolvimento” e testes documentais verdes. Código Tauri/Rust exige aprovação separada para a Fase 1.
