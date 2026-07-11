# README_DOCUMENTATION — Índice mestre da documentação do Vision Core

Este arquivo explica **qual documento consultar, quando, e quem consulta**. Não repete conteúdo de nenhum outro documento — só aponta.

---

## Ordem oficial de leitura (obrigatória antes de alterar código)

```
1. docs/CURRENT_STATE.md                  ← estado agora mesmo, pendências reais, próxima prioridade
2. CLAUDE.md                              ← regras permanentes, convenções, arquitetura resumida
3. docs/VISION_CORE_NEXT_FRONTEND_SPEC.md ← o que construir no frontend ativo, regras duras de UI
4. docs/SOFTWARE_FACTORY_SPEC.md          ← feature de geração de projetos (se a tarefa tocar SF)
5. docs/ARCHITECTURE.md                   ← arquitetura completa, "Duas Camadas", pilares, fluxo
6. docs/DECISIONS.md                      ← decisões fechadas — não reabrir sem motivo novo
```

Só então altere código. Depois de 1-6, consulte sob demanda:

```
7. docs/MASTER_SPEC.md                    ← índice da série de 10 docs de arquitetura (item 5 é um deles)
8. docs/CHANGELOG_NEXT.md                 ← histórico resumido por versão (next-clean-N)
9. docs/IMPLEMENTATION_LOG               ← NÃO EXISTE COMO ARQUIVO SEPARADO — já coberto por CHANGELOG_NEXT.md (ver nota abaixo)
10. docs/session_logs/                    ← narrativa completa de uma sessão específica, só quando precisar do detalhe
11. docs/archive/                         ← documentos obsoletos/substituídos, consulta rara
```

**Por que essa ordem:** 1-2 dão o estado do momento (o que está acontecendo AGORA); 3-6 dão o mapa estável (o que o sistema É e as regras que não mudam); 7-11 são consulta profunda sob demanda, nunca carregados por padrão. Ler na ordem inversa faz um agente confundir uma decisão de sessão específica com regra permanente, ou vice-versa.

---

## Responsabilidade de cada arquivo

| Arquivo | O que contém | O que NUNCA contém | Quem consulta | Quando |
|---|---|---|---|---|
| `docs/CURRENT_STATE.md` | Estado do sistema, implementações da sessão mais recente, pendências reais, próxima prioridade, riscos conhecidos, testes, contexto para o próximo agente | Logs de terminal, JSON completo, diffs grandes, investigação | Todo agente | Sempre, no início de toda sessão |
| `CLAUDE.md` | Protocolo de revezamento, stack/URLs, arquitetura resumida, convenções permanentes, variáveis de ambiente (nomes), pointers para os demais docs | Narrativa de sessão, commits, hashes de deploy, git log/status, payloads | Todo agente | Sempre, no início de toda sessão |
| `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` | O que construir no Next, regras duras de UI | Estado de sessão | Quem for tocar frontend | Antes de editar `frontend/vision-core-next.html` ou os assets Next |
| `docs/SOFTWARE_FACTORY_SPEC.md` | Feature de geração de projetos (produto) | Governança interna (Camada 2) | Quem for tocar Software Factory | Antes de editar SF |
| `docs/ARCHITECTURE.md` (parte da série `MASTER_SPEC.md`) | Missão, pilares, "Duas Camadas", componentes físicos, segurança, deploy, CI, boas práticas | Estado do dia-a-dia, decisões numeradas (ficam em `DECISIONS.md`) | Todo agente, uma vez por sessão nova | Ao começar a trabalhar num componente que não conhece bem |
| `docs/DECISIONS.md` | Catálogo permanente de decisões fechadas (`DECISION-NNN`), uma vez cada, com por-quê e como-aplicar | Estado atual, narrativa de sessão | Todo agente antes de propor mudar algo que "parece" já decidido | Ao considerar reabrir/questionar um comportamento existente |
| `docs/MASTER_SPEC.md` | Índice da série de 10 documentos de arquitetura de produto | Conteúdo duplicado dos 9 documentos que referencia | Quem quer o mapa completo da arquitetura | Ao precisar de um componente específico (Atomic Core, Backend, Secret Guard, etc.) |
| `docs/CHANGELOG_NEXT.md` | Um bloco curto por versão (`next-clean-N`): o que mudou, resultado de teste, deploy | Narrativa longa, terminal, diffs | Quem quer saber "o que mudou entre a versão X e a Y" | Consulta pontual |
| `docs/session_logs/YYYY-MM-DD-nome.md` | Investigação completa, diffs grandes, stack traces, payloads, raciocínio técnico, Playwright completo | — (é o destino de tudo isso) | Quem precisa entender o "como" completo de uma sessão específica | Raro — só quando o resumo em `CHANGELOG_NEXT.md`/`CURRENT_STATE.md` não é suficiente |
| `docs/archive/` | Handoffs antigos, specs substituídas, documentos obsoletos — nunca apagados, só arquivados | — | Quem precisa de contexto histórico específico | Raro |
| `docs/ROADMAP.md` | Fases futuras por prioridade/risco/dependência, incluindo o backlog Enterprise/Segurança (§156-160) | Estado atual | Quem está planejando a próxima fase grande | Ao considerar prioridade de longo prazo |

### Nota sobre `IMPLEMENTATION_LOG.md`

Não foi criado como arquivo separado. `docs/CHANGELOG_NEXT.md` já cobre exatamente esse papel — um bloco por versão com resultado de teste e commit/deploy — e um terceiro arquivo entre ele e `session_logs/` duplicaria conteúdo sem adicionar uma camada de granularidade real. Se essa necessidade reaparecer no futuro (ex.: o changelog ficar sobrecarregado de detalhe técnico que atrapalha sua leitura rápida por versão), separar nesse momento — não antecipar agora (YAGNI).

---

## Regra de ouro contra duplicação

Cada fato tem **um dono**. Se você está prestes a escrever a mesma informação em dois arquivos desta tabela, pare — em vez disso, escreva no dono correto e adicione um pointer (`ver docs/ARQUIVO.md`) no outro. Nenhum documento desta lista deve conter uma cópia de outro.

---

## Documentos fora desta série (não reescritos, ainda válidos)

- `docs/SDDF_SPEC.md` (raiz do repo, não em `docs/`), `docs/HERMES_MISSION_SUPERVISOR.md`, `docs/PI_HARNESS_AUTONOMOUS_MISSION_RUNNER.md`, `docs/PASS-GOLD-SPEC-INTERNA.md` — fonte canônica da Camada 2 (governança interna).
- `docs/LEGACY_DESIGN_REFERENCE.md` — herança visual legado→Next.
- `docs/GIT-PROVIDER-SPEC.md`, `docs/ENTERPRISE-SPEC.md`, `docs/PENTEST-CHECKLIST.md`, `docs/SF-SPEC-LIBRARY.md`, `docs/SECURITY-SPEC.md` — specs de detalhe por área.
- ~60 arquivos de recibo de evidência datados (`STRESS-TEST-*`, `real-local-patch-*`, `one-real-tag-*`, `local-execution-*`, `controlled-runtime-*`) — registros de execuções passadas específicas, não documentação viva. Consultar por nome quando precisar da evidência de um teste específico.

---

## Controle de versão

| Versão | Data | Mudança |
|---|---|---|
| 1.0.0 | 2026-07 | Criação — reestruturação de documentação em camadas (`CURRENT_STATE.md`, `DECISIONS.md`, `ARCHITECTURE.md` renomeado, este índice). Ver `docs/DECISIONS.md` DECISION-018. |
