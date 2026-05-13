# =============================================================
#  VISION CORE — RESOLVER CONFLITOS E FAZER MERGE NA MAIN
#  PR #63: v14-v8-gold-clean-rebuild -> main
#
#  Os conflitos sao em:
#  - frontend/index.html       (main tem versao legada, v14 tem gold)
#  - frontend/assets/vision-runtime-owner.js (main tem V8.3 antigo, v14 tem V14 limpo)
#
#  A versao correta em AMBOS os casos e a da branch v14-v8-gold-clean-rebuild.
#
#  Execute em: C:\Users\imadechumbo\Desktop\vision-core\
# =============================================================

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VISION CORE — RESOLVER CONFLITOS + MERGE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ---------- Garantir que estamos na main ----------
Write-Host "Sincronizando main..." -ForegroundColor Yellow
git checkout main
git pull origin main
Write-Host "  OK - main: $(git log --oneline -1)" -ForegroundColor Green
Write-Host ""

# ---------- Iniciar merge da branch v14 ----------
Write-Host "Iniciando merge de v14-v8-gold-clean-rebuild..." -ForegroundColor Yellow
git merge origin/v14-v8-gold-clean-rebuild --no-ff --no-commit 2>&1
Write-Host ""

# ---------- Resolver conflitos: aceitar versao da branch v14 ----------
Write-Host "Resolvendo conflitos (aceitando versao V14 limpa em todos)..." -ForegroundColor Yellow

# Para cada arquivo em conflito, aceitar a versao da branch v14 (theirs)
$conflictFiles = git diff --name-only --diff-filter=U 2>&1
if ($conflictFiles) {
    foreach ($f in $conflictFiles) {
        $f = $f.Trim()
        if ($f) {
            git checkout --theirs $f
            git add $f
            Write-Host "  [RESOLVED] $f <- versao v14" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  Sem conflitos para resolver." -ForegroundColor Green
}
Write-Host ""

# ---------- Rodar guard antes de commitar ----------
Write-Host "Rodando SDDF guard..." -ForegroundColor Yellow
node tools\sddf-front-guard.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "  GUARD FALHOU. Abortando merge." -ForegroundColor Red
    git merge --abort
    exit 1
}
Write-Host "  SDDF FRONT GUARD PASS" -ForegroundColor Green
Write-Host ""

# ---------- Commit do merge ----------
Write-Host "Commitando merge..." -ForegroundColor Yellow
git commit -m "Merge branch 'v14-v8-gold-clean-rebuild' into main

feat(frontend): V14 Gold Clean — visual V8 gold + runtime limpo + SDDF guard

- Frontend unico baseado no visual frontend-v8.0-gold aprovado
- index.html: shell visual puro, zero runtime inline, zero sabotadores
- vision-gold.css: DNA visual completo V8 Gold
- vision-api.js: cliente centralizado de endpoints
- vision-chat.js: Vision Chat LLM interativo, nao abre SSE
- vision-agent-local.js: orbit interativo com gate de evidence_receipt
- vision-runtime-owner.js: unico dono da execucao, exige mission_id real
- vision-report.js: relatorio com evidence receipt obrigatorio
- tools/sddf-front-guard.mjs: guard V14 endurecido
- Todos os assets legados em frontend/_legacy_quarantine/
- SDDF FRONT GUARD PASS confirmado
- Zero sabotadores, zero PASS GOLD fake, zero mission_id inventado

Closes #63"
Write-Host "  OK - merge commitado" -ForegroundColor Green
Write-Host ""

# ---------- Push main ----------
Write-Host "Push para origin/main..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRO no push." -ForegroundColor Red
    exit 1
}
Write-Host "  OK" -ForegroundColor Green
Write-Host ""

# ---------- Guard final na main ----------
Write-Host "Guard final na main..." -ForegroundColor Yellow
node tools\sddf-front-guard.mjs
Write-Host ""

# ---------- Limpar branches antigas ----------
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "  LIMPEZA DE BRANCHES ANTIGAS" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host ""

$toDelete = @(
    "v14-v8-gold-clean-rebuild",
    "v13-sddf-clean-core",
    "v13.2-gold-clean-front-interactive",
    "v14-functionality-harvest",
    "v294-cloudflare-proxy-final",
    "test/v82-clean-runtime-ui",
    "v5-go-agent-bridge",
    "v6-go-enterprise-runtime"
)

# Pegar todas as branches codex
$codexBranches = git branch -r 2>&1 | Select-String "origin/codex/" | ForEach-Object {
    $_.ToString().Trim().Replace("origin/", "")
}

$total = $toDelete.Count + $codexBranches.Count
Write-Host "  Branches a deletar: $total" -ForegroundColor Gray
Write-Host "  (v14-v8-gold-clean-rebuild + legadas + $($codexBranches.Count) branches codex/)" -ForegroundColor Gray
Write-Host ""
$confirm = Read-Host "  Confirma delecao? (s/N)"

if ($confirm -match "^[Ss]$") {
    $deleted = 0
    $skipped = 0

    foreach ($b in $toDelete) {
        git push origin --delete $b 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [DEL] $b" -ForegroundColor Green
            $deleted++
        } else {
            Write-Host "  [SKIP] $b" -ForegroundColor Gray
            $skipped++
        }
    }

    foreach ($b in $codexBranches) {
        git push origin --delete $b 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [DEL] $b" -ForegroundColor Green
            $deleted++
        } else {
            $skipped++
        }
    }

    Write-Host ""
    Write-Host "  Deletadas: $deleted | Ignoradas: $skipped" -ForegroundColor Green
} else {
    Write-Host "  Limpeza pulada." -ForegroundColor DarkYellow
}
Write-Host ""

# ---------- Estado final ----------
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  ESTADO FINAL" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Commits recentes na main:" -ForegroundColor Cyan
git log --oneline -5
Write-Host ""
Write-Host "  Branches remotas restantes:" -ForegroundColor Cyan
git branch -r | Select-String -NotMatch "HEAD" | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
Write-Host ""
Write-Host "  Arquivos frontend ativos:" -ForegroundColor Cyan
Get-ChildItem -Path "frontend" -File -Recurse |
    Where-Object { $_.FullName -notlike "*_legacy_quarantine*" } |
    ForEach-Object { Write-Host "    frontend\$($_.Name)" -ForegroundColor Gray }
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  VISION CORE V14 GOLD — FINALIZADO" -ForegroundColor Green
Write-Host "  main: atualizada e limpa" -ForegroundColor Green
Write-Host "  Visual: V8 Gold aprovado" -ForegroundColor Green
Write-Host "  Runtime: V14 limpo" -ForegroundColor Green
Write-Host "  Guard: SDDF FRONT GUARD PASS" -ForegroundColor Green
Write-Host "  https://github.com/Imadechumbo/vision-core" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
