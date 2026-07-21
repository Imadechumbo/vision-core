# Vision AI Installer — Plano de Testes

**Estado:** matriz da Fase 0. Testes funcionais abaixo permanecem `NOT_RUN` até as fases correspondentes.

## Unitários

Parsing de hardware; compatibilidade; seleção/cálculo de disco; schema/config; lifecycle; sanitização; argumentos; catálogo; advisor.

## Integração

Hardware real; NVIDIA ausente; disco insuficiente; porta ocupada; download interrompido/resume; checksum inválido; build/doctor/endpoint/provider falhando; rollback.

## Segurança

Traversal; junction; injection; config/binário adulterado; URL externa; token em logs; processo duplicado; timeout; arquivo parcial; cleanup fora da boundary.

## E2E fixture-only

Detectar → planejar → runtime fake → fixture pequena → checksum → servidor OpenAI fake em loopback → health/chat → provider fake (quando houver contrato) → rollback → relatório. CI nunca baixa GLM-5.2.

## PONYTAIL-VAI

Cada claim registra evidência, teste, resultado, artefato, timestamp e `PASS|FAIL|NOT_RUN`.

- **PONYTAIL-VAI-001 — No False Installation Success:** todos os oito marcos exigidos; nesta Fase 0 = `NOT_RUN`.
- **PONYTAIL-VAI-002 — No Hardcoded Machine Paths:** scan documental/código por caminhos de máquina e portas não configuráveis.
- **PONYTAIL-VAI-003 — No Unsafe External Execution:** scan por shell concatenado, origem/checksum ausentes e elevação silenciosa.
- **PONYTAIL-VAI-004 — Storage Safety:** testes de espaço, overwrite, boundary, junction e parcial.
- **PONYTAIL-VAI-005 — Reversible Vision Core Integration:** preview/backup/remove e rejeição de host externo.

### Evidência executada na Fase 0 — 2026-07-21

| Claim | Evidência/teste | Resultado | Artefato | Status |
|---|---|---|---|---|
| PONYTAIL-VAI-001 | Nenhum instalador funcional existe nesta fase | Não executável | spec + teste documental `13/13` | `NOT_RUN` |
| PONYTAIL-VAI-002 | Scan dos arquivos da Fase 0 por caminhos de máquina | Nenhuma ocorrência | saída local do gate | `PASS` |
| PONYTAIL-VAI-003 | Scan dos arquivos da Fase 0 por shell/execução externa | Nenhuma ocorrência; não há executor | saída local do gate | `PASS documental` |
| PONYTAIL-VAI-004 | Não há implementação de storage/download | Não executável | threat model + matriz futura | `NOT_RUN` |
| PONYTAIL-VAI-005 | Auditoria dos contratos atuais do backend | Contrato reversível inexistente | spec/arquitetura | `BLOCKED_CONTRACT` |

`PASS documental` não aprova execução externa futura. Timestamp da rodada: 2026-07-21 (America/Sao_Paulo).
## Gate da Fase 0

Teste documental novo, About, links locais, `npm run test:syntax`, `git diff --check` e suíte About aplicável. Nenhuma claim funcional pode ficar `PASS`.
