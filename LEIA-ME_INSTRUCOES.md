# §123 — INSTRUÇÕES DE APLICAÇÃO MANUAL

Resolvido sem Claude Code, direto no zip que você mandou. 4 arquivos pra substituir em
`C:\Users\imadechumbo\Desktop\vision-core`:

| Arquivo neste pacote | Substitui em |
|---|---|
| `vision-core-bundle.js` | `frontend/assets/vision-core-bundle.js` |
| `about.html` | `frontend/about.html` |
| `landing.html` | `frontend/landing.html` |
| `CLAUDE.md` | `CLAUDE.md` (raiz do projeto) |
| `_test123_geral_sequestrado_unit.cjs` | raiz do projeto (arquivo novo) |

## O QUE FOI CORRIGIDO

**Bug real:** clicar em "Geral" no menu 🪐 Tutoriais, depois de já ter aberto qualquer
tutorial de seção (Agent local, Mission control, etc.), mostrava o conteúdo da última
seção aberta em vez do tutorial geral.

**Causa:** `STEPS` é uma variável de closure compartilhada. Toda vez que um tutorial de
seção abre, `window._vcSetActiveTutorial()` faz `STEPS = stepsArr` (sobrescreve). O
botão "Geral" (`window.vcStartTutorial()`) nunca restaurava essa variável — só resetava
`current = 0` e chamava `showStep(0)`, herdando o que sobrou de `STEPS`.

**Fix** (só em `vision-core-bundle.js`, 11 linhas inseridas, 0 removidas):
1. Logo após a declaração do array `STEPS` do tutorial geral, uma nova constante
   `STEPS_GERAL = STEPS` guarda a referência original imutável.
2. `window.vcStartTutorial()` agora faz `STEPS = STEPS_GERAL` e
   `_activeStorageKey = 'vc_tutorial_done'` antes de chamar `showStep(0)` — restaura
   tanto o conteúdo quanto a chave de persistência ("não exibir novamente") corretos.

## VALIDAÇÃO JÁ FEITA (sem Claude Code, sem Playwright/browser disponível aqui)

- `npm run test:syntax` → 1176 arquivos OK (sintaxe de todo o projeto, incluindo o
  bundle editado).
- Teste novo `_test123_geral_sequestrado_unit.cjs`: usa **jsdom** carregando o
  `vision-core-bundle.js` de produção real (não um mock) sobre o DOM extraído do
  `index.html` real, simulando o cenário exato do bug. **7/7 passou.**
- Prova de que o teste é válido: rodei o mesmo teste contra a versão SEM o fix
  (commit anterior) → **5 de 7 falharam**, reproduzindo exatamente o sintoma que você
  descreveu (Geral mostra conteúdo do Agent local).

## O QUE FICA PENDENTE PRA QUANDO VOCÊ TIVER O CLAUDE CODE DE VOLTA

jsdom simula o DOM mas não é um browser real — não confirma 100% o que Playwright
confirmaria (CSS computado, eventos reais de clique, etc.), embora a lógica testada
aqui não dependa de CSS, só do valor de `STEPS`. Antes de declarar §123 fechado de
verdade:

1. Rodar a suíte Playwright completa (a que já existe, 18/18 + 19/19 do §121/§122) pra
   confirmar zero regressão real em browser.
2. `git add` + commit (sugestão de mensagem: `fix(§123): STEPS_GERAL restaura tutorial
   geral apos seção aberta — Geral nao herda mais conteudo da ultima secao`).
3. Deploy: `bash bin/deploy-pages.sh "§123"`.
4. Confirmar visualmente em produção: abrir Agent local → fechar → abrir Geral → ver
   se mostra "👋 Bem-vindo ao Vision Core!" e não o conteúdo do Agent local.

Já adiantei o texto do card em `about.html` e a linha em `landing.html` seguindo
exatamente o padrão das sessões anteriores — só copiar os arquivos deste pacote.
`CLAUDE.md` também já está com a linha do §123 na tabela de histórico e a nota em
"PENDÊNCIAS IMEDIATAS" registrando que falta a parte que só dá pra fazer com Claude
Code local (Playwright real + commit + deploy).
