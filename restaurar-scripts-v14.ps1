Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VISION CORE — RESTAURAR SCRIPTS V14 NA MAIN" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# O commit 93b7413 deletou os 5 scripts V14 do frontend/assets/
# Este script restaura do estado correto (commit 3aa594f)

Write-Host "PASSO 1: Restaurando scripts V14 do commit correto..." -ForegroundColor Yellow

# Restaurar os 5 scripts V14 limpos do commit antes do problema
git checkout 3aa594f -- frontend/assets/vision-api.js
git checkout 3aa594f -- frontend/assets/vision-chat.js
git checkout 3aa594f -- frontend/assets/vision-agent-local.js
git checkout 3aa594f -- frontend/assets/vision-runtime-owner.js
git checkout 3aa594f -- frontend/assets/vision-report.js

Write-Host "  Verificando scripts restaurados..." -ForegroundColor Gray
$scripts = @(
    "frontend\assets\vision-api.js",
    "frontend\assets\vision-chat.js",
    "frontend\assets\vision-agent-local.js",
    "frontend\assets\vision-runtime-owner.js",
    "frontend\assets\vision-report.js"
)
$allOk = $true
foreach ($s in $scripts) {
    if (Test-Path $s) {
        Write-Host "  [OK] $s" -ForegroundColor Green
    } else {
        Write-Host "  [FALTA] $s" -ForegroundColor Red
        $allOk = $false
    }
}

if (-not $allOk) {
    Write-Host "  ERRO: scripts nao restaurados." -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "PASSO 2: Guard..." -ForegroundColor Yellow
node tools\sddf-front-guard.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "  GUARD FALHOU." -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "PASSO 3: Commit..." -ForegroundColor Yellow
git add frontend/assets/vision-api.js frontend/assets/vision-chat.js frontend/assets/vision-agent-local.js frontend/assets/vision-runtime-owner.js frontend/assets/vision-report.js
git status --short
git commit -m "fix(frontend): restore V14 clean scripts deleted by commit 93b7413

Commit 93b7413 deletou os 5 scripts V14 limpos do frontend/assets/
porque o usuario copiou o V8 Gold puro manualmente sem git stash.

Restaurados do commit 3aa594f (estado correto):
- frontend/assets/vision-api.js
- frontend/assets/vision-chat.js
- frontend/assets/vision-agent-local.js
- frontend/assets/vision-runtime-owner.js
- frontend/assets/vision-report.js

SDDF FRONT GUARD PASS"
Write-Host ""

Write-Host "PASSO 4: Push..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "  SUCESSO! Scripts V14 restaurados na main." -ForegroundColor Green
    Write-Host "  node tools\sddf-front-guard.mjs -> deve passar" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Green
} else {
    Write-Host "  ERRO no push." -ForegroundColor Red
}
Write-Host ""
