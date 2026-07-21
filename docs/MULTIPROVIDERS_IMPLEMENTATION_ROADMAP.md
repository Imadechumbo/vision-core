# MULTIPROVIDERS — IMPLEMENTATION ROADMAP

> Status: EXECUTING · Autoridade: roadmap autônomo aprovado em 2026-07-21.
> Push e deploy permanecem proibidos. Cada fase exige testes, Hermes, Ponytail, documentação e commit antes do avanço automático.

## Sequência oficial

1. R1 — Security and Ownership Hardening — COMPLETE (78f16578)
2. R2 — Canonical MultiProviders Foundation — COMPLETE (f4ed60ff)
3. R3 — Legacy Characterization and Compatibility Bridge
4. R4 — Capability, Health and Lifecycle Runtime
5. R5 — Policy Routing and Compatible Failover
6. R6 — First Neutral Provider Adapter
7. R7 — Colibri Integration
8. R8 — Installer Bridge
9. R9 — Blueprint Read Model
10. R10 — Certification and Legacy Retirement
11. R11 — Release Candidate Readiness

## Gates permanentes

Cada fase segue: investigar → planejar → implementar → testar → Hermes → Ponytail → documentar → commit. Avanço é automático somente sem risco crítico, falha obrigatória, segredo/acesso externo, mudança destrutiva, incompatibilidade de SPEC, conflito de ADR, worktree insegura, decisão pública ausente, push ou deploy.

## R1 — Security and Ownership Hardening — COMPLETE

Superfície Provider/Vault global restrita a admin; endpoints protegidos; status conectado expira; segredo Gemini saiu de URLs; regressões de autenticação, redaction e fail-closed aprovadas. Evidência detalhada em CURRENT_STATE.md, MULTIPROVIDERS_HERMES_RCA.md, MULTIPROVIDERS_TEST_PLAN.md e ADR-049.

## R2 — Canonical MultiProviders Foundation — COMPLETE

Materializar Provider Contract, Provider Registry, Model Registry e ProviderModelOffering neutros, tenant-scoped e independentes do runtime legado. Inclui versionamento explícito, lifecycle, discovery/configuration references, deduplicação idempotente, aliases acíclicos/não ambíguos, proteção de órfãos e extensões desconhecidas isoladas. Não inclui transport I/O, routing, persistência, probes, adapter real ou cutover.

Saída entregue: domínio puro e suíte 22/22; Hermes PASS; Ponytail PASS; commit funcional f4ed60ff. O runtime legado permanece deliberadamente desconectado até R3.

## R3 — Legacy Characterization and Compatibility Bridge

Caracterizar callLLM(), Vault, routers, fallback, models, custos, streaming, retries, endpoints e estado local. Traduzir legado para contratos canônicos por ponte temporária, observável e removível; Registry canônico passa a autoridade sem duplicação silenciosa. Preservar apenas comportamento seguro comprovado.

## R4 — Capability, Health and Lifecycle Runtime

Resolver capabilities por evidência e escopo; Health temporal com TTL; lifecycle uniforme e elegibilidade determinística. Health não propaga entre Provider, Transport, Model, Capability, Credential ou Endpoint. A discrepância do pedido que lista degraded/offline em lifecycle é resolvida pela SPEC Phase 1.1: ambos pertencem exclusivamente a Health.

## R5 — Policy Routing and Compatible Failover

Implementar requisitos, candidatos, filtros obrigatórios, policy, ranking determinístico, receipt e failover compatível. Sem Provider hardcoded, prioridade oculta, custo desconhecido como zero, privacidade inferida por localização ou retry não idempotente.

## R6 — First Neutral Provider Adapter

Escolher por testabilidade e menor risco, nunca preferência comercial. O adapter não altera core, não vira default e passa suíte comum. Colibri permanece proibido nesta fase.

## R7 — Colibri Integration

Somente após certificação R6. Colibri usa contrato e suíte comuns, sem Manager/Registry/Contract/lifecycle/default próprios e sem mudança Provider-specific no core.

## R8 — Installer Bridge

Após instalação comprovada: discovery → ProviderRegistry.register() → configured → validated → ready. Instalação/registro não implica confiança, Health ou routing. Rollback limpa apenas estado incompleto próprio.

## R9 — Blueprint Read Model

Projetar view tenant-scoped e redigida de Providers, Models, capabilities, Health, lifecycle, routing, receipts, failover, discovery e versions. Blueprint lê; nunca escreve, roteia ou duplica autoridade.

## R10 — Certification and Legacy Retirement

Executar certificação acumulada. Retirar segundo router, fallback, catálogos/defaults e bridges apenas com equivalência, zero consumidores desconhecidos e rollback provado. Remoções ficam em commits próprios.

## R11 — Release Candidate Readiness

Validar arquitetura, segurança, testes, performance, rollback, documentação, integridade, riscos e Go/No-Go. Produzir pacote de evidência sem push/deploy. MULTIPROVIDERS_IMPLEMENTATION_COMPLETE somente com R1–R11 completas e nenhum gate crítico aberto.

## Dependências

R1 → R2 → R3 → R4 → R5 → R6 → R7 → R8 → R9 → R10 → R11

## Estado de autorização

O roadmap completo foi explicitamente autorizado para execução autônoma. Isso não autoriza push, deploy, acesso externo, segredos, migração irreversível, exclusão de dados nem mudança destrutiva. Qualquer condição de parada preserva o checkpoint e encerra antes da fase seguinte.