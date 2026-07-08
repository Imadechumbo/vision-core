# VISION CORE — AGENTS.md

Este arquivo era um snapshot duplicado do estado do projeto, parado desde §205 (2026-06-27) — 12+ dias desatualizado, causa raiz parcial de uma sessão do Codex ter trabalhado com contexto errado. Duplicar conteúdo que muda a cada sessão em dois arquivos garante que um deles fica velho. A partir de 2026-07-08 este arquivo não duplica mais nada: é só um ponteiro.

## Leia, nesta ordem, antes de qualquer edição:

1. **`CLAUDE.md`** (raiz do repo) — documento central: stack, arquitetura, convenções, decisões de escopo, estado real do que está implementado, e a seção **"PROTOCOLO DE REVEZAMENTO ENTRE AGENTES"** logo no topo (regras de commit, gates de segurança, handoff obrigatório).
2. **`docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`** — o que o frontend paralelo (Vision Core Next) deve ser: arquitetura, arquivos permitidos/proibidos, direção visual, regras duras de UI (ex.: `.classe:not([hidden])` em vez de `display` puro).
3. **`docs/CURRENT_HANDOFF.md`** — o estado **agora**: o que o último agente estava fazendo, o que foi tocado, testes feitos, próximo comando recomendado, riscos ativos. Este é o único dos três que muda a cada handoff — atualize-o sempre que terminar uma tarefa ou estiver perto do limite de uso, mesmo em parada abrupta.

Isso vale para qualquer agente (Codex, Claude Code, OpenCode, GitHub Copilot ou outro) em qualquer sessão futura. Não recrie um resumo próprio aqui — edite os três arquivos acima.
