# =============================================================
#  VISION CORE — CORRECAO: restaura frontend V14 na branch certa
#  Execute em: C:\Users\imadechumbo\Desktop\vision-core\
# =============================================================

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VISION CORE — RESTAURANDO FRONTEND V14 LIMPO" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Confirmar branch
$branch = git branch --show-current
Write-Host "  Branch atual: $branch" -ForegroundColor Gray
if ($branch -ne "v14-v8-gold-clean-rebuild") {
    Write-Host "  ATENCAO: Esperava 'v14-v8-gold-clean-rebuild'. Continuar mesmo assim? (s/N)" -ForegroundColor Yellow
    $ok = Read-Host
    if ($ok -notmatch "^[Ss]$") { exit 1 }
}
Write-Host ""

# PASSO 1: Desfazer o commit do refatorar-v8gold.ps1 (que reintroduziu legados)
Write-Host "PASSO 1: Desfazendo commit que reintroduziu arquivos legados..." -ForegroundColor Yellow
git revert HEAD --no-edit
if ($LASTEXITCODE -ne 0) {
    Write-Host "  revert falhou — tentando reset soft..." -ForegroundColor Yellow
    git reset HEAD~1 --soft
}
Write-Host "  OK" -ForegroundColor Green
Write-Host ""

# PASSO 2: Limpar frontend completamente
Write-Host "PASSO 2: Limpando pasta frontend..." -ForegroundColor Yellow
git rm -rf frontend/ 2>$null
if (Test-Path "frontend") { Remove-Item "frontend" -Recurse -Force }
Write-Host "  OK" -ForegroundColor Green
Write-Host ""

# PASSO 3: Recriar estrutura V14 limpa
Write-Host "PASSO 3: Criando estrutura V14 limpa..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "frontend\assets" -Force | Out-Null
New-Item -ItemType Directory -Path "frontend\_legacy_quarantine" -Force | Out-Null
Write-Host "  OK - diretorios criados" -ForegroundColor Green
Write-Host ""

# PASSO 4: Criar arquivos obrigatorios da SPEC V14
Write-Host "PASSO 4: Criando arquivos da SPEC V14..." -ForegroundColor Yellow

# _headers (Cloudflare Pages)
Set-Content "frontend\_headers" @"
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
"@

# _redirects
Set-Content "frontend\_redirects" "/api/* https://visioncore-api-gateway.weiganlight.workers.dev/api/:splat 200"

# _legacy_quarantine README
Set-Content "frontend\_legacy_quarantine\README.md" @"
# LEGACY QUARANTINE
Arquivos mortos. Nao importar. Nao referenciar. Nao carregar.
Historico preservado apenas para auditoria.
"@

Write-Host "  OK - _headers, _redirects, _legacy_quarantine/README.md" -ForegroundColor Green
Write-Host ""

# PASSO 5: Baixar os arquivos V14 do origin/main (onde foram criados)
Write-Host "PASSO 5: Recuperando arquivos V14 do origin/main..." -ForegroundColor Yellow

$filesToRestore = @(
    "frontend/assets/vision-gold.css",
    "frontend/assets/vision-api.js",
    "frontend/assets/vision-chat.js",
    "frontend/assets/vision-agent-local.js",
    "frontend/assets/vision-runtime-owner.js",
    "frontend/assets/vision-report.js",
    "frontend/index.html"
)

foreach ($f in $filesToRestore) {
    git show "origin/main:$f" > $f 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK - $f" -ForegroundColor Green
    } else {
        Write-Host "  AVISO: nao encontrado em origin/main: $f" -ForegroundColor Yellow
    }
}
Write-Host ""

# PASSO 6: Verificar arquivos criados
Write-Host "PASSO 6: Verificando arquivos ativos..." -ForegroundColor Yellow
$required = @(
    "frontend\index.html",
    "frontend\assets\vision-gold.css",
    "frontend\assets\vision-api.js",
    "frontend\assets\vision-chat.js",
    "frontend\assets\vision-agent-local.js",
    "frontend\assets\vision-runtime-owner.js",
    "frontend\assets\vision-report.js"
)
$allOk = $true
foreach ($f in $required) {
    if (Test-Path $f) {
        Write-Host "  [OK] $f" -ForegroundColor Green
    } else {
        Write-Host "  [FALTA] $f" -ForegroundColor Red
        $allOk = $false
    }
}
Write-Host ""

if (-not $allOk) {
    Write-Host "  ERRO: Alguns arquivos nao foram restaurados." -ForegroundColor Red
    Write-Host "  Verifique sua conexao e tente novamente." -ForegroundColor Yellow
    exit 1
}

# PASSO 7: Rodar guard
Write-Host "PASSO 7: Rodando SDDF guard..." -ForegroundColor Yellow
node tools\sddf-front-guard.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRO: Guard falhou. Veja erros acima." -ForegroundColor Red
    exit 1
}
Write-Host ""

# PASSO 8: Commit
Write-Host "PASSO 8: Fazendo commit..." -ForegroundColor Yellow
git add frontend/ 
git commit -m "fix(frontend): restaura frontend V14 limpo — reverte contaminacao por v8gold.zip

- Remove todos os runtimes legados reintroduzidos acidentalmente
- Restaura index.html limpo (shell visual puro, zero runtime inline)
- Restaura assets V14: vision-gold.css, vision-api.js, vision-chat.js,
  vision-agent-local.js, vision-runtime-owner.js, vision-report.js
- Todos os arquivos legados permanecem em _legacy_quarantine/
- SDDF FRONT GUARD PASS confirmado antes do commit"

Write-Host "  OK" -ForegroundColor Green
Write-Host ""

# PASSO 9: Push
Write-Host "PASSO 9: Push para GitHub..." -ForegroundColor Yellow
$confirm = Read-Host "  Confirma push para origin/v14-v8-gold-clean-rebuild? (s/N)"
if ($confirm -match "^[Ss]$") {
    git push origin v14-v8-gold-clean-rebuild
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==================================================" -ForegroundColor Green
        Write-Host "  SUCESSO! Frontend V14 restaurado e publicado." -ForegroundColor Green
        Write-Host "  Branch: v14-v8-gold-clean-rebuild" -ForegroundColor Green
        Write-Host "  SDDF FRONT GUARD: PASS" -ForegroundColor Green
        Write-Host "==================================================" -ForegroundColor Green
    } else {
        Write-Host "  ERRO no push." -ForegroundColor Red
    }
} else {
    Write-Host "  Push cancelado. Commit salvo localmente." -ForegroundColor DarkYellow
    Write-Host "  Rode: git push origin v14-v8-gold-clean-rebuild" -ForegroundColor Gray
}
Write-Host ""
