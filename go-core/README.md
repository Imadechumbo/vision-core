# Vision Core Go Safe Core — V5.0

Motor crítico do Vision Core implementado em Go.  
Node/Electron permanecem como camada SaaS/UI (LEGACY ENGINE estável).

## Princípio

**SEM PASS GOLD → nada é promovido, nada aprende, nada substitui legado.**

## Compilar

```powershell
cd go-core
go mod tidy
go test ./...
go build -o ..\bin\vision-core.exe .\cmd\vision-core
```

Ou usar o script:

```powershell
.\scripts\build-go-core.ps1
```

## Usar

```powershell
# Self-test
.\bin\vision-core.exe mission --root "." --input "self-test"

# Missão real
.\bin\vision-core.exe mission --root "C:\meu-projeto" --input "corrigir erro de CORS"

# Versão
.\bin\vision-core.exe version
```

## Saída esperada (PASS GOLD)

```json
{
  "ok": true,
  "version": "5.0.0-go-safe-core",
  "mission_id": "mission_a1b2c3d4",
  "engine": "go-safe-core",
  "status": "GOLD",
  "pass_gold": true,
  "promotion_allowed": true,
  "rollback_ready": true,
  "summary": "Mission validated successfully. PASS GOLD confirmed.",
  "gates": {
    "scanner_ok": true,
    "fileops_ok": true,
    "patcher_ok": true,
    "validator_ok": true,
    "rollback_ready": true,
    "security_ok": true,
    "legacy_safe": true
  }
}
```

## Módulos

| Módulo | Responsabilidade | Proibido |
|--------|-----------------|---------|
| `scanner` | Mapear arquivos, detectar stack, listar endpoints | Alterar arquivos |
| `fileops` | Ler, copiar, hash, snapshot | Escrever fora do root, `../` |
| `patcher` | Aplicar patch controlado | `node_modules`, `.git`, `dist`, `.env`, sem snapshot |
| `validator` | Validar resultado | Promover release, ignorar falhas |
| `rollback` | Restaurar snapshot | — |
| `passgold` | Decisão final GOLD/FAIL | Retornar GOLD com qualquer gate false |

## Gates PASS GOLD

Todos os 7 gates devem ser `true` para `status: "GOLD"`:

- `scanner_ok` — scanner executou sem alterar arquivos
- `fileops_ok` — operações dentro do root, sem path traversal
- `patcher_ok` — patch validado (dry-run V5.0)
- `validator_ok` — todos os checks passaram
- `rollback_ready` — sistema de rollback operacional
- `security_ok` — nenhum módulo escreveu fora do root
- `legacy_safe` — Node/Electron não foram alterados

## Exit codes

| Código | Significado |
|--------|-------------|
| `0` | PASS GOLD |
| `1` | Erro de argumentos |
| `2` | FAIL GOLD |

## Não implementado na V5.0 (por contrato)

- Memory/learning
- LLM/AI calls
- Escrita em produção
- Substituição do legado Node/Electron
