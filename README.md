# Vision Core V5.0 — Go Safe Core

**V4.4 GOLD** = LEGACY ENGINE estável (Node + Electron + Cloudflare).  
**V5.0** = Extração do motor crítico para Go, em paralelo ao legado.

## Regra permanente

> **SEM PASS GOLD → nada é promovido, nada aprende, nada vira stable, nada substitui legado.**

## Estrutura

```
visioncore-v50/
├── backend/          # Node.js SaaS — LEGACY ENGINE (não alterar)
├── frontend/         # Cloudflare Pages — LEGACY ENGINE (não alterar)
├── worker/           # Cloudflare Worker — LEGACY ENGINE (não alterar)
├── desktop-agent/    # Electron — LEGACY ENGINE (não alterar)
│
├── go-core/          # ← NOVO: Go Safe Core V5.0
│   ├── cmd/vision-core/main.go
│   ├── internal/scanner/
│   ├── internal/fileops/
│   ├── internal/validator/
│   ├── internal/rollback/
│   ├── internal/patcher/
│   ├── internal/passgold/
│   ├── internal/mission/
│   ├── contracts/
│   └── examples/
│
├── sddf/             # ← NOVO: documentação de design
├── scripts/          # ← NOVO: build e validação
└── bin/              # ← gerado pelo build (no .gitignore)
```

## Quick start

```powershell
# Compilar
.\scripts\build-go-core.ps1

# Testar
.\bin\vision-core.exe mission --root "." --input "self-test"

# Validar critérios de aceite completos
.\scripts\validate-v5.ps1
```

## Saída esperada (self-test)

```json
{
  "ok": true,
  "version": "5.0.0-go-safe-core",
  "engine": "go-safe-core",
  "status": "GOLD",
  "pass_gold": true,
  "promotion_allowed": true,
  "rollback_ready": true
}
```

## Roadmap

| Versão | Objetivo |
|--------|----------|
| V5.0 | Go Safe Core — fundação (este release) |
| V5.1 | Electron vira UI shell, Go executa missões localmente |
| V5.2 | Substituição progressiva do Node crítico |
| V6.0 | Plataforma universal completa |
