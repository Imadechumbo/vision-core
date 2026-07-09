# CURRENT HANDOFF — Vision Core Next

Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode). Leia depois de `CLAUDE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`, antes de editar código.

> Última atualização: 2026-07-09, por Claude Code (Sonnet 5) — **doc-only: `docs/LEGACY_DESIGN_REFERENCE.md`** oficializa a política de herança visual (legado=referência, Next=implementação do zero) e cataloga 5 telas do legado tela-a-tela. Zero código. Sessão anterior: `vc-secret-guard` Fase 1 (protótipo local em Rust, fechada).

---

## Sessão doc-only — Política de herança visual + catálogo do legado — 2026-07-09

Escopo: **nenhum código**. Só `docs/LEGACY_DESIGN_REFERENCE.md` (novo) + 1 seção curta em `CLAUDE.md` + 1 linha em `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` + este HANDOFF. Backend/go-core/frontend legado intocados, nenhum arquivo do Next tocado, nenhum deploy.

### O que foi entregue

`docs/LEGACY_DESIGN_REFERENCE.md`: política oficial (legado = fonte de referência visual/UX, proibido copiar código; nenhuma feature nova nasce no legado — regra anti-novo-legado; divergência consciente do Next é permitida se registrada) + catálogo de 5 telas, cada afirmação rastreada a `arquivo:linha` real (navegado no código-fonte estático, nada executado). Achados de precisão que corrigem presunções da tarefa original, registrados no próprio doc em vez de silenciosamente ignorados:

- **A credencial hardcoded `[REDACTED_LEGACY_AUTH_FALLBACK]`** (achado do `vc-secret-guard` na sessão anterior) existe em **`vision-core-bundle.js`** (o bundle real, carregado por `index.html` em produção) — não só em `vision-core-clean-runtime.js` (fork abandonado, citado na tarefa original, mas que `VISION_CORE_NEXT_FRONTEND_SPEC.md` §11 já documentava como "não carregado por nenhuma página oficial"). As duas afirmações são compatíveis (o fork realmente não é carregado) mas a tarefa original conflava os dois arquivos como se fossem o mesmo — corrigido no doc, com os dois arquivo:linha citados.
- **A frase "copiloto que não confia em si mesmo"** (citada na tarefa original) **não existe** no código — confirmado por busca em `landing.html`/`about.html`. A frase real mais próxima é `landing.html:94`: *"Não é chatbot. Não é copiloto."* — registrado no doc pra não propagar uma citação que não bate com a fonte.
- **6 pilares na landing, não 3** — contagem verificada diretamente no DOM (`so-ia-grid compact-pillar-grid`, 6 `.so-ia-card`).
- **A "tabela comparativa"** (ANTES E DEPOIS) não é um elemento `<table>` HTML — é um layout de 2 colunas (`.loop-comparison`) com 6 passos pareados. Descrito com precisão no doc, sem chamar de "tabela" o que não é uma.
- **Software Factory no legado são DUAS UIs distintas**, não uma: (3a) geradores embutidos no chat + Auto-Pilot de 7 passos (`SF_AUTOPILOT_STEPS`), e (3b) a página standalone `#vcSoftwareFactoryPage`/`#projectBuilder` de 9 abas — que **já está decidida como "não será portada"** (`VISION_CORE_NEXT_FRONTEND_SPEC.md` §11, Categoria C, Fase 3.3d). O doc cataloga as duas separadamente para não reabrir por engano uma decisão já fechada.
- **Dois sistemas de numeração "SF-01"…"SF-09" coexistem no legado, sem relação entre si**: um mapeia módulos da página 3b para a Spec Library de 120 specs (`SF_MODULE_SPEC_MAP`); outro (citado em `about.html:753`, §139) rotula os 8 `SF_GENERATORS` do backend. Documentado explicitamente pra próxima sessão não presumir que são a mesma lista.
- **Contagem real de agentes no grid:** 11 cards (`backend`, `database`, `auth`, `upload_media`, `config`, `network`, `locator`, `security`, `validator`, `architect`, `memory`) — confirmado por contagem direta no DOM, não repetida de memória de sessões anteriores (que citavam "15 agentes" num contexto diferente, o catálogo completo de `/api/agents/catalog`, não necessariamente igual à contagem de cards estáticos no HTML).

### Status de migração registrado (tabela completa no doc)

Métricas e Agentes: dado já portado (SAFE READ, texto no chat via `featureMap`), visual (barras/chips/badge de cor/grid de cards/tri-state) não iniciado. Software Factory (3a): divergência consciente registrada — Next reimplementou do zero com Auto-Pilot 5+1 passos e UX de chat-log, não replica a sequência de 7 passos nem a UI do legado. `project-files`/`generate-zip`: não iniciado, sem bloqueio de backend (contrato já verificado em sessão anterior). Software Factory (3b), Landing, About: não serão portados — decisões já existentes (SPEC §7 e §11), não reabertas aqui.

### Validação

Suíte permanente Next: **25/25 PASS**, rodada antes de começar (confirma estado esperado do protocolo) e nenhum arquivo do Next foi tocado nesta sessão, então zero risco de regressão. `git status`/`git log -3` conferidos no início — `HEAD` batia com `c7a0994a` esperado, tree limpo (só o ruído pré-existente já documentado em sessões anteriores).

---

## Sessão `vc-secret-guard` Fase 1 (protótipo local) — 2026-07-09

Autorização explícita do usuário para a Fase 1 (protótipo local, spec §10). Escopo: crate Rust real, SOMENTE `scan`, testes, dogfood contra o próprio repo. **Backend/go-core/frontend intocados** — só arquivos novos (`vc-secret-guard/`, `.vc-secret-guard.toml` na raiz) e este HANDOFF/`CLAUDE.md`.

### O que foi entregue (4 commits isolados, todos pushados)

1. **Scaffold do crate** (`Cargo.toml`/`Cargo.lock`/`.gitignore`, `src/main.rs`, `src/lib.rs`, `src/stub.rs`) — crate independente, sem workspace compartilhado. `main.rs` é casca fina sobre `lib.rs::run()` — permite testes de integração chamarem a biblioteca direto, sem `assert_cmd`/subprocess.
2. **Motor de detecção** (`src/categories.rs`, `entropy.rs`, `mask.rs`, `policy.rs`, `scanner.rs`, `event.rs`) — as 5 categorias da spec §6 implementadas literalmente, allowlist (`.vc-secret-guard.toml`) por caminho/categoria/hash, masking (`mask.rs`) como único ponto de saída de um valor derivado do secret.
3. **Testes** (`tests/fixtures/*` + `tests/scan_test.rs`) — fixtures sintéticas documentadas (`tests/fixtures/README.md`, regra anti-autoflagelo §7). **43/43 testes PASS** (38 unit + 5 integration), rodado localmente via `cargo test` contra `stable-x86_64-pc-windows-gnu`.
4. **Docs** (este commit) — `vc-secret-guard/README.md` (dependências justificadas, formato do `.toml`, uso), `.vc-secret-guard.toml` raiz (allowlist real do repo, construída durante o dogfood), `CLAUDE.md` + este HANDOFF.

### Achado de ambiente, não do código: toolchain Rust ausente e schannel bloqueando cargo

Este ambiente não tinha Rust instalado (nem em Bash nem em PowerShell, sem `~/.cargo`/`~/.rustup`). Sem resposta do usuário a tempo sobre como proceder, segui a opção recomendada (reversível, sem tocar no projeto): instalei via `rustup-init.exe` (download por `Invoke-WebRequest`, instalação padrão de usuário, sem admin). **Achado 1:** o toolchain MSVC padrão (`stable-x86_64-pc-windows-msvc`) não linka nesta máquina — falta o Visual C++ Build Tools (`link.exe`), instalação pesada demais para este propósito. Troquei para `stable-x86_64-pc-windows-gnu` (via `rustup toolchain install` + `rustup default`), que já vem com o linker MinGW embutido — build+run confirmados com um crate hello-world descartável antes de tocar no crate real. **Achado 2:** `cargo` (schannel do Windows) falhava toda operação de rede com `CRYPT_E_NO_REVOCATION_CHECK` — mesma classe de limitação já documentada neste `CLAUDE.md` pra boto3/node-gyp. Contornado com `CARGO_HTTP_CHECK_REVOKE=false` (variável de ambiente, workaround documentado oficialmente pelo próprio cargo pra esse erro específico). **Achado 3, cosmético:** `cargo build`/`test` imprimem um aviso "Acesso negado" ao tentar finalizar o diretório de cache de compilação incremental — não afeta o resultado (build/test completam com sucesso), só torna rebuilds um pouco mais lentos; contornado nas chamadas seguintes com `CARGO_INCREMENTAL=0`. Nenhum desses 3 achados é specífico do código deste crate — são do ambiente, registrados aqui pra próxima sessão não perder tempo redescobrindo.

**Pendência explícita, não escondida (restrição do usuário: "isso fica registrado no HANDOFF como pendência, não como gambiarra silenciosa"):** o CI existente do repositório (GitHub Actions, Playwright/Node) **não tem toolchain Rust configurado**. `cargo test` roda hoje só localmente, nesta máquina, com as 3 variáveis de ambiente acima setadas manualmente a cada sessão de shell (não persistem entre chamadas de ferramenta). Adicionar Rust ao CI é trabalho de infraestrutura fora do escopo desta Fase 1 (que pedia só o protótipo local) — decisão de quando fazer isso fica para quando `vc-secret-guard` for além do "protótipo" (provavelmente Fase 2, hooks).

### Dogfood contra o próprio repo Vision Core — resultado bruto, revisado item a item

Primeira rodada (sem policy, regex original): **25.657 achados** — `high_entropy_blob` 25.626, `credential_field` 16, `provider_key_prefix` 9, `connection_string` 8, `bearer_token` 2.

**Os 35 achados não-`high_entropy_blob` foram revisados um por um, manualmente, lendo o arquivo de origem antes de qualquer conclusão** (não assumido). Nenhum é um secret real novo. Breakdown:
- 2 bugs reais de regex, corrigidos no código (não no achado):
  - `provider_key_prefix` (`\b[a-z]{2,5}-[A-Za-z0-9]{20,60}\b`) era genérico demais — batia em `tools/_archive/root-deploy/_deploy100_eb.py:20` (`pos-renderApplyFixPanel`, nome de hook, nada a ver com secret) e em 3 arquivos `tools/_archive/tests/tools-root/*.test.mjs` (`snap-id-000000000000000000000000`, ID de snapshot zerado). Corrigido: tabela curada de prefixos conhecidos (`sk|pk|ak|rk|gh|gl|xox`) em vez de "qualquer 2-5 letras minúsculas" — alinhado ao texto original da spec §6 ("prefixos CONHECIDOS", "tabela de prefixos"), não uma mudança de escopo.
  - `connection_string` não excluía interpolação de variável — `.github/workflows/mirror-to-gitlab.yml:40` tem `"https://oauth2:${GITLAB_TOKEN}@gitlab.com/..."`, onde `${GITLAB_TOKEN}` é populado em runtime a partir de `secrets.GITLAB_MIRROR_TOKEN` do GitHub Actions (confirmado lendo o workflow inteiro, linhas 1-42) — nunca um literal no arquivo. **Isto NÃO é o incidente real do GitLab que motivou a feature** (aquele foi uma URL de `git remote -v` com credencial de verdade embutida, fora deste repo) — é um falso positivo do regex batendo numa sintaxe de CI legítima. Corrigido: `looks_like_variable_reference()` exclui `${VAR}`/`$VAR`/`%VAR%` do que conta como "senha capturada", mesmo princípio já usado por `credential_field` pra `process.env.X`.
- 1 achado real, mas não novo e deliberadamente não suprimido: `frontend/assets/vision-core-clean-runtime.js:6301,6323` tem `password: '[REDACTED_LEGACY_AUTH_FALLBACK]'` hardcoded — usado num fluxo de auto-registro de conta demo no bundle **legado, já público** (servido via CDN a qualquer visitante antes desta sessão — não é uma exposição nova). Não é da classe dos incidentes que motivaram a feature (não é uma chave de API, não é uma credencial administrativa) mas é, tecnicamente, um literal de senha hardcoded — **deixado visível de propósito no `.vc-secret-guard.toml` raiz** (não allowlistado), pra decisão humana explícita, conforme instrução "se flagrar algo real, PARE e me reporte antes de qualquer ação". Um comentário em `tools/_archive/root-tests/_test145_auth_unit.cjs:26` cita a mesma string, mas cai dentro do allowlist geral de `tools/_archive/*` (redundante com o achado já visível acima, não esconde informação nova).
- O resto (30 achados) são todos fixtures/testes pré-existentes, desenhados de propósito para conter segredos sintéticos e testar a própria detecção de segredos do produto — confirmados lendo cada arquivo: `_fixture_stress/src/level3_security.py:6` (fixture do próprio go-core pra `AEGIS_SECRET_010`, já documentada em `CLAUDE.md` §133), `go-core/internal/patcher/operations_test.go:207` e `go-core/internal/planning/rule_mapping_test.go:292` (testes Go do próprio go-core pra sua lógica de redação), `stress-test-vision-core.cjs:396,485` (senha de teste `stress123` pra criar contas descartáveis no stress test), `scripts/stress-test-sf-vision-core.js:523` (payload de teste da Software Factory pra validar que ela detecta `ANTHROPIC_API_KEY`/`postgresql://...` expostos — mesmo caso do achado SF-STRESS-09 já documentado em `about.html`), `tools/tests/provider-vault-endpoints.test.mjs:81,106` (chaves fake pra testar o masking do AI Provider Vault), `tools/_archive/root-reports/vision-core-frontfix.patch:210` (`"demo-token-" + Date.now()`), e os fixtures/testes/spec do próprio `vc-secret-guard` (esperado — documentados em `tests/fixtures/README.md`).

### Allowlist raiz — de 25.657 pra 1.408, honestamente, sem forçar zero

Depois dos 2 fixes de regex + `.vc-secret-guard.toml` (cada entrada revisada individualmente antes de entrar, comentada no próprio arquivo — nenhuma suprimida "no escuro"): **1.408 achados restantes**, dos quais 1.406 são `high_entropy_blob` e 2 são o achado real do `[REDACTED_LEGACY_AUTH_FALLBACK]` (deliberadamente não suprimido, ver acima).

**Amostrado manualmente pra confirmar que não é secret escondido:** `backend/server.js` (43 achados, o maior arquivo de produção ainda no ruído) — lido o contexto de cada linha, todos são nomes de função/identificador camelCase longos (`passGoldCandidateFromResult`, `normalizeEvidenceReceipt`, etc.) que por acaso misturam classes de caractere o suficiente pra passar no heurístico de entropia. Nenhum secret. `.vision-snapshots/*` (o maior bloco antes de entrar no allowlist, 720 arquivos) é hash SHA-256 de conteúdo (campo `"hash"` de snapshot de backup do Vision Agent) — confirmado lendo um arquivo de exemplo, allowlistado.

**Decisão consciente de não forçar o resto pra zero:** os 1.406 `high_entropy_blob` restantes (`frontend/assets` 666, `tools/*.mjs` de governança ~150, `backend/*.js` diversos, docs longos) seguem o mesmo padrão confirmado em `backend/server.js` — identificador de código, não secret. Continuar caçando cada um individualmente neste turno seria desproporcional (a heurística de entropia contra código-fonte real de linguagem com identificadores longos é imprecisa por natureza — esse é o limite real, não falta de allowlist). Reportado honestamente como **não-zero**, em vez de forçar um allowlist gigante e genérico demais que arriscaria esconder um secret real futuro atrás de um padrão amplo demais. Candidatos a próximo passo (não decisão tomada): (a) heurística de `high_entropy_blob` mais contextual (só perto de atribuição/aspas, como `credential_field` já faz), (b) allowlist incremental conforme uso real em hooks/watch (Fase 2/3), não uma tentativa de cobrir o repo inteiro de uma vez.

### Validação final

`cargo test` (crate): 43/43 PASS após os 2 fixes de regex (incluindo os novos testes de regressão que travam especificamente os 2 bugs achados no dogfood). Suíte permanente Playwright (Next, não tocado nesta sessão): **25/25 PASS**, rodada de novo antes do commit final pra confirmar zero impacto. `AGENT_APPLY_ENABLED` e as travas `sf_options` seguem `false` (nenhum arquivo do Next/backend tocado).

### Próxima etapa — Fase 2 (hooks locais), só com nova aprovação

Spec §10: `install-hooks`, `pre-commit`/`pre-push` fail-closed, testado contra um repositório git de teste descartável. **Não começar sem o usuário autorizar explicitamente esta fase** — mesmo padrão das fases anteriores (autorização em bloco não cobre automaticamente a próxima fase). Antes de começar, também vale decidir com o usuário: (a) se a heurística de `high_entropy_blob` deve ficar mais contextual antes de virar hook (reduzir ruído em `pre-commit` real), (b) o que fazer com o achado do `[REDACTED_LEGACY_AUTH_FALLBACK]` (fora do escopo do vc-secret-guard em si — é uma decisão de produto sobre o bundle legado).

---

## Sessão `vc-secret-guard` Fase 0 (spec-only) — 2026-07-09 (histórico)


## Sessão `vc-secret-guard` (spec-only) — 2026-07-09

Nova feature oficial, **fase 0/6 (spec) fechada, nenhuma fase seguinte autorizada**. Motivada por 2 incidentes reais do projeto: token GitLab exposto em `git remote -v`, e `agent_secret` vazando via `GET /mission/result/:id` (já documentado e corrigido — ver seção "Pareamento por `agent_secret`" em `CLAUDE.md`).

**Entregue nesta sessão (3 commits isolados, todos pushados):**
1. `10e27403` — `docs/VC_SECRET_GUARD_RUST_SPEC.md`: spec completa. Arquitetura real do projeto verificada no código antes de escrever (não presumida) — `server.js`=gateway (`resolveGoBinary()` `server.js:2444`, `GET /api/go-core/health` `server.js:1612-1613`), `go-core`=safe core com Aegis (`internal/scanner/scanner.go`=read-only, `internal/patcher/supervised.go`=nunca automático, `internal/passgold`+`internal/passsecure`=contratos JSON com exit code, `internal/github/open_pr.go`=write-gate com 4 condições, `internal/mcpserver`=read-only por design, `internal/security/secrets/secrets.go`=regras `AEGIS_SECRET_001`…`010` já existentes). Decisão "Rust vs módulo Go" comparada honestamente dos dois lados (não só a favor da conclusão já tomada) — fronteira final: guard decide "isso pode entrar no git agora?" no momento local; Aegis decide "esse código está seguro pra ser promovido?" dentro de uma missão já em andamento sobre o projeto inteiro. Zero sobreposição. 5 categorias de detecção descritas por forma/heurística, nunca lista fixa de strings. Plano de 6 fases (0=spec/esta, 1=protótipo local, 2=hooks, 3=watch+evento JSON, 4=integração `server.js`/Next, 5=ponte `PASS SECURE`), cada uma com gate de saída próprio.
2. `2da2be36` — `CLAUDE.md`: seção "SPEC OFICIAL — vc-secret-guard (Rust)" com link + resumo, inserida antes da seção "Atomic Core — APROVADO".
3. `99bfc545` — Páginas públicas, **seguindo o padrão editorial já existente** (reportado antes de editar, não presumido): `frontend/about.html` ganhou `BLOCO 2.6: SECURITY LAB — vc-secret-guard`, mesma estrutura visual do `BLOCO 2.5: AGENTE ARQUITETO` (2 colunas, mesmo grid/card style), mas com badge `SPEC — NÃO IMPLEMENTADO` (vermelho) em vez de `LIVE — PREVIEW` (índigo) — honesto sobre zero código existir, seguindo a mesma disciplina que rege "O QUE OS TESTES REVELARAM" (nunca declarar resolvido sem teste real). `frontend/landing.html` ganhou 1 card `bn-card bn-low`/label `EM EVOLUÇÃO` na seção TRANSPARÊNCIA TÉCNICA, mesmo formato dos outros itens de roadmap ainda não resolvidos. **Confirmado por grep, zero string literal de padrão de detecção de secret em qualquer um dos dois arquivos** (só nomes de regra tipo `AEGIS_SECRET_001` como rótulo, nunca o padrão em si) — os poucos matches de `sk-`/`sk_test_`/etc. encontrados no grep de verificação são todos conteúdo pré-existente não relacionado a esta sessão (depoimentos antigos, ofuscados/fictícios como `sk-prod-abc123xyz789`).

**Estrutura das páginas públicas, como relatado antes de editar (Tarefa 3 pedia isso explicitamente):** `about.html` já tinha um padrão de 3 tipos de bloco reaproveitados — blocos de feature "o que X faz hoje" (BLOCO 1/2/2.5, 2 colunas, badge de status), uma grade grande de depoimentos "O QUE OS TESTES REVELARAM" (card por bug real encontrado via teste real, nunca especulativo), e um roadmap "POTENCIAIS DE EVOLUÇÃO" (badge `ROADMAP — NÃO IMPLEMENTADO`, texto simples sem teste). Como `vc-secret-guard` tem uma spec formal completa (mais que um item de roadmap vago, mas menos que uma feature testada), a decisão foi criar um bloco de feature igual ao `BLOCO 2.5` só que com um badge honesto novo (`SPEC — NÃO IMPLEMENTADO`) — não usar a grade de depoimentos (reservada a bugs reais de testes reais) nem deixar só como item de `POTENCIAIS DE EVOLUÇÃO` (já tem spec, não é mais só ideia vaga). `landing.html` segue o padrão já documentado no próprio `CLAUDE.md` ("PADRÃO DE REGISTRO"): card `EM EVOLUÇÃO` até virar `RESOLVIDO — VX.X.X` com teste real certificando.

**Validação:** suíte permanente completa (4 specs Next, 25/25 PASS) rodada de novo antes do commit final — nenhum dos 3 commits desta linha toca `frontend/vision-core-next.html`/`assets/vision-core-next-clean.*`, então era esperado zero impacto, confirmado. `node -e` confirmou os dois HTMLs públicos ainda são JS/texto válido (sem parse error introduzido). Nenhum deploy feito (páginas públicas exigem validação local antes, regra já existente no `CLAUDE.md`, e o usuário não pediu deploy nesta tarefa — só "commit por fatia... push... HANDOFF... PARE").

**Zero Rust escrito. Zero backend (`server.js`/`go-core`) tocado. Zero deploy. Nenhuma fase além da 0 autorizada — próxima fase (protótipo local) exige nova conversa e aprovação explícita.**

---

## Decisão de produto desta sessão (fixar, não reabrir sem novo motivo do dono do produto)

**"Animação = marca; controle de acessibilidade é do VC, não do OS."**

O fix `v47` (sessão anterior) tinha o Atomic Core degradando automaticamente sempre que o SO reportava `prefers-reduced-motion: reduce`. O usuário corrigiu essa direção: a animação do Atomic Core é identidade visual do Vision Core, e o produto deve ter controle **próprio** de acessibilidade — o SO não decide por ele. Regra nova, implementada nesta sessão:

1. **Fonte de verdade = `window.VCMotion`** (`frontend/assets/vision-core-next-clean.js:1-44`), backed by `localStorage['vc_animation_mode']` (`'full'` | `'reduced'`). API: `getMode()`, `isReduced()`, `setMode(mode)`, `onChange(cb)`.
2. **Default = `'full'`**, sempre — mesmo com o SO em reduce. Nenhum código de animação lê `matchMedia('(prefers-reduced-motion...)')` diretamente para decidir o que animar (as únicas 2 exceções legítimas, confirmadas por grep no JS servido em produção: o blink do olho/logo — área protegida, decisão de UX aprovada em sessão anterior, fora do escopo desta mudança — e a dica de primeira visita do item 4 abaixo, que só decide se mostra um aviso, nunca o que animar).
3. **Modo reduzido** (quando o usuário escolhe via Settings): mesmo pulso sutil de opacidade/glow do `v47` (nunca congelado) — não foi redesenhado, só re-acoplado a uma fonte de verdade diferente.
4. **Troca ao vivo, sem reload:** `startMotionLoop()`/`stopMotionLoop()` (`vision-core-next-clean.js:1788-1806`) são reinvocáveis — `VCMotion.onChange` dispara a troca do loop (rAF ↔ tick de 500ms) na hora.
5. **Settings → Animações** (`#vcAnimationReduced`, dentro de `#vcSettingsPanel`): novo checkbox, único ponto de UI para o controle. Nenhum controle equivalente existia no front antigo nem em nenhum outro lugar do Next — confirmado por grep exaustivo antes de implementar (`vision-core-bundle.js`, `vision-core-clean-runtime.js`, `vision-core-clean-state.js`, Next JS/HTML) — é funcionalidade nova, não portada.
6. **Dica de primeira visita (opcional, discreta):** se o SO reporta reduce E o usuário nunca escolheu um modo no VC, uma mensagem única no chat (`ACESSIBILIDADE`) aponta o Settings → Animações — consciência, não imposição. Guardada por `localStorage['vc_motion_hint_shown']`, dispara só 1x.
7. **Badge de conexão do agente:** não tinha nenhuma lógica de animação/`matchMedia` prévia (confirmado por grep em sessão anterior) — `window.VCMotion` está disponível globalmente para ele ou qualquer widget futuro consumir, mas não havia comportamento a migrar.

---

## Estado Atual

- **Commit local = commit remoto (`origin/main`):** `99bfc545` — `docs(public): registra vc-secret-guard nas paginas publicas (spec-only)`. Já pushado (rebase limpo sobre commits do bot de CI, sem conflito). Precedido por `2da2be36` (CLAUDE.md) e `10e27403` (spec) na mesma sessão — 3 fatias isoladas, todas docs-only.
- **`vc-secret-guard`:** fase 0/6 (spec) fechada — `docs/VC_SECRET_GUARD_RUST_SPEC.md`. Zero Rust, zero backend tocado, zero deploy. Ver seção própria abaixo.
- **Cache-bust atual:** `?v=next-clean-48` (HTML+CSS+JS, os três juntos).
- **Produção (`https://visioncoreai.pages.dev`):** **`next-clean-48`**, deploy CF Pages, verificado por **fetch real via `node -e fetch(...)`** antes de reportar (não assumido) — hash `https://65c71559.visioncoreai.pages.dev` (status 200) e alias principal (status 200), os dois com `?v=next-clean-48`, `AGENT_APPLY_ENABLED=false` confirmado no JS servido, `window.VCMotion`/`vc_animation_mode`/`startMotionLoop` confirmados presentes, exatamente 2 ocorrências de leitura direta de `matchMedia('(prefers-reduced-motion: reduce)')` no JS servido (olho/blink protegido + dica de primeira visita — nenhuma leitura a mais, nenhuma a menos), CSS servido confirmado com `.vc-settings-motion`. **Backend EB não foi tocado.**
- **`AGENT_APPLY_ENABLED=false`** e todas as travas `sf_options` (`real_execution_allowed`/`deploy_allowed`/`writes_disk`) continuam `false`.
- **5 specs permanentes, 25/25 PASS:** `vision-core-next-agent-apply.spec.mjs` (4), `vision-core-next-sf.spec.mjs` (9), `vision-core-next-apply-fix.spec.mjs` (7), `vision-core-next-atomic-core.spec.mjs` (5 — **reescrito nesta sessão**, agora servido via `http.createServer` local em vez de `file://`).
- **`docs/PARITY_AUDIT.md`** sem mudanças nesta sessão — próxima etapa continua sendo os 2 itens reais restantes (ver seção abaixo).

---

## O que esta sessão fez

Correção de direção de produto pedida pelo usuário (ver seção acima). Trabalho puramente aditivo/re-acoplamento, sem mudar o comportamento visual do modo reduzido em si:

1. Criado `window.VCMotion` no topo de `vision-core-next-clean.js` — único ponto de leitura/escrita do modo de animação.
2. Atomic Core: `reduceMotion` inicial passou a ler `isReducedMotion()` (VCMotion) em vez de `matchMedia` direto. Bootstrap do loop refatorado em `startMotionLoop()`/`stopMotionLoop()` reinvocáveis, com `VCMotion.onChange` acoplado para trocar o loop ao vivo sem reload.
3. Settings: novo bloco `.vc-settings-motion` em `#vcSettingsPanel` (HTML) + checkbox `#vcAnimationReduced` (JS, lê/escreve via `VCMotion`) + CSS a partir da âncora `.vc-settings-list` já existente no arquivo.
4. Dica de primeira visita implementada conforme item 4 da instrução — único outro lugar do arquivo que lê `matchMedia` diretamente, só para decidir se mostra o aviso.
5. `tests/e2e/vision-core-next-atomic-core.spec.mjs` **reescrito por completo**: agora sobe um `http.createServer` local descartável servindo `frontend/` (nunca `file://`) dentro do próprio spec (`test.beforeAll`/`afterAll`), porque a regra nova depende de combinar dois inputs reais e independentes — `page.emulateMedia()` (sinal do SO) e `page.addInitScript(() => localStorage.setItem(...))` (escolha do VC) — de forma confiável, o que exige um `origin` http real (mesma disciplina empírica já estabelecida na sessão do `v47` sobre `page.emulateMedia()` vs `test.use()`). 5 testes: (a) default+OS-reduce roda completo, (b) default+no-preference roda completo, (c) VC=reduced vence sobre OS=no-preference, (d) troca ao vivo via checkbox sem reload (full→reduced→full), (e) transição de estado sob VC=reduced sem crash.
6. Cache-bust `v48`, commit (`ecf1fadc`, rebase sobre o commit do bot de CI sem conflito), push, deploy, verificação por fetch real (hash + alias).

---

## Próxima etapa

### 0. `vc-secret-guard` — Fase 1 (protótipo local), só com aprovação explícita nova

Spec fechada (`docs/VC_SECRET_GUARD_RUST_SPEC.md`, fase 0/6). Fase 1 = binário Rust mínimo, só `scan` (sem `watch`, sem hooks), rodando localmente contra o próprio Vision Core, nunca publicado/CI. Gate de saída da Fase 1 (definido na spec, §10): zero falso-positivo contra o repo real após allowlist configurada + zero falso-negativo contra casos sintéticos cobrindo as 5 categorias. **Não iniciar sem o usuário autorizar explicitamente esta fase especificamente** — é uma linha de trabalho nova (nova linguagem no projeto, novo binário), tratada com o mesmo rigor que Auth (item abaixo).

### Itens restantes da categoria B (Vision Core Next)

#### 1. Software Factory — `project-files` + `generate-zip` (contratos já verificados, prontos pra usar)

| Endpoint | Linha | Tipo | Contrato |
|---|---|---|---|
| `POST /api/sf/project-files` | `server.js:4576` | **Assíncrono** (`job_id`+poll), payload/resposta diferentes dos outros passos | Body: `{description, accumulated_context, step1_analysis, step2_blueprint}` — não o `{description, module, autopilot, step, total_steps, sf_options}` padrão. Ramifica por complexidade (`_detectComplexity`) em prompts longos (§193/A2). No `GET /api/sf/job/:id`, o resultado vem em **`data.files[]`, não em `data.result`** — único endpoint SF onde isso acontece de verdade. |
| `POST /api/sf/generate-zip` | `server.js:4700` | **Síncrono, resposta binária** | Body: `{files: [{name, content}], project}`. Resposta é um stream ZIP real (`Content-Type: application/zip`), não JSON — frontend precisa tratar como download de blob (`response.blob()` + `URL.createObjectURL` + `<a download>`, padrão ainda não usado em nenhum lugar do Next). Depende logicamente de `project-files` já ter rodado, mas o backend não impõe a ordem. |

Sugestão (não é decisão tomada): um só turno, os dois juntos — fazem sentido como par (gerar lista de arquivos → baixar como zip), não como features separadas.

#### 2. Auth (registro/login/OAuth Google+GitHub) — não iniciar sem alinhamento explícito

Mais arriscado do roadmap inteiro — mexe com sessão de qualquer usuário, token HMAC caseiro sem endpoint de refresh. Repetido em pendências de múltiplas sessões anteriores. Continua precisando de decisão explícita do usuário antes de começar.

### Fora de escopo, decisões já tomadas (não revisitar sem novo motivo)

- **Deploy dropdown** — bloqueado pela SPEC (seção "FORA DE ESCOPO"). Decisão de escopo do usuário.
- **Vault rollback como "paridade"** e **Billing checkout UI** — o legado nunca teve essas UIs também; não são lacunas de migração, seriam escopo novo se o usuário quiser.
- **13 itens candidatos a não migrar** (`docs/PARITY_AUDIT.md` seção c) — evidência forte de código morto, mas nenhuma exclusão sem aprovação explícita.
- **Olho/logo (blink)** — protegido, aprovação explícita necessária mesmo para ajustes pequenos. Não tocado nesta sessão, deliberadamente: a regra nova de `VCMotion` não foi estendida até lá.

---

## Comandos executados relevantes desta sessão

```bash
node --check frontend/assets/vision-core-next-clean.js
node --check tests/e2e/vision-core-next-atomic-core.spec.mjs

npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs tests/e2e/vision-core-next-apply-fix.spec.mjs tests/e2e/vision-core-next-atomic-core.spec.mjs --reporter=list
# => 25 passed

git stash push -- test-results   # deletions pré-existentes no working tree, não relacionadas a esta sessão
git rebase origin/main            # via PowerShell — pegou o commit do bot de CI, sem conflito
git stash pop
git push origin main              # via PowerShell — Bash sem rede pra github.com neste ambiente

bash bin/deploy-pages.sh "..."    # via Bash — CF Pages tem rede via Bash (diferente de github.com)

# Verificação pós-deploy (Bash + node fetch, curl direto retornou 000 nesta rede):
node -e "fetch(url).then(r=>r.text()).then(t=>{...})"
```

---

## Riscos/Alertas ativos

1. **[BAIXO] `git push`/`fetch` para GitHub exigem PowerShell neste ambiente** — Bash não tem rota de rede pro GitHub. **Achado novo desta sessão:** Bash TEM rede para Cloudflare Pages (`bash bin/deploy-pages.sh` funcionou direto) e para fetch geral via `node -e "fetch(...)"` — só `curl` direto no Bash retornou `000` (sem rota); `node fetch` funcionou normalmente. Ou seja, a limitação de rede do Bash é por ferramenta/host, não universal — testar com `node -e fetch` antes de assumir que uma verificação precisa ir para PowerShell.
2. **[BAIXO] CI bot colide com push toda sessão até agora** — sempre `docs/STRESS-TEST-*`/`docs/CI-LAST-RUN.md`, fast-forward/rebase resolve sem conflito. Nesta sessão havia também deletions pré-existentes e não relacionadas em `test-results/` no working tree, que bloqueiam `git rebase` (exige árvore limpa) — resolvido com `git stash push -- test-results` antes do rebase e `git stash pop` depois, sem tocar no conteúdo dessas deletions (não são desta sessão, não avaliadas).
3. **[INFO] `docs/CODEX_PROMPT.md`** duplica conteúdo deste HANDOFF — não removido, só anotado.
4. **[INFO] `fetch-url` é SSRF-capable por design** (comportamento pré-existente do backend, não novo).
5. **[INFO] `generate-zip` será o primeiro lugar no Next tratando resposta binária** (não-JSON) — ver contrato na seção "Próxima etapa" acima.
6. **[INFO] Nenhum outro elemento do Next foi auditado quanto a "congelar sob reduced-motion"** além do Atomic Core e o blink do olho/logo (ambos já corrigidos/confirmados). Esta sessão inverteu a fonte de verdade só para o Atomic Core — se o roadmap trouxer outros widgets animados, decidir com o usuário se `VCMotion` deve ser estendido a eles também, não presumir.
7. **[INFO] Debris pré-existente segue solto no working tree, não commitado** (`frontend/_test_here.txt`, `frontend/next.html`, `frontend/atomic-core.html`, `frontend/assets/atomic-core.{css,js}`, `frontend/assets/vision-core-next.{css,js}`, `opencode.json`, `docs/SOFTWARE_FACTORY_INFOGRAFICO.html`) — `bin/deploy-pages.sh` já sanitiza os arquivos de `frontend/` antes de publicar (confirmado lendo o script), então não vaza pro deploy. Não limpo nesta sessão por não ser do escopo pedido; candidato a limpeza futura com aprovação explícita.

---

## INCIDENTE-3: credencial de fallback do auth legado — investigação (Fase A, 2026-07-09)

**Escopo desta seção:** investigação read-only + registro de decisão pendente. Nenhum código, backend, go-core, bundle legado, Next, deploy script ou página pública foi alterado nesta fase. O valor literal da credencial foi omitido neste HANDOFF por política; ele permanece apenas nos arquivos onde já existia até a Fase B aprovada.

### Baseline antes da investigação

- HEAD verificado: `13404d28 docs: HANDOFF - registra sessao doc-only do catalogo do legado`.
- `git log -3`: `13404d28`, `33df8e01`, `f3027f94`.
- `test-results/` tinha deleções locais rastreadas; foram restauradas antes da investigação. Depois disso, restaram apenas untracked pré-existentes já documentados em sessões anteriores (`docs/SOFTWARE_FACTORY_INFOGRAFICO.html`, protótipos `frontend/atomic-core.html`/`frontend/next.html`, assets paralelos, `opencode.json`). Nenhum desses foi tocado.

### Mapa de ocorrências (valor omitido)

Busca usada: `rg -n -i -uu --glob '!.git/**' <fallback-com-hifen-ou-underscore> .` (valor omitido por política).

- `.vc-secret-guard.toml:13,64` — comentários/policy do guard registrando o achado.
- `CLAUDE.md:225` — registro histórico do dogfood do `vc-secret-guard`.
- `backend/server.js:756,758` — tratamento server-side especial no `/api/auth/register`.
- `docs/CURRENT_HANDOFF.md` — menções históricas agora redigidas nesta seção/documento.
- `docs/LEGACY_DESIGN_REFERENCE.md:14-15,151` — doc-only citando o bundle real e o runtime abandonado.
- `frontend/assets/vision-core-bundle.js:10289,10290,10317,10318,10341,10343,10353` — bundle real carregado pela raiz de produção.
- `frontend/assets/vision-core-clean-runtime.js:6301,6323` — fork/runtime abandonado, não carregado por página oficial, mas contendo o mesmo literal.
- `tools/_archive/root-deploy/_deploy145_eb.py:23` — assert de deploy arquivado.
- `tools/_archive/root-tests/_test145_auth_unit.cjs:22,26,38` — teste arquivado da correção §145.
- `tools/_archive/root-tests/_test151_scrypt_unit.cjs:53,54,57` — teste arquivado de hash/verify.

### Fluxo reconstituído

1. `frontend/index.html:2798` carrega `assets/vision-core-bundle.js`, portanto o fluxo afetado está no bundle público real.
2. No bundle, `doAuth()` lê o email do modal de autenticação. Se não houver senha salva em `localStorage['vc_user_pw_' + email]`, usa a credencial de fallback como senha enviada para `POST {BACKEND_URL}/api/auth/register`.
3. Se o registro retorna `ok:true`, o frontend salva `data.token` em `sessionStorage.vc_token` e `localStorage.vision_token`, salva `data.generated_password` em `localStorage['vc_user_pw_' + email]`, e mostra o badge de usuário.
4. Se o registro falha (por exemplo, email já existente), o bundle tenta `POST /api/auth/login` com a senha salva ou, se ausente, com a credencial de fallback. Se uma senha salva falhar e ainda não era o fallback, ele faz retry final com o fallback.
5. Backend atual (`backend/server.js:752-768`): `/api/auth/register` reconhece a credencial de fallback como marcador de fluxo só-email. Quando esse marcador chega, o backend NÃO armazena esse literal para novos usuários; gera `crypto.randomBytes(8).toString('hex')`, salva hash scrypt desse valor aleatório, emite cookie/token de sessão e retorna `generated_password` ao frontend.
6. Backend atual (`backend/server.js:771-787`): `/api/auth/login` não tem bloqueio especial para o fallback. Ele passa a senha recebida para `verifyPassword()`. Portanto, se existir conta antiga cujo `password_hash` foi criado com o fallback antes da correção §145, login com o valor público ainda autentica e emite token.
7. Tokens emitidos por registro/login são HMAC via `signSession()` (`backend/server.js:378-389`) e validados por `getAuthUser()` (`backend/server.js:405`). Com token válido, o usuário acessa `/api/auth/me` (`backend/server.js:851-855`), estado de billing (`backend/server.js:2326+`), quota/timeline autenticadas (`backend/server.js:1252-1280`) e qualquer fluxo que aceite `Authorization: Bearer`/cookie de sessão. Não há evidência de privilégio administrativo automático; o plano padrão é `free`.
8. `go-core`: não há ocorrência exata da credencial de fallback e não há validação dela no runtime Go. Referências a auth/password em go-core são regras/testes genéricos de segurança, sem aceitar esse valor.

### Histórico git

- `9cdb6534 feat(frontend): wire fake elements — file upload, auth modal, image reader, config btns` introduziu o frontend enviando a credencial de fallback diretamente para `/api/auth/register` e `/api/auth/login`. Nesse estado histórico, o backend armazenava `hashPassword(password)` do valor recebido; portanto contas criadas nesse intervalo podiam ficar com hash do fallback público.
- `aee512a4 feat(§145): auth badge + senha individual por usuario` mudou o backend: quando o fallback chega ao registro, gera senha individual aleatória, salva hash dela e retorna `generated_password` para o frontend persistir localmente.
- `067f834d fix(§145-hotfix2): login double-fallback` manteve compatibilidade de login tentando fallback para contas antigas.
- `2e9384db` e `748f7225` apenas moveram testes/scripts para `tools/_archive/`, sem mudar o comportamento de autenticação.
- Não encontrei evidência local de rotação/invalidação das contas antigas potencialmente criadas com o fallback antes de §145. Verificar isso em produção exige inspeção controlada do `users.json`/S3 ou rotina server-side que teste hashes sem expor o valor em logs.

### Classificação

**Classificação: (a) ATIVA.**

Evidência:
- O bundle real público ainda envia o fallback para endpoints de auth quando não há senha local salva (`frontend/assets/vision-core-bundle.js:10289-10353`).
- O backend atual reconhece esse valor no registro e concede sessão para conta nova, embora substitua o literal por senha aleatória antes de persistir (`backend/server.js:756-768`).
- O backend atual também pode autenticar conta antiga se o hash salvo corresponder ao fallback, porque `/api/auth/login` usa `verifyPassword(password, user.password_hash)` sem rejeitar esse marcador (`backend/server.js:771-787`).
- O acesso concedido é sessão de usuário `free`, não admin/root, mas ainda é credencial pública acionando fluxo autenticado real.

### O que falta verificar fora do repo

- Se produção ainda tem usuários antigos cujo `password_hash` valida contra o fallback. Como `USERS_DB` real vem de S3/EB e não está neste checkout local (`data/` só contém `agent-queue.sqlite`), isso não é verificável read-only no repo.
- Se existem sessões ativas emitidas por login/registro usando esse caminho. Sem acesso à blacklist/session store/secret de produção, não dá para distinguir tokens por origem localmente.

### Opções de remediação (NÃO executadas)

1. **Opção A — invalidação server-side primeiro (recomendada para classificação ATIVA):** antes de remover do bundle, auditar usuários de produção de forma controlada para detectar hashes compatíveis com o fallback, resetar/invalidar essas contas, e considerar rotação de `SESSION_SECRET` ou revogação ampla de sessões se houver indício de login ativo com esse caminho. Depois, alterar `/api/auth/register` e `/api/auth/login` para rejeitar explicitamente o fallback público em vez de tratá-lo como marcador válido. Só então remover o literal do bundle.
2. **Opção B — compatibilidade controlada:** substituir o fluxo por endpoint/flag explícito de cadastro sem senha que nunca aceite uma senha pública e nunca faça fallback de login. Ainda exige primeiro neutralizar contas antigas e sessões conforme Opção A.
3. **Opção C — remoção frontend apenas:** não recomendada para ATIVA. Remover do bundle antes de invalidar o backend só esconde o problema; versões antigas continuam no histórico, cache e CDN, e o endpoint ainda aceitaria chamadas manuais.

**Decisão pendente do usuário:** escolher a opção de Fase B. Nenhuma remediação foi aplicada nesta Fase A.
