# Vision AI Installer — Runbook V0.1

**Estado:** plano operacional; nenhum comando funcional autorizado na Fase 0.

1. Detectar hardware, sistema, permissões, discos e dependências.
2. Produzir relatório de compatibilidade com requisito, detectado, mínimo, motivo e ação.
3. Selecionar diretórios e validar espaço, filesystem, permissões, traversal e junctions.
4. Gerar preview do plano com origens, versões, checksums e elevações.
5. Obter confirmação humana.
6. Validar/instalar dependências oficiais, uma a uma, com timeout.
7. Preparar Colibri em commit pinado; build e doctor antes de modelo grande.
8. Baixar para `.partial`, permitir pause/resume e promover somente após checksum.
9. Iniciar runtime em loopback; validar processo, `/v1/models` e inferência mínima.
10. Parar e reiniciar corretamente.
11. Registrar provider apenas se o contrato Vision Core estiver implementado; caso contrário registrar `SKIPPED_BLOCKED_CONTRACT`.
12. Emitir evidência e relatório final; somente então avaliar `installed`.

## Falha e rollback

Parar novas etapas; preservar evidência sanitizada; encerrar apenas PID próprio; restaurar config anterior; remover somente arquivos criados dentro da raiz gerenciada, após confirmação para conteúdo grande. Nunca remover clone/provider preexistente.

## Uninstall planejado

Preview de runtime/model/cache/config a remover, exclusões selecionáveis, provider criado pelo Installer removido por identidade exata, logs/evidência preserváveis e confirmação final.
