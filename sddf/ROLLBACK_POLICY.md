# SDDF — ROLLBACK POLICY

## Princípio
Todo patch deve ter um snapshot correspondente. Rollback desfaz o patch restaurando o snapshot.

## Fluxo obrigatório

```
1. fileops.CreateSnapshot(root, file, missionID, snapshotDir)
   → gera <snapshotID>.bak + <snapshotID>.json
2. patcher.Apply(...)
   → aplica modificação no arquivo
3. Se validação FAIL:
   rollback.Restore(snapshotDir, snapshotID)
   → restaura o arquivo original
```

## Estrutura de snapshot

```
.vision-snapshots/
  mission_abc123-1234567890.bak    ← conteúdo original
  mission_abc123-1234567890.json   ← metadata (path, hash, created_at)
```

## Metadata obrigatória

```json
{
  "id": "mission_abc123-1234567890",
  "mission_id": "mission_abc123",
  "original_path": "/projeto/backend/server.js",
  "backup_path": ".vision-snapshots/mission_abc123-1234567890.bak",
  "hash": "sha256...",
  "created_at": "2026-05-01T..."
}
```

## Verificação de integridade
O rollback verifica SHA-256 do backup antes de restaurar.
Se hash não bate → erro, não restaura, alerta operador.

## V5.0: dry-run
Na V5.0, o patcher roda em dry-run. Portanto rollback não é acionado automaticamente.
O `rollback_ready` gate verifica se o diretório de snapshots é acessível e gravável.
