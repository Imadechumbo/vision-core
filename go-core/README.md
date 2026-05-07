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

## V6.2 AEGIS AUTO REMEDIATION MEMORY

A V6.2 adiciona memória local passiva para eventos de remediation bem-sucedidos. O runtime grava um registro em `.vision-memory/remediation_events.jsonl` somente depois que a missão já foi avaliada como **PASS GOLD + PASS SECURE**.

Regras de aprendizado:

- Só aprende quando `pass_gold=true`, `pass_secure=true`, `deploy_allowed=true`, `promotion_allowed=true` e `security_blocking_total=0`.
- Não aprende com missão FAIL, `pass_gold=false` ou `pass_secure=false`.
- Não aprende quando `rollback_applied=true`.
- Não transforma falso positivo, `test_fixture`, `report_only`, `generated`, `vendor`, `snapshot` ou `unknown` em aprendizado positivo.
- A memória é local, offline-first e zero-CGO via JSONL: `.vision-memory/remediation_events.jsonl`.
- Na V6.2, memória é apenas registro/auditoria/aprendizado passivo; ela não altera decisões de segurança, deploy, promotion, PASS GOLD ou PASS SECURE.

## V6.9 REAL REMEDIATION TEST HARNESS

A V6.9 adiciona o pacote `internal/remediationharness` para provar o ciclo real de remediation sem inserir vulnerabilidades permanentes no repositório. Cada cenário do harness cria um projeto temporário em `t.TempDir()`, escreve fixtures production controladas apenas nesse diretório isolado e executa os componentes reais do runtime: Aegis/PASS SECURE antes, rule mapping, patcher supervisionado, validator, PASS SECURE depois, PASS GOLD, rollback readiness e memória before/after.

O harness cobre os cenários reais mínimos:

- `AEGIS_API_004` — CORS wildcard em `backend/server.js`, remediado para `process.env.ALLOWED_ORIGINS` com fallback seguro.
- `AEGIS_API_007` — logging sensível de token em `backend/logger.js`, remediado para `"[REDACTED]"`.
- `AEGIS_API_008` — rate limiting comentado em `backend/server.js`, remediado por policy fix ou guard supervisionado.
- `AEGIS_API_005`/`AEGIS_API_006` — bypass/debug auth flag em `backend/auth.js`, remediado para flag desabilitada.
- `AEGIS_SECRET_010` — API key/token hardcoded em `backend/config.js`, remediado para variável de ambiente ou redaction segura.

Critérios validados por cenário positivo:

- começa com blocker production real (`source_context=production`, `disposition=blocking`, `false_positive=false`);
- gera pelo menos uma operação via rule mapping;
- aplica remediation real supervisionada;
- valida os arquivos alterados;
- reavalia para `security_blocking_total=0`;
- termina com `pass_secure=true` e `pass_gold=true`;
- registra memória before/after no tempdir do harness;
- remove o padrão inseguro original do arquivo final.

Os testes negativos garantem que `test_fixture`, `report_only` e `false_positive` continuam não mapeáveis, que targets inseguros não são patchados, que a ausência de target seguro usa sentinel/noop controlado e que operação obrigatória com falha bloqueia PASS GOLD. O harness nunca grava fixtures vulneráveis fora do tempdir e não altera contrato JSON público da missão.
