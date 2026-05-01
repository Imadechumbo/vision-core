# SDDF — V5.0 GO SAFE CORE

## Contexto
V4.4 GOLD é o LEGACY ENGINE estável. Node/Electron permanecem como camada SaaS/UI.
V5.0 extrai o motor crítico para Go sem quebrar nada existente.

## Separação de Responsabilidades

| Camada | Runtime | Responsabilidade |
|--------|---------|-----------------|
| Frontend | Cloudflare Pages | UI, orbit, chat, SSE display |
| Worker | Cloudflare Workers | API Gateway, roteamento |
| Backend Node | AWS Elastic Beanstalk | Auth, Billing, SSE, SaaS APIs |
| Desktop Agent | Electron | UI local, tray, logs |
| **Go Safe Core** | **CLI / loopback** | **Scanner, FileOps, Patcher, Validator, Rollback, PASS GOLD** |

## Regra Mestre
**SEM PASS GOLD → não promove, não aprende, não gera release, não substitui legado.**

## Módulos V5.0

- `scanner` — lê projeto, detecta stack, lista endpoints. NUNCA altera.
- `fileops` — operações seguras. NUNCA escreve fora do root. NUNCA segue `../`.
- `patcher` — aplica patch. NUNCA sem snapshot. NUNCA em dirs bloqueados.
- `validator` — valida resultado. NUNCA promove. NUNCA ignora falha.
- `rollback` — restaura snapshot. Rollback automático em FAIL crítico.
- `passgold` — decisão final. GOLD só com 7/7 gates true.

## Não implementado na V5.0 (por contrato)
- Memory/learning
- LLM/AI calls  
- Escrita em produção
- Substituição do legado
