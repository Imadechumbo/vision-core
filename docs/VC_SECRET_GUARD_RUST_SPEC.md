# VC-SECRET-GUARD — Spec Rust

**Parte da série de arquitetura — leia `MASTER_SPEC.md` e `VISION_CORE_ARCHITECTURE.md` antes deste.**

> Versão: 2.0.0 · Criado originalmente 2026-07-09 (spec-only), Fase 1 e 1.5 fechadas na mesma data, consolidado no template da série em 2026-07-09
> Esta versão preserva 100% do conteúdo técnico da v1 (arquitetura, categorias de detecção, limites de segurança, plano de fases) e adiciona os campos padrão da série (Resumo/Escopo/Diagrama/Checklist).
> **Para o estado exato de cada fase (o que a última sessão testou), consulte `docs/CURRENT_HANDOFF.md`.**

---

## Resumo

`vc-secret-guard` é um núcleo local de detecção rápida de segredos/vazamentos em Rust, independente do `go-core`, rodando na máquina do desenvolvedor (pre-commit/pre-push/watch) — a 4ª peça real do stack do Vision Core, ao lado do backend Node.js, do `go-core` e dos frontends. **Fase 1 e 1.5 (protótipo local + refinamento de detecção) fechadas** — crate real, 57/57 testes `cargo test`, dogfood contra o repo real. Fase 2 (hooks git) ainda não autorizada.

## Objetivo

Pegar a classe de erro "credencial existia em algum estado do sistema antes de alguém perceber" **antes do commit**, não em auditoria manual posterior. Motivado por 3 incidentes reais do projeto (ver seção "Motivação").

## Escopo

`vc-secret-guard/` (crate Rust), `.vc-secret-guard.toml` (allowlist), comando `scan` (implementado); `watch`/`install-hooks`/`report`/`policy` são stubs planejados.

## Fora do escopo

Não modifica código, não remedia automaticamente (nunca chama API de revogação nem reescreve histórico git sozinho), não substitui o Aegis do `go-core` (fronteira explícita na seção 3), não roda em CI ainda (toolchain Rust não configurado no GitHub Actions).

---

## 1. Motivação — 3 incidentes reais

O Vision Core já teve três incidentes reais de exposição de credencial nesta base de código — nenhum causou dano em produção porque foi pego a tempo, mas os dois primeiros foram pegos *depois* do fato consumado:

1. **Token de acesso ao GitLab exposto na saída de `git remote -v`.** Descoberto por inspeção manual, não por ferramenta.
2. **`agent_secret` vazando de volta via `GET /mission/result/:id` (endpoint público, sem autenticação).** `POST /mission/result` fazia `{...body, received_at: now()}` ao persistir — o campo `agent_secret` ficava gravado no resultado, lido de volta sem autenticação. Corrigido destruturando o campo antes de persistir. Pego por revisão de segurança manual.
3. **Credencial de fallback pública aceita por `/api/auth/register`/`/api/auth/login` e enviada pelo bundle legado real.** Primeira ocorrência **detectada pela própria feature** — o dogfood da Fase 1 flagrou o mesmo literal em `vision-core-clean-runtime.js` (fork abandonado), achado que motivou a investigação que confirmou o mesmo literal no bundle real (`vision-core-bundle.js`). Nuance honesta: a heurística estruturada não bateu na forma exata usada no bundle real (`x.getItem(...) || 'literal'`, diferente de `credential_field`) — a confirmação foi por leitura manual, não por finding do scanner. Corrigido em backend + bundle.

**Motivação real:** identificar essa classe de erro antes do commit/push/deploy, não depois — nenhuma camada existente hoje roda continuamente no filesystem local nem no momento exato de um `git commit`.

---

## 2. Arquitetura real do projeto

```mermaid
graph LR
    DEV[Máquina do desenvolvedor] --> GUARD[vc-secret-guard<br/>Rust, local, CLI]
    GUARD -->|scan| FILES[Diff staged / arquivos alterados /<br/>.env, auth.json, histórico de shell]
    GUARD -->|evento JSON, futuro| EB[backend/server.js<br/>via endpoint novo, não implementado]
    EB -.futuro.-> PASSSECURE[go-core PASS SECURE]

    subgraph "Peças reais do stack"
        EB2[backend/server.js — gateway/API web]
        GC[go-core — safe core com Aegis]
        FE[frontend Next — cockpit web]
        GUARD
    end
```

| Peça | Papel | Onde vive |
|---|---|---|
| `backend/server.js` | Gateway/API web — recebe HTTP, autentica, orquestra LLM | AWS Elastic Beanstalk |
| `go-core/` | Safe Core — Aegis (scanner/patcher/passgold/passsecure), invocado como subprocesso | Binário local + CI |
| `frontend/vision-core-next.html` + assets | Cockpit web — chat, missões, GitHub PR, Software Factory | Cloudflare Pages |
| `vc-secret-guard` *(este documento)* | Binário local mínimo Rust, independente dos três acima | CLI local + git hooks |

### go-core em detalhe (Aegis, para a fronteira da seção 3)

- `go-core/internal/scanner/scanner.go` — read-only por design ("Responsabilidade: ler o projeto. NUNCA altera arquivos").
- `go-core/internal/security/secrets/secrets.go` — regras `AEGIS_SECRET_001`…`010` (chave AWS, secret AWS, token GitHub, PAT fine-grained, chave Stripe, etc.) — já existe hoje, roda como parte do scan de projeto do Scanner/Aegis.
- `go-core/internal/patcher/` — supervisionado, nunca automático.
- `go-core/internal/passgold/`, `passsecure/` — gates JSON com exit code.
- `go-core/internal/github/` — write-gate de 4 condições.
- `go-core/internal/mcpserver/` — read-only por design.

---

## 3. Por que Rust e não um módulo do go-core

### A favor de um módulo Go

- Reuso imediato de `PASS SECURE`, CLI, contratos JSON, detecção de secrets já existente (`AEGIS_SECRET_001`…`010`).
- Um binário a menos para instalar/atualizar/confiar.
- Um único vocabulário de segurança (`AEGIS_SECRET_*`).

### A favor de um binário Rust separado

- Watcher de máxima performance, sem GC, sem runtime overhead — caso de uso central é rodar em modo `watch` continuamente a cada save de arquivo.
- Binário isolado, sem dependência do `go-core` estar presente/saudável — hooks de git são instalados em *qualquer* repositório do usuário, não só o Vision Core; acoplar ao `go-core` significaria que um `go-core` quebrado trava o commit de qualquer repo com o hook instalado.
- Memória segura para um binário que roda com acesso de leitura amplo ao filesystem (histórico de shell, `.env`).
- Diferencial de produto: 3 linguagens (Node/Go/Rust) escolhidas por adequação ao problema, não por moda.

### Fronteira de responsabilidade (não há sobreposição)

| | `vc-secret-guard` | go-core Aegis |
|---|---|---|
| Quando roda | Pré-commit/pré-push/`watch` — no momento em que o secret entra no histórico | Como parte de um scan/missão de validação já em andamento |
| O que examina | Diff staged, arquivos alterados, caminhos sensíveis conhecidos | O projeto inteiro, como contexto de uma missão |
| O que faz com o achado | Bloqueia o commit/push ou alerta em tempo real | Reporta como finding dentro do relatório de missão; alimenta PASS GOLD/PASS SECURE |
| Modifica código? | Nunca — detecção pura | Não (scanner é read-only); remediação passa pelo `patcher` supervisionado, processo separado |
| Depende de quê | Nada além do próprio binário e filesystem local | Todo o pipeline go-core |

**Fronteira em uma frase:** `vc-secret-guard` decide "isso pode entrar no git?" no momento em que o desenvolvedor decide; go-core Aegis decide "esse código está seguro pra ser promovido?" como parte de uma missão mais ampla, depois que o código já existe no repositório.

**Ponte futura (não desta fase):** o evento JSON emitido em `watch` pode alimentar (1) `server.js` — alerta visível no Next (Missions/Security) — e (2) futuramente `PASS SECURE` do go-core, sem que uma peça precise saber que a outra existe.

## 4. Por que Rust (vs. alternativas descartadas)

| Linguagem | Veredito | Motivo |
|---|---|---|
| **Rust** | ✅ Escolhida | Binário único sem runtime/GC, memória segura por padrão, `regex`/`notify` maduros. |
| Python/PowerShell | ❌ Só protótipo | Exige runtime instalado; overhead de startup/execução inaceitável em `watch` contínuo. |
| C++ | ❌ Descartado | Resolveria performance igual, sem as garantias de memória segura que Rust dá de graça. |

---

## 5. Comandos (planejados vs. implementados)

```
vc-secret-guard scan [--path <dir>] [--format json|text] [--policy <file>]   EXISTENTE (Fase 1)
vc-secret-guard watch [--path <dir>] [--policy <file>]                       PLANEJADO — stub, código 2
vc-secret-guard install-hooks [--path <repo>]                                PLANEJADO — stub, código 2
vc-secret-guard report [--since <duration>] [--format json|md]               PLANEJADO — stub, código 2
vc-secret-guard policy [show|validate|init]                                  PLANEJADO — stub, código 2
```

Stubs imprimem "planejado" e saem com código 2 — nunca fingem sucesso.

## 6. Detecção por categorias (nunca lista fixa de strings)

| Categoria | Forma (shape, não literal real) | Estado |
|---|---|---|
| `provider_key_prefix` | prefixo curto conhecido (`sk`/`pk`/`ak`/`rk`/`gh`/`gl`/`xox`) + corpo alfanumérico longo | EXISTENTE, tabela curada desde Fase 1 (corrigiu falso-positivo genérico demais) |
| `bearer_token` | `authorization: bearer <token de alta entropia>` | EXISTENTE |
| `credential_field` | campo nomeado por convenção (`password`/`secret`/`token`/`api_key`/`private_key`) atribuído a literal, nunca a `process.env.X` | EXISTENTE |
| `high_entropy_blob` | entropia de Shannon acima de limiar, **restrito a posição de valor** (string literal ou lado direito de `=`/`:`) desde a Fase 1.5, penalizado por forma de identificador de código | EXISTENTE, refinado na Fase 1.5 |
| `connection_string` | `scheme://user:pass@host`, exclui interpolação de variável (`${VAR}`/`$VAR`/`%VAR%`) | EXISTENTE, corrigiu falso-positivo de CI na Fase 1 |
| `fallback_credential_literal` | `expr \|\| 'lit'` / `expr ?? 'lit'` / ternário-else / parâmetro-default, exige sinal de contexto de credencial em **código**, nunca em conteúdo de string | EXISTENTE, adicionada na Fase 1.5 (motivada pelo Incidente 3) |

**Allowlist configurável** por caminho (glob, sem `**` recursivo — limitação consciente documentada), hash de linha, ou categoria completa — `.vc-secret-guard.toml`, nunca hardcoded no binário.

**Caminhos monitorados por padrão:** `.env`/`.env.*`, `auth.json`/`credentials.json`/`secrets.yml`, histórico de shell — sempre dentro do escopo explícito apontado pelo usuário, nunca varredura automática de fora do diretório.

## 7. Regra anti-autoflagelo

Nenhuma página pública, nenhum material de marketing, e este documento não contêm um padrão que o próprio scanner flagraria como secret real — todo exemplo usa ofuscação explícita (`sk-***`, `AKIA****************`), nunca um valor sintaticamente capturável pela própria regex.

## 8. Integração futura (não implementada)

1. Git hooks fail-closed (`pre-commit`/`pre-push`) — Fase 2.
2. Evento JSON → endpoint novo em `server.js` → alerta visível no Next — Fase 4.
3. `PASS SECURE` do go-core considerando "evento não resolvido do guard local" como sinal adicional — Fase 5, pode concluir "não vale o acoplamento" e isso é saída válida.

## 9. Limites de segurança (obrigatórios, não negociáveis)

1. **O guard NUNCA transmite o valor do secret detectado** — categoria, caminho, linha, hash truncado opcional (só para dedup/allowlist, nunca reversível).
2. **Modo de emergência = orientar rotação/revogação, nunca automatizar** — nunca chama API de revogação nem reescreve histórico git sozinho.
3. **Nenhuma telemetria de conteúdo por padrão** — contagens agregadas são decisão futura opt-in, não parte do design padrão.

---

## Plano de fases e critérios de aceite

| Fase | Escopo | Gate de saída | Estado |
|---|---|---|---|
| 0 — Spec | Documento revisado e aprovado | Aprovação explícita registrada em HANDOFF | ✅ FECHADA |
| 1 — Protótipo local | Binário Rust mínimo, só `scan`, categorias da seção 6, allowlist funcional | Zero falso-positivo no repo real pós-allowlist; zero falso-negativo em fixtures sintéticas das 5 categorias originais | ✅ FECHADA (2026-07-09) — 43/43 testes, dogfood 25657→1408 achados, 2 bugs de regex corrigidos |
| 1.5 — Refinamento de detecção | Categoria `fallback_credential_literal` (motivada pelo Incidente 3) + `high_entropy_blob` restrito a posição de valor e penalizado por forma de identificador | Fixtures da Fase 1 continuam detectando; teste negativo explícito; dogfood honesto reportado | ✅ FECHADA (2026-07-09) — 57/57 testes, `high_entropy_blob` 1410→53 no dogfood (meta <50 não batida honestamente, reportado sem forçar supressão) |
| 2 — Hooks locais | `install-hooks`, `pre-commit`/`pre-push` fail-closed, testado contra repo git descartável | Hook bloqueia commit com secret sintético; não bloqueia commit limpo; timeout definido e testado | PLANEJADO — não iniciada, exige nova aprovação explícita |
| 3 — `watch` + evento JSON | Modo contínuo, JSONL sem valor de secret | Formato validado contra consumidor de teste; footprint CPU/memória medido | PLANEJADO |
| 4 — Integração `server.js`/Next | Endpoint novo (opt-in), alerta visível no Next | Anti-stub real, degradação graciosa se o guard não estiver instalado | PLANEJADO — requer decisão explícita antes de começar |
| 5 — Ponte PASS SECURE | Avaliação de acoplamento com go-core | Decisão de arquitetura documentada antes de qualquer código; "não vale o acoplamento" é saída válida | PLANEJADO |

**Nenhuma fase além da 1.5 está autorizada a começar.** Cada avanço exige autorização explícita registrada em sessão futura, protocolo de revezamento padrão (`CLAUDE.md`).

---

## Achados reais do dogfood — status atual

Nenhum destes foi suprimido/allowlistado — os corrigidos abaixo permanecem visíveis no histórico deste documento por transparência, os pendentes continuam visíveis no scan por decisão deliberada:

1. ~~`frontend/assets/vision-core-clean-runtime.js:6301,6323` — senha hardcoded~~ **CORRIGIDO** (limpeza de dogfood, sessão de 2026-07-10): literal neutralizado nos dois call sites (`password: 'vc-user-auto'` → `password: ''`, backend já gera senha aleatória para registro sem senha). Arquivo continua sem `<script>` real carregando-o em nenhuma página (confirmado — dead code), corrigido mesmo assim por ser fonte pública legível.
2. ~~`backend/provider-vault-crypto.js:36` — `DEV_FALLBACK_SECRET` hardcoded~~ **CORRIGIDO** (mesma sessão): fail-closed aplicado, mesmo padrão do `SESSION_SECRET`/INCIDENTE-4 — ver `VISION_CORE_BACKEND_SPEC.md` seção "Configuração".
3. ~~`backend/data/users.json` commitado no git~~ **CORRIGIDO** (mesma sessão): `git rm --cached` + `backend/data/*.json` no `.gitignore`. Histórico git **não foi reescrito** (decisão explícita do usuário — o hash permanece em commits antigos); ação de trocar/invalidar a senha real dessa conta de teste fica pendente do usuário, fora do alcance deste repositório.
4. **`backend/.env` (gitignored) contém segredos reais locais** — não corrigido (não é exposição de repositório) — confirma que a detecção funciona contra segredos reais, não só fixtures.
5. ~~`SESSION_SECRET` sem valor caindo em fallback hardcoded~~ **CORRIGIDO** (INCIDENTE-4, sessão anterior) — ver `VISION_CORE_ARCHITECTURE.md`.

---

## Checklist de aceite deste documento

- [x] Motivação com 3 incidentes reais e rastreáveis
- [x] Fronteira explícita com go-core Aegis (sem sobreposição)
- [x] Categorias de detecção descritas por forma, nunca lista fixa
- [x] Limites de segurança não-negociáveis
- [x] Plano de fases com estado real de cada uma
- [x] Achados reais do dogfood registrados, não escondidos

## Pendências

- CI sem toolchain Rust — `cargo test` roda só localmente.
- `high_entropy_blob`: 53 achados restantes no dogfood (meta era <50) — breakdown completo em `docs/CURRENT_HANDOFF.md`, maioria é limitação consciente do allowlist (sem glob `**` recursivo).
- Fase 2 (hooks) sem data — aguardando aprovação.

## Próximos passos

Ver `ROADMAP.md`, Fase 4 (Secret Guard).

## Histórico

| Data | Mudança |
|---|---|
| 2026-07-09 | v1 — spec-only, Fase 0. |
| 2026-07-09 | Fase 1 (protótipo local) e Fase 1.5 (refinamento) fechadas na mesma data. |
| 2026-07-09 | v2 (este arquivo) — consolidado no template da série de 10 documentos. Nenhum conteúdo técnico da v1 removido. |

## Controle de versão

**2.0.0** — 2026-07-09
