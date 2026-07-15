# ATOMIC CORE SPEC

**Parte da série de arquitetura — leia `MASTER_SPEC.md` e `ARCHITECTURE.md` antes deste.**

> Versão: 1.0.0 · Criado: 2026-07-09
> Fonte: `CLAUDE.md` seções "Atomic Core — APROVADO", "IDEIA REGISTRADA — Atomic Core", implementação real em `frontend/assets/vision-core-next-clean.js`/`.css`, `docs/SDDF_SPEC.md` §15 (ancestral visual), `docs/CURRENT_STATE.md` (achados de sessão sobre reduced-motion).

---

## Resumo

O Atomic Core é o widget de identidade visual do Vision Core Next — um diagrama orbital onde 10 agentes "orbitam" um núcleo central, reinterpretando o pipeline de missão como um átomo. **É identidade de marca, não motor de execução** — nunca dispara nem controla nada sozinho, só reflete visualmente estados que já aconteceram em outro lugar do sistema. Área protegida: qualquer mudança visual exige aprovação explícita do usuário, mesmo pequena.

## Objetivo

Comunicar visualmente, em tempo real e sem dominar a tela, qual agente está ativo durante uma missão — sem nunca virar uma segunda fonte de verdade sobre o estado real da missão (o feature panel/chat continuam sendo a fonte textual).

## Escopo

O widget dentro de `vision-core-next-clean.js`/`.css` (`window.AtomicCoreNext`, `.vc-atomic-hud`). A analogia conceitual completa (máquina de estados de 4 fases) que ainda não foi implementada.

## Fora do escopo

`frontend/atomic-core.html` + `assets/atomic-core.{css,js}` — protótipo isolado, nunca commitado, não é a implementação oficial (a oficial vive dentro do Next). O blink do olho/logo é uma peça de identidade separada (documentado em `UI_COMPONENT_LIBRARY.md`), não parte do Atomic Core.

---

## Conceito e analogia atômica

CORE = núcleo. Os 10 agentes = elétrons. Órbitas = níveis de energia. Execução de missão = transferência de energia entre agentes.

## Agentes (10 — mesmo conjunto do "Decágono Multiagente" legado, `docs/SDDF_SPEC.md` §15)

1. Hermes
2. PI Harness
3. OpenClaw
4. Scanner
5. Patch Engine
6. Aegis
7. Go Core
8. PASS GOLD
9. Archivist
10. GitHub Agent

Cores por agente (`--agent-color`, CSS): `pi:#b86cff` · `hermes:#34d399` · `openclaw:#3b82f6` · `scanner:#22d3ee` · `patchEngine:#d946ef` · `aegis:#facc15` · `goCore:#f59e0b` · `passGold:#fb7185` · `archivist:#0f766e` · `github:#38bdf8`.

**Nota de herança:** o legado já tinha essa mesma lista de 10 agentes como ícones animados (`v33-running/done/fail/idle`, driver `activateAgent()` em `vision-core-clean-runtime.js`). O Atomic Core do Next é uma **reimplementação do zero** — visual e código novos, mesma lista conceitual de agentes, seguindo a regra anti-novo-legado (`docs/LEGACY_DESIGN_REFERENCE.md`: legado é referência, nunca base de código).

---

## Arquitetura

```mermaid
stateDiagram-v2
    [*] --> Idle: load da página
    Idle --> Requesting: submit real do chat
    Requesting --> Revealing: JSON completo recebido
    Revealing --> Settling: último bloco renderizado
    Requesting --> Settling: erro, timeout ou cancelamento
    Revealing --> Settling: cancelamento ou troca de rota
    Settling --> Idle: retorno visual concluído
```

**Implementação real:** SVG + CSS transform/opacity + `requestAnimationFrame` — **nunca** Canvas/Three.js/WebGL. `data-state="idle"|"action"` em `[data-atomic-core]`, instância única no DOM (sem duplicação hero/sidebar).

### API pública

```js
window.AtomicCoreNext = { setState, highlight, reset }
window.startAtomicSequence()   // dispara a sequência completa (Action → glow → volta a Idle)
window.stopAtomicSequence()
window.setAtomicCoreState(state)      // usado por qualquer fluxo (chat, GitHub PR, Métricas...)
window.highlightAtomicAgents(agentList)
window.resetAtomicCore()              // SEMPRE chamado ao fim de um ciclo — sucesso, erro, timeout
```

Qualquer fluxo do Next que dispare uma ação (chat, GitHub PR, Apply-Fix, Dry-Run, ações SAFE READ) chama `setAtomicCoreState('action')` + `highlightAtomicAgents([...])` no início e `resetAtomicCore()` no fim — nunca fica preso em `action` por erro não tratado (confirmado por teste Playwright dedicado, `vision-core-next-atomic-core.spec.mjs`).

---

## Estados (implementados hoje)

| Estado | Quando | Comportamento visual |
|---|---|---|
| `idle` | Sistema disponível, padrão no load | Órbitas lentas, respiração/glow discretos, velocidades por agente nunca sincronizadas |
| `action` | Chat em `requesting` ou `revealing` | Órbitas aceleradas e propagação sequencial de glow até o último bloco visível |
| `settling` | Resposta concluída, erro ou cancelamento | Estado semântico do Chat que dispara o Retorno Action → Idle antes de liberar novo submit |

## Chat e apresentação progressiva (`next-clean-94`)

`/api/chat` continua retornando JSON completo; os SSE reais do backend pertencem a outros contratos. O Next não chama isso de streaming: preserva `data.answer` integral e aplica **progressive reveal somente na UI**, em grupos de 3 caracteres (4 apenas em respostas longas), após a resposta HTTP. A UI mantém separadamente `rawResponse`, `visibleResponse`, `revealIndex` e `revealController`; cada atualização cede ao navegador por timer real de 18–22ms, com pausa adicional após pontuação. O estado único `data-chat-activity="requesting|revealing|settling|idle|error"` dirige o Atomic Core. Assim, Action só termina depois do último conteúdo renderizado, nunca apenas no fim do fetch.

Durante a revelação, `#vcChatStream` usa `aria-live="off"`; ao concluir, restaura `polite`, evitando anúncio por caractere. O modo `VCMotion=reduced` revela a resposta inteira imediatamente. Cancelamento, timeout, erro, navegação para outra área e unload encerram fetch/reveal e passam pelo mesmo Retorno governado.

## Movimento customizável (Settings → Atomic Core, `next-clean-82`)

Pedido explícito do usuário, aprovado dentro da "Área protegida" abaixo. **Não é** a máquina de 4 estados conceituais da próxima seção — continua só `idle`/`action` no `data-state`; o que muda é (1) parâmetros ajustáveis dentro de `idle`/`action` e (2) uma transição visual interpolada entre os dois, sem novo estado semântico.

- **Velocidade do Idle** (slider 40%-250%, default 100%) — multiplica o `elapsed` usado nas senoides de `idleValues()`; não altera amplitude, só a velocidade do ciclo.
- **Padrão de movimento — Idle**: `classic` (original, default) · `pulse` (posição fixa na base, só respiração de escala/glow — zero drift) · `drift` (waveform mais lento/simples, amplitude escalada 0-100% por "Intensidade da deriva" — **teto sempre igual a `MAX_ANGLE_DRIFT`/`MAX_RADIAL_DRIFT` já validados contra sobreposição de legenda, nunca acima**).
- **Padrão de movimento — Action**: `classic` (original, default) · `wide` (mesma elipse, `rx`/`ry` ×1.35) · `pulse` (pulso rápido perto da base em vez da elipse completa).
- **Retorno (Action → Idle)**: `none` (corte direto, default — comportamento original byte a byte) · `fast`/`smooth` (captura a posição exata de Action no instante do `resetAtomicCore()` e interpola — `easeInOutQuad` — até o alvo de Idle ao longo de "Duração do Retorno" configurável, 200-2500ms). `data-state` vira `"idle"` imediatamente (nenhum consumidor externo nota diferença semântica); só o render visual continua em transição por trás.

Todos os 6 valores em `window.VCAtomicMotion.{idleSpeed,idlePattern,idleDrift,actionPattern,returnStyle,returnDuration}` — mesmo padrão `getX/setX/onChange` + `localStorage` do resto do arquivo. "Reduzir animações" (`window.VCMotion`) sempre vence: nenhum destes 6 controles tem efeito visual sob `reduced` (posição congelada, só pulso de opacidade/glow, igual sempre foi).

## Estados conceituais — IDEIA FUTURA (não implementado)

A máquina de 4 estados completa registrada em `CLAUDE.md` ("IDEIA REGISTRADA — Atomic Core") **ainda não existe** — hoje só há o binário `idle`/`action` acima:

```
IDLE (95% do tempo) → THINKING (núcleo pulsa ao receber missão) →
EXECUTING (partículas viajando nas conexões, agente ativo desloca-se 8-12px da órbita) →
COMPLETED (pulso final, desaceleração suave) → volta a IDLE
```

**Antes de implementar isto:** repetir o mesmo rigor da reconstrução do Next — comparação visual, validação de identidade, revisão por etapas, `git diff` a cada passo, mudanças pequenas e verificáveis, nunca tudo de uma vez. Performance continua obrigatoriamente SVG+CSS+rAF, nunca Canvas/Three.js/WebGL.

---

## Motion / Performance / Responsividade

Fonte de verdade de movimento é `window.VCMotion` (ver `VISION_CORE_NEXT_FRONTEND_SPEC.md` seção "Motion System"), **não** o SO diretamente — decisão de produto: "a animação é identidade visual da marca, o VC controla, o SO não degrada por padrão." Default sempre `'full'`.

- **Modo `full`:** `requestAnimationFrame`, órbita em movimento contínuo, glow varia por estado.
- **Modo `reduced`** (só quando o usuário escolhe explicitamente em Settings): posição/escala **congeladas** (zero deslocamento), mas glow/opacidade continuam pulsando lentamente (`REDUCE_PULSE_MS≈4200`, seno sobre o tempo decorrido) via `setTimeout` recorrente (`REDUCE_TICK_MS≈500ms`, bem mais barato que rAF) — **nunca 100% estático**. Achado real corrigido em 2026-07-09: antes desse fix, o widget congelava por completo sob `reduced` (nada disparava um novo `render()` no período ocioso) — lido pelo usuário como "quebrado", não "calmo".

**Responsividade:** desktop mantém a caixa orbital de até 260px, reduzida visualmente para 62% e ancorada à borda direita por `position:sticky` limitado por `#vcChatScroll`, sempre acima do composer. O stream de mensagens forma uma única coluna e reserva lateralmente a região visual do Core. Até 820px, o Core fica oculto enquanto a Hero vazia está aberta; ao iniciar trabalho, o mesmo DOM migra para a conversa, reduz visualmente para 38%, oculta legendas secundárias e permanece periférico. Não usa `position:fixed`, não cria segunda rolagem e não cobre mensagens ou composer.

`contain: layout paint` no CSS — não força reflow do resto da página.

## Semântica / Integração

O Atomic Core **nunca** é a fonte de verdade de nenhum dado — é sempre um espelho de um evento que já aconteceu (submit de chat, resposta de fetch, conclusão de ação). Nenhum componente lê o estado do Atomic Core para decidir o que fazer; a relação é sempre unidirecional (evento real → `setAtomicCoreState()`).

---

## Área protegida — regra de aprovação

**Comportamento atual confirmado e aprovado pelo usuário.** Qualquer PR que toque no Atomic Core (visual, mecanismo de glow, agentes, posicionamento) precisa de aprovação explícita, mesmo que pareça ajuste pequeno — histórico real de regressão: uma sessão do Codex já substituiu a detecção real de `prefers-reduced-motion` por um parâmetro de URL (`?reduce=1`) e removeu o guard do loop `requestAnimationFrame`, corrigido no commit `7278c633`.

## Checklist de aceite

- [x] SVG+CSS/JS, nunca Canvas/Three.js/WebGL
- [x] Idle automático por padrão, Action automático via evento real
- [x] Glow individual por agente, funcional mesmo sob reduced-motion (nunca 100% estático)
- [x] Movimento customizável (velocidade/padrão Idle, padrão Action, transição de Retorno) — defaults reproduzem o comportamento original byte a byte; "Reduzir animações" vence sempre; sliders de deriva nunca excedem o teto já validado contra sobreposição de legenda (`next-clean-82`)
- [x] `resetAtomicCore()` sempre chamado ao fim de qualquer ciclo (sucesso/erro/timeout)
- [x] Responsivo, recolhe em telas menores, nunca sobrepõe composer

## Boas práticas / Princípios

1. Nunca deixar o widget preso em `action` — todo fluxo que o ativa precisa de um `resetAtomicCore()` garantido (inclusive em `catch`/timeout).
2. Nunca ler `matchMedia` diretamente para decidir animação — sempre via `VCMotion`.
3. Teste de motion sempre com `page.emulateMedia()` explícito antes de `page.goto()` — ver regra dura 3 em `VISION_CORE_NEXT_FRONTEND_SPEC.md`.

## Pendências

- Máquina de 4 estados (THINKING/EXECUTING com partículas/deslocamento) — IDEIA FUTURA, sem implementação.
- Configuração de intensidade visual (discreto/normal/ativo) — Etapa 3 do roadmap de Settings, não implementada.

## Próximos passos

Ver `ROADMAP.md`, Fase 1 (Frontend) e Fase 5 (IA/experiência).

## Histórico

| Data | Mudança |
|---|---|
| 2026-07-09 (v47/v48) | Correção de acoplamento de reduced-motion, depois inversão completa (SO nunca degrada por padrão, `VCMotion` como fonte de verdade). |
| 2026-07-09 | Criação deste documento consolidado. |

## Controle de versão

**1.0.0** — 2026-07-09
