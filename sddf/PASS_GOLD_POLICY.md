# SDDF — PASS GOLD POLICY

## Regra absoluta
PASS GOLD só é emitido quando **todos os 7 gates** retornam `true`.

## Gates obrigatórios

| Gate | Critério |
|------|----------|
| `scanner_ok` | Scanner executou sem erros e sem alterar arquivos |
| `fileops_ok` | Operações dentro do root, path traversal bloqueado |
| `patcher_ok` | Patch validado (dry-run ou com snapshot confirmado) |
| `validator_ok` | Todos os checks de validação passaram |
| `rollback_ready` | Sistema de rollback operacional, dir de snapshots acessível |
| `security_ok` | Nenhum módulo escreveu fora do root |
| `legacy_safe` | Node/Electron não foram alterados |

## Consequências de FAIL

```json
{
  "status": "FAIL",
  "pass_gold": false,
  "promotion_allowed": false
}
```

- Nenhum arquivo é promovido
- Nenhum release é gerado
- Rollback automático se snapshot disponível
- Pipeline para

## Saída de GOLD

```json
{
  "status": "GOLD",
  "pass_gold": true,
  "promotion_allowed": true,
  "rollback_ready": true,
  "engine": "go-safe-core"
}
```
