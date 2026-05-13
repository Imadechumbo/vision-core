# V14.0 UI Learnings

Este documento preserva o DNA visual e interativo que deve orientar a reconstrução minimalista da V14, sem manter front legado por acidente.

## DNA visual preservado

### Logo/olho CSS

- O símbolo do olho é a âncora visual do Vision Core.
- Deve ser construído preferencialmente em CSS ou ativo controlado pelo design system da V14.
- O olho comunica observabilidade, supervisão e confiança; não deve virar ornamento desconectado de estado.

### Dark SaaS

- A base visual é SaaS escuro: fundo profundo, superfícies em camadas e contraste alto.
- O dark theme deve ser limpo e premium, evitando ruído de dashboards legados.
- Estados importantes precisam ser legíveis sem depender apenas de cor.

### Paleta roxo/ciano/verde/dourado

- **Roxo:** identidade, inteligência e superfície principal.
- **Ciano:** ação, streaming, conexão e foco.
- **Verde:** saúde, disponibilidade, sucesso confirmado.
- **Dourado:** PASS GOLD, evidência de qualidade e aprovação real.
- Vermelho/âmbar devem ficar reservados para erro, bloqueio, risco ou atenção.

### Vision Chat central

- O chat deve ocupar a posição central da jornada.
- Ele é a interface primária de intenção, preparação e acompanhamento.
- A composição deve favorecer leitura de mensagens, estados de missão e próximos passos.

### Vision Agent Local à direita

- O agente local deve ficar à direita como painel de presença/status.
- Ele mostra orbit, prontidão, workers, backend, bloqueios e atividade.
- Não deve competir com o chat; deve complementar a experiência.

### Mission Report visível

- O relatório deve permanecer visível ou facilmente acessível durante a missão.
- O usuário não deve precisar abrir console, inspecionar rede ou adivinhar resultado.
- O relatório deve resumir evidências, logs, diff e PASS GOLD.

### Layout minimalista sem front legado

- A V14 deve evitar múltiplos shells, múltiplas runtimes e painéis antigos empilhados.
- O layout ideal contém:
  - shell único;
  - chat central;
  - agente local à direita;
  - relatório de missão;
  - controles mínimos e explícitos.
- Funcionalidades antigas só retornam se forem reimplementadas por contrato, não copiadas como massa legada.
