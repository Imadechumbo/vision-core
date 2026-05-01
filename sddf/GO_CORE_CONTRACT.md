# SDDF — GO CORE CONTRACT

## Interface CLI

```
vision-core.exe mission --root "<path>" --input "<texto>"
```

### Argumentos

| Flag | Tipo | Obrigatório | Default |
|------|------|-------------|---------|
| `--root` | string | sim | `.` |
| `--input` | string | sim | — |
| `--dry-run` | bool | não | `false` |

### Saída: JSON puro em stdout

Campos obrigatórios:
- `ok` (bool)
- `version` = `"5.0.0-go-safe-core"`
- `mission_id` (string, formato: `mission_[hex8]`)
- `engine` = `"go-safe-core"`
- `status` = `"GOLD"` | `"FAIL"`
- `pass_gold` (bool)
- `promotion_allowed` (bool)
- `rollback_ready` (bool)
- `summary` (string)
- `steps` (array of strings)
- `gates` (objeto com 7 gates)

### Exit codes

| Código | Significado |
|--------|-------------|
| `0` | PASS GOLD |
| `1` | Erro de argumentos ou sistema |
| `2` | FAIL GOLD |

## Contratos JSON: `go-core/contracts/`

- `mission.schema.json` — entrada
- `result.schema.json` — saída completa
- `passgold.schema.json` — decisão PASS GOLD

## Garantias de segurança

1. Nenhum módulo escreve fora do `--root`
2. Path traversal `../` é bloqueado em fileops e patcher
3. Dirs proibidos para patch: `node_modules`, `dist`, `.git`, `.env`, `build`
4. V5.0 sempre roda em dry-run (sem escrita em produção)
