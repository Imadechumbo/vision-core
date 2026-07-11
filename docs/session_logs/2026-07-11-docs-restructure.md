# Session log — Reestruturação do sistema de documentação (2026-07-11)

## Missão recebida

Usuário definiu uma nova política de documentação para o Vision Core Next: `docs/CURRENT_HANDOFF.md` deixa de ser um log crescente de narrativa de sessão e passa a ser um documento de estado atual, sempre pequeno (<200 linhas), seguindo um template fixo de blocos. Narrativa longa/investigação/diffs grandes passam a viver em `docs/session_logs/YYYY-MM-DD-nome.md`. Histórico resumido por versão passa a viver em `docs/CHANGELOG_NEXT.md` (um bloco curto por `next-clean-N`).

## Estado antes

`docs/CURRENT_HANDOFF.md` tinha 859 linhas, crescendo sessão após sessão com blockquotes de narrativa completa (INCIDENTE-3/4, `vc-secret-guard`, chat-first, Ponytail audit, Software Factory Advanced, Métricas gráficas, etc.), tornando o arquivo caro de ler no início de cada sessão e difícil de manter pequeno organicamente sem uma regra explícita.

## O que foi feito

1. **`docs/session_logs/` criado.** Conteúdo integral do `CURRENT_HANDOFF.md` anterior (859 linhas) copiado byte-a-byte (via `cp`, não reescrito manualmente — evita risco de reintroduzir a corrupção de encoding já documentada em sessões anteriores) para `docs/session_logs/2026-07-11-archive-pre-restructure-handoff.md`, com um cabeçalho novo explicando que é um snapshot histórico congelado, não um documento vivo.
2. **`docs/CHANGELOG_NEXT.md` criado.** Semeado com um bloco curto (3-5 bullets) por versão de `next-clean-49` até `next-clean-59` — as versões com fatos claros e confirmados nesta sessão/no arquivo anexado. Versões anteriores a `49` não foram reconstruídas retroativamente (custo/benefício não justificava — o histórico completo continua acessível no arquivo de sessão).
3. **`docs/CURRENT_HANDOFF.md` reescrito do zero** no template exato pedido pelo usuário (blocos: ESTADO DO SISTEMA, IMPLEMENTAÇÕES DESTA SESSÃO, PENDÊNCIAS REAIS, PRÓXIMA PRIORIDADE, RISCOS CONHECIDOS, TESTES, CONTEXTO PARA O PRÓXIMO AGENTE). Resultado: 97 linhas (meta era <200). Pendências e riscos foram levantados a partir do estado real confirmado (grep por specs existentes, seção "PENDÊNCIAS IMEDIATAS" de `CLAUDE.md`), não copiados cegamente do documento antigo — alguns itens que o documento antigo listava como pendentes (Vault-rollback, Tools-apply-fix, GitHub PR) já estavam implementados e testados, então não entraram na nova lista.
4. **`CLAUDE.md` recebeu uma nota curta** (não uma seção grande) registrando que esta política de documentação está em vigor — é uma regra de processo, não uma mudança de arquitetura de produto, então não reescreveu nenhuma seção existente.

## Decisões e trade-offs

- **Não dividi o arquivo de 859 linhas em múltiplos arquivos por data.** Muitas seções não tinham data isolada limpa (misturavam "sessão anterior: X, antes dela: Y" numa cadeia só). Um único arquivo de arquivo bruto, claramente rotulado como congelado, preserva 100% do conteúdo sem risco de perda ou corte arbitrário. Sessões futuras que quiserem "session logs por data" a partir de agora podem fazer isso organicamente (cada sessão nova já cria o próprio arquivo).
- **`PRÓXIMA PRIORIDADE` no novo `CURRENT_HANDOFF.md` ficou com Fase 3.3d** (remoção da página SF legada) — é o único item pendente que já tem investigação e plano prontos (documentado no arquivo de sessão arquivado, seção "ETAPA 2"); os demais itens pendentes exigem decisão nova do usuário antes de virar prioridade, então não caberia apontar nenhum deles como "a" próxima prioridade sem estar enganando quem ler o documento.

## Validação

Nenhum código tocado nesta sessão — só documentação. `docs/CURRENT_HANDOFF.md` final: 97 linhas. `docs/CHANGELOG_NEXT.md`: 83 linhas. Nenhum teste automatizado se aplica a uma mudança puramente documental.
