# HERMES RCA ADVERSARIAL — VISION AI INSTALLER

**Evidência:** incidentes fornecidos pelo operador sobre a instalação manual do Colibri, cruzados com a árvore atual. Não há automação do Colibri no repo; logo todos os controles abaixo estão planejados e `NOT_RUN`.

| # | Sintoma | Causa imediata / raiz | Falha das instruções | Detecção e prevenção | Teste / mensagem correta |
|---|---|---|---|---|---|
| 1 | winget instalado, ausente do PATH | processo herdou PATH antigo | “instalado” confundido com invocável | localizar executável e reabrir ambiente | PATH sem winget / “Instalado, mas indisponível nesta sessão” |
| 2 | CMD vs PowerShell | sintaxe depende do shell | shell não declarado | core usa argumentos estruturados | shells diferentes / “Use a ação do Installer” |
| 3 | PowerShell 5 vs 7 | versão assumida | pré-requisito implícito | detectar versão/capability | PS5 fixture / “PowerShell 7 necessário para esta etapa” |
| 4 | terminal MSVC x86 | ambiente errado | arquitetura não verificada | detectar host/target x64 | x86 env / “Abra toolchain x64” |
| 5 | MSYS2 incompleto/atalho antigo | instalação parcial | presença do diretório virou sucesso | doctor de pacotes e prefixo UCRT64 | instalação parcial / “MSYS2 encontrado, componentes faltando” |
| 6 | pacman ausente | PATH/prefixo incorreto | só se pediu `pacman` | localizar e executar `--version` com timeout | pacman ausente / “Gerenciador MSYS2 não validado” |
| 7 | erros de digitação | comandos manuais | operação não estruturada | botões geram args validados | comando malformado / “Nenhum comando manual necessário” |
| 8 | pacote UCRT64 incorreto | nome digitado | catálogo não pinado | catálogo de dependências allowlisted | pacote desconhecido / “Pacote fora do plano” |
| 9 | script no diretório errado | cwd implícito | instrução depende do terminal | cwd absoluto controlado | cwd aleatório / “Projeto Colibri não localizado” |
| 10 | underline duplicado | nome manual errado | arquivo não descoberto | localizar por manifesto/commit | nome divergente / “Script esperado ausente no commit pinado” |
| 11 | unidade hardcoded inexistente | caminho de outra máquina | exemplo virou configuração | Storage Planner detecta discos | unidade ausente / “Escolha um disco disponível” |
| 12 | clone confundido com instalação | checkout foi tratado como pronto | ausência de critérios de saída | state machine + PONYTAIL-VAI-001 | só clone / “Código baixado; runtime ainda não instalado” |
| 13 | centenas de GB antes de validar | modelo precedeu doctor | ordem de risco invertida | build/doctor + espaço antes do modelo | runtime inválido / “Download bloqueado até validar runtime” |
| 14 | comandos demais | conhecimento manual distribuído | sem orquestrador | plano idempotente no app | replay / “Plano retomável pronto” |
| 15 | sem retomada formal | estado só no terminal | nenhuma journal de etapa | journal atômico + resume | crash no passo N / “Retomar do último checkpoint íntegro” |

## Ataque à arquitetura proposta

- Qualquer instrução que ainda peça copiar comando falhou o objetivo do produto.
- PATH, shell, cwd, arquitetura e versões devem ser entradas detectadas, não conhecimento do usuário.
- Instalação não idempotente, download sem resume, elevação global ou cleanup fora da raiz gerenciada são bloqueadores.
- “Clone concluído”, “download concluído” e “processo iniciou” são estados intermediários, nunca `installed`.
- Integração com Vision Core não pode existir até o contrato local reversível deixar de estar `BLOCKED_CONTRACT`.

**Veredito Hermes:** `READY_FOR_SPEC_ONLY`. Implementação funcional continua bloqueada até aprovação da Fase 1 e fechamento dos contratos/fontes/checksums do Colibri e GLM-5.2.
