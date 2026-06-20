# §102 — MISSION TIMELINE (§98-E) — PRONTO PARA APLICAR
## Prompt para Claude Code — rodar sem parar até concluir

HEAD esperado: bf1d542 (tag t5-done + commit about/landing local, ainda não pushed)

---

## CONTEXTO (não precisa fazer nada aqui, só pra você entender o que vem a seguir)

§98-E era a única implementação de fato pendente do roadmap (Mission Timeline /
histórico de missões). Foi inteiramente desenhada e implementada numa sessão de
análise do código real (zip do projeto), testada com 21 testes unitários isolados
(backend + frontend, com mocks) e validada de ponta a ponta rodando o patch do
zero contra uma cópia limpa do projeto — sintaxe OK, nada quebrado.

**Descoberta importante que mudou o desenho:** o frontend NÃO chama `/api/copilot`
nem `/api/run-live` (zero referências a esses paths no bundle.js atual). O botão
ENVIAR chama `/api/chat`. Por isso o histórico foi conectado em `/api/chat` (rota
real) e em `/api/run-live` (rota SDDF oficial, futuro-prova mesmo não estando
wired no frontend hoje) — **não** em `/api/copilot`, que é código morto do ponto
de vista do frontend atual.

**Decisões de design:**
- Anônimo (sem login) nunca persiste no backend — evita misturar histórico de
  visitantes diferentes no mesmo bucket. Só fica no `localStorage` do navegador.
- Logado: backend é fonte de verdade (`data/mission-timeline.json`, 90 dias /
  500 entradas), endpoint novo `GET /api/mission/timeline`.
- Hook via monkey-patch de `res.json()` em vez de editar cada `return` separado
  — cobre todos os branches internos de `/api/chat` e `/api/run-live` sem
  duplicar código nem arriscar esquecer um caminho.
- Fora do escopo desta rodada (decisão consciente, não esquecimento): o fluxo
  "EXECUTAR MISSÃO" (Standard Method Panel / `hermesObj`) ainda não grava no
  histórico — só ENVIAR (chat) e `/api/run-live`.

---

## BLOCO 0 — Instalar os arquivos

Baixe os 3 arquivos anexados a esta conversa e coloque na raiz do projeto:

```powershell
Copy-Item "C:\Users\imadechumbo\Downloads\_patch102_mission_timeline.py" `
          "C:\Users\imadechumbo\Desktop\vision-core\_patch102_mission_timeline.py" -Force

Copy-Item "C:\Users\imadechumbo\Downloads\_test102_backend_logic.cjs" `
          "C:\Users\imadechumbo\Desktop\vision-core\_test102_backend_logic.cjs" -Force

Copy-Item "C:\Users\imadechumbo\Downloads\_test102_frontend_logic.cjs" `
          "C:\Users\imadechumbo\Desktop\vision-core\_test102_frontend_logic.cjs" -Force
```

---

## BLOCO 1 — Rodar os testes unitários isolados (antes de tocar nos arquivos reais)

```bash
cd /c/Users/imadechumbo/Desktop/vision-core
node _test102_backend_logic.cjs
node _test102_frontend_logic.cjs
```

Esperado: `=== TODOS OS TESTES PASSARAM ===` nos dois (9 casos no backend, 12 no
frontend). Esses testes são uma cópia exata da lógica que o patch vai inserir —
rodam isolados com mocks, não tocam no projeto. Se algo falhar aqui, **pare** —
não significa que o patch vai dar problema, mas vale entender por quê antes de
seguir (pode ser diferença de versão do Node).

---

## BLOCO 2 — Aplicar o patch nos arquivos reais

```bash
python _patch102_mission_timeline.py
```

O script tem `assert` em cada bloco — se algum arquivo já tiver mudado desde a
análise (alguém editou `server.js` ou `bundle.js` nesse meio tempo), ele **para
sozinho** nesse bloco específico e avisa qual texto não bateu, em vez de
corromper o arquivo. Se isso acontecer, me mostre a mensagem de erro completa
antes de tentar editar manualmente.

Saída esperada (6 arquivos tocados):
```
[1/6] backend/server.js
[2/6] frontend/index.html
[3/6] frontend/assets/vision-v298-command-chat.css
[4/6] frontend/assets/vision-core-bundle.js
[5/6] stress-test-vision-core.cjs
[6/6] CLAUDE.md

=== PATCH §102 APLICADO COM SUCESSO ===
```

---

## BLOCO 3 — Validar sintaxe

```bash
node -c backend/server.js && echo "server.js OK"
node -c frontend/assets/vision-core-bundle.js && echo "bundle.js OK"
node -c stress-test-vision-core.cjs && echo "stress-test OK"
```

Os três devem imprimir OK. Se o backend tiver `npm run build` ou algo que
empacote `frontend/assets/*` antes do deploy, rode esse passo também aqui.

---

## BLOCO 4 — Rodar localmente antes de subir pro EB (se o backend rodar local)

```bash
cd backend && npm start
# noutro terminal:
cd ..
curl -s http://localhost:8080/api/mission/timeline | head -c 300
```

Esperado: `{"ok":true,"entries":[],"count":0,"authenticated":false,"anti_stub":true,...}`
— confirma o endpoint novo sem precisar subir pro EB ainda.

---

## BLOCO 5 — Deploy

**Backend primeiro** (mudou `server.js`):
```bash
python _deploy89_eb.py
```
(ajuste o nome do script de deploy se a versão mudou desde a última sessão)

**Frontend depois** (mudou `index.html`, `vision-core-bundle.js`,
`vision-v298-command-chat.css`):
```bash
bash bin/deploy-pages.sh "feat(mission-timeline): §98-E historico persistido de missoes — §102"
```

---

## BLOCO 6 — Rodar o ST-11 contra o EB real (já deployado)

```bash
node stress-test-vision-core.cjs --st=11
```

6 casos esperados, todos PASS:
1. `/api/mission/timeline` existe e tem anti_stub
2. Anônimo recebe `authenticated:false` e lista vazia
3. Registrar usuário de teste
4. Enviar missão via `/api/chat` com marcador único
5. Histórico autenticado contém o marcador enviado
6. Entrada do histórico tem campos esperados (source, status, ts)

Se algo falhar, **antes de assumir que é bug**, confira se não é falso positivo
do teste em si (já aconteceu 2x nesta sessão de análise, com §98-A e com a
pluralização do contador "1 missão" — pegamos esse no teste unitário antes de
chegar aqui).

---

## BLOCO 7 — Teste manual rápido no navegador

1. Abrir https://visioncoreai.pages.dev, fazer login.
2. Mandar uma mensagem qualquer no chat (ENVIAR).
3. Confirmar que aparece um painel "🕘 Histórico de missões" abaixo do chat,
   com a missão que você acabou de enviar.
4. Recarregar a página (F5) — a entrada deve continuar aparecendo (prova que
   persistiu, não é só estado de memória).
5. Clicar no cabeçalho do painel — deve colapsar/expandir a lista.

---

## BLOCO 8 — Commit

```bash
git add backend/server.js frontend/index.html frontend/assets/vision-core-bundle.js \
        frontend/assets/vision-v298-command-chat.css stress-test-vision-core.cjs CLAUDE.md \
        _patch102_mission_timeline.py _test102_backend_logic.cjs _test102_frontend_logic.cjs
git commit -m "feat(mission-timeline): §98-E historico persistido via /api/chat + /api/run-live — ST-11 6/6, §102

- appendMissionTimeline()/getMissionTimeline() em data/mission-timeline.json
- GET /api/mission/timeline (anti_stub:true)
- Hook via monkey-patch de res.json em /api/chat (rota real do frontend, nao /api/copilot) e /api/run-live
- Anonimo so usa localStorage (vc_mission_timeline_cache) — sem persistir no backend
- Painel #v298MissionHistory colapsavel no Mission Control
- ST-11 com 6 casos + 21 testes unitarios isolados (backend+frontend)
- CLAUDE.md atualizado — §98-E RESOLVIDO"
git tag s102-done
git push origin main --tags
git push gitlab main --tags 2>/dev/null || true
```

**Não esquecer:** o commit `bf1d542` da sessão anterior (about/landing) também
ainda está só local, sem push. Se o `git push` acima não reclamar de nada
estranho, ele deve subir junto (está antes do seu commit novo na mesma branch).
Confirme com `git log --oneline origin/main -5` depois do push.

---

## PENDÊNCIAS QUE FICAM FORA DESTA RODADA (não fazer agora, só registrar)

Da sessão de análise anterior, ainda em aberto e não tocadas aqui:
- §98-B / §98-C: o CLAUDE.md ainda lista esses dois como "incompleto" mas o
  código real já resolve os dois (§98-C tem só badge EM BREVE, sem EXEC
  BLOQUEADO; §98-B funciona via prepend de texto na mensagem, não via os campos
  `file_context`/`file_content` que o ST-02 testa). É só dessincronia de
  documentação — vale uma rodada de sync no CLAUDE.md quando der.
- `v236FileInput` órfão no `index.html` (sem listener, resíduo do botão antigo).
- Versão inconsistente em 3 lugares (`V2.9.10` no banner, `v5.9.0` nos
  fallbacks dos módulos SF — esse vaza pro usuário —, `4.1.0` no
  package.json).
