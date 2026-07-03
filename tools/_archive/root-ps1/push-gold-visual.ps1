# VISION CORE — PUSH VISUAL V8 GOLD
# Execute em: C:\Users\imadechumbo\Desktop\vision-core\

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VISION CORE — PUSH VISUAL V8 GOLD" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Branch: $(git branch --show-current)" -ForegroundColor Gray
Write-Host ""
Write-Host "Commit a enviar:" -ForegroundColor Yellow
git log --oneline origin/v14-v8-gold-clean-rebuild..HEAD
Write-Host ""

Write-Host "Rodando SDDF guard..." -ForegroundColor Yellow
node tools\sddf-front-guard.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "  GUARD FALHOU." -ForegroundColor Red
    exit 1
}
Write-Host ""

$confirm = Read-Host "Push para origin/v14-v8-gold-clean-rebuild? (s/N)"
if ($confirm -match "^[Ss]$") {
    git push origin v14-v8-gold-clean-rebuild
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==================================================" -ForegroundColor Green
        Write-Host "  SUCESSO! Visual V8 Gold publicado." -ForegroundColor Green
        Write-Host "  SDDF FRONT GUARD: PASS" -ForegroundColor Green
        Write-Host "  Teste local: cd frontend && python -m http.server 5500" -ForegroundColor Cyan
        Write-Host "==================================================" -ForegroundColor Green
    } else {
        Write-Host "  ERRO no push." -ForegroundColor Red
    }
} else {
    Write-Host "  Push cancelado. Rode: git push origin v14-v8-gold-clean-rebuild" -ForegroundColor Gray
}
Write-Host ""
