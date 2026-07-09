# CURRENT HANDOFF — Vision Core Next

Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode). Leia depois de `CLAUDE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`, antes de editar código.

> Última atualização: 2026-07-09, por Claude Code (Sonnet 5) — **linha de trabalho nova, paralela ao Next**: spec oficial de `vc-secret-guard` (núcleo local de detecção de secrets em Rust), fase spec-only, zero implementação, zero deploy. Sessão anterior (Next): correção de direção de produto do Atomic Core (`v48`, animação = identidade visual, não controlada pelo SO).

---

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
