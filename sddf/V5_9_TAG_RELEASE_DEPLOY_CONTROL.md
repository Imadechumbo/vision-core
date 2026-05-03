# VISION CORE V5.9 - TAG RELEASE + DEPLOY CONTROLADO

## Estado base

- Branch: `main`
- Commit base: `3978b1c`
- Estado: `MAIN GOLD`
- Tag sugerida: `v5.9-main-gold`

## Arquitetura oficial

- Node: SaaS/UI/orquestracao externa.
- Go Core: engine critica oficial.
- Legacy Engine: compativel, subordinado ao Go Core.
- PASS GOLD: fonte unica de verdade para promocao.

## Regra permanente

SEM PASS GOLD -> nada e promovido.

## Linha consolidada

- V5.2: Real Mission Execution
- V5.3: Node to Go Live Orchestration
- V5.4: Multi-file Transactional Patch Engine
- V5.5: Hermes RCA in Go Core
- V5.6: Go Safe Core + Legacy Engine Consolidation
- V5.7: Release Candidate + PASS GOLD Gate
- V5.8: Main Cleanup + Production Hardening
- V5.9: Tag Release + Controlled Deploy

## Deploy controlado

Deploy so pode acontecer apos:

1. `main` limpa.
2. `scripts/validate-main-gold.ps1` passando.
3. Tag `v5.9-main-gold` criada.
4. PASS GOLD confirmado.
5. Plano de rollback definido.

## Proibicoes

- Nao simular GOLD.
- Nao promover se `pass_gold !== true`.
- Nao fazer deploy com working tree sujo.
- Nao versionar artefatos runtime/build.
