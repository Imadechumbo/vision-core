# =============================================================
#  VISION CORE — PUSH DOS 3 COMMITS DE REFATORACAO V14
#  Execute no terminal do VS Code em: vision-core/
# =============================================================

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VISION CORE — PUSH REFATORACAO V14" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Confirmar que estamos no repo certo
$remote = git remote get-url origin 2>$null
Write-Host "  Remote: $remote" -ForegroundColor Gray
Write-Host "  Branch: $(git branch --show-current)" -ForegroundColor Gray
Write-Host ""

# Mostrar os commits que serao enviados
Write-Host "Commits a enviar:" -ForegroundColor Yellow
git log --oneline origin/main..HEAD
Write-Host ""

# Rodar guard antes do push
Write-Host "Rodando SDDF guard..." -ForegroundColor Yellow
node tools/sddf-front-guard.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  ERRO: Guard falhou. Corrija antes do push." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Confirmar push
$confirm = Read-Host "Confirma push para origin/main? (s/N)"
if ($confirm -notmatch "^[Ss]$") {
    Write-Host "  Push cancelado." -ForegroundColor DarkYellow
    exit 0
}

Write-Host ""
Write-Host "Enviando..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "  SUCESSO! 3 commits publicados:" -ForegroundColor Green
    Write-Host "  1. docs(sddf): harvest v14 contracts and failures" -ForegroundColor Green
    Write-Host "  2. refactor(frontend): v8 gold como unico frontend" -ForegroundColor Green
    Write-Host "  3. ci(frontend): guard v14 hardened" -ForegroundColor Green
    Write-Host ""
    Write-Host "  https://github.com/Imadechumbo/vision-core" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  ERRO no push. Verifique sua autenticacao Git." -ForegroundColor Red
    Write-Host "  Se usar HTTPS: git config --global credential.helper manager" -ForegroundColor Yellow
}

Write-Host ""
