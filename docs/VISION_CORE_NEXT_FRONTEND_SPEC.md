# Vision Core Next — Frontend Spec

**Documento oficial da interface paralela**

> Data: 2026-07-08
> Status: Em desenvolvimento (paralelo ao index.html legado)
> Próxima revisão: quando houver feature nova ou decisão de produto

---

## 1. Arquitetura Paralela

O novo frontend **não substitui** o `index.html` legado. É uma interface paralela, acessível por URL própria, sem conflito com produção.

### Entrada oficial

| Componente | Caminho | Cache-bust |
|-----------|---------|-----------|
| HTML | `frontend/vision-core-next.html` | `?v=next-clean-N` |
| CSS | `frontend/assets/vision-core-next-clean.css` | sync com HTML |
| JS | `frontend/assets/vision-core-next-clean.js` | sync com HTML |

### Protótipo Atomic Core standalone

| Componente | Caminho |
|-----------|---------|
| HTML | `frontend/atomic-core.html` |
| CSS | `frontend/assets/atomic-core.css` |
| JS | `frontend/assets/atomic-core.js` |

### Pré-clean (protótipos antigos, não usar)

| Arquivo | Status |
|---------|--------|
| `frontend/assets/vision-core-next.js` | Protótipo antigo — não editar |
| `frontend/assets/vision-core-next.css` | Protótipo antigo — não editar |

---

## 2. Arquivos Proibidos nesta Fase

**NÃO ALTERAR EM HIPÓTESE ALGUMA:**

### Frontend produção
- `frontend/index.html`
- `frontend/assets/vision-core-bundle.js`
- `frontend/assets/vision-core-bundle.css`

### Backend / Infra
- `server.js` ou qualquer arquivo em `backend/`
- `worker/src/index.js` (Cloudflare Worker Gateway)
- Qualquer endpoint que escreva em disco
- Qualquer endpoint destrutivo (DELETE, POST de escrita)
- `bin/deploy-pages.sh`
- Scripts de deploy do EB

### Páginas públicas
- `frontend/about.html`
- `frontend/landing.html`

---

## 3. Direção Visual

Estilo geral: **app de chat/IA tipo ChatGPT**.

### Princípios
- Minimalista — menos é mais
- Escuro/cinza (dark mode nativo)
- Chat como centro da experiência
- Sem aparência de landing page
- Sem hero gigante
- Sem excesso de painéis
- Sidebar discreta e recolhível

### Layout concreto
```
┌─────────────┬─────────────────────────────────────┬──────────┐
│  Sidebar    │  Header (logo+eye+identidade)       │ Atomic   │
│  colapsável │  ─────────────────────────────       │ Core     │
│             │  Chat stream                         │ (canto   │
│  C          │  (histórico de mensagens)            │  sup.    │
│  h          │                                       │  dir.)   │
│  a          │                                       │          │
│  t          │                                       │          │
│             │                                       │          │
│  M          │                                       │          │
│  i          │  ─────────────────────────────       │          │
│  s          │  Composer fixo no rodapé             │          │
│  s          │  [textarea + botões]                 │          │
│  i          │                                       │          │
│  o          └─────────────────────────────────────┘          │
│  n          └─────────────────────────────────────┘          │
│  s                                                     │
│                                                       │
│  F       (sidebar colapsada vira só ícones)           │
│  a                                                    │
│  c                                                    │
│  t                                                    │
│  o                                                    │
│  r                                                    │
│  y                                                    │
└─────────────────────────────────────────────────────────┘
```

### Elementos visuais

| Elemento | Descrição |
|----------|-----------|
| Logo/olho | Pequeno no topo esquerdo, pisca no hover |
| Sidebar | 252px expanded, 78px collapsed — só ícones |
| Chat stream | Área central rolável, mensagens estilo card |
| Composer | Fixo no rodapé, textarea expansível + chips |
| Feature panel | Painel contextual aparece só quando necessário |
| Atomic Core | Overlay discreto no canto superior direito |

---

## 4. Atomic Core

Componente independente de identidade visual, sem função operacional.

### Regras
- **Sem botões Idle / Action / Glow** — estado é gerenciado automaticamente
- **Idle automático** por padrão
- **Action automático** quando houver job/agente ativo
- **Glow individual** por agente via eventos (`highlightAtomicAgents`)
- Agentes orbitam o CORE
- **Não deve dominar a tela** — tamanho discreto

### Agentes (10)
1. Hermes
2. PI Harness
3. OpenClaw
4. Scanner
5. Patch Engine
6. Aegis
7. Go Core
8. Pass Gold
9. Archivist
10. GitHub Agent

---

## 5. Comportamento Seguro

Nesta fase, o Next frontend **apenas lê**. Nada escreve, nada executa, nada deploya.

### Permitido ✅
- GET em endpoints de status/leitura
- POST `/api/chat` (chat livre, sem quota)
- POST `/api/sf/*` com job_id polling (leitura, geração orientada)
- POST `/api/github/create-pr` (com confirmação dupla obrigatória)
- Anexo de arquivos (local apenas, sem upload)

### Bloqueado ❌
- `apply_patch` real via Vision Agent Local
- POST destrutivo (DELETE, PUT de escrita)
- Deploy (CF Pages, EB)
- Missão paga (`/api/run-live`)
- Escrita em disco
- Qualquer alteração no backend

---

## 6. Layout Alvo (critérios de aceite)

A interface será aceita quando:

1. **Abrir em `/vision-core-next.html`** sem redirecionar para `index.html`
2. **Não alterar `index.html`** nem bundles legados
3. **Sidebar recolher** via botão toggle, persistindo estado
4. **Chat for o foco visual** — maior área, primeiro plano
5. **Atomic Core estiver pequeno/discreto** — ~360x360px, canto superior direito
6. **Não houver botões Idle / Action / Glow** visíveis
7. **Mission Input estiver discreto** — chips no composer, não painel fixo
8. **Composer estiver fixo embaixo** — textarea + botões de ação
9. **Não houver chamadas destrutivas** — nenhum POST/ DELETE que escreva sem confirmação
10. **Não houver dependência de backend novo** — só endpoints já existentes no EB

---

## 7. O que o Next NÃO é

- Landing page promocional
- Dashboard pesado com dezenas de cards
- Substituição imediata do `index.html`
- Prova de conceito descartável

## 8. O que o Next É

- Interface operacional de chat/agentes
- Implementação paralela e segura
- Evolutiva — cada etapa é testada antes de avançar
- Pronta para validação antes de substituir produção

---

## 9. Regra para Agentes

> **Qualquer sessão que mexa no frontend DEVE ler este arquivo (`docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`) E `CLAUDE.md` E `docs/CURRENT_HANDOFF.md` antes de editar código.**

Esta regra vale para todos os agentes (Codex, Claude Code, OpenCode, GitHub Copilot, etc.) em qualquer sessão futura — ver "PROTOCOLO DE REVEZAMENTO" no topo do `CLAUDE.md` para o processo completo. Para o estado de implementação **agora** (o que já foi feito, versão deployada, pendência ativa), consulte `docs/CURRENT_HANDOFF.md` — este arquivo é a especificação/intenção de produto, não muda a cada sessão; o HANDOFF é o snapshot que muda.

---

## 11. FORA DE ESCOPO — decidido em 2026-07-08

Itens que o Next **não vai implementar**, confirmados pelo usuário após auditoria de paridade (`docs/PARITY_AUDIT.md`). Evidências no relatório, linha-a-linha.

### Categoria C — features legadas que não migram

| Item | Motivo |
|------|--------|
| SF Console / página SF dedicada (`#vcSoftwareFactoryPage`/`#projectBuilder`) | Já planejada para deleção (Fase 3.3d). Causa tela em branco na aba "Modo Avançado". |
| Tutorial `STEPS_SF` zumbi + `_sfArchitectSend`/`_sfRenderArchitectResponse`/`_sfSetArchitectMode` | Zero callers, comentado como morto pelos próprios autores do legado. |
| `vision-core-clean-runtime.js` (312KB) | Fork abandonado — não carregado por nenhuma página oficial. |
| `vision-core-clean-state.js` (arquivo standalone) | Conteúdo já existe dentro do `bundle.js` (byte-a-byte idêntico). |
| `v297UniversalChat`/`v297ChatLog`/`v297FileInput` (DOM oculto) | Existem só para JS antigo não quebrar com `null`. |
| Painel OSINT (SpiderFoot/Recon-ng/Maryam) | Badges estáticos, zero fetch, zero listener. §98-F. |
| Painel OPENCLAW/OPENSQUAD | Painel estático. §98-F. |
| `frontend/next.html` + `assets/vision-core-next.css` | Substituído pelo clean. Já excluído do pacote de deploy. |
| IDs duplicados (`bar-hermes`/`val-*` em 2 painéis; `id="memory"` em 2 lugares) | Bug de markup do legado — Next não replica. |
| Cadeia de hotfix CSS `v297`→`v298`-hotfixes (4 arquivos) | Dead weight por cascata. |
| Diagrama "v33 orbit" (`#v33-t-*`, `#mcCore`) | Ancestral visual do Atomic Core — Next implementa do zero. |
| Billing UI decorativa | Comentada como "Static roadmap display only" no próprio legado. |
| Vault rollback UI | Legado nunca teve UI para `/api/vault/rollback/:id`. |

### Categoria D — CSS órfão/só-legado

19 arquivos CSS (cadeia de hotfix `v297`–`v298-final-hard-fix2` dentro dos 27 concatenados) não entram no Next. O Next já não depende de nenhum CSS legado (a SPEC proíbe importar `vision-core-bundle.css`). Nenhum trabalho de CSS pendente por causa desta auditoria.

### Bloqueio de segurança — não reabrir sem pareamento real

O pareamento por `agent_secret` (Fase 2b) e o gate `AGENT_APPLY_ENABLED=false` **não** estão na lista de corte — continuam implementados e verificados, mas o gate só será reaberto com (1) pareamento por agente/projeto/owner no backend e (2) aprovação humana registrada em `CURRENT_HANDOFF.md`. `agent_id` sozinho não é autenticação (hash não-secreto, rotas sem middleware de auth).

---

## 12. Regras Duras (violação = bug garantido, já aconteceu mais de uma vez)

1. **Painel condicional que usa `hidden` no HTML nunca pode ter `display: X` puro no CSS — sempre `.classe:not([hidden]) { display: X }`.** CSS de autor com a mesma especificidade do atributo HTML `hidden` vence por ordem de declaração; o painel aparece mesmo escondido. Já corrigido 4x nesta frente (GitHub PR, Mission Patch, SF stage/log/progress/final) — é o bug mais repetido do projeto.
2. **Nunca `innerHTML`/`insertAdjacentHTML`/`eval`/`document.write` nos arquivos Next.** Toda renderização de conteúdo vindo do backend usa `textContent`/`createTextNode`/`createElement`. Sem exceção, mesmo para HTML aparentemente confiável.
3. **`reducedMotion: 'reduce'` explícito em todo teste Playwright que envolva animação** (Atomic Core, blink do olho). `null`/omitido não é neutro — cai no valor real do SO do host rodando o teste.
4. **Todo endpoint que a UI chama precisa ser verificado contra o backend real (`grep` em `backend/server.js`), não assumido pelo nome.** Um mock de `page.route()` só espelha a URL que o frontend chama — se o frontend erra a URL (ex.: `/api/sf/jobs/:id` vs. a rota real `/api/sf/job/:id`), o teste passa mockado e falha 100% contra produção. Achado real em 2026-07-08.
5. **Cache-bust do HTML/CSS/JS sempre incrementa junto** (`?v=next-clean-N` nos três, nunca só em um).
6. **Gate de segurança (`AGENT_APPLY_ENABLED` e equivalentes futuros) só muda com aprovação humana registrada em `docs/CURRENT_HANDOFF.md`** — nunca por iniciativa própria de um agente, mesmo que pareça uma melhoria. `agent_id` sozinho **não é autenticação**: é um hash não-secreto (hostname+pasta) e nenhuma rota `/api/agent/mission/*` tem middleware de auth. Reabrir esse gate sem um pareamento real por agente/projeto/owner é uma vulnerabilidade real, não uma feature pronta.
7. **Nunca commitar working tree sujo antes de terminar a sessão, nunca deployar código não commitado.** Ver "PROTOCOLO DE REVEZAMENTO" no `CLAUDE.md`.
