# Filosofia do Vision Core Next

Vision Core Next é o produto oficial em evolução, não um projeto de migração. O legado pode comprovar um contrato histórico até o cutover, mas nunca define arquitetura, código ou UX.

Princípios operacionais:

1. Uma fonte por tipo de verdade.
2. Documento ativo precisa de owner, evento de atualização e conteúdo proibido.
3. Spec descreve contrato; ADR registra decisão; status descreve agora; changelog registra mudança; runbook executa operação; evidência prova resultado.
4. Narrativa, saída de teste e investigação não ficam no caminho de leitura normal.
5. Menos estados, arquivos, exceções e dependências vencem, desde que segurança, acessibilidade e integridade não sejam reduzidas.
6. A interface principal deve responder imediatamente: conversar, iniciar missão, acompanhar agentes/progresso e configurar. O restante fica contextual, avançado ou fora do cockpit.

# Problemas atuais

- `docs/` contém **120 arquivos, ~1,18 MB**, mas apenas `archive/`, `session_logs/` e `spec-library/` organizam o conteúdo.
- Fontes permanentes convivem na raiz com relatórios pontuais, pacotes de evidência, resultados JSON, checklists antigos e experimentos.
- `ARCHITECTURE.md` (331 linhas), `VISION_CORE_NEXT_FRONTEND_SPEC.md` (386), `HERMES_MISSION_SUPERVISOR.md` (593) e documentos PI Harness repetem arquitetura, operação e histórico.
- Há ao menos nove gerações de stress/certificação, frequentemente com `.json` e `.md` duplicando o mesmo resultado.
- Mais de 25 documentos de execução local/real-tag/patch descrevem etapas de uma mesma linha experimental.
- `PARITY_AUDIT.md`, `VISION_CORE_NEXT_MASTER_GAP_ANALYSIS.md` e o backlog executivo repetem inventário e gaps já transformados em trabalho.
- `ROADMAP.md`, `CURRENT_STATE.md`, `CHANGELOG_NEXT.md` e documentos de sessão ainda carregam fatos semelhantes em níveis diferentes.
- `LEGACY_DESIGN_REFERENCE.md` permanece na navegação ativa mesmo após o fim da fase de migração.
- A proposta de criar muitas subpastas por domínio pode trocar desordem horizontal por uma árvore vazia e profunda. A árvore mínima deve refletir tipos reais, não categorias desejadas.

# Redundâncias encontradas

| Sobreposição | Fonte que fica | Destino do restante |
|---|---|---|
| princípios/arquitetura em CLAUDE, MASTER, ARCHITECTURE e specs | MASTER + ARCHITECTURE | ponteiros curtos nas specs/CLAUDE |
| decisões narradas em specs/roadmap/status | DECISIONS/ADR | remover repetição; manter referência pelo ID |
| estado e história misturados | CURRENT_STATE + CHANGELOG | sessão vai para archive/evidence |
| gaps em três auditorias | backlog V2 | auditorias viram evidência arquivada |
| stress results MD+JSON por geração | quality evidence index + JSON bruto | arquivar gerações, manter último certificado ativo |
| execução local em dezenas de arquivos | um runbook + evidence bundle por execução | fundir/arquivar fragmentos |
| CI setup/last-run/certifications | runbook CI + status gerado | remover narrativa duplicada |
| SF spec, library e false-positive spec | SOFTWARE_FACTORY_SPEC + schemas | absorver regras e arquivar docs paralelos |
| visual baseline/manifest/checklists | quality visual contract | consolidar em um contrato curto |
| produção checklist/manual plans | release runbook + quality plan | separar operação de validação |

# Documentos que permanecem

Cada documento ativo recebe um cabeçalho padrão com cinco respostas.

| Documento | Quem sou / por que existo | Quem/quando atualiza | Não contém |
|---|---|---|---|
| `MASTER_SPEC.md` | visão e contratos invariantes do produto | Chief Architect; mudança de produto | sessão, comandos, resultados |
| `ARCHITECTURE.md` | mapa técnico atual e fronteiras | Chief Architect; mudança estrutural | decisões completas, backlog, histórico |
| `DECISIONS.md` | índice das decisões aprovadas | Chief Architect; aprovação/substituição | propostas abertas, narrativa |
| `CURRENT_STATE.md` | estado operacional curto | agente responsável; todo handoff | histórico longo, planos futuros |
| `ROADMAP.md` | resultados futuros aprovados, não tarefas | Product/Chief Architect; mudança de prioridade | itens executáveis detalhados |
| `VISION_CORE_IMPLEMENTATION_MASTER_PLAN.md` | backlog executivo ADR/IMP/TEST/REL/OPS | Chief Architect; transição de item | sessão, implementação detalhada duplicada |
| `IMPLEMENTATION_STATUS.md` | quadro gerado/curto dos estados | automação ou Chief Architect; mudança de estado | specs e justificativas |
| `CHANGELOG_NEXT.md` | mudanças entregues resumidas | autor do commit/release | investigação e estado atual |
| `README_DOCUMENTATION.md` | mapa de leitura e owners | Chief Architect; mudança da árvore | conteúdo normativo duplicado |
| specs canônicas por domínio | contrato detalhado atual | owner do domínio; mudança de contrato | logs, roadmap, decisões repetidas |
| runbooks aprovados | sequência operacional verificável | Operações/Release; ferramenta muda | arquitetura conceitual, secrets |
| ADRs individuais aprovados | contexto/alternativas/decisão | Chief Architect; decisão | status diário e código |

Specs canônicas preservadas inicialmente: API, Backend, Frontend Next, Software Factory, Atomic Core, Security, Agent/PI Harness, Secret Guard, Git provider e UI Component Library. A permanência é provisória até a fusão descrita abaixo; nenhuma é apagada sem links atualizados e comparação de conteúdo.

# Documentos que serão fundidos

| Origem | Destino único | Regra |
|---|---|---|
| `SECURITY-SPEC.md`, `PENTEST-CHECKLIST.md`, partes de `ENTERPRISE-SPEC.md` | `specs/security/SECURITY_SPEC.md` | contrato na spec; execução no quality plan |
| `SF-FALSE-POSITIVE-SPEC.md`, `SF-SPEC-LIBRARY.md` | `specs/software-factory/SOFTWARE_FACTORY_SPEC.md` | schemas JSON continuam como dados, não prose |
| `MANUAL_TEST_PLAN.md`, `REAL-VALIDATION-3-CHECKLIST.md`, `VALIDATION-2-MANUAL-CHECKLIST.md` | `specs/quality/QUALITY_PLAN.md` | um catálogo de gates; evidência fora |
| `VISUAL_BASELINE_LOCK.md`, `VISUAL_GOLD_HARNESS_MANIFEST.json` | `specs/quality/VISUAL_CONTRACT.md` + manifest de dados | contrato curto e manifest machine-readable |
| `CI-SETUP.md`, `CI-LAST-RUN.md` | `runbooks/ci.md` + `IMPLEMENTATION_STATUS.md` | setup operacional separado do último estado |
| `production-checklist.md`, partes release do backlog | `runbooks/release.md` | checklist executável, sem repetir critérios REL |
| família `controlled-runtime-*` | `runbooks/controlled-runtime.md` + evidence bundle | plano no runbook; relatórios no arquivo de evidência |
| família `local-execution-*` | `runbooks/local-execution.md` + evidence bundle | um fluxo, uma evidência por execução |
| família `real-local-patch-*` e `real-repo-patch-*` | `runbooks/local-patch.md` + evidence bundle | remover fragmentação por etapa |
| família `one-real-tag-*`, `real-tag-human-runbook.md` | `runbooks/release-tag.md` + evidence bundle | separar procedimento de resultado |
| `runtime-governance-baseline.md`, `runtime-readiness-audit.md` | ADRs aplicáveis + backlog/status | decisão vira ADR; finding vira item; auditoria é arquivada |
| `api-connectors-decision.md`, `auth-saas-decision.md` | ADRs individuais | preservar contexto, eliminar formato paralelo |
| `cost-cache-*`, `hermes-cache-*` | spec de observabilidade/custos ou ADR | só manter limites ainda ativos |
| `HERMES_MISSION_SUPERVISOR.md`, `anti-hallucination-runtime-baseline.md` | `specs/agents/HERMES_SPEC.md` | contrato atual; evidência histórica arquivada |
| `PI_HARNESS_AGENT_SPEC.md`, partes normativas de `PI_HARNESS_AUTONOMOUS_MISSION_RUNNER.md` | `specs/agents/PI_HARNESS_SPEC.md` | remover narrativa e exemplos repetidos |

# Documentos que serão removidos

“Remover” significa sair da documentação ativa. Evidência histórica vai para `docs/archive/` ou storage de CI; não se apaga prova necessária.

| Arquivos/padrão | Ação | Motivo |
|---|---|---|
| `LEGACY_DESIGN_REFERENCE.md`, `V14_REMAINING_LEGACY_OWNERSHIP_AUDIT.md`, `V8_GOLD_RUNTIME_AUDIT_NEXT.md` | arquivar após extrair decisões ainda válidas | migração encerrada; não são base técnica |
| `PARITY_AUDIT.md`, `VISION_CORE_NEXT_MASTER_GAP_ANALYSIS.md` | arquivar após backlog V2 apontar evidência | auditorias cumpriram função |
| `final-project-review.md`, `stable-review-*` | arquivar | snapshots, não contratos |
| todos `STRESS-TEST-*-RESULTS.md` | remover após confirmar JSON/evidence equivalente | duplicação humana de saída gerada |
| gerações antigas `STRESS-TEST-*-RESULTS.json` e certificações | arquivar por release | só o último certificado fica ativo |
| `controlled-runtime-execution-report.md`, `local-execution-final-report.md`, `one-real-tag-operation-final-report.md`, `real-execution-dry-run-proof-report.md` | mover para evidence/archive | resultados pontuais |
| fragmentos `*-baseline`, `*-proof`, `*-ledger`, `*-packet`, `*-snapshot`, `*-gate` das famílias fundidas | arquivar após gerar bundle/index | uma execução não precisa de dezenas de documentos ativos |
| `session_logs/*` | mover periodicamente para `archive/sessions/` | nenhum session log fica no caminho ativo |
| `archive/*` atual | permanece arquivado, fora do mapa principal | não reindexar como documentação ativa |
| `spec-library/_needs-review.json` | eliminar quando fila zerar; caso contrário vira status gerado | arquivo vazio não agrega navegação |

Nenhuma spec ou evidência de segurança é apagada por contagem de arquivos. Primeiro extrair contrato/decisão; depois arquivar a fonte com checksum e link no commit de reorganização.

# Nova árvore documental

```text
docs/
  README.md
  MASTER_SPEC.md
  ARCHITECTURE.md
  DECISIONS.md
  CURRENT_STATE.md
  ROADMAP.md
  IMPLEMENTATION_MASTER_PLAN.md
  IMPLEMENTATION_STATUS.md
  CHANGELOG.md
  specs/
    api.md
    frontend.md
    backend.md
    software-factory.md
    atomic-core.md
    security.md
    agents.md
    quality.md
  adr/
    ADR-001-*.md
  runbooks/
    ci.md
    local-execution.md
    local-patch.md
    release.md
    rollback.md
    monitoring.md
  evidence/
    README.md
    <release-or-incident>/
  templates/
    adr.md
    incident.md
    postmortem.md
    review.md
  archive/
```

Por que esta árvore é menor que a sugerida: não cria uma pasta por domínio contendo um único arquivo nem separa `release/operations/quality` até existir volume real. O ponto de divisão é cinco arquivos ativos por pasta; abaixo disso, pasta adicional é custo sem ganho.

# Nova governança

- `MASTER_SPEC` e specs são normativos; código/testes são evidência.
- `DECISIONS.md` é índice; decisões novas vivem em `adr/` e só entram no índice quando aprovadas.
- `CURRENT_STATE` tem limite recomendado de 150 linhas e apenas estado necessário ao próximo agente.
- `IMPLEMENTATION_MASTER_PLAN` contém definições estáveis; `IMPLEMENTATION_STATUS` contém apenas ID, estado, owner, hash e bloqueio.
- Runbook não pode conter resultado de execução; evidence não pode prescrever operação.
- Documento sem update event conhecido é arquivado.
- Link quebrado, conteúdo duplicado ou owner ausente falha o gate documental.
- Mudanças de estrutura documental exigem diff de links, não nova narrativa explicando a árvore.

# Novo fluxo do Chief Architect

```text
Selecionar item Ready
→ ler spec/ADR aplicáveis
→ confirmar menor mudança possível
→ implementar um item/commit
→ autorevisar segurança, UX, erro e dívida
→ executar testes definidos
→ atualizar spec/status/changelog somente onde necessário
→ commit isolado
→ mover status; arquivar evidence fora da fonte normativa
```

Findings não entram clandestinamente no item corrente: viram novo ADR/IMP/TEST. Operações externas seguem REL→OPS e nunca são efeito colateral de implementação.

# Estratégia de documentação mínima

1. Se o código e um teste expressam suficientemente uma regra local, não criar prose.
2. Se a informação muda por execução, é status/evidence, não spec.
3. Se explica “por que escolhemos”, é ADR, não comentário repetido em cinco specs.
4. Se descreve “como operar”, é runbook.
5. Cada fato tem um endereço canônico; outros documentos usam link+ID.
6. Templates limitam tamanho: ADR ≤2 páginas; status ≤150 linhas; changelog ≤5 bullets por release; runbook sem histórico.
7. JSON gerado não recebe cópia Markdown manual salvo resumo certificado único.

# Estratégia de redução contínua de complexidade

- Métricas mensais: arquivos ativos, linhas normativas, links quebrados, documentos sem owner, duplicações por heading e idade desde última utilidade.
- Budget inicial: reduzir de 120 para **≤45 arquivos ativos**; o restante arquivado/evidence. Reduzir leitura inicial para oito documentos.
- Toda adição documental precisa indicar qual arquivo existente não pode absorvê-la.
- Dois incidentes antes de generalizar mecanismo novo (YAGNI, alinhado à DECISION-004).
- Revisão trimestral arquiva auditorias concluídas, evidências antigas e specs substituídas.
- Deletar/fundir somente com mapa origem→destino e verificação de links.

# Estratégia para tornar o Vision Core Next mais limpo

- Manter uma única entrada oficial e um único bundle Next até a modularização pagar seu custo.
- Retirar drafts/protótipos do pacote via allowlist, não lista crescente de exclusões.
- Não transportar endpoints administrativos para o cockpit por paridade automática.
- Remover estado/componente que não corresponda a uma ação compreensível do usuário.
- Painéis avançados só aparecem quando solicitados; Chat, Missão, Progresso, Agentes e Settings formam a navegação primária.

# Estratégia para torná-lo mais modular

- Modularidade por fronteira de estado/API, não por número de arquivos.
- Um owner para projeto/sessão; chat, timeline e logs consomem IDs, não mantêm cópias.
- Separar adapters de API, state transitions e renderização quando houver segundo consumidor real.
- Atomic Core permanece módulo protegido; não acoplar domínio funcional à animação.
- Software Factory expõe contratos de job/result/quality; UI não conhece implementação do worker.
- Nenhuma interface/factory com uma implementação única sem pressão comprovada.

# Estratégia para torná-lo mais rápido

- Medir antes de dividir bundle: tamanho, parse, first interaction e polling.
- Definir budgets no backlog TEST-003; regressão falha o RC.
- Pausar polling invisível e deduplicar requests por recurso/ID.
- Renderizar painel avançado sob demanda; preservar navegação instantânea e feedback imediato.
- Evitar dependência nova para utilidade coberta por browser/stdlib.
- Performance documental: menos arquivos obrigatórios reduz contexto e erros dos agentes.

# Estratégia para torná-lo mais simples

- Composer é a única entrada de missão (DECISION-010).
- Navegação principal limitada às cinco intenções do produto; ferramentas e laboratórios em Avançado.
- Um padrão de loading/vazio/erro/retry/cancelamento.
- Preferências só existem quando o usuário percebe efeito e têm default seguro.
- Billing e deploy administrativo ficam fora do cockpit salvo ADR contrário.
- Apply real permanece fail-closed; ausência declarada é mais simples e segura que capacidade parcial.

# Critérios para impedir novo acúmulo de dívida técnica

Um change é rejeitado se:

- copia/importa código legado;
- cria segunda fonte de estado, contrato ou decisão;
- adiciona documento sem owner/update event/conteúdo proibido;
- adiciona dependência sem demonstrar que plataforma/stdlib/código existente não resolve;
- cria configuração, preset ou abstração para uso hipotético;
- mistura implementação, certificação e operação no mesmo item;
- passa teste apenas por mock quando afirma integração real;
- reduz segurança, acessibilidade ou tratamento de erro para “simplificar”;
- aumenta navegação primária sem remover/fundir outra intenção;
- deixa arquivo obsoleto ativo depois de substituí-lo.

Checklist de avaliação por proposta (0–2 cada): redução de complexidade, documentação e acoplamento; melhoria de manutenção, UX e performance; aproximação do cutover. Pontuação <7/14 ou qualquer regressão de segurança = rejeitar/reespecificar.

# Roadmap da limpeza arquitetural

## Fase 1 — Congelar e medir

- Inventário machine-readable de documentos, links, owner e tipo.
- Aprovar a árvore e budgets; nenhuma movimentação ainda.
- Resultado: baseline auditável e rollback por commit.

## Fase 2 — Extrair verdade

- Migrar decisões paralelas para ADRs.
- Fundir specs de segurança, SF, quality e agentes sem alterar significado.
- Criar runbooks únicos para famílias de execução.
- Resultado: nenhuma informação normativa depende de relatório histórico.

## Fase 3 — Arquivar ruído

- Mover auditorias concluídas, session logs, gerações antigas e fragments de evidence.
- Remover cópias Markdown de resultados gerados após equivalência comprovada.
- Resultado: ≤45 arquivos ativos e oito leituras iniciais.

## Fase 4 — Simplificar produto e pacote

- Executar ADRs de escopo; consolidar estados UX; criar package allowlist e budgets.
- Reavaliar navegação pelas cinco intenções, sem redesign especulativo.
- Resultado: menos superfície, bundle mensurado e zero debris publicado.

## Fase 5 — Enforce contínuo

- Gate de links/owners/duplicação/budget no quality plan.
- Revisão trimestral e archive automático de evidence quando seguro.
- Resultado: complexidade não volta a crescer silenciosamente.

Impacto estimado (Alto/Médio/Baixo):

| Proposta | Complexidade | Docs | Acoplamento | Manutenção | UX | Performance | Cutover |
|---|---|---|---|---|---|---|---|
| fontes únicas + ADR | Alto | Alto | Alto | Alto | Baixo | Baixo | Alto |
| fundir specs/runbooks | Alto | Alto | Médio | Alto | Baixo | Baixo | Médio |
| arquivar evidence/auditorias | Médio | Alto | Baixo | Alto | Baixo | Médio (contexto) | Médio |
| navegação por cinco intenções | Médio | Baixo | Médio | Médio | Alto | Médio | Alto |
| allowlist/budgets | Médio | Baixo | Médio | Alto | Médio | Alto | Alto |
