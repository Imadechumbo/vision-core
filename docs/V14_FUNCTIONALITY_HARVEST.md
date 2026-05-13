# V14.0 PHASE 0 — Functionality Harvest

Este documento registra o aprendizado funcional que deve ser preservado antes de qualquer remoção, reescrita ou purga de frontends antigos. A fase 0 não autoriza apagar, mover ou alterar o frontend ativo; ela transforma conhecimento operacional em contrato explícito.

## Objetivo da colheita funcional

A V14 deve manter as capacidades que provaram valor para o usuário e remover apenas dívida técnica depois que cada comportamento tiver sido descrito, contratado e validado. O foco é preservar a experiência final: um operador leigo consegue iniciar uma missão, entender o que o sistema está fazendo, acompanhar evidências e receber um relatório acionável sem depender de mocks, atalhos ou flags falsas.

## Capacidades funcionais que devem sobreviver

### 1. Vision Chat estilo LLM

- O chat é o ponto central da experiência.
- Deve se comportar como uma interface de LLM: mensagens claras, progressão de raciocínio operacional, estados de carregamento e respostas orientadas a próximos passos.
- O usuário deve poder descrever uma intenção em linguagem natural e receber preparação de missão, execução ou orientação.
- O chat não deve ser um formulário disfarçado; ele é a camada de comando conversacional do Vision Core.

### 2. Anexos

- A experiência deve aceitar anexos como insumos de missão quando o backend/runtime suportar o fluxo.
- Anexos devem ser tratados como evidência ou contexto, nunca como execução implícita sem confirmação.
- A interface deve mostrar claramente o que foi anexado, se foi aceito, se falhou e se participou da missão.
- Falhas de upload, indisponibilidade ou ausência de suporte devem aparecer como estado explícito, não como silêncio.

### 3. Explicação para usuário leigo

- Toda execução deve ser compreensível por alguém sem familiaridade com a arquitetura interna.
- O sistema deve explicar em linguagem simples:
  - o que será feito;
  - por que será feito;
  - quais sistemas serão consultados;
  - o que significa bloqueado, offline, aprovado ou reprovado;
  - quais evidências sustentam o resultado.
- Termos técnicos podem aparecer, mas devem ser acompanhados de uma explicação operacional.

### 4. Preparação de missão

- Antes da execução, a UI deve deixar claro o plano de missão.
- A preparação de missão deve consolidar intenção, contexto, anexos, projeto alvo, riscos e dependências externas.
- Missões sem dados suficientes devem pedir esclarecimento em vez de fabricar valores.
- A preparação não deve gerar identificadores falsos nem simular execução.

### 5. Runtime Owner único

- A V14 deve ter um único dono de execução no frontend: `vision-runtime-owner.js`.
- Nenhum outro módulo deve iniciar missão, abrir stream, controlar retry de execução ou declarar sucesso operacional.
- O Runtime Owner coordena chamadas HTTP, streaming, estados, eventos de UI e entrega de evidências.
- Botões, chat, relatório e agente local devem solicitar execução ao Runtime Owner, não implementar caminhos paralelos.

### 6. Vision Agent Local

- O Vision Agent Local é a presença lateral que mostra estado do agente/orbit/local runtime.
- Ele deve comunicar saúde, prontidão, bloqueios, offline e atividade.
- Não deve fingir autonomia quando não há backend, worker ou runtime disponível.
- Deve ser visualmente distinto do chat: o chat conversa; o agente local observa e sinaliza estado.

### 7. Mission Report

- O relatório da missão deve ser visível e persistente durante/ao final da execução.
- Deve apresentar resumo, status, evidências, bloqueios, logs relevantes, diffs quando houver e conclusão.
- O relatório deve diferenciar claramente:
  - execução em andamento;
  - sucesso com evidência;
  - falha técnica;
  - bloqueio por política;
  - offline/indisponível;
  - resultado inconclusivo.

### 8. PASS GOLD com evidence receipt

- PASS GOLD não pode ser uma flag booleana solta.
- A aprovação só existe com evidence receipt verificável.
- A evidência mínima deve registrar origem, timestamp, missão, checagens executadas, resultado e motivo da decisão.
- Sem evidência, o estado correto é pendente, bloqueado, offline ou falho — nunca aprovado.

### 9. Auth opcional não-bloqueante

- Autenticação pode enriquecer a experiência, mas não pode bloquear o uso básico quando o ambiente permite modo anônimo/local.
- A UI deve explicar quando o usuário está anônimo, autenticado, ou quando a autenticação está indisponível.
- Fluxos antigos de modal/backdrop não devem prender o operador antes da missão.
- OAuth mockado não é autenticação válida.

### 10. Logs

- Logs são parte da experiência operacional, não um detalhe escondido.
- A UI deve permitir visualizar ou baixar logs quando o backend disponibilizar `/api/logs/download`.
- Logs devem ser associados à missão quando possível.
- Ausência de logs deve ser indicada de forma honesta.

### 11. Diff preview

- O preview de diff deve permitir que o usuário veja mudanças propostas antes de qualquer aplicação, commit ou PR.
- O diff é informativo e deve carregar de endpoint contratado.
- Se o serviço estiver offline ou bloqueado, a UI deve mostrar o motivo e não criar diff fictício.

### 12. GitHub status/policy

- Integração com GitHub deve expor status real e política de automerge.
- A UI deve distinguir:
  - conectado;
  - desconectado;
  - token ausente;
  - política bloqueando;
  - serviço offline.
- Criar PR fake ou simular integração é proibido.

### 13. Workers status

- O status dos workers deve mostrar disponibilidade real de execução.
- A UI deve explicar se a missão não pode seguir porque não há worker, porque o worker está ocupado ou porque o backend não respondeu.
- Workers status é sinal de capacidade, não decoração visual.

## Resultado esperado da V14

A V14 deve nascer com menos código legado, mas com mais contrato. O usuário deve conseguir confiar que cada estado exibido corresponde a uma condição real observada pelo sistema, sustentada por endpoint, stream, logs ou evidence receipt.
