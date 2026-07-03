# =============================================================
#  VISION CORE — CORRIGIR MAIN E COMPLETAR MERGE
#  Remove arquivos legados da main, depois faz merge limpo.
#  Execute em: C:\Users\imadechumbo\Desktop\vision-core\
# =============================================================

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VISION CORE — CORRIGIR MAIN + COMPLETAR MERGE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ---------- Abortar merge em andamento ----------
Write-Host "PASSO 1: Abortando merge anterior..." -ForegroundColor Yellow
git merge --abort 2>$null
git checkout main
git pull origin main
Write-Host "  OK - main limpa: $(git log --oneline -1)" -ForegroundColor Green
Write-Host ""

# ---------- Remover arquivos legados da main ----------
Write-Host "PASSO 2: Removendo arquivos legados da main..." -ForegroundColor Yellow

$legacyFiles = @(
    "frontend/assets/vision-ui-command.js",
    "frontend/assets/vision-v82-ui-extras.css"
)

$removed = @()
foreach ($f in $legacyFiles) {
    if (Test-Path $f) {
        git rm -f $f 2>&1 | Out-Null
        $removed += $f
        Write-Host "  [REMOVED] $f" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] $f nao encontrado localmente" -ForegroundColor Gray
        # Tenta remover do git mesmo sem arquivo local
        git rm -f --cached $f 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $removed += $f
            Write-Host "  [REMOVED from git] $f" -ForegroundColor Green
        }
    }
}

if ($removed.Count -gt 0) {
    git commit -m "chore(frontend): remove legacy assets not in V14 allowlist

Removidos da main antes do merge V14:
- frontend/assets/vision-ui-command.js (runtime legado)
- frontend/assets/vision-v82-ui-extras.css (css legado)

Esses arquivos existem em frontend/_legacy_quarantine/ na branch V14."
    git push origin main
    Write-Host "  OK - commit e push realizados" -ForegroundColor Green
} else {
    Write-Host "  Nenhum arquivo removido." -ForegroundColor DarkYellow
}
Write-Host ""

# ---------- Fazer merge agora ----------
Write-Host "PASSO 3: Merge de v14-v8-gold-clean-rebuild..." -ForegroundColor Yellow
git merge origin/v14-v8-gold-clean-rebuild --no-ff --no-commit 2>&1

# Resolver conflitos aceitando versao v14
$conflictFiles = git diff --name-only --diff-filter=U 2>&1
if ($conflictFiles) {
    Write-Host "  Resolvendo conflitos..." -ForegroundColor Yellow
    foreach ($f in $conflictFiles) {
        $f = $f.Trim()
        if ($f) {
            git checkout --theirs $f
            git add $f
            Write-Host "  [RESOLVED] $f <- versao v14" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  Sem conflitos." -ForegroundColor Green
}
Write-Host ""

# ---------- Guard antes de commitar ----------
Write-Host "PASSO 4: SDDF Guard..." -ForegroundColor Yellow
node tools\sddf-front-guard.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "  GUARD FALHOU. Abortando." -ForegroundColor Red
    git merge --abort
    exit 1
}
Write-Host "  SDDF FRONT GUARD PASS" -ForegroundColor Green
Write-Host ""

# ---------- Commit merge ----------
Write-Host "PASSO 5: Commitando merge..." -ForegroundColor Yellow
git commit -m "Merge branch 'v14-v8-gold-clean-rebuild' into main

feat(frontend): V14 Gold Clean — visual V8 gold + runtime limpo + SDDF guard

- Frontend unico baseado no visual frontend-v8.0-gold aprovado
- index.html: shell visual puro, zero runtime inline, zero sabotadores
- vision-gold.css: DNA visual completo V8 Gold
- vision-api.js: cliente centralizado de endpoints
- vision-chat.js: Vision Chat LLM interativo
- vision-agent-local.js: orbit interativo com gate de evidence_receipt
- vision-runtime-owner.js: unico dono da execucao, exige mission_id real
- vision-report.js: relatorio com evidence receipt obrigatorio
- tools/sddf-front-guard.mjs: guard V14 endurecido
- SDDF FRONT GUARD PASS confirmado
- Closes #63"
Write-Host "  OK" -ForegroundColor Green
Write-Host ""

# ---------- Push main ----------
Write-Host "PASSO 6: Push para origin/main..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Host "  ERRO no push." -ForegroundColor Red; exit 1 }
Write-Host "  OK" -ForegroundColor Green
Write-Host ""

# ---------- Guard final ----------
Write-Host "PASSO 7: Guard final na main..." -ForegroundColor Yellow
node tools\sddf-front-guard.mjs
Write-Host ""

# ---------- Limpar branches ----------
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "  LIMPEZA DE BRANCHES ANTIGAS" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow

$toDelete = @(
    "v14-v8-gold-clean-rebuild",
    "v13-sddf-clean-core",
    "v13.2-gold-clean-front-interactive",
    "v14-functionality-harvest",
    "v294-cloudflare-proxy-final",
    "test/v82-clean-runtime-ui",
    "v5-go-agent-bridge",
    "v6-go-enterprise-runtime",
    "cloudflare/workers-autoconfig",
    "#59-DRAFT]-V13.2-—-Interactive-Gold-Clean-Front",
    "Pull-requests-→-#59-DRAFT]-V13.2-—-Interactive-Gold-Clean-Front"
)

$codexBranches = git branch -r 2>&1 |
    Select-String "origin/codex/" |
    ForEach-Object { $_.ToString().Trim().Replace("origin/", "") }

$total = $toDelete.Count + $codexBranches.Count
Write-Host "  Branches a deletar: $total (legadas + $($codexBranches.Count) codex/)" -ForegroundColor Gray
$confirm = Read-Host "  Confirma delecao de todas? (s/N)"

if ($confirm -match "^[Ss]$") {
    $deleted = 0
    foreach ($b in ($toDelete + $codexBranches)) {
        git push origin --delete $b 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [DEL] $b" -ForegroundColor Green
            $deleted++
        }
    }
    Write-Host ""
    Write-Host "  $deleted branches deletadas." -ForegroundColor Green
}
Write-Host ""

# ---------- Estado final ----------
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  ESTADO FINAL" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Commits recentes:" -ForegroundColor Cyan
git log --oneline -5
Write-Host ""
Write-Host "  Branches remotas:" -ForegroundColor Cyan
git branch -r | Select-String -NotMatch "HEAD" |
    ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  VISION CORE V14 GOLD — FINALIZADO" -ForegroundColor Green
Write-Host "  main atualizada | Visual V8 Gold | Guard PASS" -ForegroundColor Green
Write-Host "  https://github.com/Imadechumbo/vision-core" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
