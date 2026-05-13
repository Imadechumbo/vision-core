# V14.0 Endpoint Contracts

Este documento define os contratos preservados para a V14. Nenhum frontend novo deve depender de endpoints alternativos, aliases temporários ou rotas fake para as funcionalidades abaixo.

## Regras globais

- Todo endpoint deve retornar dados reais do backend ou um estado explícito de `BLOCKED`, `OFFLINE`, `UNAVAILABLE` ou erro equivalente.
- A UI não deve converter ausência de resposta em sucesso.
- A regra de evidência se aplica a qualquer endpoint que influencie execução, aprovação, relatório, GitHub, workers, logs ou diff.
- Quando a autenticação for opcional, endpoints devem informar bloqueio/autorização sem quebrar o shell básico.

## GET /api/health

- **Finalidade:** Verificar se o backend está vivo e capaz de responder.
- **Input esperado:** Nenhum corpo. Pode aceitar headers padrão de autenticação opcional quando presentes.
- **Output esperado:** Estado de saúde com status, versão/build quando disponível, timestamp e dependências críticas se expostas.
- **Comportamento BLOCKED/OFFLINE:** Se offline, a UI deve sinalizar backend indisponível e impedir execução real. Se bloqueado por política, deve mostrar o motivo sem simular saúde.
- **Regra de evidência:** Pode alimentar o Mission Report como evidência de disponibilidade, incluindo timestamp e status recebido.

## GET /api/projects

- **Finalidade:** Listar projetos/repositórios/contextos que podem ser alvo de missão.
- **Input esperado:** Nenhum corpo. Filtros só devem ser usados se contratados pelo backend.
- **Output esperado:** Lista de projetos com identificador estável, nome, caminho/descrição quando disponível e estado de acessibilidade.
- **Comportamento BLOCKED/OFFLINE:** Se offline, o seletor de projeto deve ficar em estado indisponível. Se bloqueado, deve explicar política/permissão ausente.
- **Regra de evidência:** O projeto selecionado deve ser registrado na preparação de missão e no Mission Report.

## POST /api/run-live

- **Finalidade:** Criar/iniciar uma missão real.
- **Input esperado:** Intenção do usuário, projeto alvo quando aplicável, contexto, anexos referenciados, configurações permitidas e metadados de origem da UI.
- **Output esperado:** `mission_id` real gerado pelo backend/runtime, estado inicial, mensagem de preparação/aceite e informações para stream.
- **Comportamento BLOCKED/OFFLINE:** Se bloqueado, deve retornar motivo e nenhuma UI deve abrir stream como se a execução existisse. Se offline, a UI deve manter a missão como não iniciada ou falha técnica.
- **Regra de evidência:** O `mission_id` só é válido quando recebido do backend. Identificadores fabricados no cliente são proibidos.

## GET /api/run-live-stream?mission_id=...

- **Finalidade:** Acompanhar eventos de execução de uma missão existente.
- **Input esperado:** Query `mission_id` emitido por `/api/run-live`.
- **Output esperado:** Stream de eventos com progresso, logs resumidos, estados, bloqueios, evidências, conclusão e erros.
- **Comportamento BLOCKED/OFFLINE:** Se o stream cair, a UI deve marcar reconexão/falha sem declarar sucesso. Se o acesso for bloqueado, deve encerrar acompanhamento com motivo visível.
- **Regra de evidência:** Eventos finais e receipts recebidos pelo stream podem compor o Mission Report; eventos incompletos não aprovam PASS GOLD.

## GET /api/pass-gold/score

- **Finalidade:** Obter pontuação/estado de PASS GOLD a partir de checagens reais.
- **Input esperado:** Pode aceitar contexto de missão por query se suportado; caso contrário retorna score global/atual.
- **Output esperado:** Score, status, critérios avaliados, evidências associadas e motivo de aprovação/reprovação.
- **Comportamento BLOCKED/OFFLINE:** Offline ou bloqueado não deve virar aprovação. O estado correto é indisponível, bloqueado ou pendente.
- **Regra de evidência:** PASS GOLD exige evidence receipt; `pass_gold:true` sem receipt é inválido.

## GET /api/workers/status

- **Finalidade:** Mostrar disponibilidade real dos workers responsáveis por execução.
- **Input esperado:** Nenhum corpo.
- **Output esperado:** Lista/resumo de workers, capacidade, ocupação, última atividade e estado de saúde quando disponível.
- **Comportamento BLOCKED/OFFLINE:** Se offline, a UI deve indicar que a capacidade de execução não pode ser confirmada. Se bloqueado, deve mostrar a política/permissão que impede consulta.
- **Regra de evidência:** O status dos workers pode justificar bloqueio, espera ou falha no Mission Report.

## GET /api/github/status

- **Finalidade:** Informar estado real da integração GitHub.
- **Input esperado:** Nenhum corpo. Headers/tokens podem ser usados pelo backend quando configurados.
- **Output esperado:** Conectado/desconectado, usuário/app quando disponível, permissões relevantes e erro configuracional quando houver.
- **Comportamento BLOCKED/OFFLINE:** Se offline, não mostrar GitHub como conectado. Se bloqueado, explicar permissão/política.
- **Regra de evidência:** Qualquer ação GitHub em relatório deve citar status real obtido por este endpoint ou por operação backend equivalente.

## GET /api/github/automerge-policy

- **Finalidade:** Expor política real de automerge/promoção.
- **Input esperado:** Nenhum corpo.
- **Output esperado:** Política atual, permissões, requisitos, bloqueios e justificativas.
- **Comportamento BLOCKED/OFFLINE:** Política indisponível impede declarar promoção/automerge permitido. Bloqueios devem ser exibidos como bloqueios.
- **Regra de evidência:** `promotion_allowed:true` só é válido se sustentado por política real e evidence receipt.

## POST /api/copilot

- **Finalidade:** Solicitar assistência conversacional/LLM do backend para explicar, planejar ou orientar missão.
- **Input esperado:** Mensagem do usuário, contexto da conversa, projeto/missão quando aplicável e anexos referenciados.
- **Output esperado:** Resposta textual/estruturada, sugestões de próximos passos, avisos de limitação e referências a missão quando houver.
- **Comportamento BLOCKED/OFFLINE:** Se o copilot estiver offline ou bloqueado, o chat deve explicar indisponibilidade e não fingir resposta de modelo.
- **Regra de evidência:** Respostas que afetem execução devem ser registradas como orientação, não como evidência de execução concluída.

## POST /api/diff/preview

- **Finalidade:** Gerar preview real de diff antes de aplicar mudanças.
- **Input esperado:** Missão, projeto, arquivos/patch proposto ou referência de execução capaz de produzir diff.
- **Output esperado:** Diff, arquivos afetados, estatísticas, avisos e estado de aplicabilidade.
- **Comportamento BLOCKED/OFFLINE:** Se indisponível, mostrar que não há preview confiável. Não gerar diff fake no cliente.
- **Regra de evidência:** Diff preview pode entrar no Mission Report como evidência de revisão, mas não comprova aplicação da mudança.

## GET /api/logs/download

- **Finalidade:** Baixar logs reais do sistema ou da missão.
- **Input esperado:** Pode aceitar `mission_id` ou escopo por query se suportado; sem isso retorna pacote padrão permitido.
- **Output esperado:** Arquivo ou payload de logs com tipo de conteúdo apropriado, timestamp e escopo.
- **Comportamento BLOCKED/OFFLINE:** Se offline/bloqueado, a UI deve informar que logs não estão disponíveis e manter demais evidências separadas.
- **Regra de evidência:** Logs baixados são evidência auxiliar; devem ser associados ao timestamp e escopo retornados.
