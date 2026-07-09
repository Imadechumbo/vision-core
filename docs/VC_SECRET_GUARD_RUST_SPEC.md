# VC-SECRET-GUARD — Spec Rust (fase spec-only, zero implementação)

> **Status:** SPEC — NÃO IMPLEMENTADO. Nenhuma linha de Rust escrita. Nenhum binário existe. Este documento é o contrato que qualquer implementação futura deve seguir, revisado e aprovado antes de qualquer código.
> Ler junto com `CLAUDE.md` (seção "SPEC OFICIAL — vc-secret-guard") e `docs/CURRENT_HANDOFF.md` antes de iniciar qualquer trabalho nesta linha.

---

## 1. Visão geral e motivação

O Vision Core já teve dois incidentes reais de exposição de credencial nesta base de código — nenhum dos dois causou dano em produção porque foi pego a tempo, mas os dois foram pegos *depois* do fato consumado (commit feito, ou endpoint já em produção), nunca *antes*:

1. **Token de acesso ao GitLab exposto na saída de `git remote -v`.** Uma URL de remote com credencial embutida (`https://<user>:<token>@gitlab.com/...`) — padrão de configuração que qualquer `git remote -v`, `.git/config` copiado, ou log de CI expõe em texto plano para qualquer pessoa com acesso de leitura ao ambiente. Descoberto por inspeção manual, não por ferramenta.
2. **`agent_secret` vazando de volta via `GET /mission/result/:id` (endpoint público, sem autenticação).** Documentado em detalhe em `CLAUDE.md` (seção "Pareamento por `agent_secret`"): `POST /mission/result` fazia `{...body, received_at: now()}` ao persistir, o que gravava o campo `agent_secret` dentro do resultado armazenado — e esse resultado é lido de volta por um endpoint sem autenticação nenhuma. Corrigido destruturando o campo fora do body antes de persistir. Pego por revisão de segurança manual durante uma sessão de validação, não por scan automatizado.

Os dois incidentes têm o mesmo padrão de causa raiz: **a credencial existia em algum estado do sistema (config local, corpo de resposta HTTP) antes de alguém — humano ou ferramenta — perceber.** Nenhuma camada existente hoje neste projeto roda *antes* do commit, *antes* do push, ou continuamente no filesystem local para pegar isso no momento em que acontece, e não depois.

**Motivação real:** `vc-secret-guard` é um núcleo local de detecção rápida de secrets/vazamentos — rodando na máquina do desenvolvedor, em `git hooks` e/ou modo `watch`, com a única missão de identificar essa classe de erro **antes do commit, antes do push, antes do dano** — não durante uma auditoria manual posterior, e não como parte do pipeline de validação de código do go-core (que já existe, mas resolve um problema adjacente e diferente — ver §3).

---

## 2. Arquitetura real do projeto (verificado no repositório, não presumido)

Vision Core hoje tem três peças reais em produção, mais uma quarta nova (spec-only) que este documento propõe:

| Peça | Papel | Onde vive |
|---|---|---|
| **`backend/server.js`** | Gateway/API web — Node.js Express. Recebe HTTP, autentica, orquestra chamadas de LLM (Hermes multi-provider), serve o frontend Next, faz health-check + shell-out para o binário go-core (`resolveGoBinary()`, `server.js:2444`; `GET /api/go-core/health`, `server.js:1612-1613`). | AWS Elastic Beanstalk |
| **`go-core/`** | **Vision Core Go Safe Core** — o "núcleo seguro" do produto, escrito em Go, compilado para binário único (Windows+Linux). Não é um serviço web — é invocado como processo pelo Node. | Binário local + CI |
| **`frontend/vision-core-next.html` + `assets/vision-core-next-clean.{js,css}`** | Cockpit web (Vision Core Next) — chat, missões, GitHub PR, Software Factory. Consome `server.js` via HTTP. | Cloudflare Pages |
| **`vc-secret-guard`** *(proposto, spec-only)* | Binário local mínimo em Rust, independente dos três acima — roda na máquina do desenvolvedor, fora do ciclo de request HTTP e fora do processo go-core. | CLI local + git hooks |

### go-core em detalhe (Aegis)

"Aegis" é o nome guarda-chuva para o subsistema de segurança/remediação dentro do go-core — não é um arquivo único, é um conjunto de módulos com responsabilidades estritamente separadas e proibições explícitas documentadas no próprio código:

- **`go-core/internal/scanner/scanner.go`** — mapeia arquivos e stack do projeto. Comentário no próprio arquivo: *"Responsabilidade: ler o projeto. NUNCA altera arquivos"* — **read-only por design**, não por convenção.
- **`go-core/internal/security/secrets/secrets.go`** — "VISION AEGIS CORE ENTERPRISE — Secrets Guard": regras `AEGIS_SECRET_001`…`AEGIS_SECRET_010` (chave AWS, secret AWS, token GitHub `ghp_`/`gho_`/etc., PAT fine-grained, chave Stripe `sk_live_`/`sk_test_`, entre outras). **Já existe hoje** e roda como parte do scan de projeto do Scanner/Aegis — ver §3 para a fronteira exata entre isso e `vc-secret-guard`.
- **`go-core/internal/patcher/`** — aplica patch de código, mas **supervisionado, nunca automático**: `supervised.go` — *"Patch multi-arquivo só é executado se ApplyMode='supervised'. 'automatic' não existe nesta versão."* Exige snapshot prévio e rollback disponível.
- **`go-core/internal/passgold/`** e **`go-core/internal/passsecure/`** — avaliam um conjunto de gates (`Gates`/`SecureGates`, `Evaluate()`) e retornam decisão `GOLD`/`FAIL` em JSON estruturado, mapeada para exit code do processo (0=GOLD, 2=FAIL). Não são flags soltas — são contratos JSON com schema em `go-core/contracts/`.
- **`go-core/internal/github/`** — fluxo de PR com **write-gate explícito**: `open_pr.go` só abre PR real quando `PRPlan.CanOpenPR=true` **e** `VISION_GITHUB_WRITE=1` (opt-in por variável de ambiente) **e** `GITHUB_TOKEN` presente **e** `DryRun=false`. Comentário no código: *"V7.3 NEVER publishes status... NEVER merges... NEVER pushes."* Comportamento padrão é dry-run.
- **`go-core/internal/mcpserver/`** — servidor MCP **read-only por design**: *"Package mcpserver implements a read-only local MCP control plane... No real execution via MCP (no patch, commit, push, PR, deploy)."* Toda tool mutante retorna erro (`blockedToolError`). Nem o status de PASS GOLD pode ser sintetizado via MCP — só lido, se já existir.

Ou seja: o go-core inteiro é desenhado em torno de **validação e remediação supervisionada de código dentro de um projeto**, sempre com gate humano ou gate de contrato antes de qualquer escrita real — nunca é um processo contínuo rodando em background na máquina do desenvolvedor, e não tem noção de "hook de git local" ou "watch de filesystem em tempo real".

---

## 3. Por que Rust e não um módulo do go-core

Esta é a decisão de arquitetura central deste documento — comparação honesta, sem viés para a conclusão que já foi tomada.

### A favor de um módulo Go dentro do go-core

- **Reuso real e imediato:** o go-core já tem `PASS SECURE`, o CLI (`cmd/vision-core/main.go`), os contratos JSON (`go-core/contracts/`), e — mais relevante — **já tem detecção de secrets** (`AEGIS_SECRET_001`…`010`). Um módulo novo herdaria toda essa infraestrutura de graça: schema JSON já definido, exit codes já definidos, testes de regressão já existentes cobrindo o go-core inteiro.
- **Um binário a menos para o usuário instalar, atualizar e confiar.** Hoje o produto já pede que o usuário rode `go-core`. Pedir um segundo binário (Rust) é fricção de instalação real, não hipotética.
- **Um único "vocabulário" de segurança** (regras `AEGIS_SECRET_*`) em vez de dois conjuntos de regras que podem divergir com o tempo.

### A favor de um binário Rust separado

- **Watcher de máxima performance, sem GC, sem runtime overhead.** O caso de uso central de `vc-secret-guard` é rodar em modo `watch` continuamente na máquina do desenvolvedor, em cada save de arquivo — isso é fundamentalmente um problema de "ficar ligado o tempo todo consumindo o mínimo possível de CPU/memória residente", não um problema de "rodar uma vez, produzir um relatório, sair". Rust é a escolha correta para esse perfil de carga (binário nativo, sem coletor de lixo, footprint de memória previsível).
- **Binário isolado, sem dependência do go-core estar presente, saudável, ou na versão certa.** `vc-secret-guard` precisa funcionar mesmo em: (a) uma máquina onde o go-core nunca foi instalado; (b) um repositório que não é o Vision Core (ver §5 — hooks de git são por definição instalados em *qualquer* repositório do usuário, não só neste); (c) o momento exato de um `git commit`, onde adicionar uma dependência de "o binário Go precisa responder rápido" é um ponto de falha a mais no caminho crítico do fluxo de trabalho do desenvolvedor. Acoplar isso ao go-core significa que um go-core quebrado, ausente, ou em atualização trava o commit de qualquer repositório onde o hook está instalado — inaceitável para uma ferramenta de hook de git.
- **Memória segura a nível de sistema para um binário que roda com acesso de leitura amplo ao filesystem** (histórico de shell, `.env`, logs) — Rust dá essa garantia sem runtime managed, o que importa quando o binário roda continuamente e sem supervisão humana constante (modo `watch`).
- **Diferencial de produto real, não hipotético:** completar o stack com uma peça em Rust — ao lado de Node (gateway) e Go (safe core) — é, em si, um sinal de maturidade de engenharia que o produto pode comunicar honestamente (3 linguagens escolhidas por adequação ao problema, não por moda).

### Fronteira de responsabilidade (não há sobreposição)

| | `vc-secret-guard` | go-core Aegis (`security/secrets`) |
|---|---|---|
| **Quando roda** | Pré-commit, pré-push, ou continuamente (`watch`) — no momento em que o secret é escrito ou está prestes a entrar no histórico do git | Como parte de um scan/missão de validação de código já em andamento (Scanner → Aegis → PASS GOLD) |
| **O que examina** | Diff staged, arquivos alterados no filesystem, caminhos sensíveis conhecidos (`.env`, `auth.json`, histórico de shell) | O projeto inteiro, como parte do contexto de uma missão de correção/remediação |
| **O que faz com o achado** | Bloqueia o commit/push (fail-closed) ou alerta em tempo real (`watch`) | Reporta como finding de segurança dentro do relatório de missão; pode alimentar decisão de PASS GOLD/PASS SECURE |
| **Modifica código?** | Nunca — detecção pura | O Aegis em si não modifica (`scanner` é read-only); a remediação, quando existe, passa pelo `patcher` supervisionado — processo totalmente separado |
| **Depende de quê** | Nada além do próprio binário e do filesystem local | Todo o pipeline go-core (scanner, contratos, gates) |

**A fronteira em uma frase:** `vc-secret-guard` decide "isso pode entrar no git?" no momento em que a decisão é tomada pelo desenvolvedor; go-core Aegis decide "esse código está seguro o suficiente para ser promovido?" como parte de uma missão de validação mais ampla, depois que o código já existe no repositório.

**Ponte entre os dois (futura, não desta fase):** o evento JSON que `vc-secret-guard` emite a cada detecção (ver §7) é desenhado para poder alimentar dois consumidores diferentes sem acoplamento: (1) `server.js`, que pode expor isso como alerta visível no Next (Missions/Security); (2) futuramente, o próprio `PASS SECURE` do go-core, que poderia considerar "há um alerta recente do guard local não resolvido" como um sinal adicional — sem que `vc-secret-guard` precise saber que o go-core existe, e sem que o go-core precise rodar o binário Rust.

---

## 4. Por que Rust para o núcleo local (vs. as alternativas descartadas)

| Linguagem | Veredito | Motivo |
|---|---|---|
| **Rust** | ✅ Escolhida | Binário único, sem runtime, sem GC — essencial para um watcher que fica ligado o tempo todo com footprint mínimo. Memória segura por padrão (sem classe inteira de bugs de segurança que seriam irônicos numa ferramenta *de* segurança). Ecossistema maduro para regex de alta performance (`regex` crate, engine compilada, sem backtracking catastrófico) e para hooks de filesystem (`notify` crate). |
| **Python / PowerShell** | ❌ Só para protótipo, nunca para o binário final | Rápido de escrever, mas exige runtime instalado na máquina do usuário (interpretador Python, ou PowerShell — que nem está disponível por padrão fora de Windows). Testar a lógica de detecção rapidamente com um script descartável é aceitável durante o design; entregar isso como o produto final não é — cada usuário precisaria de um interpretador compatível, e um script interpretado rodando em `watch` contínuo tem overhead de startup e de execução que um binário nativo não tem. |
| **C++** | ❌ Descartado | Resolveria o problema de performance/binário único tão bem quanto Rust, mas sem as garantias de memória segura — para um binário que roda continuamente, sem supervisão, com acesso de leitura amplo ao filesystem do usuário (incluindo arquivos historicamente sensíveis como `.bash_history`), o custo de manutenção e o risco de uma classe de bug (buffer overflow, use-after-free) que Rust elimina por construção não se justifica quando Rust entrega o mesmo binário nativo sem esse risco. |

---

## 5. Comandos planejados

Interface de CLI única, subcomandos:

```
vc-secret-guard scan [--path <dir>] [--format json|text] [--policy <file>]
  Varre um diretório (default: cwd) uma vez, imprime achados, sai com
  código != 0 se algo foi encontrado (fail-closed por padrão).

vc-secret-guard watch [--path <dir>] [--policy <file>]
  Roda continuamente, observando mudanças no filesystem (via notify),
  emitindo evento JSON por linha (JSONL) a cada achado novo — stdout ou
  arquivo, configurável.

vc-secret-guard install-hooks [--path <repo>]
  Instala pre-commit e pre-push no repositório git local apontado
  (default: cwd). Idempotente — não duplica hook já instalado, detecta
  e avisa se já existe um hook de outra ferramenta no mesmo arquivo.

vc-secret-guard report [--since <duration>] [--format json|md]
  Lê o histórico de eventos já emitidos (local, no disco do usuário) e
  produz um relatório agregado — não faz novo scan.

vc-secret-guard policy [show|validate|init]
  Mostra a policy efetiva (regras + allowlist + caminhos monitorados),
  valida um arquivo de policy antes de usar, ou gera um policy inicial
  default para o usuário customizar.
```

---

## 6. Detecção por categorias (não lista fixa de strings mágicas)

O guard classifica achados por **categoria**, cada uma com sua própria família de regras — nunca uma lista fixa de "strings mágicas" hardcoded que precisa ser editada a cada novo provedor de API lançado no mercado. Estrutura conceitual (nomes de categoria, não implementação):

- **`provider_key_prefix`** — prefixos conhecidos de chave de provedor de API (ex.: prefixo de 3-4 caracteres seguido de `_` e um token alfanumérico de comprimento típico do provedor). Regra por categoria, não por provedor individual — nova entrada de provedor é uma linha na tabela de prefixos, não uma regra nova.
- **`bearer_token`** — padrões de header/valor `Authorization: Bearer <token>` capturados fora de contexto de teste/exemplo (heurística de proximidade textual: `bearer`/`authorization` + token de alta entropia nas proximidades).
- **`credential_field`** — campos nomeados que convencionalmente carregam segredo (`password`, `secret`, `token`, `api_key`, `private_key`, variantes de case/snake/camel) atribuídos a um literal de string não-vazio, não a uma referência de variável de ambiente (`process.env.X`, `os.Getenv`, `$env:X` não disparam — só literal hardcoded dispara).
- **`high_entropy_blob`** — string contígua acima de um comprimento mínimo configurável com entropia de Shannon acima de um limiar configurável, como rede de segurança para formatos de credencial não cobertos pelas categorias acima.
- **`connection_string`** — URIs com credencial embutida no formato `scheme://user:pass@host` (a classe exata do incidente §1 do GitLab).

**Allowlist configurável:** por caminho de arquivo (glob), por hash de linha (para permitir um falso positivo específico sem desabilitar a categoria inteira), e por categoria completa (para times que decidem não rodar `high_entropy_blob`, por exemplo, por causa de ruído). Vive num arquivo de policy versionável (`.vc-secret-guard.toml` ou equivalente), nunca hardcoded no binário.

**Caminhos monitorados por padrão** (além do diff staged no modo hook): `.env` e variantes (`.env.local`, `.env.*`), arquivos de credencial nomeados convencionalmente (`auth.json`, `credentials.json`, `secrets.yml`), histórico de shell (`.bash_history`, `.zsh_history`, `PSReadLine` history no Windows) quando dentro do escopo de varredura explícita do usuário — nunca varredura automática de fora do diretório apontado.

---

## 7. Regra anti-autoflagelo

Nenhuma página pública, nenhuma seção de marketing, e este próprio documento **não devem conter um padrão que o próprio scanner flagraria** como um secret real — isso incluiria, ironicamente, o produto detectando a si mesmo como incidente na primeira vez que rodasse contra este repositório.

Regra prática: todo exemplo de padrão detectado neste documento e em qualquer material público usa **ofuscação explícita** — `sk-***`, `ghp_***`, `AKIA****************` — nunca um valor que sintaticamente passaria pela própria regex de detecção (comprimento certo, charset certo, apenas com os caracteres reais substituídos por `*`). Os exemplos concretos de regra na §6 acima descrevem a *forma* da categoria (prefixo, comprimento, contexto), nunca colam um literal capturável.

---

## 8. Integração futura (não desta fase)

1. **Git hooks fail-closed:** `pre-commit` e `pre-push`, instalados via `install-hooks`. Fail-closed por padrão — se o guard encontra algo, o commit/push é bloqueado (exit code != 0), exigindo ação explícita do usuário (remover o secret, ou allowlist explícita se for falso positivo confirmado). Sem flag de "ignorar e continuar" trivial — a saída difícil é editar o allowlist versionado, não um `--force` de uma linha, para deixar rastro de auditoria de por que um bloqueio foi contornado.
2. **Evento JSON → `server.js`:** o mesmo formato de evento emitido em `watch` (JSONL) pode ser enviado, opt-in e configurável, para um endpoint novo em `server.js` (não implementado, não desenhado nesta fase) — habilitando um alerta visível no Vision Core Next (painel de Missions/Security), sem que o backend precise rodar o binário Rust — só recebe e exibe o evento que a máquina do usuário já gerou localmente.
3. **`PASS SECURE` do go-core**, no futuro, poderia considerar "há evento não resolvido do guard local" como sinal adicional de risco — arquitetura que permite isso sem acoplamento direto (ver §3, "Ponte entre os dois").

Nenhum desses três pontos é implementado nesta fase — documentados aqui só para que a decisão de design de hoje (formato do evento JSON, por exemplo) já considere esses consumidores futuros sem se comprometer com eles agora.

---

## 9. Limites de segurança (obrigatórios, não negociáveis)

1. **O guard NUNCA transmite o valor do secret detectado — em nenhum evento, em nenhum log, em nenhum lugar.** Todo evento/relatório carrega apenas: categoria da regra, caminho do arquivo, número da linha, e opcionalmente um hash truncado do valor (útil só para deduplicação/allowlist por hash — nunca reversível ao valor original). Isso vale para stdout, para o JSONL de `watch`, para o `report`, e para a futura integração com `server.js` (§8.2) — o secret real nunca sai da máquina onde foi encontrado.
2. **Modo de emergência = orientar rotação/revogação, nunca automatizar isso.** Se o guard encontra um secret que já foi commitado (não só staged), a ação do produto é **instruir** o usuário sobre o próximo passo correto (revogar a credencial no provedor, reescrever histórico do git se necessário) — nunca chamar automaticamente uma API de revogação em nome do usuário, nunca reescrever histórico de git sozinho. Automação de remediação é uma decisão de produto separada, fora do escopo desta spec e desta fase.
3. **Nenhuma telemetria de conteúdo por padrão.** Contagens agregadas (quantos achados, de qual categoria) podem eventualmente ser úteis para métricas de produto, mas isso é uma decisão explícita e opt-in futura — não parte do design padrão.

---

## 10. Critérios de aceite e plano por fases

Cada fase tem gate próprio — nenhuma fase começa sem a anterior estar fechada e aprovada.

| Fase | Escopo | Gate de saída |
|---|---|---|
| **0 — Spec** *(esta fase)* | Este documento, revisado e aprovado pelo dono do produto. Zero código. | Aprovação explícita registrada em `docs/CURRENT_HANDOFF.md`. |
| **1 — Protótipo local** | Binário Rust mínimo, só `scan` (sem `watch`, sem hooks). Rodando contra o próprio Vision Core localmente, nunca publicado, nunca em CI. Categorias da §6 implementadas, allowlist funcional. | Zero falso-positivo contra o próprio repo Vision Core depois de allowlist configurada; zero falso-negativo contra um conjunto de casos de teste sintéticos (secrets fake, nunca reais) cobrindo as 5 categorias. |
| **2 — Hooks locais** | `install-hooks`, `pre-commit`/`pre-push` fail-closed, testado contra um repositório git de teste descartável (nunca o Vision Core real como cobaia de um hook que ainda pode ter bug). | Hook bloqueia commit de teste com secret sintético; hook não bloqueia commit limpo; hook não trava indefinidamente (timeout definido e testado). |
| **3 — `watch` + evento JSON** | Modo contínuo, emissão de evento JSONL no formato definido na §9.1 (sem valor de secret, testado explicitamente). | Formato de evento validado contra um consumidor de teste (nunca `server.js` real nesta fase); footprint de CPU/memória em idle medido e documentado. |
| **4 — Integração `server.js`/Next** | Endpoint novo em `server.js` para receber o evento (opt-in), alerta visível no Next. **Requer decisão explícita do usuário antes de começar** — mexe no backend, fora do padrão "zero-touch backend" das fases anteriores. | Endpoint com anti-stub real, alerta visível testado, sem alteração de comportamento quando o guard não está instalado/rodando (degradação graciosa). |
| **5 — Ponte `PASS SECURE`** | Avaliação (não implementação garantida) de como um evento do guard poderia influenciar `PASS SECURE` do go-core. | Decisão de arquitetura documentada antes de qualquer código — pode concluir "não vale o acoplamento" e isso é uma saída válida. |

**Nenhuma fase além da 0 está autorizada a começar por este documento.** Cada avanço de fase exige autorização explícita registrada em sessão futura, seguindo o mesmo protocolo de revezamento entre agentes já estabelecido para o resto do projeto (`CLAUDE.md`, seção "PROTOCOLO DE REVEZAMENTO ENTRE AGENTES").
